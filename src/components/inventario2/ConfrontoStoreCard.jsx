import React from 'react';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { giorno } from '@/components/laboratorio/labUtils';
import { numeroIt } from '@/components/trasporti/trasportiUtils';

function Dato({ titolo, valore, nota }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-xs uppercase text-slate-500">{titolo}</p>
      <p className="text-2xl font-bold text-slate-900">{valore}</p>
      <p className="text-xs text-slate-500">{nota}</p>
    </div>
  );
}

export default function ConfrontoStoreCard({ nome, dati }) {
  return (
    <NeumorphicCard className="p-5 space-y-4">
      <h2 className="text-lg font-bold text-slate-900">{nome}</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <Dato
          titolo="Scarto medio tra stima e conteggio"
          valore={dati.scarto_medio_pct == null ? '—' : `${numeroIt(dati.scarto_medio_pct, 1)}%`}
          nota={`Sull'ultimo conteggio di ${dati.prodotti_con_scarto} prodotti`}
        />
        <Dato
          titolo="Voci chieste dal nuovo sistema"
          valore={dati.voci_previste_media == null ? '—' : numeroIt(dati.voci_previste_media, 1)}
          nota={`In media a sera, su ${dati.sere_previste} sere registrate`}
        />
        <Dato
          titolo="Voci contate davvero"
          valore={dati.voci_contate_media == null ? '—' : numeroIt(dati.voci_contate_media, 1)}
          nota={`In media a sera, su ${dati.sere_contate} sere con un conteggio`}
        />
      </div>
      <div>
        <h3 className="font-bold text-slate-900 mb-2">Prodotti arrivati a zero</h3>
        {dati.a_zero.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun prodotto contato a zero.</p>
        ) : (
          <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            {dati.a_zero.map((z) => (
              <li key={z.item_id}>
                <span className="font-medium text-slate-900">{z.nome}</span>
                <span className="text-slate-500"> · {z.volte} {z.volte === 1 ? 'volta' : 'volte'}, ultima il {giorno(z.ultima)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </NeumorphicCard>
  );
}