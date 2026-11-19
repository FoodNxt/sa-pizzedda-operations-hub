import React from 'react';
import { giornoOra } from '@/components/inventario2/inv2Utils';
import { numeroIt } from '@/components/trasporti/trasportiUtils';

const segno = (n) => (n > 0 ? '+' : '');

// Differenza in unità e in percentuale: tuo conteggio meno il valore di confronto
function Differenza({ unita, pct }) {
  if (unita == null) return <span className="text-slate-400">—</span>;
  const oltre = Math.abs(pct) > 10;
  return (
    <span className={oltre ? 'font-semibold text-red-600' : 'text-slate-700'}>
      {segno(unita)}{numeroIt(unita, 2)}{pct != null && ` (${segno(pct)}${numeroIt(pct, 1)}%)`}
    </span>
  );
}

// Dopo il salvataggio: il conteggio dell'admin accanto alla stima e al valore atteso dall'ultimo conteggio dei dipendenti
export default function VerificaRisultato({ righe }) {
  return (
    <div className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-3 py-2 text-left">Prodotto</th>
            <th className="px-3 py-2 text-right">Tuo conteggio</th>
            <th className="px-3 py-2 text-right">Stima del sistema</th>
            <th className="px-3 py-2 text-right">Differenza</th>
            <th className="px-3 py-2 text-left">Ultimo conteggio dipendente</th>
            <th className="px-3 py-2 text-right">Teorico sottratto</th>
            <th className="px-3 py-2 text-right">Atteso</th>
            <th className="px-3 py-2 text-right">Scarto del dipendente</th>
          </tr>
        </thead>
        <tbody>
          {righe.map((r) => (
            <tr key={r.item_id} className="border-t border-slate-100">
              <td className="px-3 py-2 text-slate-800">{r.nome}</td>
              <td className="px-3 py-2 text-right font-semibold text-slate-900">
                {numeroIt(r.quantita, 2)} <span className="font-normal text-slate-500">{r.unita}</span>
                {r.ora && <div className="text-xs font-normal text-slate-500">{giornoOra(r.ora)}</div>}
              </td>
              <td className="px-3 py-2 text-right text-slate-700">{numeroIt(r.stima, 2)}</td>
              <td className="px-3 py-2 text-right"><Differenza unita={r.differenza_stima} pct={r.differenza_stima_pct} /></td>
              <td className="px-3 py-2 text-slate-700">
                {r.ultimo ? (
                  <>
                    {numeroIt(r.ultimo.quantita, 2)}
                    <div className="text-xs text-slate-500">{r.ultimo.nome || 'Senza nome'} · {giornoOra(r.ultimo.data)}</div>
                  </>
                ) : <span className="text-slate-400">Nessuno negli ultimi 60 giorni</span>}
              </td>
              <td className="px-3 py-2 text-right text-slate-700">
                {r.ultimo ? numeroIt(r.teorico_sottratto, 2) : '—'}
                {r.orario_stimato && <div className="text-xs text-amber-600">orario stimato</div>}
              </td>
              <td className="px-3 py-2 text-right text-slate-700">{numeroIt(r.atteso, 2)}</td>
              <td className="px-3 py-2 text-right"><Differenza unita={r.differenza_ultimo} pct={r.differenza_ultimo_pct} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}