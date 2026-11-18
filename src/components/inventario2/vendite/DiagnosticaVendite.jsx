import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import '@/components/inventario2/prodottiTable.css';
import { numeroIt } from '@/components/trasporti/trasportiUtils';
import ControlloRighe from './ControlloRighe';
import DiagnosticaGiorni from './DiagnosticaGiorni';
import DettaglioTeorico from './DettaglioTeorico';

// Diagnostica delle vendite del POS e del consumo teorico, per punto vendita
export default function DiagnosticaVendite() {
  const [dati, setDati] = useState(null);
  const [negozioId, setNegozioId] = useState('');

  useEffect(() => {
    base44.functions.invoke('inv2Analisi', { azione: 'diagnostica' }).then((r) => {
      setDati(r.data);
      setNegozioId(r.data.negozi[0]?.id || '');
    });
  }, []);

  if (!dati) {
    return <NeumorphicCard className="p-8 text-center"><p className="text-slate-500">Caricamento diagnostica...</p></NeumorphicCard>;
  }
  const negozio = dati.negozi.find((n) => n.id === negozioId);
  if (!negozio) {
    return (
      <div className="space-y-4">
        <ControlloRighe giorni={dati.controllo} />
        <NeumorphicCard className="p-8 text-center"><p className="text-slate-500">Nessuna vendita negli ultimi {dati.giorni} giorni.</p></NeumorphicCard>
      </div>
    );
  }

  const numeri = [
    ['Pizzedde al giorno, in media', numeroIt(negozio.pizzedde_giorno, 1)],
    ['Pizzedde collegate a una ricetta', negozio.quota_collegate == null ? '—' : `${numeroIt(negozio.quota_collegate, 1)}%`],
    ['Giorni con vendite', `${negozio.giorni.length} su ${dati.giorni}`],
    ['Giorni nella media del teorico', negozio.giorni_nel_teorico]
  ];

  return (
    <div className="space-y-4">
      <ControlloRighe giorni={dati.controllo} />
      <NeumorphicCard className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Diagnostica vendite</h2>
            <p className="text-sm text-slate-500">Ultimi {dati.giorni} giorni, oggi escluso. I menu non scomposti non entrano nella quota di pizzedde collegate.</p>
          </div>
          <select className="dt1-select" value={negozioId} onChange={(e) => setNegozioId(e.target.value)} aria-label="Punto vendita">
            {dati.negozi.map((n) => <option key={n.id} value={n.id}>{n.nome}</option>)}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {numeri.map(([etichetta, valore]) => (
            <div key={etichetta} className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs uppercase text-slate-500">{etichetta}</div>
              <div className="text-xl font-bold text-slate-900">{valore}</div>
            </div>
          ))}
        </div>
      </NeumorphicCard>

      <DiagnosticaGiorni giorni={negozio.giorni} />

      <DettaglioTeorico key={negozio.id} prodotti={dati.prodotti} dettaglio={dati.dettaglio[negozio.store_id] || {}} />

      <NeumorphicCard className="p-6 space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Consumo non convertibile</h2>
          <p className="text-sm text-slate-500">Prodotti che le ricette consumano ma che non si riescono a portare nell'unità di conteggio: restano fuori dal teorico.</p>
        </div>
        {dati.non_convertiti.length === 0 ? (
          <p className="text-sm text-green-700">Tutti i consumi si convertono nell'unità di conteggio.</p>
        ) : (
          <ul className="space-y-1">
            {dati.non_convertiti.map((r) => (
              <li key={r.nome} className="text-sm text-slate-700">
                <span className="font-medium">{r.nome}</span>: <span className="text-red-700">{r.motivo}</span>
              </li>
            ))}
          </ul>
        )}
      </NeumorphicCard>
    </div>
  );
}