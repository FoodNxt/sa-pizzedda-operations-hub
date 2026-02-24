import React from "react";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { formatCurrency } from "../utils/formatCurrency";

export default function DetailPeriodTable({ 
  detailView, 
  totalDays, 
  periodStart, 
  today, 
  dailyRevenueMap, 
  avgByDayOfWeek, 
  dailyGrowthRate, 
  target, 
  totalSeasonalityWeight,
  selectedTarget
}) {
  const detailRows = [];

  if (detailView === 'daily') {
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(periodStart);
      currentDate.setDate(periodStart.getDate() + i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const isPast = currentDate <= today;
      
      const actualRevenue = dailyRevenueMap[dateStr] || 0;
      const dayOfWeek = currentDate.getDay();
      const baseRevenue = avgByDayOfWeek[dayOfWeek] || 0;
      const growthAdjustment = dailyGrowthRate * i;
      
      // Use frozen values for past days, dynamic for future
      const frozenPrediction = isPast && selectedTarget?.daily_predictions?.[dateStr];
      const predictedRevenue = frozenPrediction !== undefined ? frozenPrediction : (baseRevenue + growthAdjustment);
      
      const dayWeight = avgByDayOfWeek[dayOfWeek] || 0;
      const frozenRequired = isPast && selectedTarget?.daily_required?.[dateStr];
      const requiredRevenue = frozenRequired !== undefined ? frozenRequired : (totalSeasonalityWeight > 0 ? (target * (dayWeight / totalSeasonalityWeight)) : (target / totalDays));
      
      detailRows.push({
        date: format(currentDate, 'dd/MM (EEE)', { locale: it }),
        actual: isPast ? actualRevenue : null,
        predicted: predictedRevenue,
        deltaVsPredicted: isPast ? (actualRevenue - predictedRevenue) : null,
        deltaPercentVsPredicted: isPast && predictedRevenue > 0 ? ((actualRevenue - predictedRevenue) / predictedRevenue) * 100 : null,
        required: requiredRevenue,
        deltaVsRequired: isPast ? (actualRevenue - requiredRevenue) : null,
        deltaPercentVsRequired: isPast && requiredRevenue > 0 ? ((actualRevenue - requiredRevenue) / requiredRevenue) * 100 : null,
        isPast
      });
    }
  } else if (detailView === 'weekly') {
    const weeklyDataMap = {};
    
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(periodStart);
      currentDate.setDate(periodStart.getDate() + i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const isPast = currentDate <= today;
      
      const weekStart = new Date(currentDate);
      const dayOfWeek = weekStart.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStart.setDate(weekStart.getDate() + diff);
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      if (!weeklyDataMap[weekKey]) {
        weeklyDataMap[weekKey] = {
          start: new Date(weekStart),
          end: new Date(weekStart),
          actual: 0,
          predicted: 0,
          required: 0,
          dates: []
        };
      }
      
      weeklyDataMap[weekKey].end = new Date(currentDate);
      weeklyDataMap[weekKey].dates.push(dateStr);
      
      const actualRev = dailyRevenueMap[dateStr] || 0;
      weeklyDataMap[weekKey].actual += actualRev;
      
      const dow = currentDate.getDay();
      const baseRevenue = avgByDayOfWeek[dow] || 0;
      const growthAdjustment = dailyGrowthRate * i;
      
      const frozenPrediction = isPast && selectedTarget?.daily_predictions?.[dateStr];
      const predictedRevenue = frozenPrediction !== undefined ? frozenPrediction : (baseRevenue + growthAdjustment);
      weeklyDataMap[weekKey].predicted += predictedRevenue;
      
      const dayWeight = avgByDayOfWeek[dow] || 0;
      const frozenRequired = isPast && selectedTarget?.daily_required?.[dateStr];
      const requiredRevenue = frozenRequired !== undefined ? frozenRequired : (totalSeasonalityWeight > 0 ? (target * (dayWeight / totalSeasonalityWeight)) : (target / totalDays));
      weeklyDataMap[weekKey].required += requiredRevenue;
    }
    
    Object.values(weeklyDataMap).forEach(week => {
      const isPast = week.end <= today;
      
      detailRows.push({
        date: `${format(week.start, 'dd/MM')} - ${format(week.end, 'dd/MM')}`,
        actual: isPast ? week.actual : null,
        predicted: week.predicted,
        deltaVsPredicted: isPast ? (week.actual - week.predicted) : null,
        deltaPercentVsPredicted: isPast && week.predicted > 0 ? ((week.actual - week.predicted) / week.predicted) * 100 : null,
        required: week.required,
        deltaVsRequired: isPast ? (week.actual - week.required) : null,
        deltaPercentVsRequired: isPast && week.required > 0 ? ((week.actual - week.required) / week.required) * 100 : null,
        isPast
      });
    });
  } else if (detailView === 'monthly') {
    const monthlyDataMap = {};
    
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(periodStart);
      currentDate.setDate(periodStart.getDate() + i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const monthKey = format(currentDate, 'yyyy-MM');
      const isPast = currentDate <= today;
      
      if (!monthlyDataMap[monthKey]) {
        monthlyDataMap[monthKey] = {
          start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
          end: currentDate,
          actual: 0,
          predicted: 0,
          required: 0
        };
      }
      
      monthlyDataMap[monthKey].end = new Date(currentDate);
      
      const actualRev = dailyRevenueMap[dateStr] || 0;
      monthlyDataMap[monthKey].actual += actualRev;
      
      const dayOfWeek = currentDate.getDay();
      const baseRevenue = avgByDayOfWeek[dayOfWeek] || 0;
      const growthAdjustment = dailyGrowthRate * i;
      
      const frozenPrediction = isPast && selectedTarget?.daily_predictions?.[dateStr];
      const predictedRevenue = frozenPrediction !== undefined ? frozenPrediction : (baseRevenue + growthAdjustment);
      monthlyDataMap[monthKey].predicted += predictedRevenue;
      
      const dayWeight = avgByDayOfWeek[dayOfWeek] || 0;
      const frozenRequired = isPast && selectedTarget?.daily_required?.[dateStr];
      const requiredRevenue = frozenRequired !== undefined ? frozenRequired : (totalSeasonalityWeight > 0 ? (target * (dayWeight / totalSeasonalityWeight)) : (target / totalDays));
      monthlyDataMap[monthKey].required += requiredRevenue;
    }
    
    Object.values(monthlyDataMap).forEach(month => {
      const isPast = month.end < today || (month.end.getTime() === today.getTime());
      
      detailRows.push({
        date: format(month.start, 'MMMM yyyy', { locale: it }),
        actual: month.actual > 0 ? month.actual : null,
        predicted: month.predicted,
        deltaVsPredicted: isPast ? (month.actual - month.predicted) : null,
        deltaPercentVsPredicted: isPast && month.predicted > 0 ? ((month.actual - month.predicted) / month.predicted) * 100 : null,
        required: month.required,
        deltaVsRequired: isPast ? (month.actual - month.required) : null,
        deltaPercentVsRequired: isPast && month.required > 0 ? ((month.actual - month.required) / month.required) * 100 : null,
        isPast
      });
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b-2 border-blue-600">
            <th className="text-left p-3 text-slate-600 font-medium text-sm">Giorno</th>
            <th className="text-right p-3 text-slate-600 font-medium text-sm">Effettivo</th>
            <th className="text-right p-3 text-slate-600 font-medium text-sm">Previsto</th>
            <th className="text-right p-3 text-slate-600 font-medium text-sm bg-purple-50">Δ vs Previsto</th>
            <th className="text-right p-3 text-slate-600 font-medium text-sm bg-purple-50">Δ % vs Previsto</th>
            <th className="text-right p-3 text-slate-600 font-medium text-sm">Richiesto</th>
            <th className="text-right p-3 text-slate-600 font-medium text-sm bg-orange-50">Δ vs Richiesto</th>
            <th className="text-right p-3 text-slate-600 font-medium text-sm bg-orange-50">Δ % vs Richiesto</th>
          </tr>
        </thead>
        <tbody>
          {detailRows.map((row, idx) => (
            <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
              <td className="p-3 text-slate-700 font-medium text-sm">{row.date}</td>
              <td className="p-3 text-right text-slate-700 font-bold text-sm">
                {row.actual !== null ? `€${formatCurrency(Math.round(row.actual), 0)}` : '-'}
              </td>
              <td className="p-3 text-right text-slate-600 text-sm">
                €{formatCurrency(Math.round(row.predicted), 0)}
              </td>
              <td className={`p-3 text-right font-bold text-sm bg-purple-50 ${
                row.deltaVsPredicted !== null ? (row.deltaVsPredicted >= 0 ? 'text-green-600' : 'text-red-600') : 'text-slate-400'
              }`}>
                {row.deltaVsPredicted !== null ? `${row.deltaVsPredicted >= 0 ? '+' : ''}€${formatCurrency(Math.round(row.deltaVsPredicted), 0)}` : '-'}
              </td>
              <td className={`p-3 text-right font-bold text-sm bg-purple-50 ${
                row.deltaPercentVsPredicted !== null ? (row.deltaPercentVsPredicted >= 0 ? 'text-green-600' : 'text-red-600') : 'text-slate-400'
              }`}>
                {row.deltaPercentVsPredicted !== null ? `${row.deltaPercentVsPredicted >= 0 ? '+' : ''}${row.deltaPercentVsPredicted.toFixed(1)}%` : '-'}
              </td>
              <td className="p-3 text-right text-orange-600 font-bold text-sm">
                €{formatCurrency(Math.round(row.required), 0)}
              </td>
              <td className={`p-3 text-right font-bold text-sm bg-orange-50 ${
                row.deltaVsRequired !== null ? (row.deltaVsRequired >= 0 ? 'text-green-600' : 'text-red-600') : 'text-slate-400'
              }`}>
                {row.deltaVsRequired !== null ? `${row.deltaVsRequired >= 0 ? '+' : ''}€${formatCurrency(Math.round(row.deltaVsRequired), 0)}` : '-'}
              </td>
              <td className={`p-3 text-right font-bold text-sm bg-orange-50 ${
                row.deltaPercentVsRequired !== null ? (row.deltaPercentVsRequired >= 0 ? 'text-green-600' : 'text-red-600') : 'text-slate-400'
              }`}>
                {row.deltaPercentVsRequired !== null ? `${row.deltaPercentVsRequired >= 0 ? '+' : ''}${row.deltaPercentVsRequired.toFixed(1)}%` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}