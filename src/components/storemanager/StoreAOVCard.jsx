import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Store, TrendingUp, TrendingDown, ShoppingCart } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import moment from "moment";

export default function StoreAOVCard({ storeId, storeName }) {
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const monthLabel = useMemo(() => {
    const d = new Date(currentMonth + '-01');
    return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  }, [currentMonth]);

  const { data: revenueByHour = [], isLoading: loadingRev } = useQuery({
    queryKey: ["revenue-by-hour-sm-aov", storeId],
    queryFn: () => base44.entities.RevenueByHour.filter({ store_id: storeId })
  });

  const { data: targets = [] } = useQuery({
    queryKey: ["target-aov-sm", currentMonth],
    queryFn: () => base44.entities.TargetAOV.filter({ mese: currentMonth })
  });

  const target = useMemo(() => {
    const t = targets.find(t => t.store_id === storeId);
    return t?.target_aov || null;
  }, [targets, storeId]);

  const monthData = useMemo(() => {
    const monthStart = moment(currentMonth, "YYYY-MM").startOf("month");
    const monthEnd = moment(currentMonth, "YYYY-MM").endOf("month");

    const filtered = revenueByHour.filter(r => {
      if (!r.order_date) return false;
      const d = moment(r.order_date);
      return d.isBetween(monthStart, monthEnd, "day", "[]");
    });

    const totalRev = filtered.reduce((s, r) => s + (r.total_revenue || 0), 0);
    const totalOrd = filtered.reduce((s, r) => s + (r.total_orders || 0), 0);

    return {
      aov: totalOrd > 0 ? totalRev / totalOrd : null,
      revenue: totalRev,
      orders: totalOrd
    };
  }, [revenueByHour, currentMonth]);

  const deltaVsTarget = monthData.aov != null && target
    ? ((monthData.aov - target) / target) * 100
    : null;

  if (loadingRev) return null;

  return (
    <NeumorphicCard className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingCart className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-bold text-slate-700">AOV — {storeName}</span>
      </div>
      <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-wide">{monthLabel}</p>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] text-slate-400 mb-0.5">AOV Effettivo</p>
          <p className="text-xl font-bold text-slate-800">
            {monthData.aov != null ? `€${monthData.aov.toFixed(2)}` : "—"}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {monthData.orders > 0 ? `${Math.round(monthData.orders)} ordini · €${monthData.revenue.toFixed(0)} rev` : "Nessun dato"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 mb-0.5">Target</p>
          <p className="text-lg font-bold text-blue-600">
            {target ? `€${target.toFixed(2)}` : "—"}
          </p>
          {deltaVsTarget != null && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-bold mt-0.5 ${deltaVsTarget >= 0 ? "text-green-600" : "text-red-500"}`}>
              {deltaVsTarget >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {deltaVsTarget >= 0 ? "+" : ""}{deltaVsTarget.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </NeumorphicCard>
  );
}