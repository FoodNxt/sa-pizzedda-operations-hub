import React from "react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function RevenueOrariaCharts({ metrics }) {
  if (!metrics) return null;

  const { hourlyData, employeeData } = metrics;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Avg Ticket by Hour */}
      <NeumorphicCard className="p-4">
        <h3 className="font-bold text-slate-700 mb-3 text-sm">Scontrino Medio per Ora</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(v) => [`€${Number(v).toFixed(2)}`, '']}
              labelFormatter={(l) => `Ora: ${l}`}
            />
            <Bar dataKey="avgTicket" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Scontrino Medio" />
          </BarChart>
        </ResponsiveContainer>
      </NeumorphicCard>

      {/* Avg Ticket by Employee */}
      <NeumorphicCard className="p-4">
        <h3 className="font-bold text-slate-700 mb-3 text-sm">Scontrino Medio per Cassiere</h3>
        {employeeData.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Nessun cassiere abbinato</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={employeeData.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v) => [`€${Number(v).toFixed(2)}`, '']}
              />
              <Bar dataKey="avgTicket" fill="#10b981" radius={[0, 4, 4, 0]} name="Scontrino Medio" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </NeumorphicCard>
    </div>
  );
}