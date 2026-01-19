import React, { useState, useMemo } from "react";
import moment from "moment";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Crown,
  DollarSign,
  Star,
  AlertTriangle,
  Clock,
  Sparkles,
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  Store,
  CheckCircle,
  XCircle,
  Eye,
  X,
  ArrowRight,
  Bell,
  ChevronRight
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";

export default function DashboardStoreManager() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(null); // 'reviews', 'wrongOrders', 'delays', 'cleanings'
  const [showApprovazioniModal, setShowApprovazioniModal] = useState(false);
  const [expandedEmployee, setExpandedEmployee] = useState(null);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: targets = [] } = useQuery({
    queryKey: ['sm-targets', selectedMonth],
    queryFn: () => base44.entities.StoreManagerTarget.filter({ mese: selectedMonth })
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => base44.entities.Review.list('-review_date')
  });

  const { data: wrongOrders = [] } = useQuery({
    queryKey: ['wrong-orders'],
    queryFn: () => base44.entities.WrongOrder.list('-order_date')
  });

  const { data: wrongOrderMatches = [] } = useQuery({
    queryKey: ['wrong-order-matches'],
    queryFn: () => base44.entities.WrongOrderMatch.list()
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.TurnoPlanday.list('-data', 500)
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ['inspections'],
    queryFn: () => base44.entities.CleaningInspection.list('-inspection_date')
  });

  const { data: iPratico = [] } = useQuery({
    queryKey: ['ipratico'],
    queryFn: () => base44.entities.iPratico.list('-order_date')
  });

  const { data: richiesteScambio = [] } = useQuery({
    queryKey: ['richieste-scambio', selectedStoreId],
    queryFn: () => base44.entities.RichiestaTurnoLibero.filter({ 
      store_id: selectedStoreId,
      stato: 'in_attesa'
    }),
    enabled: !!selectedStoreId
  });

  const { data: conteggiCassa = [] } = useQuery({
    queryKey: ['conteggi-cassa'],
    queryFn: () => base44.entities.ConteggioCassa.list('-data_conteggio', 100)
  });

  // Trova i locali di cui l'utente è Store Manager
  const myStores = useMemo(() => {
    if (!currentUser?.id) return [];
    return stores.filter(s => s.store_manager_id === currentUser.id);
  }, [stores, currentUser]);

  // Auto-select first store if not selected
  React.useEffect(() => {
    if (myStores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(myStores[0].id);
    }
  }, [myStores, selectedStoreId]);

  // Calcola metriche per il mese selezionato
  const metrics = useMemo(() => {
    if (myStores.length === 0 || !selectedStoreId) return null;

    const monthStart = moment(selectedMonth, 'YYYY-MM').startOf('month');
    const monthEnd = moment(selectedMonth, 'YYYY-MM').endOf('month');

    // Fatturato
    const monthRevenue = iPratico
      .filter(r => {
        if (r.store_id !== selectedStoreId || !r.order_date) return false;
        const date = moment(r.order_date);
        if (!date.isValid()) return false;
        return date.isBetween(monthStart, monthEnd, 'day', '[]');
      })
      .reduce((acc, r) => acc + (r.total_revenue || 0), 0);

    // Recensioni
    const monthReviews = reviews.filter(r => {
      if (r.store_id !== selectedStoreId || !r.review_date) return false;
      const date = moment(r.review_date);
      if (!date.isValid()) return false;
      return date.isBetween(monthStart, monthEnd, 'day', '[]');
    });
    const avgRating = monthReviews.length > 0
      ? monthReviews.reduce((acc, r) => acc + r.rating, 0) / monthReviews.length
      : 0;

    // Ordini sbagliati
    const monthWrongOrders = wrongOrders.filter(o => {
      if (o.store_id !== selectedStoreId) return false;
      const date = moment(o.order_date);
      if (!date.isValid()) return false;
      return date.isBetween(monthStart, monthEnd, 'day', '[]');
    });

    // Ritardi - SOLO somma diretta dei ritardi reali
    const monthShiftsWithClockIn = shifts.filter(s => {
      if (s.store_id !== selectedStoreId || !s.data) return false;
      if (!s.timbratura_entrata || !s.ora_inizio) return false;
      const shiftDate = moment(s.data);
      if (!shiftDate.isValid()) return false;
      return shiftDate.isBetween(monthStart, monthEnd, 'day', '[]');
    });
    
    let totalDelayMinutes = 0;
    
    monthShiftsWithClockIn.forEach(shift => {
      try {
        const clockInTime = new Date(shift.timbratura_entrata);
        const [oraInizioHH, oraInizioMM] = shift.ora_inizio.split(':').map(Number);
        const scheduledStart = new Date(clockInTime);
        scheduledStart.setHours(oraInizioHH, oraInizioMM, 0, 0);
        const delayMs = clockInTime - scheduledStart;
        const delayMinutes = Math.floor(delayMs / 60000);
        const ritardoReale = delayMinutes > 0 ? delayMinutes : 0;
        totalDelayMinutes += ritardoReale;
      } catch (e) {
        console.error('Errore calcolo ritardo:', e);
      }
    });
    
    const avgDelay = monthShiftsWithClockIn.length > 0 ? totalDelayMinutes / monthShiftsWithClockIn.length : 0;
    const monthShifts = monthShiftsWithClockIn;

    // Pulizie - solo form completati con score
    const monthInspections = inspections.filter(i => {
      if (i.store_id !== selectedStoreId || !i.inspection_date || !i.overall_score) return false;
      const date = moment(i.inspection_date);
      if (!date.isValid()) return false;
      return date.isBetween(monthStart, monthEnd, 'day', '[]');
    });
    const avgCleaningScore = monthInspections.length > 0
      ? monthInspections.reduce((acc, i) => acc + (i.overall_score || 0), 0) / monthInspections.length
      : 0;

    // Target
    const target = targets.find(t => t.store_id === selectedStoreId);

    // Calcola bonus
    let bonusTotale = 0;
    const metriche = target?.metriche_attive || [];
    
    if (target) {
      // Fatturato
      if (metriche.includes('fatturato') && monthRevenue >= target.target_fatturato && monthRevenue >= (target.soglia_min_fatturato || 0)) {
        bonusTotale += target.bonus_fatturato || 0;
      }
      // Recensioni media
      if (metriche.includes('recensioni_media') && avgRating >= target.target_recensioni_media && avgRating >= (target.soglia_min_recensioni || 0)) {
        bonusTotale += target.bonus_recensioni || 0;
      }
      // Numero recensioni
      if (metriche.includes('num_recensioni') && monthReviews.length >= target.target_num_recensioni && monthReviews.length >= (target.soglia_min_num_recensioni || 0)) {
        bonusTotale += target.bonus_num_recensioni || 0;
      }
      // Ordini sbagliati
      if (metriche.includes('ordini_sbagliati') && monthWrongOrders.length <= target.target_ordini_sbagliati_max && monthWrongOrders.length <= (target.soglia_max_ordini_sbagliati || 999)) {
        bonusTotale += target.bonus_ordini_sbagliati || 0;
      }
      // Ritardi
      if (metriche.includes('ritardi') && totalDelayMinutes <= target.target_ritardi_max_minuti && totalDelayMinutes <= (target.soglia_max_ritardi || 999)) {
        bonusTotale += target.bonus_ritardi || 0;
      }
      // Pulizie
      if (metriche.includes('pulizie') && avgCleaningScore >= target.target_pulizie_min_score && avgCleaningScore >= (target.soglia_min_pulizie || 0)) {
        bonusTotale += target.bonus_pulizie || 0;
      }
    }

    return {
      fatturato: monthRevenue,
      avgRating,
      totalReviews: monthReviews.length,
      monthReviews,
      wrongOrdersCount: monthWrongOrders.length,
      monthWrongOrders,
      avgDelay,
      totalDelayMinutes,
      avgCleaningScore,
      totalShifts: monthShifts.length,
      totalInspections: monthInspections.length,
      monthInspections,
      monthShifts,
      target,
      bonusTotale
    };
  }, [selectedStoreId, selectedMonth, iPratico, reviews, wrongOrders, shifts, inspections, targets, moment]);

  // Ultimo conteggio cassa
  const ultimoConteggioCassa = useMemo(() => {
    if (!selectedStoreId) return null;
    
    const conteggioStore = conteggiCassa
      .filter(c => c.store_id === selectedStoreId && c.data_conteggio)
      .sort((a, b) => new Date(b.data_conteggio) - new Date(a.data_conteggio))[0];
    
    return conteggioStore || null;
  }, [selectedStoreId, conteggiCassa]);

  // Scorecard dipendenti - BASATO SUI TURNI EFFETTIVI (come Employees.js)
  const employeeScorecard = useMemo(() => {
    if (!selectedStoreId) return [];

    const monthStart = moment(selectedMonth, 'YYYY-MM').startOf('month');
    const monthEnd = moment(selectedMonth, 'YYYY-MM').endOf('month');

    // 1. Filtra turni per store e periodo
    const storeShifts = shifts.filter(s => {
      if (s.store_id !== selectedStoreId || !s.data) return false;
      const date = moment(s.data);
      if (!date.isValid()) return false;
      return date.isBetween(monthStart, monthEnd, 'day', '[]');
    });

    // 2. Estrai nomi univoci dipendenti da questi turni
    const employeeNames = [...new Set(storeShifts.map(s => s.dipendente_nome).filter(Boolean))];

    console.log('📊 Dipendenti trovati nello store:', employeeNames);

    // 3. Calcola metriche per ogni dipendente
    return employeeNames.map(employeeName => {
      // Turni di questo dipendente nello store selezionato nel mese
      const empShifts = storeShifts.filter(s => s.dipendente_nome === employeeName);
      
      // Calcola ritardi - CALCOLO 100% MANUALE
      let totalDelayMinutes = 0;
      let numeroRitardi = 0;
      const turniInRitardo = [];
      
      empShifts.forEach(shift => {
        if (!shift.timbratura_entrata || !shift.ora_inizio) return;
        try {
          const clockInTime = new Date(shift.timbratura_entrata);
          const [oraInizioHH, oraInizioMM] = shift.ora_inizio.split(':').map(Number);
          const scheduledStart = new Date(clockInTime);
          scheduledStart.setHours(oraInizioHH, oraInizioMM, 0, 0);
          const delayMs = clockInTime - scheduledStart;
          const delayMinutes = Math.floor(delayMs / 60000);
          const ritardoReale = delayMinutes > 0 ? delayMinutes : 0;
          
          totalDelayMinutes += ritardoReale;
          
          if (ritardoReale > 0) {
            numeroRitardi++;
            turniInRitardo.push(shift);
          }
        } catch (e) {
          // Skip in caso di errore
        }
      });
      const avgLateMinutes = empShifts.length > 0 ? totalDelayMinutes / empShifts.length : 0;
      
      // Conta turni completati
      const totalShifts = empShifts.filter(s => s.timbratura_entrata && s.timbratura_uscita).length;
      
      // Trova recensioni assegnate
      const empReviews = reviews.filter(r => {
        if (!r.employee_assigned_name || !r.review_date) return false;
        const assignedNames = r.employee_assigned_name.split(',').map(n => n.trim().toLowerCase());
        if (!assignedNames.includes(employeeName.toLowerCase())) return false;
        
        const date = moment(r.review_date);
        if (!date.isValid()) return false;
        return date.isBetween(monthStart, monthEnd, 'day', '[]');
      });
      
      const googleReviews = empReviews.filter(r => r.source === 'google');
      const avgGoogleRating = googleReviews.length > 0
        ? googleReviews.reduce((sum, r) => sum + r.rating, 0) / googleReviews.length
        : 0;

      // Trova ordini sbagliati assegnati a questo dipendente
      const empWrongOrders = wrongOrderMatches
        .filter(m => m.matched_employee_name?.toLowerCase() === employeeName.toLowerCase())
        .map(m => wrongOrders.find(wo => wo.id === m.wrong_order_id))
        .filter(Boolean)
        .filter(wo => {
          if (wo.store_id !== selectedStoreId || !wo.order_date) return false;
          const date = moment(wo.order_date);
          if (!date.isValid()) return false;
          return date.isBetween(monthStart, monthEnd, 'day', '[]');
        });

      // Trova user corrispondente per email e ruoli
      const user = users.find(u => 
        (u.nome_cognome || u.full_name || '').toLowerCase() === employeeName.toLowerCase()
      );

      return {
        id: user?.id || employeeName,
        name: employeeName,
        email: user?.email || '',
        ruoli: user?.ruoli_dipendente || [],
        shiftsCount: totalShifts,
        avgDelay: avgLateMinutes,
        totalDelayMinutes: totalDelayMinutes,
        lateShifts: numeroRitardi,
        lateShiftsDetails: turniInRitardo,
        reviewsCount: googleReviews.length,
        avgRating: avgGoogleRating,
        reviewsDetails: googleReviews,
        wrongOrdersCount: empWrongOrders.length,
        wrongOrdersDetails: empWrongOrders,
        isPrimaryHere: false
      };
    }).sort((a, b) => b.shiftsCount - a.shiftsCount);
  }, [selectedStoreId, selectedMonth, shifts, users, reviews, wrongOrders, wrongOrderMatches]);

  // Genera opzioni mesi
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  }, []);

  if (!currentUser) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <NeumorphicCard className="p-12 text-center">
          <p className="text-slate-500">Caricamento...</p>
        </NeumorphicCard>
      </div>
    );
  }

  if (myStores.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-10 h-10 text-purple-600" />
            <h1 className="text-3xl font-bold text-slate-800">Dashboard Store Manager</h1>
          </div>
        </div>
        <NeumorphicCard className="p-12 text-center">
          <Crown className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">Nessun locale assegnato</h2>
          <p className="text-slate-500">Non sei ancora stato assegnato come Store Manager di un locale.</p>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-10 h-10 text-purple-600" />
            <h1 className="text-3xl font-bold text-slate-800">Dashboard Store Manager</h1>
          </div>
          <button
            onClick={() => setShowApprovazioniModal(true)}
            className="neumorphic-flat px-4 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg transition-all relative"
          >
            <Bell className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-slate-700">Approvazioni</span>
            {richiesteScambio.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {richiesteScambio.length}
              </span>
            )}
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3">
          {myStores.length > 1 && (
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="neumorphic-pressed px-4 py-3 rounded-xl outline-none flex-1"
            >
              {myStores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          )}
          {myStores.length === 1 && (
            <div className="px-4 py-3 rounded-xl bg-purple-100 text-purple-700 font-bold">
              {myStores[0].name}
            </div>
          )}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="neumorphic-pressed px-4 py-3 rounded-xl outline-none"
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {metrics && (
        <>
          {/* Ultimo Conteggio Cassa */}
          {ultimoConteggioCassa && (
            <NeumorphicCard className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
              <div className="flex items-center gap-3 mb-3">
                <DollarSign className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-bold text-green-800">Ultimo Conteggio Cassa</h2>
              </div>
              <div className="neumorphic-pressed p-6 rounded-xl text-center bg-white">
                <p className="text-sm text-slate-500 mb-1">Valore Ultimo Conteggio</p>
                <p className="text-4xl font-bold text-green-600">€{ultimoConteggioCassa.valore_conteggio.toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(ultimoConteggioCassa.data_conteggio).toLocaleDateString('it-IT')} alle {new Date(ultimoConteggioCassa.data_conteggio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-slate-500 mt-1">da {ultimoConteggioCassa.rilevato_da}</p>
              </div>
            </NeumorphicCard>
          )}

          {/* Bonus Card */}
          {metrics.target && (
            <NeumorphicCard className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200">
              <div className="flex items-center gap-3 mb-4">
                <Crown className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-bold text-purple-800">I Tuoi Obiettivi</h2>
              </div>
              
              {/* Bonus Totale */}
              <div className="neumorphic-pressed p-6 rounded-xl text-center bg-white mb-4">
                <p className="text-sm text-slate-500 mb-1">Bonus Totale Sbloccato</p>
                <p className="text-4xl font-bold text-green-600">€{metrics.bonusTotale}</p>
              </div>

              {/* Overview Metriche Attive */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3" style={{ 
                gridTemplateColumns: window.innerWidth >= 1024 ? `repeat(${metrics.target.metriche_attive?.filter(m => {
                  if (m === 'fatturato' && metrics.target.target_fatturato) return true;
                  if (m === 'recensioni_media' && metrics.target.target_recensioni_media) return true;
                  if (m === 'num_recensioni' && metrics.target.target_num_recensioni) return true;
                  if (m === 'ordini_sbagliati' && metrics.target.target_ordini_sbagliati_max !== undefined) return true;
                  if (m === 'ritardi' && metrics.target.target_ritardi_max_minuti !== undefined) return true;
                  if (m === 'pulizie' && metrics.target.target_pulizie_min_score) return true;
                  return false;
                }).length || 6}, minmax(0, 1fr))` : undefined
              }}>
                {metrics.target.metriche_attive?.includes('fatturato') && metrics.target.target_fatturato && (
                  <div className="neumorphic-flat p-3 rounded-xl text-center">
                    <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <p className="text-xs text-slate-500 mb-1">Fatturato</p>
                    {metrics.fatturato >= metrics.target.target_fatturato ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                    ) : metrics.fatturato >= (metrics.target.soglia_min_fatturato || 0) ? (
                      <XCircle className="w-5 h-5 text-orange-600 mx-auto" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                    )}
                  </div>
                )}
                
                {metrics.target.metriche_attive?.includes('recensioni_media') && metrics.target.target_recensioni_media && (
                  <div className="neumorphic-flat p-3 rounded-xl text-center">
                    <Star className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                    <p className="text-xs text-slate-500 mb-1">Recensioni</p>
                    {metrics.avgRating >= metrics.target.target_recensioni_media ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                    ) : (
                      <XCircle className="w-5 h-5 text-orange-600 mx-auto" />
                    )}
                  </div>
                )}

                {metrics.target.metriche_attive?.includes('num_recensioni') && metrics.target.target_num_recensioni && (
                  <div className="neumorphic-flat p-3 rounded-xl text-center">
                    <Star className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                    <p className="text-xs text-slate-500 mb-1"># Recensioni</p>
                    {metrics.totalReviews >= metrics.target.target_num_recensioni ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                    ) : (
                      <XCircle className="w-5 h-5 text-orange-600 mx-auto" />
                    )}
                  </div>
                )}

                {metrics.target.metriche_attive?.includes('ordini_sbagliati') && metrics.target.target_ordini_sbagliati_max !== undefined && (
                  <div className="neumorphic-flat p-3 rounded-xl text-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                    <p className="text-xs text-slate-500 mb-1">Ordini</p>
                    {metrics.wrongOrdersCount <= metrics.target.target_ordini_sbagliati_max ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                    )}
                  </div>
                )}

                {metrics.target.metriche_attive?.includes('ritardi') && metrics.target.target_ritardi_max_minuti !== undefined && (
                  <div className="neumorphic-flat p-3 rounded-xl text-center">
                    <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-xs text-slate-500 mb-1">Ritardi</p>
                    {metrics.totalDelayMinutes <= metrics.target.target_ritardi_max_minuti ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                    )}
                  </div>
                )}

                {metrics.target.metriche_attive?.includes('pulizie') && metrics.target.target_pulizie_min_score && (
                  <div className="neumorphic-flat p-3 rounded-xl text-center">
                    <Sparkles className="w-5 h-5 text-cyan-600 mx-auto mb-1" />
                    <p className="text-xs text-slate-500 mb-1">Pulizie</p>
                    {metrics.avgCleaningScore >= metrics.target.target_pulizie_min_score ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                    ) : (
                      <XCircle className="w-5 h-5 text-orange-600 mx-auto" />
                    )}
                  </div>
                )}
              </div>
            </NeumorphicCard>
          )}

          {/* Metriche Attive */}
          {metrics.target?.metriche_attive?.includes('fatturato') && (
            <NeumorphicCard className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-bold text-slate-800">Fatturato</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-1">Attuale</p>
                  <p className="text-2xl font-bold text-green-600">€{metrics.fatturato.toLocaleString()}</p>
                </div>
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-1">Target Bonus</p>
                  <p className="text-xl font-bold text-blue-700">€{metrics.target.target_fatturato?.toLocaleString()}</p>
                  <p className="text-xs text-green-600 mt-1">+€{metrics.target.bonus_fatturato || 0}</p>
                </div>
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-1">Soglia Min</p>
                  <p className="text-xl font-bold text-red-600">€{metrics.target.soglia_min_fatturato?.toLocaleString() || '-'}</p>
                  <p className="text-xs text-red-600 mt-1">perdi tutto</p>
                </div>
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-1">Stato</p>
                  {metrics.fatturato >= metrics.target.target_fatturato ? (
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                  ) : (
                    <p className={`text-xl font-bold ${metrics.fatturato >= metrics.target.soglia_min_fatturato ? 'text-orange-600' : 'text-red-600'}`}>
                      {Math.round((metrics.fatturato / metrics.target.target_fatturato) * 100)}%
                    </p>
                  )}
                </div>
              </div>
            </NeumorphicCard>
          )}

          {/* Recensioni */}
          {metrics.target?.metriche_attive?.includes('recensioni_media') && metrics.target.target_recensioni_media && (
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Star className="w-6 h-6 text-yellow-500" />
                  <h2 className="text-xl font-bold text-slate-800">Media Recensioni</h2>
                </div>
                <button 
                  onClick={() => setShowDetailModal('reviews')}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Eye className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-1">Attuale</p>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-2xl font-bold text-slate-800">{metrics.avgRating.toFixed(1)}</p>
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">({metrics.totalReviews} rec)</p>
                </div>
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-1">Target Bonus</p>
                  <p className="text-xl font-bold text-blue-700">{metrics.target.target_recensioni_media}</p>
                  <p className="text-xs text-green-600 mt-1">+€{metrics.target.bonus_recensioni || 0}</p>
                </div>
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-1">Soglia Min</p>
                  <p className="text-xl font-bold text-red-600">{metrics.target.soglia_min_recensioni || '-'}</p>
                  <p className="text-xs text-red-600 mt-1">perdi tutto</p>
                </div>
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-1">Stato</p>
                  {metrics.avgRating >= metrics.target.target_recensioni_media ? (
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                  ) : (
                    <XCircle className="w-8 h-8 text-orange-600 mx-auto" />
                  )}
                </div>
              </div>
            </NeumorphicCard>
          )}

          {/* Ordini Sbagliati */}
          {metrics.target?.metriche_attive?.includes('ordini_sbagliati') && metrics.target.target_ordini_sbagliati_max !== undefined && (
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  <h2 className="text-xl font-bold text-slate-800">Ordini Sbagliati</h2>
                </div>
                <button 
                  onClick={() => setShowDetailModal('wrongOrders')}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Eye className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-1">Attuali</p>
                  <p className="text-2xl font-bold text-red-600">{metrics.wrongOrdersCount}</p>
                </div>
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-1">Target Bonus</p>
                  <p className="text-xl font-bold text-blue-700">≤ {metrics.target.target_ordini_sbagliati_max}</p>
                  <p className="text-xs text-green-600 mt-1">+€{metrics.target.bonus_ordini_sbagliati || 0}</p>
                </div>
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-1">Soglia Max</p>
                  <p className="text-xl font-bold text-red-600">{metrics.target.soglia_max_ordini_sbagliati || '-'}</p>
                  <p className="text-xs text-red-600 mt-1">perdi tutto</p>
                </div>
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-1">Stato</p>
                  {metrics.wrongOrdersCount <= metrics.target.target_ordini_sbagliati_max ? (
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-600 mx-auto" />
                  )}
                </div>
              </div>
            </NeumorphicCard>
          )}

          {/* Ritardi */}
          {metrics.target?.metriche_attive?.includes('ritardi') && metrics.target.target_ritardi_max_minuti !== undefined && (
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-bold text-slate-800">Ritardi</h2>
                </div>
                <button 
                  onClick={() => setShowDetailModal('delays')}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Eye className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-1">Ritardi Tot</p>
                  <p className="text-2xl font-bold text-slate-800">{metrics.totalDelayMinutes} min</p>
                  <p className="text-xs text-slate-500 mt-1">({metrics.totalShifts} turni)</p>
                </div>
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-1">Target Bonus</p>
                  <p className="text-xl font-bold text-blue-700">≤ {metrics.target.target_ritardi_max_minuti} min</p>
                  <p className="text-xs text-green-600 mt-1">+€{metrics.target.bonus_ritardi || 0}</p>
                </div>
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-1">Soglia Max</p>
                  <p className="text-xl font-bold text-red-600">{metrics.target.soglia_max_ritardi || '-'} min</p>
                  <p className="text-xs text-red-600 mt-1">perdi tutto</p>
                </div>
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-1">Stato</p>
                  {metrics.totalDelayMinutes <= metrics.target.target_ritardi_max_minuti ? (
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-600 mx-auto" />
                  )}
                </div>
              </div>
            </NeumorphicCard>
          )}

          {/* Pulizie */}
          {metrics.target?.metriche_attive?.includes('pulizie') && metrics.target.target_pulizie_min_score && (
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-cyan-600" />
                  <h2 className="text-xl font-bold text-slate-800">Pulizie</h2>
                </div>
                <button 
                  onClick={() => setShowDetailModal('cleanings')}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Eye className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-1">Score Attuale</p>
                  <p className="text-2xl font-bold text-slate-800">{metrics.avgCleaningScore.toFixed(0)}</p>
                  <p className="text-xs text-slate-500 mt-1">({metrics.totalInspections} controlli)</p>
                </div>
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-1">Target Bonus</p>
                  <p className="text-xl font-bold text-blue-700">≥ {metrics.target.target_pulizie_min_score}</p>
                  <p className="text-xs text-green-600 mt-1">+€{metrics.target.bonus_pulizie || 0}</p>
                </div>
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-1">Soglia Min</p>
                  <p className="text-xl font-bold text-red-600">{metrics.target.soglia_min_pulizie || '-'}</p>
                  <p className="text-xs text-red-600 mt-1">perdi tutto</p>
                </div>
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-1">Stato</p>
                  {metrics.avgCleaningScore >= metrics.target.target_pulizie_min_score ? (
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                  ) : (
                    <XCircle className="w-8 h-8 text-orange-600 mx-auto" />
                  )}
                </div>
              </div>
            </NeumorphicCard>
          )}

          {/* Scorecard Dipendenti */}
          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-800">Scorecard Dipendenti</h2>
            </div>

            {employeeScorecard.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Nessun turno registrato per questo locale nel periodo selezionato</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left p-3 text-slate-600 font-medium">Dipendente</th>
                      <th className="text-center p-3 text-slate-600 font-medium">Turni</th>
                      <th className="text-center p-3 text-slate-600 font-medium">Ritardi</th>
                      <th className="text-center p-3 text-slate-600 font-medium">Ritardo Totale</th>
                      <th className="text-center p-3 text-slate-600 font-medium">Ordini Sbag.</th>
                      <th className="text-center p-3 text-slate-600 font-medium">Recensioni</th>
                      <th className="text-center p-3 text-slate-600 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeScorecard.map(emp => (
                      <React.Fragment key={emp.id}>
                        <tr className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800">{emp.name}</span>
                              {emp.isPrimaryHere && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                                  Principale
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1 mt-1">
                              {emp.ruoli.map(r => (
                                <span key={r} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r}</span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-700">{emp.shiftsCount}</td>
                          <td className="p-3 text-center">
                            <span className={`font-bold ${emp.lateShifts > 3 ? 'text-red-600' : 'text-green-600'}`}>
                              {emp.lateShifts}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`font-bold ${emp.totalDelayMinutes > 10 ? 'text-red-600' : 'text-green-600'}`}>
                              {emp.totalDelayMinutes} min
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`font-bold ${emp.wrongOrdersCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {emp.wrongOrdersCount}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {emp.reviewsCount > 0 ? (
                              <div className="flex items-center justify-center gap-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span className="font-bold text-slate-700">{emp.avgRating.toFixed(1)}</span>
                                <span className="text-xs text-slate-500">({emp.reviewsCount})</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => setExpandedEmployee(expandedEmployee === emp.id ? null : emp.id)}
                              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                              <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expandedEmployee === emp.id ? 'rotate-90' : ''}`} />
                            </button>
                          </td>
                        </tr>

                        {expandedEmployee === emp.id && (
                          <tr className="bg-slate-50">
                            <td colSpan="7" className="p-4">
                              <div className="space-y-4">
                                {/* Ritardi */}
                                {emp.lateShiftsDetails.length > 0 && (
                                  <div className="neumorphic-pressed p-4 rounded-xl">
                                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                      <Clock className="w-5 h-5 text-red-600" />
                                      Turni in Ritardo ({emp.lateShiftsDetails.length})
                                    </h4>
                                    <div className="space-y-2">
                                      {emp.lateShiftsDetails.slice(0, 5).map((shift, idx) => {
                                       let ritardoReale = 0;
                                       let oraInizioTurno = '';
                                       let oraTimbratura = '';
                                       if (shift.timbratura_entrata && shift.ora_inizio) {
                                         try {
                                           const clockInTime = new Date(shift.timbratura_entrata);
                                           oraTimbratura = clockInTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                                           oraInizioTurno = shift.ora_inizio;
                                           const [oraInizioHH, oraInizioMM] = shift.ora_inizio.split(':').map(Number);
                                           const scheduledStart = new Date(clockInTime);
                                           scheduledStart.setHours(oraInizioHH, oraInizioMM, 0, 0);
                                           const delayMs = clockInTime - scheduledStart;
                                           const delayMinutes = Math.floor(delayMs / 60000);
                                           ritardoReale = delayMinutes > 0 ? delayMinutes : 0;
                                         } catch (e) {}
                                       }
                                       return (
                                         <div key={idx} className="bg-white p-3 rounded-lg text-sm">
                                           <div className="flex items-center justify-between mb-2">
                                             <span className="font-medium text-slate-700">{new Date(shift.data).toLocaleDateString('it-IT')}</span>
                                             <span className="font-bold text-red-600">+{ritardoReale} min</span>
                                           </div>
                                           <div className="text-xs text-slate-500">
                                             <strong>Previsto:</strong> {oraInizioTurno} → <strong>Timbrato:</strong> {oraTimbratura}
                                           </div>
                                         </div>
                                       );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Ordini Sbagliati */}
                                {emp.wrongOrdersDetails.length > 0 && (
                                  <div className="neumorphic-pressed p-4 rounded-xl">
                                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                      <AlertTriangle className="w-5 h-5 text-purple-600" />
                                      Ordini Sbagliati ({emp.wrongOrdersDetails.length})
                                    </h4>
                                    <div className="space-y-2">
                                      {emp.wrongOrdersDetails.slice(0, 5).map((order, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-lg text-sm">
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-slate-700">#{order.order_id}</span>
                                            <span className="text-xs text-purple-600 font-bold">{order.platform}</span>
                                          </div>
                                          <div className="text-xs text-slate-500">
                                            {new Date(order.order_date).toLocaleDateString('it-IT')} • {new Date(order.order_date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} • €{order.order_total?.toFixed(2) || '0.00'}
                                          </div>
                                          {order.complaint_reason && (
                                            <p className="text-xs text-slate-600 mt-1 italic">{order.complaint_reason}</p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Recensioni */}
                                {emp.reviewsDetails.length > 0 && (
                                  <div className="neumorphic-pressed p-4 rounded-xl">
                                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                      <Star className="w-5 h-5 text-yellow-500" />
                                      Recensioni Google ({emp.reviewsDetails.length})
                                    </h4>
                                    <div className="space-y-2">
                                      {emp.reviewsDetails.slice(0, 5).map((review, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-lg text-sm">
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-slate-600">{review.customer_name || 'Anonimo'}</span>
                                            <div className="flex items-center gap-1">
                                              {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                              ))}
                                            </div>
                                          </div>
                                          {(review.comment || review.review_text) && (
                                            <p className="text-xs text-slate-600 mb-2 bg-slate-50 p-2 rounded italic">
                                              "{review.comment || review.review_text}"
                                            </p>
                                          )}
                                          <p className="text-xs text-slate-400">{new Date(review.review_date).toLocaleDateString('it-IT')}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </NeumorphicCard>
        </>
      )}

      {/* Modal Approvazioni */}
      {showApprovazioniModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Bell className="w-6 h-6 text-purple-600" />
                  Richieste di Scambio Turno
                </h2>
                <button onClick={() => setShowApprovazioniModal(false)} className="text-slate-500">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {richiesteScambio.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-slate-600 font-medium">Nessuna richiesta in attesa</p>
                  <p className="text-sm text-slate-500 mt-1">Tutte le richieste sono state processate</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {richiesteScambio.map(richiesta => (
                    <div key={richiesta.id} className="neumorphic-pressed p-5 rounded-xl">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            <h3 className="font-bold text-slate-800">{richiesta.dipendente_nome}</h3>
                          </div>
                          <div className="space-y-1 text-sm text-slate-600">
                            <p>📅 Data: {new Date(richiesta.data_turno).toLocaleDateString('it-IT')}</p>
                            <p>🕐 Orario: {richiesta.ora_inizio} - {richiesta.ora_fine}</p>
                            <p>👤 Ruolo: {richiesta.ruolo}</p>
                            <p>🏪 Locale: {richiesta.store_name}</p>
                            {richiesta.note && (
                              <p className="text-slate-500 italic mt-2">💬 {richiesta.note}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await base44.entities.RichiestaTurnoLibero.update(richiesta.id, {
                                  stato: 'approvata',
                                  data_approvazione: new Date().toISOString(),
                                  approvato_da: currentUser.email
                                });
                                queryClient.invalidateQueries({ queryKey: ['richieste-scambio'] });
                                alert('✅ Richiesta approvata');
                              } catch (error) {
                                alert('❌ Errore nell\'approvazione');
                              }
                            }}
                            className="px-4 py-2 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors flex items-center gap-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approva
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await base44.entities.RichiestaTurnoLibero.update(richiesta.id, {
                                  stato: 'rifiutata',
                                  data_approvazione: new Date().toISOString(),
                                  approvato_da: currentUser.email
                                });
                                queryClient.invalidateQueries({ queryKey: ['richieste-scambio'] });
                                alert('❌ Richiesta rifiutata');
                              } catch (error) {
                                alert('❌ Errore nel rifiuto');
                              }
                            }}
                            className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors flex items-center gap-1"
                          >
                            <XCircle className="w-4 h-4" />
                            Rifiuta
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </NeumorphicCard>
          </div>
        </div>
      )}

      {/* Detail Modals */}
      {showDetailModal === 'reviews' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Star className="w-6 h-6 text-yellow-500" />
                  Dettaglio Recensioni
                </h2>
                <button onClick={() => setShowDetailModal(null)} className="text-slate-500">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-3">
                {metrics.monthReviews.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">Nessuna recensione questo mese</p>
                ) : (
                  metrics.monthReviews.map(review => (
                    <div key={review.id} className="neumorphic-pressed p-4 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                          <span className="font-bold text-slate-800 text-lg">{review.rating}/5</span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(review.review_date).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                      {review.review_text && (
                        <div className="bg-slate-50 p-3 rounded-lg mb-2">
                          <p className="text-sm text-slate-700 italic">"{review.review_text}"</p>
                        </div>
                      )}
                      {review.employee_assigned_name && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs font-medium text-slate-500">Assegnata a:</span>
                          <span className="text-xs font-bold text-slate-700">{review.employee_assigned_name}</span>
                        </div>
                      )}
                      {!review.review_text && !review.employee_assigned_name && (
                        <p className="text-xs text-slate-400 italic">Nessun dettaglio aggiuntivo</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </NeumorphicCard>
          </div>
        </div>
      )}

      {showDetailModal === 'wrongOrders' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  Dettaglio Ordini Sbagliati
                </h2>
                <button onClick={() => setShowDetailModal(null)} className="text-slate-500">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-3">
                {metrics.monthWrongOrders.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">Nessun ordine sbagliato questo mese 🎉</p>
                ) : (
                  metrics.monthWrongOrders.map(order => (
                    <div key={order.id} className="neumorphic-pressed p-4 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                         <span className="font-bold text-red-700">#{order.order_id || 'N/A'} • {order.platform}</span>
                         <span className="text-xs text-slate-500">
                           {new Date(order.order_date).toLocaleDateString('it-IT')} {new Date(order.order_date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                         </span>
                       </div>
                      {(() => {
                        const matches = wrongOrderMatches.filter(m => m.wrong_order_id === order.id);
                        return matches.length > 0 ? (
                          <p className="text-sm text-slate-700 mb-1">👤 <strong>Assegnato a:</strong> {matches.map(m => m.matched_employee_name).join(', ')}</p>
                        ) : null;
                      })()}
                      <p className="text-xs text-slate-600 mb-1">💰 Importo: €{order.order_total || 0}</p>
                      {order.complaint_reason && (
                        <p className="text-xs text-slate-500 italic">📝 {order.complaint_reason}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </NeumorphicCard>
          </div>
        </div>
      )}

      {showDetailModal === 'delays' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-blue-600" />
                  Dettaglio Ritardi
                </h2>
                <button onClick={() => setShowDetailModal(null)} className="text-slate-500">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-3">
                {metrics.monthShifts.filter(s => s.in_ritardo === true).length === 0 ? (
                  <p className="text-center text-slate-500 py-8">Nessun ritardo questo mese 🎉</p>
                ) : (
                  metrics.monthShifts.filter(s => s.in_ritardo === true).map(shift => {
                    let ritardoReale = 0;
                    let oraInizioTurno = '';
                    let oraTimbratura = '';
                    if (shift.timbratura_entrata && shift.ora_inizio) {
                      try {
                        const clockInTime = new Date(shift.timbratura_entrata);
                        oraTimbratura = clockInTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                        oraInizioTurno = shift.ora_inizio;
                        const [oraInizioHH, oraInizioMM] = shift.ora_inizio.split(':').map(Number);
                        const scheduledStart = new Date(clockInTime);
                        scheduledStart.setHours(oraInizioHH, oraInizioMM, 0, 0);
                        const delayMs = clockInTime - scheduledStart;
                        const delayMinutes = Math.floor(delayMs / 60000);
                        ritardoReale = delayMinutes > 0 ? delayMinutes : 0;
                      } catch (e) {}
                    }
                    return (
                      <div key={shift.id} className="neumorphic-pressed p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-800">{shift.dipendente_nome}</span>
                          <span className="text-xs text-slate-500">
                            {new Date(shift.data).toLocaleDateString('it-IT')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>🕐 Previsto: {oraInizioTurno}</span>
                          <ArrowRight className="w-4 h-4" />
                          <span className="text-red-600 font-medium">
                            Timbrato: {oraTimbratura}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                            +{ritardoReale} min
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </NeumorphicCard>
          </div>
        </div>
      )}

      {showDetailModal === 'cleanings' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-cyan-600" />
                  Dettaglio Pulizie
                </h2>
                <button onClick={() => setShowDetailModal(null)} className="text-slate-500">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-3">
                {metrics.monthInspections.filter(i => (i.overall_score || 0) > 0).length === 0 ? (
                  <p className="text-center text-slate-500 py-8">Nessun controllo pulizie completato questo mese</p>
                ) : (
                  metrics.monthInspections.filter(i => (i.overall_score || 0) > 0).map(inspection => (
                    <div key={inspection.id} className="neumorphic-pressed p-4 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-800">{inspection.inspector_name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full font-bold ${
                            inspection.overall_score >= 80 ? 'bg-green-100 text-green-700' :
                            inspection.overall_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {inspection.overall_score}/100
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(inspection.inspection_date).toLocaleDateString('it-IT')}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Ruolo: {inspection.inspector_role} • Tipo: {inspection.inspection_type}
                      </p>
                      {inspection.critical_issues && (
                        <p className="text-sm text-red-600 mt-2">⚠️ {inspection.critical_issues}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </NeumorphicCard>
          </div>
        </div>
      )}
    </div>
  );
}