import React, { useEffect, useState } from 'react';
import { format, subDays } from 'date-fns';
import { base44 } from '@/api/base44Client';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { giorno } from '@/components/laboratorio/labUtils';
import { numeroIt } from '@/components/trasporti/trasportiUtils';
import NegoziPOS from './NegoziPOS';
import ProdottoPOSCard from './ProdottoPOSCard';
import { proponi, tutte } from './posUtils';

const perNome = (a, b) => a.nome_prodotto.localeCompare(b.nome_prodotto, 'it');

export default function VenditePOSTab() {
  const [dati, setDati] = useState(null);

  useEffect(() => {
    (async () => {
      const E = base44.entities;
      const query = { data: { $gte: format(subDays(new Date(), 59), 'yyyy-MM-dd') } };
      const [venduti, punti, combo, righe, ricette, materie, mapping, stores, configs] = await Promise.all([
        E.VenditaPOS.aggregate({ query, groupBy: ['chiave_prodotto', 'nome_prodotto'], sum: ['quantita', 'fatturato'] }),
        E.VenditaPOS.aggregate({ query, groupBy: ['pos_location_id', 'pos_location_name'] }),
        E.SincronizzazioneVenditePOS.filter({ ...query, combo_non_scomposti: { $gt: 0 } }, { sort: '-data', limit: 60 }),
        tutte(E.ProdottoPOSRicetta),
        tutte(E.Ricetta),
        tutte(E.MateriePrime),
        tutte(E.ProdottoVendutoMapping, { attivo: true }),
        E.Store.list(),
        E.ConfigInventario2.list()
      ]);
      // Un prodotto che ha cambiato nome nel POS resta una sola voce
      const perChiave = {};
      venduti.rows.forEach((v) => {
        const p = (perChiave[v.chiave_prodotto] ||= { id: v.chiave_prodotto, nome: v.nome_prodotto, pezzi: 0, fatturato: 0 });
        p.pezzi += v.sum_quantita || 0;
        p.fatturato += v.sum_fatturato || 0;
      });
      setDati({
        prodotti: Object.values(perChiave),
        negozi: punti.rows.map((p) => ({ id: p.pos_location_id, nome: p.pos_location_name })),
        combo: combo.items,
        collegamenti: Object.fromEntries(righe.map((r) => [r.chiave_prodotto, r])),
        ricette: ricette.sort(perNome),
        materie: materie.sort(perNome),
        mapping,
        stores,
        config: configs[0]
      });
    })();
  }, []);

  const salva = async (prodotto, riga) => {
    const nuova = {
      chiave_prodotto: prodotto.id,
      nome_prodotto: prodotto.nome,
      tipo: riga.tipo,
      ...(riga.tipo === 'ignora' ? {} : { item_id: riga.item_id }),
      quantita_per_pezzo: Number(riga.quantita_per_pezzo) || 1
    };
    await base44.entities.ProdottoPOSRicetta.deleteMany({ chiave_prodotto: prodotto.id });
    await base44.entities.ProdottoPOSRicetta.create(nuova);
    setDati((d) => ({ ...d, collegamenti: { ...d.collegamenti, [prodotto.id]: nuova } }));
  };

  if (!dati) {
    return <NeumorphicCard className="p-8 text-center"><p className="text-slate-500">Caricamento vendite...</p></NeumorphicCard>;
  }
  if (!dati.prodotti.length) {
    return (
      <NeumorphicCard className="p-8 text-center">
        <p className="text-slate-500">Nessuna vendita importata. Usa "Importa vendite ultimi 60 giorni" nella scheda Configurazione.</p>
      </NeumorphicCard>
    );
  }

  const collegato = (p) => !!dati.collegamenti[p.id];
  const totale = dati.prodotti.reduce((s, p) => s + p.fatturato, 0);
  const peso = (fatturato) => (totale > 0 ? (fatturato / totale) * 100 : 0);
  const scollegati = dati.prodotti.filter((p) => !collegato(p));
  // Prima quelli senza collegamento, poi per fatturato
  const ordinati = [...dati.prodotti].sort((a, b) => collegato(a) - collegato(b) || b.fatturato - a.fatturato);

  return (
    <div className="space-y-4">
      {dati.combo.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="font-semibold">Giorni con combo non scomposti nei gusti:</span>
          {' '}{dati.combo.map((c) => `${giorno(c.data)} (${c.combo_non_scomposti})`).join(', ')}
        </div>
      )}

      <NegoziPOS
        negozi={dati.negozi}
        stores={dati.stores}
        config={dati.config}
        onSalvato={(negoziPos) => setDati((d) => ({ ...d, config: { ...d.config, negozi_pos: negoziPos } }))}
      />

      <NeumorphicCard className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Prodotti venduti</h2>
          <p className="text-sm text-slate-500">Prodotti del POS venduti negli ultimi 60 giorni e la ricetta o materia prima che consumano.</p>
        </div>
        {scollegati.length > 0 ? (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {scollegati.length === 1 ? '1 prodotto venduto senza collegamento' : `${scollegati.length} prodotti venduti senza collegamento`}:
            {' '}{numeroIt(peso(scollegati.reduce((s, p) => s + p.fatturato, 0)), 1)}% del fatturato
          </div>
        ) : (
          <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            Tutti i prodotti venduti sono collegati
          </div>
        )}
        <div className="space-y-2">
          {ordinati.map((p) => (
            <ProdottoPOSCard
              key={p.id}
              prodotto={p}
              salvato={dati.collegamenti[p.id]}
              proposta={collegato(p) ? null : proponi(p.nome, dati)}
              peso={peso(p.fatturato)}
              ricette={dati.ricette}
              materie={dati.materie}
              onSalva={(riga) => salva(p, riga)}
            />
          ))}
        </div>
      </NeumorphicCard>
    </div>
  );
}