import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProtectedPage from '../components/ProtectedPage';
import NeumorphicCard from '../components/neumorphic/NeumorphicCard';
import NeumorphicButton from '../components/neumorphic/NeumorphicButton';
import { Plus, TrendingUp, TrendingDown, Target, Edit2, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const metricLabels = {
  food_cost_percentuale: 'Food Cost % (medio ricette)',
  numero_recensioni: 'Numero Recensioni',
  punteggio_medio_recensioni: 'Rating Medio',
  produttivita_oraria: 'Produttività €/h',
  revenue_giornaliero: 'Revenue Giornaliero',
  ordini_giornalieri: 'Ordini Giornalieri',
  scontrino_medio: 'Scontrino Medio',
  percentuale_delivery: 'Delivery %',
  percentuale_takeaway: 'Takeaway %',
  percentuale_online: 'Online %',
  food_cost_medio: 'Food Cost % (reale vs ricette)',
  sconto_percentuale: 'Sconto % su Gross Sales',
  sprechi_valore: 'Sprechi (€)',
  review_tendenza: 'Trend Recensioni (% crescita)',
  percentuale_store_revenue: '% Revenue Store (su totale)',
  ordini_sbagliati_numero: 'Numero Ordini Sbagliati',
  percentuale_ordini_corretti: '% Ordini Corretti',
  score_pulizie_medio: 'Score Pulizie Medio',
  revenue_totale: 'Revenue Totale',
  numero_sprechi_rilevazioni: 'N. Rilevazioni Sprechi'
};

export default function KPIs() {
  const [showModal, setShowModal] = useState(false);
  const [editingKPI, setEditingKPI] = useState(null);
  const [dateRange, setDateRange] = useState('30');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [newCategory, setNewCategory] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    metrica: '',
    categoria: '',
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

  const { data: sprechi = [] } = useQuery({
    queryKey: ['sprechi'],
    queryFn: () => base44.entities.Spreco.list('-data_rilevazione', 500)
  });

  const { data: ordini = [] } = useQuery({
    queryKey: ['ordini-fornitori'],
    queryFn: async () => {
      const allOrdini = await base44.entities.OrdineFornitore.list();
      return allOrdini.filter((o) => o.status === 'completato');
    }
  });

  const { data: wrongOrders = [] } = useQuery({
    queryKey: ['wrong-orders'],
    queryFn: () => base44.entities.WrongOrder.list()
  });

  const { data: cleaningInspections = [] } = useQuery({
    queryKey: ['cleaning-inspections'],
    queryFn: () => base44.entities.CleaningInspection.list('-inspection_date', 500)
  });

  const { data: turni = [] } = useQuery({
    queryKey: ['turni-planday'],
    queryFn: () => base44.entities.TurnoPlanday.list()
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
      categoria: '',
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
      categoria: kpi.categoria || '',
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
      categoria: formData.categoria || 'Senza categoria',
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
        const filteredData = iPraticoData.filter(d => {
          if (!d.order_date) return false;
          const orderDate = new Date(d.order_date);
          const inRange = orderDate >= startDate && orderDate <= endDate;
          const inStore = !storeFilter || d.store_id === storeFilter;
          return inRange && inStore;
        });
        const totalRevenue = filteredData.reduce((sum, d) => sum + (d.total_revenue || 0), 0);
        
        const storeTurni = turni.filter(t => {
          if (!t.timbratura_entrata || !t.timbratura_uscita) return false;
          if (!t.data) return false;
          const shiftDate = new Date(t.data);
          const inRange = shiftDate >= startDate && shiftDate <= endDate;
          const inStore = !storeFilter || t.store_id === storeFilter;
          return inRange && inStore;
        });
        
        const totalHours = storeTurni.reduce((sum, t) => {
          const entrata = new Date(t.timbratura_entrata);
          const uscita = new Date(t.timbratura_uscita);
          return sum + (uscita - entrata) / (1000 * 60 * 60);
        }, 0);
        
        return totalHours > 0 ? (totalRevenue / totalHours).toFixed(2) : 0;
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

      case 'percentuale_online': {
        const filtered = iPraticoData.filter(d => {
          if (!d.order_date) return false;
          const orderDate = new Date(d.order_date);
          const inRange = orderDate >= startDate && orderDate <= endDate;
          const inStore = !storeFilter || d.store_id === storeFilter;
          return inRange && inStore;
        });
        if (filtered.length === 0) return 0;
        const totalRevenue = filtered.reduce((sum, d) => sum + (d.total_revenue || 0), 0);
        const onlineRevenue = filtered.reduce((sum, d) => {
          const delivery = d.sourceType_delivery || 0;
          const takeaway = d.sourceType_takeaway || 0;
          return sum + delivery + takeaway;
        }, 0);
        return totalRevenue > 0 ? ((onlineRevenue / totalRevenue) * 100).toFixed(1) : 0;
      }

      case 'food_cost_medio': {
        const filteredData = iPraticoData.filter(d => {
          if (!d.order_date) return false;
          const orderDate = new Date(d.order_date);
          const inRange = orderDate >= startDate && orderDate <= endDate;
          const inStore = !storeFilter || d.store_id === storeFilter;
          return inRange && inStore;
        });
        const filteredOrdini = ordini.filter(o => {
          if (!o.data_completamento) return false;
          const orderDate = new Date(o.data_completamento);
          const inRange = orderDate >= startDate && orderDate <= endDate;
          const inStore = !storeFilter || o.store_id === storeFilter;
          return inRange && inStore;
        });
        const totalRevenue = filteredData.reduce((sum, d) => sum + (d.total_revenue || 0), 0);
        const totalCOGS = filteredOrdini.reduce((sum, o) => sum + (o.totale_ordine || 0), 0);
        return totalRevenue > 0 ? (totalCOGS / totalRevenue * 100).toFixed(1) : 0;
      }

      case 'sconto_percentuale': {
        const filtered = iPraticoData.filter(d => {
          if (!d.order_date) return false;
          const orderDate = new Date(d.order_date);
          const inRange = orderDate >= startDate && orderDate <= endDate;
          const inStore = !storeFilter || d.store_id === storeFilter;
          return inRange && inStore;
        });
        if (filtered.length === 0) return 0;
        const totalRevenue = filtered.reduce((sum, d) => sum + (d.total_revenue || 0), 0);
        const totalSconti = filtered.reduce((sum, d) => sum + (d.total_discount || 0), 0);
        const grossSales = totalRevenue + totalSconti;
        return grossSales > 0 ? (totalSconti / grossSales * 100).toFixed(2) : 0;
      }

      case 'sprechi_valore': {
        const filtered = sprechi.filter(s => {
          if (!s.data_rilevazione) return false;
          const sprecDate = new Date(s.data_rilevazione);
          const inRange = sprecDate >= startDate && sprecDate <= endDate;
          const inStore = !storeFilter || s.store_id === storeFilter;
          return inRange && inStore;
        });
        const totalSprechi = filtered.reduce((sum, s) => {
          const value = (s.quantita_grammi || 0) * (s.costo_unitario || 0) / 1000;
          return sum + value;
        }, 0);
        return totalSprechi.toFixed(2);
      }

      case 'review_tendenza': {
        const allReviewsFiltered = reviews.filter(r => {
          if (!r.review_date) return false;
          const inStore = !storeFilter || r.store_id === storeFilter;
          return inStore;
        });
        if (allReviewsFiltered.length < 2) return 0;
        const mid = Math.ceil(allReviewsFiltered.length / 2);
        const firstHalf = allReviewsFiltered.slice(0, mid);
        const secondHalf = allReviewsFiltered.slice(mid);
        const firstAvg = firstHalf.reduce((sum, r) => sum + r.rating, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, r) => sum + r.rating, 0) / secondHalf.length;
        const growth = ((secondAvg - firstAvg) / firstAvg) * 100;
        return growth.toFixed(2);
      }

      case 'percentuale_store_revenue': {
        if (!storeFilter) return 0; // Metrica sensata solo per uno store specifico
        const filtered = iPraticoData.filter(d => {
          if (!d.order_date) return false;
          const orderDate = new Date(d.order_date);
          const inRange = orderDate >= startDate && orderDate <= endDate;
          return inRange;
        });
        const totalAllRevenue = filtered.reduce((sum, d) => sum + (d.total_revenue || 0), 0);
        const storeRevenue = filtered.filter(d => d.store_id === storeFilter).reduce((sum, d) => sum + (d.total_revenue || 0), 0);
        return totalAllRevenue > 0 ? (storeRevenue / totalAllRevenue * 100).toFixed(2) : 0;
      }

      case 'ordini_sbagliati_numero': {
        const filtered = wrongOrders.filter(w => {
          if (!w.order_date) return false;
          const orderDate = new Date(w.order_date);
          const inRange = orderDate >= startDate && orderDate <= endDate;
          const inStore = !storeFilter || w.store_id === storeFilter;
          return inRange && inStore;
        });
        return filtered.length;
      }

      case 'percentuale_ordini_corretti': {
        const filteredData = iPraticoData.filter(d => {
          if (!d.order_date) return false;
          const orderDate = new Date(d.order_date);
          const inRange = orderDate >= startDate && orderDate <= endDate;
          const inStore = !storeFilter || d.store_id === storeFilter;
          return inRange && inStore;
        });
        const totalOrders = filteredData.reduce((sum, d) => sum + (d.total_orders || 0), 0);
        
        const filteredWrong = wrongOrders.filter(w => {
          if (!w.order_date) return false;
          const orderDate = new Date(w.order_date);
          const inRange = orderDate >= startDate && orderDate <= endDate;
          const inStore = !storeFilter || w.store_id === storeFilter;
          return inRange && inStore;
        });
        const wrongOrderCount = filteredWrong.length;
        
        return totalOrders > 0 ? (((totalOrders - wrongOrderCount) / totalOrders) * 100).toFixed(2) : 0;
      }

      case 'score_pulizie_medio': {
        const filtered = cleaningInspections.filter(c => {
          if (!c.inspection_date) return false;
          const inspDate = new Date(c.inspection_date);
          const inRange = inspDate >= startDate && inspDate <= endDate;
          const inStore = !storeFilter || c.store_id === storeFilter;
          return inRange && inStore && c.analysis_status === 'completed' && c.overall_score !== null;
        });
        if (filtered.length === 0) return 0;
        const avgScore = filtered.reduce((sum, c) => sum + c.overall_score, 0) / filtered.length;
        return avgScore.toFixed(1);
      }

      case 'revenue_totale': {
        const filtered = iPraticoData.filter(d => {
          if (!d.order_date) return false;
          const orderDate = new Date(d.order_date);
          const inRange = orderDate >= startDate && orderDate <= endDate;
          const inStore = !storeFilter || d.store_id === storeFilter;
          return inRange && inStore;
        });
        const totalRevenue = filtered.reduce((sum, d) => sum + (d.total_revenue || 0), 0);
        return totalRevenue.toFixed(2);
      }

      case 'numero_sprechi_rilevazioni': {
        const filtered = sprechi.filter(s => {
          if (!s.data_rilevazione) return false;
          const sprecDate = new Date(s.data_rilevazione);
          const inRange = sprecDate >= startDate && sprecDate <= endDate;
          const inStore = !storeFilter || s.store_id === storeFilter;
          return inRange && inStore;
        });
        return filtered.length;
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

  const categories = useMemo(() => {
    const cats = new Set(kpisWithValues.map(k => k.categoria || 'Senza categoria'));
    return Array.from(cats).sort();
  }, [kpisWithValues]);

  const kpisByCategory = useMemo(() => {
    const grouped = {};
    kpisWithValues.forEach(kpi => {
      const cat = kpi.categoria || 'Senza categoria';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(kpi);
    });
    return grouped;
  }, [kpisWithValues]);

  const getCategoryStats = (categoryKpis) => {
    const achieved = categoryKpis.filter(k => k.isAchieved).length;
    const total = categoryKpis.length;
    const avgPercentage = (categoryKpis.reduce((sum, k) => sum + parseFloat(k.percentage), 0) / total).toFixed(0);
    return { achieved, total, avgPercentage };
  };

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

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

        {/* KPIs by Category */}
        {kpisWithValues.length === 0 ? (
          <NeumorphicCard className="p-12 text-center">
            <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nessun KPI configurato</p>
            <p className="text-sm text-slate-400 mt-2">Clicca su "Nuovo KPI" per iniziare</p>
          </NeumorphicCard>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => {
              const categoryKpis = kpisByCategory[category];
              const stats = getCategoryStats(categoryKpis);
              const isExpanded = expandedCategories[category];
              
              return (
                <div key={category}>
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full neumorphic-flat p-4 rounded-xl text-left hover:shadow-lg transition-all flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-slate-800">{category}</h2>
                      <div className="flex gap-6 mt-2 text-sm">
                        <span className="text-slate-600">
                          KPI: <span className="font-semibold">{stats.total}</span>
                        </span>
                        <span className="text-green-600 font-semibold">
                          ✓ {stats.achieved}/{stats.total}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all"
                              style={{ width: `${Math.min(stats.avgPercentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-slate-600 text-xs">{stats.avgPercentage}%</span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-600" /> : <ChevronDown className="w-5 h-5 text-slate-600" />}
                  </button>

                  {isExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                      {categoryKpis.map((kpi) => (
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
                </div>
              );
            })}
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
                <label className="text-sm font-medium text-slate-700 mb-2 block">Categoria</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Nuova categoria..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newCategory.trim()) {
                        setFormData({ ...formData, categoria: newCategory.trim() });
                        setNewCategory('');
                      }
                    }}
                    className="flex-1"
                  />
                  <NeumorphicButton
                    onClick={() => {
                      if (newCategory.trim()) {
                        setFormData({ ...formData, categoria: newCategory.trim() });
                        setNewCategory('');
                      }
                    }}
                    variant="primary"
                  >
                    Aggiungi
                  </NeumorphicButton>
                </div>
                <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona categoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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