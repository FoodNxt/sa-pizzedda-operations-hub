import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Store, TrendingUp, TrendingDown, Save, Loader2, ShoppingCart, Users } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import EmployeeAOVList from "./EmployeeAOVList";
import moment from "moment";

const PERIOD_OPTIONS = [
  { value: 30, label: "30gg" },
  { value: 60, label: "60gg" },
  { value: 90, label: "90gg" }
];

export default function TargetAOVTab({ stores }) {
  const queryClient = useQueryClient();
  const [editingStore, setEditingStore] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // RevenueByHour — same data source as "Revenue Oraria" in Financials
  const { data: revenueByHour = [], isLoading: loadingRevByHour } = useQuery({
    queryKey: ["revenue-by-hour-aov"],
    queryFn: () => base44.entities.RevenueByHour.filter({})
  });

  const { data: targets = [], isLoading: loadingTargets } = useQuery({
    queryKey: ["target-aov", selectedMonth],
    queryFn: () => base44.entities.TargetAOV.filter({ mese: selectedMonth })
  });

  const saveMutation = useMutation({
    mutationFn: async ({ storeId, storeName, value }) => {
      const existing = targets.find(t => t.store_id === storeId && t.mese === selectedMonth);
      if (existing) {
        return base44.entities.TargetAOV.update(existing.id, { target_aov: value });
      }
      return base44.entities.TargetAOV.create({ store_id: storeId, store_name: storeName, mese: selectedMonth, target_aov: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["target-aov"] });
      setEditingStore(null);
      setEditValue("");
    }
  });

  // AOV per store from RevenueByHour — same data source as "Revenue Oraria" in Financials
  const aovByStore = useMemo(() => {
    const today = moment();
    const result = {};

    (stores || []).forEach(store => {
      const storeData = revenueByHour.filter(r => r.store_id === store.id);
      const periods = {};

      PERIOD_OPTIONS.forEach(({ value: days }) => {
        const cutoff = moment(today).subtract(days, "days");
        const filtered = storeData.filter(r => r.order_date && moment(r.order_date).isAfter(cutoff));
        const totalRev = filtered.reduce((s, r) => s + (r.total_revenue || 0), 0);
        const totalOrd = filtered.reduce((s, r) => s + (r.total_orders || 0), 0);
        periods[days] = totalOrd > 0 ? totalRev / totalOrd : null;
      });

      result[store.id] = periods;
    });

    return result;
  }, [revenueByHour, stores]);

  // AOV effettivo del mese selezionato per ogni store
  const currentMonthAovByStore = useMemo(() => {
    const monthStart = moment(selectedMonth, "YYYY-MM").startOf("month");
    const monthEnd = moment(selectedMonth, "YYYY-MM").endOf("month");
    const result = {};

    (stores || []).forEach(store => {
      const storeData = revenueByHour.filter(r => {
        if (r.store_id !== store.id || !r.order_date) return false;
        const d = moment(r.order_date);
        return d.isBetween(monthStart, monthEnd, "day", "[]");
      });
      const totalRev = storeData.reduce((s, r) => s + (r.total_revenue || 0), 0);
      const totalOrd = storeData.reduce((s, r) => s + (r.total_orders || 0), 0);
      result[store.id] = {
        aov: totalOrd > 0 ? totalRev / totalOrd : null,
        revenue: totalRev,
        orders: totalOrd
      };
    });

    return result;
  }, [revenueByHour, stores, selectedMonth]);

  const targetMap = useMemo(() => {
    const map = {};
    targets.forEach(t => { map[t.store_id] = t.target_aov; });
    return map;
  }, [targets]);

  const handleSave = (storeId, storeName) => {
    const val = parseFloat(editValue);
    if (isNaN(val) || val <= 0) return;
    saveMutation.mutate({ storeId, storeName, value: val });
  };

  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = -3; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  }, []);

  const isLoading = loadingRevByHour || loadingTargets;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const activeStores = (stores || []).filter(s => s.status === "active");

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          Target AOV per Locale
        </h3>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="neumorphic-pressed px-4 py-2 rounded-xl outline-none text-sm"
        >
          {monthOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <NeumorphicCard className="p-4 lg:p-6">
        <p className="text-xs text-slate-500 mb-4">
          AOV calcolato da <strong>Revenue Oraria</strong> (RevenueByHour: total_revenue / total_orders), stessi dati di Financials.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-blue-600">
                <th className="text-left p-2 text-slate-600 text-xs font-medium">Locale</th>
                {PERIOD_OPTIONS.map(p => (
                  <th key={p.value} className="text-right p-2 text-slate-600 text-xs font-medium">AOV {p.label}</th>
                ))}
                <th className="text-right p-2 text-slate-600 text-xs font-medium">
                  Target {monthOptions.find(m => m.value === selectedMonth)?.label}
                </th>
                {PERIOD_OPTIONS.map(p => (
                  <th key={`delta-${p.value}`} className="text-right p-2 text-slate-600 text-xs font-medium">Δ vs {p.label}</th>
                ))}
                <th className="text-center p-2 text-slate-600 text-xs font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {activeStores.map(store => {
                const periods = aovByStore[store.id] || {};
                const target = targetMap[store.id];
                const isEditing = editingStore === store.id;

                return (
                  <tr key={store.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-2 text-sm font-medium text-slate-700 whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-purple-500" />
                        {store.name}
                      </span>
                    </td>

                    {PERIOD_OPTIONS.map(({ value: days }) => (
                      <td key={days} className="p-2 text-right text-sm">
                        {periods[days] != null ? (
                          <span className="font-bold text-slate-700">€{periods[days].toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    ))}

                    <td className="p-2 text-right text-sm">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleSave(store.id, store.name); if (e.key === "Escape") setEditingStore(null); }}
                          className="w-20 px-2 py-1 rounded-lg border border-blue-300 text-right text-sm outline-none"
                          autoFocus
                        />
                      ) : (
                        <span
                          className={`font-bold cursor-pointer hover:underline ${target ? "text-blue-600" : "text-slate-300"}`}
                          onClick={() => { setEditingStore(store.id); setEditValue(target || ""); }}
                          title="Clicca per modificare"
                        >
                          {target ? `€${target.toFixed(2)}` : "—"}
                        </span>
                      )}
                    </td>

                    {PERIOD_OPTIONS.map(({ value: days }) => {
                      const aov = periods[days];
                      if (!target || aov == null) {
                        return <td key={`d-${days}`} className="p-2 text-right text-sm text-slate-300">—</td>;
                      }
                      const pct = ((target - aov) / aov) * 100;
                      const isPositive = pct > 0;
                      return (
                        <td key={`d-${days}`} className="p-2 text-right text-sm">
                          <span className={`inline-flex items-center gap-0.5 font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {isPositive ? "+" : ""}{pct.toFixed(1)}%
                          </span>
                        </td>
                      );
                    })}

                    <td className="p-2 text-center">
                      {isEditing ? (
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => handleSave(store.id, store.name)}
                            disabled={saveMutation.isPending}
                            className="p-1 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingStore(null)}
                            className="p-1 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingStore(store.id); setEditValue(target || ""); }}
                          className="text-xs text-blue-500 hover:underline"
                        >
                          {target ? "Modifica" : "Imposta"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </NeumorphicCard>

      {/* AOV Mese Corrente per Locale */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeStores.map(store => {
          const data = currentMonthAovByStore[store.id] || {};
          const target = targetMap[store.id];
          const deltaVsTarget = data.aov != null && target ? ((data.aov - target) / target) * 100 : null;
          const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;

          return (
            <NeumorphicCard key={store.id} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Store className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-bold text-slate-700">{store.name}</span>
              </div>
              <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-wide">{monthLabel}</p>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] text-slate-400 mb-0.5">AOV Effettivo</p>
                  <p className="text-xl font-bold text-slate-800">
                    {data.aov != null ? `€${data.aov.toFixed(2)}` : "—"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {data.orders > 0 ? `${Math.round(data.orders)} ordini · €${data.revenue.toFixed(0)} rev` : "Nessun dato"}
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
        })}
      </div>

      {/* Employee AOV List */}
      <EmployeeAOVList revenueByHour={revenueByHour} stores={activeStores} loadingRevByHour={loadingRevByHour} allTargets={targets} />
    </div>
  );
}