// Calcoli di giacenza stimata, affidabilità e prossimo conteggio (Inventario 2.0)
// Un movimento qui è { tipo, quantita, t } con t in millisecondi, ordinati per t crescente.

export const GIORNO = 86400000;
const DODICI_ORE = 12 * 3600000;
const USCITE = ['produzione_scarico', 'trasporto_uscita', 'spreco'];
// La rettifica manuale ha il segno nella quantità: positiva aggiunge, negativa toglie
const ENTRATE = ['ricevimento', 'produzione_carico', 'trasporto_entrata', 'rettifica'];

export const DIECI_MINUTI = 600000;

// Conteggi dello stesso prodotto con lo stesso valore a meno di 10 minuti di distanza valgono come uno solo: resta il più recente.
// moves = movimenti di un prodotto in una ubicazione, ordinati per t crescente
export function senzaConteggiDoppi(moves) {
  return moves.filter((m, i) => {
    if (m.tipo !== 'conteggio') return true;
    const dopo = moves.slice(i + 1).find((x) => x.tipo === 'conteggio');
    return !(dopo && dopo.quantita === m.quantita && dopo.t - m.t < DIECI_MINUTI);
  });
}

export const giornoRoma = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(d);
export const addGiorni = (s, n) => new Date(Date.parse(`${s}T00:00:00Z`) + n * GIORNO).toISOString().slice(0, 10);

// Somma dei movimenti dei tipi indicati nell'intervallo (da, a]
const somma = (moves, tipi, da, a) =>
  moves.reduce((s, m) => (tipi.includes(m.tipo) && m.t > da && m.t <= a ? s + m.quantita : s), 0);

// Consumo teorico dalle vendite: media al giorno e consumo tra due istanti.
// teorico = { giorni: [{ giorno, inizio, fine }] con le vendite sincronizzate, perGiorno: { giorno: quantità } }.
// Per il tempo senza vendite sincronizzate (di solito oggi) vale la media.
function consumoTeorico(teorico) {
  const giorni = teorico?.giorni || [];
  const perGiorno = teorico?.perGiorno || {};
  const media = giorni.length ? giorni.reduce((s, g) => s + (perGiorno[g.giorno] || 0), 0) / giorni.length : 0;
  const tra = (da, a) => {
    let totale = 0;
    let coperti = 0;
    giorni.forEach((g) => {
      const ms = Math.min(a, g.fine) - Math.max(da, g.inizio);
      if (ms <= 0) return;
      coperti += ms;
      totale += (perGiorno[g.giorno] || 0) * (ms / (g.fine - g.inizio));
    });
    return totale + media * ((a - da - coperti) / GIORNO);
  };
  return { media, tra };
}

// Consumo non registrato sull'intero periodo tra il primo e l'ultimo conteggio:
// gli errori dei conteggi intermedi si compensano. teoricoTra, se c'è, dà il consumo teorico sullo stesso periodo.
// I singoli intervalli servono solo alla diagnostica: quanti hanno un residuo negativo.
function consumoPeriodo(counts, moves, teoricoTra) {
  const residuoTra = (a, b) => a.quantita + somma(moves, ENTRATE, a.t, b.t) - somma(moves, USCITE, a.t, b.t) - b.quantita;
  let negativi = 0;
  let totali = 0;
  for (let i = 1; i < counts.length; i++) {
    if (counts[i].t - counts[i - 1].t < DODICI_ORE) continue;
    totali++;
    if (residuoTra(counts[i - 1], counts[i]) < 0) negativi++;
  }
  const diagnostica = { negativi, totali, incoerenti: totali > 0 && negativi / totali > 0.3 };
  const primo = counts[0];
  const ultimo = counts[counts.length - 1];
  if (!primo || ultimo.t - primo.t < DODICI_ORE) return { valido: false, ...diagnostica };
  const giorni = (ultimo.t - primo.t) / GIORNO;
  const residuo = residuoTra(primo, ultimo);
  return { valido: true, residuo, giorni, consumo: residuo / giorni, teorico: teoricoTra ? teoricoTra(primo.t, ultimo.t) : 0, ...diagnostica };
}

// Consumo al giorno e consumo tra due istanti: dalle vendite se c'è un teorico, altrimenti da conteggi, poi da ricevimenti
function stimaConsumo(counts, moves, fine, vendite) {
  if (vendite.media > 0) {
    const periodo = consumoPeriodo(counts, moves, vendite.tra);
    // Con un residuo negativo sul periodo il teorico resta senza correzione
    const correggibile = periodo.valido && periodo.teorico > 0 && periodo.residuo >= 0;
    const fattore = correggibile ? Math.min(1.5, Math.max(0.7, periodo.residuo / periodo.teorico)) : 1;
    return { fonte: 'vendite', fattore, consumo: vendite.media * fattore, tra: (da, a) => vendite.tra(da, a) * fattore, periodo };
  }
  const periodo = consumoPeriodo(counts, moves);
  // Residuo negativo sul periodo: nessun consumo, non si inventa un valore
  if (periodo.valido && periodo.residuo < 0) return { fonte: 'nessun_dato', fattore: null, consumo: null, tra: () => 0, periodo };
  const consumo = periodo.valido ? periodo.consumo : somma(moves, ['ricevimento'], fine - 28 * GIORNO, fine) / 28;
  return { fonte: periodo.valido ? 'conteggi' : 'ricevimenti', fattore: null, consumo, tra: (da, a) => consumo * ((a - da) / GIORNO), periodo };
}

