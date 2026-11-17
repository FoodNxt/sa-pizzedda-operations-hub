import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { numeroIt } from '@/components/trasporti/trasportiUtils';

// Condizioni per passare uno store da affiancamento ad attivo, dai dati del Confronto
export default function ChecklistAttivo({ dati }) {
  const voci = [
    {
      testo: 'Scarto medio sotto il 20%',
      valore: dati.scarto_medio_pct == null ? 'nessun dato' : `${numeroIt(dati.scarto_medio_pct, 1)}%`,
      ok: dati.scarto_medio_pct != null && dati.scarto_medio_pct < 20
    },
    {
      testo: 'Meno di 20 voci in media per sera',
      valore: dati.voci_previste_media == null ? 'nessun dato' : numeroIt(dati.voci_previste_media, 1),
      ok: dati.voci_previste_media != null && dati.voci_previste_media < 20
    },
    {
      testo: 'Nessun prodotto a zero non segnalato',
      valore: `${dati.a_zero_non_segnalati.length}`,
      ok: dati.a_zero_non_segnalati.length === 0
    },
    {
      testo: 'Almeno 21 giorni di affiancamento',
      valore: dati.giorni_affiancamento == null ? 'nessun dato' : `${dati.giorni_affiancamento} giorni`,
      ok: dati.giorni_affiancamento != null && dati.giorni_affiancamento >= 21
    }
  ];

  return (
    <ul className="space-y-1 text-sm">
      {voci.map((v) => (
        <li key={v.testo} className="flex items-center gap-2">
          {v.ok ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : <Circle className="w-4 h-4 text-slate-400 flex-shrink-0" />}
          <span className={v.ok ? 'text-slate-900' : 'text-slate-600'}>{v.testo}: <strong>{v.valore}</strong></span>
        </li>
      ))}
    </ul>
  );
}