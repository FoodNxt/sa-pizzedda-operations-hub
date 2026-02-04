import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Store, TrendingUp, Users, DollarSign, Star, AlertTriangle, Filter, Calendar, X, RefreshCw, Package, Clock, FileText, UserX, Sparkles, ExternalLink, ArrowUp, ArrowDown } from "lucide-react";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, isAfter, isBefore, parseISO, isValid, addDays } from 'date-fns';
import { formatEuro } from "../components/utils/formatCurrency";
import moment from 'moment';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Dashboard() {
  const [dateRange, setDateRange] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [syncMessage, setSyncMessage] = useState(null);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => base44.entities.Review.list()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: iPraticoData = [], isLoading: dataLoading } = useQuery({
    queryKey: ['iPratico'],
    queryFn: () => base44.entities.iPratico.list('-order_date', 1000)
  });

  const { data: ordini = [] } = useQuery({
    queryKey: ['ordini-fornitori'],
    queryFn: async () => {
      const allOrdini = await base44.entities.OrdineFornitore.list();
      return allOrdini.filter((o) => o.status === 'completato');
    }
  });

  const { data: turni = [] } = useQuery({
    queryKey: ['turni-planday'],
    queryFn: () => base44.entities.TurnoPlanday.list()
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: conteggiosCassa = [] } = useQuery({
    queryKey: ['conteggi-cassa'],
    queryFn: () => base44.entities.ConteggioCassa.list('-data_conteggio', 100)
  });

  const { data: alertsCassaConfig = [] } = useQuery({
    queryKey: ['alerts-cassa-config'],
    queryFn: () => base44.entities.AlertCassaConfig.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: sprechi = [] } = useQuery({
    queryKey: ['sprechi'],
    queryFn: () => base44.entities.Spreco.list('-data_rilevazione', 200)
  });

  const { data: cleaningInspections = [] } = useQuery({
    queryKey: ['cleaning-inspections'],
    queryFn: () => base44.entities.CleaningInspection.list('-inspection_date', 200)
  });

  const { data: materiePrime = [] } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: wrongOrderMatches = [] } = useQuery({
    queryKey: ['wrong-order-matches'],
    queryFn: () => base44.entities.WrongOrderMatch.list()
  });

  const { data: metricWeights = [] } = useQuery({
    queryKey: ['metric-weights'],
    queryFn: () => base44.entities.MetricWeight.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: attrezzature = [] } = useQuery({
    queryKey: ['attrezzature'],
    queryFn: () => base44.entities.Attrezzatura.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: domande = [] } = useQuery({
    queryKey: ['domande-pulizia'],
    queryFn: () => base44.entities.DomandaPulizia.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: malattie = [] } = useQuery({
    queryKey: ['richieste-malattia-all'],
    queryFn: () => base44.entities.RichiestaMalattia.list()
  });

  const { data: richiesteAssenzeRaw } = useQuery({
    queryKey: ['richieste-assenze'],
    queryFn: async () => {
      const [ferie, malattie, turniLiberi, scambi] = await Promise.all([
      base44.entities.RichiestaFerie.filter({ stato: 'in_attesa' }),
      base44.entities.RichiestaMalattia.list(),
      base44.entities.RichiestaTurnoLibero.filter({ stato: 'in_attesa' }),
      base44.entities.TurnoPlanday.list()]
      );
      const malattieInAttesa = malattie.filter((m) =>
      (m.stato === 'non_certificata' || m.stato === 'in_attesa_verifica') &&
      Array.isArray(m.turni_coinvolti) &&
      m.turni_coinvolti.length > 0
      );
      const scambiInAttesa = scambi.filter((t) =>
      t.richiesta_scambio?.stato === 'accepted_by_colleague' &&
      t.id === t.richiesta_scambio.mio_turno_id
      );
      return { ferie, malattie: malattieInAttesa, turniLiberi, scambi: scambiInAttesa };
    }
  });

  const richiesteAssenze = richiesteAssenzeRaw && typeof richiesteAssenzeRaw === 'object' && !Array.isArray(richiesteAssenzeRaw)
    ? richiesteAssenzeRaw
    : { ferie: [], malattie: [], turniLiberi: [], scambi: [] };

  const { data: contratti = [] } = useQuery({
    queryKey: ['contratti'],
    queryFn: () => base44.entities.Contratto.list()
  });

  const { data: regoleOrdini = [] } = useQuery({
    queryKey: ['regole-ordini'],
    queryFn: () => base44.entities.RegolaOrdine.filter({ is_active: true }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: inventario = [] } = useQuery({
    queryKey: ['inventario'],
    queryFn: () => base44.entities.RilevazioneInventario.list('-data_rilevazione', 100)
  });

  const { data: inventarioCantina = [] } = useQuery({
    queryKey: ['inventario-cantina'],
    queryFn: () => base44.entities.RilevazioneInventarioCantina.list('-data_rilevazione', 100)
  });

  const { data: uscite = [] } = useQuery({
    queryKey: ['uscite'],
    queryFn: () => base44.entities.Uscita.list()
  });

  const { data: prodottiVenduti = [] } = useQuery({
    queryKey: ['prodotti-venduti'],
    queryFn: () => base44.entities.ProdottiVenduti.list('-data_vendita', 1000)
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

    const filteredData = iPraticoData.filter((item) => {
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
    filteredData.forEach((item) => {
      const storeId = item.store_id;
      if (!revenueByStore[storeId]) {
        revenueByStore[storeId] = 0;
      }
      revenueByStore[storeId] += item.total_revenue || 0;
    });

    // Food Cost by store
    const foodCostByStore = {};
    stores.forEach((store) => {
      const storeRevenue = revenueByStore[store.id] || 0;
      const storeCOGS = ordini.
      filter((o) => o.store_id === store.id).
      reduce((sum, o) => sum + (o.totale_ordine || 0), 0);
      const foodCostPerc = storeRevenue > 0 ? storeCOGS / storeRevenue * 100 : 0;
      foodCostByStore[store.id] = { cogs: storeCOGS, revenue: storeRevenue, percentage: foodCostPerc };
    });

    // Produttività by store (€/h lavorata)
    const produttivitaByStore = {};
    stores.forEach((store) => {
      const storeRevenue = revenueByStore[store.id] || 0;
      const storeTurni = turni.filter((t) =>
      t.store_id === store.id &&
      t.timbratura_entrata &&
      t.timbratura_uscita
      );
      const totaleOre = storeTurni.reduce((sum, t) => {
        const entrata = new Date(t.timbratura_entrata);
        const uscita = new Date(t.timbratura_uscita);
        return sum + (uscita - entrata) / (1000 * 60 * 60);
      }, 0);
      produttivitaByStore[store.id] = totaleOre > 0 ? storeRevenue / totaleOre : 0;
    });

    const revenueByDate = {};
    filteredData.forEach((item) => {
      if (!item.order_date) return;

      const dateStr = item.order_date;
      if (!revenueByDate[dateStr]) {
        revenueByDate[dateStr] = { date: dateStr, revenue: 0 };
      }
      revenueByDate[dateStr].revenue += item.total_revenue || 0;
    });

    const dailyRevenue = Object.values(revenueByDate).
    map((d) => {
      const parsedDate = safeParseDate(d.date);
      return {
        date: parsedDate,
        dateStr: d.date,
        revenue: parseFloat(d.revenue.toFixed(2))
      };
    }).
    filter((d) => d.date !== null).
    sort((a, b) => a.date.getTime() - b.date.getTime()).
    map((d) => ({
      date: safeFormatDate(d.date, 'dd MMM'),
      revenue: d.revenue
    })).
    filter((d) => d.date !== 'N/A');

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
    const storeRevenues = stores.map((s) => ({
      name: s.name,
      revenue: processedData.revenueByStore[s.id] || 0
    })).sort((a, b) => b.revenue - a.revenue);
    return { top: storeRevenues[0], worst: storeRevenues[storeRevenues.length - 1] };
  }, [stores, processedData.revenueByStore]);

  const foodCostStats = useMemo(() => {
    const storeFoodCosts = stores.map((s) => ({
      name: s.name,
      percentage: processedData.foodCostByStore[s.id]?.percentage || 0
    })).filter((s) => s.percentage > 0).sort((a, b) => a.percentage - b.percentage);
    const avgFoodCost = storeFoodCosts.length > 0 ?
    storeFoodCosts.reduce((sum, s) => sum + s.percentage, 0) / storeFoodCosts.length :
    0;
    return { avg: avgFoodCost, best: storeFoodCosts[0], worst: storeFoodCosts[storeFoodCosts.length - 1] };
  }, [stores, processedData.foodCostByStore]);

  const employeePerformance = useMemo(() => {
    const dipendenti = allUsers.filter((u) => (u.user_type === 'dipendente' || u.user_type === 'user') && u.ruoli_dipendente?.length > 0);
    const totalEmployees = dipendenti.length;

    const getWeight = (metricName, ruolo = null) => {
      let weight;
      if (ruolo) {
        weight = metricWeights.find((w) => w.metric_name === metricName && w.ruolo === ruolo && w.is_active);
      } else {
        weight = metricWeights.find((w) => w.metric_name === metricName && w.is_active);
      }
      return weight ? weight.weight : 1;
    };

    const employeeScores = dipendenti.map((user) => {
      const employeeName = user.nome_cognome || user.full_name || user.email;

      const employeeShifts = turni.filter((s) => {
        if (s.dipendente_nome !== employeeName) return false;
        const shiftDate = safeParseDate(s.data);
        if (!shiftDate) return false;
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return shiftDate <= today;
      });

      const employeeWrongOrders = wrongOrderMatches.filter((m) => m.matched_employee_name === employeeName);

      const w_bonus_recensione = getWeight('bonus_per_recensione');
      const w_min_recensioni = getWeight('min_recensioni');
      const w_malus_recensioni = getWeight('malus_sotto_minimo_recensioni');
      const w_punteggio_recensioni = getWeight('punteggio_recensioni');
      const w_pulizie = getWeight('pulizie');

      let performanceScore = 100;

      let deductionOrdini = 0;
      let deductionRitardi = 0;
      let deductionTimbrature = 0;

      employeeWrongOrders.forEach((order) => {
        const shiftData = employeeShifts.find((s) => {
          if (!s.data) return false;
          const shiftDate = safeParseDate(s.data);
          if (!shiftDate) return false;
          const orderDate = safeParseDate(order.order_date);
          if (!orderDate) return false;
          return shiftDate.toISOString().split('T')[0] === orderDate.toISOString().split('T')[0];
        });
        const ruolo = shiftData ? shiftData.ruolo : null;
        let weight = getWeight('ordini_sbagliati', ruolo);
        if (weight === 1 && ruolo) {
          weight = getWeight('ordini_sbagliati', null) || 2;
        }
        deductionOrdini += weight;
      });

      employeeShifts.forEach((shift) => {
        if (!shift.timbratura_entrata || !shift.ora_inizio) return;
        try {
          const clockInTime = new Date(shift.timbratura_entrata);
          const [oraInizioHH, oraInizioMM] = shift.ora_inizio.split(':').map(Number);
          const scheduledStart = new Date(clockInTime);
          scheduledStart.setHours(oraInizioHH, oraInizioMM, 0, 0);
          const delayMs = clockInTime - scheduledStart;
          const delayMinutes = Math.floor(delayMs / 60000);
          if (delayMinutes > 0) {
            let weight = getWeight('ritardi', shift.ruolo);
            if (weight === 1 && shift.ruolo) {
              weight = getWeight('ritardi', null) || 0.3;
            }
            deductionRitardi += weight;
          }
        } catch (e) {}
      });

      const missingClockIns = employeeShifts.filter((s) => {
        if (s.timbratura_entrata) return false;
        const shiftDate = safeParseDate(s.data);
        if (!shiftDate) return false;
        const today = new Date();
        return shiftDate <= today;
      });

      missingClockIns.forEach((shift) => {
        let weight = getWeight('timbrature_mancanti', shift.ruolo);
        if (weight === 1 && shift.ruolo) {
          weight = getWeight('timbrature_mancanti', null) || 1;
        }
        deductionTimbrature += weight;
      });

      performanceScore -= deductionOrdini;
      performanceScore -= deductionRitardi;
      performanceScore -= deductionTimbrature;

      const employeeGoogleReviews = reviews.filter((r) => {
        if (r.source !== 'google' || !r.employee_assigned_name) return false;
        const assignedNames = r.employee_assigned_name.split(',').map((n) => n.trim().toLowerCase());
        return assignedNames.includes(employeeName.toLowerCase());
      });

      const avgRating = employeeGoogleReviews.length > 0 ?
      employeeGoogleReviews.reduce((sum, r) => sum + r.rating, 0) / employeeGoogleReviews.length :
      0;

      if (employeeGoogleReviews.length > 0 && avgRating < 5) {
        const reviewPenalty = (5 - avgRating) * w_punteggio_recensioni;
        performanceScore -= reviewPenalty;
      }

      if (employeeGoogleReviews.length > 0 && w_bonus_recensione > 0) {
        const reviewBonus = employeeGoogleReviews.length * w_bonus_recensione;
        performanceScore += reviewBonus;
      }

      if (w_min_recensioni > 0 && employeeGoogleReviews.length < w_min_recensioni && w_malus_recensioni > 0) {
        const recensioniMancanti = w_min_recensioni - employeeGoogleReviews.length;
        const malusTotale = recensioniMancanti * w_malus_recensioni;
        performanceScore -= malusTotale;
      }

      let puliti = 0;
      let sporchi = 0;

      cleaningInspections.forEach((inspection) => {
        if (!inspection.domande_risposte || inspection.analysis_status !== 'completed') return;

        const dataCompilazione = new Date(inspection.inspection_date);
        const inspectionStoreId = inspection.store_id;

        inspection.domande_risposte.forEach((domanda) => {
          let nomeAttrezzatura = domanda.attrezzatura;

          if (!nomeAttrezzatura && domanda.tipo_controllo === 'scelta_multipla') {
            const originalQuestion = domande.find((d) => d.id === domanda.domanda_id);
            nomeAttrezzatura = originalQuestion?.attrezzatura;

            if (!nomeAttrezzatura) {
              const domandaLower = domanda.domanda_testo?.toLowerCase() || '';
              for (const attr of attrezzature) {
                const attrLower = attr.nome.toLowerCase();
                if (domandaLower.includes(attrLower)) {
                  nomeAttrezzatura = attr.nome;
                  break;
                }
              }
            }
          }

          if (!nomeAttrezzatura) return;

          const attrezzatura = attrezzature.find((a) => a.nome === nomeAttrezzatura);
          if (!attrezzatura || !attrezzatura.ruoli_responsabili || attrezzatura.ruoli_responsabili.length === 0) return;

          let statoPulizia = null;

          if (domanda.tipo_controllo === 'foto') {
            const normalizeAttrezzatura = (name) => {
              const map = {
                'Forno': 'forno',
                'Impastatrice': 'impastatrice',
                'Tavolo da lavoro': 'tavolo_lavoro',
                'Frigo': 'frigo',
                'Cassa': 'cassa',
                'Lavandino': 'lavandino',
                'Tavolette Takeaway': 'tavolette_takeaway'
              };
              return map[name] || name?.toLowerCase().replace(/\s+/g, '_') || '';
            };

            const normalizedName = normalizeAttrezzatura(nomeAttrezzatura);
            const statusField = `${normalizedName}_pulizia_status`;
            const correctedField = `${normalizedName}_corrected_status`;
            statoPulizia = inspection[correctedField] || inspection[statusField];
          } else if (domanda.tipo_controllo === 'scelta_multipla') {
            const originalQuestion = domande.find((d) => d.id === domanda.domanda_id);
            const isCorrect = domanda.risposta?.toLowerCase() === originalQuestion?.risposta_corretta?.toLowerCase();
            statoPulizia = isCorrect ? 'pulito' : 'sporco';
          }

          if (!statoPulizia) return;

          attrezzatura.ruoli_responsabili.forEach((ruoloResponsabile) => {
            const candidateShifts = employeeShifts.filter((t) => {
              if (t.store_id !== inspectionStoreId) return false;
              if (t.ruolo !== ruoloResponsabile) return false;
              if (!t.dipendente_nome) return false;
              if (!t.data || !t.ora_fine) return false;

              const shiftEndTime = t.timbratura_uscita ?
              new Date(t.timbratura_uscita) :
              new Date(t.data + 'T' + t.ora_fine);

              return shiftEndTime <= dataCompilazione;
            });

            const lastShift = candidateShifts.sort((a, b) => {
              const endA = a.timbratura_uscita ? new Date(a.timbratura_uscita) : new Date(a.data + 'T' + a.ora_fine);
              const endB = b.timbratura_uscita ? new Date(b.timbratura_uscita) : new Date(b.data + 'T' + b.ora_fine);
              return endB - endA;
            })[0];

            if (!lastShift || lastShift.dipendente_nome !== employeeName) return;

            if (statoPulizia === 'pulito') {
              puliti++;
            } else {
              sporchi++;
            }
          });
        });
      });

      const totalControlli = puliti + sporchi;
      if (totalControlli > 0) {
        const percentualePulito = puliti / totalControlli * 100;
        if (percentualePulito < 80) {
          const cleaningPenalty = (80 - percentualePulito) * w_pulizie * 0.1;
          performanceScore -= cleaningPenalty;
        }
      }

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
  }, [allUsers, turni, wrongOrderMatches, metricWeights, reviews, cleaningInspections, attrezzature, domande]);

  const produttivitaStats = useMemo(() => {
    const storeProd = stores.map((s) => ({
      name: s.name,
      produttivita: processedData.produttivitaByStore[s.id] || 0
    })).filter((s) => s.produttivita > 0).sort((a, b) => b.produttivita - a.produttivita);
    const avgProd = storeProd.length > 0 ?
    storeProd.reduce((sum, s) => sum + s.produttivita, 0) / storeProd.length :
    0;
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

    const filteredReviews = reviews.filter((r) => {
      if (!r.review_date) return false;
      const itemDate = safeParseDate(r.review_date);
      if (!itemDate) return false;
      if (cutoffDate && isBefore(itemDate, cutoffDate)) return false;
      if (endFilterDate && isAfter(itemDate, endFilterDate)) return false;
      return true;
    });

    const reviewsByEmployee = allUsers.
    filter((u) => (u.user_type === 'dipendente' || u.user_type === 'user') && u.ruoli_dipendente?.length > 0).
    map((emp) => {
      const employeeName = emp.nome_cognome || emp.full_name;
      const assignedReviews = filteredReviews.filter((r) => {
        if (!r.employee_assigned_name) return false;
        const assignedNames = r.employee_assigned_name.split(',').map((n) => n.trim().toLowerCase());
        return assignedNames.includes(employeeName.toLowerCase());
      });
      return { name: employeeName, count: assignedReviews.length };
    }).
    filter((e) => e.count > 0).
    sort((a, b) => b.count - a.count);

    const avgRatingByEmployee = allUsers.
    filter((u) => (u.user_type === 'dipendente' || u.user_type === 'user') && u.ruoli_dipendente?.length > 0).
    map((emp) => {
      const employeeName = emp.nome_cognome || emp.full_name;
      const assignedReviews = filteredReviews.filter((r) => {
        if (!r.employee_assigned_name) return false;
        const assignedNames = r.employee_assigned_name.split(',').map((n) => n.trim().toLowerCase());
        return assignedNames.includes(employeeName.toLowerCase());
      });
      const avgRating = assignedReviews.length > 0 ?
      assignedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / assignedReviews.length :
      0;
      return { name: employeeName, rating: avgRating, count: assignedReviews.length };
    }).
    filter((e) => e.count > 0).
    sort((a, b) => b.rating - a.rating);

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
    const storeLastCassa = stores.map((store) => {
      const storeConteggios = conteggiosCassa.
      filter((c) => c.store_id === store.id && c.data_conteggio).
      sort((a, b) => new Date(b.data_conteggio) - new Date(a.data_conteggio));

      if (storeConteggios.length === 0) return null;

      const lastConteggio = storeConteggios[0];
      const alert = alertsCassaConfig.find((a) => a.store_id === store.id && a.is_active);
      const hasAlert = alert && (lastConteggio.valore_conteggio || 0) > (alert.soglia_alert || 50);

      return {
        storeName: store.name,
        lastDate: lastConteggio.data_conteggio,
        differenza: lastConteggio.valore_conteggio || 0,
        hasAlert
      };
    }).filter((s) => s !== null);
    return storeLastCassa;
  }, [stores, conteggiosCassa, alertsCassaConfig]);

  const sprechiStats = useMemo(() => {
    let cutoffDate, endFilterDate;
    if (startDate || endDate) {
      cutoffDate = startDate ? safeParseDate(startDate) : new Date(0);
      endFilterDate = endDate ? safeParseDate(endDate) : new Date();
    } else {
      const days = parseInt(dateRange);
      cutoffDate = subDays(new Date(), days);
      endFilterDate = new Date();
    }

    const filteredSprechi = sprechi.filter((s) => {
      if (!s.data_rilevazione) return false;
      const itemDate = safeParseDate(s.data_rilevazione);
      if (!itemDate) return false;
      if (cutoffDate && isBefore(itemDate, cutoffDate)) return false;
      if (endFilterDate && isAfter(itemDate, endFilterDate)) return false;
      return true;
    });

    // Raggruppa per locale e somma
    const sprechiPerStore = {};
    filteredSprechi.forEach((s) => {
      const storeName = stores.find((st) => st.id === s.store_id)?.name || 'N/A';
      const valore = (s.quantita_grammi || 0) * (s.costo_unitario || 0) / 1000;

      if (!sprechiPerStore[storeName]) {
        sprechiPerStore[storeName] = { storeName, totale: 0, count: 0 };
      }
      sprechiPerStore[storeName].totale += valore;
      sprechiPerStore[storeName].count += 1;
    });

    return Object.values(sprechiPerStore).sort((a, b) => b.totale - a.totale);
  }, [stores, sprechi, dateRange, startDate, endDate]);

  const { data: ordiniInviati = [] } = useQuery({
    queryKey: ['ordini-inviati'],
    queryFn: () => base44.entities.OrdineFornitore.filter({ status: 'inviato' })
  });

  const { data: ordiniCompletati = [] } = useQuery({
    queryKey: ['ordini-completati'],
    queryFn: () => base44.entities.OrdineFornitore.filter({ status: 'completato' })
  });

  // Alert operativi - Ordini suggeriti aggregati per fornitore/store
  const ordiniDaFare = useMemo(() => {
    if (!inventario || !inventarioCantina || !materiePrime || !stores) return [];
    const ordiniDettagliati = [];
    const allInventory = [...inventario, ...inventarioCantina];
    const latestByProduct = {};

    allInventory.forEach((item) => {
      const key = `${item.store_id}-${item.prodotto_id}`;
      if (!latestByProduct[key] || new Date(item.data_rilevazione) > new Date(latestByProduct[key].data_rilevazione)) {
        latestByProduct[key] = item;
      }
    });

    Object.values(latestByProduct).forEach((reading) => {
      const product = materiePrime.find((p) => p.id === reading.prodotto_id);
      if (!product) return;

      const store = stores.find((s) => s.id === reading.store_id);
      if (!store) return;

      const isAssignedToStore = !product.assigned_stores ||
      product.assigned_stores.length === 0 ||
      product.assigned_stores.includes(reading.store_id);
      if (!isAssignedToStore) return;

      const isInUsoForStore = product.in_uso_per_store?.[reading.store_id] === true ||
      !product.in_uso_per_store?.[reading.store_id] && product.in_uso === true;
      if (!isInUsoForStore) return;

      const quantitaCritica = product.store_specific_quantita_critica?.[reading.store_id] || product.quantita_critica || product.quantita_minima || 0;
      const quantitaOrdine = product.store_specific_quantita_ordine?.[reading.store_id] || product.quantita_ordine || 0;

      if (reading.quantita_rilevata <= quantitaCritica && quantitaOrdine > 0) {
        // Check se ha ordine in corso
        const hasPendingOrder = ordiniInviati.some((o) =>
        o.store_id === reading.store_id &&
        o.prodotti.some((p) => p.prodotto_id === product.id)
        );

        // Check se è arrivato oggi
        const hasArrivedToday = ordiniCompletati.some((o) => {
          const completedToday = o.data_completamento &&
          new Date(o.data_completamento).toDateString() === new Date().toDateString();
          return completedToday &&
          o.store_id === reading.store_id &&
          o.prodotti.some((p) => p.prodotto_id === product.id);
        });

        // Salta se ha ordine in corso o è arrivato oggi
        if (hasPendingOrder || hasArrivedToday) return;

        const prezzoUnitario = product.prezzo_unitario || 0;
        const ivaPerc = product.iva_percentuale ?? 22;
        const prezzoConIva = prezzoUnitario * (1 + ivaPerc / 100);
        const costoTotale = prezzoConIva * quantitaOrdine;

        ordiniDettagliati.push({
          store: store.name,
          storeId: store.id,
          fornitore: product.fornitore || 'Non specificato',
          prodotto: reading.nome_prodotto,
          quantitaOrdine,
          unitaMisura: reading.unita_misura,
          costoRiga: costoTotale
        });
      }
    });

    // Aggrega per fornitore/store
    const ordiniAggregati = {};
    ordiniDettagliati.forEach((ord) => {
      const key = `${ord.fornitore}|${ord.storeId}`;
      if (!ordiniAggregati[key]) {
        ordiniAggregati[key] = {
          fornitore: ord.fornitore,
          store: ord.store,
          storeId: ord.storeId,
          costoTotale: 0,
          numeroArticoli: 0
        };
      }
      ordiniAggregati[key].costoTotale += ord.costoRiga;
      ordiniAggregati[key].numeroArticoli += 1;
    });

    return Object.values(ordiniAggregati);
  }, [stores, inventario, inventarioCantina, materiePrime, ordiniInviati, ordiniCompletati]);

  const contrattiInScadenza = useMemo(() => {
    if (!allUsers) return [];
    const oggi = moment();
    const tra30Giorni = moment().add(30, 'days');

    return allUsers.
    filter((user) => {
      // Escludi dipendenti che hanno un'uscita registrata
      if (uscite.some((u) => u.dipendente_id === user.id)) return false;

      if (user.user_type !== 'dipendente' && user.user_type !== 'user') return false;
      if (!user.data_inizio_contratto) return false;
      return user.data_fine_contratto || user.durata_contratto_mesi && user.durata_contratto_mesi > 0;
    }).
    map((user) => {
      let dataFine;

      if (user.data_fine_contratto) {
        dataFine = moment(user.data_fine_contratto);
      } else if (user.durata_contratto_mesi && user.durata_contratto_mesi > 0) {
        dataFine = moment(user.data_inizio_contratto).add(parseInt(user.durata_contratto_mesi), 'months');
      }

      if (!dataFine) return null;

      const giorniRimanenti = dataFine.diff(oggi, 'days');
      if (dataFine.isBetween(oggi, tra30Giorni, 'day', '[]')) {
        return {
          dipendente: user.nome_cognome || user.full_name || 'N/A',
          dataScadenza: dataFine.format('YYYY-MM-DD'),
          giorniRimanenti
        };
      }
      return null;
    }).
    filter((c) => c !== null).
    sort((a, b) => a.giorniRimanenti - b.giorniRimanenti);
  }, [allUsers, uscite]);

  const pulizieScores = useMemo(() => {
    if (!cleaningInspections || !stores) return [];
    const last30Days = moment().subtract(30, 'days').format('YYYY-MM-DD');

    const scoresByStore = stores.map((store) => {
      const storeInspections = cleaningInspections.filter((i) =>
      i.store_id === store.id &&
      i.inspection_date &&
      i.inspection_date.split('T')[0] >= last30Days &&
      i.analysis_status === 'completed' &&
      i.overall_score !== null && i.overall_score !== undefined
      );

      const avgScore = storeInspections.length > 0 ?
      storeInspections.reduce((sum, i) => sum + (i.overall_score || 0), 0) / storeInspections.length :
      null;

      return {
        storeName: store.name,
        avgScore,
        count: storeInspections.length
      };
    }).filter((s) => s.avgScore !== null).sort((a, b) => b.avgScore - a.avgScore);

    return scoresByStore;
  }, [stores, cleaningInspections]);

  const turniLiberi = useMemo(() => {
    if (!turni) return [];
    const oggi = moment().format('YYYY-MM-DD');
    const tra14Giorni = moment().add(14, 'days').format('YYYY-MM-DD');

    return turni.filter((t) =>
    !t.dipendente_id &&
    t.data >= oggi &&
    t.data <= tra14Giorni &&
    t.stato === 'programmato'
    ).sort((a, b) => a.data.localeCompare(b.data));
  }, [turni]);

  const topBottomProducts = useMemo(() => {
    if (!prodottiVenduti || prodottiVenduti.length === 0) {
      return { top3: [], bottom3: [] };
    }

    // Usa lo stesso filtro del processedData
    let cutoffDate, endFilterDate;

    if (startDate || endDate) {
      cutoffDate = startDate ? safeParseDate(startDate) : new Date(0);
      endFilterDate = endDate ? safeParseDate(endDate) : new Date();
    } else {
      const days = parseInt(dateRange);
      cutoffDate = subDays(new Date(), days);
      endFilterDate = new Date();
    }

    // Filtra prodotti venduti per il periodo selezionato
    const filteredCurrent = prodottiVenduti.filter((p) => {
      if (!p.data_vendita) return false;
      const itemDate = safeParseDate(p.data_vendita);
      if (!itemDate) return false;
      if (cutoffDate && isBefore(itemDate, cutoffDate)) return false;
      if (endFilterDate && isAfter(itemDate, endFilterDate)) return false;
      return true;
    });

    // Aggrega per flavor
    const currentTotals = {};

    filteredCurrent.forEach((record) => {
      const flavor = record.flavor;
      if (!flavor) return;
      if (!currentTotals[flavor]) {
        currentTotals[flavor] = 0;
      }
      currentTotals[flavor] += record.total_pizzas_sold || 0;
    });

    // Converti in array ordinato
    const products = Object.keys(currentTotals).map((flavor) => ({
      nome: flavor,
      quantita: currentTotals[flavor]
    }));

    if (products.length === 0) {
      return { top3: [], bottom3: [] };
    }

    const sorted = products.sort((a, b) => b.quantita - a.quantita);
    const top3 = sorted.slice(0, Math.min(3, sorted.length));
    const bottom3 = sorted.length > 3 ? sorted.slice(-3).reverse() : [];

    return { top3, bottom3 };
  }, [prodottiVenduti, dateRange, startDate, endDate]);

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
              <h1 className="bg-clip-text text-slate-50 mb-1 text-2xl font-bold lg:text-3xl from-slate-700 to-slate-900">Dashboard

              </h1>
              <p className="text-slate-50 text-sm">Monitor business performance</p>
            </div>
            {employees.length === 0 &&
            <NeumorphicButton
              onClick={() => syncEmployeesMutation.mutate()}
              disabled={syncEmployeesMutation.isPending}
              variant="primary"
              className="flex items-center gap-2">

                {syncEmployeesMutation.isPending ?
              <RefreshCw className="w-4 h-4 animate-spin" /> :

              <RefreshCw className="w-4 h-4" />
              }
                Sincronizza Dipendenti
              </NeumorphicButton>
            }
          </div>
        </div>

        {syncMessage &&
        <NeumorphicCard className={`p-4 ${syncMessage.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`text-sm ${syncMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
              {syncMessage.text}
            </p>
          </NeumorphicCard>
        }

        <NeumorphicCard className="p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              <h2 className="text-base lg:text-lg font-bold text-slate-800">Filtri Periodo</h2>
            </div>
            
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:flex-1 lg:max-w-4xl">
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  if (e.target.value !== 'custom') {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
                className="w-full lg:w-48 neumorphic-pressed px-4 py-2.5 rounded-xl text-slate-700 outline-none text-sm">
                <option value="7">Ultimi 7 giorni</option>
                <option value="30">Ultimi 30 giorni</option>
                <option value="90">Ultimi 90 giorni</option>
                <option value="365">Ultimo anno</option>
                <option value="custom">Personalizzato</option>
              </select>

              {dateRange === 'custom' &&
              <>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Inizio"
                  className="w-full lg:w-40 neumorphic-pressed px-3 py-2.5 rounded-xl text-slate-700 outline-none text-sm" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="Fine"
                  className="w-full lg:w-40 neumorphic-pressed px-3 py-2.5 rounded-xl text-slate-700 outline-none text-sm" />
              </>
              }
            </div>
          </div>
        </NeumorphicCard>

        {/* Metriche Principali */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Ricavi */}
          <NeumorphicCard className="p-4 hover:shadow-lg transition-shadow">
            <Link to={createPageUrl('Financials')} className="block">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">{formatEuro(processedData.totalRevenue)}</h3>
                    <p className="text-xs text-slate-500">Ricavi Totali</p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-green-600" />
              </div>
            </Link>
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
          <NeumorphicCard className="p-4 hover:shadow-lg transition-shadow">
            <Link to={createPageUrl('FoodCost')} className="block">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">{foodCostStats.avg.toFixed(1)}%</h3>
                    <p className="text-xs text-slate-500">Food Cost Medio</p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-orange-600" />
              </div>
            </Link>
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
          <NeumorphicCard className="p-4 hover:shadow-lg transition-shadow">
            <Link to={createPageUrl('EmployeeReviewsPerformance')} className="block">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">{employeePerformance.total}</h3>
                    <p className="text-xs text-slate-500">Dipendenti Totali</p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-purple-600" />
              </div>
            </Link>
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
          <NeumorphicCard className="p-4 hover:shadow-lg transition-shadow">
            <Link to={createPageUrl('Produttivita')} className="block">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">{formatEuro(produttivitaStats.avg)}/h</h3>
                    <p className="text-xs text-slate-500">Produttività Media</p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-blue-600" />
              </div>
            </Link>
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

        {/* Trend Revenue */}
        <NeumorphicCard className="p-4 lg:p-6">
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Trend Revenue</h2>
          {dataLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-6 bg-slate-200 rounded w-32" />
              <div className="h-64 bg-slate-200 rounded" />
            </div>
          ) : processedData.dailyRevenue.length > 0 ?
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
                    height={60} />

                    <YAxis
                    stroke="#64748b"
                    tick={{ fontSize: 12 }}
                    width={60} />

                    <Tooltip
                    contentStyle={{
                      background: 'rgba(248, 250, 252, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '12px'
                    }}
                    formatter={(value) => `€${value.toFixed(2)}`} />

                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Revenue €"
                    dot={{ fill: '#3b82f6', r: 3 }} />

                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div> :

          <div className="h-[250px] flex items-center justify-center text-slate-500">
              Nessun dato disponibile per il periodo selezionato
            </div>
          }
        </NeumorphicCard>

        {/* Top & Bottom Prodotti */}
        <NeumorphicCard className="p-4 lg:p-6">
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Prodotti più e meno venduti</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top 3 */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-green-700 mb-3 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Top 3 Prodotti
              </h3>
              <div className="space-y-2">
                {topBottomProducts.top3.length > 0 ? topBottomProducts.top3.map((prod, idx) =>
                  <div key={idx} className="p-2 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-800">{prod.nome}</p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-xs font-bold text-green-700">{prod.quantita}</p>
                        <p className="text-[10px] text-slate-500">vendite</p>
                      </div>
                    </div>
                  </div>
                ) : <p className="text-xs text-slate-400 text-center py-4">Nessun dato</p>}
              </div>
            </div>

            {/* Bottom 3 */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-red-700 mb-3 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 rotate-180" />
                Bottom 3 Prodotti
              </h3>
              <div className="space-y-2">
                {topBottomProducts.bottom3.length > 0 ? topBottomProducts.bottom3.map((prod, idx) =>
                  <div key={idx} className="p-2 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-800">{prod.nome}</p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-xs font-bold text-red-700">{prod.quantita}</p>
                        <p className="text-[10px] text-slate-500">vendite</p>
                      </div>
                    </div>
                  </div>
                ) : <p className="text-xs text-slate-400 text-center py-4">Nessun dato</p>}
              </div>
            </div>
          </div>
        </NeumorphicCard>

        {/* Metriche Operative */}
        <NeumorphicCard className="p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Metriche Operative
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Ultima Rilevazione Cassa */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <Link to={createPageUrl('StoricoCassa')} className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2 hover:text-blue-600 transition-colors">
                Ultima Rilevazione Cassa
                <ExternalLink className="w-3 h-3" />
              </Link>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cassaStats.length > 0 ? cassaStats.map((cassa, idx) =>
                <div key={idx} className={`p-2 rounded-lg ${cassa.hasAlert ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-700">{cassa.storeName}</span>
                      <div className="text-right">
                        <p className={`text-xs font-bold ${cassa.hasAlert ? 'text-red-600' : 'text-slate-600'}`}>
                          {cassa.differenza > 0 ? '+' : ''}{formatEuro(cassa.differenza)}
                        </p>
                        <p className="text-[10px] text-slate-400">{cassa.lastDate && moment(cassa.lastDate).isValid() ? moment(cassa.lastDate).format('DD/MM/YYYY') : 'N/A'}</p>
                      </div>
                    </div>
                    {cassa.hasAlert &&
                  <p className="text-[10px] text-red-600 mt-1">⚠️ Sopra soglia alert</p>
                  }
                  </div>
                ) :
                <p className="text-xs text-slate-400 text-center py-4">Nessun conteggio cassa registrato</p>
                }
              </div>
            </div>

            {/* Sprechi */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <Link to={createPageUrl('AnalisiSprechi')} className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2 hover:text-blue-600 transition-colors">
                Sprechi per Locale
                <ExternalLink className="w-3 h-3" />
              </Link>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sprechiStats.length > 0 ? sprechiStats.map((spreco, idx) =>
                <div key={idx} className="p-2 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-700">{spreco.storeName}</span>
                      <div className="text-right">
                        <span className="text-xs font-bold text-red-600">{formatEuro(spreco.totale)}</span>
                        <p className="text-[10px] text-slate-500">{spreco.count} rilevazioni</p>
                      </div>
                    </div>
                  </div>
                ) :
                <p className="text-xs text-slate-400 text-center py-4">Nessuno spreco registrato</p>
                }
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
              <Link to={createPageUrl('OrdiniAdmin')} className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2 hover:text-blue-600 transition-colors">
                <Package className="w-4 h-4 text-orange-600" />
                Ordini da Fare
                {ordiniDaFare.length > 0 &&
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{ordiniDaFare.length}</span>
                }
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {ordiniDaFare.length > 0 ? ordiniDaFare.map((ord, idx) =>
                <div key={idx} className="p-2 rounded-lg bg-orange-50 border border-orange-200">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{ord.fornitore}</p>
                        <p className="text-[10px] text-slate-600">{ord.store}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-orange-700">{formatEuro(ord.costoTotale)}</p>
                        <p className="text-[10px] text-slate-500">{ord.numeroArticoli} articoli</p>
                      </div>
                    </div>
                  </div>
                ) :
                <p className="text-xs text-slate-400 text-center py-4">Nessun ordine urgente</p>
                }
              </div>
            </div>

            {/* Richieste Ferie/Malattia */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <Link to={createPageUrl('Assenze')} className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2 hover:text-blue-600 transition-colors">
                <Calendar className="w-4 h-4 text-blue-600" />
                Richieste in Attesa
                {richiesteAssenze && ((richiesteAssenze.ferie?.length || 0) + (richiesteAssenze.malattie?.length || 0) + (richiesteAssenze.turniLiberi?.length || 0) + (richiesteAssenze.scambi?.length || 0)) > 0 &&
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                   {(richiesteAssenze.ferie?.length || 0) + (richiesteAssenze.malattie?.length || 0) + (richiesteAssenze.turniLiberi?.length || 0) + (richiesteAssenze.scambi?.length || 0)}
                 </span>
                }
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {richiesteAssenze?.ferie?.map((f) => {
                  const user = allUsers.find((u) => u.id === f.dipendente_id);
                  return (
                    <div key={f.id} className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-xs font-medium text-slate-700">{user?.nome_cognome || user?.full_name}</p>
                      <p className="text-[10px] text-blue-600">🏖️ Ferie: {f.data_inizio && moment(f.data_inizio).isValid() ? moment(f.data_inizio).format('DD/MM') : 'N/A'} - {f.data_fine && moment(f.data_fine).isValid() ? moment(f.data_fine).format('DD/MM') : 'N/A'}</p>
                    </div>);

                })}
                {richiesteAssenze?.malattie?.map((m) => {
                  const user = allUsers.find((u) => u.id === m.dipendente_id);
                  return (
                    <div key={m.id} className="p-2 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-xs font-medium text-slate-700">{user?.nome_cognome || user?.full_name}</p>
                      <p className="text-[10px] text-red-600">🤒 Malattia: {m.data_inizio && moment(m.data_inizio).isValid() ? moment(m.data_inizio).format('DD/MM') : 'N/A'} - {m.data_fine && moment(m.data_fine).isValid() ? moment(m.data_fine).format('DD/MM') : 'N/A'}</p>
                    </div>);

                })}
                {richiesteAssenze?.turniLiberi?.map((t) => {
                  const user = allUsers.find((u) => u.id === t.dipendente_id);
                  return (
                    <div key={t.id} className="p-2 rounded-lg bg-purple-50 border border-purple-200">
                      <p className="text-xs font-medium text-slate-700">{user?.nome_cognome || user?.full_name}</p>
                      <p className="text-[10px] text-purple-600">📅 Turno libero: {t.data_turno && moment(t.data_turno).isValid() ? moment(t.data_turno).format('DD/MM/YYYY') : 'N/A'}</p>
                    </div>);

                })}
                {richiesteAssenze?.scambi?.map((t) => {
                  return (
                    <div key={t.id} className="p-2 rounded-lg bg-indigo-50 border border-indigo-200">
                      <p className="text-xs font-medium text-slate-700">{t.richiesta_scambio.richiesto_da_nome} ↔ {t.richiesta_scambio.richiesto_a_nome}</p>
                      <p className="text-[10px] text-indigo-600">🔄 Scambio: {t.data && moment(t.data).isValid() ? moment(t.data).format('DD/MM/YYYY') : 'N/A'}</p>
                    </div>);

                })}
                {(!richiesteAssenze || (richiesteAssenze.ferie?.length || 0) + (richiesteAssenze.malattie?.length || 0) + (richiesteAssenze.turniLiberi?.length || 0) + (richiesteAssenze.scambi?.length || 0) === 0) &&
                <p className="text-xs text-slate-400 text-center py-4">Nessuna richiesta in attesa</p>
                }
              </div>
            </div>

            {/* Contratti in Scadenza */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <Link to={createPageUrl('Alerts')} className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2 hover:text-blue-600 transition-colors">
                <FileText className="w-4 h-4 text-purple-600" />
                Contratti in Scadenza (30gg)
                {contrattiInScadenza.length > 0 &&
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{contrattiInScadenza.length}</span>
                }
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {contrattiInScadenza.length > 0 ? contrattiInScadenza.map((c, idx) =>
                <div key={idx} className="p-2 rounded-lg bg-purple-50 border border-purple-200">
                    <p className="text-xs font-medium text-slate-700">{c.dipendente}</p>
                    <p className="text-[10px] text-purple-600">
                      Scade il {c.dataScadenza && moment(c.dataScadenza).isValid() ? moment(c.dataScadenza).format('DD/MM/YYYY') : 'N/A'} ({c.giorniRimanenti} giorni)
                    </p>
                  </div>
                ) :
                <p className="text-xs text-slate-400 text-center py-4">Nessun contratto in scadenza</p>
                }
              </div>
            </div>

            {/* Score Pulizie */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <Link to={createPageUrl('ValutazionePulizie')} className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2 hover:text-blue-600 transition-colors">
                <Sparkles className="w-4 h-4 text-cyan-600" />
                Score Pulizie per Store
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pulizieScores.length > 0 ? pulizieScores.map((ps, idx) =>
                <div key={idx} className="p-2 rounded-lg bg-cyan-50 border border-cyan-200">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-medium text-slate-700">{ps.storeName}</p>
                      <span className={`text-xs font-bold ${
                    ps.avgScore >= 80 ? 'text-green-600' :
                    ps.avgScore >= 60 ? 'text-blue-600' :
                    ps.avgScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`
                    }>{ps.avgScore.toFixed(0)}/100</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">{ps.count} controlli</p>
                  </div>
                ) :
                <p className="text-xs text-slate-400 text-center py-4">Nessun dato pulizie</p>
                }
              </div>
            </div>

            {/* Turni Liberi */}
            <div className="neumorphic-pressed p-4 rounded-xl lg:col-span-2">
              <Link to={createPageUrl('Planday')} className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2 hover:text-blue-600 transition-colors">
                <UserX className="w-4 h-4 text-red-600" />
                Turni Liberi (Prossimi 14 giorni)
                {turniLiberi.length > 0 &&
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{turniLiberi.length}</span>
                }
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {turniLiberi.length > 0 ? turniLiberi.map((t) => {
                  const store = stores.find((s) => s.id === t.store_id);
                  return (
                    <div key={t.id} className="p-2 rounded-lg bg-red-50 border border-red-200 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-medium text-slate-700">{store?.name || 'N/A'}</p>
                        <p className="text-[10px] text-slate-600">{t.data && moment(t.data).isValid() ? moment(t.data).format('DD/MM/YYYY') : 'N/A'} • {t.ora_inizio}-{t.ora_fine} • {t.ruolo}</p>
                      </div>
                      <span className="text-xs text-red-600 font-bold whitespace-nowrap ml-2">NON ASSEGNATO</span>
                    </div>);

                }) :
                <p className="text-xs text-slate-400 text-center py-4">Tutti i turni sono assegnati</p>
                }
              </div>
            </div>
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>);

}