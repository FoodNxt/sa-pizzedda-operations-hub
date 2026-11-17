import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import TabellaSettimane, { lunedi, ultimeSettimane } from '@/components/inventario2/TabellaSettimane';

export default function TotaliSettimanali({ versione }) {
  const [produzioni, setProduzioni] = useState(null);
  const settimane = useMemo(() => ultimeSettimane(), []);

  useEffect(() => {
    (async () => {
      const page = await base44.entities.ProduzioneLab.filter(
        { annullata: false, data_produzione: { $gte: settimane[0] } },
        { sort: '-data_produzione', limit: 500 }
      );
      setProduzioni(page.items);
    })();
  }, [versione]);

  const righe = useMemo(() => {
    if (!produzioni) return null;
    const perItem = {};
    produzioni.forEach((p) => {
      const r = (perItem[p.item_id] ||= { id: p.item_id, nome: p.item_nome, unita: p.unita, totali: {} });
      const s = lunedi(p.data_produzione);
      r.totali[s] = (r.totali[s] || 0) + (p.quantita || 0);
    });
    return Object.values(perItem).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  }, [produzioni]);

  return (
    <TabellaSettimane
      titolo="Totale prodotto per settimana"
      intestazione="Semilavorato"
      settimane={settimane}
      righe={righe}
      vuoto={`Nessuna produzione nelle ultime ${settimane.length} settimane.`}
    />
  );
}