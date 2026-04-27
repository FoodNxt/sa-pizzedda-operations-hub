import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, TrendingUp, TrendingDown, Target, Loader2 } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import moment from "moment";

export default function EmployeeAOVCard({ user, stores }) {
  const isCassiere = (user?.ruoli_dipendente || []).includes("Cassiere");

  const weekStart = useMemo(() => moment().startOf("isoWeek"), []);
  const weekEnd = useMemo(() => moment().endOf("isoWeek"), []);
  const prevWeekStart = useMemo(() => moment().startOf("isoWeek").subtract(1, "week"), []);
  const prevWeekEnd = useMemo(() => moment().endOf("isoWeek").subtract(1, "week"), []);
  const targetMonth = weekStart.format("YYYY-MM");

  // Fetch ALL revenue by hour (same approach as admin EmployeeAOVList)
  const { data: revenueByHour = [], isLoading } = useQuery({
    queryKey: ["rev-by-hour-emp-card", weekStart.format("YYYY-MM-DD")],
    queryFn: () => base44.entities.RevenueByHour.filter({
      order_date: { $gte: prevWeekStart.format("YYYY-MM-DD"), $lte: weekEnd.format("YYYY-MM-DD") }
    }),
    enabled: isCassiere
  });

  const { data: aovTargets = [] } = useQuery({
    queryKey: ["target-aov-emp-card", targetMonth],
    queryFn: () => base44.entities.TargetAOV.filter({ mese: targetMonth }),
    enabled: isCassiere
  });

  const storeIdToName = useMemo(() => {
    const map = {};
    (stores || []).forEach(s => { map[s.id] = s.name; });
    return map;
  }, [stores]);

  const targetByStore = useMemo(() => {
    const map = {};
    aovTargets.forEach(t => { map[t.store_id] = t.target_aov; });
    return map;
  }, [aovTargets]);

  const empName = (user?.nome_cognome || user?.full_name || "").trim().toLowerCase();

  // Calculate AOV per store for this employee — same logic as admin EmployeeAOVList
  const storeAovData = useMemo(() => {
    if (!empName || revenueByHour.length === 0) return [];

    const calcForRange = (rangeStart, rangeEnd) => {
      const storeMap = {}; // store_id -> { revenue, orders }
      revenueByHour.forEach(r => {
        if (!r.order_date || !r.matched_employees?.length) return;
        const d = moment(r.order_date);
        if (!d.isBetween(rangeStart, rangeEnd, "day", "[]")) return;

        const isMatched = r.matched_employees.some(e =>
          (e.employee_name || "").trim().toLowerCase() === empName
        );
        if (!isMatched) return;

        const storeId = r.store_id;
        const empCount = r.matched_employees.length;
        if (!storeMap[storeId]) storeMap[storeId] = { revenue: 0, orders: 0 };
        storeMap[storeId].revenue += (r.total_revenue || 0) / empCount;
        storeMap[storeId].orders += (r.total_orders || 0) / empCount;
      });
      return storeMap;
    };

    const curData = calcForRange(weekStart, weekEnd);
    const prevData = calcForRange(prevWeekStart, prevWeekEnd);

    // Build rows for each store where employee has data this week
    const rows = [];
    Object.keys(curData).forEach(storeId => {
      const cur = curData[storeId];
      const aov = cur.orders > 0 ? cur.revenue / cur.orders : null;
      if (aov == null) return;

      const prev = prevData[storeId];
      const prevAov = prev && prev.orders > 0 ? prev.revenue / prev.orders : null;
      const deltaVsPrev = aov != null && prevAov != null ? ((aov - prevAov) / prevAov) * 100 : null;

      const target = targetByStore[storeId] || null;
      const deltaVsTarget = aov != null && target ? ((aov - target) / target) * 100 : null;

      rows.push({
        storeId,
        storeName: storeIdToName[storeId] || storeId,
        aov,
        orders: Math.round(cur.orders),
        revenue: cur.revenue,
        target,
        deltaVsTarget,
        prevAov,
        deltaVsPrev
      });
    });

    return rows.sort((a, b) => b.revenue - a.revenue);
  }, [revenueByHour, empName, weekStart, weekEnd, prevWeekStart, prevWeekEnd, targetByStore, storeIdToName]);

  if (!isCassiere) return null;
  if (isLoading) {
    return (
      <div className="flex justify-center py-3">
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      </div>
    );
  }
  if (storeAovData.length === 0) return null;

  return (
    <div className="space-y-3">
      {storeAovData.map(data => (
        <NeumorphicCard key={data.storeId} className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-blue-800">Il tuo AOV — {data.storeName}</span>
          </div>
          <p className="text-[10px] text-slate-400 mb-2">
            Settimana: {weekStart.format("DD MMM")} - {weekEnd.format("DD MMM YYYY")}
          </p>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Il tuo AOV</p>
              <p className="text-xl font-bold text-slate-800">€{data.aov.toFixed(2)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{data.orders} ordini · €{data.revenue.toFixed(0)} revenue</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 mb-0.5">Target</p>
              <p className="text-lg font-bold text-blue-600 flex items-center justify-end gap-1">
                <Target className="w-3 h-3" />
                {data.target ? `€${data.target.toFixed(2)}` : "—"}
              </p>
              {data.deltaVsTarget != null && (
                <span className={`inline-flex items-center gap-0.5 text-xs font-bold mt-0.5 ${data.deltaVsTarget >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {data.deltaVsTarget >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {data.deltaVsTarget >= 0 ? "+" : ""}{data.deltaVsTarget.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          {/* Previous week comparison */}
          {data.prevAov != null && (
            <div className="mt-2 pt-2 border-t border-blue-200 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">Sett. precedente: €{data.prevAov.toFixed(2)}</span>
              {data.deltaVsPrev != null && (
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${data.deltaVsPrev >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {data.deltaVsPrev >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {data.deltaVsPrev >= 0 ? "+" : ""}{data.deltaVsPrev.toFixed(1)}% vs prec.
                </span>
              )}
            </div>
          )}
        </NeumorphicCard>
      ))}
    </div>
  );
}