import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, Check, Download, Inbox, Sparkles } from 'lucide-react';
import './prodottiTable.css';
import ProdottiPills, { PILLS } from './ProdottiPills';
import ProdottiPager from './ProdottiPager';
import ProdottoRow from './ProdottoRow';
import { TIPO_LABEL, defaultImpostazione, riassuntoGiornoFisso } from './inv2Utils';

const PER_PAGE = 20;
const SORTABLE = [
  { key: 'nome', label: 'Nome' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'fornitore', label: 'Fornitore' }
];

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function ProdottiTable({ rows, imp, ubicazioni, loading, onSave, onEdit, onPrecompila, precompilando, toast, onToast }) {
  const [stato, setStato] = useState('all');
  const [categoria, setCategoria] = useState('');
  const [fornitore, setFornitore] = useState('');
  const [tipo, setTipo] = useState('');
  const [sort, setSort] = useState({ key: 'nome', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [enter, setEnter] = useState(true);
  const wrapRef = useRef(null);
  const markerRef = useRef(null);

  const eff = (r) => imp[r.key] || defaultImpostazione(r);
  const categorie = useMemo(() => [...new Set(rows.map((r) => r.categoria).filter(Boolean))].sort(), [rows]);
  const fornitori = useMemo(() => [...new Set(rows.map((r) => r.fornitore).filter(Boolean))].sort(), [rows]);

  const base = useMemo(
    () => rows.filter((r) => (!categoria || r.categoria === categoria) && (!fornitore || r.fornitore === fornitore) && (!tipo || r.tipo === tipo)),
    [rows, categoria, fornitore, tipo]
  );
  const counts = useMemo(() => {
    const c = {};
    PILLS.forEach((p) => { c[p.key] = base.filter((r) => p.test(imp[r.key] || defaultImpostazione(r))).length; });
    return c;
  }, [base, imp]);
  const list = useMemo(() => {
    const pill = PILLS.find((p) => p.key === stato);
    const dir = sort.dir === 'asc' ? 1 : -1;
    return base
      .filter((r) => pill.test(imp[r.key] || defaultImpostazione(r)))
      .sort((a, b) => dir * String(a[sort.key] || '').localeCompare(String(b[sort.key] || ''), 'it'));
  }, [base, imp, stato, sort]);

  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const cur = Math.min(page, pages);
  const start = (cur - 1) * PER_PAGE;
  const slice = list.slice(start, start + PER_PAGE);

  useEffect(() => {
    if (loading) return undefined;
    const t = setTimeout(() => setEnter(false), 1400);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if (markerRef.current) markerRef.current.dataset.on = '0';
  }, [cur, list.length, sort]);

  const filtra = (setter) => (e) => { setter(e.target.value); setPage(1); };

  const ordina = (key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    setPage(1);
  };

  // La fascia di evidenziazione che segue la riga sotto il puntatore
  const markerTo = (e) => {
    const row = e.target.closest('[data-dt1-row]');
    const m = markerRef.current;
    if (!row || !m) return;
    const wr = wrapRef.current.getBoundingClientRect();
    const rr = row.getBoundingClientRect();
    const wasOn = m.dataset.on === '1';
    if (!wasOn) m.style.transition = 'none';
    m.style.height = `${rr.height}px`;
    m.style.translate = `0 ${rr.top - wr.top - wrapRef.current.clientTop}px`;
    if (!wasOn) {
      void m.offsetWidth;
      m.style.transition = '';
    }
    m.dataset.on = '1';
  };
  const markerOff = () => { if (markerRef.current) markerRef.current.dataset.on = '0'; };

  const esporta = () => {
    if (!list.length) { onToast('Niente da esportare'); return; }
    const head = ['Nome', 'Tipo', 'Categoria', 'Fornitore', 'Unità di conteggio', 'Incluso', 'Laboratorio', 'Consumabile', 'Producibile in lab',
      ...ubicazioni.flatMap((u) => [`${u.label} min`, `${u.label} max`]), 'Giorno fisso'];
    const si = (v) => (v ? 'sì' : 'no');
    const lines = list.map((r) => {
      const i = eff(r);
      return [r.nome, TIPO_LABEL[r.tipo], r.categoria, r.fornitore, i.unita_conteggio, si(i.incluso), si(i.laboratorio), si(i.consumabile),
        r.tipo === 'semilavorato' ? si(i.producibile_lab) : '',
        ...ubicazioni.flatMap((u) => [i.min_per_ubicazione?.[u.key] ?? '', i.max_per_ubicazione?.[u.key] ?? '']),
        riassuntoGiornoFisso(i.conteggio_fisso)].map(csvCell).join(';');
    });
    const blob = new Blob(['\uFEFF' + [head.map(csvCell).join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'inventario2-prodotti.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    onToast(`${list.length} prodotti esportati`);
  };

  return (
    <section className="dt1-section" data-dt1 data-dt1-marker="" data-dt1-enter={enter ? '' : undefined}>
      <div className="dt1-card">
        <div className="dt1-shell" data-dt1-toast={toast ? 'on' : 'off'}>
          <div className="dt1-head">
            <div className="dt1-titles">
              <h3 className="dt1-title">Prodotti</h3>
              <p className="dt1-meta">{rows.length} prodotti · {PER_PAGE} per pagina</p>
            </div>
            <span className="dt1-export">
              <button type="button" className="dt1-btn dt1-btn--plain" onClick={onPrecompila} disabled={precompilando || loading}>
                <Sparkles />
                {precompilando ? 'Precompilazione…' : 'Precompila dal sistema attuale'}
              </button>
              <button type="button" className="dt1-btn dt1-btn--beam" onClick={esporta}>
                <span className="dt1-beam-track" aria-hidden="true"><span className="dt1-beam" /></span>
                <Download />
                Esporta CSV
              </button>
            </span>
            <div className="dt1-selects">
              <select className="dt1-select" value={categoria} onChange={filtra(setCategoria)} aria-label="Filtra per categoria">
                <option value="">Tutte le categorie</option>
                {categorie.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="dt1-select" value={fornitore} onChange={filtra(setFornitore)} aria-label="Filtra per fornitore">
                <option value="">Tutti i fornitori</option>
                {fornitori.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <select className="dt1-select" value={tipo} onChange={filtra(setTipo)} aria-label="Filtra per tipo">
                <option value="">Tutti i tipi</option>
                <option value="materia_prima">Materie prime</option>
                <option value="semilavorato">Semilavorati</option>
              </select>
            </div>
          </div>

          <div className="dt1-toolwrap">
            <ProdottiPills value={stato} counts={counts} onChange={(k) => { setStato(k); setPage(1); }} />
          </div>

          <div className="dt1-tablewrap" ref={wrapRef} onPointerLeave={markerOff}>
            <div className="dt1-marker" ref={markerRef} data-on="0" aria-hidden="true" />
            <div className="dt1-zone" onScroll={markerOff}>
              {loading ? (
                <div className="dt1-skel" aria-hidden="true">
                  {Array.from({ length: 8 }).map((_, i) => <div key={i} className="dt1-skel-row" />)}
                </div>
              ) : list.length === 0 ? (
                <div className="dt1-empty">
                  <span className="dt1-empty-ico"><Inbox /></span>
                  <span className="dt1-empty-t">Nessun prodotto corrisponde ai filtri</span>
                  <p className="dt1-empty-p">Cambia categoria, fornitore, tipo o stato per vedere altri prodotti.</p>
                </div>
              ) : (
                <table className="dt1-table">
                  <thead>
                    <tr>
                      {SORTABLE.map((c) => (
                        <th key={c.key} className="dt1-th" scope="col" aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                          <button type="button" className="dt1-sort" onClick={() => ordina(c.key)}>
                            {c.label} <ArrowDown className="dt1-sort-ind" aria-hidden="true" />
                          </button>
                        </th>
                      ))}
                      <th className="dt1-th" scope="col">Unità</th>
                      <th className="dt1-th dt1-th--c" scope="col">Incluso</th>
                      <th className="dt1-th dt1-th--c" scope="col">Laboratorio</th>
                      <th className="dt1-th dt1-th--c" scope="col">Consumabile</th>
                      <th className="dt1-th dt1-th--c" scope="col">Prod. in lab</th>
                      {ubicazioni.map((u) => (
                        <React.Fragment key={u.key}>
                          <th className="dt1-th dt1-th--c" scope="col"><small>{u.label}</small>min</th>
                          <th className="dt1-th dt1-th--c" scope="col"><small>{u.label}</small>max</th>
                        </React.Fragment>
                      ))}
                      <th className="dt1-th" scope="col">Giorno fisso</th>
                      <th className="dt1-th" scope="col"><span className="sr-only">Modifica</span></th>
                    </tr>
                  </thead>
                  <tbody onPointerOver={markerTo}>
                    {slice.map((r, i) => (
                      <ProdottoRow key={r.key} row={r} imp={eff(r)} ubicazioni={ubicazioni} index={i} onSave={onSave} onEdit={onEdit} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {!loading && list.length > 0 && (
            <ProdottiPager page={cur} pages={pages} shown={start + slice.length} total={list.length} onPage={setPage} />
          )}
          {(loading || list.length === 0) && <div style={{ height: 20 }} />}

          <div className="dt1-toast" role="status" aria-live="polite">
            <Check aria-hidden="true" />
            <span>{toast}</span>
          </div>
        </div>
      </div>
    </section>
  );
}