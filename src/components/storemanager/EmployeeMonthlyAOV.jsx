import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, TrendingDown, Target, Loader2, Calendar } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import moment from "moment";

export default function EmployeeMonthlyAOV({ revenueByHour = [], stores = [], loadingRevByHour, selectedMonth, filterStoreIds = null }) {
  const monthStart = useMemo(() => moment(selectedMonth, "YYYY-MM").startOf("month"), [selectedMonth]);
  const monthEnd = useMemo(() => moment(selectedMonth, "YYYY-MM").endOf("month"), [selectedMonth]);
  const prevMonthStart = useMemo(() => monthStart.clone().subtract(1, "month"), [monthStart]);
  const prevMonthEnd = useMemo(() => monthStart.clone().subtract(1, "day"), [monthStart]);
  const monthLabel = monthStart.format("MMMM YYYY");

  // Fetch targets for this month
  const { data: aovTargets = [] } = useQuery({
    queryKey: ["target-aov-monthly-emp", selectedMonth],
    queryFn: () => base44.entities.TargetAOV.filter({ mese: selectedMonth })
  });

  // Fetch Users for primary_stores
  const { data: users = [] } = useQuery({
    queryKey: ["users-for-monthly-aov"],
    queryFn: () => base44.entities.User.list()
  });

  // Fetch shifts to identify Cassiere roles
  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts-cassiere-monthly"],
    queryFn: () => base44.entities.TurnoPlanday.filter({ ruolo: "Cassiere" })
  });

  // Fetch employees to exclude CM
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-monthly-aov"],
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

  const employeeData = useMemo(() => {
    const inRange = (dateVal, start, end) => {
      if (!dateVal) return false;
      const d = moment(dateVal);
      return d.isValid() && d.isBetween(start, end, "day", "[]");
    };

    const calcByStore = (start, end) => {
      const empStoreMap = {};
      revenueByHour.forEach(r => {
        if (!inRange(r.order_date, start, end)) return;
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
    };

    const curMap = calcByStore(monthStart, monthEnd);
    const prevMap = calcByStore(prevMonthStart, prevMonthEnd);

    // Group by employee
    const groupByEmp = (map) => {
      const result = {};
      Object.values(map).forEach(entry => {
        const empKey = (entry.name || "").trim().toLowerCase();
        if (!result[empKey]) result[empKey] = {};
        result[empKey][entry.storeId] = entry;
      });
      return result;
    };

    const curByEmp = groupByEmp(curMap);
    const prevByEmp = groupByEmp(prevMap);

    const rows = [];
    const processedEmployees = new Set();

    Object.values(curMap).forEach(entry => {
      const empKey = (entry.name || "").trim().toLowerCase();
      if (processedEmployees.has(empKey)) return;
      processedEmployees.add(empKey);

      if (!cassiereSet.has(empKey)) return;
      if (cmSet.has(empKey)) return;

      const primaryStoreIds = employeePrimaryStoresMap[empKey] || [];
      const workedStoreIds = Object.keys(curByEmp[empKey] || {});
      const storesToShow = primaryStoreIds.length > 0 ? primaryStoreIds : workedStoreIds;

      storesToShow.forEach(storeId => {
        if (!storeId) return;
        const cur = (curByEmp[empKey] || {})[storeId];
        if (!cur) return;

        const aov = cur.orders > 0 ? cur.revenue / cur.orders : null;
        if (aov == null) return;

        const prev = (prevByEmp[empKey] || {})[storeId];
        const prevAov = prev && prev.orders > 0 ? prev.revenue / prev.orders : null;
        const delta = aov != null && prevAov != null ? ((aov - prevAov) / prevAov) * 100 : null;

        const empTarget = targetByStore[storeId] ?? null;
        const deltaVsTarget = aov != null && empTarget != null ? ((aov - empTarget) / empTarget) * 100 : null;

        rows.push({
          name: entry.name,
          storeId,
          storeName: storeIdToName[storeId] || storeId,
          revenue: cur.revenue,
          orders: Math.round(cur.orders),
          aov,
          prevAov,
          delta,
          empTarget,
          deltaVsTarget,
          rowKey: `${empKey}_${storeId}`
        });
      });
    });

    return rows.sort((a, b) => b.aov - a.aov);
  }, [revenueByHour, monthStart, monthEnd, prevMonthStart, prevMonthEnd, filterStoreIds, cassiereSet, cmSet, employeePrimaryStoresMap, storeIdToName, targetByStore]);

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
          <Calendar className="w-5 h-5 text-blue-600" />
          Scontrino Medio Mensile per Cassiere — {monthLabel}
        </h3>
      </div>

      {employeeData.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Nessun cassiere con dati per questo mese</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-blue-500">
                <th className="text-left p-2 text-slate-600 text-xs font-medium">#</th>
                <th className="text-left p-2 text-slate-600 text-xs font-medium">Cassiere</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">Revenue</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">Ordini</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">AOV</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">Target</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">Δ vs Target</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">AOV mese prec.</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">Δ vs prec.</th>
              </tr>
            </thead>
            <tbody>
              {employeeData.map((emp, idx) => (
                <tr key={emp.rowKey} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-2 text-sm text-slate-400 font-bold">{idx + 1}</td>
                  <td className="p-2 text-sm font-medium text-slate-700">
                    {emp.name}
                    {emp.storeName && (
                      <span className="block text-[10px] text-slate-400">{emp.storeName}</span>
                    )}
                  </td>
                  <td className="p-2 text-right text-sm text-slate-600">€{emp.revenue.toFixed(0)}</td>
                  <td className="p-2 text-right text-sm text-slate-600">{emp.orders}</td>
                  <td className="p-2 text-right text-sm font-bold text-slate-800">€{emp.aov.toFixed(2)}</td>
                  <td className="p-2 text-right text-sm">
                    {emp.empTarget != null ? (
                      <span className="font-medium text-blue-600 flex items-center justify-end gap-1">
                        <Target className="w-3 h-3" />
                        €{emp.empTarget.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="p-2 text-right text-sm">
                    {emp.deltaVsTarget != null ? (
                      <span className={`inline-flex items-center gap-0.5 font-bold ${emp.deltaVsTarget >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {emp.deltaVsTarget >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {emp.deltaVsTarget >= 0 ? "+" : ""}{emp.deltaVsTarget.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="p-2 text-right text-sm text-slate-500">
                    {emp.prevAov != null ? `€${emp.prevAov.toFixed(2)}` : "—"}
                  </td>
                  <td className="p-2 text-right text-sm">
                    {emp.delta != null ? (
                      <span className={`inline-flex items-center gap-0.5 font-bold ${emp.delta >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {emp.delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {emp.delta >= 0 ? "+" : ""}{emp.delta.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
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