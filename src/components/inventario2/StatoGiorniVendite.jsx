import React from 'react';
import { ultimi60 } from './useImportaVendite';

const STATI = {
  importato: { nome: 'Importato', classe: 'bg-green-100 text-green-800 border-green-300' },
  zero: { nome: '0 vendite', classe: 'bg-slate-100 text-slate-600 border-slate-300' },
  mancante: { nome: 'Non importato', classe: 'bg-red-100 text-red-800 border-red-300' }
};

const statoDi = (l) => (l?.esito !== 'ok' ? 'mancante' : l.righe > 0 ? 'importato' : 'zero');

export default function StatoGiorniVendite({ log }) {
  if (!log) return <div className="text-sm text-slate-500">Carico lo stato dei giorni…</div>;
  const giorni = ultimi60().reverse();
  const conta = (stato) => giorni.filter((g) => statoDi(log[g]) === stato).length;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        {Object.entries(STATI).map(([stato, s]) => (
          <span key={stato} className="flex items-center gap-1">
            <span className={`inline-block w-3 h-3 rounded border ${s.classe}`} />
            {s.nome}: {conta(stato)}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-6 sm:grid-cols-10 lg:grid-cols-[repeat(15,minmax(0,1fr))] gap-1">
        {giorni.map((g) => {
          const l = log[g];
          const s = STATI[statoDi(l)];
          const dettaglio = l?.esito === 'ok' ? `${l.righe} righe` : l?.errore || 'mai importato';
          return (
            <div key={g} title={`${g.slice(8)}/${g.slice(5, 7)} · ${s.nome} · ${dettaglio}`} className={`rounded border text-center text-xs py-1 ${s.classe}`}>
              {g.slice(8)}/{g.slice(5, 7)}
            </div>
          );
        })}
      </div>
    </div>
  );
}