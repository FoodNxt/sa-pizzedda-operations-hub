import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import RigaConteggio from './RigaConteggio';
import ProdottoInPiu from './ProdottoInPiu';

// Righe raggruppate per zona, poi i prodotti aggiunti a mano
export default function ListaConteggio({ dati, extra, valori, onValore, onAggiungi, onRimuovi }) {
  const zone = [];
  dati.righe.forEach((r) => {
    const ultima = zone[zone.length - 1];
    if (ultima?.nome === r.zona) ultima.righe.push(r);
    else zone.push({ nome: r.zona, righe: [r] });
  });
  const aggiunti = new Set(extra.map((r) => r.item_id));

  return (
    <>
      {dati.gia_fatto ? (
        <NeumorphicCard className="p-6 text-center bg-green-50 border-2 border-green-400">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
          <h3 className="text-lg font-bold text-slate-800">Inventario già fatto oggi</h3>
          <p className="text-sm text-slate-600">Puoi solo contare un prodotto in più.</p>
        </NeumorphicCard>
      ) : dati.righe.length === 0 ? (
        <NeumorphicCard className="p-6 text-center">
          <h3 className="text-lg font-bold text-slate-800">Stasera non c'è niente da contare</h3>
        </NeumorphicCard>
      ) : (
        <p className="text-sm text-slate-600 px-1">Scrivi la quantità di ogni prodotto. Se non ce n'è, scrivi 0.</p>
      )}

      {zone.map((z) => (
        <NeumorphicCard key={z.nome} className="p-4 lg:p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">{z.nome}</h2>
          <div className="grid grid-cols-1 gap-3">
            {z.righe.map((r) => (
              <RigaConteggio key={r.item_id} riga={r} valore={valori[r.item_id]} onChange={(v) => onValore(r.item_id, v)} />
            ))}
          </div>
        </NeumorphicCard>
      ))}

      {extra.length > 0 && (
        <NeumorphicCard className="p-4 lg:p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Prodotti in più</h2>
          <div className="grid grid-cols-1 gap-3">
            {extra.map((r) => (
              <RigaConteggio key={r.item_id} riga={r} valore={valori[r.item_id]} onChange={(v) => onValore(r.item_id, v)} onRimuovi={() => onRimuovi(r.item_id)} />
            ))}
          </div>
        </NeumorphicCard>
      )}

      <ProdottoInPiu prodotti={dati.altri.filter((p) => !aggiunti.has(p.item_id))} onAggiungi={onAggiungi} />
    </>
  );
}