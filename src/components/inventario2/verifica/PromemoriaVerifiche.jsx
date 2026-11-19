import React from 'react';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { giornoOra } from '@/components/inventario2/inv2Utils';

// Per ogni ubicazione: ultima verifica admin e intervalli puliti degli ultimi 28 giorni. dati = undefined mentre carica
export default function PromemoriaVerifiche({ dati, ubicazioni }) {
  if (!dati) return null;
  const perKey = Object.fromEntries(dati.promemoria.map((p) => [p.ubicazione_key, p]));
  const righe = ubicazioni.filter((u) => perKey[u.key]);
  if (!righe.length) return null;

  return (
    <NeumorphicCard className="p-5">
      <p className="text-sm font-semibold text-slate-900 mb-3">Verifiche admin</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {righe.map((u) => {
          const p = perKey[u.key];
          return (
            <div key={u.key} className="rounded-lg border border-slate-200 px-4 py-3">
              <p className="text-sm font-medium text-slate-800">{u.nome}</p>
              <p className={`text-sm ${p.ultima_verifica ? 'text-slate-600' : 'text-amber-600'}`}>
                {p.ultima_verifica ? `Ultima verifica: ${giornoOra(p.ultima_verifica)}` : 'Nessuna verifica negli ultimi 90 giorni'}
              </p>
              <p className="text-xs text-slate-500">
                Intervalli puliti negli ultimi 28 giorni: {p.intervalli_puliti}{p.prodotti > 0 ? ` su ${p.prodotti} prodotti` : ''}
              </p>
            </div>
          );
        })}
      </div>
    </NeumorphicCard>
  );
}