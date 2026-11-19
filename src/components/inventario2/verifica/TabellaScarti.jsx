import React from 'react';
import { Inbox } from 'lucide-react';
import '@/components/inventario2/prodottiTable.css';
import { numeroIt } from '@/components/trasporti/trasportiUtils';

const destra = { textAlign: 'right' };

// Scarto tra conteggio dei dipendenti e verifica admin, per prodotto o per dipendente. evidenzia = scarto medio % oltre cui la riga è segnata
export default function TabellaScarti({ titolo, descrizione, intestazione, righe, evidenzia }) {
  return (
    <section className="dt1-section">
      <div className="dt1-card">
        <div className="dt1-shell">
          <div className="dt1-head">
            <div className="dt1-titles">
              <h3 className="dt1-title">{titolo}</h3>
              <p className="dt1-meta">{descrizione}</p>
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
                  <p className="dt1-empty-p">Serve una verifica admin salvata prima delle 11, con un conteggio dei dipendenti della sera prima sullo stesso prodotto.</p>
                </div>
              ) : (
                <table className="dt1-table" style={{ minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th className="dt1-th" scope="col">{intestazione}</th>
                      <th className="dt1-th" scope="col" style={destra}>Confronti</th>
                      <th className="dt1-th" scope="col" style={destra}>Scarto medio</th>
                      <th className="dt1-th" scope="col" style={destra}>Scarto medio in unità</th>
                      <th className="dt1-th" scope="col" style={destra}>Volte oltre il 10%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {righe.map((r) => {
                      const oltre = evidenzia != null && r.scarto_medio_pct > evidenzia;
                      return (
                        <tr key={r.nome} className="dt1-row" style={oltre ? { background: '#fef2f2' } : undefined}>
                          <td className="dt1-cell dt1-cell--first">
                            <span className="dt1-name">{r.nome}</span>
                            {oltre && <div className="dt1-muted">Da spiegare meglio allo staff</div>}
                          </td>
                          <td className="dt1-cell" style={destra}><span className="dt1-muted">{r.confronti}</span></td>
                          <td className="dt1-cell" style={destra}>
                            <span className="dt1-badge" style={{ background: oltre ? '#fecaca' : '#e2e8f0' }}>{numeroIt(r.scarto_medio_pct, 1)}%</span>
                          </td>
                          <td className="dt1-cell" style={destra}>
                            <span className="dt1-name">{numeroIt(r.scarto_medio_unita, 2)}</span> <span className="dt1-muted">{r.unita}</span>
                          </td>
                          <td className="dt1-cell" style={destra}><span className="dt1-muted">{r.oltre_10}</span></td>
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