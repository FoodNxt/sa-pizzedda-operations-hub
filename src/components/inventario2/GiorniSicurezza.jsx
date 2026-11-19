import React from 'react';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Giorni di sicurezza per categoria, usati nel minimo suggerito
export default function GiorniSicurezza({ valori, onChange }) {
  return (
    <NeumorphicCard className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Giorni di sicurezza</h2>
        <p className="text-sm text-slate-500">Si sommano ai giorni di attesa del fornitore nel minimo suggerito, per categoria.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(valori).map(([cat, giorni]) => (
          <div key={cat} className="space-y-1.5">
            <Label htmlFor={`inv2-sic-${cat}`} className="capitalize">{cat}</Label>
            <Input
              id={`inv2-sic-${cat}`}
              type="number"
              min="0"
              value={giorni}
              onChange={(e) => onChange({ ...valori, [cat]: e.target.value })}
            />
          </div>
        ))}
      </div>
    </NeumorphicCard>
  );
}