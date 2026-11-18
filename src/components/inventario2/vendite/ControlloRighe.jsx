import React from 'react';
import '@/components/inventario2/prodottiTable.css';
import { giorno } from '@/components/laboratorio/labUtils';
import { numeroIt } from '@/components/trasporti/trasportiUtils';

const destra = { textAlign: 'right' };
const ESITO = { ok: 'Riuscito', errore: 'Errore' };

// Righe scritte secondo il log contro righe davvero presenti, giorno per giorno
export default function ControlloRighe({ giorni }) {
  const diversi = giorni.filter((g) => g.diverso).length;
  return (
    <section className="dt1-section">
      <div className="dt1-card">
        <div className="dt1-shell">
          <div className="dt1-head">
            <div className="dt1-titles">
              <h3 className="dt1-title">Righe nel log contro righe presenti</h3>
              <p className="dt1-meta">
                Ultimi 60 giorni. {diversi === 0 ? 'Tutti i giorni corrispondono.' : `${diversi} giorni non corrispondono: vanno reimportati.`}
              </p>
            </div>
          </div>
          <div className="dt1-tablewrap">
            <div className="dt1-zone" style={{ maxHeight: 360, overflowY: 'auto' }}>
              <table className="dt1-table" style={{ minWidth: 560 }}>
                <thead>
                  <tr>
                    <th className="dt1-th" scope="col">Giorno</th>
                    <th className="dt1-th" scope="col">Esito nel log</th>
                    <th className="dt1-th" scope="col" style={destra}>Righe nel log</th>
                    <th className="dt1-th" scope="col" style={destra}>Righe presenti</th>
                  </tr>
                </thead>
                <tbody>
                  {giorni.map((g) => (
                    <tr key={g.data} className="dt1-row">
                      <td className="dt1-cell dt1-cell--first"><span className="dt1-name">{giorno(g.data)}</span></td>
                      <td className="dt1-cell"><span className="dt1-muted">{ESITO[g.esito] || 'Nessun log'}</span></td>
                      <td className="dt1-cell" style={destra}><span className="dt1-muted">{g.nel_log == null ? '—' : numeroIt(g.nel_log, 0)}</span></td>
                      <td className="dt1-cell" style={destra}>
                        {g.diverso
                          ? <span className="dt1-badge" style={{ background: '#fecaca' }}>{numeroIt(g.presenti, 0)}</span>
                          : <span className="dt1-muted">{numeroIt(g.presenti, 0)}</span>}
                      </td>
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