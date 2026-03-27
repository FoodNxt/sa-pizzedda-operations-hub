import React, { useMemo } from "react";
import { Package, AlertTriangle } from "lucide-react";

export function useOrderArrivalDetection(ordine, inventory, inventoryCantina) {
  return useMemo(() => {
    if (!ordine?.data_invio || !ordine?.prodotti) return [];
    
    const allInv = [...(inventory || []), ...(inventoryCantina || [])];
    const dataInvio = new Date(ordine.data_invio);
    const risultati = [];
    
    ordine.prodotti.forEach((prod) => {
      if (prod.quantita_ordinata <= 0) return;
      
      const readings = allInv
        .filter((r) => r.prodotto_id === prod.prodotto_id && r.store_id === ordine.store_id)
        .sort((a, b) => new Date(a.data_rilevazione) - new Date(b.data_rilevazione));
      
      if (readings.length < 2) return;
      
      const readingsBeforeOrder = readings.filter((r) => new Date(r.data_rilevazione) <= dataInvio);
      const readingsAfterOrder = readings.filter((r) => new Date(r.data_rilevazione) > dataInvio);
      
      if (readingsBeforeOrder.length === 0 || readingsAfterOrder.length === 0) return;
      
      const lastBefore = readingsBeforeOrder[readingsBeforeOrder.length - 1];
      const lastAfter = readingsAfterOrder[readingsAfterOrder.length - 1];
      
      if ((lastAfter.quantita_rilevata || 0) > (lastBefore.quantita_rilevata || 0)) {
        risultati.push({
          nome: prod.nome_prodotto,
          prima: lastBefore.quantita_rilevata,
          dopo: lastAfter.quantita_rilevata,
          unita: prod.unita_misura
        });
      }
    });
    
    return risultati;
  }, [ordine, inventory, inventoryCantina]);
}

export default function OrderArrivalAlert({ ordine, inventory, inventoryCantina }) {
  const prodottiAumentati = useOrderArrivalDetection(ordine, inventory, inventoryCantina);

  if (prodottiAumentati.length === 0) return null;

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-400 rounded-xl shadow-lg animate-pulse-slow relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500" />
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 shadow-md">
          <AlertTriangle className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-orange-900 text-base">⚠️ Possibile arrivo ordine NON SEGNATO</p>
          <p className="text-sm text-orange-800 mb-2 font-medium">
            Inventario aumentato dopo l'invio per {prodottiAumentati.length} prodott{prodottiAumentati.length === 1 ? 'o' : 'i'}:
          </p>
          <div className="space-y-1 bg-white bg-opacity-60 rounded-lg p-2">
            {prodottiAumentati.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Package className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
                <span className="text-orange-800 font-medium">{p.nome}:</span>
                <span className="text-red-700 font-bold">{p.prima} → {p.dopo} {p.unita}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-orange-700 mt-2 italic">
            Conferma la ricezione dell'ordine per risolvere questo avviso.
          </p>
        </div>
      </div>
    </div>
  );
}