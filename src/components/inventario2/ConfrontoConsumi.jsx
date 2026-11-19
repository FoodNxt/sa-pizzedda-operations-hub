import React from 'react';
import { Inbox } from 'lucide-react';
import '@/components/inventario2/prodottiTable.css';
import { numeroIt } from '@/components/trasporti/trasportiUtils';

const SOGLIA = 30;
const destra = { textAlign: 'right' };

// Consumo da conteggi contro consumo teorico dalle vendite, per prodotto. righe = undefined mentre carica
export default function ConfrontoConsumi({ righe }) {
  return (
    <section className="dt1-section">
      <div className="dt1-card">
        <div className="dt1-shell">
          <div className="dt1-head">
            <div className="dt1-titles">
              <h3 className="dt1-title">Consumo da conteggi e consumo teorico</h3>
              <p className="dt1-meta">
                Ultime 3 settimane, sugli stessi giorni. Uno scarto stabile oltre il {SOGLIA}% indica una ricetta sbagliata o uno spreco non registrato.
              </p>
            </div>
          </div>
          <div className="dt1-tablewrap">
            <div className="dt1-zone">
              {!righe ? (
                <div className="dt1-skel" aria-hidden="true">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="dt1-skel-row" />)}
                </div>
              ) : righe.length === 0 ? (
                <div className="dt1-empty">
                  <span className="dt1-empty-ico"><Inbox /></span>
                  <span className="dt1-empty-t">Nessun confronto</span>
                  <p className="dt1-empty-p">Servono vendite collegate a una ricetta e almeno 4 conteggi del prodotto su almeno 5 giorni nelle ultime 3 settimane.</p>
                </div>
              ) : (
                <table className="dt1-table" style={{ minWidth: 860 }}>
                  <thead>
                    <tr>
                      <th className="dt1-th" scope="col">Prodotto</th>
                      <th className="dt1-th" scope="col" style={destra}>Da conteggi al giorno</th>
                      <th className="dt1-th" scope="col" style={destra}>Teorico al giorno</th>
                      <th className="dt1-th" scope="col" style={destra}>Misurato da verifiche admin</th>
                      <th className="dt1-th" scope="col" style={destra}>Scarto</th>
                      <th className="dt1-th" scope="col" style={destra}>Giorni confrontati</th>
                    </tr>
                  </thead>
                  <tbody>
                    {righe.map((r) => {
                      const oltre = Math.abs(r.scarto_pct) > SOGLIA;
                      return (
                        <tr key={r.item_id} className="dt1-row">
                          <td className="dt1-cell dt1-cell--first"><span className="dt1-name">{r.nome}</span></td>
                          <td className="dt1-cell" style={destra}>
                            <span className="dt1-name">{numeroIt(r.conteggi, 3)}</span> {r.conteggi != null && <span className="dt1-muted">{r.unita}</span>}
                          </td>
                          <td className="dt1-cell" style={destra}>
                            <span className="dt1-name">{numeroIt(r.teorico, 3)}</span> <span className="dt1-muted">{r.unita}</span>
                          </td>
                          <td className="dt1-cell" style={destra}>
                            <span className="dt1-name">{numeroIt(r.misurato, 3)}</span> {r.misurato != null && <span className="dt1-muted">{r.unita}</span>}
                            {r.intervalli_puliti > 0 && <div className="dt1-muted">{r.intervalli_puliti} {r.intervalli_puliti === 1 ? 'intervallo pulito' : 'intervalli puliti'}{r.orario_stimato ? ' · orario stimato' : ''}</div>}
                          </td>
                          <td className="dt1-cell" style={destra}>
                            {r.misurabile ? (
                              <span className="dt1-badge" style={{ background: oltre ? '#fecaca' : '#e2e8f0' }}>
                                {r.scarto_pct > 0 ? '+' : ''}{numeroIt(r.scarto_pct, 1)}%
                              </span>
                            ) : (
                              <span className="dt1-muted">
                                {r.rete ? 'non misurabile – trasporti non registrati' : r.senza_conteggi ? 'conteggi dei dipendenti insufficienti' : 'non misurabile (consumo nel periodo < 5 unità)'}
                              </span>
                            )}
                          </td>
                          <td className="dt1-cell" style={destra}><span className="dt1-muted">{numeroIt(r.giorni, 1)}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}