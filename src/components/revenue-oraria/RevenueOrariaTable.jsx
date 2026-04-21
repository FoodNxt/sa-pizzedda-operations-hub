import React, { useState } from "react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function RevenueOrariaTable({ data }) {
  const [sortField, setSortField] = useState("order_date");
  const [sortDir, setSortDir] = useState(-1);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d * -1);
    } else {
      setSortField(field);
      setSortDir(-1);
    }
  };

  const sorted = [...data].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (sortField === "order_date") {
      aVal = `${a.order_date}_${String(a.order_hour).padStart(2, "0")}`;
      bVal = `${b.order_date}_${String(b.order_hour).padStart(2, "0")}`;
    }
    if (typeof aVal === "string") return aVal.localeCompare(bVal) * sortDir;
    return ((aVal || 0) - (bVal || 0)) * sortDir;
  });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 1 ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />;
  };

  const thClass = "text-left py-2 px-3 text-xs font-bold text-slate-600 cursor-pointer hover:text-blue-600";

  return (
    <NeumorphicCard className="p-4">
      <h3 className="font-bold text-slate-700 mb-3 text-sm">Dettaglio Orario ({data.length} record)</h3>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b">
              <th className={thClass} onClick={() => handleSort("order_date")}>Data <SortIcon field="order_date" /></th>
              <th className={thClass} onClick={() => handleSort("store_name")}>Store <SortIcon field="store_name" /></th>
              <th className={thClass} onClick={() => handleSort("order_hour")}>Ora <SortIcon field="order_hour" /></th>
              <th className={thClass} onClick={() => handleSort("total_revenue")}>Revenue <SortIcon field="total_revenue" /></th>
              <th className={thClass} onClick={() => handleSort("total_orders")}>Ordini <SortIcon field="total_orders" /></th>
              <th className={thClass} onClick={() => handleSort("avg_ticket")}>Scontrino <SortIcon field="avg_ticket" /></th>
              <th className="text-left py-2 px-3 text-xs font-bold text-slate-600">Cassiere</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className="border-b hover:bg-slate-50">
                <td className="py-2 px-3 text-xs">{r.order_date}</td>
                <td className="py-2 px-3 text-xs font-medium">{r.store_name}</td>
                <td className="py-2 px-3 text-xs">{String(r.order_hour).padStart(2, "0")}:00</td>
                <td className="py-2 px-3 text-xs">€{(r.total_revenue || 0).toFixed(2)}</td>
                <td className="py-2 px-3 text-xs">{r.total_orders || 0}</td>
                <td className="py-2 px-3 text-xs font-bold text-blue-700">€{(r.avg_ticket || 0).toFixed(2)}</td>
                <td className="py-2 px-3 text-xs">
                  {(r.matched_employees || []).length > 0
                    ? r.matched_employees.map(e => e.employee_name).join(", ")
                    : <span className="text-slate-400">N/A</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </NeumorphicCard>
  );
}