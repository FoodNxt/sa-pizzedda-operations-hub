import React, { useState } from 'react';
import { Check, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { numeroIt } from '@/components/trasporti/trasportiUtils';
import RigaCollegamento, { TIPI } from './RigaCollegamento';

const VUOTA = { tipo: 'ricetta', item_id: '', quantita_per_pezzo: 1 };
const blu = 'bg-blue-600 hover:bg-blue-700 text-white';

// Un prodotto venduto dal POS con il suo collegamento: rosso finché non è confermato
export default function ProdottoPOSCard({ prodotto, salvate, proposta, peso, ricette, materie, onSalva }) {
  const [righe, setRighe] = useState(null);
  const [busy, setBusy] = useState(false);
  const combo = prodotto.id.startsWith('combo_');
  const collegato = salvate.length > 0;
  const elenchi = { ricetta: ricette, materia_prima: materie };
  const descrivi = (r) => (r.tipo === 'ignora'
    ? 'Ignorato'
    : `${TIPI[r.tipo]}: ${elenchi[r.tipo].find((x) => x.id === r.item_id)?.nome_prodotto || '—'} × ${numeroIt(Number(r.quantita_per_pezzo))}`);
  const valide = righe?.every((r) => r.tipo === 'ignora' || (r.item_id && Number(r.quantita_per_pezzo) > 0));

  const salva = async (lista) => {
    setBusy(true);
    await onSalva(lista);
    setBusy(false);
    setRighe(null);
  };

  return (
    <div className={`rounded-xl border p-3 space-y-3 ${collegato ? 'border-slate-200' : 'border-red-300 bg-red-50'}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex-1 min-w-[12rem]">
          <div className="font-semibold text-slate-900">{prodotto.nome}</div>
          <div className="text-xs text-slate-500">
            {numeroIt(prodotto.pezzi, 0)} pezzi · € {numeroIt(prodotto.fatturato, 0)}{combo ? ' · combo' : ''}
          </div>
        </div>
        <div className={`text-sm ${collegato ? 'text-slate-700' : 'text-red-700 font-semibold'}`}>
          {collegato ? salvate.map(descrivi).join(' + ') : `Senza collegamento · ${numeroIt(peso, 1)}% del fatturato`}
          {!collegato && proposta && <span className="block font-normal">Proposto: {descrivi(proposta)}</span>}
        </div>
        {!righe && (
          <div className="flex gap-2">
            {!collegato && proposta && (
              <Button size="sm" className={blu} disabled={busy} onClick={() => salva([proposta])}>
                <Check className="w-4 h-4 mr-1" />
                Conferma
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setRighe(collegato ? salvate.map((r) => ({ ...VUOTA, ...r })) : [proposta || VUOTA])}>
              <Pencil className="w-4 h-4 mr-1" />
              {collegato ? 'Modifica' : 'Collega'}
            </Button>
          </div>
        )}
      </div>

      {righe && (
        <div className="space-y-2">
          {righe.map((r, i) => (
            <RigaCollegamento
              key={i}
              riga={r}
              opzioni={elenchi[r.tipo] || []}
              onChange={(patch) => setRighe(righe.map((x, j) => (j === i ? { ...x, ...patch } : x)))}
              onRimuovi={righe.length > 1 ? () => setRighe(righe.filter((_, j) => j !== i)) : null}
            />
          ))}
          <div className="flex flex-wrap gap-2">
            {combo && (
              <Button size="sm" variant="outline" onClick={() => setRighe([...righe, VUOTA])}>
                <Plus className="w-4 h-4 mr-1" />
                Aggiungi componente
              </Button>
            )}
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => setRighe(null)}>Annulla</Button>
            <Button size="sm" className={blu} disabled={busy || !valide} onClick={() => salva(righe)}>
              {busy ? 'Salvataggio…' : 'Salva'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}