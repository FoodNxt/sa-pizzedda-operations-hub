import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Loader2, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import moment from "moment";

export default function EmployeeDailyAOV({
  revenueByHour = [],
  stores = [],
  loadingRevByHour,
  selectedMonth,
  filterStoreIds = null
}) {
  const [selectedStore, setSelectedStore] = useState("all");
  const [weekOffset, setWeekOffset] = useState(0);

  const monthStart = useMemo(() => moment(selectedMonth, "YYYY-MM").startOf("month"), [selectedMonth]);
  const monthEnd = useMemo(() => moment(selectedMonth, "YYYY-MM").endOf("month"), [selectedMonth]);

  const { data: users = [] } = useQuery({
    queryKey: ["users-for-daily-aov"],
    queryFn: () => base44.entities.User.list()
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts-cassiere-daily"],
    queryFn: () => base44.entities.TurnoPlanday.filter({ ruolo: "Cassiere" })
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-daily-cm"],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: aovTargets = [] } = useQuery({
    queryKey: ["target-aov-daily", selectedMonth],
    queryFn: () => base44.entities.TargetAOV.filter({ mese: selectedMonth })
  });

  const targetByStore = useMemo(() => {
    const map = {};
    aovTargets.forEach(t => { map[t.store_id] = t.target_aov; });
    return map;
  }, [aovTargets]);

  const cmSet = useMemo(() => {
    const set = new Set();
    employees.forEach(e => {
      if (e.employee_group === "CM" && e.full_name) set.add(e.full_name.trim().toLowerCase());
    });
    return set;
  }, [employees]);

  const cassiereSet = useMemo(() => {
    const set = new Set();
    shifts.forEach(s => { if (s.dipendente_nome) set.add(s.dipendente_nome.trim().toLowerCase()); });
    users.forEach(u => {
      const name = u.nome_cognome || u.full_name;
      if (name && (u.ruoli_dipendente || []).includes("Cassiere")) set.add(name.trim().toLowerCase());
    });
    return set;
  }, [shifts, users]);

  const storeIdToName = useMemo(() => {
    const map = {};
    stores.forEach(s => { map[s.id] = s.name; });
    return map;
  }, [stores]);

  // Generate days for current week view within the month
  const { days, weekLabel, canPrev, canNext } = useMemo(() => {
    const firstMonday = monthStart.clone().startOf("isoWeek");
    const weekStart = firstMonday.clone().add(weekOffset, "weeks");
    const weekEnd = weekStart.clone().endOf("isoWeek");

    const d = [];
    for (let i = 0; i < 7; i++) {
      const day = weekStart.clone().add(i, "days");
      if (day.isBetween(monthStart, monthEnd, "day", "[]")) {
        d.push(day.format("YYYY-MM-DD"));
      }
    }

    const lastMonday = monthEnd.clone().startOf("isoWeek");
    const maxOffset = lastMonday.diff(firstMonday, "weeks");

    return {
      days: d,
      weekLabel: `${weekStart.format("DD/MM")} — ${weekEnd.format("DD/MM")}`,
      canPrev: weekOffset > 0,
      canNext: weekOffset < maxOffset
    };
  }, [monthStart, monthEnd, weekOffset]);

  // Reset week offset when month changes
  useMemo(() => { setWeekOffset(0); }, [selectedMonth]);

  const activeStores = useMemo(() => {
    const all = stores.filter(s => s.status === "active");
    return filterStoreIds ? all.filter(s => filterStoreIds.includes(s.id)) : all;
  }, [stores, filterStoreIds]);

  // Build daily AOV data
  const { rows, empNames } = useMemo(() => {
    const storeFilter = selectedStore === "all" ? null : selectedStore;
    const empDayMap = {}; // empKey -> { date -> { revenue, orders } }

    revenueByHour.forEach(r => {
      if (!r.order_date || !r.matched_employees?.length) return;
      const d = moment(r.order_date);
      if (!d.isValid() || !d.isBetween(monthStart, monthEnd, "day", "[]")) return;
      if (filterStoreIds && !filterStoreIds.includes(r.store_id)) return;
      if (storeFilter && r.store_id !== storeFilter) return;

      const dateKey = d.format("YYYY-MM-DD");
      if (!days.includes(dateKey)) return;

      const revPerEmp = (r.total_revenue || 0) / r.matched_employees.length;
      const ordPerEmp = (r.total_orders || 0) / r.matched_employees.length;

      r.matched_employees.forEach(emp => {
        const empKey = (emp.employee_name || "").trim().toLowerCase();
        if (!empKey || !cassiereSet.has(empKey) || cmSet.has(empKey)) return;

        if (!empDayMap[empKey]) empDayMap[empKey] = { name: emp.employee_name, days: {} };
        if (!empDayMap[empKey].days[dateKey]) empDayMap[empKey].days[dateKey] = { revenue: 0, orders: 0 };
        empDayMap[empKey].days[dateKey].revenue += revPerEmp;
        empDayMap[empKey].days[dateKey].orders += ordPerEmp;
      });
    });

    // Get target for selected store (or average across stores)
    const target = storeFilter ? (targetByStore[storeFilter] || null) : null;

    const result = Object.entries(empDayMap).map(([empKey, data]) => {
      const dayValues = days.map(date => {
        const d = data.days[date];
        if (!d || d.orders === 0) return { aov: null, orders: 0 };
        return { aov: d.revenue / d.orders, orders: Math.round(d.orders) };
      });

      // Week total
      let totalRev = 0, totalOrd = 0;
      days.forEach(date => {
        const d = data.days[date];
        if (d) { totalRev += d.revenue; totalOrd += d.orders; }
      });
      const weekAov = totalOrd > 0 ? totalRev / totalOrd : null;

      return {
        empKey,
        name: data.name,
        dayValues,
        weekAov,
        weekOrders: Math.round(totalOrd),
        target
      };
    }).sort((a, b) => (b.weekAov || 0) - (a.weekAov || 0));

    return { rows: result, empNames: result.map(r => r.name) };
  }, [revenueByHour, days, monthStart, monthEnd, filterStoreIds, selectedStore, cassiereSet, cmSet, targetByStore]);

  if (loadingRevByHour) {
    return (
      <NeumorphicCard className="p-6">
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      </NeumorphicCard>
    );
  }

  const monthLabel = monthStart.format("MMMM YYYY");

  return (
    <NeumorphicCard className="p-4 lg:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-indigo-600" />
          AOV Giornaliero per Cassiere — {monthLabel}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedStore}
            onChange={e => setSelectedStore(e.target.value)}
            className="neumorphic-pressed px-3 py-1.5 rounded-xl outline-none text-sm"
          >
            <option value="all">Tutti i locali</option>
            {activeStores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              disabled={!canPrev}
              className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-slate-600 min-w-[110px] text-center">{weekLabel}</span>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              disabled={!canNext}
              className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Nessun cassiere con dati per questa settimana</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-indigo-500">
                <th className="text-left p-2 text-slate-600 text-xs font-medium sticky left-0 bg-white z-10">Cassiere</th>
                {days.map(date => (
                  <th key={date} className="text-center p-2 text-slate-600 text-xs font-medium whitespace-nowrap">
                    {moment(date).format("ddd")}
                    <span className="block text-[9px] text-slate-400 font-normal">{moment(date).format("DD/MM")}</span>
                  </th>
                ))}
                <th className="text-center p-2 text-slate-600 text-xs font-medium bg-indigo-50">Media Sett.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.empKey} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-2 text-sm font-medium text-slate-700 sticky left-0 bg-white z-10 whitespace-nowrap">
                    {row.name}
                  </td>
                  {row.dayValues.map((dv, i) => {
                    const aboveTarget = row.target && dv.aov != null && dv.aov >= row.target;
                    const belowTarget = row.target && dv.aov != null && dv.aov < row.target;
                    return (
                      <td key={i} className="p-2 text-center">
                        {dv.aov != null ? (
                          <div>
                            <span className={`text-sm font-bold ${aboveTarget ? "text-green-600" : belowTarget ? "text-red-500" : "text-slate-700"}`}>
                              €{dv.aov.toFixed(2)}
                            </span>
                            <span className="block text-[9px] text-slate-400">{dv.orders} ord</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-2 text-center bg-indigo-50">
                    {row.weekAov != null ? (
                      <div>
                        <span className={`text-sm font-bold ${
                          row.target && row.weekAov >= row.target ? "text-green-600" :
                          row.target && row.weekAov < row.target ? "text-red-500" : "text-slate-800"
                        }`}>
                          €{row.weekAov.toFixed(2)}
                        </span>
                        <span className="block text-[9px] text-slate-400">{row.weekOrders} ord</span>
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </NeumorphicCard>
  );
}