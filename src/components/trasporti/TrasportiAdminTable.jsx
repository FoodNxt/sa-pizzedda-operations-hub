import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Inbox } from 'lucide-react';
import '@/components/inventario2/prodottiTable.css';
import CorreggiTrasportoDialog from './CorreggiTrasportoDialog';
import { nomeUbicazione, numeroIt, unitaBreve } from './trasportiUtils';

const PER_PAGINA = 50;
const FILTRI_VUOTI = { item: '', da: '', a: '', dal: '', al: '' };
const dataOra = (iso) => (iso ? new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

function buildQuery(f) {
  const q = {};
  if (f.item) q.item_id = f.item;
  if (f.da) q.da_ubicazione_key = { $in: [f.da, `lab:${f.da}`] };
  if (f.a) q.a_ubicazione_key = { $in: [f.a, `lab:${f.a}`] };
  if (f.dal || f.al) {
    q.data_trasporto = {};
    if (f.dal) q.data_trasporto.$gte = new Date(`${f.dal}T00:00:00`).toISOString();
    if (f.al) q.data_trasporto.$lte = new Date(`${f.al}T23:59:59.999`).toISOString();
  }
  return q;
}

export default function TrasportiAdminTable({ stores, prodotti, onCambio }) {
  const [filtri, setFiltri] = useState(FILTRI_VUOTI);
  const [trasporti, setTrasporti] = useState([]);
  const [next, setNext] = useState(null);
  const [totale, setTotale] = useState(0);
  const [loading, setLoading] = useState(true);
  const [inModifica, setInModifica] = useState(null);

  const carica = async (cursor) => {
    const q = buildQuery(filtri);
    const page = await base44.entities.TrasportoMagazzino.filter(q, { sort: '-data_trasporto', limit: PER_PAGINA, ...(cursor ? { cursor } : {}) });
    if (!cursor) setTotale(await base44.entities.TrasportoMagazzino.count(q));
    setTrasporti((prev) => (cursor ? [...prev, ...page.items] : page.items));
    setNext(page.has_more ? page.next_cursor : null);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    carica(null);
  }, [filtri]);

  const set = (campo) => (e) => setFiltri({ ...filtri, [campo]: e.target.value });
  const storeOptions = stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>);

  return (
    <section className="dt1-section">
      <div className="dt1-card">
        <div className="dt1-shell">
          <div className="dt1-head">
            <div className="dt1-titles">
              <h3 className="dt1-title">Trasporti</h3>
              <p className="dt1-meta">{totale} trasporti</p>
            </div>
            <div className="dt1-selects">
              <select className="dt1-select" value={filtri.item} onChange={set('item')} aria-label="Filtra per prodotto">
                <option value="">Tutti i prodotti</option>
                {prodotti.map((p) => <option key={p.item_id} value={p.item_id}>{p.item_nome}</option>)}
              </select>
              <select className="dt1-select" value={filtri.da} onChange={set('da')} aria-label="Negozio di partenza">
                <option value="">Da: tutti</option>
                {storeOptions}
              </select>
              <select className="dt1-select" value={filtri.a} onChange={set('a')} aria-label="Negozio di arrivo">
                <option value="">A: tutti</option>
                {storeOptions}
              </select>
              <input type="date" className="dt1-select" value={filtri.dal} onChange={set('dal')} aria-label="Dal giorno" />
              <input type="date" className="dt1-select" value={filtri.al} onChange={set('al')} aria-label="Al giorno" />
            </div>
          </div>

          <div className="dt1-tablewrap">
            <div className="dt1-zone">
              {loading ? (
                <div className="dt1-skel" aria-hidden="true">
                  {Array.from({ length: 6 }).map((_, i) => <div key={i} className="dt1-skel-row" />)}
                </div>
              ) : trasporti.length === 0 ? (
                <div className="dt1-empty">
                  <span className="dt1-empty-ico"><Inbox /></span>
                  <span className="dt1-empty-t">Nessun trasporto</span>
                  <p className="dt1-empty-p">Non ci sono trasporti per i filtri scelti.</p>
                </div>
              ) : (
                <table className="dt1-table" style={{ minWidth: 860 }}>
                  <thead>
                    <tr>
                      <th className="dt1-th" scope="col">Data</th>
                      <th className="dt1-th" scope="col">Prodotto</th>
                      <th className="dt1-th" scope="col">Da</th>
                      <th className="dt1-th" scope="col">A</th>
                      <th className="dt1-th" scope="col" style={{ textAlign: 'right' }}>Inserito</th>
                      <th className="dt1-th" scope="col" style={{ textAlign: 'right' }}>Quantità</th>
                      <th className="dt1-th" scope="col">Operatore</th>
                      <th className="dt1-th" scope="col"><span className="sr-only">Azioni</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {trasporti.map((t) => (
                      <tr key={t.id} className="dt1-row">
                        <td className="dt1-cell dt1-cell--first"><span className="dt1-muted">{dataOra(t.data_trasporto)}</span></td>
                        <td className="dt1-cell"><span className="dt1-name">{t.item_nome}</span></td>
                        <td className="dt1-cell"><span className="dt1-muted">{nomeUbicazione(t.da_ubicazione_key, stores)}</span></td>
                        <td className="dt1-cell"><span className="dt1-muted">{nomeUbicazione(t.a_ubicazione_key, stores)}</span></td>
                        <td className="dt1-cell" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span className="dt1-muted">{t.pezzi != null ? `${numeroIt(t.pezzi)} pezzi` : `${numeroIt(t.peso_kg)} kg`}</span>
                        </td>
                        <td className="dt1-cell" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span className="dt1-name">{numeroIt(t.quantita_convertita)}</span> <span className="dt1-muted">{unitaBreve(t.unita)}</span>
                        </td>
                        <td className="dt1-cell"><span className="dt1-muted">{t.operatore_nome || t.operatore_email || '—'}</span></td>
                        <td className="dt1-cell dt1-cell--c">
                          <button type="button" className="dt1-btn dt1-btn--plain" onClick={() => setInModifica(t)}>Correggi</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="dt1-foot">
            <div className="dt1-range">Mostrati {trasporti.length} di {totale}</div>
            <div className="dt1-pager">
              {next && <button type="button" className="dt1-btn dt1-btn--plain" onClick={() => carica(next)}>Carica altri</button>}
            </div>
          </div>
        </div>
      </div>

      {inModifica && (
        <CorreggiTrasportoDialog
          trasporto={inModifica}
          stores={stores}
          onClose={() => setInModifica(null)}
          onSalvato={async () => {
            setInModifica(null);
            await carica(null);
            onCambio();
          }}
        />
      )}
    </section>
  );
}