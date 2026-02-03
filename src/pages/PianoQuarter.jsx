import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { Plus, Euro, TrendingDown, Trash2, Edit, X, Calendar, DollarSign, ChevronLeft, ChevronRight, Settings, TrendingUp, Info } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isWithinInterval } from "date-fns";
import { it } from 'date-fns/locale';

// Utility per calcolare il quarter
const getQuarter = (date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const q = Math.ceil(month / 3);
  const shortYear = String(year).slice(-2);
  return `Q${q}-${shortYear}`;
};

// Utility per ottenere date range di un quarter
const getQuarterDateRange = (quarterStr) => {
  const [q, year] = quarterStr.split('-');
  const quarterNum = parseInt(q.substring(1));
  const fullYear = 2000 + parseInt(year);
  const startMonth = (quarterNum - 1) * 3;
  const start = new Date(fullYear, startMonth, 1);
  const end = new Date(fullYear, startMonth + 3, 0);
  return { start, end };
};

// Utility per ottenere tutti i quarters in un range di date
const getQuartersInRange = (startDate, endDate) => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  const quarters = new Set();
  let current = new Date(start);

  while (current <= end) {
    quarters.add(getQuarter(current));
    current.setMonth(current.getMonth() + 1);
  }

  return Array.from(quarters);
};

