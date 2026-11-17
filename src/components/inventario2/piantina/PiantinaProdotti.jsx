import React, { useState } from 'react';
import { Flag, MapPin, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PARTENZA } from './PiantinaMappa';

function Voce({ nome, icona: Icona, messo, attivo, onClick, onTogli }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={attivo}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-t border-slate-100 ${attivo ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-800 hover:bg-slate-50'}`}
    >
      <Icona className={`w-4 h-4 shrink-0 ${messo ? 'text-green-600' : 'text-slate-300'}`} />
      <span className="flex-1">{nome}</span>
      {messo && (
        <span role="button" tabIndex={0} aria-label={`Togli il pin di ${nome}`} className="p-1 text-slate-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); onTogli(); }}>
          <X className="w-4 h-4" />
        </span>
      )}
    </div>
  );
}

// Elenco dei prodotti da posizionare: si sceglie una voce e poi si clicca sulla piantina
export default function PiantinaProdotti({ prodotti, pin, partenza, selezionato, onSeleziona, onTogli }) {
  const [cerca, setCerca] = useState('');
  const visibili = prodotti.filter((p) => p.item_nome.toLowerCase().includes(cerca.trim().toLowerCase()));
  const messi = prodotti.filter((p) => pin[p.item_id]).length;

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">{messi} di {prodotti.length} prodotti posizionati</p>
      <Input aria-label="Cerca prodotto" placeholder="Cerca prodotto" value={cerca} onChange={(e) => setCerca(e.target.value)} />
      <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 bg-white">
        <Voce nome="Punto di partenza" icona={Flag} messo={!!partenza} attivo={selezionato === PARTENZA} onClick={() => onSeleziona(PARTENZA)} onTogli={() => onTogli(PARTENZA)} />
        {visibili.map((p) => (
          <Voce key={p.item_id} nome={p.item_nome} icona={MapPin} messo={!!pin[p.item_id]} attivo={selezionato === p.item_id} onClick={() => onSeleziona(p.item_id)} onTogli={() => onTogli(p.item_id)} />
        ))}
      </div>
    </div>
  );
}