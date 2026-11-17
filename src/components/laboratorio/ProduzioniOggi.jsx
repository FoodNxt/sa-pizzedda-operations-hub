import React, { useState } from 'react';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { Button } from '@/components/ui/button';
import { dataCreazione, giorno, numero } from './labUtils';

const ORE_24 = 24 * 3600000;

export default function ProduzioniOggi({ produzioni, onAnnulla }) {
  const [annullando, setAnnullando] = useState(null);

  const annulla = async (p) => {
    if (!window.confirm(`Annullare la produzione di ${p.item_nome}?`)) return;
    setAnnullando(p.id);
    await onAnnulla(p);
    setAnnullando(null);
  };

  return (
    <NeumorphicCard className="p-4 space-y-3">
      <h2 className="text-lg font-bold text-slate-900">Registrate oggi da te</h2>
      {produzioni.length === 0 ? (
        <p className="text-sm text-slate-500">Nessuna produzione registrata oggi.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {produzioni.map((p) => {
            const annullabile = !p.annullata && Date.now() - dataCreazione(p).getTime() <= ORE_24;
            return (
              <li key={p.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className={`font-medium truncate ${p.annullata ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {p.item_nome} · {numero(p.quantita)} {p.unita}
                  </p>
                  <p className="text-xs text-slate-500">
                    Prodotto il {giorno(p.data_produzione)}{p.annullata ? ' · annullata' : ''}
                  </p>
                </div>
                {annullabile && (
                  <Button variant="outline" size="sm" className="shrink-0 text-red-600 border-red-200" disabled={annullando === p.id} onClick={() => annulla(p)}>
                    {annullando === p.id ? 'Annullo…' : 'Annulla'}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </NeumorphicCard>
  );
}