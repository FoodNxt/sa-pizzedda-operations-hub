import React from 'react';
import CheckCell from '@/components/inventario2/CheckCell';
import { numeroIt } from '@/components/trasporti/trasportiUtils';

const destra = { textAlign: 'right', whiteSpace: 'nowrap' };

// Una materia prima in una ubicazione: minimo e massimo attuali accanto a quelli suggeriti
export default function SogliaRow({ riga, diversa, selezionata, onSeleziona, onApplica, salvando }) {
  const coppia = (attuale, suggerito) => (
    <td className="dt1-cell" style={destra}>
      <span className="dt1-muted">{attuale == null ? '—' : numeroIt(attuale, 2)}</span>
      {suggerito != null && <span className="dt1-name"> → {numeroIt(suggerito, 2)}</span>}
    </td>
  );

  return (
    <tr className="dt1-row">
      <td className="dt1-cell dt1-cell--c">
        {diversa && <CheckCell checked={selezionata} onChange={onSeleziona} label={`Seleziona ${riga.nome}`} />}
      </td>
      <td className="dt1-cell dt1-cell--first">
        <span className="dt1-name">{riga.nome}</span> <span className="dt1-muted">{riga.unita}</span>
      </td>
      <td className="dt1-cell"><span className="dt1-muted">{riga.fornitore || '—'}</span></td>
      <td className="dt1-cell" style={destra}><span className="dt1-muted">{numeroIt(riga.consumo, 3)}</span></td>
      <td className="dt1-cell">
        {riga.motivo
          ? <span className="dt1-badge" style={{ background: '#fde68a' }}>{riga.motivo}</span>
          : (
            <span className="dt1-muted">
              attesa {numeroIt(riga.giorni_attesa, 1)} gg + sicurezza {numeroIt(riga.giorni_sicurezza, 0)} gg · ordini ogni {numeroIt(riga.giorni_tra_ordini, 1)} gg ({riga.fonte})
              {riga.storico_insufficiente && <span className="dt1-badge" style={{ background: '#e2e8f0', marginLeft: 6 }}>storico insufficiente</span>}
              {riga.stima_da_storico && <span className="dt1-badge" style={{ background: '#fde68a', marginLeft: 6 }}>stima da storico</span>}
            </span>
          )}
      </td>
      {coppia(riga.min, riga.min_suggerito)}
      {coppia(riga.max, riga.max_suggerito)}
      <td className="dt1-cell">
        {diversa && (
          <button type="button" className="dt1-btn dt1-btn--plain" disabled={salvando} onClick={onApplica}>Applica</button>
        )}
      </td>
    </tr>
  );
}