export default function PianoQuarter() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('ads');
  const [adsView, setAdsView] = useState('budget'); // budget | consuntivo
  const [roasView, setRoasView] = useState('budget'); // budget | consuntivo
  const [roasCampaigns, setRoasCampaigns] = useState({});
  const [showAggiustamentoForm, setShowAggiustamentoForm] = useState(false);
  const [selectedPianoForAggiustamento, setSelectedPianoForAggiustamento] = useState(null);
  const [aggiustamentoForm, setAggiustamentoForm] = useState({
    data_inizio: '',
    data_fine: '',
    spesa_effettiva: '',
    note: ''
  });
  const [showFormAds, setShowFormAds] = useState(false);
  const [showFormPromo, setShowFormPromo] = useState(false);
  const [editingAds, setEditingAds] = useState(null);
  const [editingPromo, setEditingPromo] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState(getQuarter(new Date()));
  const [promoCalendarMonth, setPromoCalendarMonth] = useState(new Date());
  const [selectedDeliveryApp, setSelectedDeliveryApp] = useState('Glovo');
  const [contoEconomicoDateRange, setContoEconomicoDateRange] = useState({
    start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [foodCostPercentage, setFoodCostPercentage] = useState(30);
  const [platformFeesPercentage, setPlatformFeesPercentage] = useState(15);
  const [selectedPromoDay, setSelectedPromoDay] = useState(null);

  const [formAds, setFormAds] = useState({
    nome: '',
    piattaforma: 'Glovo',
    stores_ids: [],
    budget: '',
    percentuale_cofinanziamento: '',
    data_inizio: '',
    data_fine: '',
    note: ''
  });

  const [formPromo, setFormPromo] = useState({
    nome: '',
    piattaforma: 'Glovo',
    stores_ids: [],
    prodotti_scontati: [],
    percentuale_sconto: '',
    percentuale_cofinanziamento: '',
    target_sconto: '',
    data_inizio: '',
    data_fine: '',
    note: ''
  });

  const [showTargetSettings, setShowTargetSettings] = useState(false);
  const [targetForm, setTargetForm] = useState({ nome: '', descrizione: '' });
  const [editingTarget, setEditingTarget] = useState(null);

  const [nuovoProdotto, setNuovoProdotto] = useState('');

  // Fetch data
  const { data: financeConfigs = [] } = useQuery({
    queryKey: ['finance-config'],
    queryFn: () => base44.entities.FinanceConfig.list()
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: pianiAds = [] } = useQuery({
    queryKey: ['piani-ads'],
    queryFn: () => base44.entities.PianoAdsQuarterly.list()
  });

  const { data: pianiPromo = [] } = useQuery({
    queryKey: ['piani-promo'],
    queryFn: () => base44.entities.PianoPromoSettimanale.list()
  });

  const { data: iPraticoData = [] } = useQuery({
    queryKey: ['ipratico'],
    queryFn: () => base44.entities.iPratico.list()
  });

  const { data: scontiData = [] } = useQuery({
    queryKey: ['sconti'],
    queryFn: () => base44.entities.Sconto.list()
  });

  const { data: promoTargets = [] } = useQuery({
    queryKey: ['promo-targets'],
    queryFn: () => base44.entities.PromoTargetConfig.list('ordine')
  });

  const { data: aggiustamentiConsuntivo = [] } = useQuery({
    queryKey: ['aggiustamenti-consuntivo'],
    queryFn: () => base44.entities.PianoAdsConsuntivo.list()
  });

  // Carica food cost percentage e platform fees dalla configurazione
  useEffect(() => {
    if (financeConfigs.length > 0) {
      const activeConfig = financeConfigs.find((c) => c.is_active);
      if (activeConfig?.default_food_cost_percentage) {
        setFoodCostPercentage(activeConfig.default_food_cost_percentage);
      }
      if (activeConfig?.default_platform_fees_percentage) {
        setPlatformFeesPercentage(activeConfig.default_platform_fees_percentage);
      }
    }
  }, [financeConfigs]);

  // Mutations
  const updateFoodCostMutation = useMutation({
    mutationFn: async (newPercentage) => {
      const activeConfig = financeConfigs.find((c) => c.is_active);
      if (activeConfig) {
        await base44.entities.FinanceConfig.update(activeConfig.id, {
          default_food_cost_percentage: newPercentage
        });
      } else {
        await base44.entities.FinanceConfig.create({
          default_food_cost_percentage: newPercentage,
          is_active: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-config'] });
    }
  });

  const updatePlatformFeesMutation = useMutation({
    mutationFn: async (newPercentage) => {
      const activeConfig = financeConfigs.find((c) => c.is_active);
      if (activeConfig) {
        await base44.entities.FinanceConfig.update(activeConfig.id, {
          default_platform_fees_percentage: newPercentage
        });
      } else {
        await base44.entities.FinanceConfig.create({
          default_platform_fees_percentage: newPercentage,
          is_active: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-config'] });
    }
  });

  const createAdsMutation = useMutation({
    mutationFn: (data) => base44.entities.PianoAdsQuarterly.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piani-ads'] });
      resetFormAds();
    }
  });

  const updateAdsMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PianoAdsQuarterly.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piani-ads'] });
      resetFormAds();
    }
  });

  const deleteAdsMutation = useMutation({
    mutationFn: (id) => base44.entities.PianoAdsQuarterly.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piani-ads'] });
    }
  });

  const createPromoMutation = useMutation({
    mutationFn: (data) => base44.entities.PianoPromoSettimanale.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piani-promo'] });
      resetFormPromo();
    }
  });

  const updatePromoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PianoPromoSettimanale.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piani-promo'] });
      resetFormPromo();
    }
  });

  const deletePromoMutation = useMutation({
    mutationFn: (id) => base44.entities.PianoPromoSettimanale.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piani-promo'] });
    }
  });

  const createTargetMutation = useMutation({
    mutationFn: (data) => base44.entities.PromoTargetConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-targets'] });
      setTargetForm({ nome: '', descrizione: '' });
      setEditingTarget(null);
    }
  });

  const updateTargetMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PromoTargetConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-targets'] });
      setTargetForm({ nome: '', descrizione: '' });
      setEditingTarget(null);
    }
  });

  const deleteTargetMutation = useMutation({
    mutationFn: (id) => base44.entities.PromoTargetConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-targets'] });
    }
  });

  const createAggiustamentoMutation = useMutation({
    mutationFn: (data) => base44.entities.PianoAdsConsuntivo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aggiustamenti-consuntivo'] });
      setShowAggiustamentoForm(false);
      setSelectedPianoForAggiustamento(null);
      setAggiustamentoForm({ data_inizio: '', data_fine: '', spesa_effettiva: '', note: '' });
    }
  });

  const deleteAggiustamentoMutation = useMutation({
    mutationFn: (id) => base44.entities.PianoAdsConsuntivo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aggiustamenti-consuntivo'] });
    }
  });

  const resetFormAds = () => {
    setFormAds({
      nome: '',
      piattaforma: 'Glovo',
      stores_ids: [],
      budget: '',
      percentuale_cofinanziamento: '',
      data_inizio: '',
      data_fine: '',
      note: ''
    });
    setShowFormAds(false);
    setEditingAds(null);
  };

  const resetFormPromo = () => {
    setFormPromo({
      nome: '',
      piattaforma: 'Glovo',
      stores_ids: [],
      prodotti_scontati: [],
      percentuale_sconto: '',
      percentuale_cofinanziamento: '',
      target_sconto: '',
      data_inizio: '',
      data_fine: '',
      note: ''
    });
    setShowFormPromo(false);
    setEditingPromo(null);
  };

  const handleSubmitAds = (e) => {
    e.preventDefault();
    const stores_names = stores.filter((s) => formAds.stores_ids.includes(s.id)).map((s) => s.name);
    const quarters = getQuartersInRange(formAds.data_inizio, formAds.data_fine);
    const data = { ...formAds, stores_names, quarters };

    if (editingAds) {
      updateAdsMutation.mutate({ id: editingAds.id, data });
    } else {
      createAdsMutation.mutate(data);
    }
  };

  const handleSubmitPromo = (e) => {
    e.preventDefault();
    const stores_names = stores.filter((s) => formPromo.stores_ids.includes(s.id)).map((s) => s.name);
    const quarters = getQuartersInRange(formPromo.data_inizio, formPromo.data_fine);
    const data = { ...formPromo, stores_names, quarters };

    if (editingPromo) {
      updatePromoMutation.mutate({ id: editingPromo.id, data });
    } else {
      createPromoMutation.mutate(data);
    }
  };

  const handleEditAds = (piano) => {
    setFormAds({
      nome: piano.nome || '',
      piattaforma: piano.piattaforma,
      stores_ids: piano.stores_ids || [],
      budget: piano.budget,
      percentuale_cofinanziamento: piano.percentuale_cofinanziamento,
      data_inizio: piano.data_inizio,
      data_fine: piano.data_fine,
      note: piano.note || ''
    });
    setEditingAds(piano);
    setShowFormAds(true);
  };

  const handleEditPromo = (piano) => {
    setFormPromo({
      nome: piano.nome || '',
      piattaforma: piano.piattaforma,
      stores_ids: piano.stores_ids || [],
      prodotti_scontati: piano.prodotti_scontati || [],
      percentuale_sconto: piano.percentuale_sconto,
      percentuale_cofinanziamento: piano.percentuale_cofinanziamento || 0,
      target_sconto: piano.target_sconto || '',
      data_inizio: piano.data_inizio,
      data_fine: piano.data_fine,
      note: piano.note || ''
    });
    setEditingPromo(piano);
    setShowFormPromo(true);
  };

  const toggleStore = (storeId, isAds = true) => {
    if (isAds) {
      setFormAds((prev) => ({
        ...prev,
        stores_ids: prev.stores_ids.includes(storeId) ?
        prev.stores_ids.filter((id) => id !== storeId) :
        [...prev.stores_ids, storeId]
      }));
    } else {
      setFormPromo((prev) => ({
        ...prev,
        stores_ids: prev.stores_ids.includes(storeId) ?
        prev.stores_ids.filter((id) => id !== storeId) :
        [...prev.stores_ids, storeId]
      }));
    }
  };

  const toggleAllStores = (isAds = true) => {
    const allStoreIds = stores.map((s) => s.id);
    if (isAds) {
      const allSelected = formAds.stores_ids.length === allStoreIds.length;
      setFormAds((prev) => ({ ...prev, stores_ids: allSelected ? [] : allStoreIds }));
    } else {
      const allSelected = formPromo.stores_ids.length === allStoreIds.length;
      setFormPromo((prev) => ({ ...prev, stores_ids: allSelected ? [] : allStoreIds }));
    }
  };

  const aggiungiProdotto = () => {
    if (nuovoProdotto.trim()) {
      setFormPromo((prev) => ({
        ...prev,
        prodotti_scontati: [...prev.prodotti_scontati, nuovoProdotto.trim()]
      }));
      setNuovoProdotto('');
    }
  };

  const rimuoviProdotto = (index) => {
    setFormPromo((prev) => ({
      ...prev,
      prodotti_scontati: prev.prodotti_scontati.filter((_, i) => i !== index)
    }));
  };

  // Calcola budget consuntivo per un piano
  const calcolaBudgetConsuntivo = (piano) => {
    const aggiustamenti = aggiustamentiConsuntivo.filter(a => a.piano_ads_id === piano.id);
    
    if (aggiustamenti.length === 0) {
      return {
        budgetTotale: piano.budget,
        costoEffettivo: piano.budget * (1 - (piano.percentuale_cofinanziamento || 0) / 100),
        aggiustamenti: []
      };
    }

    const pStart = new Date(piano.data_inizio);
    const pEnd = new Date(piano.data_fine);
    const giorniTotaliPiano = Math.floor((pEnd - pStart) / (1000 * 60 * 60 * 24)) + 1;
    const mediaGiornaliera = piano.budget / giorniTotaliPiano;
    const costoEffettivoGiornaliero = mediaGiornaliera * (1 - (piano.percentuale_cofinanziamento || 0) / 100);

    let giorniAggiustati = 0;
    let speseAggiustate = 0;

    aggiustamenti.forEach(agg => {
      const aggStart = new Date(agg.data_inizio);
      const aggEnd = new Date(agg.data_fine);
      const giorniAgg = Math.floor((aggEnd - aggStart) / (1000 * 60 * 60 * 24)) + 1;
      giorniAggiustati += giorniAgg;
      speseAggiustate += agg.spesa_effettiva;
    });

    const giorniNonAggiustati = giorniTotaliPiano - giorniAggiustati;
    const spesaNonAggiustata = costoEffettivoGiornaliero * giorniNonAggiustati;
    const costoEffettivoTotale = spesaNonAggiustata + speseAggiustate;
    const budgetTotaleConsuntivo = costoEffettivoTotale / (1 - (piano.percentuale_cofinanziamento || 0) / 100);

    return {
      budgetTotale: budgetTotaleConsuntivo,
      costoEffettivo: costoEffettivoTotale,
      aggiustamenti
    };
  };

  // Filter piani per quarter selezionato
  const pianiAdsQuarter = useMemo(() => {
    return pianiAds.filter((p) => {
      if (p.quarters && p.quarters.length > 0) {
        return p.quarters.includes(selectedQuarter);
      }
      // Fallback: calcola quarters dai dati se non presenti
      if (p.data_inizio && p.data_fine) {
        const quarters = getQuartersInRange(p.data_inizio, p.data_fine);
        return quarters.includes(selectedQuarter);
      }
      return false;
    });
  }, [pianiAds, selectedQuarter]);

  const pianiPromoQuarter = useMemo(() => {
    return pianiPromo.filter((p) => {
      if (p.quarters && p.quarters.length > 0) {
        return p.quarters.includes(selectedQuarter);
      }
      // Fallback: calcola quarters dai dati se non presenti
      if (p.data_inizio && p.data_fine) {
        const quarters = getQuartersInRange(p.data_inizio, p.data_fine);
        return quarters.includes(selectedQuarter);
      }
      return false;
    });
  }, [pianiPromo, selectedQuarter]);

  // Promo nel mese selezionato
  const promoMese = useMemo(() => {
    return pianiPromo.filter((p) => {
      const start = new Date(p.data_inizio);
      const end = new Date(p.data_fine);
      const monthStart = startOfMonth(promoCalendarMonth);
      const monthEnd = endOfMonth(promoCalendarMonth);

      return start <= monthEnd && end >= monthStart;
    });
  }, [pianiPromo, promoCalendarMonth]);

  // Conto economico
  const contoEconomico = useMemo(() => {
    const startDate = new Date(contoEconomicoDateRange.start);
    const endDate = new Date(contoEconomicoDateRange.end);
    const daysDiff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    // Net Sales (revenue after discounts) - from iPratico
    const revenue = iPraticoData.
    filter((d) => {
      const dDate = new Date(d.order_date);
      return dDate >= startDate && dDate <= endDate;
    }).
    reduce((sum, d) => {
      if (selectedDeliveryApp === 'Glovo' && (d.sourceApp_glovo || 0) > 0) {
        return sum + d.sourceApp_glovo;
      } else if (selectedDeliveryApp === 'Deliveroo' && (d.sourceApp_deliveroo || 0) > 0) {
        return sum + d.sourceApp_deliveroo;
      }
      return sum;
    }, 0);

    // Discounts - from Sconto entity (dividing by app count when multiple apps)
    const totalDiscounts = scontiData.
    filter((d) => {
      const dDate = new Date(d.order_date);
      return dDate >= startDate && dDate <= endDate;
    }).
    reduce((sum, d) => {
      // Count which apps have this discount
      const appsWithDiscount = [
      d.sourceApp_glovo,
      d.sourceApp_deliveroo,
      d.sourceApp_justeat,
      d.sourceApp_onlineordering,
      d.sourceApp_ordertable,
      d.sourceApp_tabesto,
      d.sourceApp_deliverect,
      d.sourceApp_store].
      filter(Boolean).length;

      const discountPortion = appsWithDiscount > 0 ? (d.total_discount_price || 0) / appsWithDiscount : 0;

      if (selectedDeliveryApp === 'Glovo' && d.sourceApp_glovo) {
        return sum + discountPortion;
      } else if (selectedDeliveryApp === 'Deliveroo' && d.sourceApp_deliveroo) {
        return sum + discountPortion;
      }
      return sum;
    }, 0);

    // Gross Sales (revenue + discounts)
    const grossSales = revenue + totalDiscounts;

    // Food cost (calculated on gross sales)
    const foodCost = grossSales * (foodCostPercentage / 100);

    // Platform fees
    const platformFees = revenue * (platformFeesPercentage / 100);

    // Ads budget spalmate nel periodo
    const adsQuarters = new Set();
    let current = new Date(startDate);
    while (current <= endDate) {
      adsQuarters.add(getQuarter(current));
      current.setMonth(current.getMonth() + 1);
    }

    let adsBudget = 0;
    pianiAds.
    filter((p) => p.piattaforma === selectedDeliveryApp).
    forEach((p) => {
      const pStart = new Date(p.data_inizio);
      const pEnd = new Date(p.data_fine);
      const pDays = Math.floor((pEnd - pStart) / (1000 * 60 * 60 * 24)) + 1;

      // Giorni di overlap
      const overlapStart = new Date(Math.max(startDate.getTime(), pStart.getTime()));
      const overlapEnd = new Date(Math.min(endDate.getTime(), pEnd.getTime()));

      if (overlapStart <= overlapEnd) {
        const overlapDays = Math.floor((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
        const budgetGiornaliero = p.budget / pDays;
        const budgetPeriodo = budgetGiornaliero * overlapDays;

        // Applica cofinanziamento
        const percentualeCofinanziamento = p.percentuale_cofinanziamento || 0;
        const costoEffettivo = budgetPeriodo * (1 - percentualeCofinanziamento / 100);

        adsBudget += costoEffettivo;
      }
    });

    return {
      revenue,
      grossSales,
      foodCost: -foodCost,
      platformFees: -platformFees,
      adsBudget: -adsBudget,
      total: revenue - foodCost - platformFees - adsBudget
    };
  }, [pianiAds, contoEconomicoDateRange, selectedDeliveryApp, iPraticoData, scontiData, foodCostPercentage, platformFeesPercentage]);

  const promoCalendarDays = useMemo(() => {
    const monthStart = startOfMonth(promoCalendarMonth);
    const monthEnd = endOfMonth(promoCalendarMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [promoCalendarMonth]);

  return (
    <ProtectedPage pageName="PianoQuarter">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-slate-50 mb-6">
          <h1 className="bg-clip-text text-slate-50 text-3xl font-bold from-slate-700 to-slate-900">Piano Quarter

          </h1>
          <p className="text-slate-50 mt-1">Gestione piani trimestrali di Ads, Promo e Conto Economico</p>
        </div>

        {/* Tabs */}
        <NeumorphicCard className="p-2">
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setActiveTab('ads')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'ads' ?
              'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' :
              'text-slate-600 hover:bg-slate-50'}`
              }>

              <Euro className="w-5 h-5 inline mr-2" />
              Ads
            </button>
            <button
              onClick={() => setActiveTab('promo')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'promo' ?
              'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' :
              'text-slate-600 hover:bg-slate-50'}`
              }>

              <TrendingDown className="w-5 h-5 inline mr-2" />
              Promo
            </button>
            <button
              onClick={() => setActiveTab('conto')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'conto' ?
              'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' :
              'text-slate-600 hover:bg-slate-50'}`
              }>

              <DollarSign className="w-5 h-5 inline mr-2" />
              Conto Economico
            </button>
            <button
              onClick={() => setActiveTab('roas')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'roas' ?
              'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' :
              'text-slate-600 hover:bg-slate-50'}`
              }>

              <TrendingUp className="w-5 h-5 inline mr-2" />
              ROAS
            </button>
          </div>
        </NeumorphicCard>

        {/* Sezione Ads */}
        {activeTab === 'ads' &&
        <>
            <div className="flex justify-between items-center">
              <div className="flex gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Quarter</label>
                  <select
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(e.target.value)}
                  className="neumorphic-pressed px-4 py-2 rounded-lg">

                    <option value="Q1-26">Q1-26 (Gen-Mar)</option>
                    <option value="Q2-26">Q2-26 (Apr-Giu)</option>
                    <option value="Q3-26">Q3-26 (Lug-Set)</option>
                    <option value="Q4-26">Q4-26 (Ott-Dic)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Vista</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAdsView('budget')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        adsView === 'budget' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Budget
                    </button>
                    <button
                      onClick={() => setAdsView('consuntivo')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        adsView === 'consuntivo' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Consuntivo
                    </button>
                  </div>
                </div>
              </div>
              <NeumorphicButton
              onClick={() => setShowFormAds(true)}
              variant="primary"
              className="flex items-center gap-2">

                <Plus className="w-5 h-5" />
                Nuovo Piano Ads
              </NeumorphicButton>
            </div>

            {showFormAds &&
          <NeumorphicCard className="p-6">
                <h2 className="text-xl font-bold text-slate-700 mb-4">
                  {editingAds ? 'Modifica Piano Ads' : 'Nuovo Piano Ads'}
                </h2>
                <form onSubmit={handleSubmitAds} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Nome Piano</label>
                      <input
                    type="text"
                    value={formAds.nome}
                    onChange={(e) => setFormAds({ ...formAds, nome: e.target.value })}
                    placeholder="es. Glovo Q1 2026"
                    className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                    required />

                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Piattaforma</label>
                      <select
                    value={formAds.piattaforma}
                    onChange={(e) => setFormAds({ ...formAds, piattaforma: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                    required>

                        <option value="Glovo">Glovo</option>
                        <option value="Deliveroo">Deliveroo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Budget (€)</label>
                      <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formAds.budget}
                    onChange={(e) => setFormAds({ ...formAds, budget: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                    required />

                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">% Cofinanziamento</label>
                      <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={formAds.percentuale_cofinanziamento}
                    onChange={(e) => setFormAds({ ...formAds, percentuale_cofinanziamento: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                    required />

                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Data Inizio</label>
                      <input
                    type="date"
                    value={formAds.data_inizio}
                    onChange={(e) => setFormAds({ ...formAds, data_inizio: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                    required />

                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Data Fine</label>
                      <input
                    type="date"
                    value={formAds.data_fine}
                    onChange={(e) => setFormAds({ ...formAds, data_fine: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                    required />

                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-700">Locali di Riferimento</label>
                      <button
                    type="button"
                    onClick={() => toggleAllStores(true)}
                    className="text-sm text-blue-600 hover:underline">

                        {formAds.stores_ids.length === stores.length ? 'Deseleziona Tutti' : 'Seleziona Tutti'}
                      </button>
                    </div>
                    <div className="neumorphic-pressed p-4 rounded-lg space-y-2 max-h-48 overflow-y-auto">
                      {stores.map((store) =>
                  <label key={store.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                          <input
                      type="checkbox"
                      checked={formAds.stores_ids.includes(store.id)}
                      onChange={() => toggleStore(store.id, true)}
                      className="w-4 h-4" />

                          <span className="text-sm text-slate-700">{store.name}</span>
                        </label>
                  )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
                    <textarea
                  value={formAds.note}
                  onChange={(e) => setFormAds({ ...formAds, note: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                  rows="3" />

                  </div>

                  <div className="flex gap-3 justify-end">
                    <NeumorphicButton type="button" onClick={resetFormAds}>
                      Annulla
                    </NeumorphicButton>
                    <NeumorphicButton type="submit" variant="primary">
                      {editingAds ? 'Aggiorna' : 'Crea'}
                    </NeumorphicButton>
                  </div>
                </form>
              </NeumorphicCard>
          }

            <div className="space-y-4">
              {pianiAdsQuarter.map((piano) => {
                const consuntivo = calcolaBudgetConsuntivo(piano);
                const budgetDisplay = adsView === 'consuntivo' ? consuntivo.budgetTotale : piano.budget;
                const costoDisplay = adsView === 'consuntivo' ? consuntivo.costoEffettivo : piano.budget * (1 - (piano.percentuale_cofinanziamento || 0) / 100);

                return (
                  <NeumorphicCard key={piano.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-bold text-slate-800">{piano.nome}</h3>
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg font-medium text-sm">
                            {piano.piattaforma}
                          </span>
                          {adsView === 'consuntivo' && consuntivo.aggiustamenti.length > 0 && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">
                              {consuntivo.aggiustamenti.length} aggiustamenti
                            </span>
                          )}
                          {piano.quarters?.map((q) =>
                            <span key={q} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                              {q}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-slate-500">{adsView === 'budget' ? 'Budget' : 'Budget Consuntivo'}</p>
                            <p className="text-lg font-bold text-slate-700">€{budgetDisplay.toFixed(2)}</p>
                            {adsView === 'consuntivo' && budgetDisplay !== piano.budget && (
                              <p className="text-xs text-orange-600">
                                (Budget: €{piano.budget})
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Costo Effettivo</p>
                            <p className="text-lg font-bold text-orange-600">€{costoDisplay.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Cofinanziamento</p>
                            <p className="text-lg font-bold text-green-600">{piano.percentuale_cofinanziamento}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Periodo</p>
                            <p className="text-sm font-medium text-slate-700">
                              {format(parseISO(piano.data_inizio), 'dd MMM', { locale: it })} - {format(parseISO(piano.data_fine), 'dd MMM', { locale: it })}
                            </p>
                          </div>
                        </div>
                        
                        {adsView === 'consuntivo' && consuntivo.aggiustamenti.length > 0 && (
                          <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <p className="text-xs font-bold text-orange-800 mb-2">Aggiustamenti:</p>
                            <div className="space-y-2">
                              {consuntivo.aggiustamenti.map(agg => (
                                <div key={agg.id} className="flex items-center justify-between text-xs">
                                  <div>
                                    <span className="font-medium">{format(parseISO(agg.data_inizio), 'dd/MM', { locale: it })} - {format(parseISO(agg.data_fine), 'dd/MM', { locale: it })}</span>
                                    <span className="text-slate-600 ml-2">Spesa: €{agg.spesa_effettiva}</span>
                                    {agg.note && <span className="text-slate-500 ml-2">({agg.note})</span>}
                                  </div>
                                  <button
                                    onClick={() => {
                                      if (confirm('Eliminare questo aggiustamento?')) {
                                        deleteAggiustamentoMutation.mutate(agg.id);
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {piano.note && <p className="text-sm text-slate-600 mt-2">{piano.note}</p>}
                      </div>
                      <div className="flex gap-2">
                        {adsView === 'consuntivo' && (
                          <button
                            onClick={() => {
                              setSelectedPianoForAggiustamento(piano);
                              setShowAggiustamentoForm(true);
                            }}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Aggiungi aggiustamento"
                          >
                            <Plus className="w-4 h-4 text-orange-600" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditAds(piano)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Eliminare questo piano ads?')) {
                              deleteAdsMutation.mutate(piano.id);
                            }
                          }}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </NeumorphicCard>
                );
              })}

              {pianiAdsQuarter.length === 0 && !showFormAds &&
                <div className="text-center py-12 text-slate-500">
                  Nessun piano ads per {selectedQuarter}
                </div>
              }
            </div>

            {/* Modal Aggiustamento Consuntivo */}
            {showAggiustamentoForm && selectedPianoForAggiustamento && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <NeumorphicCard className="max-w-2xl w-full p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Aggiungi Aggiustamento Consuntivo</h2>
                    <button onClick={() => {
                      setShowAggiustamentoForm(false);
                      setSelectedPianoForAggiustamento(null);
                      setAggiustamentoForm({ data_inizio: '', data_fine: '', spesa_effettiva: '', note: '' });
                    }} className="p-2 hover:bg-slate-100 rounded-lg">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      <span className="font-bold">Piano:</span> {selectedPianoForAggiustamento.nome}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Specifica un periodo con spesa effettiva diversa dalla media giornaliera del piano
                    </p>
                  </div>

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    createAggiustamentoMutation.mutate({
                      piano_ads_id: selectedPianoForAggiustamento.id,
                      piano_ads_nome: selectedPianoForAggiustamento.nome,
                      ...aggiustamentoForm
                    });
                  }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Data Inizio</label>
                        <input
                          type="date"
                          value={aggiustamentoForm.data_inizio}
                          onChange={(e) => setAggiustamentoForm({ ...aggiustamentoForm, data_inizio: e.target.value })}
                          min={selectedPianoForAggiustamento.data_inizio}
                          max={selectedPianoForAggiustamento.data_fine}
                          className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Data Fine</label>
                        <input
                          type="date"
                          value={aggiustamentoForm.data_fine}
                          onChange={(e) => setAggiustamentoForm({ ...aggiustamentoForm, data_fine: e.target.value })}
                          min={aggiustamentoForm.data_inizio || selectedPianoForAggiustamento.data_inizio}
                          max={selectedPianoForAggiustamento.data_fine}
                          className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Spesa Effettiva (€)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={aggiustamentoForm.spesa_effettiva}
                        onChange={(e) => setAggiustamentoForm({ ...aggiustamentoForm, spesa_effettiva: e.target.value })}
                        placeholder="Costo effettivo dopo cofinanziamento"
                        className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                        required
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        💡 Inserisci il costo che hai effettivamente sostenuto (dopo cofinanziamento)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
                      <textarea
                        value={aggiustamentoForm.note}
                        onChange={(e) => setAggiustamentoForm({ ...aggiustamentoForm, note: e.target.value })}
                        placeholder="es. Promozione speciale, budget extra..."
                        className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                        rows="3"
                      />
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                      <NeumorphicButton 
                        type="button" 
                        onClick={() => {
                          setShowAggiustamentoForm(false);
                          setSelectedPianoForAggiustamento(null);
                          setAggiustamentoForm({ data_inizio: '', data_fine: '', spesa_effettiva: '', note: '' });
                        }}
                      >
                        Annulla
                      </NeumorphicButton>
                      <NeumorphicButton type="submit" variant="primary">
                        Aggiungi
                      </NeumorphicButton>
                    </div>
                  </form>
                </NeumorphicCard>
              </div>
            )}
          </>
        }

        {/* Modal Impostazioni Target */}
        {showTargetSettings &&
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Gestione Target Sconto</h2>
                <button onClick={() => setShowTargetSettings(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form nuovo target */}
              <div className="neumorphic-pressed p-4 rounded-xl mb-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nome Target</label>
                  <input
                  type="text"
                  value={targetForm.nome}
                  onChange={(e) => setTargetForm({ ...targetForm, nome: e.target.value })}
                  placeholder="es. Nuovi Clienti"
                  className="w-full neumorphic-pressed px-4 py-2 rounded-lg" />

                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Descrizione</label>
                  <input
                  type="text"
                  value={targetForm.descrizione}
                  onChange={(e) => setTargetForm({ ...targetForm, descrizione: e.target.value })}
                  placeholder="Descrizione del target..."
                  className="w-full neumorphic-pressed px-4 py-2 rounded-lg" />

                </div>
                <NeumorphicButton
                onClick={() => {
                  if (!targetForm.nome.trim()) {
                    alert('Inserisci un nome per il target');
                    return;
                  }
                  if (editingTarget) {
                    updateTargetMutation.mutate({ id: editingTarget.id, data: targetForm });
                  } else {
                    createTargetMutation.mutate({ ...targetForm, ordine: promoTargets.length });
                  }
                }}
                variant="primary"
                className="w-full">

                  {editingTarget ? 'Aggiorna' : 'Aggiungi Target'}
                </NeumorphicButton>
              </div>

              {/* Lista target esistenti */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-700 mb-3">Target Esistenti</h3>
                {promoTargets.length === 0 ?
              <p className="text-sm text-slate-500 text-center py-4">Nessun target creato</p> :

              promoTargets.map((target) =>
              <div key={target.id} className="neumorphic-pressed p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">{target.nome}</p>
                        {target.descrizione && <p className="text-xs text-slate-500">{target.descrizione}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button
                    onClick={() => {
                      setEditingTarget(target);
                      setTargetForm({ nome: target.nome, descrizione: target.descrizione || '' });
                    }}
                    className="p-2 rounded-lg hover:bg-blue-50">

                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                    onClick={() => {
                      if (confirm('Eliminare questo target?')) {
                        deleteTargetMutation.mutate(target.id);
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-red-50">

                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
              )
              }
              </div>
            </NeumorphicCard>
          </div>
        }

        {/* Sezione Promo */}
        {activeTab === 'promo' &&
        <>
            <div className="flex justify-between items-center">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Quarter</label>
                <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="neumorphic-pressed px-4 py-2 rounded-lg">

                  <option value="Q1-26">Q1-26 (Gen-Mar)</option>
                  <option value="Q2-26">Q2-26 (Apr-Giu)</option>
                  <option value="Q3-26">Q3-26 (Lug-Set)</option>
                  <option value="Q4-26">Q4-26 (Ott-Dic)</option>
                </select>
              </div>
              <div className="flex gap-2">
                <NeumorphicButton
                onClick={() => setShowTargetSettings(true)}
                className="flex items-center gap-2">

                  <Settings className="w-5 h-5" />
                  Target Sconto
                </NeumorphicButton>
                <NeumorphicButton
                onClick={() => setShowFormPromo(true)}
                variant="primary"
                className="flex items-center gap-2">

                  <Plus className="w-5 h-5" />
                  Nuova Promo
                </NeumorphicButton>
              </div>
            </div>

            {showFormPromo &&
          <NeumorphicCard className="p-6">
                <h2 className="text-xl font-bold text-slate-700 mb-4">
                  {editingPromo ? 'Modifica Promo' : 'Nuova Promo'}
                </h2>
                <form onSubmit={handleSubmitPromo} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Nome Promo</label>
                      <input
                    type="text"
                    value={formPromo.nome}
                    onChange={(e) => setFormPromo({ ...formPromo, nome: e.target.value })}
                    placeholder="es. Promo Pizze Speciali"
                    className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                    required />

                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Piattaforma</label>
                      <select
                    value={formPromo.piattaforma}
                    onChange={(e) => setFormPromo({ ...formPromo, piattaforma: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                    required>

                        <option value="Glovo">Glovo</option>
                        <option value="Deliveroo">Deliveroo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">% Sconto</label>
                      <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={formPromo.percentuale_sconto}
                    onChange={(e) => setFormPromo({ ...formPromo, percentuale_sconto: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                    required />

                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">% Cofinanziamento</label>
                      <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={formPromo.percentuale_cofinanziamento}
                    onChange={(e) => setFormPromo({ ...formPromo, percentuale_cofinanziamento: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-2 rounded-lg" />

                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">A chi è rivolto</label>
                      <select
                    value={formPromo.target_sconto}
                    onChange={(e) => setFormPromo({ ...formPromo, target_sconto: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-2 rounded-lg">

                        <option value="">Seleziona target</option>
                        {promoTargets.filter((t) => t.attivo).map((target) =>
                    <option key={target.id} value={target.nome}>{target.nome}</option>
                    )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Data Inizio</label>
                      <input
                    type="date"
                    value={formPromo.data_inizio}
                    onChange={(e) => setFormPromo({ ...formPromo, data_inizio: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                    required />

                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Data Fine</label>
                      <input
                    type="date"
                    value={formPromo.data_fine}
                    onChange={(e) => setFormPromo({ ...formPromo, data_fine: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                    required />

                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-700">Locali di Riferimento</label>
                      <button
                    type="button"
                    onClick={() => toggleAllStores(false)}
                    className="text-sm text-blue-600 hover:underline">

                        {formPromo.stores_ids.length === stores.length ? 'Deseleziona Tutti' : 'Seleziona Tutti'}
                      </button>
                    </div>
                    <div className="neumorphic-pressed p-4 rounded-lg space-y-2 max-h-48 overflow-y-auto">
                      {stores.map((store) =>
                  <label key={store.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                          <input
                      type="checkbox"
                      checked={formPromo.stores_ids.includes(store.id)}
                      onChange={() => toggleStore(store.id, false)}
                      className="w-4 h-4" />

                          <span className="text-sm text-slate-700">{store.name}</span>
                        </label>
                  )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Prodotti in Sconto</label>
                    <div className="flex gap-2 mb-3">
                      <input
                    type="text"
                    value={nuovoProdotto}
                    onChange={(e) => setNuovoProdotto(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        aggiungiProdotto();
                      }
                    }}
                    placeholder="Nome prodotto..."
                    className="flex-1 neumorphic-pressed px-4 py-2 rounded-lg" />

                      <NeumorphicButton type="button" onClick={aggiungiProdotto}>
                        <Plus className="w-4 h-4" />
                      </NeumorphicButton>
                    </div>
                    <div className="neumorphic-pressed p-3 rounded-lg space-y-2">
                      {formPromo.prodotti_scontati.length === 0 &&
                  <p className="text-sm text-slate-400 text-center py-2">Nessun prodotto aggiunto</p>
                  }
                      {formPromo.prodotti_scontati.map((prodotto, index) =>
                  <div key={index} className="flex items-center justify-between bg-orange-50 px-3 py-2 rounded-lg">
                          <span className="text-sm text-slate-700">{prodotto}</span>
                          <button
                      type="button"
                      onClick={() => rimuoviProdotto(index)}
                      className="text-red-600 hover:text-red-800">

                            <X className="w-4 h-4" />
                          </button>
                        </div>
                  )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
                    <textarea
                  value={formPromo.note}
                  onChange={(e) => setFormPromo({ ...formPromo, note: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                  rows="3" />

                  </div>

                  <div className="flex gap-3 justify-end">
                    <NeumorphicButton type="button" onClick={resetFormPromo}>
                      Annulla
                    </NeumorphicButton>
                    <NeumorphicButton type="submit" variant="primary">
                      {editingPromo ? 'Aggiorna' : 'Crea'}
                    </NeumorphicButton>
                  </div>
                </form>
              </NeumorphicCard>
          }

            <div className="space-y-6">
              {/* Lista Promo Quarter */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800">Promo {selectedQuarter}</h3>
                {pianiPromoQuarter.map((piano) =>
              <NeumorphicCard key={piano.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800 mb-2">{piano.nome}</h4>
                        <div className="space-y-1 text-sm text-slate-600">
                          <p>📱 {piano.piattaforma}</p>
                          <p>🏷️ Sconto: {piano.percentuale_sconto}% {piano.percentuale_cofinanziamento > 0 && `(Cofinanz. ${piano.percentuale_cofinanziamento}%)`}</p>
                          <p>📅 {format(parseISO(piano.data_inizio), 'dd MMM', { locale: it })} - {format(parseISO(piano.data_fine), 'dd MMM', { locale: it })}</p>
                          <p>🛒 {piano.prodotti_scontati?.length || 0} prodotti</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                      onClick={() => handleEditPromo(piano)}
                      className="p-2 hover:bg-slate-100 rounded-lg">

                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                      onClick={() => {
                        if (confirm('Eliminare questa promo?')) {
                          deletePromoMutation.mutate(piano.id);
                        }
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg">

                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </NeumorphicCard>
              )}
              </div>

              {/* Calendario Promo */}
              <NeumorphicCard className="p-6 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setPromoCalendarMonth(new Date(promoCalendarMonth.getFullYear(), promoCalendarMonth.getMonth() - 1))}>
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="font-bold text-slate-800">
                    {format(promoCalendarMonth, 'MMMM yyyy', { locale: it })}
                  </h3>
                  <button onClick={() => setPromoCalendarMonth(new Date(promoCalendarMonth.getFullYear(), promoCalendarMonth.getMonth() + 1))}>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day) =>
                <div key={day} className="text-center text-xs font-bold text-slate-500 py-2">
                      {day}
                    </div>
                )}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {promoCalendarDays.map((day) => {
                  const dayPromo = promoMese.filter((p) => {
                    const pStart = new Date(p.data_inizio);
                    const pEnd = new Date(p.data_fine);
                    return day >= pStart && day <= pEnd;
                  });

                  return (
                    <button
                      key={day.toString()}
                      onClick={() => dayPromo.length > 0 && setSelectedPromoDay(day)}
                      className={`p-3 rounded-lg text-sm text-center border cursor-pointer transition-all hover:shadow-lg ${
                      isSameMonth(day, promoCalendarMonth) ?
                      dayPromo.length > 0 ?
                      'bg-orange-100 border-orange-300' :
                      'bg-slate-50 border-slate-200' :
                      'bg-slate-100 border-slate-300'}`
                      }>

                        <div className="font-bold text-slate-700 mb-2">{format(day, 'd')}</div>
                        {dayPromo.length > 0 &&
                      <div className="space-y-1">
                            {dayPromo.map((p) =>
                        <div key={p.id} className="bg-orange-500 text-white px-1 py-1 rounded text-xs font-medium truncate">
                                {p.percentuale_sconto}% - {p.piattaforma}
                              </div>
                        )}
                          </div>
                      }
                      </button>);

                })}
                </div>
              </NeumorphicCard>

              {/* Modal dettagli promo */}
              {selectedPromoDay &&
            <>
                  <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setSelectedPromoDay(null)} />
                  <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[80vh] overflow-y-auto">
                    <NeumorphicCard className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-800">
                          Promo - {format(selectedPromoDay, 'd MMMM yyyy', { locale: it })}
                        </h3>
                        <button
                      onClick={() => setSelectedPromoDay(null)}
                      className="text-slate-400 hover:text-slate-600">

                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        {promoMese.filter((p) => {
                      const pStart = new Date(p.data_inizio);
                      const pEnd = new Date(p.data_fine);
                      return selectedPromoDay >= pStart && selectedPromoDay <= pEnd;
                    }).map((promo) =>
                    <div key={promo.id} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <h4 className="font-bold text-slate-800 mb-2">{promo.nome}</h4>
                            <div className="space-y-2 text-sm text-slate-700">
                              <p><span className="font-semibold">📱 Piattaforma:</span> {promo.piattaforma}</p>
                              <p><span className="font-semibold">🏷️ Sconto:</span> {promo.percentuale_sconto}%</p>
                              {promo.percentuale_cofinanziamento > 0 &&
                        <p><span className="font-semibold">💰 Cofinanziamento:</span> {promo.percentuale_cofinanziamento}%</p>
                        }
                              {promo.target_sconto &&
                        <p><span className="font-semibold">🎯 Target:</span> {promo.target_sconto}</p>
                        }
                              <p><span className="font-semibold">📅 Periodo:</span> {format(parseISO(promo.data_inizio), 'dd MMM', { locale: it })} - {format(parseISO(promo.data_fine), 'dd MMM', { locale: it })}</p>
                              {promo.prodotti_scontati && promo.prodotti_scontati.length > 0 &&
                        <div>
                                  <span className="font-semibold">🛒 Prodotti:</span>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {promo.prodotti_scontati.map((prod, idx) =>
                            <span key={idx} className="px-2 py-1 bg-orange-200 text-orange-800 rounded text-xs">
                                        {prod}
                                      </span>
                            )}
                                  </div>
                                </div>
                        }
                              {promo.note &&
                        <p><span className="font-semibold">📝 Note:</span> {promo.note}</p>
                        }
                            </div>
                          </div>
                    )}
                      </div>
                    </NeumorphicCard>
                  </div>
                </>
            }
            </div>
          </>
        }

        {/* Sezione Conto Economico */}
        {activeTab === 'conto' &&
        <>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">App Delivery</label>
                <select
                value={selectedDeliveryApp}
                onChange={(e) => setSelectedDeliveryApp(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-2 rounded-lg">

                  <option value="Glovo">Glovo</option>
                  <option value="Deliveroo">Deliveroo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Food Cost %</label>
                <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={foodCostPercentage}
                onChange={(e) => {
                  const newValue = parseFloat(e.target.value);
                  setFoodCostPercentage(newValue);
                  updateFoodCostMutation.mutate(newValue);
                }}
                className="w-full neumorphic-pressed px-4 py-2 rounded-lg" />

              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Platform Fees %</label>
                <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={platformFeesPercentage}
                onChange={(e) => {
                  const newValue = parseFloat(e.target.value);
                  setPlatformFeesPercentage(newValue);
                  updatePlatformFeesMutation.mutate(newValue);
                }}
                className="w-full neumorphic-pressed px-4 py-2 rounded-lg" />

              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Data Inizio</label>
                <input
                type="date"
                value={contoEconomicoDateRange.start}
                onChange={(e) => setContoEconomicoDateRange({ ...contoEconomicoDateRange, start: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-2 rounded-lg" />

              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Data Fine</label>
                <input
                type="date"
                value={contoEconomicoDateRange.end}
                onChange={(e) => setContoEconomicoDateRange({ ...contoEconomicoDateRange, end: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-2 rounded-lg" />

              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NeumorphicCard className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Dettagli Economici</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-slate-700">Gross Sales</span>
                    <span className="text-xl font-bold text-blue-600">€{contoEconomico.grossSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-slate-700">Net Revenue (after discounts)</span>
                    <span className="text-xl font-bold text-green-600">€{contoEconomico.revenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                     <span className="text-slate-700">Food Cost ({foodCostPercentage}% of Gross)</span>
                     <span className="text-lg font-bold text-red-600">{contoEconomico.foodCost.toFixed(2)} €</span>
                   </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-slate-700">Platform Fees ({platformFeesPercentage}%)</span>
                    <span className="text-lg font-bold text-red-600">{contoEconomico.platformFees.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-slate-700">Budget Ads</span>
                    <span className="text-lg font-bold text-red-600">{contoEconomico.adsBudget.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-slate-800">Totale Netto</span>
                    <span className={`text-2xl font-bold ${contoEconomico.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      €{contoEconomico.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </NeumorphicCard>

              <NeumorphicCard className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Riepilogo %</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Food Cost ({foodCostPercentage}% of Gross)</span>
                      <span className="font-bold">{(Math.abs(contoEconomico.foodCost) / contoEconomico.grossSales * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${Math.min(Math.abs(contoEconomico.foodCost) / contoEconomico.revenue * 100, 100)}%` }} />

                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Platform Fees ({platformFeesPercentage}%)</span>
                      <span className="font-bold">{(Math.abs(contoEconomico.platformFees) / contoEconomico.revenue * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${Math.min(Math.abs(contoEconomico.platformFees) / contoEconomico.revenue * 100, 100)}%` }} />

                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Ads Budget</span>
                      <span className="font-bold">{(Math.abs(contoEconomico.adsBudget) / contoEconomico.revenue * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                      className="bg-orange-500 h-2 rounded-full"
                      style={{ width: `${Math.min(Math.abs(contoEconomico.adsBudget) / contoEconomico.revenue * 100, 100)}%` }} />

                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Utile Lordo</span>
                      <span className="font-bold">{(contoEconomico.total / contoEconomico.revenue * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                      className={`h-2 rounded-full ${contoEconomico.total >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(Math.abs(contoEconomico.total / contoEconomico.revenue * 100), 100)}%` }} />

                    </div>
                  </div>
                </div>
              </NeumorphicCard>
            </div>
          </>
        }

        {/* Sezione ROAS */}
        {activeTab === 'roas' && (
          <>
            <NeumorphicCard className="p-6 mb-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Parametri di Calcolo</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Vista Dati</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRoasView('budget')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        roasView === 'budget' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Budget
                    </button>
                    <button
                      onClick={() => setRoasView('consuntivo')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        roasView === 'consuntivo' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Consuntivo
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Food Cost %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={foodCostPercentage}
                    onChange={(e) => setFoodCostPercentage(parseFloat(e.target.value))}
                    className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Platform Fees %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={platformFeesPercentage}
                    onChange={(e) => setPlatformFeesPercentage(parseFloat(e.target.value))}
                    className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                  />
                </div>
              </div>
            </NeumorphicCard>

            <div className="space-y-4">
              {pianiAds.filter(p => p.piattaforma === 'Glovo' || p.piattaforma === 'Deliveroo').map((campagna) => {
                const cofinanziamento = parseFloat(campagna.percentuale_cofinanziamento) || 0;
                
                // Usa budget o consuntivo in base alla vista selezionata
                const consuntivo = calcolaBudgetConsuntivo(campagna);
                const budget = roasView === 'consuntivo' ? consuntivo.budgetTotale : parseFloat(campagna.budget) || 0;
                const costoEffettivo = roasView === 'consuntivo' ? consuntivo.costoEffettivo : budget * (1 - cofinanziamento / 100);

                // ROAS Break Even considerando il cofinanziamento
                // ROAS = (1 - Cofinanziamento%) / (1 - FoodCost% - PlatformFee%)
                const marginePercentuale = 1 - (foodCostPercentage / 100) - (platformFeesPercentage / 100);
                const roasBreakEven = marginePercentuale > 0 ? (1 - cofinanziamento / 100) / marginePercentuale : 0;

                // Get current ROAS from state
                const currentRoas = roasCampaigns[campagna.id] || 0;
                
                // Calcolo guadagno per euro EFFETTIVAMENTE speso (dopo cofinanziamento)
                // Per ogni 1€ speso effettivamente, il budget totale è = 1€ / (1 - cofinanziamento%)
                // ROAS si calcola sul budget totale, non sul costo effettivo
                // Revenue = ROAS * Budget Totale
                // Margine = Revenue * (1 - FoodCost% - PlatformFee%)
                // Profitto = Margine - 1€ (costo effettivo)
                const budgetTotalePerEuroSpeso = 1 / (1 - cofinanziamento / 100);
                const revenuePerEuroSpeso = currentRoas * budgetTotalePerEuroSpeso;
                const marginePerEuro = revenuePerEuroSpeso * marginePercentuale;
                const profittoPerEuro = marginePerEuro - 1;

                return (
                  <NeumorphicCard key={campagna.id} className="p-6">
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-800">{campagna.nome}</h3>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg font-medium text-sm">
                          {campagna.piattaforma}
                        </span>
                        {roasView === 'consuntivo' && consuntivo.aggiustamenti.length > 0 && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">
                            Consuntivo ({consuntivo.aggiustamenti.length} agg.)
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        📅 {format(parseISO(campagna.data_inizio), 'dd MMM yyyy', { locale: it })} - {format(parseISO(campagna.data_fine), 'dd MMM yyyy', { locale: it })}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="neumorphic-pressed p-4 rounded-xl">
                        <p className="text-xs text-slate-500 mb-1">Budget Totale</p>
                        <p className="text-xl font-bold text-slate-800">€{budget.toFixed(2)}</p>
                      </div>
                      <div className="neumorphic-pressed p-4 rounded-xl">
                        <p className="text-xs text-slate-500 mb-1">Cofinanziamento</p>
                        <p className="text-xl font-bold text-green-600">{cofinanziamento}%</p>
                      </div>
                      <div className="neumorphic-pressed p-4 rounded-xl">
                        <p className="text-xs text-slate-500 mb-1">Costo Effettivo</p>
                        <p className="text-xl font-bold text-orange-600">€{costoEffettivo.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-bold text-purple-800">🎯 ROAS Break-Even</p>
                        <div className="group relative">
                          <Info className="w-4 h-4 text-purple-600 cursor-help" />
                          <div className="absolute right-0 top-6 w-72 bg-slate-800 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                            <p className="font-bold mb-1">Formula:</p>
                            <p className="mb-2">ROAS Break-Even = (1 - Cofinanziamento%) / (1 - Food Cost% - Platform Fee%)</p>
                            <p className="text-slate-300">
                              Con cofinanziamento {cofinanziamento}%, Food Cost {foodCostPercentage}% e Platform Fee {platformFeesPercentage}%, 
                              devi generare €{roasBreakEven.toFixed(2)} di revenue per ogni €1 di budget totale speso per coprire tutti i costi.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-purple-600">{roasBreakEven.toFixed(2)}</p>
                        <p className="text-sm text-purple-700">sul budget totale</p>
                      </div>
                      <p className="text-xs text-purple-600 mt-2">
                        Per ogni €1 di budget totale (prima del cofinanziamento), devi generare €{roasBreakEven.toFixed(2)} di revenue per essere in pareggio.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">ROAS Attuale della Campagna</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={currentRoas}
                          onChange={(e) => setRoasCampaigns({ ...roasCampaigns, [campagna.id]: parseFloat(e.target.value) || 0 })}
                          placeholder="es. 3.50"
                          className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                        />
                      </div>

                      {currentRoas > 0 && (
                        <div className={`rounded-xl p-4 border-2 ${
                          currentRoas >= roasBreakEven 
                            ? 'bg-green-50 border-green-300' 
                            : 'bg-red-50 border-red-300'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-bold text-slate-800">Risultato Campagna</p>
                            {currentRoas >= roasBreakEven ? (
                              <span className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-bold">
                                ✓ PROFITTO
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold">
                                ✗ PERDITA
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className="text-xs text-slate-600 mb-1">Revenue Generato</p>
                              <p className="text-lg font-bold text-slate-800">€{(costoEffettivo * currentRoas).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-600 mb-1">Margine Lordo</p>
                              <p className="text-lg font-bold text-blue-600">€{(costoEffettivo * currentRoas * marginePercentuale).toFixed(2)}</p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-200">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs text-slate-600">Guadagno/Perdita per € Investito</p>
                              <div className="group relative">
                                <Info className="w-3 h-3 text-slate-500 cursor-help" />
                                <div className="absolute left-0 top-5 w-80 bg-slate-800 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                                  <p className="font-bold mb-1">Formula:</p>
                                  <p className="mb-2">
                                    1. Budget totale per €1 speso = 1 / (1 - {cofinanziamento}%) = €{budgetTotalePerEuroSpeso.toFixed(2)}<br/>
                                    2. Revenue = ROAS × Budget totale = {currentRoas.toFixed(2)} × €{budgetTotalePerEuroSpeso.toFixed(2)} = €{revenuePerEuroSpeso.toFixed(2)}<br/>
                                    3. Margine = Revenue × ({100 - foodCostPercentage - platformFeesPercentage}%) = €{marginePerEuro.toFixed(2)}<br/>
                                    4. Profitto = Margine - €1 speso = €{profittoPerEuro.toFixed(2)}
                                  </p>
                                  <p className="text-slate-300">
                                    Questo è il guadagno netto per ogni euro che paghi effettivamente (dopo cofinanziamento).
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <p className={`text-3xl font-bold ${profittoPerEuro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {profittoPerEuro >= 0 ? '+' : ''}€{profittoPerEuro.toFixed(2)}
                              </p>
                              <p className="text-sm text-slate-600">per ogni €1 effettivamente speso</p>
                            </div>
                          </div>

                          {profittoPerEuro >= 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs text-slate-600">Profitto Totale Stimato</p>
                                <div className="group relative">
                                  <Info className="w-3 h-3 text-slate-500 cursor-help" />
                                  <div className="absolute left-0 top-5 w-64 bg-slate-800 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                                    <p className="font-bold mb-1">Formula:</p>
                                    <p>Profitto per €1 × Costo Effettivo Totale</p>
                                    <p className="mt-2 text-slate-300">
                                      €{profittoPerEuro.toFixed(2)} × €{costoEffettivo.toFixed(2)} = €{(profittoPerEuro * costoEffettivo).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <p className="text-2xl font-bold text-green-600">€{(profittoPerEuro * costoEffettivo).toFixed(2)}</p>
                            </div>
                          )}

                          {profittoPerEuro < 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs text-slate-600">Perdita Totale Stimata</p>
                                <div className="group relative">
                                  <Info className="w-3 h-3 text-slate-500 cursor-help" />
                                  <div className="absolute left-0 top-5 w-64 bg-slate-800 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                                    <p className="font-bold mb-1">Formula:</p>
                                    <p>Perdita per €1 × Costo Effettivo Totale</p>
                                    <p className="mt-2 text-slate-300">
                                      €{profittoPerEuro.toFixed(2)} × €{costoEffettivo.toFixed(2)} = €{(profittoPerEuro * costoEffettivo).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <p className="text-2xl font-bold text-red-600">€{(profittoPerEuro * costoEffettivo).toFixed(2)}</p>
                              <p className="text-xs text-orange-600 mt-2">
                                💡 Per raggiungere il break-even devi aumentare il ROAS a {roasBreakEven.toFixed(2)} (attualmente {currentRoas.toFixed(2)})
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </NeumorphicCard>
                );
              })}

              {pianiAds.filter(p => p.piattaforma === 'Glovo' || p.piattaforma === 'Deliveroo').length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p>Nessuna campagna ads disponibile per Glovo o Deliveroo</p>
                  <p className="text-xs mt-2">Crea una campagna nella tab "Ads" per iniziare</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedPage>);

}