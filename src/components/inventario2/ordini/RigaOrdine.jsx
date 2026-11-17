import React from 'react';
import { X } from 'lucide-react';
import { numeroIt } from '@/components/trasporti/trasportiUtils';
import { copertura, euro } from './ordiniUtils';

const AFFIDABILITA = { ok: 'ok', da_verificare: 'da verificare', nessun_dato: 'nessun dato' };
const giorni = (n) => (n == null ? '—' : numeroIt(n, 1));

export default function RigaOrdine({ p, quantita, onQuantita, onRimuovi }) {
  return (
    <tr className="border-t border-slate-100 align-top">
      <td className="py-2 pr-3">
        <p className="font-medium text-slate-900">{p.nome}</p>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.etichetta === 'Sotto min' ? 'bg-red-100 text-red-800' : p.etichetta ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
          {p.etichetta || 'Aggiunto a mano'}
        </span>
      </td>
      <td className="py-2 pr-3 whitespace-nowrap">
        <p className="text-slate-900">{numeroIt(p.giacenza, 2)} {p.unita_conteggio}</p>
        <p className="text-xs text-slate-500">
          {p.ultimo_conteggio_data ? `contato il ${new Date(p.ultimo_conteggio_data).toLocaleDateString('it-IT')}` : 'mai contato'} · {AFFIDABILITA[p.affidabilita]}
        </p>
      </td>
      <td className="py-2 pr-3 whitespace-nowrap text-slate-700">{numeroIt(p.min, 2)} / {numeroIt(p.max, 2)}</td>
      <td className="py-2 pr-3 whitespace-nowrap text-slate-700">{numeroIt(p.in_arrivo, 2)}</td>
      <td className="py-2 pr-3 whitespace-nowrap text-slate-700">{giorni(copertura(p))} → {giorni(copertura(p, quantita || 0))}</td>
      <td className="py-2 pr-3 whitespace-nowrap">
        <input
          type="number"
          min="0"
          step="1"
          aria-label={`Quantità di ${p.nome}`}
          value={quantita}
          onChange={(e) => onQuantita(e.target.value === '' ? '' : Math.max(0, Math.round(Number(e.target.value))))}
          className="w-20 rounded-md border border-slate-200 px-2 py-1 text-right"
        />
        <span className="ml-1 text-slate-500">{p.unita_ordine}</span>
      </td>
      <td className="py-2 pr-3 whitespace-nowrap text-right text-slate-900">{euro(p.prezzo_unitario * (quantita || 0))}</td>
      <td className="py-2 text-right">
        <button type="button" onClick={onRimuovi} aria-label={`Rimuovi ${p.nome}`} className="p-1 text-slate-400 hover:text-red-600">
          <X className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}