import React from 'react';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Giorno da cui parte lo storico di ogni store: quello che è successo prima non entra nei calcoli
export default function InizioStorico({ stores, valori, onChange }) {
  return (
    <NeumorphicCard className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Inizio dello storico per negozio</h2>
        <p className="text-sm text-slate-500">
          Da usare dopo eventi non registrati, come merce spostata da un negozio chiuso. Conteggi, movimenti e vendite precedenti
          a questa data non contano nel ricalcolo e nel confronto consumi: il primo conteggio dalla data in poi fa da partenza.
          Lascia vuoto per usare tutto lo storico.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stores.map((s) => (
          <div key={s.id} className="space-y-1.5">
            <Label htmlFor={`inv2-inizio-${s.id}`}>{s.name}</Label>
            <Input
              id={`inv2-inizio-${s.id}`}
              type="date"
              value={valori[s.id] || ''}
              onChange={(e) => onChange({ ...valori, [s.id]: e.target.value })}
            />
          </div>
        ))}
      </div>
    </NeumorphicCard>
  );
}