import React from 'react';
import { Inbox } from 'lucide-react';
import './prodottiTable.css';
import { FONTI_MOVIMENTO, TIPI_MOVIMENTO } from './inv2Utils';

const formatData = (iso) =>
  iso ? new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function quantita(m) {
  const segno = TIPI_MOVIMENTO[m.tipo]?.segno;
  const q = m.quantita ?? 0;
  if (segno === '=') return `= ${q}`;
  if (segno === '±') return q > 0 ? `+${q}` : `−${Math.abs(q)}`;
  return `${segno || ''}${q}`;
}

export default function RegistroTable({ movimenti, loading, totale, filtri, onFiltri, ubicazioni, prodotti, hasMore, onMore, azioni }) {
  const set = (campo) => (e) => onFiltri({ ...filtri, [campo]: e.target.value });
  const nomeUbicazione = (key) => ubicazioni.find((u) => u.key === key)?.label || key;

  return (
    <section className="dt1-section">
      <div className="dt1-card">
        <div className="dt1-shell">
          <div className="dt1-head">
            <div className="dt1-titles">
              <h3 className="dt1-title">Movimenti</h3>
              <p className="dt1-meta">{totale} movimenti</p>
            </div>
            <span className="dt1-export">{azioni}</span>
            <div className="dt1-selects">
              <select className="dt1-select" value={filtri.ubicazione} onChange={set('ubicazione')} aria-label="Filtra per ubicazione">
                <option value="">Tutte le ubicazioni</option>
                {ubicazioni.map((u) => <option key={u.key} value={u.key}>{u.label}</option>)}
              </select>
              <select className="dt1-select" value={filtri.prodotto} onChange={set('prodotto')} aria-label="Filtra per prodotto">
                <option value="">Tutti i prodotti</option>
                {prodotti.map((p) => <option key={p.key} value={p.id}>{p.nome}</option>)}
              </select>
              <select className="dt1-select" value={filtri.tipo} onChange={set('tipo')} aria-label="Filtra per tipo">
                <option value="">Tutti i tipi</option>
                {Object.entries(TIPI_MOVIMENTO).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
              </select>
              <select className="dt1-select" value={filtri.fonte} onChange={set('fonte')} aria-label="Filtra per fonte">
                <option value="">Tutte le fonti</option>
                {Object.entries(FONTI_MOVIMENTO).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
              <input type="date" className="dt1-select" value={filtri.dal} onChange={set('dal')} aria-label="Dal giorno" />
              <input type="date" className="dt1-select" value={filtri.al} onChange={set('al')} aria-label="Al giorno" />
            </div>
          </div>

          <div className="dt1-tablewrap">
            <div className="dt1-zone">
              {loading ? (
                <div className="dt1-skel" aria-hidden="true">
                  {Array.from({ length: 8 }).map((_, i) => <div key={i} className="dt1-skel-row" />)}
                </div>
              ) : movimenti.length === 0 ? (
                <div className="dt1-empty">
                  <span className="dt1-empty-ico"><Inbox /></span>
                  <span className="dt1-empty-t">Nessun movimento</span>
                  <p className="dt1-empty-p">Non ci sono movimenti per i filtri scelti.</p>
                </div>
              ) : (
                <table className="dt1-table" style={{ minWidth: 980 }}>
                  <thead>
                    <tr>
                      <th className="dt1-th" scope="col">Data</th>
                      <th className="dt1-th" scope="col">Ubicazione</th>
                      <th className="dt1-th" scope="col">Prodotto</th>
                      <th className="dt1-th" scope="col">Tipo</th>
                      <th className="dt1-th" scope="col" style={{ textAlign: 'right' }}>Quantità</th>
                      <th className="dt1-th" scope="col">Fonte</th>
                      <th className="dt1-th" scope="col">Utente</th>
                      <th className="dt1-th" scope="col">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimenti.map((m) => (
                      <tr key={m.id} className="dt1-row">
                        <td className="dt1-cell dt1-cell--first"><span className="dt1-muted">{formatData(m.data_movimento)}</span></td>
                        <td className="dt1-cell"><span className="dt1-muted">{nomeUbicazione(m.ubicazione_key)}</span></td>
                        <td className="dt1-cell"><span className="dt1-name">{m.item_nome || '—'}</span></td>
                        <td className="dt1-cell">
                          <span className="dt1-badge" style={{ background: TIPI_MOVIMENTO[m.tipo]?.colore }}>{TIPI_MOVIMENTO[m.tipo]?.label || m.tipo}</span>
                        </td>
                        <td className="dt1-cell" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span className="dt1-name">{quantita(m)}</span> <span className="dt1-muted">{m.unita || ''}</span>
                        </td>
                        <td className="dt1-cell"><span className="dt1-muted">{FONTI_MOVIMENTO[m.fonte] || '—'}</span></td>
                        <td className="dt1-cell"><span className="dt1-muted">{m.utente_nome || m.utente_email || '—'}</span></td>
                        <td className="dt1-cell">{m.note || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="dt1-foot">
            <div className="dt1-range">Mostrati {movimenti.length} di {totale}</div>
            <div className="dt1-pager">
              {hasMore && <button type="button" className="dt1-btn dt1-btn--plain" onClick={onMore}>Carica altri</button>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}