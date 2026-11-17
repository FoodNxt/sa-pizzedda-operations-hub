export const CATEGORIE_CONSUMABILI = ['Consumabili', 'Packaging', 'Pulizia'];

export const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
export const ORDINE_GIORNI = [1, 2, 3, 4, 5, 6, 0];

export const RICORRENZE = [
  { value: 'giornaliera', label: 'Giornaliera' },
  { value: 'due_volte_settimana', label: '2 volte a settimana' },
  { value: 'settimanale', label: 'Settimanale' },
  { value: 'ogni_due_settimane', label: 'Ogni 2 settimane' },
  { value: 'mensile', label: 'Mensile' }
];

export const MODALITA = [
  { value: 'spento', label: 'Spento' },
  { value: 'affiancamento', label: 'Affiancamento' },
  { value: 'attivo', label: 'Attivo' }
];

export const DEFAULT_CONFIG = {
  modalita_per_store: {},
  lab_store_id: '6908b4f284cb01bc8402b4ee',
  basi_ricetta_id: '',
  limite_voci_sera: 15,
  intervallo_max_giorni_per_categoria: {
    'Ingredienti pronti': 7,
    'Ortofrutta': 7,
    'Ingredienti base': 14,
    'Bevande': 14,
    'Dolci': 14,
    'Angolo di Sardegna': 14,
    'Packaging': 30,
    'Consumabili': 30,
    'Pulizia': 30,
    'semilavorato': 7
  },
  soglia_affidabilita: 0.3
};

export const TIPO_LABEL = { materia_prima: 'Materia prima', semilavorato: 'Semilavorato' };

// segno: come il movimento cambia la giacenza ('=' conteggio, '±' rettifica con segno nella quantità)
export const TIPI_MOVIMENTO = {
  conteggio: { label: 'Conteggio', colore: '#bfdbfe', segno: '=' },
  ricevimento: { label: 'Ricevimento', colore: '#bbf7d0', segno: '+' },
  produzione_carico: { label: 'Produzione (carico)', colore: '#bbf7d0', segno: '+' },
  produzione_scarico: { label: 'Produzione (scarico)', colore: '#fde68a', segno: '−' },
  trasporto_uscita: { label: 'Trasporto (uscita)', colore: '#fde68a', segno: '−' },
  trasporto_entrata: { label: 'Trasporto (entrata)', colore: '#bbf7d0', segno: '+' },
  spreco: { label: 'Spreco', colore: '#fecaca', segno: '−' },
  rettifica: { label: 'Rettifica', colore: '#e2e8f0', segno: '±' }
};

export const FONTI_MOVIMENTO = {
  inventario_v2: 'Inventario 2.0',
  form_inventario_v1: 'Form inventario attuale',
  form_cantina_v1: 'Form cantina attuale',
  ordine_fornitore: 'Ordine fornitore',
  produzione_lab: 'Produzione lab',
  trasporto: 'Trasporto',
  manuale: 'Manuale'
};

export function buildRows(materie, ricette) {
  const mp = materie.filter((m) => m.attivo !== false).map((m) => ({
    key: `materia_prima:${m.id}`,
    tipo: 'materia_prima',
    id: m.id,
    nome: m.nome_prodotto,
    categoria: m.categoria || '',
    fornitore: m.fornitore || '',
    unitaDefault: m.unita_misura || '',
    src: m
  }));
  const sl = ricette.filter((r) => r.is_semilavorato).map((r) => ({
    key: `semilavorato:${r.id}`,
    tipo: 'semilavorato',
    id: r.id,
    nome: r.nome_prodotto,
    categoria: 'Semilavorato',
    fornitore: '',
    unitaDefault: r.unita_misura_form_inventario || 'grammi',
    src: r
  }));
  return [...mp, ...sl];
}

export function defaultImpostazione(row) {
  return {
    item_tipo: row.tipo,
    item_id: row.id,
    item_nome: row.nome,
    incluso: false,
    laboratorio: false,
    consumabile: false,
    producibile_lab: false,
    unita_conteggio: row.unitaDefault,
    fattore_unita_ordine: 1,
    min_per_ubicazione: {},
    max_per_ubicazione: {}
  };
}

// Impostazione proposta a partire dal sistema attuale
export function precompilaImpostazione(row) {
  const base = defaultImpostazione(row);
  if (row.tipo === 'semilavorato') {
    const r = row.src;
    return { ...base, incluso: r.attivo !== false && !!r.mostra_in_form_inventario && (r.stores_form_inventario || []).length > 0 };
  }
  const m = row.src;
  const inUso = Object.entries(m.in_uso_per_store || {}).filter(([, v]) => v).map(([k]) => k);
  const min = {};
  const max = {};
  inUso.forEach((s) => {
    const mn = m.store_specific_quantita_critica?.[s] ?? m.quantita_critica ?? 0;
    min[s] = mn;
    max[s] = mn + (m.store_specific_quantita_ordine?.[s] ?? m.quantita_ordine ?? 0);
  });
  return {
    ...base,
    incluso: m.attivo !== false && inUso.length > 0,
    consumabile: CATEGORIE_CONSUMABILI.includes(m.categoria),
    min_per_ubicazione: min,
    max_per_ubicazione: max
  };
}

export function setUbicazione(obj, key, value) {
  const next = { ...(obj || {}) };
  if (value === undefined) delete next[key];
  else next[key] = value;
  return next;
}

export const GIORNI_MAX = { due_volte_settimana: 2, settimanale: 1, ogni_due_settimane: 1 };

// Giorno fisso: dal formato salvato a quello dei campi e ritorno
export const giornoFissoDaCf = (cf) => ({
  attivo: !!cf?.attivo,
  ricorrenza: cf?.ricorrenza || 'settimanale',
  giorni: cf?.giorni_settimana || [],
  data_partenza: cf?.data_partenza || '',
  giorno_mese: cf?.giorno_mese || 1
});

export function giornoFissoACf(f) {
  const max = GIORNI_MAX[f.ricorrenza];
  const cf = { attivo: f.attivo, ricorrenza: f.ricorrenza, giorni_settimana: max ? f.giorni.slice(-max) : [] };
  if (f.ricorrenza === 'ogni_due_settimane' && f.data_partenza) cf.data_partenza = f.data_partenza;
  if (f.ricorrenza === 'mensile') cf.giorno_mese = Math.min(28, Math.max(1, Number(f.giorno_mese) || 1));
  return cf;
}

export function riassuntoGiornoFisso(cf, perUbicazione) {
  const diversi = Object.keys(perUbicazione || {}).length;
  if (diversi) return `${riassuntoGiornoFisso(cf)} · diverso in ${diversi} ${diversi === 1 ? 'locale' : 'locali'}`;
  if (!cf?.attivo) return '—';
  const label = RICORRENZE.find((r) => r.value === cf.ricorrenza)?.label || 'Settimanale';
  if (cf.ricorrenza === 'giornaliera') return label;
  if (cf.ricorrenza === 'mensile') return `${label} · giorno ${cf.giorno_mese || 1}`;
  const giorni = (cf.giorni_settimana || []).map((g) => GIORNI[g]).join(', ');
  return giorni ? `${label} · ${giorni}` : label;
}