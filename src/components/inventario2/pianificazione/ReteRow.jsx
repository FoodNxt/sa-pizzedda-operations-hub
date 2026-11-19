import React from 'react';
import { numeroIt } from '@/components/trasporti/trasportiUtils';

const destra = { textAlign: 'right' };

// Riga "rete" di un semilavorato trasportabile: tutti i negozi insieme, finché produzioni e trasporti non sono registrati
export default function ReteRow({ riga }) {
  return (
    <tr className="dt1-row" style={{ background: '#eff6ff' }}>
      <td className="dt1-cell dt1-cell--first">
        <span className="dt1-name">{riga.nome}</span> <span className="dt1-badge" style={{ background: '#bfdbfe' }}>Rete</span>
        <div className="dt1-muted">{riga.negozi} negozi insieme</div>
      </td>
      <td className="dt1-cell" style={{ ...destra, whiteSpace: 'nowrap' }}>
        <span className="dt1-name">{numeroIt(riga.giacenza, 2)}</span> <span className="dt1-muted">{riga.unita}</span>
      </td>
      <td className="dt1-cell" style={destra}><span className="dt1-muted">{numeroIt(riga.conteggi, 2)}</span></td>
      <td className="dt1-cell" style={destra}><span className="dt1-muted">{numeroIt(riga.teorico, 3)}</span></td>
      <td className="dt1-cell" style={destra}><span className="dt1-muted">{riga.indicativo ? '—' : numeroIt(riga.fattore, 2)}</span></td>
      <td className="dt1-cell">
        <span className="dt1-muted">{riga.conteggi == null ? 'Nessun dato' : 'Conteggi di rete'}</span>
        <div className="dt1-muted" style={{ maxWidth: 240, whiteSpace: 'normal' }}>
          {riga.conteggi == null
            ? `Servono 4 giorni validi su almeno 5 giorni (ora ${riga.punti}). Un giorno è valido se ogni negozio ha contato quel giorno o il giorno prima`
            : `${riga.punti} giorni validi su ${numeroIt(riga.giorni, 1)} giorni`}
        </div>
      </td>
      <td className="dt1-cell" style={destra}><span className="dt1-muted">—</span></td>
      <td className="dt1-cell">
        {riga.scarto_pct == null ? <span className="dt1-muted">—</span> : (
          <span className="dt1-badge" style={{ background: Math.abs(riga.scarto_pct) > 30 ? '#fecaca' : '#e2e8f0' }}>
            Scarto {riga.scarto_pct > 0 ? '+' : ''}{numeroIt(riga.scarto_pct, 1)}%
          </span>
        )}
        {riga.indicativo && riga.scarto_pct != null && <div className="dt1-muted">indicativo – produzioni non registrate</div>}
      </td>
      <td className="dt1-cell" colSpan={3}>
        <span className="dt1-muted">Per negozio: non misurabile – trasporti non registrati</span>
      </td>
    </tr>
  );
}