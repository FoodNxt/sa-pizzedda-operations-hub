import { fetchAll } from '../../shared/inv2.ts';
import { GIORNO, consumoMisurato, teoricoOrario } from '../../shared/inv2Calcolo.ts';
import { preparaCalcolo } from '../../shared/inv2Ricalcolo.ts';

const GIORNI = 56;
// La verifica si confronta con l'ultimo conteggio dei dipendenti, se è delle 48 ore precedenti
const MAX_DISTANZA = 48 * 3600000;
const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;

// Somma i confronti di una voce (prodotto o dipendente)
function aggiungi(mappa, chiave, base, differenza, pct, teorico, stimato) {
  const v = (mappa[chiave] ||= { ...base, confronti: 0, somma_pct: 0, somma_unita: 0, somma_teorico: 0, oltre_10: 0, orario_stimato: 0 });
  v.confronti++;
  v.somma_pct += pct;
  v.somma_unita += differenza;
  v.somma_teorico += teorico;
  if (pct > 10) v.oltre_10++;
  if (stimato) v.orario_stimato++;
}
const medie = (mappa) => Object.values(mappa)
  .map(({ somma_pct, somma_unita, somma_teorico, ...v }) => ({
    ...v,
    scarto_medio_pct: r1(somma_pct / v.confronti),
    scarto_medio_unita: r2(somma_unita / v.confronti),
    teorico_sottratto_medio: r2(somma_teorico / v.confronti)
  }))
  .sort((a, b) => b.scarto_medio_pct - a.scarto_medio_pct);

// Promemoria delle verifiche admin per ubicazione e affidabilità dei conteggi dei dipendenti, ultimi 56 giorni
export async function verifiche(sr) {
  const E = sr.entities;
  const { now, coppie } = await preparaCalcolo(sr);

  // Ultima verifica e intervalli puliti degli ultimi 28 giorni, per ubicazione
  const promemoria = {};
  const teorici = {};
  coppie.forEach(({ u, k, moves, teorico, rete, ordineAperto }) => {
    const orario = (teorici[k] = teoricoOrario(teorico));
    const p = (promemoria[u.ubicazione_key] ||= { ubicazione_key: u.ubicazione_key, ultima_verifica: null, intervalli_puliti: 0, prodotti: 0 });
    const ultima = moves.filter((m) => m.verifica).pop();
    if (ultima && !(p.ultima_verifica >= ultima.t)) p.ultima_verifica = ultima.t;
    const misurato = rete ? null : consumoMisurato(moves, orario.tra, now, 28, ordineAperto);
    if (!misurato) return;
    p.intervalli_puliti += misurato.intervalli;
    p.prodotti++;
  });

  const dal = now - GIORNI * GIORNO;
  const admin = await fetchAll(E.MovimentoMagazzino, { tipo: 'conteggio', fonte: 'verifica_admin', data_movimento: { $gte: new Date(dal).toISOString() } }, 'data_movimento');
  const prodotti = {};
  const dipendenti = {};
  if (admin.length) {
    const altri = await fetchAll(E.MovimentoMagazzino, {
      ubicazione_key: { $in: [...new Set(admin.map((m) => m.ubicazione_key))] },
      item_id: { $in: [...new Set(admin.map((m) => m.item_id))] },
      fonte: { $ne: 'verifica_admin' },
      data_movimento: { $gte: new Date(dal - MAX_DISTANZA).toISOString() }
    }, 'data_movimento');
    const perCoppia = {};
    altri.forEach((m) => (perCoppia[`${m.ubicazione_key}|${m.item_id}`] ||= []).push({ ...m, t: Date.parse(m.data_movimento) }));

    admin.forEach((v) => {
      const k = `${v.ubicazione_key}|${v.item_id}`;
      const t = Date.parse(v.data_movimento);
      const prima = (perCoppia[k] || []).filter((m) => m.t < t);
      const d = [...prima].reverse().find((m) => m.tipo === 'conteggio');
      if (!d || t - d.t > MAX_DISTANZA || d.unita_sospetta || d.unita_precedente) return;
      // Tra i due conteggi non devono esserci movimenti registrati: le vendite invece si tolgono con il teorico all'ora esatta
      if (prima.some((m) => m.tipo !== 'conteggio' && m.t > d.t)) return;
      const sottratto = teorici[k] ? teorici[k].tra(d.t, t) : { quantita: 0, stimato: false };
      const atteso = Math.max(0, d.quantita - sottratto.quantita);
      const differenza = Math.abs(atteso - v.quantita);
      const pct = v.quantita > 0 ? (differenza / v.quantita) * 100 : differenza > 0 ? 100 : 0;
      const nome = d.utente_nome || d.utente_email || 'Sconosciuto';
      aggiungi(prodotti, v.item_id, { nome: v.item_nome, unita: v.unita || '' }, differenza, pct, sottratto.quantita, sottratto.stimato);
      aggiungi(dipendenti, nome, { nome, unita: '' }, differenza, pct, sottratto.quantita, sottratto.stimato);
    });
  }

  return {
    giorni: GIORNI,
    promemoria: Object.values(promemoria).map((p) => ({ ...p, ultima_verifica: p.ultima_verifica ? new Date(p.ultima_verifica).toISOString() : null })),
    prodotti: medie(prodotti),
    dipendenti: medie(dipendenti)
  };
}