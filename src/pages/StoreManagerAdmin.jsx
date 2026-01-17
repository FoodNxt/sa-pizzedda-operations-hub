import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Crown,
  Target,
  DollarSign,
  Star,
  AlertTriangle,
  Clock,
  Sparkles,
  Save,
  Store,
  Plus,
  Edit,
  Trash2,
  X,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Gift,
  BarChart3,
  Copy
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import moment from "moment";

export default function StoreManagerAdmin() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [editingTarget, setEditingTarget] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyFromMonth, setCopyFromMonth] = useState('');
  const [formData, setFormData] = useState({
    store_id: '',
    metriche_attive: ['fatturato', 'recensioni_media', 'num_recensioni', 'ordini_sbagliati', 'ritardi', 'pulizie'],
    target_fatturato: '',
    soglia_min_fatturato: '',
    target_recensioni_media: '',
    soglia_min_recensioni: '',
    target_num_recensioni: '',
    soglia_min_num_recensioni: '',
    target_ordini_sbagliati_max: '',
    soglia_max_ordini_sbagliati: '',
    target_ritardi_max_minuti: '',
    soglia_max_ritardi: '',
    target_pulizie_min_score: '',
    soglia_min_pulizie: '',
    bonus_fatturato: '',
    bonus_recensioni: '',
    bonus_num_recensioni: '',
    bonus_ordini_sbagliati: '',
    bonus_ritardi: '',
    bonus_pulizie: ''
  });

  const METRICHE_OPTIONS = [
    { key: 'fatturato', label: 'Fatturato', icon: DollarSign, color: 'green' },
    { key: 'recensioni_media', label: 'Media Recensioni', icon: Star, color: 'yellow' },
    { key: 'num_recensioni', label: 'Numero Recensioni', icon: BarChart3, color: 'orange' },
    { key: 'ordini_sbagliati', label: 'Ordini Sbagliati', icon: AlertTriangle, color: 'red' },
    { key: 'ritardi', label: 'Ritardi', icon: Clock, color: 'blue' },
    { key: 'pulizie', label: 'Pulizie', icon: Sparkles, color: 'purple' }
  ];

  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: targets = [], isLoading } = useQuery({
    queryKey: ['sm-targets', selectedMonth],
    queryFn: () => base44.entities.StoreManagerTarget.filter({ mese: selectedMonth })
  });

  const { data: allTargets = [] } = useQuery({
    queryKey: ['sm-all-targets'],
    queryFn: () => base44.entities.StoreManagerTarget.list()
  });

  // Fetch actual data for comparison
  const { data: iPraticoData = [] } = useQuery({
    queryKey: ['ipratico-data', selectedMonth],
    queryFn: () => base44.entities.iPratico.filter({})
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', selectedMonth],
    queryFn: () => base44.entities.Review.filter({})
  });

  const { data: ordiniSbagliati = [] } = useQuery({
    queryKey: ['ordini-sbagliati', selectedMonth],
    queryFn: () => base44.entities.WrongOrder.filter({})
  });

  const { data: turniPlanday = [] } = useQuery({
    queryKey: ['turni-planday-sm'],
    queryFn: () => base44.entities.TurnoPlanday.list()
  });

  const { data: pulizie = [] } = useQuery({
    queryKey: ['pulizie-sm', selectedMonth],
    queryFn: () => base44.entities.CleaningInspection.filter({})
  });

  const { data: cleaningConfigs = [] } = useQuery({
    queryKey: ['pulizie-configs'],
    queryFn: () => base44.entities.PulizieConfig.list()
  });

  // Calculate actual results per store for selected month
  const getActualResults = (storeId) => {
    const monthStart = moment(selectedMonth, 'YYYY-MM').startOf('month');
    const monthEnd = moment(selectedMonth, 'YYYY-MM').endOf('month');

    // Fatturato
    const storeIPratico = iPraticoData.filter(i => 
      i.store_id === storeId && 
      i.order_date &&
      moment(i.order_date).isValid() &&
      moment(i.order_date).isBetween(monthStart, monthEnd, 'day', '[]')
    );
    const fatturato = storeIPratico.reduce((acc, i) => acc + (i.total_revenue || 0), 0);

    // Recensioni
    const storeReviews = reviews.filter(r => 
      r.store_id === storeId && 
      r.review_date &&
      moment(r.review_date).isValid() &&
      moment(r.review_date).isBetween(monthStart, monthEnd, 'day', '[]')
    );
    const mediaRecensioni = storeReviews.length > 0 
      ? storeReviews.reduce((acc, r) => acc + r.rating, 0) / storeReviews.length 
      : null;
    const numRecensioni = storeReviews.length;

    // Ordini sbagliati
    const storeOrdini = ordiniSbagliati.filter(o => {
      const date = o.order_date || o.created_date;
      return o.store_id === storeId && 
        date &&
        moment(date).isValid() &&
        moment(date).isBetween(monthStart, monthEnd, 'day', '[]');
    });
    const numOrdiniSbagliati = storeOrdini.length;

    // Ritardi - calcola direttamente da TurnoPlanday
    const storeShifts = turniPlanday.filter(t => 
      t.store_id === storeId && 
      t.data &&
      moment(t.data).isValid() &&
      moment(t.data).isBetween(monthStart, monthEnd, 'day', '[]') &&
      t.timbratura_entrata &&
      t.ora_inizio
    );
    
    // Ricalcola i minuti di ritardo reale per ogni turno
    let totaleRitardi = 0;
    storeShifts.forEach(shift => {
      try {
        const clockInTime = new Date(shift.timbratura_entrata);
        const [oraInizioHH, oraInizioMM] = shift.ora_inizio.split(':').map(Number);
        const scheduledStart = new Date(clockInTime);
        scheduledStart.setHours(oraInizioHH, oraInizioMM, 0, 0);
        const delayMs = clockInTime - scheduledStart;
        const delayMinutes = Math.floor(delayMs / 60000);
        const ritardoReale = delayMinutes > 0 ? delayMinutes : 0;
        totaleRitardi += ritardoReale;
      } catch (e) {
        // Skip in caso di errore
      }
    });

    // Pulizie - calcola media degli score dei singoli form completati
    // Usa la stessa logica di ValutazionePulizie.calculateScore
    const puliziConfig = cleaningConfigs?.find(c => c.is_active) || {
      metodo_calcolo: 'media',
      punteggio_pulito: 100,
      punteggio_sporco: 0,
      punteggio_risposta_corretta: 100,
      punteggio_risposta_errata: 0
    };

    const storePulizie = pulizie.filter(p => 
      p.store_id === storeId && 
      p.inspection_date &&
      moment(p.inspection_date).isValid() &&
      moment(p.inspection_date).isBetween(monthStart, monthEnd, 'day', '[]') &&
      p.analysis_status === 'completed'
    );
    
    // Calcola lo score di ogni form (come fa ValutazionePulizie)
    const calculateInspectionScore = (inspection) => {
      if (!inspection.domande_risposte || inspection.domande_risposte.length === 0) return 0;
      
      let totalScore = 0;
      let totalWeight = 0;
      
      inspection.domande_risposte.forEach(domanda => {
        let score = 0;
        
        if (domanda.tipo_controllo === 'foto') {
          const attrezzatura = domanda.attrezzatura?.toLowerCase().replace(/\s+/g, '_');
          const statusField = `${attrezzatura}_pulizia_status`;
          const correctedField = `${attrezzatura}_corrected_status`;
          
          const status = inspection[correctedField] || inspection[statusField];
          
          if (status === 'pulito') {
            score = puliziConfig.punteggio_pulito;
          } else if (status === 'sporco') {
            score = puliziConfig.punteggio_sporco;
          }
        }
        
        totalScore += score;
        totalWeight += 1;
      });
      
      return totalWeight > 0 ? totalScore / totalWeight : 0;
    };
    
    const scores = storePulizie.map(calculateInspectionScore).filter(s => s > 0);
    const mediaPulizie = scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : null;

    return { fatturato, mediaRecensioni, numRecensioni, numOrdiniSbagliati, totaleRitardi, mediaPulizie };
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StoreManagerTarget.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sm-targets'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StoreManagerTarget.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sm-targets'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StoreManagerTarget.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sm-targets'] });
    }
  });

  const copyTargetsMutation = useMutation({
    mutationFn: async ({ fromMonth, toMonth }) => {
      const sourceTargets = await base44.entities.StoreManagerTarget.filter({ mese: fromMonth });
      const promises = sourceTargets.map(t => {
        const { id, created_date, updated_date, created_by, ...data } = t;
        return base44.entities.StoreManagerTarget.create({ ...data, mese: toMonth });
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sm-targets'] });
      queryClient.invalidateQueries({ queryKey: ['sm-all-targets'] });
      setShowCopyModal(false);
      setCopyFromMonth('');
      alert('Target copiati con successo!');
    }
  });

  const resetForm = () => {
    setFormData({
      store_id: '',
      metriche_attive: ['fatturato', 'recensioni_media', 'num_recensioni', 'ordini_sbagliati', 'ritardi', 'pulizie'],
      target_fatturato: '',
      soglia_min_fatturato: '',
      target_recensioni_media: '',
      soglia_min_recensioni: '',
      target_num_recensioni: '',
      soglia_min_num_recensioni: '',
      target_ordini_sbagliati_max: '',
      soglia_max_ordini_sbagliati: '',
      target_ritardi_max_minuti: '',
      soglia_max_ritardi: '',
      target_pulizie_min_score: '',
      soglia_min_pulizie: '',
      bonus_fatturato: '',
      bonus_recensioni: '',
      bonus_num_recensioni: '',
      bonus_ordini_sbagliati: '',
      bonus_ritardi: '',
      bonus_pulizie: ''
    });
    setEditingTarget(null);
    setShowForm(false);
  };

  const handleEdit = (target) => {
    setEditingTarget(target);
    setFormData({
      store_id: target.store_id,
      metriche_attive: target.metriche_attive || ['fatturato', 'recensioni_media', 'num_recensioni', 'ordini_sbagliati', 'ritardi', 'pulizie'],
      target_fatturato: target.target_fatturato || '',
      soglia_min_fatturato: target.soglia_min_fatturato || '',
      target_recensioni_media: target.target_recensioni_media || '',
      soglia_min_recensioni: target.soglia_min_recensioni || '',
      target_num_recensioni: target.target_num_recensioni || '',
      soglia_min_num_recensioni: target.soglia_min_num_recensioni || '',
      target_ordini_sbagliati_max: target.target_ordini_sbagliati_max || '',
      soglia_max_ordini_sbagliati: target.soglia_max_ordini_sbagliati || '',
      target_ritardi_max_minuti: target.target_ritardi_max_minuti || '',
      soglia_max_ritardi: target.soglia_max_ritardi || '',
      target_pulizie_min_score: target.target_pulizie_min_score || '',
      soglia_min_pulizie: target.soglia_min_pulizie || '',
      bonus_fatturato: target.bonus_fatturato || '',
      bonus_recensioni: target.bonus_recensioni || '',
      bonus_num_recensioni: target.bonus_num_recensioni || '',
      bonus_ordini_sbagliati: target.bonus_ordini_sbagliati || '',
      bonus_ritardi: target.bonus_ritardi || '',
      bonus_pulizie: target.bonus_pulizie || ''
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const store = stores.find(s => s.id === formData.store_id);
    const data = {
      store_id: formData.store_id,
      store_manager_id: store?.store_manager_id || null,
      mese: selectedMonth,
      metriche_attive: formData.metriche_attive,
      target_fatturato: formData.target_fatturato ? parseFloat(formData.target_fatturato) : null,
      soglia_min_fatturato: formData.soglia_min_fatturato ? parseFloat(formData.soglia_min_fatturato) : null,
      target_recensioni_media: formData.target_recensioni_media ? parseFloat(formData.target_recensioni_media) : null,
      soglia_min_recensioni: formData.soglia_min_recensioni ? parseFloat(formData.soglia_min_recensioni) : null,
      target_num_recensioni: formData.target_num_recensioni ? parseInt(formData.target_num_recensioni) : null,
      soglia_min_num_recensioni: formData.soglia_min_num_recensioni ? parseInt(formData.soglia_min_num_recensioni) : null,
      target_ordini_sbagliati_max: formData.target_ordini_sbagliati_max ? parseInt(formData.target_ordini_sbagliati_max) : null,
      soglia_max_ordini_sbagliati: formData.soglia_max_ordini_sbagliati ? parseInt(formData.soglia_max_ordini_sbagliati) : null,
      target_ritardi_max_minuti: formData.target_ritardi_max_minuti ? parseInt(formData.target_ritardi_max_minuti) : null,
      soglia_max_ritardi: formData.soglia_max_ritardi ? parseInt(formData.soglia_max_ritardi) : null,
      target_pulizie_min_score: formData.target_pulizie_min_score ? parseInt(formData.target_pulizie_min_score) : null,
      soglia_min_pulizie: formData.soglia_min_pulizie ? parseInt(formData.soglia_min_pulizie) : null,
      bonus_fatturato: formData.bonus_fatturato ? parseFloat(formData.bonus_fatturato) : null,
      bonus_recensioni: formData.bonus_recensioni ? parseFloat(formData.bonus_recensioni) : null,
      bonus_num_recensioni: formData.bonus_num_recensioni ? parseFloat(formData.bonus_num_recensioni) : null,
      bonus_ordini_sbagliati: formData.bonus_ordini_sbagliati ? parseFloat(formData.bonus_ordini_sbagliati) : null,
      bonus_ritardi: formData.bonus_ritardi ? parseFloat(formData.bonus_ritardi) : null,
      bonus_pulizie: formData.bonus_pulizie ? parseFloat(formData.bonus_pulizie) : null
    };

    if (editingTarget) {
      updateMutation.mutate({ id: editingTarget.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleMetrica = (key) => {
    setFormData(prev => ({
      ...prev,
      metriche_attive: prev.metriche_attive.includes(key)
        ? prev.metriche_attive.filter(m => m !== key)
        : [...prev.metriche_attive, key]
    }));
  };

  // Genera opzioni mesi (prossimi 12 mesi)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = -2; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  }, []);

  // Store con Store Manager
  const storesWithSM = stores.filter(s => s.store_manager_id);

  // Get months with targets
  const monthsWithTargets = useMemo(() => {
    const months = new Set();
    allTargets.forEach(t => {
      if (t.mese && t.mese !== selectedMonth) {
        months.add(t.mese);
      }
    });
    return Array.from(months).sort().reverse();
  }, [allTargets, selectedMonth]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-10 h-10 text-purple-600" />
            <h1 className="text-3xl font-bold text-slate-800">Store Manager</h1>
          </div>
          <p className="text-slate-500">Gestisci i target per gli Store Manager</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="neumorphic-pressed px-4 py-2 rounded-xl outline-none"
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <NeumorphicButton
            onClick={() => setShowForm(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuovo Target
          </NeumorphicButton>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">
              {editingTarget ? 'Modifica Target' : 'Nuovo Target'}
            </h2>
            <button onClick={resetForm} className="text-slate-500">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Locale <span className="text-red-600">*</span>
              </label>
              <select
                value={formData.store_id}
                onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                required
              >
                <option value="">-- Seleziona locale --</option>
                {storesWithSM.map(store => {
                  const sm = users.find(u => u.id === store.store_manager_id);
                  return (
                    <option key={store.id} value={store.id}>
                      {store.name} - SM: {sm?.nome_cognome || sm?.full_name || 'N/A'}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Selezione Metriche Attive */}
            <div className="p-4 bg-slate-100 rounded-xl mb-4">
              <label className="text-sm font-medium text-slate-700 mb-3 block">
                Metriche Attive per questo Store
              </label>
              <div className="flex flex-wrap gap-2">
                {METRICHE_OPTIONS.map(m => {
                  const Icon = m.icon;
                  const isActive = formData.metriche_attive.includes(m.key);
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => toggleMetrica(m.key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                        isActive ? `bg-${m.color}-500 text-white` : 'neumorphic-flat text-slate-600'
                      }`}
                      style={isActive ? { backgroundColor: m.color === 'green' ? '#22c55e' : m.color === 'yellow' ? '#eab308' : m.color === 'orange' ? '#f97316' : m.color === 'red' ? '#ef4444' : m.color === 'blue' ? '#3b82f6' : '#a855f7' } : {}}
                    >
                      <Icon className="w-4 h-4" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {/* Fatturato */}
              {formData.metriche_attive.includes('fatturato') && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-green-50 rounded-xl">
                <div className="md:col-span-3 flex items-center gap-2 text-green-700 font-bold">
                  <DollarSign className="w-5 h-5" />
                  Fatturato
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Target (€)</label>
                  <input type="number" value={formData.target_fatturato} onChange={(e) => setFormData({ ...formData, target_fatturato: e.target.value })} placeholder="50000" className="w-full neumorphic-pressed px-3 py-2 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-red-600 mb-1 block">Soglia Min (€)</label>
                  <input type="number" value={formData.soglia_min_fatturato} onChange={(e) => setFormData({ ...formData, soglia_min_fatturato: e.target.value })} placeholder="30000" className="w-full neumorphic-pressed px-3 py-2 rounded-xl outline-none border border-red-200" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Bonus (€)</label>
                  <input type="number" value={formData.bonus_fatturato} onChange={(e) => setFormData({ ...formData, bonus_fatturato: e.target.value })} placeholder="100" className="w-full neumorphic-pressed px-3 py-2 rounded-xl outline-none" />
                </div>
              </div>
              )}

              {/* Recensioni Media */}
              {formData.metriche_attive.includes('recensioni_media') && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-yellow-50 rounded-xl">
                <div className="md:col-span-3 flex items-center gap-2 text-yellow-700 font-bold">
                  <Star className="w-5 h-5" />
                  Media Recensioni
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Target</label>
                  <input type="number" step="0.1" min="1" max="5" value={formData.target_recensioni_media} onChange={(e) => setFormData({ ...formData, target_recensioni_media: e.target.value })} placeholder="4.5" className="w-full neumorphic-pressed px-3 py-2 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-red-600 mb-1 block">Soglia Min</label>
                  <input type="number" step="0.1" min="1" max="5" value={formData.soglia_min_recensioni} onChange={(e) => setFormData({ ...formData, soglia_min_recensioni: e.target.value })} placeholder="3.5" className="w-full neumorphic-pressed px-3 py-2 rounded-xl outline-none border border-red-200" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Bonus (€)</label>
                  <input type="number" value={formData.bonus_recensioni} onChange={(e) => setFormData({ ...formData, bonus_recensioni: e.target.value })} placeholder="50" className="w-full neumorphic-pressed px-3 py-2 rounded-xl outline-none" />
                </div>
              </div>
              )}

              {/* Numero Recensioni */}
              {formData.metriche_attive.includes('num_recensioni') && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-orange-50 rounded-xl">
                <div className="md:col-span-3 flex items-center gap-2 text-orange-700 font-bold">
                  <BarChart3 className="w-5 h-5" />
                  Numero Recensioni
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Target</label>
                  <input type="number" min="0" value={formData.target_num_recensioni} onChange={(e) => setFormData({ ...formData, target_num_recensioni: e.target.value })} placeholder="50" className="w-full neumorphic-pressed px-3 py-2 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-red-600 mb-1 block">Soglia Min</label>
                  <input type="number" min="0" value={formData.soglia_min_num_recensioni} onChange={(e) => setFormData({ ...formData, soglia_min_num_recensioni: e.target.value })} placeholder="20" className="w-full neumorphic-pressed px-3 py-2 rounded-xl outline-none border border-red-200" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Bonus (€)</label>
                  <input type="number" value={formData.bonus_num_recensioni} onChange={(e) => setFormData({ ...formData, bonus_num_recensioni: e.target.value })} placeholder="30" className="w-full neumorphic-pressed px-3 py-2 rounded-xl outline-none" />
                </div>
              </div>
              )}

              {/* Ordini Sbagliati */}
              {formData.metriche_attive.includes('ordini_sbagliati') && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-red-50 rounded-xl">
                <div className="md:col-span-3 flex items-center gap-2 text-red-700 font-bold">
                  <AlertTriangle className="w-5 h-5" />
                  Ordini Sbagliati
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Target Max</label>
                  <input type="number" min="0" value={formData.target_ordini_sbagliati_max} onChange={(e) => setFormData({ ...formData, target_ordini_sbagliati_max: e.target.value })} placeholder="5" className="w-full neumorphic-pressed px-3 py-2 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-red-600 mb-1 block">Soglia Max (no bonus)</label>
                  <input type="number" min="0" value={formData.soglia_max_ordini_sbagliati} onChange={(e) => setFormData({ ...formData, soglia_max_ordini_sbagliati: e.target.value })} placeholder="15" className="w-full neumorphic-pressed px-3 py-2 rounded-xl outline-none border border-red-200" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Bonus (€)</label>
                  <input type="number" value={formData.bonus_ordini_sbagliati} onChange={(e) => setFormData({ ...formData, bonus_ordini_sbagliati: e.target.value })} placeholder="50" className="w-full neumorphic-pressed px-3 py-2 rounded-xl outline-none" />
                </div>
              </div>
              )}

              {/* Ritardi */}
              {formData.metriche_attive.includes('ritardi') && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-xl">
                <div className="md:col-span-3 flex items-center gap-2 text-blue-700 font-bold">
                  <Clock className="w-5 h-5" />
                  Ritardi (minuti)
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Target Max</label>
                  <input type="number" min="0" value={formData.target_ritardi_max_minuti} onChange={(e) => setFormData({ ...formData, target_ritardi_max_minuti: e.target.value })} placeholder="30" className="w-full neumorphic-pressed px-3 py-2 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-red-600 mb-1 block">Soglia Max (no bonus)</label>
                  <input type="number" min="0" value={formData.soglia_max_ritardi} onChange={(e) => setFormData({ ...formData, soglia_max_ritardi: e.target.value })} placeholder="120" className="w-full neumorphic-pressed px-3 py-2 rounded-xl outline-none border border-red-200" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Bonus (€)</label>
                  <input type="number" value={formData.bonus_ritardi} onChange={(e) => setFormData({ ...formData, bonus_ritardi: e.target.value })} placeholder="50" className="w-full neumorphic-pressed px-3 py-2 rounded-xl outline-none" />
                </div>
              </div>
              )}

              {/* Pulizie */}
              {formData.metriche_attive.includes('pulizie') && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-purple-50 rounded-xl">
                <div className="md:col-span-3 flex items-center gap-2 text-purple-700 font-bold">
                  <Sparkles className="w-5 h-5" />
                  Score Pulizie
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Target Min</label>
                  <input type="number" min="0" max="100" value={formData.target_pulizie_min_score} onChange={(e) => setFormData({ ...formData, target_pulizie_min_score: e.target.value })} placeholder="85" className="w-full neumorphic-pressed px-3 py-2 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-red-600 mb-1 block">Soglia Min (no bonus)</label>
                  <input type="number" min="0" max="100" value={formData.soglia_min_pulizie} onChange={(e) => setFormData({ ...formData, soglia_min_pulizie: e.target.value })} placeholder="60" className="w-full neumorphic-pressed px-3 py-2 rounded-xl outline-none border border-red-200" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Bonus (€)</label>
                  <input type="number" value={formData.bonus_pulizie} onChange={(e) => setFormData({ ...formData, bonus_pulizie: e.target.value })} placeholder="50" className="w-full neumorphic-pressed px-3 py-2 rounded-xl outline-none" />
                </div>
              </div>
              )}
            </div>

            <div className="mt-4 p-3 bg-red-100 rounded-xl text-sm text-red-800">
              <strong>⚠️ Soglie Minime:</strong> Se una metrica scende sotto la soglia minima (o sopra per ordini/ritardi), 
              <strong> TUTTI i bonus vengono azzerati</strong> per quel mese.
            </div>

            <div className="flex gap-3 pt-4">
              <NeumorphicButton type="button" onClick={resetForm}>
                Annulla
              </NeumorphicButton>
              <NeumorphicButton type="submit" variant="primary" className="flex items-center gap-2">
                <Save className="w-5 h-5" />
                {editingTarget ? 'Aggiorna' : 'Crea'} Target
              </NeumorphicButton>
            </div>
          </form>
        </NeumorphicCard>
      )}

      {/* Lista Target */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Target className="w-6 h-6 text-orange-600" />
          Target {monthOptions.find(m => m.value === selectedMonth)?.label}
        </h2>

        {isLoading ? (
          <p className="text-center text-slate-500 py-8">Caricamento...</p>
        ) : targets.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">Nessun target configurato per questo mese</p>
            {monthsWithTargets.length > 0 && (
              <NeumorphicButton
                onClick={() => setShowCopyModal(true)}
                variant="primary"
                className="flex items-center gap-2 mx-auto"
              >
                <Copy className="w-4 h-4" />
                Copia da altro mese
              </NeumorphicButton>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {targets.map(target => {
              const store = stores.find(s => s.id === target.store_id);
              const sm = users.find(u => u.id === store?.store_manager_id);
              const actual = getActualResults(target.store_id);

              // Check if ANY threshold is breached (loses ALL bonuses) - only for past months
              const isCurrentMonth = selectedMonth === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
              
              const fatturatoBreached = target.soglia_min_fatturato && actual.fatturato < target.soglia_min_fatturato;
              const recensioniBreached = target.soglia_min_recensioni && actual.mediaRecensioni && actual.mediaRecensioni < target.soglia_min_recensioni;
              const numRecensioniBreached = target.soglia_min_num_recensioni && actual.numRecensioni < target.soglia_min_num_recensioni;
              const ordiniBreached = target.soglia_max_ordini_sbagliati && actual.numOrdiniSbagliati > target.soglia_max_ordini_sbagliati;
              const ritardiBreached = target.soglia_max_ritardi && actual.totaleRitardi > target.soglia_max_ritardi;
              const pulizieBreached = target.soglia_min_pulizie && actual.mediaPulizie && actual.mediaPulizie < target.soglia_min_pulizie;

              const anyThresholdBreached = !isCurrentMonth && (fatturatoBreached || recensioniBreached || numRecensioniBreached || ordiniBreached || ritardiBreached || pulizieBreached);
              
              // For current month, show warnings but don't zero bonuses
              const atRiskMetrics = [];
              if (fatturatoBreached) atRiskMetrics.push('Fatturato');
              if (recensioniBreached) atRiskMetrics.push('Media Recensioni');
              if (numRecensioniBreached) atRiskMetrics.push('Num Recensioni');
              if (ordiniBreached) atRiskMetrics.push('Ordini Sbagliati');
              if (ritardiBreached) atRiskMetrics.push('Ritardi');
              if (pulizieBreached) atRiskMetrics.push('Pulizie');

              // Calculate if targets are met
              const fatturatoMet = target.target_fatturato && actual.fatturato >= target.target_fatturato;
              const recensioniMet = target.target_recensioni_media && actual.mediaRecensioni && actual.mediaRecensioni >= target.target_recensioni_media;
              const numRecensioniMet = target.target_num_recensioni && actual.numRecensioni >= target.target_num_recensioni;
              const ordiniMet = target.target_ordini_sbagliati_max !== null && actual.numOrdiniSbagliati <= target.target_ordini_sbagliati_max;
              const ritardiMet = target.target_ritardi_max_minuti && actual.totaleRitardi <= target.target_ritardi_max_minuti;
              const pulizieMet = target.target_pulizie_min_score && actual.mediaPulizie && actual.mediaPulizie >= target.target_pulizie_min_score;

              // Calculate total bonus (0 if any threshold is breached)
              let totalBonus = 0;
              if (!anyThresholdBreached) {
                if (fatturatoMet && target.bonus_fatturato) totalBonus += target.bonus_fatturato;
                if (recensioniMet && target.bonus_recensioni) totalBonus += target.bonus_recensioni;
                if (numRecensioniMet && target.bonus_num_recensioni) totalBonus += target.bonus_num_recensioni;
                if (ordiniMet && target.bonus_ordini_sbagliati) totalBonus += target.bonus_ordini_sbagliati;
                if (ritardiMet && target.bonus_ritardi) totalBonus += target.bonus_ritardi;
                if (pulizieMet && target.bonus_pulizie) totalBonus += target.bonus_pulizie;
              }

              const MetricCard = ({ icon: Icon, iconColor, label, target: tgt, actual: act, isMet, bonus, isLowerBetter = false, suffix = '', threshold, thresholdLabel }) => (
                <div className={`neumorphic-flat p-3 rounded-lg ${isMet ? 'bg-green-50 border border-green-300' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                    {isMet ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : act !== null && act !== undefined ? (
                      isLowerBetter ? (
                        <TrendingUp className="w-4 h-4 text-red-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <p className={`font-bold ${isMet ? 'text-green-700' : 'text-slate-700'}`}>
                      {act !== null && act !== undefined ? (typeof act === 'number' ? act.toLocaleString('it-IT', { maximumFractionDigits: 1 }) : act) : '-'}{suffix}
                    </p>
                    <p className="text-xs text-slate-400">
                      / {tgt !== null && tgt !== undefined ? tgt.toLocaleString('it-IT') : '-'}{suffix}
                    </p>
                  </div>
                  {threshold !== null && threshold !== undefined && (
                    <p className="text-[10px] text-red-500 mt-0.5">
                      {thresholdLabel || 'Soglia'}: {threshold}{suffix}
                    </p>
                  )}
                  {bonus && (
                    <p className={`text-xs mt-1 ${isMet ? 'text-green-600 font-bold' : 'text-slate-400'}`}>
                      {isMet ? '✓' : ''} €{bonus} bonus
                    </p>
                  )}
                </div>
              );

              return (
                <div key={target.id} className="neumorphic-pressed p-4 rounded-xl">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Store className="w-6 h-6 text-purple-600" />
                      <div>
                        <h3 className="font-bold text-slate-800">{store?.name || 'N/A'}</h3>
                        <p className="text-sm text-slate-500">
                          SM: {sm?.nome_cognome || sm?.full_name || 'Non assegnato'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {totalBonus > 0 && (
                        <div className="neumorphic-flat px-3 py-1 rounded-lg bg-green-50 border border-green-300">
                          <p className="text-xs text-green-600">Bonus Totale</p>
                          <p className="font-bold text-green-700">€{totalBonus}</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(target)}
                          className="nav-button p-2 rounded-lg hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Eliminare questo target?')) {
                              deleteMutation.mutate(target.id);
                            }
                          }}
                          className="nav-button p-2 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {anyThresholdBreached && (
                    <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded-lg text-sm text-red-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <strong>Soglia minima non raggiunta - Tutti i bonus azzerati!</strong>
                    </div>
                  )}

                  {isCurrentMonth && atRiskMetrics.length > 0 && !anyThresholdBreached && (
                    <div className="mb-3 p-2 bg-orange-100 border border-orange-300 rounded-lg text-sm text-orange-800 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>⚠️ Attenzione:</strong> Le seguenti metriche sono sotto la soglia minima e potrebbero causare la perdita di TUTTI i bonus a fine mese:
                        <span className="font-bold ml-1">{atRiskMetrics.join(', ')}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    {(target.metriche_attive || ['fatturato', 'recensioni_media', 'num_recensioni', 'ordini_sbagliati', 'ritardi', 'pulizie']).includes('fatturato') && (
                    <MetricCard
                      icon={DollarSign}
                      iconColor="text-green-600"
                      label="Fatturato"
                      target={target.target_fatturato}
                      actual={actual.fatturato}
                      isMet={fatturatoMet && !anyThresholdBreached}
                      bonus={target.bonus_fatturato}
                      suffix="€"
                      threshold={target.soglia_min_fatturato}
                      thresholdLabel="Min"
                    />
                    )}
                    {(target.metriche_attive || ['fatturato', 'recensioni_media', 'num_recensioni', 'ordini_sbagliati', 'ritardi', 'pulizie']).includes('recensioni_media') && (
                    <MetricCard
                      icon={Star}
                      iconColor="text-yellow-500"
                      label="Media Recensioni"
                      target={target.target_recensioni_media}
                      actual={actual.mediaRecensioni}
                      isMet={recensioniMet && !anyThresholdBreached}
                      bonus={target.bonus_recensioni}
                      threshold={target.soglia_min_recensioni}
                      thresholdLabel="Min"
                    />
                    )}
                    {(target.metriche_attive || ['fatturato', 'recensioni_media', 'num_recensioni', 'ordini_sbagliati', 'ritardi', 'pulizie']).includes('num_recensioni') && (
                    <MetricCard
                      icon={BarChart3}
                      iconColor="text-orange-500"
                      label="Num Recensioni"
                      target={target.target_num_recensioni}
                      actual={actual.numRecensioni}
                      isMet={numRecensioniMet && !anyThresholdBreached}
                      bonus={target.bonus_num_recensioni}
                      threshold={target.soglia_min_num_recensioni}
                      thresholdLabel="Min"
                    />
                    )}
                    {(target.metriche_attive || ['fatturato', 'recensioni_media', 'num_recensioni', 'ordini_sbagliati', 'ritardi', 'pulizie']).includes('ordini_sbagliati') && (
                    <MetricCard
                      icon={AlertTriangle}
                      iconColor="text-red-600"
                      label="Ordini Sbagliati"
                      target={target.target_ordini_sbagliati_max}
                      actual={actual.numOrdiniSbagliati}
                      isMet={ordiniMet && !anyThresholdBreached}
                      bonus={target.bonus_ordini_sbagliati}
                      isLowerBetter
                      threshold={target.soglia_max_ordini_sbagliati}
                      thresholdLabel="Max"
                    />
                    )}
                    {(target.metriche_attive || ['fatturato', 'recensioni_media', 'num_recensioni', 'ordini_sbagliati', 'ritardi', 'pulizie']).includes('ritardi') && (
                    <MetricCard
                      icon={Clock}
                      iconColor="text-blue-600"
                      label="Ritardi Tot"
                      target={target.target_ritardi_max_minuti}
                      actual={actual.totaleRitardi}
                      isMet={ritardiMet && !anyThresholdBreached}
                      bonus={target.bonus_ritardi}
                      isLowerBetter
                      suffix=" min"
                      threshold={target.soglia_max_ritardi}
                      thresholdLabel="Max"
                    />
                    )}
                    {(target.metriche_attive || ['fatturato', 'recensioni_media', 'num_recensioni', 'ordini_sbagliati', 'ritardi', 'pulizie']).includes('pulizie') && (
                    <MetricCard
                      icon={Sparkles}
                      iconColor="text-purple-600"
                      label="Score Pulizie"
                      target={target.target_pulizie_min_score}
                      actual={actual.mediaPulizie ? Math.round(actual.mediaPulizie) : null}
                      isMet={pulizieMet && !anyThresholdBreached}
                      bonus={target.bonus_pulizie}
                      threshold={target.soglia_min_pulizie}
                      thresholdLabel="Min"
                    />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </NeumorphicCard>

      {/* Store senza SM */}
      {stores.filter(s => !s.store_manager_id).length > 0 && (
        <NeumorphicCard className="p-4 bg-yellow-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Locali senza Store Manager:</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {stores.filter(s => !s.store_manager_id).map(store => (
                  <span key={store.id} className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm">
                    {store.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </NeumorphicCard>
      )}

      {/* Copy Modal */}
      {showCopyModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowCopyModal(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">Copia Target</h3>
                <button onClick={() => setShowCopyModal(false)} className="text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-sm text-slate-600 mb-4">
                Copia i target da un altro mese a <strong>{monthOptions.find(m => m.value === selectedMonth)?.label}</strong>
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Copia da mese:</label>
                  <select
                    value={copyFromMonth}
                    onChange={(e) => setCopyFromMonth(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                  >
                    <option value="">-- Seleziona mese --</option>
                    {monthsWithTargets.map(month => {
                      const monthLabel = monthOptions.find(m => m.value === month)?.label || month;
                      const count = allTargets.filter(t => t.mese === month).length;
                      return (
                        <option key={month} value={month}>
                          {monthLabel} ({count} target)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCopyModal(false)}
                    className="flex-1 py-2 neumorphic-flat rounded-xl text-slate-600"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => {
                      if (!copyFromMonth) {
                        alert('Seleziona un mese');
                        return;
                      }
                      if (confirm(`Copiare tutti i target da ${monthOptions.find(m => m.value === copyFromMonth)?.label}?`)) {
                        copyTargetsMutation.mutate({ fromMonth: copyFromMonth, toMonth: selectedMonth });
                      }
                    }}
                    disabled={!copyFromMonth || copyTargetsMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-xl font-medium disabled:opacity-50"
                  >
                    {copyTargetsMutation.isPending ? 'Copiando...' : 'Copia'}
                  </button>
                </div>
              </div>
            </NeumorphicCard>
          </div>
        </>
      )}
    </div>
  );
}