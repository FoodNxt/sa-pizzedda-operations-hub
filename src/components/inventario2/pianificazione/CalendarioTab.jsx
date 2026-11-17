import React, { useEffect, useState } from 'react';
import moment from 'moment';
import { base44 } from '@/api/base44Client';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { erroreFunzione } from '@/components/laboratorio/labUtils';

export default function CalendarioTab({ ubicazioni }) {
  const [dati, setDati] = useState(null);
  const [errore, setErrore] = useState(null);
  const [scelta, setScelta] = useState(null);

  useEffect(() => {
    base44.functions.invoke('inv2Analisi', { azione: 'calendario' })
      .then((r) => setDati(r.data))
      .catch((e) => setErrore(erroreFunzione(e)));
  }, []);

  if (errore) return <NeumorphicCard className="p-5"><p className="text-sm text-red-600">{errore}</p></NeumorphicCard>;
  if (!dati) return <NeumorphicCard className="p-5"><p className="text-sm text-slate-500">Caricamento...</p></NeumorphicCard>;

  const sere = Object.fromEntries(dati.ubicazioni.map((u) => [u.ubicazione_key, u.sere]));
  const righe = ubicazioni.filter((u) => sere[u.key]);
  const voci = scelta ? sere[scelta.key][scelta.giorno] : [];

  return (
    <NeumorphicCard className="p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Voci previste nelle prossime 14 sere</h2>
        <p className="text-sm text-slate-500">Previsione dalle giacenze di oggi. Clicca un numero per vedere l'elenco.</p>
      </div>
      {righe.length === 0 ? (
        <p className="text-sm text-slate-500">Nessuna giacenza stimata: il calendario si riempie dopo il primo ricalcolo.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-slate-500">
                <th className="py-2 pr-4 text-left font-medium">Ubicazione</th>
                {dati.giorni.map((g) => (
                  <th key={g} className="py-2 px-1 font-medium text-center whitespace-nowrap">
                    {moment(g).format('dd')}<br />{moment(g).format('DD/MM')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {righe.map((u) => (
                <tr key={u.key} className="border-t border-slate-100">
                  <td className="py-2 pr-4 font-medium text-slate-900 whitespace-nowrap">{u.nome}</td>
                  {sere[u.key].map((lista, i) => {
                    const attiva = scelta?.key === u.key && scelta.giorno === i;
                    return (
                      <td key={i} className="py-1 px-1 text-center">
                        <button
                          type="button"
                          disabled={!lista.length}
                          aria-pressed={attiva}
                          onClick={() => setScelta(attiva ? null : { key: u.key, giorno: i, nome: u.nome })}
                          className={`w-10 h-9 rounded-md font-bold ${attiva ? 'bg-blue-600 text-white' : lista.length ? 'bg-blue-50 text-blue-800 hover:bg-blue-100' : 'text-slate-300'}`}
                        >
                          {lista.length}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {scelta && (
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="font-bold text-slate-900 mb-2">
            {scelta.nome}, sera del {moment(dati.giorni[scelta.giorno]).format('DD/MM')}: {voci.length} voci
          </h3>
          <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            {voci.map((v) => (
              <li key={v.item_id}>
                <span className="font-medium text-slate-900">{v.nome}</span>
                {v.motivo && <span className="text-slate-500"> · {v.motivo}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </NeumorphicCard>
  );
}