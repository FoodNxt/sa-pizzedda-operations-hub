import React, { useState } from "react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import { Users, ChevronDown, ChevronUp, Trophy } from "lucide-react";

export default function RevenueOrariaEmployeeTable({ employeeData }) {
  const [sortField, setSortField] = useState("revenue");
  const [sortDir, setSortDir] = useState(-1);

  if (!employeeData || employeeData.length === 0) return null;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d * -1);
    } else {
      setSortField(field);
      setSortDir(-1);
    }
  };

  const sorted = [...employeeData].sort((a, b) => {
    const aVal = a[sortField] || 0;
    const bVal = b[sortField] || 0;
    if (typeof aVal === "string") return aVal.localeCompare(bVal) * sortDir;
    return (aVal - bVal) * sortDir;
  });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 1 ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  const thClass = "text-left py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors";

  const getMedal = (index) => {
    if (index === 0) return <Trophy className="w-4 h-4 text-yellow-500 inline mr-1" />;
    if (index === 1) return <Trophy className="w-4 h-4 text-slate-400 inline mr-1" />;
    if (index === 2) return <Trophy className="w-4 h-4 text-amber-700 inline mr-1" />;
    return null;
  };

  // Ranking based on current sort
  const bestAvgTicket = Math.max(...sorted.map(e => e.avgTicket));

  return (
    <NeumorphicCard className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
          <Users className="w-5 h-5 text-white" />
        </div>
        <h3 className="font-bold text-slate-800 text-base">Performance Dipendenti</h3>
        <span className="text-xs text-slate-400 ml-auto">{employeeData.length} dipendenti</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-left py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider w-8">#</th>
              <th className={thClass} onClick={() => handleSort("name")}>Dipendente <SortIcon field="name" /></th>
              <th className={thClass} onClick={() => handleSort("revenue")}>Fatturato <SortIcon field="revenue" /></th>
              <th className={thClass} onClick={() => handleSort("orders")}>Ordini <SortIcon field="orders" /></th>
              <th className={thClass} onClick={() => handleSort("avgTicket")}>Scontrino Medio <SortIcon field="avgTicket" /></th>
              <th className={thClass} onClick={() => handleSort("hours")}>Ore Coperte <SortIcon field="hours" /></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((emp, idx) => (
              <tr key={emp.name} className="border-b border-slate-100 hover:bg-blue-50/50 transition-colors">
                <td className="py-3 px-4 text-sm text-slate-500 font-medium">
                  {getMedal(idx) || (idx + 1)}
                </td>
                <td className="py-3 px-4 text-sm font-semibold text-slate-800">
                  {emp.name}
                </td>
                <td className="py-3 px-4 text-sm font-bold text-emerald-700">
                  €{emp.revenue.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-sm font-medium text-slate-700">
                  {Math.round(emp.orders)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${emp.avgTicket === bestAvgTicket ? 'text-blue-700' : 'text-slate-700'}`}>
                      €{emp.avgTicket.toFixed(2)}
                    </span>
                    <div className="flex-1 max-w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                        style={{ width: `${bestAvgTicket > 0 ? (emp.avgTicket / bestAvgTicket) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {emp.hours}h
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-50/50">
              <td className="py-3 px-4" colSpan={2}>
                <span className="text-sm font-bold text-slate-700">TOTALE</span>
              </td>
              <td className="py-3 px-4 text-sm font-bold text-emerald-700">
                €{employeeData.reduce((s, e) => s + e.revenue, 0).toFixed(2)}
              </td>
              <td className="py-3 px-4 text-sm font-bold text-slate-700">
                {Math.round(employeeData.reduce((s, e) => s + e.orders, 0))}
              </td>
              <td className="py-3 px-4 text-sm font-bold text-blue-700">
                €{(employeeData.reduce((s, e) => s + e.revenue, 0) / (employeeData.reduce((s, e) => s + e.orders, 0) || 1)).toFixed(2)}
              </td>
              <td className="py-3 px-4 text-sm font-bold text-slate-600">
                {employeeData.reduce((s, e) => s + e.hours, 0)}h
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </NeumorphicCard>
  );
}