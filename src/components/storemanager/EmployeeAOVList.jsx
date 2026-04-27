import React, { useState, useMemo } from "react";
import { Users, Store, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
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

  const employeeData = useMemo(() => {
    const inRange = (dateVal, rangeStart, rangeEnd) => {
      if (!dateVal) return false;
      const d = moment(dateVal);
      return d.isValid() && d.isBetween(rangeStart, rangeEnd, "day", "[]");
    };

    const calcEmployees = (rangeStart, rangeEnd) => {
      const empMap = {};
      const filteredHours = revenueByHour.filter(r => {
        if (!inRange(r.order_date, rangeStart, rangeEnd)) return false;
        if (filterStore !== "all" && r.store_id !== filterStore) return false;
        return true;
      });

      filteredHours.forEach(hour => {
        if (!hour.matched_employees || hour.matched_employees.length === 0) return;
        const revenuePerEmp = (hour.total_revenue || 0) / hour.matched_employees.length;
        const ordersPerEmp = (hour.total_orders || 0) / hour.matched_employees.length;

        hour.matched_employees.forEach(emp => {
          const key = emp.employee_id || emp.employee_name;
          if (!key) return;
          if (!empMap[key]) {
            empMap[key] = { name: emp.employee_name || "N/A", id: emp.employee_id, revenue: 0, orders: 0 };
          }
          empMap[key].revenue += revenuePerEmp;
          empMap[key].orders += ordersPerEmp;
        });
      });

      return empMap;
    };

    const curMap = calcEmployees(weekStart, weekEnd);
    const prevMap = calcEmployees(prevWeek.start, prevWeek.end);

    const employees = Object.values(curMap)
      .map(emp => {
        const aov = emp.orders > 0 ? emp.revenue / emp.orders : null;
        const prev = prevMap[emp.id || emp.name];
        const prevAov = prev && prev.orders > 0 ? prev.revenue / prev.orders : null;
        const delta = aov != null && prevAov != null ? ((aov - prevAov) / prevAov) * 100 : null;
        return { ...emp, aov, prevAov, delta };
      })
      .filter(e => e.aov != null)
      .sort((a, b) => b.aov - a.aov);

    return employees;
  }, [revenueByHour, weekStart, weekEnd, prevWeek, filterStore]);

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
          AOV Settimanale per Dipendente
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

      {employeeData.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Nessun dato dipendente per questa settimana</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-purple-500">
                <th className="text-left p-2 text-slate-600 text-xs font-medium">#</th>
                <th className="text-left p-2 text-slate-600 text-xs font-medium">Dipendente</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">Revenue</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">Ordini</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">AOV</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">AOV sett. prec.</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">Δ %</th>
              </tr>
            </thead>
            <tbody>
              {employeeData.map((emp, idx) => (
                <tr key={emp.id || emp.name} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-2 text-sm text-slate-400 font-bold">{idx + 1}</td>
                  <td className="p-2 text-sm font-medium text-slate-700">{emp.name}</td>
                  <td className="p-2 text-right text-sm text-slate-600">€{emp.revenue.toFixed(0)}</td>
                  <td className="p-2 text-right text-sm text-slate-600">{Math.round(emp.orders)}</td>
                  <td className="p-2 text-right text-sm font-bold text-slate-800">€{emp.aov.toFixed(2)}</td>
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