import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { subDays } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all active targets
    const targets = await base44.asServiceRole.entities.Target.list();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get iPratico data for calculations
    const iPraticoData = await base44.asServiceRole.entities.iPratico.list('-order_date', 1000);
    
    // Get finance config for mappings
    const financeConfigs = await base44.asServiceRole.entities.FinanceConfig.list();
    const activeConfig = financeConfigs.find(c => c.is_active);
    const channelMapping = activeConfig?.channel_mapping || {};
    const appMapping = activeConfig?.app_mapping || {};
    
    let updatedCount = 0;
    
    for (const target of targets) {
      let periodStart, periodEnd;
      
      if (target.date_mode === 'rolling') {
        periodEnd = new Date(today);
        periodEnd.setDate(today.getDate() + 29);
        periodStart = today;
      } else {
        if (!target.start_date || !target.end_date) continue;
        periodStart = new Date(target.start_date);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(target.end_date);
        periodEnd.setHours(0, 0, 0, 0);
      }
      
      // Calculate historical data and predictions
      const maxHistoricalDays = Math.max(target.historical_days || 30, target.growth_rate_period_days || 0);
      const historicalCutoff = subDays(today, maxHistoricalDays);
      
      const historicalData = iPraticoData.filter(item => {
        if (!item.order_date) return false;
        const itemDate = new Date(item.order_date);
        itemDate.setHours(0, 0, 0, 0);
        if (itemDate < historicalCutoff || itemDate >= today) return false;
        if (target.store_id !== 'all' && item.store_id !== target.store_id) return false;
        return true;
      });
      
      const dailyTotals = {};
      historicalData.forEach(item => {
        if (!dailyTotals[item.order_date]) dailyTotals[item.order_date] = 0;
        
        let itemRevenue = 0;
        if (target.app) {
          const apps = [
            { key: 'glovo', revenue: item.sourceApp_glovo || 0 },
            { key: 'deliveroo', revenue: item.sourceApp_deliveroo || 0 },
            { key: 'justeat', revenue: item.sourceApp_justeat || 0 },
            { key: 'onlineordering', revenue: item.sourceApp_onlineordering || 0 },
            { key: 'ordertable', revenue: item.sourceApp_ordertable || 0 },
            { key: 'tabesto', revenue: item.sourceApp_tabesto || 0 },
            { key: 'store', revenue: item.sourceApp_store || 0 }
          ];
          apps.forEach(app => {
            const mappedKey = appMapping[app.key] || app.key;
            if (mappedKey === target.app) itemRevenue += app.revenue;
          });
        } else if (target.channel) {
          const channels = [
            { key: 'delivery', revenue: item.sourceType_delivery || 0 },
            { key: 'takeaway', revenue: item.sourceType_takeaway || 0 },
            { key: 'takeawayOnSite', revenue: item.sourceType_takeawayOnSite || 0 },
            { key: 'store', revenue: item.sourceType_store || 0 }
          ];
          channels.forEach(ch => {
            const mappedKey = channelMapping[ch.key] || ch.key;
            if (mappedKey === target.channel) itemRevenue += ch.revenue;
          });
        } else {
          itemRevenue = item.total_revenue || 0;
        }
        
        dailyTotals[item.order_date] += itemRevenue;
      });
      
      // Calculate seasonality
      const seasonalityCutoff = subDays(today, target.historical_days || 30);
      const dayOfWeekRevenues = {};
      
      Object.entries(dailyTotals).forEach(([date, revenue]) => {
        const itemDate = new Date(date);
        if (itemDate >= seasonalityCutoff) {
          const dayOfWeek = itemDate.getDay();
          if (!dayOfWeekRevenues[dayOfWeek]) dayOfWeekRevenues[dayOfWeek] = [];
          dayOfWeekRevenues[dayOfWeek].push(revenue);
        }
      });
      
      const avgByDayOfWeek = {};
      Object.keys(dayOfWeekRevenues).forEach(dayOfWeek => {
        const revenues = dayOfWeekRevenues[dayOfWeek];
        let avg = 0;
        
        if (target.use_ema && revenues.length > 0) {
          const alpha = 0.2;
          avg = revenues[0];
          for (let i = 1; i < revenues.length; i++) {
            avg = alpha * revenues[i] + (1 - alpha) * avg;
          }
        } else {
          avg = revenues.length > 0 ? revenues.reduce((sum, r) => sum + r, 0) / revenues.length : 0;
        }
        
        avgByDayOfWeek[dayOfWeek] = avg;
      });
      
      // Calculate growth rate
      let dailyGrowthRate = 0;
      if (target.growth_rate_period_days > 0) {
        const growthCutoff = subDays(today, target.growth_rate_period_days);
        const growthData = Object.entries(dailyTotals)
          .filter(([date]) => {
            const d = new Date(date);
            return d >= growthCutoff && d < today;
          })
          .sort(([a], [b]) => a.localeCompare(b));
        
        if (growthData.length >= 2) {
          const n = growthData.length;
          let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
          
          growthData.forEach(([date, revenue], index) => {
            sumX += index;
            sumY += revenue;
            sumXY += index * revenue;
            sumX2 += index * index;
          });
          
          const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
          dailyGrowthRate = slope;
        }
      }
      
      // Freeze predictions for past days
      const dailyPredictions = target.daily_predictions || {};
      let hasNewFrozenDays = false;
      
      const totalDays = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24)) + 1;
      
      for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(periodStart);
        currentDate.setDate(periodStart.getDate() + i);
        
        if (currentDate <= today) {
          const dateStr = currentDate.toISOString().split('T')[0];
          
          // Only freeze if not already frozen
          if (dailyPredictions[dateStr] === undefined) {
            const dayOfWeek = currentDate.getDay();
            const baseRevenue = avgByDayOfWeek[dayOfWeek] || 0;
            const growthAdjustment = dailyGrowthRate * i;
            dailyPredictions[dateStr] = baseRevenue + growthAdjustment;
            hasNewFrozenDays = true;
          }
        }
      }
      
      // Update target if new days were frozen
      if (hasNewFrozenDays) {
        await base44.asServiceRole.entities.Target.update(target.id, {
          daily_predictions: dailyPredictions
        });
        updatedCount++;
      }
    }
    
    return Response.json({
      success: true,
      message: `Updated ${updatedCount} targets with frozen predictions`
    });
    
  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});