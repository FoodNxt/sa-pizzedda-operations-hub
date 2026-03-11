import React from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NomeInternoStorageAssignment from "./NomeInternoStorageAssignment";

export default function NomiInterniTab({ products, stores, nomiInterniUnici }) {
  const queryClient = useQueryClient();

  // Build stats for all nomi interni
  const nomiInterniStats = {};
  nomiInterniUnici.forEach(nome => {
    nomiInterniStats[nome] = { count: 0, inUso: false, products: [] };
  });
  products.forEach(p => {
    if (!p.nome_interno) return;
    if (!nomiInterniStats[p.nome_interno]) {
      nomiInterniStats[p.nome_interno] = { count: 0, inUso: false, products: [] };
    }
    nomiInterniStats[p.nome_interno].count++;
    nomiInterniStats[p.nome_interno].products.push(p);
    if (p.in_uso_per_store && Object.values(p.in_uso_per_store).some(v => v)) {
      nomiInterniStats[p.nome_interno].inUso = true;
    }
  });

  const sorted = Object.entries(nomiInterniStats).sort(([a], [b]) => a.localeCompare(b, 'it'));

  return (
    <NeumorphicCard className="p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4">
        📋 Nomi Interni - Gestione
      </h2>
      <p className="text-sm text-slate-600 mb-6">
        Elenco di tutti i nomi interni utilizzati nelle materie prime
      </p>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-blue-600">
              <th className="text-left p-3 text-slate-600 font-medium">Nome Interno</th>
              <th className="text-center p-3 text-slate-600 font-medium">N° Prodotti</th>
              <th className="text-center p-3 text-slate-600 font-medium">In Uso</th>
              <th className="text-center p-3 text-slate-600 font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(([nomeInterno, stats]) => (
              <tr key={nomeInterno} className="border-b border-slate-200 hover:bg-slate-50">
                <td className="p-3">
                  <p className="font-medium text-slate-800">{nomeInterno}</p>
                  {stats.count > 0 && (
                    <NomeInternoStorageAssignment
                      nomeInterno={nomeInterno}
                      products={stats.products}
                      stores={stores}
                    />
                  )}
                </td>
                <td className="p-3 text-center">
                  {stats.count > 0 ? (
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                      {stats.count}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-sm">0</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  {stats.inUso ? (
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 font-bold text-xs">✓ Sì</span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs">No</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  {!stats.inUso && stats.count > 0 && (
                    <button
                      onClick={async () => {
                        if (!confirm(`Vuoi cancellare il nome interno "${nomeInterno}"?\n\nQuesto rimuoverà il nome interno da ${stats.count} prodotti.`)) return;
                        for (const product of stats.products) {
                          await base44.entities.MateriePrime.update(product.id, { nome_interno: '' });
                        }
                        queryClient.invalidateQueries({ queryKey: ['materie-prime'] });
                        alert('✓ Nome interno rimosso con successo');
                      }}
                      className="p-2 rounded-lg hover:bg-red-100 transition-colors"
                      title="Rimuovi nome interno da tutti i prodotti"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                  {!stats.inUso && stats.count === 0 && (
                    <span className="text-xs text-slate-400 italic">Solo da Prodotti Venduti</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </NeumorphicCard>
  );
}