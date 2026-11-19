import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Campi del fornitore che servono per i suggerimenti d'ordine e non sono compilati
export function campiMancanti(f) {
  return [
    !f.giorni_consegna?.length && 'giorni di consegna',
    (f.tempo_consegna_giorni == null || f.tempo_consegna_giorni === '') && 'giorni di attesa',
    (f.ordine_minimo == null || f.ordine_minimo === '') && "minimo d'ordine"
  ].filter(Boolean);
}

export const DaCompilare = () => (
  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">da compilare</span>
);

export default function CampiMancantiFornitore({ fornitore }) {
  const mancanti = campiMancanti(fornitore);
  if (!mancanti.length) return null;
  return (
    <div className="flex items-start gap-2 mb-3 p-2 rounded-lg bg-amber-50 border border-amber-300">
      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-amber-800">Da compilare: {mancanti.join(', ')}</p>
    </div>
  );
}