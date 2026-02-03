import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { subDays, subMonths } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentData, filters } = await req.json();

    // Fetch historical data (last 12 months)
    const historicalData = await base44.entities.iPratico.list('-order_date', 2000);
    
    // Fetch additional context
    const stores = await base44.entities.Store.list();
    const wrongOrders = await base44.entities.WrongOrder.list('-order_date', 500);
    const reviews = await base44.entities.Review.list('-review_date', 500);
    const sprechi = await base44.entities.Spreco.list('-data', 500);

    // Calculate key metrics
    const last30Days = historicalData.filter(item => {
      const date = new Date(item.order_date);
      return date >= subDays(new Date(), 30);
    });

    const last90Days = historicalData.filter(item => {
      const date = new Date(item.order_date);
      return date >= subDays(new Date(), 90);
    });

    const last6Months = historicalData.filter(item => {
      const date = new Date(item.order_date);
      return date >= subMonths(new Date(), 6);
    });

    const last12Months = historicalData.filter(item => {
      const date = new Date(item.order_date);
      return date >= subMonths(new Date(), 12);
    });

    // Aggregate metrics
    const getLast30DaysRevenue = last30Days.reduce((sum, item) => sum + (item.total_revenue || 0), 0);
    const getLast90DaysRevenue = last90Days.reduce((sum, item) => sum + (item.total_revenue || 0), 0);
    const getLast6MonthsRevenue = last6Months.reduce((sum, item) => sum + (item.total_revenue || 0), 0);
    const getLast12MonthsRevenue = last12Months.reduce((sum, item) => sum + (item.total_revenue || 0), 0);

    const revenueByChannel = {};
    last30Days.forEach(item => {
      ['delivery', 'takeaway', 'store'].forEach(channel => {
        if (!revenueByChannel[channel]) revenueByChannel[channel] = 0;
        revenueByChannel[channel] += item[`sourceType_${channel}`] || 0;
      });
    });

    const revenueByApp = {};
    last30Days.forEach(item => {
      ['glovo', 'deliveroo', 'justeat', 'onlineordering', 'store'].forEach(app => {
        if (!revenueByApp[app]) revenueByApp[app] = 0;
        revenueByApp[app] += item[`sourceApp_${app}`] || 0;
      });
    });

    // Calculate trends
    const monthlyTrends = {};
    last12Months.forEach(item => {
      const monthKey = item.order_date.substring(0, 7);
      if (!monthlyTrends[monthKey]) {
        monthlyTrends[monthKey] = { revenue: 0, orders: 0 };
      }
      monthlyTrends[monthKey].revenue += item.total_revenue || 0;
      monthlyTrends[monthKey].orders += item.total_orders || 0;
    });

    // Wrong orders analysis
    const recentWrongOrders = wrongOrders.filter(wo => {
      const date = new Date(wo.order_date);
      return date >= subDays(new Date(), 30);
    });
    const wrongOrdersByStore = {};
    recentWrongOrders.forEach(wo => {
      const store = wo.store_name || 'Unknown';
      if (!wrongOrdersByStore[store]) wrongOrdersByStore[store] = 0;
      wrongOrdersByStore[store]++;
    });

    // Reviews analysis
    const recentReviews = reviews.filter(r => {
      const date = new Date(r.review_date);
      return date >= subDays(new Date(), 30);
    });
    const avgRating = recentReviews.length > 0 
      ? recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length 
      : 0;

    // Sprechi analysis
    const recentSprechi = sprechi.filter(s => {
      const date = new Date(s.data);
      return date >= subDays(new Date(), 30);
    });
    const totalWaste = recentSprechi.reduce((sum, s) => sum + (s.valore_economico || 0), 0);

    // Build comprehensive prompt
    const prompt = `Sei un business analyst esperto nel settore della ristorazione, specializzato in pizzerie multi-store.

**CONTESTO BUSINESS:**
L'azienda gestisce ${stores.length} locali pizzeria.

**DATI PERIODO VISUALIZZATO (${filters.dateRange || 'ultimi 30 giorni'}):**
${filters.selectedStore !== 'all' ? `Locale: ${stores.find(s => s.id === filters.selectedStore)?.name || 'Selezionato'}` : 'Tutti i locali'}
- Revenue totale: €${currentData.totalRevenue.toFixed(2)}
- Ordini totali: ${currentData.totalOrders}
- AOV (scontrino medio): €${currentData.avgOrderValue.toFixed(2)}
- % vendite in store: ${currentData.percentInStore.toFixed(1)}%

**BREAKDOWN PER CANALE (periodo visualizzato):**
${currentData.channelBreakdown.map(ch => `- ${ch.name}: €${ch.value.toFixed(2)} (${ch.orders} ordini, AOV €${(ch.value / ch.orders).toFixed(2)})`).join('\n')}

**BREAKDOWN PER APP DELIVERY (periodo visualizzato):**
${currentData.deliveryAppBreakdown.map(app => `- ${app.name}: €${app.value.toFixed(2)} (${app.orders} ordini)`).join('\n')}

**BREAKDOWN PER LOCALE (periodo visualizzato):**
${currentData.storeBreakdown.map(s => `- ${s.name}: €${s.revenue.toFixed(2)} (${s.orders} ordini, AOV €${s.avgValue.toFixed(2)})`).join('\n')}

**TREND STORICI:**
- Revenue ultimi 30 giorni: €${getLast30DaysRevenue.toFixed(2)}
- Revenue ultimi 90 giorni: €${getLast90DaysRevenue.toFixed(2)}
- Revenue ultimi 6 mesi: €${getLast6MonthsRevenue.toFixed(2)}
- Revenue ultimi 12 mesi: €${getLast12MonthsRevenue.toFixed(2)}

**ANDAMENTO MENSILE (ultimi 12 mesi):**
${Object.entries(monthlyTrends)
  .sort((a, b) => b[0].localeCompare(a[0]))
  .slice(0, 12)
  .map(([month, data]) => `- ${month}: €${data.revenue.toFixed(2)} (${data.orders} ordini, AOV €${(data.revenue / data.orders).toFixed(2)})`)
  .join('\n')}

**ORDINI SBAGLIATI (ultimi 30 giorni):**
- Totale ordini sbagliati: ${recentWrongOrders.length}
- Per locale: ${Object.entries(wrongOrdersByStore).map(([store, count]) => `${store}: ${count}`).join(', ')}
- Costo stimato rimborsi: €${recentWrongOrders.reduce((sum, wo) => sum + (wo.refund_value || 0), 0).toFixed(2)}

**RECENSIONI (ultimi 30 giorni):**
- Totale recensioni: ${recentReviews.length}
- Rating medio: ${avgRating.toFixed(2)}/5
- Distribuzione: ${[5,4,3,2,1].map(r => `${r}★: ${recentReviews.filter(rev => rev.rating === r).length}`).join(', ')}

**SPRECHI (ultimi 30 giorni):**
- Valore economico sprechi: €${totalWaste.toFixed(2)}
- Numero rilevazioni sprechi: ${recentSprechi.length}

**IL TUO COMPITO:**
Analizza questi dati come se fossi il proprietario dell'attività. Fornisci:

1. **Analisi Situazione Attuale** (3-4 punti chiave sui dati visualizzati)
2. **Pattern e Trend Identificati** (cosa emerge dai dati storici e attuali)
3. **Aree di Miglioramento** (problemi/opportunità specifiche con priorità)
4. **Raccomandazioni Azione Concreta** (5-7 azioni specifiche e actionable, ordinate per impatto/urgenza)

Sii specifico, usa i numeri, e fornisci raccomandazioni pratiche e immediatamente applicabili per un ristoratore.
Concentrati su: ottimizzazione revenue, riduzione sprechi, miglioramento efficienza operativa, customer satisfaction.`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });

    return Response.json({ 
      success: true, 
      analysis,
      dataContext: {
        stores: stores.length,
        totalReviews: recentReviews.length,
        avgRating,
        totalWrongOrders: recentWrongOrders.length,
        totalWaste
      }
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});