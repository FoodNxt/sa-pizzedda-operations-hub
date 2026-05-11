import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, CheckCircle, X, Loader2 } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import moment from "moment";

/**
 * Returns ISO weeks whose Sunday (end of isoWeek) falls within the given month.
 * Each week: { weekNum, start (Mon), end (Sun), label }
 */
function getWeeksEndingInMonth(selectedMonth) {
  const monthStart = moment(selectedMonth, "YYYY-MM").startOf("month");
  const monthEnd = moment(selectedMonth, "YYYY-MM").endOf("month");

  const weeks = [];
  // Start from first ISO week whose Sunday could land in this month
  // That's at most 6 days before month start
  let cursor = monthStart.clone().subtract(6, "days").startOf("isoWeek");

  while (cursor.isSameOrBefore(monthEnd)) {
    const weekStart = cursor.clone();
    const weekEnd = cursor.clone().endOf("isoWeek"); // Sunday

    // Only include if the Sunday falls within the month
    if (weekEnd.isBetween(monthStart, monthEnd, "day", "[]")) {
      weeks.push({
        weekNum: weekStart.isoWeek(),
        start: weekStart,
        end: weekEnd,
        label: `${weekStart.format("DD/MM")} - ${weekEnd.format("DD/MM")}`
      });
    }
    cursor.add(1, "week");
  }
  return weeks;
}

