import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Package, Search, Ban } from "lucide-react";
import { Input } from "@/components/ui/input";
import NeumorphicCard from "@/components/neumorphic/NeumorphicCard";

export default function DivisaEmployeeTable({
  employees, contratti, uscite, consegne, config, onOpenConsegna, onToggleNonNecessaria, users
}) {
  const [search, setSearch] = useState("");
  const [filterGruppo, setFilterGruppo] = useState("all");
  const [filterTaglia, setFilterTaglia] = useState("all");

  const elementi = config?.elementi_divisa || ["Maglietta", "Pantaloni", "Grembiule", "Bandana"];
  const dotazione = config?.dotazione_per_gruppo || {};

  // Build user map by name (lowercase) for employee_group from User entity (source of truth)
  const userByName = {};
  (users || []).forEach(u => {
    const name = (u.nome_cognome || u.full_name || "").trim().toLowerCase();
    if (name) userByName[name] = u;
  });

  // Active employees (not exited) - Uscita.dipendente_id is the User ID, match against both emp.id and emp.employee_id_external
  const usciteIds = new Set(uscite.map(u => u.dipendente_id));
  const activeEmployees = employees.filter(e => e.status === "active" && !usciteIds.has(e.id) && !usciteIds.has(e.employee_id_external));

  // Get employee contract info - match by employee_id_external (User ID), emp.id, or email
  const getContractInfo = (emp) => {
    const userContratti = contratti.filter(c => 
      c.user_id === emp.employee_id_external || c.user_id === emp.id || c.user_email === emp.email
    );
    const latest = userContratti.sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))[0];
    return latest;
  };

  // Get display name: prefer contract nome_cognome > Employee full_name
  const getDisplayName = (emp) => {
    const contract = getContractInfo(emp);
    return contract?.nome_cognome || contract?.user_nome_cognome || emp.full_name || emp.email || "N/A";
  };

  // Get deliveries for an employee
  const getDeliveries = (empId) => {
    return consegne.filter(c => c.dipendente_id === empId && !c.riconsegnato);
  };

  // Calculate delivered quantities
  const getDeliveredQty = (empId) => {
    const empConsegne = getDeliveries(empId);
    const totals = {};
    empConsegne.forEach(c => {
      (c.elementi_consegnati || []).forEach(el => {
        totals[el.elemento_nome] = (totals[el.elemento_nome] || 0) + (el.quantita || 1);
      });
    });
    return totals;
  };

  // Get employee group: User entity is source of truth, fallback to contract
  const getGruppo = (emp) => {
    const empNameLower = (emp.full_name || "").trim().toLowerCase();
    const userData = userByName[empNameLower];
    if (userData?.employee_group) return userData.employee_group;
    const contract = getContractInfo(emp);
    return contract?.employee_group || emp.employee_group;
  };

  // Check if employee has all expected items
  const getCompletionStatus = (emp) => {
    const gruppo = getGruppo(emp);
    if (!gruppo || !dotazione[gruppo]) return { complete: false, missing: elementi, delivered: {} };

    const expected = dotazione[gruppo];
    const delivered = getDeliveredQty(emp.id);
    const missing = [];

    elementi.forEach(el => {
      const exp = expected[el] || 0;
      const del = delivered[el] || 0;
      if (exp > 0 && del < exp) missing.push(el);
    });

    return { complete: missing.length === 0, missing, delivered, expected, gruppo };
  };

  // Apply filters
  const filtered = activeEmployees.filter(emp => {
    if (search) {
      const s = search.toLowerCase();
      const displayName = getDisplayName(emp);
      if (!displayName.toLowerCase().includes(s)) return false;
    }
    const gruppo = getGruppo(emp);
    if (filterGruppo !== "all" && gruppo !== filterGruppo) return false;
    if (filterTaglia === "missing") {
      const taglia = contract?.taglia_maglietta;
      if (taglia) return false;
    }
    if (filterTaglia === "present") {
      const taglia = contract?.taglia_maglietta;
      if (!taglia) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <NeumorphicCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca dipendente..."
              className="pl-9 h-9"
            />
          </div>
          <select
            value={filterGruppo}
            onChange={e => setFilterGruppo(e.target.value)}
            className="h-9 px-3 rounded-lg border text-sm bg-white"
          >
            <option value="all">Tutti i gruppi</option>
            <option value="FT">FT - Full Time</option>
            <option value="PT">PT - Part Time</option>
            <option value="CM">CM - Contratto Misto</option>
          </select>
          <select
            value={filterTaglia}
            onChange={e => setFilterTaglia(e.target.value)}
            className="h-9 px-3 rounded-lg border text-sm bg-white"
          >
            <option value="all">Tutte le taglie</option>
            <option value="missing">Taglia mancante</option>
            <option value="present">Taglia inserita</option>
          </select>
        </div>
      </NeumorphicCard>

      {/* Table */}
      <NeumorphicCard className="p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2 text-slate-600 font-medium">Dipendente</th>
              <th className="text-center py-2 px-2 text-slate-600 font-medium">Gruppo</th>
              <th className="text-center py-2 px-2 text-slate-600 font-medium">Taglia</th>
              {elementi.map(el => (
                <th key={el} className="text-center py-2 px-2 text-slate-600 font-medium">{el}</th>
              ))}
              <th className="text-center py-2 px-2 text-slate-600 font-medium">Stato</th>
              <th className="text-center py-2 px-2 text-slate-600 font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => {
              const contract = getContractInfo(emp);
              const taglia = contract?.taglia_maglietta;
              const { complete, delivered, expected, gruppo } = getCompletionStatus(emp);

              const isNonNecessaria = emp.divisa_non_necessaria === true;

              return (
                <tr key={emp.id} className={`border-b last:border-0 hover:bg-slate-50 ${isNonNecessaria ? "opacity-50" : ""}`}>
                  <td className="py-2.5 px-2">
                    <span className="font-medium text-slate-800">{getDisplayName(emp)}</span>
                    {isNonNecessaria && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-slate-200 text-slate-500">Non necessaria</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {gruppo ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{gruppo}</span>
                    ) : (
                      <span className="text-slate-400 text-xs">N/A</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {taglia ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">{taglia}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
                        <AlertTriangle className="w-3 h-3" /> Mancante
                      </span>
                    )}
                  </td>
                  {elementi.map(el => {
                    const exp = (expected && expected[el]) || 0;
                    const del = (delivered && delivered[el]) || 0;
                    const isComplete = exp > 0 && del >= exp;
                    const isPartial = del > 0 && del < exp;
                    return (
                      <td key={el} className="py-2.5 px-2 text-center">
                        {exp > 0 ? (
                          <span className={`text-xs font-bold ${isComplete ? "text-green-600" : isPartial ? "text-amber-600" : "text-slate-400"}`}>
                            {del}/{exp}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-2 text-center">
                    {isNonNecessaria ? (
                      <Ban className="w-5 h-5 text-slate-400 mx-auto" />
                    ) : complete && gruppo ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" />
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {!isNonNecessaria && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => onOpenConsegna(emp, contract)}
                        >
                          <Package className="w-3 h-3" /> Consegna
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={isNonNecessaria ? "default" : "ghost"}
                        className={`h-7 text-xs gap-1 ${isNonNecessaria ? "bg-slate-600 hover:bg-slate-700 text-white" : "text-slate-500 hover:text-slate-700"}`}
                        onClick={() => onToggleNonNecessaria(emp.id, !isNonNecessaria)}
                        title={isNonNecessaria ? "Segna come necessaria" : "Segna come non necessaria"}
                      >
                        <Ban className="w-3 h-3" />
                        {isNonNecessaria ? "Riattiva" : "Non nec."}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={elementi.length + 5} className="py-8 text-center text-slate-400">
                  Nessun dipendente trovato
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </NeumorphicCard>
    </div>
  );
}