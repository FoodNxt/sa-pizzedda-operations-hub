import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Store, TrendingUp, Users, DollarSign, Star, AlertTriangle, Filter, Calendar, X, RefreshCw, Package, Clock, FileText, UserX, Sparkles } from "lucide-react";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, isAfter, isBefore, parseISO, isValid, addDays } from 'date-fns';
import { formatEuro } from "../components/utils/formatCurrency";
import moment from 'moment';

export default function Dashboard() {
  const [dateRange, setDateRange] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [syncMessage, setSyncMessage] = useState(null);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => base44.entities.Review.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: iPraticoData = [], isLoading: dataLoading } = useQuery({
    queryKey: ['iPratico'],
    queryFn: () => base44.entities.iPratico.list('-order_date', 1000),
  });

  const { data: ordini = [] } = useQuery({
    queryKey: ['ordini-fornitori'],
    queryFn: async () => {
      const allOrdini = await base44.entities.OrdineFornitore.list();
      return allOrdini.filter(o => o.status === 'completato');
    },
  });

  const { data: turni = [] } = useQuery({
    queryKey: ['turni-planday'],
    queryFn: () => base44.entities.TurnoPlanday.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: conteggiosCassa = [] } = useQuery({
    queryKey: ['conteggi-cassa'],
    queryFn: () => base44.entities.ConteggioCassa.list('-data_conteggio', 100),
  });

  const { data: alertsCassaConfig = [] } = useQuery({
    queryKey: ['alerts-cassa-config'],
    queryFn: () => base44.entities.AlertCassaConfig.list(),
  });

  const { data: sprechi = [] } = useQuery({
    queryKey: ['sprechi'],
    queryFn: () => base44.entities.Spreco.list('-data', 200),
  });

  const { data: cleaningInspections = [] } = useQuery({
    queryKey: ['cleaning-inspections'],
    queryFn: () => base44.entities.CleaningInspection.list('-data_ispezione', 200),
  });

  const { data: wrongOrderMatches = [] } = useQuery({
    queryKey: ['wrong-order-matches'],
    queryFn: () => base44.entities.WrongOrderMatch.list(),
  });

  const { data: metricWeights = [] } = useQuery({
    queryKey: ['metric-weights'],
    queryFn: () => base44.entities.MetricWeight.list(),
  });

  const { data: richiesteAssenze = [] } = useQuery({
    queryKey: ['richieste-assenze'],
    queryFn: async () => {
      const [ferie, malattie, turniLiberi] = await Promise.all([
        base44.entities.RichiestaFerie.filter({ stato: 'pending' }),
        base44.entities.RichiestaMalattia.filter({ stato: 'pending' }),
        base44.entities.RichiestaTurnoLibero.filter({ stato: 'pending' })
      ]);
      return { ferie, malattie, turniLiberi };
    },
  });

  const { data: contratti = [] } = useQuery({
    queryKey: ['contratti'],
    queryFn: () => base44.entities.Contratto.list(),
  });

  const { data: regoleOrdini = [] } = useQuery({
    queryKey: ['regole-ordini'],
    queryFn: () => base44.entities.RegolaOrdine.filter({ is_active: true }),
  });

  const { data: inventario = [] } = useQuery({
    queryKey: ['inventario'],
    queryFn: () => base44.entities.RilevazioneInventario.list('-data_rilevazione', 100),
  });

  const safeParseDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return null;
      return date;
    } catch (e) {
      return null;
    }
  };

  const safeFormatDate = (date, formatString) => {
    if (!date || !isValid(date)) return 'N/A';
    try {
      return format(date, formatString);
    } catch (e) {
      return 'N/A';
    }
  };

  const processedData = useMemo(() => {
    let cutoffDate;
    let endFilterDate;
    
    if (startDate || endDate) {
      cutoffDate = startDate ? safeParseDate(startDate) : new Date(0);
      endFilterDate = endDate ? safeParseDate(endDate) : new Date();
    } else {
      const days = parseInt(dateRange);
      cutoffDate = subDays(new Date(), days);
      endFilterDate = new Date();
    }
    
    const filteredData = iPraticoData.filter(item => {
      if (!item.order_date) return false;
      
      const itemDate = safeParseDate(item.order_date);
      if (!itemDate) return false;
      
      if (cutoffDate && isBefore(itemDate, cutoffDate)) return false;
      if (endFilterDate && isAfter(itemDate, endFilterDate)) return false;
      
      return true;
    });

    const totalRevenue = filteredData.reduce((sum, item) => 
      sum + (item.total_revenue || 0), 0
    );

    const totalOrders = filteredData.reduce((sum, item) => 
      sum + (item.total_orders || 0), 0
    );

    // Revenue by store
    const revenueByStore = {};
    filteredData.forEach(item => {
      const storeId = item.store_id;
      if (!revenueByStore[storeId]) {
        revenueByStore[storeId] = 0;
      }
      revenueByStore[storeId] += item.total_revenue || 0;
    });

    // Food Cost by store
    const foodCostByStore = {};
    stores.forEach(store => {
      const storeRevenue = revenueByStore[store.id] || 0;
      const storeCOGS = ordini
        .filter(o => o.store_id === store.id)
        .reduce((sum, o) => sum + (o.totale_ordine || 0), 0);
      const foodCostPerc = storeRevenue > 0 ? (storeCOGS / storeRevenue) * 100 : 0;
      foodCostByStore[store.id] = { cogs: storeCOGS, revenue: storeRevenue, percentage: foodCostPerc };
    });

    // Produttività by store (€/h lavorata)
    const produttivitaByStore = {};
    stores.forEach(store => {
      const storeRevenue = revenueByStore[store.id] || 0;
      const storeTurni = turni.filter(t => 
        t.store_id === store.id && 
        t.timbratura_entrata && 
        t.timbratura_uscita
      );
      const totaleOre = storeTurni.reduce((sum, t) => {
        const entrata = new Date(t.timbratura_entrata);
        const uscita = new Date(t.timbratura_uscita);
        return sum + ((uscita - entrata) / (1000 * 60 * 60));
      }, 0);
      produttivitaByStore[store.id] = totaleOre > 0 ? storeRevenue / totaleOre : 0;
    });

    const revenueByDate = {};
    filteredData.forEach(item => {
      if (!item.order_date) return;
      
      const dateStr = item.order_date;
      if (!revenueByDate[dateStr]) {
        revenueByDate[dateStr] = { date: dateStr, revenue: 0 };
      }
      revenueByDate[dateStr].revenue += item.total_revenue || 0;
    });

    const dailyRevenue = Object.values(revenueByDate)
      .map(d => {
        const parsedDate = safeParseDate(d.date);
        return {
          date: parsedDate,
          dateStr: d.date,
          revenue: parseFloat(d.revenue.toFixed(2))
        };
      })
      .filter(d => d.date !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(d => ({
        date: safeFormatDate(d.date, 'dd MMM'),
        revenue: d.revenue
      }))
      .filter(d => d.date !== 'N/A');

    return { 
      totalRevenue, 
      totalOrders, 
      dailyRevenue, 
      revenueByStore, 
      foodCostByStore, 
      produttivitaByStore 
    };
  }, [iPraticoData, dateRange, startDate, endDate, ordini, turni, stores]);

  // Metriche principali
  const topRevenueStore = useMemo(() => {
    const storeRevenues = stores.map(s => ({
      name: s.name,
      revenue: processedData.revenueByStore[s.id] || 0
    })).sort((a, b) => b.revenue - a.revenue);
    return { top: storeRevenues[0], worst: storeRevenues[storeRevenues.length - 1] };
  }, [stores, processedData.revenueByStore]);

  const foodCostStats = useMemo(() => {
    const storeFoodCosts = stores.map(s => ({
      name: s.name,
      percentage: processedData.foodCostByStore[s.id]?.percentage || 0
    })).filter(s => s.percentage > 0).sort((a, b) => a.percentage - b.percentage);
    const avgFoodCost = storeFoodCosts.length > 0 
      ? storeFoodCosts.reduce((sum, s) => sum + s.percentage, 0) / storeFoodCosts.length 
      : 0;
    return { avg: avgFoodCost, best: storeFoodCosts[0], worst: storeFoodCosts[storeFoodCosts.length - 1] };
  }, [stores, processedData.foodCostByStore]);

  const employeePerformance = useMemo(() => {
    const dipendenti = allUsers.filter(u => (u.user_type === 'dipendente' || u.user_type === 'user') && u.ruoli_dipendente?.length > 0);
    const totalEmployees = dipendenti.length;

    // Calcola performanceScore per ogni dipendente (stesso calcolo di HR > Performance Dipendenti)
    const employeeScores = dipendenti.map(user => {
      const employeeName = user.nome_cognome || user.full_name || user.email;
      
      const employeeShifts = turni.filter(s => s.dipendente_nome === employeeName);
      const employeeWrongOrders = wrongOrderMatches.filter(m => m.matched_employee_name === employeeName);
      
      const getWeight = (metricName, ruolo = null) => {
        let weight;
        if (ruolo) {
          weight = metricWeights.find(w => w.metric_name === metricName && w.ruolo === ruolo && w.is_active);
        }
        if (!weight) {
          weight = metricWeights.find(w => w.metric_name === metricName && w.is_active);
        }
        return weight ? weight.weight : (metricName === 'ordini_sbagliati' ? 2 : metricName === 'ritardi' ? 0.3 : metricName === 'timbrature_mancanti' ? 1 : 1);
      };

      let performanceScore = 100;
      
      // Deduzioni ordini sbagliati
      employeeWrongOrders.forEach(order => {
        const shiftData = employeeShifts.find(s => s.data === order.order_date?.split('T')[0]);
        const ruolo = shiftData ? shiftData.ruolo : null;
        performanceScore -= getWeight('ordini_sbagliati', ruolo);
      });
      
      // Deduzioni ritardi
      employeeShifts.forEach(shift => {
        if (!shift.timbratura_entrata || !shift.ora_inizio) return;
        try {
          const clockInTime = new Date(shift.timbratura_entrata);
          const [oraInizioHH, oraInizioMM] = shift.ora_inizio.split(':').map(Number);
          const scheduledStart = new Date(clockInTime);
          scheduledStart.setHours(oraInizioHH, oraInizioMM, 0, 0);
          const delayMs = clockInTime - scheduledStart;
          const delayMinutes = Math.floor(delayMs / 60000);
          if (delayMinutes > 0) {
            performanceScore -= getWeight('ritardi', shift.ruolo);
          }
        } catch (e) {}
      });
      
      // Deduzioni timbrature mancanti
      const missingClockIns = employeeShifts.filter(s => {
        if (s.timbratura_entrata) return false;
        const shiftDate = safeParseDate(s.data);
        if (!shiftDate) return false;
        const today = new Date();
        if (shiftDate > today) return false;
        return true;
      });
      
      missingClockIns.forEach(shift => {
        performanceScore -= getWeight('timbrature_mancanti', shift.ruolo);
      });

      performanceScore = Math.max(0, Math.min(100, performanceScore));
      
      return {
        id: user.id,
        name: employeeName,
        performanceScore: Math.round(performanceScore)
      };
    }).sort((a, b) => b.performanceScore - a.performanceScore);

    return {
      top: employeeScores[0],
      worst: employeeScores[employeeScores.length - 1],
      total: totalEmployees
    };
  }, [allUsers, turni, wrongOrderMatches, metricWeights]);

  const produttivitaStats = useMemo(() => {
    const storeProd = stores.map(s => ({
      name: s.name,
      produttivita: processedData.produttivitaByStore[s.id] || 0
    })).filter(s => s.produttivita > 0).sort((a, b) => b.produttivita - a.produttivita);
    const avgProd = storeProd.length > 0 
      ? storeProd.reduce((sum, s) => sum + s.produttivita, 0) / storeProd.length 
      : 0;
    return { avg: avgProd, best: storeProd[0], worst: storeProd[storeProd.length - 1] };
  }, [stores, processedData.produttivitaByStore]);

  const googleMapsStats = useMemo(() => {
    let cutoffDate, endFilterDate;
    if (startDate || endDate) {
      cutoffDate = startDate ? safeParseDate(startDate) : new Date(0);
      endFilterDate = endDate ? safeParseDate(endDate) : new Date();
    } else {
      const days = parseInt(dateRange);
      cutoffDate = subDays(new Date(), days);
      endFilterDate = new Date();
    }

    const filteredReviews = reviews.filter(r => {
      if (!r.review_date) return false;
      const itemDate = safeParseDate(r.review_date);
      if (!itemDate) return false;
      if (cutoffDate && isBefore(itemDate, cutoffDate)) return false;
      if (endFilterDate && isAfter(itemDate, endFilterDate)) return false;
      return true;
    });

    const reviewsByEmployee = allUsers
      .filter(u => (u.user_type === 'dipendente' || u.user_type === 'user') && u.ruoli_dipendente?.length > 0)
      .map(emp => {
        const employeeName = emp.nome_cognome || emp.full_name;
        const assignedReviews = filteredReviews.filter(r => {
          if (!r.employee_assigned_name) return false;
          const assignedNames = r.employee_assigned_name.split(',').map(n => n.trim().toLowerCase());
          return assignedNames.includes(employeeName.toLowerCase());
        });
        return { name: employeeName, count: assignedReviews.length };
      })
      .filter(e => e.count > 0)
      .sort((a, b) => b.count - a.count);

    const avgRatingByEmployee = allUsers
      .filter(u => (u.user_type === 'dipendente' || u.user_type === 'user') && u.ruoli_dipendente?.length > 0)
      .map(emp => {
        const employeeName = emp.nome_cognome || emp.full_name;
        const assignedReviews = filteredReviews.filter(r => {
          if (!r.employee_assigned_name) return false;
          const assignedNames = r.employee_assigned_name.split(',').map(n => n.trim().toLowerCase());
          return assignedNames.includes(employeeName.toLowerCase());
        });
        const avgRating = assignedReviews.length > 0 
          ? assignedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / assignedReviews.length 
          : 0;
        return { name: employeeName, rating: avgRating, count: assignedReviews.length };
      })
      .filter(e => e.count > 0)
      .sort((a, b) => b.rating - a.rating);

    return {
      totalReviews: filteredReviews.length,
      bestEmployeeCount: reviewsByEmployee[0],
      worstEmployeeCount: reviewsByEmployee[reviewsByEmployee.length - 1],
      avgScore: filteredReviews.length > 0 ? filteredReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / filteredReviews.length : 0,
      bestEmployeeScore: avgRatingByEmployee[0],
      worstEmployeeScore: avgRatingByEmployee[avgRatingByEmployee.length - 1]
    };
  }, [reviews, allUsers, dateRange, startDate, endDate]);

  // Metriche operative
  const cassaStats = useMemo(() => {
    const storeLastCassa = stores.map(store => {
      const storeConteggios = conteggiosCassa
        .filter(c => c.store_id === store.id && c.data_conteggio)
        .sort((a, b) => new Date(b.data_conteggio) - new Date(a.data_conteggio));
      
      if (storeConteggios.length === 0) return null;
      
      const lastConteggio = storeConteggios[0];
      const alert = alertsCassaConfig.find(a => a.store_id === store.id && a.is_active);
      const hasAlert = alert && (lastConteggio.valore_conteggio || 0) > (alert.soglia_alert || 50);
      
      return {
        storeName: store.name,
        lastDate: lastConteggio.data_conteggio,
        differenza: lastConteggio.valore_conteggio || 0,
        hasAlert
      };
    }).filter(s => s !== null);
    return storeLastCassa;
  }, [stores, conteggiosCassa, alertsCassaConfig]);

  const sprechiStats = useMemo(() => {
    const last30Days = moment().subtract(30, 'days').format('YYYY-MM-DD');
    return sprechi
      .filter(s => s.data_rilevazione && s.data_rilevazione.split('T')[0] >= last30Days)
      .map(s => {
        const valore = (s.quantita_grammi || 0) * (s.costo_unitario || 0) / 1000;
        return {
          storeName: stores.find(st => st.id === s.store_id)?.name || 'N/A',
          data: s.data_rilevazione.split('T')[0],
          valore,
          prodotto: s.prodotto_nome || 'N/A'
        };
      })
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [stores, sprechi]);

  // Alert operativi
  const ordiniDaFare = useMemo(() => {
    if (!regoleOrdini || !inventario) return [];
    const ordiniOggi = [];
    
    stores.forEach(store => {
      const lastInventario = inventario
        .filter(i => i.store_id === store.id)
        .sort((a, b) => new Date(b.data_rilevazione) - new Date(a.data_rilevazione))[0];
      
      if (!lastInventario) return;
      
      regoleOrdini.forEach(regola => {
        const materia = lastInventario.materie_prime?.find(m => m.materia_prima_id === regola.materia_prima_id);
        const quantita = materia?.quantita || 0;
        
        if (quantita < (regola.quantita_minima || 0)) {
          ordiniOggi.push({
            store: store.name,
            materia: regola.materia_prima_nome,
            quantita: quantita,
            minima: regola.quantita_minima
          });
        }
      });
    });
    
    return ordiniOggi;
  }, [stores, inventario, regoleOrdini]);

  const contrattiInScadenza = useMemo(() => {
    if (!contratti || !allUsers) return [];
    const oggi = moment();
    const tra30Giorni = moment().add(30, 'days');
    
    return contratti.filter(c => {
      if (!c.data_fine || c.status !== 'firmato') return false;
      const dataFine = moment(c.data_fine);
      return dataFine.isBetween(oggi, tra30Giorni, 'day', '[]');
    }).map(c => {
      const user = allUsers.find(u => u.id === c.user_id);
      return {
        dipendente: user?.nome_cognome || user?.full_name || 'N/A',
        dataScadenza: c.data_fine,
        giorniRimanenti: moment(c.data_fine).diff(oggi, 'days')
      };
    }).sort((a, b) => a.giorniRimanenti - b.giorniRimanenti);
    }, [contratti, allUsers]);

  const pulizieScores = useMemo(() => {
    if (!cleaningInspections || !stores || !allUsers) return [];
    const last30Days = moment().subtract(30, 'days').format('YYYY-MM-DD');
    const pulizieRecenti = cleaningInspections.filter(c => c.data_ispezione >= last30Days);
    
    const scoresByStore = stores.map(store => {
      const storeInspections = pulizieRecenti.filter(i => i.store_id === store.id);
      const avgScore = storeInspections.length > 0 
        ? storeInspections.reduce((sum, i) => sum + (i.punteggio_totale || 0), 0) / storeInspections.length 
        : 0;
      
      const employeeScores = allUsers
        .filter(u => u.user_type === 'user')
        .map(emp => {
          const empInspections = storeInspections.filter(i => i.dipendente_id === emp.id);
          return {
            name: emp.nome_cognome || emp.full_name,
            score: empInspections.length > 0 ? empInspections.reduce((sum, i) => sum + (i.punteggio_totale || 0), 0) / empInspections.length : 0,
            count: empInspections.length
          };
        })
        .filter(e => e.count > 0)
        .sort((a, b) => b.score - a.score);
      
      return {
        storeName: store.name,
        avgScore,
        topEmployee: employeeScores[0],
        worstEmployee: employeeScores[employeeScores.length - 1]
      };
    }).filter(s => s.avgScore > 0).sort((a, b) => b.avgScore - a.avgScore);
    
    return scoresByStore;
  }, [stores, cleaningInspections, allUsers]);

  const turniLiberi = useMemo(() => {
    if (!turni) return [];
    const oggi = moment().format('YYYY-MM-DD');
    const tra14Giorni = moment().add(14, 'days').format('YYYY-MM-DD');
    
    return turni.filter(t => 
      !t.dipendente_id && 
      t.data >= oggi && 
      t.data <= tra14Giorni &&
      t.stato === 'programmato'
    ).sort((a, b) => a.data.localeCompare(b.data));
  }, [turni]);

  const clearCustomDates = () => {
    setStartDate('');
    setEndDate('');
    setDateRange('30');
  };

  const syncEmployeesMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('syncEmployeesFromUsers');
      return response.data;
    },
    onSuccess: (data) => {
      setSyncMessage({ 
        type: 'success', 
        text: `Sincronizzati ${data.summary.created} dipendenti (${data.summary.skipped} già esistenti)`
      });
      setTimeout(() => setSyncMessage(null), 5000);
    },
    onError: (error) => {
      setSyncMessage({ type: 'error', text: error.message });
      setTimeout(() => setSyncMessage(null), 5000);
    }
  });

  return (
    <ProtectedPage pageName="Dashboard">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        <div className="mb-4 lg:mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
                Dashboard
              </h1>
              <p className="text-sm text-slate-500">Monitor business performance</p>
            </div>
            {employees.length === 0 && (
              <NeumorphicButton
                onClick={() => syncEmployeesMutation.mutate()}
                disabled={syncEmployeesMutation.isPending}
                variant="primary"
                className="flex items-center gap-2"
              >
                {syncEmployeesMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Sincronizza Dipendenti
              </NeumorphicButton>
            )}
          </div>
        </div>

        {syncMessage && (
          <NeumorphicCard className={`p-4 ${syncMessage.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`text-sm ${syncMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
              {syncMessage.text}
            </p>
          </NeumorphicCard>
        )}

        <NeumorphicCard className="p-4 lg:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-base lg:text-lg font-bold text-slate-800">Filtri Periodo</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm text-slate-600 mb-2 block">Periodo</label>
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  if (e.target.value !== 'custom') {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
              >
                <option value="7">Ultimi 7 giorni</option>
                <option value="30">Ultimi 30 giorni</option>
                <option value="90">Ultimi 90 giorni</option>
                <option value="365">Ultimo anno</option>
                <option value="custom">Personalizzato</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-600 mb-2 block">Inizio</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full neumorphic-pressed px-3 py-2.5 rounded-xl text-slate-700 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-2 block">Fine</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full neumorphic-pressed px-3 py-2.5 rounded-xl text-slate-700 outline-none text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </NeumorphicCard>

        {/* Metriche Principali */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Ricavi */}
          <NeumorphicCard className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">{formatEuro(processedData.totalRevenue)}</h3>
                <p className="text-xs text-slate-500">Ricavi Totali</p>
              </div>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-green-600">🏆 {topRevenueStore.top?.name || 'N/A'}</span>
                <span className="font-medium">{formatEuro(topRevenueStore.top?.revenue || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-red-600">📉 {topRevenueStore.worst?.name || 'N/A'}</span>
                <span className="font-medium">{formatEuro(topRevenueStore.worst?.revenue || 0)}</span>
              </div>
            </div>
          </NeumorphicCard>

          {/* Food Cost % */}
          <NeumorphicCard className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">{foodCostStats.avg.toFixed(1)}%</h3>
                <p className="text-xs text-slate-500">Food Cost Medio</p>
              </div>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-green-600">🏆 {foodCostStats.best?.name || 'N/A'}</span>
                <span className="font-medium">{foodCostStats.best?.percentage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-red-600">📉 {foodCostStats.worst?.name || 'N/A'}</span>
                <span className="font-medium">{foodCostStats.worst?.percentage.toFixed(1)}%</span>
              </div>
            </div>
          </NeumorphicCard>

          {/* Dipendenti */}
          <NeumorphicCard className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">{employeePerformance.total}</h3>
                <p className="text-xs text-slate-500">Dipendenti Totali</p>
              </div>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-green-600">🏆 {employeePerformance.top?.name || 'N/A'}</span>
                <span className="font-medium">{employeePerformance.top?.performanceScore || 0} pts</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-red-600">📉 {employeePerformance.worst?.name || 'N/A'}</span>
                <span className="font-medium">{employeePerformance.worst?.performanceScore || 0} pts</span>
              </div>
            </div>
          </NeumorphicCard>

          {/* Produttività */}
          <NeumorphicCard className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">{formatEuro(produttivitaStats.avg)}/h</h3>
                <p className="text-xs text-slate-500">Produttività Media</p>
              </div>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-green-600">🏆 {produttivitaStats.best?.name || 'N/A'}</span>
                <span className="font-medium">{formatEuro(produttivitaStats.best?.produttivita || 0)}/h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-red-600">📉 {produttivitaStats.worst?.name || 'N/A'}</span>
                <span className="font-medium">{formatEuro(produttivitaStats.worst?.produttivita || 0)}/h</span>
              </div>
            </div>
          </NeumorphicCard>

          {/* # Recensioni Google Maps */}
          <NeumorphicCard className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">{googleMapsStats.totalReviews}</h3>
                <p className="text-xs text-slate-500">Recensioni Totali</p>
              </div>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-green-600">🏆 {googleMapsStats.bestEmployeeCount?.name || 'N/A'}</span>
                <span className="font-medium">{googleMapsStats.bestEmployeeCount?.count || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-red-600">📉 {googleMapsStats.worstEmployeeCount?.name || 'N/A'}</span>
                <span className="font-medium">{googleMapsStats.worstEmployeeCount?.count || 0}</span>
              </div>
            </div>
          </NeumorphicCard>

          {/* Score Medio Google Maps */}
          <NeumorphicCard className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">{googleMapsStats.avgScore.toFixed(1)} ⭐</h3>
                <p className="text-xs text-slate-500">Score Medio</p>
              </div>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-green-600">🏆 {googleMapsStats.bestEmployeeScore?.name || 'N/A'}</span>
                <span className="font-medium">{googleMapsStats.bestEmployeeScore?.rating.toFixed(1)} ⭐</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-red-600">📉 {googleMapsStats.worstEmployeeScore?.name || 'N/A'}</span>
                <span className="font-medium">{googleMapsStats.worstEmployeeScore?.rating.toFixed(1) || 0} ⭐</span>
              </div>
            </div>
          </NeumorphicCard>
        </div>

        {/* Metriche Operative */}
        <NeumorphicCard className="p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Metriche Operative
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Ultima Rilevazione Cassa */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-slate-700 mb-3 text-sm">Ultima Rilevazione Cassa</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cassaStats.length > 0 ? cassaStats.map((cassa, idx) => (
                  <div key={idx} className={`p-2 rounded-lg ${cassa.hasAlert ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-700">{cassa.storeName}</span>
                      <div className="text-right">
                        <p className={`text-xs font-bold ${cassa.hasAlert ? 'text-red-600' : 'text-slate-600'}`}>
                          {cassa.differenza > 0 ? '+' : ''}{formatEuro(cassa.differenza)}
                        </p>
                        <p className="text-[10px] text-slate-400">{moment(cassa.lastDate).format('DD/MM/YYYY')}</p>
                      </div>
                    </div>
                    {cassa.hasAlert && (
                      <p className="text-[10px] text-red-600 mt-1">⚠️ Sopra soglia alert</p>
                    )}
                  </div>
                )) : (
                  <p className="text-xs text-slate-400 text-center py-4">Nessun conteggio cassa registrato</p>
                )}
              </div>
            </div>

            {/* Sprechi */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-slate-700 mb-3 text-sm">Sprechi (Ultimi 30 giorni)</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sprechiStats.length > 0 ? sprechiStats.map((spreco, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-slate-700">{spreco.storeName}</span>
                      <span className="text-xs font-bold text-red-600">{formatEuro(spreco.valore)}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {spreco.prodotto} • {moment(spreco.data).format('DD/MM/YYYY')}
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-slate-400 text-center py-4">Nessuno spreco registrato</p>
                )}
              </div>
            </div>
          </div>
        </NeumorphicCard>

        {/* Alert Operativi */}
        <NeumorphicCard className="p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Alert Operativi
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Ordini da fare */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-600" />
                Ordini da Fare
                {ordiniDaFare.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{ordiniDaFare.length}</span>
                )}
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {ordiniDaFare.length > 0 ? ordiniDaFare.map((ord, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-orange-50 border border-orange-200">
                    <p className="text-xs font-medium text-slate-700">{ord.store}</p>
                    <p className="text-xs text-slate-600">{ord.materia}</p>
                    <p className="text-[10px] text-orange-600">Attuale: {ord.quantita} | Min: {ord.minima}</p>
                  </div>
                )) : (
                  <p className="text-xs text-slate-400 text-center py-4">Nessun ordine urgente</p>
                )}
              </div>
            </div>

            {/* Richieste Ferie/Malattia */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Richieste in Attesa
                {richiesteAssenze && (richiesteAssenze.ferie?.length + richiesteAssenze.malattie?.length + richiesteAssenze.turniLiberi?.length) > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {(richiesteAssenze.ferie?.length || 0) + (richiesteAssenze.malattie?.length || 0) + (richiesteAssenze.turniLiberi?.length || 0)}
                  </span>
                )}
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {richiesteAssenze?.ferie?.map(f => {
                  const user = allUsers.find(u => u.id === f.dipendente_id);
                  return (
                    <div key={f.id} className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-xs font-medium text-slate-700">{user?.nome_cognome || user?.full_name}</p>
                      <p className="text-[10px] text-blue-600">🏖️ Ferie: {moment(f.data_inizio).format('DD/MM')} - {moment(f.data_fine).format('DD/MM')}</p>
                    </div>
                  );
                })}
                {richiesteAssenze?.malattie?.map(m => {
                  const user = allUsers.find(u => u.id === m.dipendente_id);
                  return (
                    <div key={m.id} className="p-2 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-xs font-medium text-slate-700">{user?.nome_cognome || user?.full_name}</p>
                      <p className="text-[10px] text-red-600">🤒 Malattia: {moment(m.data_inizio).format('DD/MM')} - {moment(m.data_fine).format('DD/MM')}</p>
                    </div>
                  );
                })}
                {richiesteAssenze?.turniLiberi?.map(t => {
                  const user = allUsers.find(u => u.id === t.dipendente_id);
                  return (
                    <div key={t.id} className="p-2 rounded-lg bg-purple-50 border border-purple-200">
                      <p className="text-xs font-medium text-slate-700">{user?.nome_cognome || user?.full_name}</p>
                      <p className="text-[10px] text-purple-600">📅 Turno libero: {moment(t.data).format('DD/MM/YYYY')}</p>
                    </div>
                  );
                })}
                {(!richiesteAssenze || ((richiesteAssenze.ferie?.length || 0) + (richiesteAssenze.malattie?.length || 0) + (richiesteAssenze.turniLiberi?.length || 0)) === 0) && (
                  <p className="text-xs text-slate-400 text-center py-4">Nessuna richiesta in attesa</p>
                )}
              </div>
            </div>

            {/* Contratti in Scadenza */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                Contratti in Scadenza (30gg)
                {contrattiInScadenza.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{contrattiInScadenza.length}</span>
                )}
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {contrattiInScadenza.length > 0 ? contrattiInScadenza.map((c, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-purple-50 border border-purple-200">
                    <p className="text-xs font-medium text-slate-700">{c.dipendente}</p>
                    <p className="text-[10px] text-purple-600">
                      Scade il {moment(c.dataScadenza).format('DD/MM/YYYY')} ({c.giorniRimanenti} giorni)
                    </p>
                  </div>
                )) : (
                  <p className="text-xs text-slate-400 text-center py-4">Nessun contratto in scadenza</p>
                )}
              </div>
            </div>

            {/* Score Pulizie */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-600" />
                Score Pulizie per Store
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pulizieScores.length > 0 ? pulizieScores.map((ps, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-cyan-50 border border-cyan-200">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-medium text-slate-700">{ps.storeName}</p>
                      <span className="text-xs font-bold text-cyan-600">{ps.avgScore.toFixed(1)}</span>
                    </div>
                    {ps.topEmployee && (
                      <p className="text-[10px] text-green-600">🏆 {ps.topEmployee.name}: {ps.topEmployee.score.toFixed(1)}</p>
                    )}
                    {ps.worstEmployee && (
                      <p className="text-[10px] text-red-600">📉 {ps.worstEmployee.name}: {ps.worstEmployee.score.toFixed(1)}</p>
                    )}
                  </div>
                )) : (
                  <p className="text-xs text-slate-400 text-center py-4">Nessun dato pulizie</p>
                )}
              </div>
            </div>

            {/* Turni Liberi */}
            <div className="neumorphic-pressed p-4 rounded-xl lg:col-span-2">
              <h3 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2">
                <UserX className="w-4 h-4 text-red-600" />
                Turni Liberi (Prossimi 14 giorni)
                {turniLiberi.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{turniLiberi.length}</span>
                )}
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {turniLiberi.length > 0 ? turniLiberi.map(t => {
                  const store = stores.find(s => s.id === t.store_id);
                  return (
                    <div key={t.id} className="p-2 rounded-lg bg-red-50 border border-red-200 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-medium text-slate-700">{store?.name || 'N/A'}</p>
                        <p className="text-[10px] text-slate-600">{moment(t.data).format('DD/MM/YYYY')} • {t.ora_inizio}-{t.ora_fine} • {t.ruolo}</p>
                      </div>
                      <span className="text-xs text-red-600 font-bold whitespace-nowrap ml-2">NON ASSEGNATO</span>
                    </div>
                  );
                }) : (
                  <p className="text-xs text-slate-400 text-center py-4">Tutti i turni sono assegnati</p>
                )}
              </div>
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-4 lg:p-6">
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Trend Revenue</h2>
          {processedData.dailyRevenue.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <div style={{ minWidth: '300px' }}>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={processedData.dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      stroke="#64748b"
                      tick={{ fontSize: 12 }}
                      width={60}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(248, 250, 252, 0.95)', 
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontSize: '12px'
                      }}
                      formatter={(value) => `€${value.toFixed(2)}`}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#3b82f6" 
                      strokeWidth={2} 
                      name="Revenue €"
                      dot={{ fill: '#3b82f6', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-500">
              Nessun dato disponibile per il periodo selezionato
            </div>
          )}
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}