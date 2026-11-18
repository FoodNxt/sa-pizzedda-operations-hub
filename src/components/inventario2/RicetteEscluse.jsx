import React from 'react';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { Checkbox } from '@/components/ui/checkbox';

// Semilavorati che non contano nel consumo teorico dei negozi
export default function RicetteEscluse({ ricette, escluse, onChange }) {
  const cambia = (id, attiva) => onChange(attiva ? [...escluse, id] : escluse.filter((x) => x !== id));
  return (
    <NeumorphicCard className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Ricette escluse dal consumo dei negozi</h2>
        <p className="text-sm text-slate-500">
          Le materie prime di queste ricette non scendono nei negozi con le vendite, perché il prodotto arriva dal laboratorio.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ricette.map((r) => (
          <label key={r.id} className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox checked={escluse.includes(r.id)} onCheckedChange={(v) => cambia(r.id, v === true)} />
            {r.nome_prodotto}
          </label>
        ))}
      </div>
    </NeumorphicCard>
  );
}