import React from 'react';
import { Button } from '@/components/ui/button';
import { numeroIt, unitaBreve } from './trasportiUtils';

export default function TrasportoRiepilogo({ anteprima, daNome, aNome, saving, onConferma, onModifica }) {
  const { item_nome, peso_kg, pezzi, quantita_convertita, unita } = anteprima;
  const quantita = pezzi != null
    ? `${numeroIt(pezzi)} ${unitaBreve(unita)}`
    : `${numeroIt(peso_kg)} kg`;
  const convertita = pezzi == null && unita !== 'kg' ? ` = ${numeroIt(quantita_convertita)} ${unitaBreve(unita)}` : '';

  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-lg font-semibold text-slate-900">
        {quantita} di {item_nome}{convertita}, da {daNome} a {aNome}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-12 text-base" disabled={saving} onClick={onModifica}>Modifica</Button>
        <Button className="h-12 text-base bg-blue-600 hover:bg-blue-700 text-white" disabled={saving} onClick={onConferma}>
          {saving ? 'Salvataggio…' : 'Conferma'}
        </Button>
      </div>
    </div>
  );
}