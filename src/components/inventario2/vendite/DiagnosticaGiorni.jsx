import React from 'react';
import '@/components/inventario2/prodottiTable.css';
import { giorno } from '@/components/laboratorio/labUtils';
import { numeroIt } from '@/components/trasporti/trasportiUtils';

const destra = { textAlign: 'right' };
const COLONNE = [
  ['pizzedde', 'Pizzedde vendute'],
  ['pezzi', 'Pezzi totali'],
  ['righe_senza_store', 'Righe senza store', true],
  ['non_collegati', 'Pezzi senza collegamento', true],
  ['menu', 'Pezzi dei menu non scomposti']
];

// Vendite di un punto vendita giorno per giorno. Le colonne di allarme diventano rosse sopra zero
export default function DiagnosticaGiorni({ giorni }) {
  return (
    <section className="dt1-section">
      <div className="dt1-card">
        <div className="dt1-shell">
          <div className="dt1-head">
            <div className="dt1-titles">
              <h3 className="dt1-title">Vendite per giorno</h3>
              <p className="dt1-meta">Solo i giorni con vendite importate</p>
            </div>
          </div>
          <div className="dt1-tablewrap">
            <div className="dt1-zone">
              <table className="dt1-table" style={{ minWidth: 760 }}>
                <thead>
                  <tr>
                    <th className="dt1-th" scope="col">Giorno</th>
                    {COLONNE.map(([campo, etichetta]) => <th key={campo} className="dt1-th" scope="col" style={destra}>{etichetta}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {giorni.map((g) => (
                    <tr key={g.data} className="dt1-row">
                      <td className="dt1-cell dt1-cell--first"><span className="dt1-name">{giorno(g.data)}</span></td>
                      {COLONNE.map(([campo, , allarme]) => (
                        <td key={campo} className="dt1-cell" style={destra}>
                          {allarme && g[campo] > 0
                            ? <span className="dt1-badge" style={{ background: '#fecaca' }}>{numeroIt(g[campo], 0)}</span>
                            : <span className="dt1-muted">{numeroIt(g[campo], 0)}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}