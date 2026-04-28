import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, TrendingUp, TrendingDown, Target, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import moment from "moment";

export default function EmployeeAOVCard({ user, stores }) {
  const isCassiere = (user?.ruoli_dipendente || []).includes("Cassiere");
  const [weekOffset, setWeekOffset] = useState(0);

  // Fetch Employee record to check if CM and get assigned_stores (primary store = first)
  const empName = (user?.nome_cognome || user?.full_name || "").trim();
  const { data: employeeRecord = null } = useQuery({
    queryKey: ["employee-record-aov", empName],
    queryFn: async () => {
      if (!empName) return null;
      const employees = await base44.entities.Employee.filter({ full_name: empName });
      return employees[0] || null;
    },
    enabled: isCassiere && !!empName,
    staleTime: 300000
  });

  const isCM = employeeRecord?.employee_group === "CM";
  const primaryStoreId = useMemo(() => {
    // Primary store from User entity's primary_stores (store IDs set in Gestione Utenti)
    const primaryStores = user?.primary_stores || [];
    if (primaryStores.length > 0) return primaryStores[0];
    return null;
  }, [user]);

  const shouldShow = isCassiere && !isCM;

  const weekStart = useMemo(() => moment().startOf("isoWeek").add(weekOffset, "weeks"), [weekOffset]);
  const weekEnd = useMemo(() => moment().endOf("isoWeek").add(weekOffset, "weeks"), [weekOffset]);
  const prevWeekStart = useMemo(() => weekStart.clone().subtract(1, "week"), [weekStart]);
  const prevWeekEnd = useMemo(() => weekEnd.clone().subtract(1, "week"), [weekEnd]);
  const targetMonth = weekStart.format("YYYY-MM");

  // Fetch ALL revenue by hour (same approach as admin EmployeeAOVList)
  const { data: revenueByHour = [], isLoading } = useQuery({
    queryKey: ["rev-by-hour-emp-card", weekStart.format("YYYY-MM-DD"), weekOffset],
    queryFn: () => base44.entities.RevenueByHour.filter({
      order_date: { $gte: prevWeekStart.format("YYYY-MM-DD"), $lte: weekEnd.format("YYYY-MM-DD") }
    }),
    enabled: shouldShow
  });

  const { data: aovTargets = [] } = useQuery({
    queryKey: ["target-aov-emp-card", targetMonth],
    queryFn: () => base44.entities.TargetAOV.filter({ mese: targetMonth }),
    enabled: shouldShow
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

  const empNameLower = empName.toLowerCase();

  // Calculate AOV for the primary store only
  const storeAovData = useMemo(() => {
    if (!empNameLower || revenueByHour.length === 0) return [];

    const calcForRange = (rangeStart, rangeEnd) => {
      const storeMap = {}; // store_id -> { revenue, orders }
      revenueByHour.forEach(r => {
        if (!r.order_date || !r.matched_employees?.length) return;
        // Filter to primary store only if known
        if (primaryStoreId && r.store_id !== primaryStoreId) return;
        const d = moment(r.order_date);
        if (!d.isBetween(rangeStart, rangeEnd, "day", "[]")) return;

        const isMatched = r.matched_employees.some(e =>
          (e.employee_name || "").trim().toLowerCase() === empNameLower
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
  }, [revenueByHour, empNameLower, primaryStoreId, weekStart, weekEnd, prevWeekStart, prevWeekEnd, targetByStore, storeIdToName]);

  if (!shouldShow) return null;
  if (isLoading) {
    return (
      <div className="flex justify-center py-3">
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      </div>
    );
  }
  if (storeAovData.length === 0 && !isLoading) {
    return (
      <NeumorphicCard className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-blue-800">Il tuo Scontrino Medio</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(w => w - 1)} className="p-1 rounded-lg hover:bg-blue-100">
              <ChevronLeft className="w-4 h-4 text-blue-600" />
            </button>
            <span className="text-[10px] text-slate-500 whitespace-nowrap">
              {weekStart.format("DD MMM")} - {weekEnd.format("DD MMM")}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0} className="p-1 rounded-lg hover:bg-blue-100 disabled:opacity-30">
              <ChevronRight className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400 text-center py-2">Nessun dato per questa settimana</p>
      </NeumorphicCard>
    );
  }

  return (
    <div className="space-y-3">
      {storeAovData.map(data => (
        <NeumorphicCard key={data.storeId} className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold text-blue-800">Il tuo Scontrino Medio — {data.storeName}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekOffset(w => w - 1)} className="p-1 rounded-lg hover:bg-blue-100">
                <ChevronLeft className="w-4 h-4 text-blue-600" />
              </button>
              <span className="text-[10px] text-slate-500 whitespace-nowrap">
                {weekStart.format("DD MMM")} - {weekEnd.format("DD MMM")}
              </span>
              <button onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0} className="p-1 rounded-lg hover:bg-blue-100 disabled:opacity-30">
                <ChevronRight className="w-4 h-4 text-blue-600" />
              </button>
            </div>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Il tuo Scontrino Medio</p>
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