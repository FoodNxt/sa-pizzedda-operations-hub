import React from 'react';
import moment from 'moment';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { numero } from '@/components/laboratorio/labUtils';

export const lunedi = (d) => moment(d).startOf('isoWeek').format('YYYY-MM-DD');

export const ultimeSettimane = (n = 6) =>
  Array.from({ length: n }, (_, i) => lunedi(moment().subtract(n - 1 - i, 'weeks')));

// righe: null mentre carica, poi [{ id, nome, unita, totali: { lunedì: quantità } }]
export default function TabellaSettimane({ titolo, intestazione, settimane, righe, vuoto }) {
  return (
    <NeumorphicCard className="p-5 space-y-3">
      <h2 className="text-lg font-bold text-slate-900">{titolo}</h2>
      {!righe ? (
        <p className="text-sm text-slate-500">Caricamento...</p>
      ) : righe.length === 0 ? (
        <p className="text-sm text-slate-500">{vuoto}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="py-2 pr-4 font-medium">{intestazione}</th>
                {settimane.map((s) => (
                  <th key={s} className="py-2 px-2 font-medium text-right whitespace-nowrap">dal {moment(s).format('DD/MM')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {righe.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="py-2 pr-4 font-medium text-slate-900 whitespace-nowrap">{r.nome} <span className="text-slate-400 font-normal">({r.unita})</span></td>
                  {settimane.map((s) => (
                    <td key={s} className="py-2 px-2 text-right text-slate-700">{r.totali[s] ? numero(r.totali[s]) : '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </NeumorphicCard>
  );
}