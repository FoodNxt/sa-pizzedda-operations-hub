import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

// Prodotti proposti nel conteggio di verifica dell'admin
export default function ProdottiVerifica({ scelti, onChange }) {
  const [prodotti, setProdotti] = useState(null);
  const [cerca, setCerca] = useState('');

  useEffect(() => {
    base44.entities.ImpostazioneInventario2.filter({ incluso: true }, { sort: 'item_nome', limit: 500 })
      .then((page) => setProdotti(page.items));
  }, []);

  const cambia = (id, attivo) => onChange(attivo ? [...scelti, id] : scelti.filter((x) => x !== id));
  const visibili = (prodotti || []).filter((p) => (p.item_nome || '').toLowerCase().includes(cerca.trim().toLowerCase()));

  return (
    <NeumorphicCard className="p-6 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[240px]">
          <h2 className="text-lg font-bold text-slate-900">Prodotti di verifica</h2>
          <p className="text-sm text-slate-500">
            Lista proposta nel conteggio di verifica dell'admin. {scelti.length} prodotti scelti.
          </p>
        </div>
        <Input aria-label="Cerca prodotto" placeholder="Cerca prodotto" className="w-56" value={cerca} onChange={(e) => setCerca(e.target.value)} />
      </div>
      {!prodotti ? (
        <p className="text-sm text-slate-500">Caricamento...</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-72 overflow-y-auto">
          {visibili.map((p) => (
            <label key={p.item_id} className="flex items-center gap-2 text-sm text-slate-700">
              <Checkbox checked={scelti.includes(p.item_id)} onCheckedChange={(v) => cambia(p.item_id, v === true)} />
              {p.item_nome}
            </label>
          ))}
        </div>
      )}
    </NeumorphicCard>
  );
}