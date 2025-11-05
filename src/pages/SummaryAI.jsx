import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Calendar, DollarSign, ShoppingCart, Star, TrendingUp, Users, AlertCircle, Clock, Sparkles, Loader2, Store, Truck } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { parseISO, isWithinInterval, differenceInDays, subDays, format, isValid } from 'date-fns';
import { it } from 'date-fns/locale';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

export default function SummaryAI() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStore, setSelectedStore] = useState('all');
  const [aiSummary, setAiSummary] = useState(null);
  const [generatingAI, setGeneratingAI] = useState(false);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: iPraticoData = [], isLoading: dataLoading } = useQuery({
    queryKey: ['iPratico'],
    queryFn: () => base44.entities.iPratico.list('-order_date', 1000),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => base44.entities.Review.list('-review_date'),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-shift_date'),
  });

  const { data: cleaningInspections = [] } = useQuery({
    queryKey: ['cleaningInspections'],
    queryFn: () => base44.entities.CleaningInspection.list('-inspection_date'),
  });

  const deduplicateShifts = (shiftsArray) => {
    const uniqueShiftsMap = new Map();
    shiftsArray.forEach(shift => {
      const normalizedDate = shift.shift_date ? new Date(shift.shift_date).toISOString().split('T')[0] : 'no-date';
      const normalizedStart = shift.scheduled_start
        ? new Date(shift.scheduled_start).toISOString().substring(11, 16)
        : 'no-start';
      const normalizedEnd = shift.scheduled_end
        ? new Date(shift.scheduled_end).toISOString().substring(11, 16)
        : 'no-end';
      const key = `${shift.employee_name}|${shift.store_id || 'no-store'}|${normalizedDate}|${normalizedStart}|${normalizedEnd}`;
      
      if (!uniqueShiftsMap.has(key)) {
        uniqueShiftsMap.set(key, shift);
      } else {
        const existing = uniqueShiftsMap.get(key);
        if (shift.created_date && existing.created_date &&
            new Date(shift.created_date) < new Date(existing.created_date)) {
          uniqueShiftsMap.set(key, shift);
        }
      }
    });
    return Array.from(uniqueShiftsMap.values());
  };

  const calculatePeriodMetrics = (start, end, storeFilter = 'all') => {
    if (!isValid(start) || !isValid(end)) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        channelPercentages: [],
        deliveryAppBreakdown: [],
        totalReviews: 0,
        avgRating: 0,
        shifts: [],
        inspections: []
      };
    }

    const periodData = iPraticoData.filter(item => {
      if (!item.order_date) return false;
      if (storeFilter !== 'all' && item.store_id !== storeFilter) return false;
      
      try {
        const itemDate = parseISO(item.order_date);
        if (!isValid(itemDate)) return false;
        return isWithinInterval(itemDate, { start, end });
      } catch (e) {
        return false;
      }
    });

    const totalRevenue = periodData.reduce((sum, item) => 
      sum + (item.total_revenue || 0), 0
    );

    const totalOrders = periodData.reduce((sum, item) => 
      sum + (item.total_orders || 0), 0
    );

    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const revenueByChannel = {};
    periodData.forEach(item => {
      if (item.sourceType_delivery > 0) {
        revenueByChannel['Delivery'] = (revenueByChannel['Delivery'] || 0) + item.sourceType_delivery;
      }
      if (item.sourceType_takeaway > 0) {
        revenueByChannel['Takeaway'] = (revenueByChannel['Takeaway'] || 0) + item.sourceType_takeaway;
      }
      if (item.sourceType_store > 0) {
        revenueByChannel['Store'] = (revenueByChannel['Store'] || 0) + item.sourceType_store;
      }
    });

    const channelPercentages = Object.entries(revenueByChannel).map(([name, revenue]) => ({
      name,
      revenue,
      percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
    })).sort((a, b) => b.revenue - a.revenue);

    const revenueByApp = {};
    periodData.forEach(item => {
      const apps = [
        { key: 'Glovo', revenue: item.sourceApp_glovo || 0, orders: item.sourceApp_glovo_orders || 0 },
        { key: 'Deliveroo', revenue: item.sourceApp_deliveroo || 0, orders: item.sourceApp_deliveroo_orders || 0 },
        { key: 'JustEat', revenue: item.sourceApp_justeat || 0, orders: item.sourceApp_justeat_orders || 0 },
        { key: 'Tabesto', revenue: item.sourceApp_tabesto || 0, orders: item.sourceApp_tabesto_orders || 0 },
        { key: 'Store', revenue: item.sourceApp_store || 0, orders: item.sourceApp_store_orders || 0 }
      ];
      
      apps.forEach(app => {
        if (app.revenue > 0) {
          if (!revenueByApp[app.key]) {
            revenueByApp[app.key] = { name: app.key, value: 0, orders: 0 };
          }
          revenueByApp[app.key].value += app.revenue;
          revenueByApp[app.key].orders += app.orders;
        }
      });
    });

    const deliveryAppBreakdown = Object.values(revenueByApp)
      .sort((a, b) => b.value - a.value)
      .map(a => ({
        name: a.name,
        value: parseFloat(a.value.toFixed(2)),
        orders: a.orders,
        percentage: totalRevenue > 0 ? (a.value / totalRevenue) * 100 : 0
      }));

    const periodReviews = reviews.filter(review => {
      if (!review.review_date) return false;
      if (storeFilter !== 'all' && review.store_id !== storeFilter) return false;
      
      try {
        const reviewDate = parseISO(review.review_date);
        if (!isValid(reviewDate)) return false;
        return isWithinInterval(reviewDate, { start, end });
      } catch (e) {
        return false;
      }
    });

    let periodShifts = shifts.filter(shift => {
      if (!shift.shift_date) return false;
      if (storeFilter !== 'all' && shift.store_id !== storeFilter) return false;
      
      try {
        const shiftDate = parseISO(shift.shift_date);
        if (!isValid(shiftDate)) return false;
        return isWithinInterval(shiftDate, { start, end });
      } catch (e) {
        return false;
      }
    });
    periodShifts = deduplicateShifts(periodShifts);

    const periodInspections = cleaningInspections.filter(inspection => {
      if (!inspection.inspection_date) return false;
      if (storeFilter !== 'all' && inspection.store_id !== storeFilter) return false;
      
      try {
        const inspectionDate = parseISO(inspection.inspection_date);
        if (!isValid(inspectionDate)) return false;
        return isWithinInterval(inspectionDate, { start, end });
      } catch (e) {
        return false;
      }
    });

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      channelPercentages,
      deliveryAppBreakdown,
      totalReviews: periodReviews.length,
      avgRating: periodReviews.length > 0 
        ? periodReviews.reduce((sum, r) => sum + r.rating, 0) / periodReviews.length 
        : 0,
      shifts: periodShifts,
      inspections: periodInspections.filter(i => i.analysis_status === 'completed')
    };
  };

  const currentMetrics = useMemo(() => {
    if (!startDate || !endDate) return null;
    
    try {
      const start = parseISO(startDate + 'T00:00:00');
      const end = parseISO(endDate + 'T23:59:59');
      
      if (!isValid(start) || !isValid(end)) return null;
      
      return calculatePeriodMetrics(start, end, selectedStore);
    } catch (e) {
      return null;
    }
  }, [startDate, endDate, selectedStore, iPraticoData, reviews, shifts, cleaningInspections]);

  const previousMetrics = useMemo(() => {
    if (!startDate || !endDate) return null;
    
    try {
      const start = parseISO(startDate + 'T00:00:00');
      const end = parseISO(endDate + 'T23:59:59');
      
      if (!isValid(start) || !isValid(end)) return null;
      
      const daysDiff = differenceInDays(end, start) + 1;
      
      const prevEnd = subDays(start, 1);
      const prevStart = subDays(prevEnd, daysDiff - 1);
      
      return calculatePeriodMetrics(prevStart, prevEnd, selectedStore);
    } catch (e) {
      return null;
    }
  }, [startDate, endDate, selectedStore, iPraticoData, reviews, shifts, cleaningInspections]);

  const employeeAlerts = useMemo(() => {
    if (!currentMetrics) return [];
    
    const alerts = [];
    
    currentMetrics.shifts.forEach(shift => {
      if (shift.ritardo === true && shift.minuti_di_ritardo > 0) {
        alerts.push({
          type: 'late',
          employee: shift.employee_name,
          store: shift.store_name,
          date: shift.shift_date,
          details: `Ritardo di ${shift.minuti_di_ritardo} minuti`,
          scheduledStart: shift.scheduled_start,
          actualStart: shift.actual_start,
          severity: shift.minuti_di_ritardo > 15 ? 'high' : shift.minuti_di_ritardo > 5 ? 'medium' : 'low'
        });
      }
      
      if (shift.timbratura_mancata === true) {
        alerts.push({
          type: 'missing',
          employee: shift.employee_name,
          store: shift.store_name,
          date: shift.shift_date,
          details: 'Timbratura mancata',
          scheduledStart: shift.scheduled_start,
          scheduledEnd: shift.scheduled_end,
          severity: 'high'
        });
      }
    });
    
    return alerts.sort((a, b) => {
      const dateA = a.date ? parseISO(a.date) : new Date(0);
      const dateB = b.date ? parseISO(b.date) : new Date(0);
      return (isValid(dateB) ? dateB.getTime() : 0) - (isValid(dateA) ? dateA.getTime() : 0);
    });
  }, [currentMetrics]);

  const cleaningAlerts = useMemo(() => {
    if (!currentMetrics) return [];
    
    const alerts = [];
    const equipment = ['forno', 'impastatrice', 'tavolo_lavoro', 'frigo', 'cassa', 'lavandino'];
    const equipmentNames = {
      forno: 'Forno',
      impastatrice: 'Impastatrice',
      tavolo_lavoro: 'Tavolo Lavoro',
      frigo: 'Frigo',
      cassa: 'Cassa',
      lavandino: 'Lavandino'
    };
    
    currentMetrics.inspections.forEach(inspection => {
      equipment.forEach(eq => {
        const status = inspection[`${eq}_corrected`] 
          ? inspection[`${eq}_corrected_status`]
          : inspection[`${eq}_pulizia_status`];
        
        if (status === 'sporco' || status === 'medio') {
          alerts.push({
            equipment: equipmentNames[eq],
            equipmentKey: eq,
            store: inspection.store_name,
            date: inspection.inspection_date,
            status,
            notes: inspection[`${eq}_note_ai`] || '',
            photoUrl: inspection[`${eq}_foto_url`],
            overallScore: inspection.overall_score,
            severity: status === 'sporco' ? 'high' : 'medium'
          });
        }
      });
    });
    
    return alerts.sort((a, b) => {
      const dateA = a.date ? parseISO(a.date) : new Date(0);
      const dateB = b.date ? parseISO(b.date) : new Date(0);
      return (isValid(dateB) ? dateB.getTime() : 0) - (isValid(dateA) ? dateA.getTime() : 0);
    });
  }, [currentMetrics]);

  const generateAISummary = async () => {
    if (!currentMetrics || !previousMetrics) return;
    
    setGeneratingAI(true);
    
    try {
      const storeInfo = selectedStore !== 'all' 
        ? `Locale: ${stores.find(s => s.id === selectedStore)?.name || 'N/A'}`
        : 'Tutti i locali';

      const prompt = `Sei un analista di business per una catena di pizzerie. Analizza questi dati e fornisci un summary professionale e dettagliato in italiano.

**${storeInfo}**

**PERIODO CORRENTE: ${startDate} - ${endDate}**
- Revenue: €${currentMetrics.totalRevenue.toFixed(2)}
- Ordini: ${currentMetrics.totalOrders}
- Scontrino Medio: €${currentMetrics.avgOrderValue.toFixed(2)}
- Recensioni: ${currentMetrics.totalReviews} (Rating medio: ${currentMetrics.avgRating.toFixed(2)}/5)

**PERIODO PRECEDENTE (stesso numero giorni):**
- Revenue: €${previousMetrics.totalRevenue.toFixed(2)}
- Ordini: ${previousMetrics.totalOrders}
- Scontrino Medio: €${previousMetrics.avgOrderValue.toFixed(2)}
- Recensioni: ${previousMetrics.totalReviews} (Rating medio: ${previousMetrics.avgRating.toFixed(2)}/5)

**CANALI DI VENDITA (Periodo Corrente):**
${currentMetrics.channelPercentages.map(ch => `- ${ch.name}: €${ch.revenue.toFixed(2)} (${ch.percentage.toFixed(1)}%)`).join('\n')}

**APP DELIVERY (Periodo Corrente):**
${currentMetrics.deliveryAppBreakdown.map(app => `- ${app.name}: €${app.value.toFixed(2)} (${app.percentage.toFixed(1)}%) - ${app.orders} ordini`).join('\n')}

**ALERT DIPENDENTI:**
- Ritardi totali: ${employeeAlerts.filter(a => a.type === 'late').length}
- Timbrature mancate: ${employeeAlerts.filter(a => a.type === 'missing').length}
Top 3 dipendenti con più problemi:
${(() => {
  const employeeProblems = {};
  employeeAlerts.forEach(alert => {
    if (!employeeProblems[alert.employee]) {
      employeeProblems[alert.employee] = { late: 0, missing: 0 };
    }
    if (alert.type === 'late') employeeProblems[alert.employee].late++;
    if (alert.type === 'missing') employeeProblems[alert.employee].missing++;
  });
  return Object.entries(employeeProblems)
    .sort((a, b) => (b[1].late + b[1].missing) - (a[1].late + a[1].missing))
    .slice(0, 3)
    .map(([name, problems]) => `  - ${name}: ${problems.late} ritardi, ${problems.missing} timbrature mancate`)
    .join('\n');
})()}

**ALERT PULIZIE:**
- Attrezzature sporche: ${cleaningAlerts.filter(a => a.status === 'sporco').length}
- Attrezzature medie: ${cleaningAlerts.filter(a => a.status === 'medio').length}
${cleaningAlerts.length > 0 ? `Problemi principali:\n${cleaningAlerts.slice(0, 5).map(a => `  - ${a.store}: ${a.equipment} (${a.status})`).join('\n')}` : 'Nessun problema rilevato'}

**ISTRUZIONI:**
1. Inizia con un'analisi delle performance finanziarie (revenue, ordini, scontrino medio) con variazioni % rispetto al periodo precedente
2. Commenta l'andamento dei canali di vendita e delle app delivery
3. Analizza le recensioni e il rating
4. Analizza gli alert dipendenti (se gravi, suggerisci azioni)
5. Analizza gli alert pulizie (se gravi, suggerisci azioni)
6. Concludi con 3 raccomandazioni prioritarie

Usa emojis per rendere il testo più leggibile. Sii specifico e actionable.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setAiSummary(response);
    } catch (error) {
      console.error('Error generating AI summary:', error);
      setAiSummary('Errore nella generazione del summary AI. Riprova.');
    }
    
    setGeneratingAI(false);
  };

  const getTrendIcon = (current, previous) => {
    if (previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 1) return null;
    return change > 0 ? '📈' : '📉';
  };

  const getTrendColor = (current, previous, inverse = false) => {
    if (previous === 0) return 'text-[#6b6b6b]';
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 1) return 'text-[#6b6b6b]';
    
    const isPositive = change > 0;
    if (inverse) {
      return isPositive ? 'text-red-600' : 'text-green-600';
    }
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  const getTrendValue = (current, previous) => {
    if (previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return change.toFixed(1);
  };

  const COLORS = ['#8b7355', '#a68a6a', '#c1a07f', '#dcb794', '#6b5d51'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Summary AI</h1>
        </div>
        <p className="text-[#9b9b9b]">Analisi intelligente delle performance con comparazioni temporali</p>
      </div>

      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-lg font-bold text-[#6b6b6b]">Seleziona Periodo e Locale</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-[#9b9b9b] mb-2 block">Data Inizio</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-[#9b9b9b] mb-2 block">Data Fine</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-[#9b9b9b] mb-2 block flex items-center gap-2">
              <Store className="w-4 h-4" />
              Locale
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            >
              <option value="all">Tutti i Locali</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={generateAISummary}
              disabled={!startDate || !endDate || generatingAI || dataLoading}
              className={`w-full neumorphic-flat px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                startDate && endDate && !generatingAI && !dataLoading
                  ? 'text-[#8b7355] hover:shadow-lg'
                  : 'text-[#9b9b9b] opacity-50 cursor-not-allowed'
              }`}
            >
              {generatingAI ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generazione...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Genera Summary AI
                </>
              )}
            </button>
          </div>
        </div>
      </NeumorphicCard>

      {currentMetrics && previousMetrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <NeumorphicCard className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="neumorphic-flat p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-[#8b7355]" />
                </div>
                {getTrendIcon(currentMetrics.totalRevenue, previousMetrics.totalRevenue) && (
                  <span className="text-2xl">
                    {getTrendIcon(currentMetrics.totalRevenue, previousMetrics.totalRevenue)}
                  </span>
                )}
              </div>
              <p className="text-sm text-[#9b9b9b] mb-2">Total Revenue</p>
              <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">
                €{currentMetrics.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </h3>
              {getTrendValue(currentMetrics.totalRevenue, previousMetrics.totalRevenue) && (
                <p className={`text-sm font-medium ${getTrendColor(currentMetrics.totalRevenue, previousMetrics.totalRevenue)}`}>
                  {getTrendValue(currentMetrics.totalRevenue, previousMetrics.totalRevenue) > 0 ? '+' : ''}
                  {getTrendValue(currentMetrics.totalRevenue, previousMetrics.totalRevenue)}% vs periodo precedente
                </p>
              )}
            </NeumorphicCard>

            <NeumorphicCard className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="neumorphic-flat p-3 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-[#8b7355]" />
                </div>
                {getTrendIcon(currentMetrics.avgOrderValue, previousMetrics.avgOrderValue) && (
                  <span className="text-2xl">
                    {getTrendIcon(currentMetrics.avgOrderValue, previousMetrics.avgOrderValue)}
                  </span>
                )}
              </div>
              <p className="text-sm text-[#9b9b9b] mb-2">Scontrino Medio</p>
              <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">
                €{currentMetrics.avgOrderValue.toFixed(2)}
              </h3>
              {getTrendValue(currentMetrics.avgOrderValue, previousMetrics.avgOrderValue) && (
                <p className={`text-sm font-medium ${getTrendColor(currentMetrics.avgOrderValue, previousMetrics.avgOrderValue)}`}>
                  {getTrendValue(currentMetrics.avgOrderValue, previousMetrics.avgOrderValue) > 0 ? '+' : ''}
                  {getTrendValue(currentMetrics.avgOrderValue, previousMetrics.avgOrderValue)}% vs periodo precedente
                </p>
              )}
            </NeumorphicCard>

            <NeumorphicCard className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="neumorphic-flat p-3 rounded-lg">
                  <Star className="w-6 h-6 text-yellow-500" />
                </div>
                {getTrendIcon(currentMetrics.totalReviews, previousMetrics.totalReviews) && (
                  <span className="text-2xl">
                    {getTrendIcon(currentMetrics.totalReviews, previousMetrics.totalReviews)}
                  </span>
                )}
              </div>
              <p className="text-sm text-[#9b9b9b] mb-2">Recensioni</p>
              <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">
                {currentMetrics.totalReviews}
              </h3>
              <p className="text-sm text-[#9b9b9b]">
                Rating medio: {currentMetrics.avgRating.toFixed(2)}/5
              </p>
            </NeumorphicCard>

            <NeumorphicCard className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="neumorphic-flat p-3 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <p className="text-sm text-[#9b9b9b] mb-2">Alert Totali</p>
              <h3 className="text-3xl font-bold text-red-600 mb-1">
                {employeeAlerts.length + cleaningAlerts.length}
              </h3>
              <p className="text-sm text-[#9b9b9b]">
                {employeeAlerts.length} dipendenti, {cleaningAlerts.length} pulizie
              </p>
            </NeumorphicCard>
          </div>

          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">% Revenue per Canale di Vendita</h2>
            <div className="space-y-3">
              {currentMetrics.channelPercentages.map((channel, index) => {
                const prevChannel = previousMetrics.channelPercentages.find(ch => ch.name === channel.name);
                const prevRevenue = prevChannel ? prevChannel.revenue : 0;
                const revenueDiff = prevRevenue > 0 ? ((channel.revenue - prevRevenue) / prevRevenue) * 100 : 0;
                
                return (
                  <div key={index} className="neumorphic-pressed p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-[#6b6b6b]">{channel.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#8b7355]">{channel.percentage.toFixed(1)}%</span>
                        {prevRevenue > 0 && Math.abs(revenueDiff) >= 1 && (
                          <span className={`text-sm font-medium ${
                            revenueDiff > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {revenueDiff > 0 ? '+' : ''}{revenueDiff.toFixed(1)}%
                            {revenueDiff > 0 ? ' 📈' : ' 📉'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 h-3 bg-white rounded-full overflow-hidden mb-2">
                      <div 
                        className="h-full bg-gradient-to-r from-[#8b7355] to-[#c1a07f] rounded-full transition-all"
                        style={{ width: `${channel.percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#6b6b6b] font-medium">
                        €{channel.revenue.toFixed(2)}
                      </span>
                      {prevRevenue > 0 && (
                        <span className="text-xs text-[#9b9b9b]">
                          vs €{prevRevenue.toFixed(2)} periodo prec.
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Truck className="w-6 h-6 text-[#8b7355]" />
              <h2 className="text-xl font-bold text-[#6b6b6b]">Revenue per App Delivery</h2>
            </div>
            
            {currentMetrics.deliveryAppBreakdown.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={currentMetrics.deliveryAppBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage.toFixed(0)}%`}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {currentMetrics.deliveryAppBreakdown.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ 
                          background: '#e0e5ec', 
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '4px 4px 8px #b8bec8, -4px -4px 8px #ffffff'
                        }}
                        formatter={(value) => `€${value.toFixed(2)}`}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-[#8b7355]">
                        <th className="text-left p-2 text-[#9b9b9b] font-medium">App</th>
                        <th className="text-right p-2 text-[#9b9b9b] font-medium">Revenue</th>
                        <th className="text-right p-2 text-[#9b9b9b] font-medium">Ordini</th>
                        <th className="text-right p-2 text-[#9b9b9b] font-medium">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentMetrics.deliveryAppBreakdown.map((app, index) => {
                        const prevApp = previousMetrics.deliveryAppBreakdown.find(a => a.name === app.name);
                        const prevRevenue = prevApp ? prevApp.value : 0;
                        const revenueDiff = prevRevenue > 0 ? ((app.value - prevRevenue) / prevRevenue) * 100 : 0;
                        
                        return (
                          <tr key={index} className="border-b border-[#d1d1d1]">
                            <td className="p-2 text-[#6b6b6b] font-medium">{app.name}</td>
                            <td className="p-2 text-right text-[#6b6b6b] font-bold">
                              €{app.value.toFixed(2)}
                            </td>
                            <td className="p-2 text-right text-[#6b6b6b]">
                              {app.orders}
                            </td>
                            <td className="p-2 text-right">
                              {prevRevenue > 0 && Math.abs(revenueDiff) >= 1 ? (
                                <span className={`text-xs font-medium ${
                                  revenueDiff > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {revenueDiff > 0 ? '+' : ''}{revenueDiff.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-xs text-[#9b9b9b]">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[#8b7355] font-bold">
                        <td className="p-2 text-[#6b6b6b]">TOTALE</td>
                        <td className="p-2 text-right text-[#6b6b6b]">
                          €{currentMetrics.deliveryAppBreakdown.reduce((sum, app) => sum + app.value, 0).toFixed(2)}
                        </td>
                        <td className="p-2 text-right text-[#6b6b6b]">
                          {currentMetrics.deliveryAppBreakdown.reduce((sum, app) => sum + app.orders, 0)}
                        </td>
                        <td className="p-2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Truck className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
                <p className="text-[#9b9b9b]">Nessun ordine da app delivery nel periodo selezionato</p>
              </div>
            )}
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6 text-[#8b7355]" />
              <h2 className="text-xl font-bold text-[#6b6b6b]">Alert Dipendenti</h2>
              <span className="neumorphic-pressed px-3 py-1 rounded-full text-sm font-bold text-red-600">
                {employeeAlerts.length}
              </span>
            </div>

            {employeeAlerts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-[#8b7355]">
                      <th className="text-left p-3 text-[#9b9b9b] font-medium">Tipo</th>
                      <th className="text-left p-3 text-[#9b9b9b] font-medium">Dipendente</th>
                      <th className="text-left p-3 text-[#9b9b9b] font-medium">Locale</th>
                      <th className="text-left p-3 text-[#9b9b9b] font-medium">Data</th>
                      <th className="text-left p-3 text-[#9b9b9b] font-medium">Dettagli</th>
                      <th className="text-center p-3 text-[#9b9b9b] font-medium">Gravità</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeAlerts.map((alert, index) => (
                      <tr key={index} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {alert.type === 'late' ? (
                              <>
                                <Clock className="w-4 h-4 text-orange-600" />
                                <span className="text-[#6b6b6b] font-medium">Ritardo</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-4 h-4 text-red-600" />
                                <span className="text-[#6b6b6b] font-medium">Timbro Mancato</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-[#6b6b6b] font-medium">{alert.employee}</td>
                        <td className="p-3 text-[#6b6b6b]">{alert.store}</td>
                        <td className="p-3 text-[#6b6b6b]">
                          {alert.date && isValid(parseISO(alert.date)) ? format(parseISO(alert.date), 'dd/MM/yyyy', { locale: it }) : 'N/A'}
                        </td>
                        <td className="p-3 text-[#6b6b6b] text-sm">{alert.details}</td>
                        <td className="p-3">
                          <div className="flex justify-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              alert.severity === 'high' ? 'bg-red-100 text-red-700' :
                              alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {alert.severity === 'high' ? 'ALTA' : alert.severity === 'medium' ? 'MEDIA' : 'BASSA'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-green-600 mx-auto mb-4 opacity-50" />
                <p className="text-green-600 font-medium">Nessun alert dipendenti! 🎉</p>
              </div>
            )}
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-6 h-6 text-[#8b7355]" />
              <h2 className="text-xl font-bold text-[#6b6b6b]">Alert Pulizie</h2>
              <span className="neumorphic-pressed px-3 py-1 rounded-full text-sm font-bold text-red-600">
                {cleaningAlerts.length}
              </span>
            </div>

            {cleaningAlerts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-[#8b7355]">
                      <th className="text-left p-3 text-[#9b9b9b] font-medium">Attrezzatura</th>
                      <th className="text-left p-3 text-[#9b9b9b] font-medium">Locale</th>
                      <th className="text-left p-3 text-[#9b9b9b] font-medium">Data</th>
                      <th className="text-center p-3 text-[#9b9b9b] font-medium">Stato</th>
                      <th className="text-left p-3 text-[#9b9b9b] font-medium">Note AI</th>
                      <th className="text-center p-3 text-[#9b9b9b] font-medium">Gravità</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cleaningAlerts.map((alert, index) => (
                      <tr key={index} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                        <td className="p-3 text-[#6b6b6b] font-medium">{alert.equipment}</td>
                        <td className="p-3 text-[#6b6b6b]">{alert.store}</td>
                        <td className="p-3 text-[#6b6b6b]">
                          {alert.date && isValid(parseISO(alert.date)) ? format(parseISO(alert.date), 'dd/MM/yyyy HH:mm', { locale: it }) : 'N/A'}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              alert.status === 'sporco' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {alert.status.toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-[#6b6b6b] text-sm max-w-md">
                          {alert.notes.substring(0, 100)}{alert.notes.length > 100 ? '...' : ''}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              alert.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {alert.severity === 'high' ? 'ALTA' : 'MEDIA'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Sparkles className="w-16 h-16 text-green-600 mx-auto mb-4 opacity-50" />
                <p className="text-green-600 font-medium">Nessun alert pulizie! 🎉</p>
              </div>
            )}
          </NeumorphicCard>

          {aiSummary && (
            <NeumorphicCard className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-[#8b7355]">
              <div className="flex items-center gap-3 mb-6">
                <div className="neumorphic-flat p-3 rounded-full bg-white">
                  <Sparkles className="w-6 h-6 text-[#8b7355]" />
                </div>
                <h2 className="text-2xl font-bold text-[#6b6b6b]">AI Summary</h2>
              </div>
              
              <div className="neumorphic-pressed p-6 rounded-xl bg-white">
                <div className="prose prose-sm max-w-none">
                  <div className="text-[#6b6b6b] whitespace-pre-wrap leading-relaxed">
                    {aiSummary}
                  </div>
                </div>
              </div>
            </NeumorphicCard>
          )}
        </>
      )}

      {!startDate || !endDate ? (
        <NeumorphicCard className="p-12 text-center">
          <Calendar className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">Seleziona un Periodo</h3>
          <p className="text-[#9b9b9b]">
            Seleziona le date di inizio e fine per visualizzare le metriche e generare il summary AI
          </p>
        </NeumorphicCard>
      ) : null}
    </div>
  );
}