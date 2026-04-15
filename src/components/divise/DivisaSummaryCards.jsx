import React from "react";
import NeumorphicCard from "@/components/neumorphic/NeumorphicCard";
import { Shirt, Users, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function DivisaSummaryCards({
  activeEmployees, contratti, consegne, config, usciteIds
}) {
  const elementi = config?.elementi_divisa || [];
  const dotazione = config?.dotazione_per_gruppo || {};

  // Calculate totals needed
  const totalsNeeded = {};
  const totalsDelivered = {};
  elementi.forEach(el => { totalsNeeded[el] = 0; totalsDelivered[el] = 0; });

  let missingTaglia = 0;
  let completeCount = 0;

  activeEmployees.forEach(emp => {
    const userContratti = contratti.filter(c => c.user_id === emp.id || c.user_email === emp.email);
    const latest = userContratti.sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))[0];
    const gruppo = latest?.employee_group || emp.employee_group;
    if (!latest?.taglia_maglietta) missingTaglia++;

    if (gruppo && dotazione[gruppo]) {
      elementi.forEach(el => {
        totalsNeeded[el] += (dotazione[gruppo][el] || 0);
      });
    }

    // Delivered
    const empConsegne = consegne.filter(c => c.dipendente_id === emp.id && !c.riconsegnato);
    const delivered = {};
    empConsegne.forEach(c => {
      (c.elementi_consegnati || []).forEach(el => {
        delivered[el.elemento_nome] = (delivered[el.elemento_nome] || 0) + (el.quantita || 1);
      });
    });
    elementi.forEach(el => {
      totalsDelivered[el] += (delivered[el] || 0);
    });

    // Check complete
    if (gruppo && dotazione[gruppo]) {
      const allDone = elementi.every(el => {
        const exp = dotazione[gruppo][el] || 0;
        return exp === 0 || (delivered[el] || 0) >= exp;
      });
      if (allDone) completeCount++;
    }
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <NeumorphicCard className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5 text-blue-500" />
          <span className="text-xs text-slate-500">Dipendenti Attivi</span>
        </div>
        <p className="text-2xl font-bold text-slate-800">{activeEmployees.length}</p>
      </NeumorphicCard>

      <NeumorphicCard className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <span className="text-xs text-slate-500">Taglia Mancante</span>
        </div>
        <p className="text-2xl font-bold text-amber-600">{missingTaglia}</p>
      </NeumorphicCard>

      <NeumorphicCard className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <span className="text-xs text-slate-500">Divise Complete</span>
        </div>
        <p className="text-2xl font-bold text-green-600">{completeCount}/{activeEmployees.length}</p>
      </NeumorphicCard>

      <NeumorphicCard className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Shirt className="w-5 h-5 text-purple-500" />
          <span className="text-xs text-slate-500">Pezzi Necessari</span>
        </div>
        <p className="text-2xl font-bold text-purple-600">
          {elementi.reduce((s, el) => s + (totalsNeeded[el] || 0), 0)}
        </p>
      </NeumorphicCard>

      {/* Breakdown per elemento */}
      {elementi.map(el => (
        <NeumorphicCard key={el} className="p-3">
          <p className="text-xs text-slate-500 mb-1">{el}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-800">{totalsDelivered[el] || 0}</span>
            <span className="text-xs text-slate-400">/ {totalsNeeded[el] || 0} necessari</span>
          </div>
          <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${totalsNeeded[el] > 0 ? Math.min(100, ((totalsDelivered[el] || 0) / totalsNeeded[el]) * 100) : 0}%` }}
            />
          </div>
        </NeumorphicCard>
      ))}
    </div>
  );
}