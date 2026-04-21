import React from "react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import { Filter } from "lucide-react";

export default function RevenueOrariaFilters({ stores, selectedStore, setSelectedStore, dateFrom, setDateFrom, dateTo, setDateTo }) {
  return (
    <NeumorphicCard className="p-4">
      <div className="flex flex-wrap items-center gap-4">
        <Filter className="w-4 h-4 text-slate-500" />
        <select
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
          className="text-sm border rounded-lg px-3 py-2"
        >
          <option value="all">Tutti i negozi</option>
          {stores.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Da:</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-sm border rounded-lg px-3 py-2" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">A:</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-sm border rounded-lg px-3 py-2" />
        </div>
      </div>
    </NeumorphicCard>
  );
}