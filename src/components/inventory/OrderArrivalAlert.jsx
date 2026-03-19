import React, { useMemo } from "react";
import { Package } from "lucide-react";

export default function OrderArrivalAlert({ ordine, inventory, inventoryCantina }) {
  const prodottiAumentati = useMemo(() => {
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

  if (prodottiAumentati.length === 0) return null;

  return (
    <div className="mb-3 p-3 bg-purple-50 border border-purple-300 rounded-lg">
      <div className="flex items-start gap-2">
        <Package className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-purple-800 text-sm">📦 Possibile arrivo ordine non segnato</p>
          <p className="text-xs text-purple-700 mb-1">
            Inventario aumentato dopo l'invio per {prodottiAumentati.length} prodott{prodottiAumentati.length === 1 ? 'o' : 'i'}:
          </p>
          <div className="space-y-0.5">
            {prodottiAumentati.map((p, i) => (
              <p key={i} className="text-xs text-purple-600">
                • {p.nome}: {p.prima} → {p.dopo} {p.unita}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}