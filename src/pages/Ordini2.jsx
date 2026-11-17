import React, { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ProtectedPage from '@/components/ProtectedPage';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { erroreFunzione } from '@/components/laboratorio/labUtils';
import GruppoOrdine from '@/components/inventario2/ordini/GruppoOrdine';
import BannerAffiancamento from '@/components/inventario2/ordini/BannerAffiancamento';
import { chiaveGruppo } from '@/components/inventario2/ordini/ordiniUtils';

export default function Ordini2() {
  const [dati, setDati] = useState(null);
  const [errore, setErrore] = useState(null);
  const [versione, setVersione] = useState(0);
  const [ubicazione, setUbicazione] = useState('');
  const [tutti, setTutti] = useState(false);

  const carica = () => base44.functions.invoke('inv2Ordini', {})
    .then((r) => { setDati(r.data); setVersione((v) => v + 1); })
    .catch((e) => setErrore(erroreFunzione(e)));

  useEffect(() => { carica(); }, []);

  const ubicazioni = dati ? Object.fromEntries(dati.ubicazioni.map((u) => [u.key, u])) : {};
  const gruppi = dati ? dati.gruppi.filter((g) => (tutti || g.scatta) && (!ubicazione || g.ubicazione_key === ubicazione)) : [];
  const affiancamento = dati ? dati.ubicazioni.filter((u) => !u.laboratorio && u.modalita === 'affiancamento').map((u) => ({
    store_id: u.store_id,
    nome: u.nome,
    totale2: dati.gruppi
      .filter((g) => g.scatta && ubicazioni[g.ubicazione_key].store_id === u.store_id)
      .reduce((s, g) => s + g.prodotti.reduce((t, p) => t + p.prezzo_unitario * p.quantita, 0), 0)
  })) : [];

  return (
    <ProtectedPage pageName="Ordini2">
      <div className="max-w-[1500px] mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Inventario 2.0 › Ordini</h1>
            <p className="text-slate-500">Proposte d'ordine per ubicazione e fornitore, dalle giacenze stimate</p>
          </div>
        </div>

        {errore ? (
          <NeumorphicCard className="p-5"><p className="text-sm text-red-600">{errore}</p></NeumorphicCard>
        ) : !dati ? (
          <NeumorphicCard className="p-5"><p className="text-sm text-slate-500">Caricamento...</p></NeumorphicCard>
        ) : (
          <>
            {affiancamento.length > 0 && <BannerAffiancamento key={versione} stores={affiancamento} />}

            <div className="flex flex-wrap items-center gap-4">
              <select
                aria-label="Ubicazione"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={ubicazione}
                onChange={(e) => setUbicazione(e.target.value)}
              >
                <option value="">Tutte le ubicazioni</option>
                {dati.ubicazioni.map((u) => <option key={u.key} value={u.key}>{u.nome}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={tutti} onChange={(e) => setTutti(e.target.checked)} />
                Mostra tutti i fornitori
              </label>
            </div>

            {gruppi.length === 0 ? (
              <NeumorphicCard className="p-5">
                <p className="text-sm text-slate-500">
                  {dati.gruppi.length === 0
                    ? 'Nessun prodotto incluso con una giacenza stimata: includi le materie prime in Impostazioni e attendi il ricalcolo.'
                    : 'Nessun fornitore scatta oggi. Con "Mostra tutti i fornitori" li vedi comunque.'}
                </p>
              </NeumorphicCard>
            ) : (
              gruppi.map((g) => (
                <GruppoOrdine key={`${chiaveGruppo(g)}|${versione}`} gruppo={g} ubicazione={ubicazioni[g.ubicazione_key]} onInviato={carica} />
              ))
            )}

            {dati.senza_fornitore.length > 0 && (
              <NeumorphicCard className="p-5">
                <h2 className="text-lg font-bold text-slate-900 mb-2">Fornitore non trovato</h2>
                <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                  {dati.senza_fornitore.map((p) => (
                    <li key={p.item_id}>
                      <span className="font-medium text-slate-900">{p.nome}</span>
                      <span className="text-slate-500"> · {p.fornitore || 'nessun fornitore indicato'}</span>
                    </li>
                  ))}
                </ul>
              </NeumorphicCard>
            )}
          </>
        )}
      </div>
    </ProtectedPage>
  );
}