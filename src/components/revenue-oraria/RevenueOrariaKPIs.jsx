import React from "react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import { DollarSign, ShoppingCart, Receipt, TrendingUp, TrendingDown } from "lucide-react";

export default function RevenueOrariaKPIs({ metrics }) {
  if (!metrics) return null;

  const cards = [
    {
      label: "Fatturato Totale",
      value: `€${metrics.totalRevenue.toLocaleString("it-IT", { maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      label: "Ordini Totali",
      value: metrics.totalOrders.toLocaleString("it-IT"),
      icon: ShoppingCart,
      color: "text-blue-600"
    },
    {
      label: "Scontrino Medio",
      value: `€${metrics.globalAvgTicket.toFixed(2)}`,
      icon: Receipt,
      color: "text-purple-600"
    },
    {
      label: "Miglior Ora",
      value: metrics.bestHour ? `${metrics.bestHour.label} (€${metrics.bestHour.avgTicket.toFixed(2)})` : "-",
      icon: TrendingUp,
      color: "text-emerald-600"
    },
    {
      label: "Peggior Ora",
      value: metrics.worstHour ? `${metrics.worstHour.label} (€${metrics.worstHour.avgTicket.toFixed(2)})` : "-",
      icon: TrendingDown,
      color: "text-red-500"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(c => (
        <NeumorphicCard key={c.label} className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <c.icon className={`w-4 h-4 ${c.color}`} />
            <span className="text-xs text-slate-500">{c.label}</span>
          </div>
          <p className="font-bold text-slate-800 text-sm">{c.value}</p>
        </NeumorphicCard>
      ))}
    </div>
  );
}