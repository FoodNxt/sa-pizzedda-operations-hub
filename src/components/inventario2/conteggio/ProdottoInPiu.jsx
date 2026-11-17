import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';

export default function ProdottoInPiu({ prodotti, onAggiungi }) {
  const [aperto, setAperto] = useState(false);
  const [cerca, setCerca] = useState('');
  const trovati = prodotti.filter((p) => p.nome?.toLowerCase().includes(cerca.trim().toLowerCase())).slice(0, 20);

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="w-full neumorphic-flat py-3 rounded-xl font-medium text-slate-700 flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Conta un prodotto in più
      </button>
    );
  }

  return (
    <NeumorphicCard className="p-4 space-y-3">
      <div className="flex items-center gap-2 neumorphic-pressed px-3 rounded-xl">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          autoFocus
          type="text"
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
          placeholder="Cerca un prodotto"
          aria-label="Cerca un prodotto"
          className="flex-1 py-3 outline-none text-base text-slate-700"
        />
      </div>
      {trovati.length === 0 ? (
        <p className="text-sm text-slate-500">Nessun prodotto trovato.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {trovati.map((p) => (
            <li key={p.item_id}>
              <button
                type="button"
                className="w-full py-3 flex items-center justify-between gap-3 text-left"
                onClick={() => { onAggiungi(p); setCerca(''); setAperto(false); }}
              >
                <span className="font-medium text-slate-800">{p.nome}</span>
                <span className="text-sm text-slate-500">{p.unita}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="w-full py-2 text-sm text-slate-500" onClick={() => setAperto(false)}>Chiudi</button>
    </NeumorphicCard>
  );
}