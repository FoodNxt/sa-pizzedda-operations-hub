import React from 'react';
import { Input } from '@/components/ui/input';

// Prodotti nell'ordine del giro, con l'intestazione ogni volta che cambia la zona
export default function InventarioCompletoLista({ righe, valori, onChange }) {
  const zone = [];
  righe.forEach((r) => {
    const ultima = zone[zone.length - 1];
    if (ultima?.nome === r.zona) ultima.righe.push(r);
    else zone.push({ nome: r.zona, righe: [r] });
  });

  return (
    <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-slate-200">
      {zone.map((zona, i) => (
        <div key={i}>
          <p className="sticky top-0 bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">{zona.nome}</p>
          {zona.righe.map((r) => (
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