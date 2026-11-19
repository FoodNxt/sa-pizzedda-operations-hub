import { useState } from 'react';

// Soglia minima in grammi del semilavorato, una per ogni negozio in cui è nel form inventario
export default function SogliaGrammiCell({ ricetta, stores, onSave }) {
  const [soglie, setSoglie] = useState(ricetta.soglia_minima_grammi_per_store || {});
  const negozi = stores.filter((s) => (ricetta.stores_form_inventario || []).includes(s.id));

  const salva = () => {
    const pulite = Object.fromEntries(
      Object.entries(soglie).filter(([, v]) => v !== '' && v != null).map(([id, v]) => [id, Math.round(Number(v)) || 0])
    );
    onSave({ soglia_minima_grammi_per_store: pulite });
  };

  return (
    <td className="p-3">
      <div className="flex flex-col gap-1 items-end">
        {negozi.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-xs text-slate-500">
            {s.name}
            <input
              type="number"
              min="0"
              step="100"
              value={soglie[s.id] ?? ''}
              onChange={(e) => setSoglie((prev) => ({ ...prev, [s.id]: e.target.value }))}
              onBlur={salva}
              className="w-24 neumorphic-pressed px-2 py-2 rounded-lg text-center text-slate-700 outline-none"
              placeholder="—"
            />
          </label>
        ))}
        {negozi.length === 0 && <span className="text-xs text-slate-400">—</span>}
      </div>
    </td>
  );
}