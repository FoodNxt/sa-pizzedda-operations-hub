import React, { useState } from 'react';
import { Inbox } from 'lucide-react';
import '@/components/inventario2/prodottiTable.css';
import { numeroIt } from '@/components/trasporti/trasportiUtils';

const destra = { textAlign: 'right' };

// Da dove arriva il consumo teorico di un prodotto: quantità per pezzo di ogni prodotto venduto e totale al giorno.
// dettaglio = { item_id: [{ nome, per_pezzo, pezzi_giorno, totale_giorno }] } dello store scelto
export default function DettaglioTeorico({ prodotti, dettaglio }) {
  const [prodottoId, setProdottoId] = useState((prodotti.find((p) => /polpa/i.test(p.nome)) || prodotti[0])?.id || '');
  const prodotto = prodotti.find((p) => p.id === prodottoId);
  const righe = [...(dettaglio[prodottoId] || [])].sort((a, b) => b.totale_giorno - a.totale_giorno);
  const totale = righe.reduce((s, r) => s + r.totale_giorno, 0);

  return (
    <section className="dt1-section">
      <div className="dt1-card">
        <div className="dt1-shell">
          <div className="dt1-head">
            <div className="dt1-titles">
              <h3 className="dt1-title">Dettaglio del consumo teorico</h3>
              <p className="dt1-meta">Quantità per pezzo venduto e totale al giorno, sui giorni che entrano nella media</p>
            </div>
            <div className="dt1-selects">
              <select className="dt1-select" value={prodottoId} onChange={(e) => setProdottoId(e.target.value)} aria-label="Prodotto">
                {prodotti.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="dt1-tablewrap">
            <div className="dt1-zone">
              {righe.length === 0 ? (
                <div className="dt1-empty">
                  <span className="dt1-empty-ico"><Inbox /></span>
                  <span className="dt1-empty-t">Nessun consumo teorico</span>
                  <p className="dt1-empty-p">In questo store nessun prodotto venduto consuma il prodotto scelto.</p>
                </div>
              ) : (
                <table className="dt1-table" style={{ minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th className="dt1-th" scope="col">Prodotto venduto</th>
                      <th className="dt1-th" scope="col" style={destra}>Quantità per pezzo</th>
                      <th className="dt1-th" scope="col" style={destra}>Pezzi al giorno</th>
                      <th className="dt1-th" scope="col" style={destra}>Totale al giorno</th>
                    </tr>
                  </thead>
                  <tbody>
                    {righe.map((r, i) => (
                      <tr key={i} className="dt1-row">
                        <td className="dt1-cell dt1-cell--first"><span className="dt1-name">{r.nome}</span></td>
                        <td className="dt1-cell" style={destra}><span className="dt1-muted">{numeroIt(r.per_pezzo, 4)} {prodotto?.unita}</span></td>
                        <td className="dt1-cell" style={destra}><span className="dt1-muted">{numeroIt(r.pezzi_giorno, 1)}</span></td>
                        <td className="dt1-cell" style={destra}><span className="dt1-name">{numeroIt(r.totale_giorno, 3)}</span> <span className="dt1-muted">{prodotto?.unita}</span></td>
                      </tr>
                    ))}
                    <tr className="dt1-row">
                      <td className="dt1-cell dt1-cell--first" colSpan={3}><span className="dt1-name">Totale al giorno</span></td>
                      <td className="dt1-cell" style={destra}><span className="dt1-name">{numeroIt(totale, 3)}</span> <span className="dt1-muted">{prodotto?.unita}</span></td>
                    </tr>
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