import React from 'react';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { numeroIt } from '@/components/trasporti/trasportiUtils';

const COLONNE = ['Prodotto', 'Inserita', 'Stimata', 'Differenza', 'Diff. %', 'Affidabilità', 'Prossimo conteggio'];
const AFFIDABILITA = { ok: 'Ok', da_verificare: 'Da verificare', nessun_dato: 'Nessun dato' };
const giornoIt = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });

export default function RisultatoSimulazione({ righe }) {
  return (
    <NeumorphicCard className="p-4 lg:p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-1">Risultato della simulazione</h2>
      <p className="text-sm text-slate-500 mb-4">Cosa risulterebbe salvando adesso. Niente è stato scritto.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>{COLONNE.map((c) => <th key={c} className="text-left whitespace-nowrap">{c}</th>)}</tr>
          </thead>
          <tbody>
            {righe.map((r) => {
              const verifica = r.affidabilita === 'da_verificare';
              return (
                <tr key={r.item_id} className={verifica ? 'bg-amber-400/25 font-semibold' : ''}>
                  <td>{r.nome} <span className="text-xs opacity-70">{r.unita}</span></td>
                  <td>{numeroIt(r.quantita, 2)}</td>
                  <td>{numeroIt(r.giacenza_stimata, 2)}</td>
                  <td>{numeroIt(r.differenza, 2)}</td>
                  <td>{r.differenza_pct == null ? '—' : `${numeroIt(r.differenza_pct, 1)}%`}</td>
                  <td>
                    {verifica ? (
                      <span className="inline-block rounded-full bg-amber-500 text-white text-xs px-2 py-0.5">Da verificare</span>
                    ) : AFFIDABILITA[r.affidabilita]}
                  </td>
                  <td className="whitespace-nowrap">
                    {r.prossimo_conteggio_data ? `${giornoIt(r.prossimo_conteggio_data)} · ${r.prossimo_conteggio_motivo}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </NeumorphicCard>
  );
}