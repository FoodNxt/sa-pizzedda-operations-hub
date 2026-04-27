import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, TrendingUp, TrendingDown, Target } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import moment from "moment";

export default function EmployeeAOVCard({ user, stores }) {
  const isCassiere = (user?.ruoli_dipendente || []).includes("Cassiere");

  const weekStart = useMemo(() => moment().startOf("isoWeek"), []);
  const weekEnd = useMemo(() => moment().endOf("isoWeek"), []);
  const targetMonth = weekStart.format("YYYY-MM");

  // Fetch revenue data for the current week
  const { data: revenueByHour = [], isLoading } = useQuery({
    queryKey: ["rev-by-hour-emp-aov", weekStart.format("YYYY-MM-DD")],
    queryFn: () => base44.entities.RevenueByHour.filter({
      order_date: { $gte: weekStart.format("YYYY-MM-DD"), $lte: weekEnd.format("YYYY-MM-DD") }
    }),
    enabled: isCassiere
  });

  const { data: aovTargets = [] } = useQuery({
    queryKey: ["target-aov-emp", targetMonth],
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

  // Derive assigned store IDs from: user.assigned_stores, or from revenue data matched to this employee
  const assignedStoreIds = useMemo(() => {
    // Try assigned_stores from user profile first
    if (user?.assigned_stores && user.assigned_stores.length > 0) {
      // assigned_stores may contain store names, need to map to IDs
      const storeNameToId = {};
      (stores || []).forEach(s => { storeNameToId[s.name] = s.id; });
      const ids = user.assigned_stores.map(s => storeNameToId[s] || s).filter(Boolean);
      if (ids.length > 0) return ids;
    }
    // Fallback: derive from revenue data where this employee is matched
    if (!empName || revenueByHour.length === 0) return [];
    const storeSet = new Set();
    revenueByHour.forEach(r => {
      if (r.matched_employees?.some(e => (e.employee_name || "").trim().toLowerCase() === empName)) {
        storeSet.add(r.store_id);
      }
    });
    return Array.from(storeSet);
  }, [user?.assigned_stores, stores, empName, revenueByHour]);

  const storeAovData = useMemo(() => {
    if (!empName || assignedStoreIds.length === 0) return [];

    return assignedStoreIds.map(storeId => {
      const filtered = revenueByHour.filter(r => {
        if (r.store_id !== storeId || !r.order_date) return false;
        if (!r.matched_employees || r.matched_employees.length === 0) return false;
        return r.matched_employees.some(e =>
          (e.employee_name || "").trim().toLowerCase() === empName
        );
      });

      let revenue = 0, orders = 0;
      filtered.forEach(r => {
        const empCount = r.matched_employees.length;
        revenue += (r.total_revenue || 0) / empCount;
        orders += (r.total_orders || 0) / empCount;
      });

      const aov = orders > 0 ? revenue / orders : null;
      const target = targetByStore[storeId] || null;
      const delta = aov != null && target ? ((aov - target) / target) * 100 : null;

      return { storeId, storeName: storeIdToName[storeId] || storeId, aov, orders: Math.round(orders), revenue, target, delta };
    });
  }, [revenueByHour, assignedStoreIds, empName, targetByStore, storeIdToName]);

  if (!isCassiere || isLoading) return null;
  if (storeAovData.length === 0 || storeAovData.every(d => d.aov == null)) return null;

  return (
    <div className="space-y-3">
      {storeAovData.filter(d => d.aov != null).map(data => (
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
              <p className="text-[10px] text-slate-400 mt-0.5">{data.orders} ordini</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 mb-0.5">Target</p>
              <p className="text-lg font-bold text-blue-600 flex items-center justify-end gap-1">
                <Target className="w-3 h-3" />
                {data.target ? `€${data.target.toFixed(2)}` : "—"}
              </p>
              {data.delta != null && (
                <span className={`inline-flex items-center gap-0.5 text-xs font-bold mt-0.5 ${data.delta >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {data.delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {data.delta >= 0 ? "+" : ""}{data.delta.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </NeumorphicCard>
      ))}
    </div>
  );
}