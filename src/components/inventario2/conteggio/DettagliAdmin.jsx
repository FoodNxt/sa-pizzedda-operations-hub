import React from 'react';
import { numeroIt } from '@/components/trasporti/trasportiUtils';
import { FONTE_CONSUMO } from '@/components/inventario2/inv2Utils';

// Dati di pianificazione di una riga, visibili solo all'admin in modalità prova
export default function DettagliAdmin({ riga }) {
  const voci = [
    ['Motivo', riga.motivo || '—'],
    ['Priorità', riga.priorita ?? '—'],
    ['Giacenza stimata', numeroIt(riga.giacenza, 2)],
    ['Consumo al giorno', numeroIt(riga.consumo, 2)],
    ['Consumo teorico', numeroIt(riga.teorico, 3)],
    ['Fattore', numeroIt(riga.fattore, 2)],
    ['Fonte del consumo', FONTE_CONSUMO[riga.fonte] || '—'],
    ['Giorni di copertura', numeroIt(riga.copertura, 1)]
  ];
  return (
    <div className="mt-1 text-xs text-purple-700">
      {voci.map(([nome, valore]) => `${nome}: ${valore}`).join(' · ')}
    </div>
  );
}