// Consumo al giorno da conteggi e teorico sullo stesso periodo, tra il primo e l'ultimo conteggio da `dal` in poi
export function confrontaConsumo(moves, teorico, dal) {
  const c = consumoPeriodo(moves.filter((m) => m.tipo === 'conteggio' && m.t >= dal), moves, consumoTeorico(teorico).tra);
  return c.valido ? { giorni: c.giorni, conteggi: c.consumo, teorico: c.teorico / c.giorni } : null;
}

export function calcolaGiacenza(moves, now, soglia, teorico) {
  const counts = moves.filter((m) => m.tipo === 'conteggio');
  const vendite = consumoTeorico(teorico);
  const stima = stimaConsumo(counts, moves, now, vendite);
  const consumo = stima.consumo;
  const usciteGiorno = somma(moves, USCITE, now - 28 * GIORNO, now) / 28;
  const { negativi, totali, incoerenti } = stima.periodo;
  const base = { consumo, usciteGiorno, negativi, totali, incoerenti, fonte: stima.fonte, fattore: stima.fattore, teoricoGiorno: vendite.media > 0 ? vendite.media : null };

  const ultimo = counts[counts.length - 1];
  if (!ultimo) return { ...base, ultimo: null, giacenza: null, giorniCopertura: null, affidabilita: 'nessun_dato', scarto: null };

  const giacenza = Math.max(
    0,
    ultimo.quantita + somma(moves, ENTRATE, ultimo.t, now) - somma(moves, USCITE, ultimo.t, now) - stima.tra(ultimo.t, now)
  );

  // Affidabilità: stima calcolata subito prima dell'ultimo conteggio, confrontata con il valore contato
  let affidabilita = 'ok';
  let scarto = null;
  const precedente = [...counts].reverse().find((c) => ultimo.t - c.t >= DODICI_ORE);
  if (precedente) {
    const consumato = stimaConsumo(counts.filter((c) => c.t <= precedente.t), moves, ultimo.t, vendite).tra(precedente.t, ultimo.t);
    const stimaPrima = Math.max(
      0,
      precedente.quantita + somma(moves, ENTRATE, precedente.t, ultimo.t) - somma(moves, USCITE, precedente.t, ultimo.t) - consumato
    );
    scarto = Math.abs(stimaPrima - ultimo.quantita) / Math.max(consumato, 1);
    if (scarto > soglia) affidabilita = 'da_verificare';
  }
  if (incoerenti) affidabilita = 'da_verificare';

  const perGiorno = (consumo || 0) + usciteGiorno;
  return { ...base, ultimo, giacenza, giorniCopertura: perGiorno > 0 ? giacenza / perGiorno : null, affidabilita, scarto };
}

export function prossimaRicorrenza(cf, start) {
  const giorni = cf.giorni_settimana || [];
  const lunedi = (s) => {
    const ms = Date.parse(`${s}T00:00:00Z`);
    return ms - ((new Date(ms).getUTCDay() + 6) % 7) * GIORNO;
  };
  for (let i = 0; i < 62; i++) {
    const d = addGiorni(start, i);
    const dt = new Date(`${d}T00:00:00Z`);
    const giornoOk = !giorni.length || giorni.includes(dt.getUTCDay());
    if (cf.ricorrenza === 'giornaliera') return d;
    if (cf.ricorrenza === 'mensile') {
      if (dt.getUTCDate() === (cf.giorno_mese || 1)) return d;
    } else if (cf.ricorrenza === 'ogni_due_settimane') {
      const partenza = cf.data_partenza;
      const settimanaOk = !partenza || (d >= partenza && Math.round((lunedi(d) - lunedi(partenza)) / (7 * GIORNO)) % 2 === 0);
      if (giornoOk && settimanaOk) return d;
    } else if (giornoOk) {
      return d;
    }
  }
  return start;
}

export function prossimoConteggio({ fisso, r, oggi, min, tempoConsegna, intervallo }) {
  const ultimoGiorno = r.ultimo ? giornoRoma(new Date(r.ultimo.t)) : null;
  if (fisso?.attivo) {
    const start = ultimoGiorno === oggi ? addGiorni(oggi, 1) : oggi;
    return { data: prossimaRicorrenza(fisso, start), motivo: 'Giorno fisso', priorita: 1 };
  }
  const candidati = [];
  if (!ultimoGiorno) {
    candidati.push({ data: oggi, motivo: 'Mai contato', priorita: 2 });
  } else {
    if (r.affidabilita === 'da_verificare') {
      const motivo = r.incoerenti ? 'Conteggi incoerenti (possibili consegne non registrate o unità sbagliata)' : 'Ultimo conteggio non affidabile';
      candidati.push({ data: addGiorni(ultimoGiorno, 2), motivo, priorita: 3 });
    }
    if (intervallo > 0) candidati.push({ data: addGiorni(ultimoGiorno, intervallo), motivo: 'Intervallo massimo', priorita: 5 });
  }
  const perGiorno = (r.consumo || 0) + r.usciteGiorno;
  if (min != null && r.giacenza != null && perGiorno > 0) {
    const giorni = Math.max(0, Math.floor((r.giacenza - min) / perGiorno) - tempoConsegna - 1);
    candidati.push({ data: addGiorni(oggi, giorni), motivo: 'Vicino al riordino', priorita: 4 });
  }
  candidati.forEach((c) => { if (c.data < oggi) c.data = oggi; });
  candidati.sort((a, b) => a.data.localeCompare(b.data) || a.priorita - b.priorita);
  return candidati[0] || { data: null, motivo: null, priorita: null };
}