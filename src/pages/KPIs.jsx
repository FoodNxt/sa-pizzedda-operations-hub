import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProtectedPage from '../components/ProtectedPage';
import NeumorphicCard from '../components/neumorphic/NeumorphicCard';
import NeumorphicButton from '../components/neumorphic/NeumorphicButton';
import { Plus, TrendingUp, TrendingDown, Target, Edit2, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const metricLabels = {
  food_cost_percentuale: 'Food Cost %',
  numero_recensioni: 'Numero Recensioni',
  punteggio_medio_recensioni: 'Rating Medio',
  produttivita_oraria: 'Produttività €/h',
  revenue_giornaliero: 'Revenue Giornaliero',
  ordini_giornalieri: 'Ordini Giornalieri',
  scontrino_medio: 'Scontrino Medio',
  percentuale_delivery: 'Delivery %',
  percentuale_takeaway: 'Takeaway %'
};

export default function KPIs() {
  const [showModal, setShowModal] = useState(false);
  const [editingKPI, setEditingKPI] = useState(null);
  const [dateRange, setDateRange] = useState('30');
  const [formData, setFormData] = useState({
    nome: '',
    metrica: '',
    obiettivo: '',
    giorni_timeframe: '30',
    direzione: 'maggiore',
    store_id: '',
    attivo: true
  });

  const queryClient = useQueryClient();

  const { data: kpis = [] } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => base44.entities.KPI.filter({ attivo: true })
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: ricette = [] } = useQuery({
    queryKey: ['ricette'],
    queryFn: () => base44.entities.Ricetta.list()
  });

  const { data: iPraticoData = [] } = useQuery({
    queryKey: ['iPratico'],
    queryFn: () => base44.entities.iPratico.list('-order_date', 500)
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => base44.entities.Review.list('-review_date', 500)
  });

  const { data: produttivitaData = [] } = useQuery({
    queryKey: ['produttivita'],
    queryFn: () => base44.entities.RevenueByTimeSlot.list('-date', 500)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.KPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      setShowModal(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      setShowModal(false);
      setEditingKPI(null);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.KPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
    }
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      metrica: '',
      obiettivo: '',
      giorni_timeframe: '30',
      direzione: 'maggiore',
      store_id: '',
      attivo: true
    });
  };

  const openEditModal = (kpi) => {
    setEditingKPI(kpi);
    setFormData({
      nome: kpi.nome,
      metrica: kpi.metrica,
      obiettivo: kpi.obiettivo,
      giorni_timeframe: kpi.giorni_timeframe || '30',
      direzione: kpi.direzione,
      store_id: kpi.store_id || '',
      attivo: kpi.attivo
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!formData.nome || !formData.metrica || !formData.obiettivo) return;

    const data = {
      ...formData,
      obiettivo: parseFloat(formData.obiettivo),
      giorni_timeframe: formData.giorni_timeframe ? parseInt(formData.giorni_timeframe) : 30,
      store_id: formData.store_id || null
    };

    if (editingKPI) {
      updateMutation.mutate({ id: editingKPI.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getDateRange = () => {
    const days = parseInt(dateRange);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  const calculateMetricValue = (kpi) => {
    const storeFilter = kpi.store_id || null;

    switch (kpi.metrica) {
      case 'food_cost_percentuale': {
        const ricetteAttive = ricette.filter(r => r.attivo !== false);
        if (ricetteAttive.length === 0) return 0;
        const totalFoodCost = ricetteAttive.reduce((sum, r) => sum + (r.food_cost_online || 0), 0);
        return (totalFoodCost / ricetteAttive.length).toFixed(1);
      }

      case 'numero_recensioni': {
        const filtered = reviews.filter(r => {
          if (!r.review_date) return false;
          const reviewDate = new Date(r.review_date);
          const inRange = reviewDate >= startDate && reviewDate <= endDate;
          const inStore = !storeFilter || r.store_id === storeFilter;
          return inRange && inStore;
        });
        return filtered.length;
      }

      case 'punteggio_medio_recensioni': {
        const filtered = reviews.filter(r => {
          if (!r.review_date) return false;
          const reviewDate = new Date(r.review_date);
          const inRange = reviewDate >= startDate && reviewDate <= endDate;
          const inStore = !storeFilter || r.store_id === storeFilter;
          return inRange && inStore;
        });
        if (filtered.length === 0) return 0;
        const avg = filtered.reduce((sum, r) => sum + r.rating, 0) / filtered.length;
        return avg.toFixed(2);
      }

      case 'produttivita_oraria': {
        const filtered = produttivitaData.filter(p => {
          if (!p.date) return false;
          const prodDate = new Date(p.date);
          const inRange = prodDate >= startDate && prodDate <= endDate;
          const inStore = !storeFilter || p.store_id === storeFilter;
          return inRange && inStore;
        });
        if (filtered.length === 0) return 0;
        const totalRevenue = filtered.reduce((sum, p) => sum + (p.total_revenue || 0), 0);
        const totalHours = filtered.length * 12; // 12h per day approx
        return (totalRevenue / totalHours).toFixed(2);
      }

      case 'revenue_giornaliero': {
        const filtered = iPraticoData.filter(d => {
          if (!d.order_date) return false;
          const orderDate = new Date(d.order_date);
          const inRange = orderDate >= startDate && orderDate <= endDate;
          const inStore = !storeFilter || d.store_id === storeFilter;
          return inRange && inStore;
        });
        if (filtered.length === 0) return 0;
        const totalRevenue = filtered.reduce((sum, d) => sum + (d.total_revenue || 0), 0);
        return (totalRevenue / filtered.length).toFixed(2);
      }

      case 'ordini_giornalieri': {
        const filtered = iPraticoData.filter(d => {
          if (!d.order_date) return false;
          const orderDate = new Date(d.order_date);
          const inRange = orderDate >= startDate && orderDate <= endDate;
          const inStore = !storeFilter || d.store_id === storeFilter;
          return inRange && inStore;
        });
        if (filtered.length === 0) return 0;
        const totalOrders = filtered.reduce((sum, d) => sum + (d.total_orders || 0), 0);
        return Math.round(totalOrders / filtered.length);
      }

      case 'scontrino_medio': {
        const filtered = iPraticoData.filter(d => {
          if (!d.order_date) return false;
          const orderDate = new Date(d.order_date);
          const inRange = orderDate >= startDate && orderDate <= endDate;
          const inStore = !storeFilter || d.store_id === storeFilter;
          return inRange && inStore;
        });
        if (filtered.length === 0) return 0;
        const totalRevenue = filtered.reduce((sum, d) => sum + (d.total_revenue || 0), 0);
        const totalOrders = filtered.reduce((sum, d) => sum + (d.total_orders || 0), 0);
        return totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;
      }

      case 'percentuale_delivery': {
        const filtered = iPraticoData.filter(d => {
          if (!d.order_date) return false;
          const orderDate = new Date(d.order_date);
          const inRange = orderDate >= startDate && orderDate <= endDate;
          const inStore = !storeFilter || d.store_id === storeFilter;
          return inRange && inStore;
        });
        if (filtered.length === 0) return 0;
        const totalRevenue = filtered.reduce((sum, d) => sum + (d.total_revenue || 0), 0);
        const deliveryRevenue = filtered.reduce((sum, d) => sum + (d.sourceType_delivery || 0), 0);
        return totalRevenue > 0 ? ((deliveryRevenue / totalRevenue) * 100).toFixed(1) : 0;
      }

      case 'percentuale_takeaway': {
        const filtered = iPraticoData.filter(d => {
          if (!d.order_date) return false;
          const orderDate = new Date(d.order_date);
          const inRange = orderDate >= startDate && orderDate <= endDate;
          const inStore = !storeFilter || d.store_id === storeFilter;
          return inRange && inStore;
        });
        if (filtered.length === 0) return 0;
        const totalRevenue = filtered.reduce((sum, d) => sum + (d.total_revenue || 0), 0);
        const takeawayRevenue = filtered.reduce((sum, d) => sum + (d.sourceType_takeaway || 0), 0);
        return totalRevenue > 0 ? ((takeawayRevenue / totalRevenue) * 100).toFixed(1) : 0;
      }

      default:
        return 0;
    }
  };

  const kpisWithValues = kpis.map(kpi => {
    const currentValue = parseFloat(calculateMetricValue(kpi));
    const target = kpi.obiettivo;
    const isAchieved = kpi.direzione === 'maggiore' 
      ? currentValue >= target 
      : currentValue <= target;
    const percentage = target > 0 ? ((currentValue / target) * 100).toFixed(1) : 0;
    
    return {
      ...kpi,
      currentValue,
      isAchieved,
      percentage
    };
  });

  return (
    <ProtectedPage pageName="KPIs">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">KPIs</h1>
            <p className="text-slate-500">Monitora gli obiettivi aziendali</p>
          </div>
          <NeumorphicButton
            onClick={() => {
              setEditingKPI(null);
              resetForm();
              setShowModal(true);
            }}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuovo KPI
          </NeumorphicButton>
        </div>

        {/* Date Range Filter */}
        <NeumorphicCard className="p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-slate-700">Periodo di Riferimento:</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="neumorphic-pressed px-4 py-2 rounded-lg text-slate-700 outline-none text-sm"
            >
              <option value="7">Ultimi 7 giorni</option>
              <option value="30">Ultimi 30 giorni</option>
              <option value="60">Ultimi 60 giorni</option>
              <option value="90">Ultimi 90 giorni</option>
            </select>
          </div>
        </NeumorphicCard>

        {/* KPIs Grid */}
        {kpisWithValues.length === 0 ? (
          <NeumorphicCard className="p-12 text-center">
            <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nessun KPI configurato</p>
            <p className="text-sm text-slate-400 mt-2">Clicca su "Nuovo KPI" per iniziare</p>
          </NeumorphicCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kpisWithValues.map((kpi) => (
              <NeumorphicCard
                key={kpi.id}
                className={`p-6 border-2 ${
                  kpi.isAchieved ? 'border-green-500' : 'border-red-500'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 text-lg mb-1">{kpi.nome}</h3>
                    <p className="text-xs text-slate-500">
                      {metricLabels[kpi.metrica]}
                      {kpi.store_id && ` - ${stores.find(s => s.id === kpi.store_id)?.name || 'Store'}`}
                      {kpi.giorni_timeframe && ` (${kpi.giorni_timeframe}gg)`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(kpi)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(kpi.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Valore Attuale</p>
                      <p className="text-3xl font-bold text-slate-800">
                        {kpi.metrica.includes('percentuale') || kpi.metrica === 'food_cost_percentuale' 
                          ? `${kpi.currentValue}%` 
                          : kpi.currentValue}
                      </p>
                    </div>
                    <div className={`flex items-center gap-2 ${kpi.isAchieved ? 'text-green-600' : 'text-red-600'}`}>
                      {kpi.isAchieved ? (
                        <TrendingUp className="w-6 h-6" />
                      ) : (
                        <TrendingDown className="w-6 h-6" />
                      )}
                      <span className="text-sm font-semibold">
                        {kpi.percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="neumorphic-pressed p-3 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Obiettivo</p>
                    <p className="text-lg font-bold text-slate-700">
                      {kpi.direzione === 'maggiore' ? '≥' : '≤'} {kpi.obiettivo}
                      {kpi.metrica.includes('percentuale') || kpi.metrica === 'food_cost_percentuale' ? '%' : ''}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        kpi.isAchieved ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(kpi.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              </NeumorphicCard>
            ))}
          </div>
        )}

        {/* Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingKPI ? 'Modifica KPI' : 'Nuovo KPI'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Nome KPI</label>
                <Input
                  placeholder="es. Food Cost Obiettivo"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Metrica</label>
                <Select value={formData.metrica} onValueChange={(v) => setFormData({ ...formData, metrica: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona metrica..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(metricLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Valore Obiettivo</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="es. 25"
                  value={formData.obiettivo}
                  onChange={(e) => setFormData({ ...formData, obiettivo: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Time Frame (giorni)</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="es. 30"
                  value={formData.giorni_timeframe}
                  onChange={(e) => setFormData({ ...formData, giorni_timeframe: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1">Numero di giorni in cui raggiungere l'obiettivo</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Direzione</label>
                <Select value={formData.direzione} onValueChange={(v) => setFormData({ ...formData, direzione: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maggiore">Maggiore o uguale (≥)</SelectItem>
                    <SelectItem value="minore">Minore o uguale (≤)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Store (opzionale)</label>
                <Select value={formData.store_id} onValueChange={(v) => setFormData({ ...formData, store_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tutti gli store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Tutti gli store</SelectItem>
                    {stores.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <NeumorphicButton
                  onClick={() => {
                    setShowModal(false);
                    setEditingKPI(null);
                    resetForm();
                  }}
                  variant="secondary"
                >
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton
                  onClick={handleSubmit}
                  disabled={!formData.nome || !formData.metrica || !formData.obiettivo}
                  variant="primary"
                >
                  {editingKPI ? 'Aggiorna' : 'Crea'}
                </NeumorphicButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedPage>
  );
}