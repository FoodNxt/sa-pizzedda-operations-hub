import React from 'react';
import VerificaRiga from './VerificaRiga';

// Prodotti nell'ordine del giro, con l'intestazione ogni volta che cambia la zona. confermati = { item_id: { quantita, ora } }.
// bloccata = bozza scaduta: le righe non si modificano
export default function VerificaLista({ righe, confermati, bloccata, onConferma, onModifica }) {
  const zone = [];
  righe.forEach((r) => {
    const ultima = zone[zone.length - 1];
    if (ultima?.nome === r.zona) ultima.righe.push(r);
    else zone.push({ nome: r.zona, righe: [r] });
  });

  return (
    <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-slate-200">
      {zone.map((zona, i) => (
        <div key={i}>
          <p className="sticky top-0 z-10 bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">{zona.nome}</p>
          {zona.righe.map((r) => (
            <VerificaRiga
              key={r.item_id}
              r={r}
              confermato={confermati[r.item_id]}
              bloccata={bloccata}
              onConferma={(quantita) => onConferma(r.item_id, quantita)}
              onModifica={() => onModifica(r.item_id)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}