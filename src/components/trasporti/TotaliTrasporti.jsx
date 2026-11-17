import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import TabellaSettimane, { lunedi, ultimeSettimane } from '@/components/inventario2/TabellaSettimane';
import { nomeUbicazione, unitaBreve } from './trasportiUtils';

export default function TotaliTrasporti({ stores, versione }) {
  const [trasporti, setTrasporti] = useState(null);
  const settimane = useMemo(() => ultimeSettimane(), []);

  useEffect(() => {
    (async () => {
      const page = await base44.entities.TrasportoMagazzino.filter(
        { data_trasporto: { $gte: settimane[0] } },
        { sort: '-data_trasporto', limit: 500 }
      );
      setTrasporti(page.items);
    })();
  }, [versione]);

  const righe = useMemo(() => {
    if (!trasporti) return null;
    const perRiga = {};
    trasporti.forEach((t) => {
      const id = `${t.item_id}|${t.da_ubicazione_key}|${t.a_ubicazione_key}`;
      const r = (perRiga[id] ||= {
        id,
        nome: `${t.item_nome} · ${nomeUbicazione(t.da_ubicazione_key, stores)} → ${nomeUbicazione(t.a_ubicazione_key, stores)}`,
        unita: unitaBreve(t.unita),
        totali: {}
      });
      const s = lunedi(t.data_trasporto);
      r.totali[s] = (r.totali[s] || 0) + (t.quantita_convertita || 0);
    });
    return Object.values(perRiga).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  }, [trasporti, stores]);

  return (
    <TabellaSettimane
      titolo="Totale trasportato per settimana"
      intestazione="Prodotto e direzione"
      settimane={settimane}
      righe={righe}
      vuoto={`Nessun trasporto nelle ultime ${settimane.length} settimane.`}
    />
  );
}