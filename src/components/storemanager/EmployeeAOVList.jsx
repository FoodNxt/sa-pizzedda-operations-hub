import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Users, Store, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Loader2, Target } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import moment from "moment";

function getWeekRange(weekOffset = 0) {
  const start = moment().startOf("isoWeek").add(weekOffset, "weeks");
  const end = moment(start).endOf("isoWeek");
  return { start, end };
}

export default function EmployeeAOVList({ revenueByHour = [], stores = [], loadingRevByHour }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [filterStore, setFilterStore] = useState("all");

  const { start: weekStart, end: weekEnd } = getWeekRange(weekOffset);
  const prevWeek = getWeekRange(weekOffset - 1);
  const dateRange = `${weekStart.format("DD MMM")} - ${weekEnd.format("DD MMM YYYY")}`;

  // The target month is determined by the Monday of the selected week
  const targetMonth = weekStart.format("YYYY-MM");

  // Fetch all TargetAOV for the relevant month
  const { data: aovTargets = [] } = useQuery({
    queryKey: ["target-aov-employee", targetMonth],
    queryFn: () => base44.entities.TargetAOV.filter({ mese: targetMonth })
  });

  // Fetch Users for primary_stores assignment (store assignments are on User entity, not Employee)
  const { data: users = [] } = useQuery({
    queryKey: ["users-for-aov"],
    queryFn: () => base44.entities.User.list()
  });

  // Fetch shifts to identify who works as Cassiere (more reliable than Employee.function_name)
  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts-cassiere-roles"],
    queryFn: () => base44.entities.TurnoPlanday.filter({ ruolo: "Cassiere" })
  });

  // Fetch employees to identify CM (contratto a chiamata) to exclude them
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-aov-cm"],
    queryFn: () => base44.entities.Employee.list()
  });

  // Build target map: store_id -> target_aov
  const targetByStore = useMemo(() => {
    const map = {};
    aovTargets.forEach(t => { map[t.store_id] = t.target_aov; });
    return map;
  }, [aovTargets]);

  // Build CM set from Employee entity to exclude them
  const cmSet = useMemo(() => {
    const set = new Set();
    employees.forEach(e => {
      if (e.employee_group === "CM" && e.full_name) {
        set.add(e.full_name.trim().toLowerCase());
      }
    });
    return set;
  }, [employees]);

  // Build cassiere set from shifts (ruolo=Cassiere) + User ruoli_dipendente as fallback
  const cassiereSet = useMemo(() => {
    const set = new Set();
    // From shifts: anyone who has ever had a Cassiere shift
    shifts.forEach(s => {
      if (s.dipendente_nome) set.add(s.dipendente_nome.trim().toLowerCase());
    });
    // From User entity: users with "Cassiere" in ruoli_dipendente
    users.forEach(u => {
      const name = u.nome_cognome || u.full_name;
      if (name && (u.ruoli_dipendente || []).includes("Cassiere")) {
        set.add(name.trim().toLowerCase());
      }
    });
    return set;
  }, [shifts, users]);

  // Build employee -> primary_stores mapping from User entity
  const employeePrimaryStoresMap = useMemo(() => {
    const map = {};
    users.forEach(u => {
      const name = u.nome_cognome || u.full_name;
      if (name) {
        const key = name.trim().toLowerCase();
        map[key] = u.primary_stores || [];
      }
    });
    return map;
  }, [users]);

  // Build store_id -> store_name for display
  const storeIdToName = useMemo(() => {
    const map = {};
    stores.forEach(s => { map[s.id] = s.name; });
    return map;
  }, [stores]);

  const employeeData = useMemo(() => {
    const inRange = (dateVal, rangeStart, rangeEnd) => {
      if (!dateVal) return false;
      const d = moment(dateVal);
      return d.isValid() && d.isBetween(rangeStart, rangeEnd, "day", "[]");
    };

    // Calculate per-employee per-store revenue
    const calcEmployeesByStore = (rangeStart, rangeEnd) => {
      const empStoreMap = {}; // key: empId_storeId
      const filteredHours = revenueByHour.filter(r => {
        if (!inRange(r.order_date, rangeStart, rangeEnd)) return false;
        if (filterStore !== "all" && r.store_id !== filterStore) return false;
        return true;
      });

      filteredHours.forEach(hour => {
        if (!hour.matched_employees || hour.matched_employees.length === 0) return;
        const revenuePerEmp = (hour.total_revenue || 0) / hour.matched_employees.length;
        const ordersPerEmp = (hour.total_orders || 0) / hour.matched_employees.length;
        const storeId = hour.store_id;

        hour.matched_employees.forEach(emp => {
          const empId = emp.employee_id || emp.employee_name;
          if (!empId) return;
          const key = `${empId}__${storeId}`;
          if (!empStoreMap[key]) {
            empStoreMap[key] = { name: emp.employee_name || "N/A", id: emp.employee_id, storeId, revenue: 0, orders: 0 };
          }
          empStoreMap[key].revenue += revenuePerEmp;
          empStoreMap[key].orders += ordersPerEmp;
        });
      });

      return empStoreMap;
    };

    const curMap = calcEmployeesByStore(weekStart, weekEnd);
    const prevMap = calcEmployeesByStore(prevWeek.start, prevWeek.end);

    // Build rows: one per employee per primary store
    const rows = [];
    
    // Group current data by employee
    const empDataByName = {};
    Object.values(curMap).forEach(entry => {
      const empKey = (entry.name || "").trim().toLowerCase();
      if (!empDataByName[empKey]) empDataByName[empKey] = {};
      empDataByName[empKey][entry.storeId] = entry;
    });

    // Group prev data by employee
    const prevDataByName = {};
    Object.values(prevMap).forEach(entry => {
      const empKey = (entry.name || "").trim().toLowerCase();
      if (!prevDataByName[empKey]) prevDataByName[empKey] = {};
      prevDataByName[empKey][entry.storeId] = entry;
    });

    // For each cassiere (non-CM), create one row per primary store
    const processedEmployees = new Set();
    Object.values(curMap).forEach(entry => {
      const empKey = (entry.name || "").trim().toLowerCase();
      if (processedEmployees.has(empKey)) return;
      processedEmployees.add(empKey);

      // Skip non-cassiere
      if (!cassiereSet.has(empKey)) return;
      // Skip CM employees
      if (cmSet.has(empKey)) return;

      const primaryStoreIds = employeePrimaryStoresMap[empKey] || [];
      const storesToShow = primaryStoreIds.length > 0 ? primaryStoreIds : [null];

      storesToShow.forEach(storeId => {
        // Calculate AOV for this employee in this specific store
        let revenue = 0, orders = 0;
        if (storeId) {
          // Only data for this store
          const storeEntry = (empDataByName[empKey] || {})[storeId];
          if (storeEntry) {
            revenue = storeEntry.revenue;
            orders = storeEntry.orders;
          }
        } else {
          // No primary store assigned, sum all stores
          Object.values(empDataByName[empKey] || {}).forEach(e => {
            revenue += e.revenue;
            orders += e.orders;
          });
        }

        const aov = orders > 0 ? revenue / orders : null;
        if (aov == null) return;

        // Previous week for same store
        let prevRevenue = 0, prevOrders = 0;
        if (storeId) {
          const prevEntry = (prevDataByName[empKey] || {})[storeId];
          if (prevEntry) { prevRevenue = prevEntry.revenue; prevOrders = prevEntry.orders; }
        } else {
          Object.values(prevDataByName[empKey] || {}).forEach(e => {
            prevRevenue += e.revenue;
            prevOrders += e.orders;
          });
        }
        const prevAov = prevOrders > 0 ? prevRevenue / prevOrders : null;
        const delta = aov != null && prevAov != null ? ((aov - prevAov) / prevAov) * 100 : null;

        // Target for this specific store
        const empTarget = storeId && targetByStore[storeId] != null ? targetByStore[storeId] : null;
        const deltaVsTarget = aov != null && empTarget != null ? ((aov - empTarget) / empTarget) * 100 : null;
        const storeName = storeId ? (storeIdToName[storeId] || storeId) : null;

        rows.push({
          name: entry.name,
          id: entry.id,
          storeId,
          storeName,
          revenue,
          orders,
          aov,
          prevAov,
          delta,
          empTarget,
          deltaVsTarget,
          rowKey: `${empKey}_${storeId || "all"}`
        });
      });
    });

    return rows.sort((a, b) => b.aov - a.aov);
  }, [revenueByHour, weekStart, weekEnd, prevWeek, filterStore, cassiereSet, cmSet, employeePrimaryStoresMap, storeIdToName, targetByStore]);

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
          <Users className="w-5 h-5 text-purple-600" />
          AOV Settimanale per Cassiere
        </h3>
        <div className="flex items-center gap-3">
          <select
            value={filterStore}
            onChange={e => setFilterStore(e.target.value)}
            className="neumorphic-pressed px-3 py-1.5 rounded-xl outline-none text-sm"
          >
            <option value="all">Tutti i locali</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(w => w - 1)} className="neumorphic-flat p-1.5 rounded-lg">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-xs font-medium text-slate-600 whitespace-nowrap">{dateRange}</span>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              disabled={weekOffset >= 1}
              className="neumorphic-flat p-1.5 rounded-lg disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-3">
        Target mese: <strong>{moment(weekStart).format("MMMM YYYY")}</strong> (dal lunedì della settimana)
      </p>

      {employeeData.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Nessun cassiere con dati per questa settimana</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-purple-500">
                <th className="text-left p-2 text-slate-600 text-xs font-medium">#</th>
                <th className="text-left p-2 text-slate-600 text-xs font-medium">Cassiere</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">Revenue</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">Ordini</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">AOV</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">Target</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">Δ vs Target</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">AOV sett. prec.</th>
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
                      <span className="block text-[10px] text-slate-400">
                        {emp.storeName}
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-right text-sm text-slate-600">€{emp.revenue.toFixed(0)}</td>
                  <td className="p-2 text-right text-sm text-slate-600">{Math.round(emp.orders)}</td>
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