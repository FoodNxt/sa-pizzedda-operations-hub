import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ClipboardCheck, History, Plus, RefreshCw } from 'lucide-react';
import InventarioCompletoDialog from './InventarioCompletoDialog';
import { toast } from '@/components/ui/use-toast';
import RegistroTable from './RegistroTable';
import MovimentoManualeDialog from './MovimentoManualeDialog';
import { DEFAULT_CONFIG, buildRows } from './inv2Utils';

const FILTRI_VUOTI = { ubicazione: '', prodotto: '', tipo: '', fonte: '', dal: '', al: '' };
const PER_PAGINA = 50;

function buildQuery(f) {
  const q = {};
  if (f.ubicazione) q.ubicazione_key = f.ubicazione;
  if (f.prodotto) q.item_id = f.prodotto;
  if (f.tipo) q.tipo = f.tipo;
  if (f.fonte) q.fonte = f.fonte;
  if (f.dal || f.al) {
    q.data_movimento = {};
    if (f.dal) q.data_movimento.$gte = new Date(`${f.dal}T00:00:00`).toISOString();
    if (f.al) q.data_movimento.$lte = new Date(`${f.al}T23:59:59.999`).toISOString();
  }
  return q;
}

export default function RegistroMovimenti() {
  const [filtri, setFiltri] = useState(FILTRI_VUOTI);
  const [movimenti, setMovimenti] = useState([]);
  const [next, setNext] = useState(null);
  const [totale, setTotale] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [labStoreId, setLabStoreId] = useState(DEFAULT_CONFIG.lab_store_id);
  const [prodotti, setProdotti] = useState([]);
  const [busy, setBusy] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completoOpen, setCompletoOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, materie, ricette, configs] = await Promise.all([
        base44.entities.Store.list(),
        base44.entities.MateriePrime.list(),
        base44.entities.Ricetta.filter({ is_semilavorato: true }),
        base44.entities.ConfigInventario2.list()
      ]);
      setStores(s);
      setProdotti(buildRows(materie, ricette).sort((a, b) => a.nome.localeCompare(b.nome, 'it')));
      if (configs[0]?.lab_store_id) setLabStoreId(configs[0].lab_store_id);
    })();
  }, []);

  const ubicazioni = useMemo(() => {
    const lab = stores.find((s) => s.id === labStoreId);
    return [
      ...stores.map((s) => ({ key: s.id, label: s.name })),
      { key: `lab:${labStoreId}`, label: lab ? `Laboratorio (${lab.name})` : 'Laboratorio' }
    ];
  }, [stores, labStoreId]);

  const carica = async (cursor) => {
    const q = buildQuery(filtri);
    const page = await base44.entities.MovimentoMagazzino.filter(q, { sort: '-data_movimento', limit: PER_PAGINA, ...(cursor ? { cursor } : {}) });
    if (!cursor) setTotale(await base44.entities.MovimentoMagazzino.count(q));
    setMovimenti((prev) => (cursor ? [...prev, ...page.items] : page.items));
    setNext(page.has_more ? page.next_cursor : null);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    carica(null);
  }, [filtri]);

  const esegui = async (chiave, funzione, payload, messaggio) => {
    setBusy(chiave);
    try {
      const { data } = await base44.functions.invoke(funzione, payload);
      toast({ title: messaggio(data) });
      await carica(null);
    } catch (e) {
      toast({ title: 'Operazione non riuscita', description: e.response?.data?.error || e.message, variant: 'destructive' });
    }
    setBusy(null);
  };

  const azioni = (
    <>
      <button
        type="button"
        className="dt1-btn dt1-btn--plain"
        disabled={!!busy}
        onClick={() => esegui('storico', 'inv2PonteConteggio', { importa_storico: true }, (d) => (d.creati ? `${d.creati} conteggi importati` : 'Nessun conteggio da importare'))}
      >
        <History />
        {busy === 'storico' ? 'Importazione…' : 'Importa storico conteggi'}
      </button>
      <button
        type="button"
        className="dt1-btn dt1-btn--plain"
        disabled={!!busy}
        onClick={() => esegui('ricalcola', 'inv2Ricalcola', {}, (d) => `Giacenze ricalcolate: ${d.create + d.aggiornate}`)}
      >
        <RefreshCw />
        {busy === 'ricalcola' ? 'Ricalcolo…' : 'Ricalcola ora'}
      </button>
      <button type="button" className="dt1-btn dt1-btn--plain" onClick={() => setCompletoOpen(true)}>
        <ClipboardCheck />
        Inventario completo
      </button>
      <button type="button" className="dt1-btn" onClick={() => setDialogOpen(true)}>
        <Plus />
        Aggiungi movimento
      </button>
    </>
  );

  return (
    <>
      <RegistroTable
        movimenti={movimenti}
        loading={loading}
        totale={totale}
        filtri={filtri}
        onFiltri={setFiltri}
        ubicazioni={ubicazioni}
        prodotti={prodotti}
        hasMore={!!next}
        onMore={() => carica(next)}
        azioni={azioni}
      />
      <MovimentoManualeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        ubicazioni={ubicazioni}
        prodotti={prodotti}
        onSaved={() => carica(null)}
      />
      <InventarioCompletoDialog
        open={completoOpen}
        onClose={() => setCompletoOpen(false)}
        ubicazioni={ubicazioni}
        onSaved={() => carica(null)}
      />
    </>
  );
}