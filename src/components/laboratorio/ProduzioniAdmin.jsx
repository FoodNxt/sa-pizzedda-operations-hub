import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronDown, Inbox, Plus } from 'lucide-react';
import RegistraProduzioneDialog from './RegistraProduzioneDialog';
import { toast } from '@/components/ui/use-toast';
import '@/components/inventario2/prodottiTable.css';
import { erroreFunzione, giorno, numero } from './labUtils';

const PER_PAGINA = 50;
const FILTRI_VUOTI = { dal: '', al: '', item: '' };

function buildQuery(f) {
  const q = {};
  if (f.item) q.item_id = f.item;
  if (f.dal || f.al) {
    q.data_produzione = {};
    if (f.dal) q.data_produzione.$gte = f.dal;
    if (f.al) q.data_produzione.$lte = f.al;
  }
  return q;
}

export default function ProduzioniAdmin({ semilavorati, onCambio }) {
  const [filtri, setFiltri] = useState(FILTRI_VUOTI);
  const [produzioni, setProduzioni] = useState([]);
  const [next, setNext] = useState(null);
  const [totale, setTotale] = useState(0);
  const [loading, setLoading] = useState(true);
  const [aperta, setAperta] = useState(null);
  const [annullando, setAnnullando] = useState(null);
  const [registra, setRegistra] = useState(false);

  const carica = async (cursor) => {
    const q = buildQuery(filtri);
    const page = await base44.entities.ProduzioneLab.filter(q, { sort: '-data_produzione', limit: PER_PAGINA, ...(cursor ? { cursor } : {}) });
    if (!cursor) setTotale(await base44.entities.ProduzioneLab.count(q));
    setProduzioni((prev) => (cursor ? [...prev, ...page.items] : page.items));
    setNext(page.has_more ? page.next_cursor : null);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    carica(null);
  }, [filtri]);

  const set = (campo) => (e) => setFiltri({ ...filtri, [campo]: e.target.value });

  const annulla = async (p) => {
    if (!window.confirm(`Annullare la produzione di ${p.item_nome} del ${giorno(p.data_produzione)}? I movimenti collegati verranno eliminati.`)) return;
    setAnnullando(p.id);
    try {
      await base44.functions.invoke('inv2AnnullaProduzione', { produzione_id: p.id });
      toast({ title: 'Produzione annullata' });
      await carica(null);
      onCambio();
    } catch (e) {
      toast({ title: 'Annullamento non riuscito', description: erroreFunzione(e), variant: 'destructive' });
    }
    setAnnullando(null);
  };

  return (
    <section className="dt1-section">
      <div className="dt1-card">
        <div className="dt1-shell">
          <div className="dt1-head">
            <div className="dt1-titles">
              <h3 className="dt1-title">Produzioni</h3>
              <p className="dt1-meta">{totale} produzioni</p>
            </div>
            <div className="dt1-selects">
              <select className="dt1-select" value={filtri.item} onChange={set('item')} aria-label="Filtra per semilavorato">
                <option value="">Tutti i semilavorati</option>
                {semilavorati.map((r) => <option key={r.id} value={r.id}>{r.nome_prodotto}</option>)}
              </select>
              <input type="date" className="dt1-select" value={filtri.dal} onChange={set('dal')} aria-label="Dal giorno" />
              <input type="date" className="dt1-select" value={filtri.al} onChange={set('al')} aria-label="Al giorno" />
              <button type="button" className="dt1-btn" onClick={() => setRegistra(true)}>
                <Plus />
                Registra produzione
              </button>
            </div>
          </div>

          <div className="dt1-tablewrap">
            <div className="dt1-zone">
              {loading ? (
                <div className="dt1-skel" aria-hidden="true">
                  {Array.from({ length: 6 }).map((_, i) => <div key={i} className="dt1-skel-row" />)}
                </div>
              ) : produzioni.length === 0 ? (
                <div className="dt1-empty">
                  <span className="dt1-empty-ico"><Inbox /></span>
                  <span className="dt1-empty-t">Nessuna produzione</span>
                  <p className="dt1-empty-p">Non ci sono produzioni per i filtri scelti.</p>
                </div>
              ) : (
                <table className="dt1-table" style={{ minWidth: 860 }}>
                  <thead>
                    <tr>
                      <th className="dt1-th" scope="col">Data</th>
                      <th className="dt1-th" scope="col">Semilavorato</th>
                      <th className="dt1-th" scope="col" style={{ textAlign: 'right' }}>Quantità</th>
                      <th className="dt1-th" scope="col">Operatore</th>
                      <th className="dt1-th" scope="col">Stato</th>
                      <th className="dt1-th" scope="col">Scarichi</th>
                      <th className="dt1-th" scope="col"><span className="sr-only">Azioni</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {produzioni.map((p) => (
                      <React.Fragment key={p.id}>
                        <tr className="dt1-row">
                          <td className="dt1-cell dt1-cell--first"><span className="dt1-muted">{giorno(p.data_produzione)}</span></td>
                          <td className="dt1-cell"><span className="dt1-name">{p.item_nome}</span></td>
                          <td className="dt1-cell" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <span className="dt1-name">{numero(p.quantita)}</span> <span className="dt1-muted">{p.unita}</span>
                          </td>
                          <td className="dt1-cell"><span className="dt1-muted">{p.operatore_nome || p.operatore_email || '—'}</span></td>
                          <td className="dt1-cell">
                            <span className="dt1-badge" style={{ background: p.annullata ? '#fecaca' : '#bbf7d0' }}>{p.annullata ? 'Annullata' : 'Registrata'}</span>
                          </td>
                          <td className="dt1-cell">
                            <button type="button" className="dt1-link" aria-expanded={aperta === p.id} onClick={() => setAperta(aperta === p.id ? null : p.id)}>
                              {(p.scarichi || []).length} materie prime <ChevronDown className="inline w-3 h-3" />
                            </button>
                          </td>
                          <td className="dt1-cell dt1-cell--c">
                            {!p.annullata && (
                              <button type="button" className="dt1-btn dt1-btn--plain" disabled={annullando === p.id} onClick={() => annulla(p)}>
                                {annullando === p.id ? 'Annullo…' : 'Annulla'}
                              </button>
                            )}
                          </td>
                        </tr>
                        {aperta === p.id && (
                          <tr>
                            <td className="dt1-cell" colSpan={7} style={{ background: '#f8fafc', paddingLeft: 18 }}>
                              {(p.scarichi || []).length === 0 ? (
                                <span className="dt1-muted">Nessuno scarico: la ricetta non ha ingredienti.</span>
                              ) : (
                                <ul className="grid gap-1 sm:grid-cols-2">
                                  {p.scarichi.map((s) => (
                                    <li key={s.item_id}>
                                      <span className="dt1-name">{s.item_nome}</span>{' '}
                                      <span className="dt1-muted">
                                        −{numero(s.quantita)} {s.unita} · {s.ubicazione_key?.startsWith('lab:') ? 'laboratorio' : 'negozio'}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {p.note && <p className="dt1-muted" style={{ marginTop: 6 }}>Note: {p.note}</p>}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="dt1-foot">
            <div className="dt1-range">Mostrate {produzioni.length} di {totale}</div>
            <div className="dt1-pager">
              {next && <button type="button" className="dt1-btn dt1-btn--plain" onClick={() => carica(next)}>Carica altre</button>}
            </div>
          </div>
        </div>
      </div>
      {registra && (
        <RegistraProduzioneDialog
          semilavorati={semilavorati}
          onClose={() => setRegistra(false)}
          onSalvato={() => { setRegistra(false); carica(null); onCambio(); }}
        />
      )}
    </section>
  );
}