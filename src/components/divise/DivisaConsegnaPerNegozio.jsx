import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Store, Shirt, Package } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";

export default function DivisaConsegnaPerNegozio({ activeEmployees, contratti, consegne, config }) {
  const { data: users = [] } = useQuery({
    queryKey: ["users-divise-consegna"],
    queryFn: () => base44.entities.User.list()
  });

  const { data: stores = [] } = useQuery({
    queryKey: ["stores-divise-consegna"],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: uscite = [] } = useQuery({
    queryKey: ["uscite-divise-consegna"],
    queryFn: () => base44.entities.Uscita.list()
  });

  const storeIdToName = useMemo(() => {
    const map = {};
    stores.forEach(s => { map[s.id] = s.name; });
    return map;
  }, [stores]);

  // Build uscite set (user IDs that have left)
  const usciteIds = useMemo(() => {
    const oggi = new Date().toISOString().split('T')[0];
    return new Set(uscite.filter(u => !u.data_uscita || u.data_uscita <= oggi).map(u => u.dipendente_id));
  }, [uscite]);

  // Build active dipendenti from User entity (source of truth) — not Employee
  const activeDipendenti = useMemo(() => {
    return users
      .filter(u => u.user_type === "dipendente" && u.status === "active" && !usciteIds.has(u.id))
      .map(u => ({
        id: u.id,
        full_name: u.nome_cognome || u.full_name || "",
        primaryStores: u.primary_stores || [],
        taglia: u.taglia_maglietta || null,
        employeeGroup: u.employee_group || null,
        divisa_non_necessaria: false // check from Employee entity
      }));
  }, [users, usciteIds]);

  // Build Employee map for divisa_non_necessaria flag
  const empNonNecessariaMap = useMemo(() => {
    const map = {};
    activeEmployees.forEach(e => {
      if (e.divisa_non_necessaria) {
        map[e.employee_id_external] = true;
        map[e.id] = true;
      }
    });
    return map;
  }, [activeEmployees]);

  // Get delivered quantities per employee
  const getDeliveredQty = (empId) => {
    const empConsegne = consegne.filter(c => c.dipendente_id === empId && !c.riconsegnato);
    const totals = {};
    empConsegne.forEach(c => {
      (c.elementi_consegnati || []).forEach(el => {
        const key = el.elemento_nome;
        totals[key] = (totals[key] || 0) + (el.quantita || 1);
      });
    });
    return totals;
  };

  // Calculate what each employee still needs
  const consegnaData = useMemo(() => {
    if (!config?.dotazione_per_gruppo || !config?.elementi_divisa) return [];

    const elementiDivisa = config.elementi_divisa || [];
    // store_id -> { elemento -> { taglia -> [{ dipendente, qty }] } }
    const storeMap = {};

    activeDipendenti.forEach(dip => {
      // Check divisa_non_necessaria from Employee entity
      if (empNonNecessariaMap[dip.id]) return;

      // Pick ONE primary store (first one)
      const primaryStoreId = dip.primaryStores.length > 0 ? dip.primaryStores[0] : null;
      if (!primaryStoreId) return;

      // Get employee group from User entity (source of truth), fallback to contract
      const contract = contratti.find(c => c.user_id === dip.id && c.status === "firmato");
      const group = dip.employeeGroup || contract?.employee_group || "FT";
      const dotazione = config.dotazione_per_gruppo?.[group] || {};

      // Get taglia from User entity — XS doesn't exist, map to S
      const rawTaglia = dip.taglia || "N/D";
      const taglia = rawTaglia === "XS" ? "S" : rawTaglia;

      // Items that don't have sizes (one-size-fits-all)
      const noSizeItems = ["bandana", "grembiule"];

      // Get what's already delivered — consegne use dipendente_id which could be User ID or Employee ID
      const delivered = getDeliveredQty(dip.id);

      // Calculate mancanti
      elementiDivisa.forEach(elNome => {
        const needed = dotazione[elNome] || 0;
        const have = delivered[elNome] || 0;
        const missing = needed - have;

        if (missing <= 0) return;

        const isNoSize = noSizeItems.includes(elNome.toLowerCase());
        const displayTaglia = isNoSize ? "Unica" : taglia;

        if (!storeMap[primaryStoreId]) storeMap[primaryStoreId] = {};
        if (!storeMap[primaryStoreId][elNome]) storeMap[primaryStoreId][elNome] = {};
        if (!storeMap[primaryStoreId][elNome][displayTaglia]) storeMap[primaryStoreId][elNome][displayTaglia] = [];

        storeMap[primaryStoreId][elNome][displayTaglia].push({
          nome: dip.full_name,
          qty: missing
        });
      });
    });

    // Convert to array sorted by store name
    const result = Object.entries(storeMap).map(([storeId, elementi]) => ({
      storeId,
      storeName: storeIdToName[storeId] || storeId,
      elementi: Object.entries(elementi).map(([elNome, taglie]) => ({
        nome: elNome,
        taglie: Object.entries(taglie).map(([taglia, dipendenti]) => ({
          taglia,
          totalQty: dipendenti.reduce((s, d) => s + d.qty, 0),
          dipendenti
        })).sort((a, b) => {
          const order = ["Unica", "S", "M", "L", "XL", "XXL"];
          return (order.indexOf(a.taglia) - order.indexOf(b.taglia)) || a.taglia.localeCompare(b.taglia);
        })
      })).sort((a, b) => a.nome.localeCompare(b.nome))
    })).sort((a, b) => a.storeName.localeCompare(b.storeName));

    return result;
  }, [activeDipendenti, consegne, contratti, config, empNonNecessariaMap, storeIdToName]);

  if (consegnaData.length === 0) {
    return (
      <NeumorphicCard className="p-8 text-center">
        <Package className="w-12 h-12 text-green-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-700 mb-1">Nessuna consegna necessaria</h3>
        <p className="text-sm text-slate-500">Tutti i dipendenti hanno ricevuto la dotazione completa, oppure non hanno un locale principale assegnato.</p>
      </NeumorphicCard>
    );
  }

  return (
    <div className="space-y-4">
      {consegnaData.map(store => (
        <NeumorphicCard key={store.storeId} className="p-4 lg:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-bold text-slate-800">{store.storeName}</h3>
          </div>

          <div className="space-y-4">
            {store.elementi.map(el => (
              <div key={el.nome} className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Shirt className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-slate-700">{el.nome}</h4>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left p-2 text-slate-500 font-medium">Taglia</th>
                        <th className="text-center p-2 text-slate-500 font-medium">Quantità</th>
                        <th className="text-left p-2 text-slate-500 font-medium">Dipendenti</th>
                      </tr>
                    </thead>
                    <tbody>
                      {el.taglie.map(t => (
                        <tr key={t.taglia} className="border-b border-slate-100">
                          <td className="p-2">
                            <span className="px-2 py-1 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs">
                              {t.taglia}
                            </span>
                          </td>
                          <td className="p-2 text-center font-bold text-slate-800">{t.totalQty}</td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-1">
                              {t.dipendenti.map((d, i) => (
                                <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                  {d.nome} ({d.qty})
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </NeumorphicCard>
      ))}
    </div>
  );
}