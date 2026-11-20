import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { numeroIt } from '@/components/trasporti/trasportiUtils';
import RigaCollegamento, { TIPI } from './RigaCollegamento';
import { frazione } from './posUtils';

const blu = 'bg-blue-600 hover:bg-blue-700 text-white';

// Un prodotto venduto dal POS con il suo collegamento: rosso finché non è confermato
export default function ProdottoPOSCard({ prodotto, salvato, proposta, peso, ricette, materie, creaRicettaUrl, onSalva }) {
  const [riga, setRiga] = useState(null);
  const [busy, setBusy] = useState(false);
  const elenchi = { ricetta: ricette, materia_prima: materie };
  // Bevande e confezionati si collegano direttamente a una materia prima
  const vuota = { tipo: prodotto.isPizza ? 'ricetta' : 'materia_prima', item_id: '', quantita_per_pezzo: 1 };
  const descrivi = (r) => (r.tipo === 'ignora'
    ? 'Menu: conta solo il suo contenuto'
    : `${TIPI[r.tipo]}: ${elenchi[r.tipo].find((x) => x.id === r.item_id)?.nome_prodotto || '—'} × ${r.tipo === 'materia_prima' ? frazione(r.quantita_per_pezzo) : numeroIt(Number(r.quantita_per_pezzo))}`);
  const valida = riga && (riga.tipo === 'ignora' || (riga.item_id && Number(riga.quantita_per_pezzo) > 0));
  const ricettaEsistente = proposta?.tipo === 'ricetta';

  const salva = async (r) => {
    setBusy(true);
    await onSalva(r);
    setBusy(false);
    setRiga(null);
  };

  return (
    <div className={`rounded-xl border p-3 space-y-3 ${salvato ? 'border-slate-200' : 'border-red-300 bg-red-50'}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex-1 min-w-[12rem]">
          <div className="font-semibold text-slate-900">{prodotto.nome}</div>
          <div className="text-xs text-slate-500">{numeroIt(prodotto.pezzi, 0)} pezzi · € {numeroIt(prodotto.fatturato, 0)}</div>
        </div>
        <div className={`text-sm ${salvato ? 'text-slate-700' : 'text-red-700 font-semibold'}`}>
          {salvato ? descrivi(salvato) : `Senza collegamento · ${numeroIt(peso, 1)}% del fatturato`}
          {!salvato && proposta && <span className="block font-normal">Proposto: {descrivi(proposta)}</span>}
        </div>
        {!riga && (
          <div className="flex flex-wrap gap-2">
            {!salvato && proposta && (
              <Button size="sm" className={blu} disabled={busy} onClick={() => salva(proposta)}>
                <Check className="w-4 h-4 mr-1" />
                {ricettaEsistente ? 'Collega a ricetta esistente' : 'Conferma'}
              </Button>
            )}
            {!salvato && !ricettaEsistente && (
              <Button asChild size="sm" variant="outline">
                <Link to={creaRicettaUrl}>
                  <Plus className="w-4 h-4 mr-1" />
                  Crea ricetta
                </Link>
              </Button>
            )}
            {!salvato && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => salva({ tipo: 'ignora', quantita_per_pezzo: 1 })}>
                È un menu
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setRiga({ ...vuota, ...(salvato || proposta) })}>
              <Pencil className="w-4 h-4 mr-1" />
              {salvato ? 'Modifica' : 'Collega'}
            </Button>
          </div>
        )}
      </div>

      {riga && (
        <div className="space-y-2">
          <RigaCollegamento riga={riga} opzioni={elenchi[riga.tipo] || []} onChange={(patch) => setRiga({ ...riga, ...patch })} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setRiga(null)}>Annulla</Button>
            <Button size="sm" className={blu} disabled={busy || !valida} onClick={() => salva(riga)}>
              {busy ? 'Salvataggio…' : 'Salva'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}