import React from 'react';
import { Input } from '@/components/ui/input';

// Prodotti raggruppati per zona, con la quantità contata da inserire
export default function InventarioCompletoLista({ righe, valori, onChange }) {
  const zone = [...new Set(righe.map((r) => r.zona))];

  return (
    <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-slate-200">
      {zone.map((zona) => (
        <div key={zona}>
          <p className="sticky top-0 bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">{zona}</p>
          {righe.filter((r) => r.zona === zona).map((r) => (
            <label key={r.item_id} className="flex items-center gap-3 px-3 py-1.5 border-t border-slate-100">
              <span className="flex-1 text-sm text-slate-800">{r.nome}</span>
              <Input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                className="w-24 h-8 text-right"
                value={valori[r.item_id] ?? ''}
                onChange={(e) => onChange(r.item_id, e.target.value)}
              />
              <span className="w-16 text-xs text-slate-500">{r.unita}</span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}