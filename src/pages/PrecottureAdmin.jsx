import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { ChefHat, Plus, Edit, Save, X, Calendar, History, Store, User, Trash2, Pizza, TrendingUp, Settings } from "lucide-react";
import moment from "moment";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const giorni = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export default function PrecottureAdmin() {
  const [activeTab, setActiveTab] = useState('configurazione');
  const [selectedStore, setSelectedStore] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [editData, setEditData] = useState({});
  const [dateRange, setDateRange] = useState('week');
  const { data: configTeglieData = [] } = useQuery({
    queryKey: ['config-teglie'],
    queryFn: () => base44.entities.ConfigurazioneTeglieCalcolo.list(),
  });

  const [teglieConfig, setTeglieConfig] = useState({
    categorie: ['pizza'],
    unita_per_teglia: 8,
    aggiornamento_automatico: false
  });

  // Carica configurazione salvata
  React.useEffect(() => {
    const activeConfig = configTeglieData.find(c => c.is_active);
    if (activeConfig) {
      setTeglieConfig({
        categorie: activeConfig.categorie || ['pizza'],
        unita_per_teglia: activeConfig.unita_per_teglia || 8,
        aggiornamento_automatico: activeConfig.aggiornamento_automatico || false
      });
    }
  }, [configTeglieData]);
  const [showTeglieConfig, setShowTeglieConfig] = useState(false);
  const [teglieStartDate, setTeglieStartDate] = useState(moment().subtract(30, 'days').format('YYYY-MM-DD'));
  const [teglieEndDate, setTeglieEndDate] = useState(moment().format('YYYY-MM-DD'));
  const [selectedStoresForChart, setSelectedStoresForChart] = useState([]);
  const [selectedStoreForMedia, setSelectedStoreForMedia] = useState('');
  const [chartViewMode, setChartViewMode] = useState('timeline'); // 'timeline' or 'day'
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState('Lunedì');
  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: impasti = [] } = useQuery({
    queryKey: ['gestione-impasti'],
    queryFn: () => base44.entities.GestioneImpasti.list(),
  });

  const { data: preparazioni = [] } = useQuery({
    queryKey: ['preparazioni-storico'],
    queryFn: () => base44.entities.Preparazioni.list('-created_date', 500),
    enabled: activeTab === 'storico'
  });

  const { data: prodottiVenduti = [] } = useQuery({
    queryKey: ['prodotti-venduti-teglie', teglieStartDate, teglieEndDate],
    queryFn: () => base44.entities.ProdottiVenduti.filter({
      data_vendita: { 
        $gte: teglieStartDate, 
        $lte: teglieEndDate 
      }
    }),
    enabled: activeTab === 'teglie-vendute' || activeTab === 'configurazione'
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.GestioneImpasti.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestione-impasti'] });
      setEditingRow(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GestioneImpasti.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestione-impasti'] });
      setEditingRow(null);
    },
  });

  const deletePreparazioneMutation = useMutation({
    mutationFn: (id) => base44.entities.Preparazioni.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preparazioni-storico'] });
    },
  });

  const saveConfigTeglieeMutation = useMutation({
    mutationFn: async (configData) => {
      // Disattiva tutte le configurazioni esistenti
      const existing = await base44.entities.ConfigurazioneTeglieCalcolo.list();
      for (const config of existing) {
        await base44.entities.ConfigurazioneTeglieCalcolo.update(config.id, { is_active: false });
      }
      // Crea la nuova configurazione attiva
      return base44.entities.ConfigurazioneTeglieCalcolo.create({ ...configData, is_active: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-teglie'] });
      alert('Configurazione salvata con successo!');
    },
  });

  const filteredImpasti = useMemo(() => {
    if (!selectedStore) return [];
    return impasti.filter(i => i.store_id === selectedStore || i.store_name === selectedStore);
  }, [impasti, selectedStore]);

  const getDataForDay = (giorno) => {
    return filteredImpasti.find(i => i.giorno_settimana === giorno);
  };

  const getTotaleGiornaliero = (data) => {
    if (!data) return 0;
    return (data.pranzo_rosse || 0) +
           (data.pomeriggio_rosse || 0) +
           (data.cena_rosse || 0);
  };

  const getImpastoPer3Giorni = (giornoIndex) => {
    let totale = 0;
    for (let i = 0; i < 3; i++) {
      const idx = (giornoIndex + i) % 7;
      const data = getDataForDay(giorni[idx]);
      totale += getTotaleGiornaliero(data);
    }
    return totale;
  };

  const handleEdit = (giorno, data) => {
    setEditingRow(giorno);
    if (data) {
      // If data exists, use saved percentages
      setEditData({
        ...data,
        totale_giornata: data.totale_giornata || getTotaleGiornaliero(data),
        percentuale_pranzo: data.percentuale_pranzo ?? 30,
        percentuale_pomeriggio: data.percentuale_pomeriggio ?? 30,
        percentuale_cena: data.percentuale_cena ?? 40
      });
    } else {
      // If no data, use default percentages
      setEditData({
        totale_giornata: 0,
        percentuale_pranzo: 30,
        percentuale_pomeriggio: 30,
        percentuale_cena: 40,
        pranzo_rosse: 0,
        pomeriggio_rosse: 0,
        cena_rosse: 0
      });
    }
  };

  const handleSave = async (giorno) => {
    const store = stores.find(s => s.id === selectedStore);
    const existing = getDataForDay(giorno);

    // Calculate values based on total and percentages
    const totale = parseFloat(editData.totale_giornata) || 0;
    const percPranzo = parseFloat(editData.percentuale_pranzo) || 0;
    const percPomeriggio = parseFloat(editData.percentuale_pomeriggio) || 0;
    const percCena = parseFloat(editData.percentuale_cena) || 0;

    // Validazione: somma deve essere 100%
    const sommaPercentuali = percPranzo + percPomeriggio + percCena;
    if (Math.abs(sommaPercentuali - 100) > 0.1) {
      alert(`La somma delle percentuali deve essere 100%. Attualmente: ${sommaPercentuali.toFixed(1)}%`);
      return;
    }

    const payload = {
      store_name: store?.name,
      store_id: selectedStore,
      giorno_settimana: giorno,
      totale_giornata: totale,
      percentuale_pranzo: percPranzo,
      percentuale_pomeriggio: percPomeriggio,
      percentuale_cena: percCena,
      pranzo_rosse: Math.round(totale * (percPranzo / 100)),
      pomeriggio_rosse: Math.round(totale * (percPomeriggio / 100)),
      cena_rosse: Math.round(totale * (percCena / 100))
    };

    if (existing) {
      await updateMutation.mutateAsync({ id: existing.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const handleAggiornaConMedia = async (giorno) => {
    const mediaGiorno = mediaUltimi30Giorni[giorno];
    if (!mediaGiorno) {
      alert(`Nessun dato disponibile per ${giorno}`);
      return;
    }

    const store = stores.find(s => s.id === selectedStore);
    const existing = getDataForDay(giorno);

    // Usa le percentuali esistenti se presenti, altrimenti i default
    const percPranzo = existing?.percentuale_pranzo ?? 30;
    const percPomeriggio = existing?.percentuale_pomeriggio ?? 30;
    const percCena = existing?.percentuale_cena ?? 40;

    const payload = {
      store_name: store?.name,
      store_id: selectedStore,
      giorno_settimana: giorno,
      totale_giornata: mediaGiorno,
      percentuale_pranzo: percPranzo,
      percentuale_pomeriggio: percPomeriggio,
      percentuale_cena: percCena,
      pranzo_rosse: Math.round(mediaGiorno * (percPranzo / 100)),
      pomeriggio_rosse: Math.round(mediaGiorno * (percPomeriggio / 100)),
      cena_rosse: Math.round(mediaGiorno * (percCena / 100))
    };

    if (existing) {
      await updateMutation.mutateAsync({ id: existing.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  // Storico precotture
  const getDateFilter = () => {
    const now = moment();
    if (dateRange === 'today') return now.startOf('day');
    if (dateRange === 'week') return now.subtract(7, 'days');
    if (dateRange === 'month') return now.subtract(30, 'days');
    return null;
  };

  const filteredStorico = useMemo(() => {
    return preparazioni.filter(p => {
      if (selectedStore && p.store_id !== selectedStore) return false;
      const dateFilter = getDateFilter();
      if (dateFilter && moment(p.created_date).isBefore(dateFilter)) return false;
      return true;
    });
  }, [preparazioni, selectedStore, dateRange]);

  const storicoStats = useMemo(() => {
    if (filteredStorico.length === 0) return null;
    
    const totaleRosse = filteredStorico.reduce((sum, p) => sum + (p.rosse_preparate || 0), 0);
    const totaleBianche = filteredStorico.reduce((sum, p) => sum + (p.bianche_preparate || 0), 0);
    
    return {
      totaleForm: filteredStorico.length,
      totaleRosse,
      totaleBianche,
      mediaRosse: (totaleRosse / filteredStorico.length).toFixed(1),
      mediaBianche: (totaleBianche / filteredStorico.length).toFixed(1)
    };
  }, [filteredStorico]);

  const getStoreName = (storeId) => {
    return stores.find(s => s.id === storeId)?.name || storeId;
  };

  // Teglie vendute calculations
  const teglieVendute = useMemo(() => {
    // Debug: log raw data
    console.log('DEBUG Teglie - Total prodottiVenduti:', prodottiVenduti.length);
    console.log('DEBUG Teglie - Configured categories:', teglieConfig.categorie);
    console.log('DEBUG Teglie - Date range:', teglieStartDate, 'to', teglieEndDate);
    console.log('DEBUG Teglie - Selected store:', selectedStore);
    
    // Log unique categories and stores
    const uniqueCategories = [...new Set(prodottiVenduti.map(p => p.category))];
    const uniqueStores = [...new Set(prodottiVenduti.map(p => p.store_name))];
    console.log('DEBUG Teglie - Available categories:', uniqueCategories);
    console.log('DEBUG Teglie - Available stores:', uniqueStores);
    
    // Log Lanino specific data
    const laninoData = prodottiVenduti.filter(p => p.store_name?.toLowerCase().includes('lanino'));
    console.log('DEBUG Teglie - Lanino data count:', laninoData.length);
    if (laninoData.length > 0) {
      console.log('DEBUG Teglie - Sample Lanino record:', laninoData[0]);
    }
    
    const filtered = prodottiVenduti.filter(p => {
      // Filter by date range
      if (p.data_vendita < teglieStartDate || p.data_vendita > teglieEndDate) return false;
      // Filter by store (for table view)
      if (selectedStore && p.store_id !== selectedStore) return false;
      // Filter by category
      if (!teglieConfig.categorie.includes(p.category)) return false;
      return true;
    });
    
    console.log('DEBUG Teglie - Filtered count:', filtered.length);

    // Group by store and date
    const dailyData = {};
    filtered.forEach(p => {
      const key = `${p.store_id}_${p.data_vendita}`;
      if (!dailyData[key]) {
        dailyData[key] = {
          store_id: p.store_id,
          store_name: p.store_name,
          data: p.data_vendita,
          totale_unita: 0
        };
      }
      dailyData[key].totale_unita += p.total_pizzas_sold || 0;
    });

    // Calculate teglie
    const result = Object.values(dailyData).map(d => ({
      ...d,
      teglie: (d.totale_unita / teglieConfig.unita_per_teglia).toFixed(2),
      day_of_week: moment(d.data).format('dddd')
    }));

    return result.sort((a, b) => a.data.localeCompare(b.data));
  }, [prodottiVenduti, teglieConfig, teglieStartDate, teglieEndDate, selectedStore]);

  // All teglie without store filter (for chart)
  const allTeglieVendute = useMemo(() => {
    const filtered = prodottiVenduti.filter(p => {
      if (p.data_vendita < teglieStartDate || p.data_vendita > teglieEndDate) return false;
      if (!teglieConfig.categorie.includes(p.category)) return false;
      return true;
    });

    const dailyData = {};
    filtered.forEach(p => {
      const key = `${p.store_id}_${p.data_vendita}`;
      if (!dailyData[key]) {
        dailyData[key] = {
          store_id: p.store_id,
          store_name: p.store_name,
          data: p.data_vendita,
          totale_unita: 0
        };
      }
      dailyData[key].totale_unita += p.total_pizzas_sold || 0;
    });

    // Mapping giorni inglese -> italiano
    const dayMapping = {
      'monday': 'Lunedì',
      'tuesday': 'Martedì',
      'wednesday': 'Mercoledì',
      'thursday': 'Giovedì',
      'friday': 'Venerdì',
      'saturday': 'Sabato',
      'sunday': 'Domenica'
    };

    const result = Object.values(dailyData).map(d => {
      const dayNameEng = moment(d.data).format('dddd').toLowerCase();
      const dayNameIta = dayMapping[dayNameEng] || 'Lunedì';
      return {
        ...d,
        teglie: parseFloat((d.totale_unita / teglieConfig.unita_per_teglia).toFixed(2)),
        day_of_week: dayNameIta
      };
    });

    return result.sort((a, b) => a.data.localeCompare(b.data));
  }, [prodottiVenduti, teglieConfig, teglieStartDate, teglieEndDate]);

  // Media per giorno della settimana (per singolo store)
  const mediaPerGiorno = useMemo(() => {
    const dataToUse = selectedStoreForMedia 
      ? allTeglieVendute.filter(t => t.store_id === selectedStoreForMedia)
      : allTeglieVendute;

    const byDay = {};
    dataToUse.forEach(t => {
      if (!byDay[t.day_of_week]) {
        byDay[t.day_of_week] = { count: 0, total: 0 };
      }
      byDay[t.day_of_week].count++;
      byDay[t.day_of_week].total += parseFloat(t.teglie);
    });

    // Ritorna tutti i giorni della settimana nell'ordine corretto
    return giorni.map(giorno => ({
      day: giorno,
      media: byDay[giorno] ? (byDay[giorno].total / byDay[giorno].count).toFixed(2) : '0.00'
    }));
  }, [allTeglieVendute, selectedStoreForMedia]);

  // Trend chart data - multistore support with day-of-week filter
  const teglieChartData = useMemo(() => {
    const storesToShow = selectedStoresForChart.length > 0 ? selectedStoresForChart : 
                        (selectedStore ? [selectedStore] : []);

    // Filter by day of week if in 'day' mode
    const filteredData = chartViewMode === 'day' 
      ? allTeglieVendute.filter(t => t.day_of_week === selectedDayOfWeek)
      : allTeglieVendute;

    if (storesToShow.length === 0) {
      // Show all stores combined
      const byDate = {};
      filteredData.forEach(t => {
        if (!byDate[t.data]) {
          byDate[t.data] = 0;
        }
        byDate[t.data] += parseFloat(t.teglie);
      });

      return Object.entries(byDate)
        .map(([date, teglie]) => ({
          date: moment(date).format('DD/MM'),
          totale: parseFloat(teglie.toFixed(2))
        }))
        .sort((a, b) => moment(a.date, 'DD/MM').diff(moment(b.date, 'DD/MM')));
    }

    // Group by date with multiple stores
    const byDate = {};
    filteredData.forEach(t => {
      if (!storesToShow.includes(t.store_id)) return;
      
      if (!byDate[t.data]) {
        byDate[t.data] = {};
      }
      byDate[t.data][t.store_name] = parseFloat(t.teglie);
    });

    return Object.entries(byDate)
      .map(([date, storeData]) => ({
        date: moment(date).format('DD/MM'),
        ...storeData
      }))
      .sort((a, b) => moment(a.date, 'DD/MM').diff(moment(b.date, 'DD/MM')));
  }, [allTeglieVendute, selectedStoresForChart, selectedStore, chartViewMode, selectedDayOfWeek]);

  // Get unique store names for legend
  const chartStoreNames = useMemo(() => {
    if (teglieChartData.length === 0) return [];
    const firstRow = teglieChartData[0];
    return Object.keys(firstRow).filter(k => k !== 'date' && k !== 'totale');
  }, [teglieChartData]);

  // Calculate Y-axis domain for chart
  const chartYDomain = useMemo(() => {
    if (teglieChartData.length === 0) return [0, 100];
    
    let maxValue = 0;
    teglieChartData.forEach(row => {
      Object.keys(row).forEach(key => {
        if (key !== 'date') {
          maxValue = Math.max(maxValue, parseFloat(row[key]) || 0);
        }
      });
    });

    return [0, Math.ceil(maxValue * 1.1)];
  }, [teglieChartData]);

  // Media ultimi 30 giorni per giorno della settimana (per store selezionato in configurazione)
  const mediaUltimi30Giorni = useMemo(() => {
    if (!selectedStore) return {};
    
    const thirtyDaysAgo = moment().subtract(30, 'days').format('YYYY-MM-DD');
    const today = moment().format('YYYY-MM-DD');
    
    const dayMapping = {
      'Monday': 'Lunedì',
      'Tuesday': 'Martedì', 
      'Wednesday': 'Mercoledì',
      'Thursday': 'Giovedì',
      'Friday': 'Venerdì',
      'Saturday': 'Sabato',
      'Sunday': 'Domenica'
    };
    
    const filtered = prodottiVenduti.filter(p => {
      if (p.store_id !== selectedStore) return false;
      if (p.data_vendita < thirtyDaysAgo || p.data_vendita > today) return false;
      if (!teglieConfig.categorie.includes(p.category)) return false;
      return true;
    });

    const dailyData = {};
    filtered.forEach(p => {
      if (!dailyData[p.data_vendita]) {
        dailyData[p.data_vendita] = 0;
      }
      dailyData[p.data_vendita] += p.total_pizzas_sold || 0;
    });

    const byDay = {};
    Object.entries(dailyData).forEach(([data, totale_unita]) => {
      const teglie = totale_unita / teglieConfig.unita_per_teglia;
      const dayNameEng = moment(data).format('dddd');
      const dayNameIta = dayMapping[dayNameEng];
      
      if (dayNameIta) {
        if (!byDay[dayNameIta]) {
          byDay[dayNameIta] = { count: 0, total: 0 };
        }
        byDay[dayNameIta].count++;
        byDay[dayNameIta].total += teglie;
      }
    });

    const result = {};
    Object.entries(byDay).forEach(([day, data]) => {
      result[day] = parseFloat((data.total / data.count).toFixed(2));
    });

    return result;
  }, [prodottiVenduti, selectedStore, teglieConfig]);

  return (
    <ProtectedPage pageName="PrecottureAdmin" requiredUserTypes={['admin']}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              Gestione Precotture
            </h1>
            <p className="text-slate-500 mt-1">Configura precotture e visualizza lo storico</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('configurazione')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'configurazione'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'neumorphic-flat text-slate-700'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            Configurazione
          </button>
          <button
            onClick={() => setActiveTab('storico')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'storico'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'neumorphic-flat text-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            Storico Compilazioni
          </button>
          <button
            onClick={() => setActiveTab('teglie-vendute')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'teglie-vendute'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'neumorphic-flat text-slate-700'
            }`}
          >
            <Pizza className="w-4 h-4" />
            Teglie Vendute
          </button>
        </div>

        {/* Filtro negozio comune */}
        <NeumorphicCard className="p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Store className="w-4 h-4 inline mr-1" />
                Seleziona Negozio
              </label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              >
                <option value="">-- Tutti i negozi --</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
            {activeTab === 'storico' && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Periodo</label>
                <div className="flex gap-2">
                  {[
                    { value: 'today', label: 'Oggi' },
                    { value: 'week', label: '7 giorni' },
                    { value: 'month', label: '30 giorni' },
                    { value: 'all', label: 'Tutto' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setDateRange(opt.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        dateRange === opt.value
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                          : 'neumorphic-flat text-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </NeumorphicCard>

        {/* Tab Configurazione */}
        {activeTab === 'configurazione' && selectedStore && (
          <>
            <NeumorphicCard className="p-6 bg-blue-50">
              <h3 className="text-lg font-bold text-blue-800 mb-3">ℹ️ Come funziona la colonna "Impasto 3 Giorni"</h3>
              <div className="space-y-2 text-sm text-blue-900">
                <p>
                  <strong>Calcolo:</strong> Per ogni giorno, viene calcolato il totale delle precotture necessarie per i successivi 3 giorni.
                </p>
                <p>
                  <strong>Utilizzo:</strong> Questo dato indica quante palline di impasto devono essere preparate per coprire la produzione dei prossimi 3 giorni.
                </p>
              </div>
            </NeumorphicCard>

            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-purple-600" />
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Aggiornamento Media</h3>
                    <p className="text-sm text-slate-500">Gestisci l'aggiornamento automatico dei totali giornalieri</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={teglieConfig.aggiornamento_automatico}
                      onChange={(e) => {
                        const newConfig = { ...teglieConfig, aggiornamento_automatico: e.target.checked };
                        setTeglieConfig(newConfig);
                        saveConfigTeglieeMutation.mutate(newConfig);
                      }}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium text-slate-700">Aggiornamento Automatico</span>
                  </label>
                </div>
              </div>
            </NeumorphicCard>

            <NeumorphicCard className="p-6 overflow-x-auto">
              <div className="flex items-center gap-2 mb-4">
                <ChefHat className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-slate-800">Pianificazione Settimanale</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-3 px-2 font-semibold text-slate-700">Giorno</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-700 bg-blue-50">Media<br/>Ultimi 30gg</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-700 bg-red-50">Pranzo<br/>Rosse</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-700 bg-red-50">Pomeriggio<br/>Rosse</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-700 bg-red-50">Cena<br/>Rosse</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-700 bg-green-50">Totale<br/>Giornata</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-700 bg-purple-50">Scostamento<br/>da Media</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-700 bg-yellow-50">Impasto<br/>3 Giorni</th>
                      <th className="text-center py-3 px-2">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {giorni.map((giorno, idx) => {
                      const data = getDataForDay(giorno);
                      const isEditing = editingRow === giorno;
                      const mediaGiorno = parseFloat(mediaUltimi30Giorni[giorno]) || 0;
                      
                      let totaleGiorno;
                      if (isEditing) {
                        const tot = parseFloat(editData.totale_giornata) || 0;
                        const percPranzo = parseFloat(editData.percentuale_pranzo) || 0;
                        const percPomeriggio = parseFloat(editData.percentuale_pomeriggio) || 0;
                        const percCena = parseFloat(editData.percentuale_cena) || 0;
                        totaleGiorno = Math.round(tot * (percPranzo / 100)) + 
                                      Math.round(tot * (percPomeriggio / 100)) + 
                                      Math.round(tot * (percCena / 100));
                      } else {
                        totaleGiorno = getTotaleGiornaliero(data);
                      }
                      
                      const scostamento = totaleGiorno - mediaGiorno;
                      const impasto3Giorni = getImpastoPer3Giorni(idx);

                      return (
                        <tr key={giorno} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-2 font-medium text-slate-700">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              {giorno}
                            </div>
                          </td>
                          <td className="text-center py-2 px-2 font-medium text-blue-700 bg-blue-50">
                            {mediaGiorno > 0 ? mediaGiorno.toFixed(1) : '-'}
                          </td>
                          {isEditing ? (
                            <>
                              <td colSpan="3" className="py-2 px-2">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-slate-600 w-20">Totale:</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={editData.totale_giornata || 0}
                                      onChange={(e) => setEditData({...editData, totale_giornata: parseFloat(e.target.value) || 0})}
                                      className="w-20 text-center neumorphic-pressed px-2 py-1 rounded-lg"
                                    />
                                  </div>
                                  <div className="grid grid-cols-3 gap-1 text-xs">
                                   <div>
                                     <label className="text-slate-500">Pranzo %</label>
                                     <input
                                       type="number"
                                       min="0"
                                       max="100"
                                       value={editData.percentuale_pranzo || 0}
                                       onChange={(e) => setEditData({...editData, percentuale_pranzo: parseFloat(e.target.value) || 0})}
                                       className="w-full text-center neumorphic-pressed px-1 py-1 rounded-lg mt-1"
                                     />
                                     <p className="text-slate-400 mt-1">
                                       = {Math.round((editData.totale_giornata || 0) * ((editData.percentuale_pranzo || 0) / 100))}
                                     </p>
                                   </div>
                                   <div>
                                     <label className="text-slate-500">Pomeriggio %</label>
                                     <input
                                       type="number"
                                       min="0"
                                       max="100"
                                       value={editData.percentuale_pomeriggio || 0}
                                       onChange={(e) => setEditData({...editData, percentuale_pomeriggio: parseFloat(e.target.value) || 0})}
                                       className="w-full text-center neumorphic-pressed px-1 py-1 rounded-lg mt-1"
                                     />
                                     <p className="text-slate-400 mt-1">
                                       = {Math.round((editData.totale_giornata || 0) * ((editData.percentuale_pomeriggio || 0) / 100))}
                                     </p>
                                   </div>
                                   <div>
                                     <label className="text-slate-500">Cena %</label>
                                     <input
                                       type="number"
                                       min="0"
                                       max="100"
                                       value={editData.percentuale_cena || 0}
                                       onChange={(e) => setEditData({...editData, percentuale_cena: parseFloat(e.target.value) || 0})}
                                       className="w-full text-center neumorphic-pressed px-1 py-1 rounded-lg mt-1"
                                     />
                                     <p className="text-slate-400 mt-1">
                                       = {Math.round((editData.totale_giornata || 0) * ((editData.percentuale_cena || 0) / 100))}
                                     </p>
                                   </div>
                                  </div>
                                  {(() => {
                                   const somma = (parseFloat(editData.percentuale_pranzo) || 0) + 
                                                 (parseFloat(editData.percentuale_pomeriggio) || 0) + 
                                                 (parseFloat(editData.percentuale_cena) || 0);
                                   const isValid = Math.abs(somma - 100) < 0.1;
                                   return (
                                     <div className={`mt-2 px-2 py-1 rounded-lg text-center text-xs font-medium ${
                                       isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                     }`}>
                                       Totale: {somma.toFixed(1)}% {isValid ? '✓' : '⚠️ Deve essere 100%'}
                                     </div>
                                   );
                                  })()}
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="text-center py-2 px-2 bg-red-50">{data?.pranzo_rosse || 0}</td>
                              <td className="text-center py-2 px-2 bg-red-50">{data?.pomeriggio_rosse || 0}</td>
                              <td className="text-center py-2 px-2 bg-red-50">{data?.cena_rosse || 0}</td>
                            </>
                          )}
                          <td className="text-center py-2 px-2 font-bold text-green-700 bg-green-50">{totaleGiorno}</td>
                          <td className="text-center py-2 px-2 font-bold bg-purple-50">
                            <span className={scostamento > 0 ? 'text-green-600' : scostamento < 0 ? 'text-red-600' : 'text-slate-600'}>
                              {scostamento > 0 ? '+' : ''}{scostamento.toFixed(1)}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2 font-bold text-yellow-700 bg-yellow-50">{impasto3Giorni}</td>
                          <td className="text-center py-2 px-2">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleSave(giorno)}
                                  className="nav-button p-2 rounded-lg hover:bg-green-50"
                                  title="Salva"
                                >
                                  <Save className="w-4 h-4 text-green-600" />
                                </button>
                                <button
                                  onClick={() => setEditingRow(null)}
                                  className="nav-button p-2 rounded-lg hover:bg-red-50"
                                  title="Annulla"
                                >
                                  <X className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleEdit(giorno, data)}
                                  className="nav-button p-2 rounded-lg hover:bg-blue-50"
                                  title="Modifica"
                                >
                                  <Edit className="w-4 h-4 text-blue-600" />
                                </button>
                                {mediaGiorno > 0 && (
                                  <button
                                    onClick={() => handleAggiornaConMedia(giorno)}
                                    className="nav-button p-2 rounded-lg hover:bg-purple-50"
                                    title="Aggiorna con media 30gg"
                                  >
                                    <TrendingUp className="w-4 h-4 text-purple-600" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </NeumorphicCard>
          </>
        )}

        {activeTab === 'configurazione' && !selectedStore && (
          <NeumorphicCard className="p-8 text-center">
            <Store className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">Seleziona un negozio per configurare le precotture</p>
          </NeumorphicCard>
        )}

        {/* Tab Teglie Vendute */}
        {activeTab === 'teglie-vendute' && (
          <>
            {/* Configurazione */}
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  Configurazione Calcolo Teglie
                </h2>
                <button
                  onClick={() => setShowTeglieConfig(!showTeglieConfig)}
                  className="nav-button px-4 py-2 rounded-lg text-sm"
                >
                  {showTeglieConfig ? 'Nascondi' : 'Mostra'} Configurazione
                </button>
              </div>

              {showTeglieConfig && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Categorie da considerare
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['pizza', 'dolce', 'bibita', 'birra'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => {
                            setTeglieConfig(prev => ({
                              ...prev,
                              categorie: prev.categorie.includes(cat)
                                ? prev.categorie.filter(c => c !== cat)
                                : [...prev.categorie, cat]
                            }));
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            teglieConfig.categorie.includes(cat)
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                              : 'neumorphic-flat text-slate-700'
                          }`}
                        >
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Unità per teglia
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={teglieConfig.unita_per_teglia}
                      onChange={(e) => setTeglieConfig(prev => ({ ...prev, unita_per_teglia: parseInt(e.target.value) || 1 }))}
                      className="w-32 neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Numero di unità che compongono una teglia
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200">
                    <NeumorphicButton
                      onClick={() => saveConfigTeglieeMutation.mutate(teglieConfig)}
                      disabled={saveConfigTeglieeMutation.isPending || teglieConfig.categorie.length === 0}
                      variant="primary"
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saveConfigTeglieeMutation.isPending ? 'Salvataggio...' : 'Salva Configurazione'}
                    </NeumorphicButton>
                  </div>
                </div>
              )}
            </NeumorphicCard>

            {/* Date Range */}
            <NeumorphicCard className="p-6">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Periodo di analisi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Data inizio</label>
                  <input
                    type="date"
                    value={teglieStartDate}
                    onChange={(e) => setTeglieStartDate(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Data fine</label>
                  <input
                    type="date"
                    value={teglieEndDate}
                    onChange={(e) => setTeglieEndDate(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
                  />
                </div>
              </div>
            </NeumorphicCard>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <NeumorphicCard className="p-6 text-center">
                <Pizza className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-slate-800">
                  {teglieVendute.reduce((sum, t) => sum + parseFloat(t.teglie), 0).toFixed(0)}
                </p>
                <p className="text-xs text-slate-500 mt-1">Teglie Totali</p>
              </NeumorphicCard>

              <NeumorphicCard className="p-6 text-center">
                <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-slate-800">
                  {teglieVendute.length > 0 
                    ? (teglieVendute.reduce((sum, t) => sum + parseFloat(t.teglie), 0) / teglieVendute.length).toFixed(1)
                    : '0'}
                </p>
                <p className="text-xs text-slate-500 mt-1">Media Giornaliera</p>
              </NeumorphicCard>

              <NeumorphicCard className="p-6 text-center">
                <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-slate-800">
                  {teglieVendute.length}
                </p>
                <p className="text-xs text-slate-500 mt-1">Giorni Analizzati</p>
              </NeumorphicCard>
            </div>

            {/* Chart view mode and filters */}
            <NeumorphicCard className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Vista grafico</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setChartViewMode('timeline')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        chartViewMode === 'timeline'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                          : 'neumorphic-flat text-slate-700'
                      }`}
                    >
                      Trend Temporale
                    </button>
                    <button
                      onClick={() => setChartViewMode('day')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        chartViewMode === 'day'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                          : 'neumorphic-flat text-slate-700'
                      }`}
                    >
                      Trend per Giorno Settimana
                    </button>
                  </div>
                </div>

                {chartViewMode === 'day' && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-3">Seleziona giorno della settimana</h3>
                    <div className="flex flex-wrap gap-2">
                      {giorni.map(giorno => (
                        <button
                          key={giorno}
                          onClick={() => setSelectedDayOfWeek(giorno)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedDayOfWeek === giorno
                              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                              : 'neumorphic-flat text-slate-700'
                          }`}
                        >
                          {giorno}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Negozi da visualizzare nel grafico</h3>
                  <div className="flex flex-wrap gap-2">
                    {stores.map(store => (
                      <button
                        key={store.id}
                        onClick={() => {
                          setSelectedStoresForChart(prev => 
                            prev.includes(store.id)
                              ? prev.filter(id => id !== store.id)
                              : [...prev, store.id]
                          );
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedStoresForChart.includes(store.id)
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                            : 'neumorphic-flat text-slate-700'
                        }`}
                      >
                        {store.name}
                      </button>
                    ))}
                    {selectedStoresForChart.length > 0 && (
                      <button
                        onClick={() => setSelectedStoresForChart([])}
                        className="px-4 py-2 rounded-lg text-sm font-medium neumorphic-flat text-red-600"
                      >
                        Mostra Tutti
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </NeumorphicCard>

            {/* Chart */}
            {teglieChartData.length > 0 && (
              <NeumorphicCard className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">
                  {chartViewMode === 'day' 
                    ? `Trend ${selectedDayOfWeek} nel Tempo` 
                    : 'Trend Giornaliero'}
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={teglieChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" />
                      <YAxis 
                        stroke="#64748b" 
                        label={{ value: 'Teglie', angle: -90, position: 'insideLeft' }}
                        domain={chartYDomain}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#f8fafc', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }} 
                      />
                      <Legend />
                      {chartStoreNames.length > 0 ? (
                        chartStoreNames.map((storeName, idx) => (
                          <Line 
                            key={storeName}
                            type="monotone" 
                            dataKey={storeName} 
                            stroke={['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][idx % 6]}
                            strokeWidth={2} 
                            name={storeName}
                          />
                        ))
                      ) : (
                        <Line type="monotone" dataKey="totale" stroke="#3b82f6" strokeWidth={2} name="Totale Teglie" />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </NeumorphicCard>
            )}

            {/* Media per giorno della settimana */}
            <NeumorphicCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Media per Giorno della Settimana</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">Negozio:</label>
                    <select
                      value={selectedStoreForMedia}
                      onChange={(e) => setSelectedStoreForMedia(e.target.value)}
                      className="neumorphic-pressed px-3 py-2 rounded-lg text-sm text-slate-700 outline-none"
                    >
                      <option value="">Tutti i negozi</option>
                      {stores.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {mediaPerGiorno.map(d => (
                    <div key={d.day} className="neumorphic-pressed p-4 rounded-xl text-center">
                      <p className="text-xs text-slate-500 mb-1">{d.day}</p>
                      <p className="text-2xl font-bold text-blue-600">{d.media}</p>
                      <p className="text-xs text-slate-400">teglie</p>
                    </div>
                  ))}
                </div>
              </NeumorphicCard>

            {/* Tabella dettagliata */}
            {teglieVendute.length > 0 && (
              <NeumorphicCard className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Dettaglio Giornaliero</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        <th className="text-left py-3 px-2 text-slate-700">Data</th>
                        <th className="text-left py-3 px-2 text-slate-700">Giorno</th>
                        {!selectedStore && <th className="text-left py-3 px-2 text-slate-700">Negozio</th>}
                        <th className="text-right py-3 px-2 text-slate-700">Unità Vendute</th>
                        <th className="text-right py-3 px-2 text-blue-700 bg-blue-50">Teglie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teglieVendute.map((t, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-2 text-slate-700">
                            {moment(t.data).format('DD/MM/YYYY')}
                          </td>
                          <td className="py-3 px-2 text-slate-600">
                            {t.day_of_week}
                          </td>
                          {!selectedStore && (
                            <td className="py-3 px-2 font-medium text-slate-800">
                              {t.store_name}
                            </td>
                          )}
                          <td className="py-3 px-2 text-right text-slate-700">
                            {t.totale_unita}
                          </td>
                          <td className="py-3 px-2 text-right font-bold text-blue-700 bg-blue-50">
                            {t.teglie}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </NeumorphicCard>
            )}

            {teglieVendute.length === 0 && (
              <NeumorphicCard className="p-12 text-center">
                <Pizza className="w-16 h-16 text-slate-300 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Nessun dato disponibile</h3>
                <p className="text-slate-500">
                  Seleziona un periodo e configura le categorie per visualizzare i dati
                </p>
              </NeumorphicCard>
            )}
          </>
        )}

        {/* Tab Storico */}
        {activeTab === 'storico' && (
          <>
            {storicoStats && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <NeumorphicCard className="p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800">{storicoStats.totaleForm}</p>
                  <p className="text-xs text-slate-500">Form compilati</p>
                </NeumorphicCard>
                <NeumorphicCard className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{storicoStats.totaleRosse}</p>
                  <p className="text-xs text-slate-500">Totale Rosse</p>
                </NeumorphicCard>
                <NeumorphicCard className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-700">{storicoStats.totaleBianche}</p>
                  <p className="text-xs text-slate-500">Totale Bianche</p>
                </NeumorphicCard>
                <NeumorphicCard className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{storicoStats.mediaRosse}</p>
                  <p className="text-xs text-slate-500">Media Rosse</p>
                </NeumorphicCard>
                <NeumorphicCard className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{storicoStats.mediaBianche}</p>
                  <p className="text-xs text-slate-500">Media Bianche</p>
                </NeumorphicCard>
              </div>
            )}

            <NeumorphicCard className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Storico Form Precotture</h2>
              
              {filteredStorico.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Nessun form trovato</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        <th className="text-left py-3 px-2 text-slate-700">Data/Ora</th>
                        <th className="text-left py-3 px-2 text-slate-700">Negozio</th>
                        <th className="text-left py-3 px-2 text-slate-700">Operatore</th>
                        <th className="text-center py-3 px-2 text-slate-700">Turno</th>
                        <th className="text-right py-3 px-2 text-red-700 bg-red-50">Rosse</th>
                        <th className="text-right py-3 px-2 text-yellow-700 bg-yellow-50">Bianche</th>
                        <th className="text-center py-3 px-2 text-slate-700">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStorico.map(prep => (
                        <tr key={prep.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-2 text-slate-700">
                            {moment(prep.created_date).format('DD/MM/YYYY HH:mm')}
                          </td>
                          <td className="py-3 px-2 font-medium text-slate-800">
                            {prep.store_name || getStoreName(prep.store_id)}
                          </td>
                          <td className="py-3 px-2 text-slate-600">
                            <User className="w-3 h-3 inline mr-1" />
                            {prep.created_by || '-'}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              prep.turno === 'pranzo' ? 'bg-blue-100 text-blue-700' :
                              prep.turno === 'pomeriggio' ? 'bg-orange-100 text-orange-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {prep.turno || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right font-bold text-red-700 bg-red-50">
                            {prep.rosse_preparate || 0}
                          </td>
                          <td className="py-3 px-2 text-right font-bold text-yellow-700 bg-yellow-50">
                            {prep.bianche_preparate || 0}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <button
                              onClick={() => {
                                if (confirm('Eliminare questa registrazione?')) {
                                  deletePreparazioneMutation.mutate(prep.id);
                                }
                              }}
                              className="nav-button p-2 rounded-lg hover:bg-red-50"
                              title="Elimina"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </NeumorphicCard>
          </>
        )}
      </div>
    </ProtectedPage>
  );
}