import { useCallback, useEffect, useState } from 'react';
import { format, subDays } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import { erroreFunzione } from '@/components/laboratorio/labUtils';

// Ultimi 60 giorni, dal più recente
export const ultimi60 = () => Array.from({ length: 60 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd'));

export default function useImportaVendite() {
  const [busy, setBusy] = useState(null);
  const [avanzamento, setAvanzamento] = useState(null);
  const [log, setLog] = useState(null);

  const caricaLog = useCallback(async () => {
    const { items } = await base44.entities.SincronizzazioneVenditePOS.filter({ data: { $gte: ultimi60()[59] } }, { sort: '-data', limit: 200 });
    setLog(Object.fromEntries(items.map((l) => [l.data, l])));
  }, []);

  useEffect(() => { caricaLog(); }, [caricaLog]);
  // Durante l'importazione lo stato dei giorni si aggiorna da solo
  useEffect(() => {
    if (!busy) return undefined;
    const timer = setInterval(caricaLog, 15000);
    return () => clearInterval(timer);
  }, [busy, caricaLog]);

  // Richiama la funzione con i giorni ancora da fare finché sono finiti o un passaggio non importa nulla
  const esegui = async (azione, giorni, primaChiamata) => {
    setBusy(azione);
    const totale = giorni.length;
    let fatti = 0;
    let righe = 0;
    let parametri = primaChiamata || { giorni };
    try {
      let daFare = giorni;
      while (daFare.length) {
        setAvanzamento({ fatti, totale });
        const { data } = await base44.functions.invoke('inv2SincronizzaVendite', parametri);
        fatti += data.importati.length;
        righe += data.righe;
        if (!data.importati.length) break;
        daFare = data.da_fare;
        parametri = { giorni: daFare };
      }
      toast({
        title: `Vendite importate: ${fatti} giorni su ${totale}, ${righe} righe`,
        description: fatti < totale ? `${totale - fatti} giorni non importati: usa "Riprova giorni mancanti"` : undefined
      });
    } catch (e) {
      toast({ title: `Importazione interrotta dopo ${fatti} giorni su ${totale}`, description: erroreFunzione(e), variant: 'destructive' });
    }
    await caricaLog();
    setAvanzamento(null);
    setBusy(null);
  };

  const mancanti = log ? ultimi60().filter((g) => log[g]?.esito !== 'ok') : [];

  return {
    busy,
    avanzamento,
    log,
    mancanti,
    importa: () => esegui('importa', ultimi60()),
    reimporta: () => esegui('reimporta', ultimi60(), { reimporta: true }),
    riprova: () => esegui('riprova', mancanti)
  };
}