export default function EmployeeWeeklyTargetMatrix({
  revenueByHour = [],
  stores = [],
  loadingRevByHour,
  selectedMonth,
  filterStoreIds = null
}) {
  const { data: aovTargets = [] } = useQuery({
    queryKey: ["target-aov-matrix", selectedMonth],
    queryFn: () => base44.entities.TargetAOV.filter({ mese: selectedMonth })
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-for-matrix-aov"],
    queryFn: () => base44.entities.User.list()
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts-cassiere-matrix"],
    queryFn: () => base44.entities.TurnoPlanday.filter({ ruolo: "Cassiere" })
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-matrix-cm"],
    queryFn: () => base44.entities.Employee.list()
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

  const employeePrimaryStoresMap = useMemo(() => {
    const map = {};
    users.forEach(u => {
      const name = u.nome_cognome || u.full_name;
      if (name) map[name.trim().toLowerCase()] = u.primary_stores || [];
    });
    return map;
  }, [users]);

  const storeIdToName = useMemo(() => {
    const map = {};
    stores.forEach(s => { map[s.id] = s.name; });
    return map;
  }, [stores]);

  const weeks = useMemo(() => getWeeksEndingInMonth(selectedMonth), [selectedMonth]);

  // Calculate AOV per employee per store per week
  const matrixData = useMemo(() => {
    if (!weeks.length) return [];

    const inRange = (dateVal, start, end) => {
      if (!dateVal) return false;
      const d = moment(dateVal);
      return d.isValid() && d.isBetween(start, end, "day", "[]");
    };

    // For each week, build employee-store map
    const weekMaps = weeks.map(week => {
      const empStoreMap = {};
      revenueByHour.forEach(r => {
        if (!inRange(r.order_date, week.start, week.end)) return;
        if (filterStoreIds && !filterStoreIds.includes(r.store_id)) return;
        if (!r.matched_employees?.length) return;
        const revPerEmp = (r.total_revenue || 0) / r.matched_employees.length;
        const ordPerEmp = (r.total_orders || 0) / r.matched_employees.length;
        r.matched_employees.forEach(emp => {
          const empKey = (emp.employee_name || "").trim().toLowerCase();
          if (!empKey) return;
          const key = `${empKey}__${r.store_id}`;
          if (!empStoreMap[key]) empStoreMap[key] = { name: emp.employee_name, storeId: r.store_id, revenue: 0, orders: 0 };
          empStoreMap[key].revenue += revPerEmp;
          empStoreMap[key].orders += ordPerEmp;
        });
      });
      return empStoreMap;
    });

    // Collect all cassiere employees across all weeks
    const allEmpKeys = new Set();
    weekMaps.forEach(wm => {
      Object.values(wm).forEach(entry => {
        const empKey = (entry.name || "").trim().toLowerCase();
        if (cassiereSet.has(empKey) && !cmSet.has(empKey)) allEmpKeys.add(empKey);
      });
    });

    // Build rows
    const rows = [];
    allEmpKeys.forEach(empKey => {
      const primaryStoreIds = employeePrimaryStoresMap[empKey] || [];
      // Collect all stores where employee worked
      const workedStoreIds = new Set();
      weekMaps.forEach(wm => {
        Object.values(wm).forEach(entry => {
          if ((entry.name || "").trim().toLowerCase() === empKey) workedStoreIds.add(entry.storeId);
        });
      });
      const storesToShow = primaryStoreIds.length > 0 ? primaryStoreIds : [...workedStoreIds];

      storesToShow.forEach(storeId => {
        if (!storeId) return;
        const target = targetByStore[storeId];
        if (target == null) return; // No target set, skip

        let empName = "";
        const weekResults = weeks.map((week, wi) => {
          const wm = weekMaps[wi];
          // Sum all entries for this employee in this store
          let revenue = 0, orders = 0;
          Object.values(wm).forEach(entry => {
            if ((entry.name || "").trim().toLowerCase() === empKey && entry.storeId === storeId) {
              revenue += entry.revenue;
              orders += entry.orders;
              if (!empName) empName = entry.name;
            }
          });
          const aov = orders > 0 ? revenue / orders : null;
          return { aov, met: aov != null && aov >= target, orders: Math.round(orders) };
        });

        const weeksHit = weekResults.filter(w => w.met).length;

        rows.push({
          empKey,
          name: empName,
          storeId,
          storeName: storeIdToName[storeId] || storeId,
          target,
          weekResults,
          weeksHit,
          totalWeeks: weeks.length
        });
      });
    });

    return rows.sort((a, b) => b.weeksHit - a.weeksHit || a.name.localeCompare(b.name));
  }, [weeks, revenueByHour, filterStoreIds, cassiereSet, cmSet, employeePrimaryStoresMap, targetByStore, storeIdToName]);

  const monthLabel = moment(selectedMonth, "YYYY-MM").format("MMMM YYYY");

  if (loadingRevByHour) {
    return (
      <NeumorphicCard className="p-6">
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      </NeumorphicCard>
    );
  }

  return (
    <NeumorphicCard className="p-4 lg:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-teal-600" />
          Raggiungimento Target AOV Settimanale — {monthLabel}
        </h3>
        <p className="text-xs text-slate-400">
          Solo settimane che terminano nel mese. Totale: <strong>{weeks.length} settimane</strong>
        </p>
      </div>

      {matrixData.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          Nessun cassiere con target AOV impostato per questo mese
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-teal-500">
                <th className="text-left p-2 text-slate-600 text-xs font-medium sticky left-0 bg-white z-10">Cassiere</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">Target</th>
                {weeks.map((w, i) => (
                  <th key={i} className="text-center p-2 text-slate-600 text-xs font-medium whitespace-nowrap">
                    Sett {i + 1}
                    <span className="block text-[9px] text-slate-400 font-normal">{w.label}</span>
                  </th>
                ))}
                <th className="text-center p-2 text-slate-600 text-xs font-medium">Settimane OK</th>
              </tr>
            </thead>
            <tbody>
              {matrixData.map(row => (
                <tr key={`${row.empKey}_${row.storeId}`} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-2 text-sm font-medium text-slate-700 sticky left-0 bg-white z-10">
                    {row.name}
                    <span className="block text-[10px] text-slate-400">{row.storeName}</span>
                  </td>
                  <td className="p-2 text-right text-sm font-medium text-blue-600">
                    €{row.target.toFixed(2)}
                  </td>
                  {row.weekResults.map((wr, i) => (
                    <td key={i} className="p-2 text-center">
                      {wr.aov != null ? (
                        <div className="flex flex-col items-center">
                          {wr.met ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <X className="w-5 h-5 text-red-400" />
                          )}
                          <span className={`text-[10px] mt-0.5 font-bold ${wr.met ? "text-green-600" : "text-red-500"}`}>
                            €{wr.aov.toFixed(2)}
                          </span>
                          <span className="text-[9px] text-slate-400">{wr.orders} ord</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  ))}
                  <td className="p-2 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                      row.weeksHit === row.totalWeeks
                        ? "bg-green-100 text-green-700"
                        : row.weeksHit > 0
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {row.weeksHit}/{row.totalWeeks}
                    </span>
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