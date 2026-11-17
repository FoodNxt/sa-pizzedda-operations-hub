import React, { useState } from 'react';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { oggiLocale } from './labUtils';

export default function ProduzioneCard({ id, titolo, unita, etichettaQuantita, onRegistra }) {
  const [data, setData] = useState(oggiLocale());
  const [quantita, setQuantita] = useState('');
  const [saving, setSaving] = useState(false);

  const registra = async () => {
    setSaving(true);
    const ok = await onRegistra({ data, quantita: Number(quantita) });
    if (ok) setQuantita('');
    setSaving(false);
  };

  return (
    <NeumorphicCard className="p-4 space-y-3">
      <h3 className="text-lg font-bold text-slate-900">{titolo}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`lab-data-${id}`}>Data di produzione</Label>
          <Input id={`lab-data-${id}`} type="date" className="h-12 text-base" max={oggiLocale()} value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`lab-qta-${id}`}>{etichettaQuantita || `Quantità (${unita})`}</Label>
          <Input
            id={`lab-qta-${id}`}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            className="h-12 text-lg"
            placeholder="0"
            value={quantita}
            onChange={(e) => setQuantita(e.target.value)}
          />
        </div>
      </div>
      <Button
        className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 text-white"
        disabled={saving || !data || !(Number(quantita) > 0)}
        onClick={registra}
      >
        {saving ? 'Registrazione…' : 'Registra'}
      </Button>
    </NeumorphicCard>
  );
}