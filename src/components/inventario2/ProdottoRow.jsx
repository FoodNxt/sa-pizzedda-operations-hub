import React from 'react';
import { Pencil } from 'lucide-react';
import CheckCell from './CheckCell';
import NumCell from './NumCell';
import { TIPO_LABEL, riassuntoGiornoFisso, setManuale, setUbicazione } from './inv2Utils';

export default function ProdottoRow({ row, imp, ubicazioni, index, onSave, onEdit, pocoConsumo }) {
  const flag = (campo, label) => (
    <td className="dt1-cell dt1-cell--c">
      <CheckCell checked={imp[campo]} onChange={(v) => onSave(row, { [campo]: v })} label={`${label}: ${row.nome}`} />
    </td>
  );
  // Solo i semilavorati hanno le soglie aggiornate dal ricalcolo
  const manuale = (key, campo) => row.tipo === 'semilavorato' && imp.soglie_manuali_per_ubicazione?.[key]?.[campo] && (
    <div className="dt1-muted">manuale</div>
  );

  return (
    <tr className="dt1-row" data-dt1-row style={{ '--dt1-i': index }}>
      <td className="dt1-cell dt1-cell--first">
        <span className="dt1-rowline" aria-hidden="true" />
        <span className="dt1-name">{row.nome}</span>
      </td>
      <td className="dt1-cell">
        <span className={`dt1-badge dt1-badge--${row.tipo}`}>{TIPO_LABEL[row.tipo]}</span>
      </td>
      <td className="dt1-cell"><span className="dt1-muted">{row.categoria || '—'}</span></td>
      <td className="dt1-cell"><span className="dt1-muted">{row.fornitore || '—'}</span></td>
      <td className="dt1-cell">
        <span className="dt1-muted">{imp.unita_conteggio || '—'}</span>
        {pocoConsumo && (
          <span className="dt1-badge" style={{ background: '#fde68a', display: 'block', marginTop: 4 }} title="Consumo teorico sotto 1 unità a settimana">
            Valuta un'unità di conteggio più piccola
          </span>
        )}
      </td>
      {flag('incluso', 'Incluso')}
      {flag('laboratorio', 'Laboratorio')}
      {flag('consumabile', 'Consumabile')}
      {row.tipo === 'semilavorato'
        ? flag('producibile_lab', 'Producibile in lab')
        : <td className="dt1-cell dt1-cell--c"><span className="dt1-muted">—</span></td>}
      {ubicazioni.map((u) => (
        <React.Fragment key={u.key}>
          <td className="dt1-cell dt1-cell--c">
            <NumCell
              value={imp.min_per_ubicazione?.[u.key]}
              label={`Minimo ${u.label}: ${row.nome}`}
              onCommit={(v) => onSave(row, (cur) => ({
                min_per_ubicazione: setUbicazione(cur.min_per_ubicazione, u.key, v),
                soglie_manuali_per_ubicazione: setManuale(cur.soglie_manuali_per_ubicazione, u.key, 'min', v !== undefined)
              }))}
            />
            {manuale(u.key, 'min')}
          </td>
          <td className="dt1-cell dt1-cell--c">
            <NumCell
              value={imp.max_per_ubicazione?.[u.key]}
              label={`Massimo ${u.label}: ${row.nome}`}
              onCommit={(v) => onSave(row, (cur) => ({
                max_per_ubicazione: setUbicazione(cur.max_per_ubicazione, u.key, v),
                soglie_manuali_per_ubicazione: setManuale(cur.soglie_manuali_per_ubicazione, u.key, 'max', v !== undefined)
              }))}
            />
            {manuale(u.key, 'max')}
          </td>
        </React.Fragment>
      ))}
      <td className="dt1-cell">
        <button type="button" className="dt1-link" onClick={() => onEdit(row)}>
          {riassuntoGiornoFisso(imp.conteggio_fisso, imp.conteggio_fisso_per_ubicazione, ubicazioni)}
        </button>
      </td>
      <td className="dt1-cell dt1-cell--c">
        <button type="button" className="dt1-iconbtn" onClick={() => onEdit(row)} aria-label={`Modifica ${row.nome}`}>
          <Pencil />
        </button>
      </td>
    </tr>
  );
}