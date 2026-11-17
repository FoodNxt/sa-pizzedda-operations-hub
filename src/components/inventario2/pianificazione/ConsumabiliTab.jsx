import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { erroreFunzione } from '@/components/laboratorio/labUtils';

export default function ConsumabiliTab() {
  const [prodotti, setProdotti] = useState(null);
  const [errore, setErrore] = useState(null);
  const [applicando, setApplicando] = useState(null);

  useEffect(() => {
    base44.functions.invoke('inv2Analisi', { azione: 'consumabili' })
      .then((r) => setProdotti(r.data.prodotti))
      .catch((e) => setErrore(erroreFunzione(e)));
  }, []);

  const applica = async (p) => {
    setApplicando(p.id);
    await base44.entities.ImpostazioneInventario2.update(p.id, {
      conteggio_fisso: p.conteggio_fisso,
      frequenza_suggerita: p.frequenza,
      frequenza_suggerita_motivo: p.motivo
    });
    setProdotti((prev) => prev.map((x) => (x.id === p.id ? { ...x, attuale: p.frequenza } : x)));
    toast({ title: `${p.nome}: conteggio ${p.frequenza} impostato`, description: 'Vale dal prossimo ricalcolo.' });
    setApplicando(null);
  };

  if (errore) return <NeumorphicCard className="p-5"><p className="text-sm text-red-600">{errore}</p></NeumorphicCard>;
  if (!prodotti) return <NeumorphicCard className="p-5"><p className="text-sm text-slate-500">Caricamento...</p></NeumorphicCard>;

  return (
    <NeumorphicCard className="p-5 space-y-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Frequenza di conteggio dei consumabili</h2>
        <p className="text-sm text-slate-500">Suggerimenti dagli ordini completati degli ultimi 90 giorni. Niente viene applicato da solo.</p>
      </div>
      {prodotti.length === 0 ? (
        <p className="text-sm text-slate-500">Nessun prodotto è segnato come consumabile nelle Impostazioni.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {prodotti.map((p) => (
            <li key={p.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{p.nome}</p>
                <p className="text-sm text-slate-700">Suggerito: {p.frequenza} ({p.motivo})</p>
                <p className="text-xs text-slate-500">
                  {p.ordini} ordini · Giorno fisso attuale: {p.attuale || 'nessuno'}
                </p>
              </div>
              <Button variant="outline" disabled={applicando === p.id} onClick={() => applica(p)}>
                {applicando === p.id ? 'Applico…' : 'Applica'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </NeumorphicCard>
  );
}