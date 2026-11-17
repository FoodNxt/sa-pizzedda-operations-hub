import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { calcolaOrdiniSuggeriti } from '@/lib/calcolaOrdiniSuggeriti';
import { euro } from './ordiniUtils';

// stores: [{ store_id, nome, totale2 }] in affiancamento. Il totale attuale è in sola lettura.
export default function BannerAffiancamento({ stores }) {
  const [attuali, setAttuali] = useState(null);

  useEffect(() => {
    (async () => {
      const [inventory, inventoryCantina, products, allStores, ricette] = await Promise.all([
        base44.entities.RilevazioneInventario.list('-data_rilevazione', 5000),
        base44.entities.RilevazioneInventarioCantina.list('-data_rilevazione', 5000),
        base44.entities.MateriePrime.list('-created_date', 500),
        base44.entities.Store.list(),
        base44.entities.Ricetta.list()
      ]);
      const totali = {};
      calcolaOrdiniSuggeriti({ inventory, inventoryCantina, products, stores: allStores, ricette }).forEach((o) => {
        totali[o.store_id] = (totali[o.store_id] || 0) + (o.product.prezzo_unitario || 0) * o.quantita_ordine;
      });
      setAttuali(totali);
    })();
  }, []);

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
      {stores.map((s) => (
        <p key={s.store_id} className="flex items-start gap-2 text-sm text-blue-900">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            <strong>{s.nome}</strong> è in affiancamento: gli ordini veri si fanno ancora dalla pagina{' '}
            <Link to={createPageUrl('OrdiniAdmin')} className="underline">Ordini Fornitori</Link>. Oggi Ordini 2.0 proporrebbe{' '}
            <strong>{euro(s.totale2)}</strong> netti, gli ordini suggeriti attuali{' '}
            <strong>{attuali ? euro(attuali[s.store_id] || 0) : '…'}</strong>.
          </span>
        </p>
      ))}
    </div>
  );
}