
import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Calendar, DollarSign, ShoppingCart, Star, TrendingUp, Users, AlertCircle, Clock, Sparkles, Loader2 } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { parseISO, isWithinInterval, differenceInDays, subDays, format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function SummaryAI() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [aiSummary, setAiSummary] = useState(null);
  const [generatingAI, setGeneratingAI] = useState(false);

  const { data: orderItems = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orderItems'],
    queryFn: () => base44.entities.OrderItem.list('-modifiedDate', 50000), // Changed from 100000 to 50000
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

  // Helper to deduplicate shifts
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

  // Calculate metrics for a specific period
  const calculatePeriodMetrics = (start, end) => {
    // Filter orders
    const periodOrders = orderItems.filter(item => {
      if (!item.modifiedDate) return false;
      const itemDate = parseISO(item.modifiedDate);
      return isWithinInterval(itemDate, { start, end });
    });

    const totalRevenue = periodOrders.reduce((sum, item) => 
      sum + (item.finalPriceWithSessionDiscountsAndSurcharges || 0), 0
    );

    const uniqueOrders = [...new Set(periodOrders.map(item => item.order).filter(Boolean))];
    const totalOrders = uniqueOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Revenue by channel
    const revenueByChannel = {};
    periodOrders.forEach(item => {
      let channelName;
      if (item.sourceApp && item.sourceApp.toLowerCase() === 'tabesto') {
        channelName = 'Tabesto';
      } else {
        channelName = item.saleTypeName || 'Unknown';
      }
      if (!revenueByChannel[channelName]) {
        revenueByChannel[channelName] = 0;
      }
      revenueByChannel[channelName] += item.finalPriceWithSessionDiscountsAndSurcharges || 0;
    });

    const channelPercentages = Object.entries(revenueByChannel).map(([name, revenue]) => ({
      name,
      revenue,
      percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
    })).sort((a, b) => b.revenue - a.revenue);

    // Filter reviews
    const periodReviews = reviews.filter(review => {
      if (!review.review_date) return false;
      const reviewDate = parseISO(review.review_date);
      return isWithinInterval(reviewDate, { start, end });
    });

    // Filter shifts
    let periodShifts = shifts.filter(shift => {
      if (!shift.shift_date) return false;
      const shiftDate = parseISO(shift.shift_date);
      return isWithinInterval(shiftDate, { start, end });
    });
    periodShifts = deduplicateShifts(periodShifts);

    // Filter cleaning inspections
    const periodInspections = cleaningInspections.filter(inspection => {
      if (!inspection.inspection_date) return false;
      const inspectionDate = parseISO(inspection.inspection_date);
      return isWithinInterval(inspectionDate, { start, end });
    });

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      channelPercentages,
      totalReviews: periodReviews.length,
      avgRating: periodReviews.length > 0 
        ? periodReviews.reduce((sum, r) => sum + r.rating, 0) / periodReviews.length 
        : 0,
      shifts: periodShifts,
      inspections: periodInspections.filter(i => i.analysis_status === 'completed')
    };
  };

  // Main period metrics
  const currentMetrics = useMemo(() => {
    if (!startDate || !endDate) return null;
    
    const start = parseISO(startDate + 'T00:00:00');
    const end = parseISO(endDate + 'T23:59:59');
    
    return calculatePeriodMetrics(start, end);
  }, [startDate, endDate, orderItems, reviews, shifts, cleaningInspections]);

  // Previous period metrics (for comparison)
  const previousMetrics = useMemo(() => {
    if (!startDate || !endDate) return null;
    
    const start = parseISO(startDate + 'T00:00:00');
    const end = parseISO(endDate + 'T23:59:59');
    const daysDiff = differenceInDays(end, start) + 1;
    
    const prevEnd = subDays(start, 1);
    const prevStart = subDays(prevEnd, daysDiff - 1);
    
    return calculatePeriodMetrics(prevStart, prevEnd);
  }, [startDate, endDate, orderItems, reviews, shifts, cleaningInspections]);

  // Employee alerts
  const employeeAlerts = useMemo(() => {
    if (!currentMetrics) return [];
    
    const alerts = [];
    
    currentMetrics.shifts.forEach(shift => {
      // Ritardi
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
      
      // Timbrature mancate
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
    
    return alerts.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [currentMetrics]);

  // Cleaning alerts
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
    
    return alerts.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [currentMetrics]);

  // Generate AI Summary
  const generateAISummary = async () => {
    if (!currentMetrics || !previousMetrics) return;
    
    setGeneratingAI(true);
    
    try {
      const prompt = `Sei un analista di business per una catena di pizzerie. Analizza questi dati e fornisci un summary professionale e dettagliato in italiano.

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
2. Commenta l'andamento dei canali di vendita
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
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 1) return null;
    return change > 0 ? '📈' : '📉';
  };

  const getTrendColor = (current, previous, inverse = false) => {
    if (!previous || previous === 0) return 'text-[#6b6b6b]';
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 1) return 'text-[#6b6b6b]';
    
    const isPositive = change > 0;
    if (inverse) {
      return isPositive ? 'text-red-600' : 'text-green-600';
    }
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  const getTrendValue = (current, previous) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return change.toFixed(1);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Summary AI</h1>
        </div>
        <p className="text-[#9b9b9b]">Analisi intelligente delle performance con comparazioni temporali</p>
      </div>

      {/* Date Filter */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-lg font-bold text-[#6b6b6b]">Seleziona Periodo</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="flex items-end">
            <button
              onClick={generateAISummary}
              disabled={!startDate || !endDate || generatingAI}
              className={`w-full neumorphic-flat px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                startDate && endDate && !generatingAI
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
          {/* KPI Cards */}
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

          {/* Revenue by Channel */}
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">% Revenue per Canale di Vendita</h2 >
            <div className="space-y-3">
              {currentMetrics.channelPercentages.map((channel, index) => (
                <div key={index} className="neumorphic-pressed p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-[#6b6b6b]">{channel.name}</span>
                    <span className="font-bold text-[#8b7355]">{channel.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="flex-1 h-3 bg-white rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#8b7355] to-[#c1a07f] rounded-full transition-all"
                      style={{ width: `${channel.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-[#6b6b6b] font-medium">
                    €{channel.revenue.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </NeumorphicCard>

          {/* Employee Alerts Table */}
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
                          {format(parseISO(alert.date), 'dd/MM/yyyy', { locale: it })}
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

          {/* Cleaning Alerts Table */}
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
                          {format(parseISO(alert.date), 'dd/MM/yyyy HH:mm', { locale: it })}
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

          {/* AI Summary */}
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

      {/* Empty State */}
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
