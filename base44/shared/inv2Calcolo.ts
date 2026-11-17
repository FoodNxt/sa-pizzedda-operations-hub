// Calcoli di giacenza stimata, affidabilità e prossimo conteggio (Inventario 2.0)
// Un movimento qui è { tipo, quantita, t } con t in millisecondi, ordinati per t crescente.

export const GIORNO = 86400000;
const DODICI_ORE = 12 * 3600000;
const USCITE = ['produzione_scarico', 'trasporto_uscita', 'spreco'];
// La rettifica manuale ha il segno nella quantità: positiva aggiunge, negativa toglie
const ENTRATE = ['ricevimento', 'produzione_carico', 'trasporto_entrata', 'rettifica'];

export const giornoRoma = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(d);
export const addGiorni = (s, n) => new Date(Date.parse(`${s}T00:00:00Z`) + n * GIORNO).toISOString().slice(0, 10);

// Somma dei movimenti dei tipi indicati nell'intervallo (da, a]
const somma = (moves, tipi, da, a) =>
  moves.reduce((s, m) => (tipi.includes(m.tipo) && m.t > da && m.t <= a ? s + m.quantita : s), 0);

// Consumo non registrato, dai residui tra conteggi consecutivi
function consumoDaCoppie(counts, moves) {
  let residui = 0;
  let giorni = 0;
  let scartati = 0;
  for (let i = 1; i < counts.length; i++) {
    const a = counts[i - 1];
    const b = counts[i];
    if (b.t - a.t < DODICI_ORE) continue;
    const residuo = a.quantita + somma(moves, ENTRATE, a.t, b.t) - somma(moves, USCITE, a.t, b.t) - b.quantita;
    if (residuo < 0) { scartati++; continue; }
    residui += residuo;
    giorni += (b.t - a.t) / GIORNO;
  }
  return { valido: giorni > 0, consumo: giorni > 0 ? residui / giorni : 0, scartati };
}

export function calcolaGiacenza(moves, now, soglia) {
  const counts = moves.filter((m) => m.tipo === 'conteggio');
  const ricevimentiGiorno = (fine) => somma(moves, ['ricevimento'], fine - 28 * GIORNO, fine) / 28;
  const coppie = consumoDaCoppie(counts, moves);
  const consumo = coppie.valido ? coppie.consumo : ricevimentiGiorno(now);
  const usciteGiorno = somma(moves, USCITE, now - 28 * GIORNO, now) / 28;
  const base = { consumo, usciteGiorno, scartati: coppie.scartati };

  const ultimo = counts[counts.length - 1];
  if (!ultimo) return { ...base, ultimo: null, giacenza: null, giorniCopertura: null, affidabilita: 'nessun_dato', scarto: null };

  const giacenza = Math.max(
    0,
    ultimo.quantita + somma(moves, ENTRATE, ultimo.t, now) - somma(moves, USCITE, ultimo.t, now) - consumo * ((now - ultimo.t) / GIORNO)
  );

  // Affidabilità: stima calcolata subito prima dell'ultimo conteggio, confrontata con il valore contato
  let affidabilita = 'ok';
  let scarto = null;
  const precedente = [...counts].reverse().find((c) => ultimo.t - c.t >= DODICI_ORE);
  if (precedente) {
    const prima = consumoDaCoppie(counts.filter((c) => c.t <= precedente.t), moves);
    const consumoPrima = prima.valido ? prima.consumo : ricevimentiGiorno(ultimo.t);
    const giorni = (ultimo.t - precedente.t) / GIORNO;
    const stima = Math.max(
      0,
      precedente.quantita + somma(moves, ENTRATE, precedente.t, ultimo.t) - somma(moves, USCITE, precedente.t, ultimo.t) - consumoPrima * giorni
    );
    scarto = Math.abs(stima - ultimo.quantita) / Math.max(consumoPrima * giorni, 1);
    if (scarto > soglia) affidabilita = 'da_verificare';
  }

  const perGiorno = consumo + usciteGiorno;
  return { ...base, ultimo, giacenza, giorniCopertura: perGiorno > 0 ? giacenza / perGiorno : null, affidabilita, scarto };
}

function prossimaRicorrenza(cf, start) {
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
      candidati.push({ data: addGiorni(ultimoGiorno, 2), motivo: 'Ultimo conteggio non affidabile', priorita: 3 });
    }
    if (intervallo > 0) candidati.push({ data: addGiorni(ultimoGiorno, intervallo), motivo: 'Intervallo massimo', priorita: 5 });
  }
  const perGiorno = r.consumo + r.usciteGiorno;
  if (min != null && r.giacenza != null && perGiorno > 0) {
    const giorni = Math.max(0, Math.floor((r.giacenza - min) / perGiorno) - tempoConsegna - 1);
    candidati.push({ data: addGiorni(oggi, giorni), motivo: 'Vicino al riordino', priorita: 4 });
  }
  candidati.forEach((c) => { if (c.data < oggi) c.data = oggi; });
  candidati.sort((a, b) => a.data.localeCompare(b.data) || a.priorita - b.priorita);
  return candidati[0] || { data: null, motivo: null, priorita: null };
}