import { fetchAll } from '../../shared/inv2.ts';
import { GIORNO, addGiorni, consumoMisurato, consumoTeorico, giornoRoma } from '../../shared/inv2Calcolo.ts';
import { preparaCalcolo } from '../../shared/inv2Ricalcolo.ts';
import { mezzanotte } from '../../shared/inv2Teorico.ts';

const GIORNI = 56;
const ORA = 3600000;
// Il conteggio dei dipendenti deve essere della sera prima: al massimo 18 ore prima della verifica
const SERA_PRIMA = 18 * ORA;
// Prima dell'apertura: la verifica è salvata prima di quest'ora di Roma
const ORA_APERTURA = 11;
const oraRoma = (t) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', hourCycle: 'h23' }).format(new Date(t)));
const r1 = (n) => Math.round(n * 10) / 10;

// Somma i confronti di una voce (prodotto o dipendente)
function aggiungi(mappa, chiave, base, differenza, pct) {
  const v = (mappa[chiave] ||= { ...base, confronti: 0, somma_pct: 0, somma_unita: 0, oltre_10: 0 });
  v.confronti++;
  v.somma_pct += pct;
  v.somma_unita += differenza;
  if (pct > 10) v.oltre_10++;
}
const medie = (mappa) => Object.values(mappa)
  .map(({ somma_pct, somma_unita, ...v }) => ({ ...v, scarto_medio_pct: r1(somma_pct / v.confronti), scarto_medio_unita: Math.round((somma_unita / v.confronti) * 100) / 100 }))
  .sort((a, b) => b.scarto_medio_pct - a.scarto_medio_pct);

// Promemoria delle verifiche admin per ubicazione e affidabilità dei conteggi dei dipendenti, ultimi 56 giorni
export async function verifiche(sr) {
  const E = sr.entities;
  const { now, coppie } = await preparaCalcolo(sr);

  // Ultima verifica e intervalli puliti degli ultimi 28 giorni, per ubicazione
  const promemoria = {};
  coppie.forEach(({ u, moves, teorico, rete, ordineAperto }) => {
    const p = (promemoria[u.ubicazione_key] ||= { ubicazione_key: u.ubicazione_key, ultima_verifica: null, intervalli_puliti: 0, prodotti: 0 });
    const ultima = moves.filter((m) => m.verifica).pop();
    if (ultima && !(p.ultima_verifica >= ultima.t)) p.ultima_verifica = ultima.t;
    const misurato = rete ? null : consumoMisurato(moves, consumoTeorico(teorico).tra, now, 28, ordineAperto);
    if (!misurato) return;
    p.intervalli_puliti += misurato.intervalli;
    p.prodotti++;
  });

  const dal = now - GIORNI * GIORNO;
  const admin = await fetchAll(E.MovimentoMagazzino, { tipo: 'conteggio', fonte: 'verifica_admin', data_movimento: { $gte: new Date(dal).toISOString() } }, 'data_movimento');
  const prodotti = {};
  const dipendenti = {};
  if (admin.length) {
    const [altri, ricavi] = await Promise.all([
      fetchAll(E.MovimentoMagazzino, {
        ubicazione_key: { $in: [...new Set(admin.map((m) => m.ubicazione_key))] },
        item_id: { $in: [...new Set(admin.map((m) => m.item_id))] },
        fonte: { $ne: 'verifica_admin' },
        data_movimento: { $gte: new Date(dal - SERA_PRIMA).toISOString() }
      }, 'data_movimento'),
      fetchAll(E.RevenueByHour, {
        store_id: { $in: [...new Set(admin.map((m) => m.store_id))] },
        order_date: { $gte: addGiorni(giornoRoma(new Date(dal)), -1) },
        total_orders: { $gt: 0 }
      }, 'order_date')
    ]);
    // Ore con vendite per store, come istante di inizio dell'ora
    const vendite = {};
    ricavi.forEach((r) => (vendite[r.store_id] ||= []).push(mezzanotte(r.order_date) + (r.order_hour || 0) * ORA));
    const perCoppia = {};
    altri.forEach((m) => (perCoppia[`${m.ubicazione_key}|${m.item_id}`] ||= []).push({ ...m, t: Date.parse(m.data_movimento) }));

    admin.forEach((v) => {
      const t = Date.parse(v.data_movimento);
      if (oraRoma(t) >= ORA_APERTURA) return;
      const prima = (perCoppia[`${v.ubicazione_key}|${v.item_id}`] || []).filter((m) => m.t < t);
      const d = [...prima].reverse().find((m) => m.tipo === 'conteggio');
      if (!d || t - d.t > SERA_PRIMA || d.unita_sospetta || d.unita_precedente) return;
      // Tra i due conteggi non deve essere successo niente: né movimenti registrati né vendite (dalla revenue oraria, quando c'è)
      if (prima.some((m) => m.tipo !== 'conteggio' && m.t > d.t)) return;
      if (v.ubicazione_tipo !== 'laboratorio' && (vendite[v.store_id] || []).some((h) => h > d.t && h <= t)) return;
      const differenza = Math.abs(d.quantita - v.quantita);
      const pct = v.quantita > 0 ? (differenza / v.quantita) * 100 : differenza > 0 ? 100 : 0;
      aggiungi(prodotti, v.item_id, { nome: v.item_nome, unita: v.unita || '' }, differenza, pct);
      aggiungi(dipendenti, d.utente_nome || d.utente_email || 'Sconosciuto', { nome: d.utente_nome || d.utente_email || 'Sconosciuto', unita: '' }, differenza, pct);
    });
  }

  return {
    giorni: GIORNI,
    promemoria: Object.values(promemoria).map((p) => ({ ...p, ultima_verifica: p.ultima_verifica ? new Date(p.ultima_verifica).toISOString() : null })),
    prodotti: medie(prodotti),
    dipendenti: medie(dipendenti)
  };
}