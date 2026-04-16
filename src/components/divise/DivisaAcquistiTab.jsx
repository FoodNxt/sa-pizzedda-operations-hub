import React from "react";
import NeumorphicCard from "@/components/neumorphic/NeumorphicCard";
import { ShoppingCart, Shirt } from "lucide-react";

const TAGLIE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

export default function DivisaAcquistiTab({
  activeEmployees, contratti, consegne, config
}) {
  const elementi = config?.elementi_divisa || [];
  const dotazione = config?.dotazione_per_gruppo || {};

  // Build: for each element + taglia, how many are still needed
  const needed = {}; // { elemento: { taglia: count } }

  activeEmployees.forEach(emp => {
    if (emp.divisa_non_necessaria) return;

    const userContratti = contratti.filter(c => c.user_id === emp.id || c.user_email === emp.email);
    const latest = userContratti.sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))[0];
    const gruppo = latest?.employee_group || emp.employee_group;
    const taglia = latest?.taglia_maglietta || "N/D";

    if (!gruppo || !dotazione[gruppo]) return;

    // Get delivered
    const empConsegne = consegne.filter(c => c.dipendente_id === emp.id && !c.riconsegnato);
    const delivered = {};
    empConsegne.forEach(c => {
      (c.elementi_consegnati || []).forEach(el => {
        delivered[el.elemento_nome] = (delivered[el.elemento_nome] || 0) + (el.quantita || 1);
      });
    });

    elementi.forEach(el => {
      const exp = dotazione[gruppo][el] || 0;
      const del = delivered[el] || 0;
      const missing = Math.max(0, exp - del);
      if (missing > 0) {
        if (!needed[el]) needed[el] = {};
        needed[el][taglia] = (needed[el][taglia] || 0) + missing;
      }
    });
  });

  // Collect all taglie used
  const allTaglie = new Set();
  Object.values(needed).forEach(taglieMap => {
    Object.keys(taglieMap).forEach(t => allTaglie.add(t));
  });
  const sortedTaglie = TAGLIE_ORDER.filter(t => allTaglie.has(t));
  // Add any non-standard taglie (like "N/D")
  allTaglie.forEach(t => { if (!sortedTaglie.includes(t)) sortedTaglie.push(t); });

  const totalPezzi = Object.values(needed).reduce((sum, taglieMap) => {
    return sum + Object.values(taglieMap).reduce((s, v) => s + v, 0);
  }, 0);

  const hasData = Object.keys(needed).length > 0;

  return (
    <div className="space-y-4">
      <NeumorphicCard className="p-4">
        <div className="flex items-center gap-3 mb-1">
          <ShoppingCart className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800">Divise da Acquistare</h3>
        </div>
        <p className="text-sm text-slate-500">
          Riepilogo pezzi mancanti da acquistare, raggruppati per taglia.
          {totalPezzi > 0 && <span className="font-bold text-indigo-600 ml-1">Totale: {totalPezzi} pezzi</span>}
        </p>
      </NeumorphicCard>

      {!hasData ? (
        <NeumorphicCard className="p-8 text-center">
          <Shirt className="w-12 h-12 text-green-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Tutte le divise sono state consegnate!</p>
          <p className="text-sm text-slate-400">Nessun acquisto necessario al momento.</p>
        </NeumorphicCard>
      ) : (
        <NeumorphicCard className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 text-slate-600 font-medium">Elemento</th>
                {sortedTaglie.map(t => (
                  <th key={t} className="text-center py-2 px-3 text-slate-600 font-medium">{t}</th>
                ))}
                <th className="text-center py-2 px-3 text-slate-700 font-bold">Totale</th>
              </tr>
            </thead>
            <tbody>
              {elementi.filter(el => needed[el]).map(el => {
                const taglieMap = needed[el] || {};
                const rowTotal = Object.values(taglieMap).reduce((s, v) => s + v, 0);
                return (
                  <tr key={el} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-medium text-slate-800">{el}</td>
                    {sortedTaglie.map(t => (
                      <td key={t} className="py-2.5 px-3 text-center">
                        {taglieMap[t] ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-sm">
                            {taglieMap[t]}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">
                        {rowTotal}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300">
                <td className="py-2.5 px-3 font-bold text-slate-800">Totale</td>
                {sortedTaglie.map(t => {
                  const colTotal = elementi.reduce((sum, el) => sum + ((needed[el] || {})[t] || 0), 0);
                  return (
                    <td key={t} className="py-2.5 px-3 text-center font-bold text-slate-700">
                      {colTotal > 0 ? colTotal : "-"}
                    </td>
                  );
                })}
                <td className="py-2.5 px-3 text-center">
                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-indigo-600 text-white font-bold text-sm">
                    {totalPezzi}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </NeumorphicCard>
      )}
    </div>
  );
}