import React, { useMemo } from "react";
import moment from "moment";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import { Users } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1"
];

export default function EmployeeWeeklyTicket({ revenueData }) {
  const { weeks, employeeNames, tableData, chartData } = useMemo(() => {
    if (!revenueData?.length) return { weeks: [], employeeNames: [], tableData: [], chartData: [] };

    // Aggregate by week + employee
    const byWeekEmp = {};
    revenueData.forEach(r => {
      const weekStart = moment(r.order_date).startOf("isoWeek").format("YYYY-MM-DD");
      (r.matched_employees || []).forEach(emp => {
        if (!emp.employee_name || emp.employee_name === "N/A") return;
        const name = emp.employee_name.trim();
        const key = `${weekStart}__${name}`;
        const share = (r.matched_employees || []).length;
        if (!byWeekEmp[key]) byWeekEmp[key] = { weekStart, name, rev: 0, ord: 0 };
        byWeekEmp[key].rev += (r.total_revenue || 0) / share;
        byWeekEmp[key].ord += (r.total_orders || 0) / share;
      });
    });

    const entries = Object.values(byWeekEmp);
    const weekSet = [...new Set(entries.map(e => e.weekStart))].sort();
    const empSet = [...new Set(entries.map(e => e.name))].sort();

    // Build lookup
    const lookup = {};
    entries.forEach(e => { lookup[`${e.weekStart}__${e.name}`] = e; });

    // Table rows = employees, columns = weeks
    const table = empSet.map(name => {
      const row = { name };
      let totalRev = 0, totalOrd = 0;
      weekSet.forEach(w => {
        const d = lookup[`${w}__${name}`];
        row[w] = d && d.ord > 0 ? parseFloat((d.rev / d.ord).toFixed(2)) : null;
        if (d) { totalRev += d.rev; totalOrd += d.ord; }
      });
      row._avg = totalOrd > 0 ? parseFloat((totalRev / totalOrd).toFixed(2)) : 0;
      return row;
    });

    // Sort by overall avg desc
    table.sort((a, b) => b._avg - a._avg);

    // Chart data = one point per week, one line per employee
    const chart = weekSet.map(w => {
      const point = { week: moment(w).format("DD/MM") };
      empSet.forEach(name => {
        const d = lookup[`${w}__${name}`];
        point[name] = d && d.ord > 0 ? parseFloat((d.rev / d.ord).toFixed(2)) : null;
      });
      return point;
    });

    return { weeks: weekSet, employeeNames: empSet, tableData: table, chartData: chart };
  }, [revenueData]);

  if (!weeks.length || !employeeNames.length) {
    return (
      <NeumorphicCard className="p-6 text-center">
        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Nessun dato dipendente disponibile per il periodo selezionato. Assicurati che i dati abbiano cassieri assegnati (matched_employees).</p>
      </NeumorphicCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <NeumorphicCard className="p-4 lg:p-6">
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Scontrino Medio Dipendente — Settimana per Settimana
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-blue-600">
                <th className="text-left p-2 text-slate-600 text-xs font-medium sticky left-0 bg-white z-10">Dipendente</th>
                {weeks.map(w => (
                  <th key={w} className="text-right p-2 text-slate-600 text-xs font-medium whitespace-nowrap">
                    {moment(w).format("DD/MM")} - {moment(w).endOf("isoWeek").format("DD/MM")}
                  </th>
                ))}
                <th className="text-right p-2 text-slate-600 text-xs font-medium font-bold">Media</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, idx) => (
                <tr key={row.name} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-2 text-sm font-medium text-slate-700 whitespace-nowrap sticky left-0 bg-white z-10">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                      {row.name}
                    </span>
                  </td>
                  {weeks.map((w, wi) => {
                    const val = row[w];
                    const prevW = wi > 0 ? weeks[wi - 1] : null;
                    const prevVal = prevW ? row[prevW] : null;
                    const diff = val !== null && prevVal !== null && prevVal > 0
                      ? ((val - prevVal) / prevVal) * 100
                      : null;
                    return (
                      <td key={w} className="p-2 text-right text-sm">
                        {val !== null ? (
                          <div>
                            <span className="font-bold text-slate-700">€{val.toFixed(2)}</span>
                            {diff !== null && (
                              <span className={`ml-1 text-xs ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-slate-400"}`}>
                                {diff > 0 ? "↑" : diff < 0 ? "↓" : "="}{Math.abs(diff).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-2 text-right text-sm font-bold text-blue-600">€{row._avg.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NeumorphicCard>

      {/* Chart */}
      <NeumorphicCard className="p-4 lg:p-6">
        <h3 className="text-base font-bold text-slate-800 mb-4">Trend Scontrino Medio per Dipendente</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v => `€${v}`} />
            <Tooltip formatter={(v) => v !== null ? `€${v.toFixed(2)}` : "—"} />
            <Legend />
            {tableData.slice(0, 10).map((row, idx) => (
              <Line
                key={row.name}
                type="monotone"
                dataKey={row.name}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        {tableData.length > 10 && (
          <p className="text-xs text-slate-400 mt-2 text-center">Mostrati i top 10 dipendenti nel grafico</p>
        )}
      </NeumorphicCard>
    </div>
  );
}