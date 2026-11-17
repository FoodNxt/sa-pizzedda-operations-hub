import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Inbox } from 'lucide-react';
import '@/components/inventario2/prodottiTable.css';
import { giorno } from '@/components/laboratorio/labUtils';
import { numeroIt } from '@/components/trasporti/trasportiUtils';

const PER_PAGINA = 50;
const ORDINAMENTI = [
  ['prossimo_conteggio_data', 'Prossimo conteggio'],
  ['giorni_copertura', 'Giorni di copertura'],
  ['-consumo_medio_giorno', 'Consumo più alto'],
  ['ultimo_conteggio_data', 'Contati da più tempo'],
  ['item_nome', 'Nome']
];
const AFFIDABILITA = { ok: ['Ok', '#bbf7d0'], da_verificare: ['Da verificare', '#fde68a'], nessun_dato: ['Nessun dato', '#e2e8f0'] };
const FISSO = { '': 'Giorno fisso: tutti', si: 'Giorno fisso: sì', no: 'Giorno fisso: no' };

function buildQuery(f) {
  const q = { ubicazione_key: f.ubicazione };
  if (f.affidabilita) q.affidabilita = f.affidabilita;
  if (f.fisso) q.priorita = f.fisso === 'si' ? 1 : { $ne: 1 };
  if (f.cerca.trim()) q.item_nome = { $regex: f.cerca.trim(), $options: 'i' };
  return q;
}

export default function GiacenzeTab({ ubicazioni }) {
  const [filtri, setFiltri] = useState({ ubicazione: ubicazioni[0].key, affidabilita: '', fisso: '', cerca: '', ordine: 'prossimo_conteggio_data' });
  const [righe, setRighe] = useState([]);
  const [next, setNext] = useState(null);
  const [totale, setTotale] = useState(0);
  const [loading, setLoading] = useState(true);

  const carica = async (cursor) => {
    const q = buildQuery(filtri);
    const page = await base44.entities.GiacenzaStimata.filter(q, { sort: filtri.ordine, limit: PER_PAGINA, ...(cursor ? { cursor } : {}) });
    if (!cursor) setTotale(await base44.entities.GiacenzaStimata.count(q));
    setRighe((prev) => (cursor ? [...prev, ...page.items] : page.items));
    setNext(page.has_more ? page.next_cursor : null);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => carica(null), 250);
    return () => clearTimeout(t);
  }, [filtri]);

  const set = (campo) => (e) => setFiltri({ ...filtri, [campo]: e.target.value });

  return (
    <section className="dt1-section">
      <div className="dt1-card">
        <div className="dt1-shell">
          <div className="dt1-head">
            <div className="dt1-titles">
              <h3 className="dt1-title">Giacenze stimate</h3>
              <p className="dt1-meta">{totale} prodotti</p>
            </div>
            <div className="dt1-selects">
              <select className="dt1-select" value={filtri.ubicazione} onChange={set('ubicazione')} aria-label="Ubicazione">
                {ubicazioni.map((u) => <option key={u.key} value={u.key}>{u.nome}</option>)}
              </select>
              <input type="search" className="dt1-select" placeholder="Cerca prodotto" value={filtri.cerca} onChange={set('cerca')} aria-label="Cerca prodotto" />
              <select className="dt1-select" value={filtri.affidabilita} onChange={set('affidabilita')} aria-label="Affidabilità">
                <option value="">Affidabilità: tutte</option>
                {Object.entries(AFFIDABILITA).map(([v, [label]]) => <option key={v} value={v}>{label}</option>)}
              </select>
              <select className="dt1-select" value={filtri.fisso} onChange={set('fisso')} aria-label="Giorno fisso">
                {Object.entries(FISSO).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
              <select className="dt1-select" value={filtri.ordine} onChange={set('ordine')} aria-label="Ordina per">
                {ORDINAMENTI.map(([v, label]) => <option key={v} value={v}>Ordina: {label}</option>)}
              </select>
            </div>
          </div>

          <div className="dt1-tablewrap">
            <div className="dt1-zone">
              {loading ? (
                <div className="dt1-skel" aria-hidden="true">
                  {Array.from({ length: 6 }).map((_, i) => <div key={i} className="dt1-skel-row" />)}
                </div>
              ) : righe.length === 0 ? (
                <div className="dt1-empty">
                  <span className="dt1-empty-ico"><Inbox /></span>
                  <span className="dt1-empty-t">Nessuna giacenza</span>
                  <p className="dt1-empty-p">Non ci sono prodotti per questa ubicazione e questi filtri.</p>
                </div>
              ) : (
                <table className="dt1-table" style={{ minWidth: 980 }}>
                  <thead>
                    <tr>
                      <th className="dt1-th" scope="col">Prodotto</th>
                      <th className="dt1-th" scope="col" style={{ textAlign: 'right' }}>Giacenza stimata</th>
                      <th className="dt1-th" scope="col" style={{ textAlign: 'right' }}>Consumo al giorno</th>
                      <th className="dt1-th" scope="col" style={{ textAlign: 'right' }}>Giorni di copertura</th>
                      <th className="dt1-th" scope="col">Affidabilità</th>
                      <th className="dt1-th" scope="col">Ultimo conteggio</th>
                      <th className="dt1-th" scope="col">Prossimo conteggio</th>
                      <th className="dt1-th" scope="col">Giorno fisso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {righe.map((g) => {
                      const [etichetta, colore] = AFFIDABILITA[g.affidabilita] || AFFIDABILITA.nessun_dato;
                      return (
                        <tr key={g.id} className="dt1-row">
                          <td className="dt1-cell dt1-cell--first"><span className="dt1-name">{g.item_nome}</span></td>
                          <td className="dt1-cell" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <span className="dt1-name">{numeroIt(g.giacenza_stimata, 2)}</span> <span className="dt1-muted">{g.unita}</span>
                          </td>
                          <td className="dt1-cell" style={{ textAlign: 'right' }}>
                            <span className="dt1-muted">{numeroIt((g.consumo_medio_giorno || 0) + (g.uscite_registrate_giorno || 0), 2)}</span>
                          </td>
                          <td className="dt1-cell" style={{ textAlign: 'right' }}><span className="dt1-muted">{numeroIt(g.giorni_copertura, 1)}</span></td>
                          <td className="dt1-cell"><span className="dt1-badge" style={{ background: colore }}>{etichetta}</span></td>
                          <td className="dt1-cell">
                            <span className="dt1-muted">
                              {g.ultimo_conteggio_data ? `${new Date(g.ultimo_conteggio_data).toLocaleDateString('it-IT')} · ${numeroIt(g.ultimo_conteggio_valore, 2)}` : 'Mai'}
                            </span>
                          </td>
                          <td className="dt1-cell">
                            <span className="dt1-name">{giorno(g.prossimo_conteggio_data)}</span>
                            {g.prossimo_conteggio_motivo && <span className="dt1-muted"> · {g.prossimo_conteggio_motivo}</span>}
                          </td>
                          <td className="dt1-cell"><span className="dt1-muted">{g.priorita === 1 ? 'Sì' : 'No'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="dt1-foot">
            <div className="dt1-range">Mostrati {righe.length} di {totale}</div>
            <div className="dt1-pager">
              {next && <button type="button" className="dt1-btn dt1-btn--plain" onClick={() => carica(next)}>Carica altri</button>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}