// Calcoli di giacenza stimata, affidabilità e prossimo conteggio (Inventario 2.0)
// Un movimento qui è { tipo, quantita, t } con t in millisecondi, ordinati per t crescente.

export const GIORNO = 86400000;
const DODICI_ORE = 12 * 3600000;
const USCITE = ['produzione_scarico', 'trasporto_uscita', 'spreco'];
// La rettifica manuale ha il segno nella quantità: positiva aggiunge, negativa toglie
const ENTRATE = ['ricevimento', 'produzione_carico', 'trasporto_entrata', 'rettifica'];
// La retta sui conteggi vale con almeno 4 conteggi su almeno 5 giorni
const MIN_CONTEGGI = 4;
const MIN_GIORNI = 5;
// Sotto 5 unità di conteggio consumate nel periodo il prodotto non è misurabile
const MIN_UNITA = 5;

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
export function consumoTeorico(teorico) {
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

const mediana = (valori) => {
  const v = [...valori].sort((a, b) => a - b);
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

const UNITA_PICCOLE = ['grammi', 'g', 'ml'];

// Conteggi scritti probabilmente in un'altra unità: tra 1 e 20 per i prodotti contati in grammi o ml,
// e da `da` in su per i prodotti che hanno questo limite nelle impostazioni
export function unitaSospette(moves, unita, da = 0) {
  const piccola = UNITA_PICCOLE.includes(unita);
  // Un conteggio di verifica dell'admin è sempre valido
  return new Set(moves.filter((m) => m.tipo === 'conteggio' && !m.verifica && ((piccola && m.quantita > 0 && m.quantita <= 20) || (da > 0 && m.quantita >= da))));
}

// Finestra del consumo dai conteggi: la più corta tra 28, 56 e 90 giorni con almeno 4 conteggi su almeno 5 giorni,
// mai prima di `minimo`. Se nessuna basta, giorni è null e valgono gli ultimi 28 giorni
export function finestraConsumo(counts, now, minimo = 0) {
  for (const giorni of [28, 56, 90]) {
    const dal = Math.max(now - giorni * GIORNO, minimo);
    const dentro = counts.filter((c) => c.t >= dal);
    if (dentro.length >= MIN_CONTEGGI && (dentro[dentro.length - 1].t - dentro[0].t) / GIORNO >= MIN_GIORNI) return { giorni, counts: dentro };
  }
  const dal = Math.max(now - 28 * GIORNO, minimo);
  return { giorni: null, counts: counts.filter((c) => c.t >= dal) };
}

// Pendenza al giorno con il metodo Theil–Sen: mediana delle pendenze tra tutte le coppie di punti distanti almeno 12 ore.
// Un singolo punto sbagliato, anche il primo o l'ultimo, non la sposta. punti = [{ t, y }]
function pendenza(punti) {
  const pendenze = [];
  for (let i = 0; i < punti.length; i++) {
    for (let j = i + 1; j < punti.length; j++) {
      const dt = punti[j].t - punti[i].t;
      if (dt >= DODICI_ORE) pendenze.push((punti[j].y - punti[i].y) / (dt / GIORNO));
    }
  }
  return mediana(pendenze);
}

// Consumo non registrato al giorno, dalla retta sui conteggi del periodo. Ogni conteggio è corretto con i movimenti
// registrati dall'inizio del periodo: contato + uscite cumulate − entrate cumulate. Il consumo è la pendenza cambiata di segno.
// teoricoTra, se c'è, dà il teorico cumulato sugli stessi punti: la sua pendenza è il teorico al giorno sullo stesso periodo.
// I singoli intervalli servono solo alla diagnostica: quanti hanno un residuo negativo.
export function consumoPeriodo(counts, moves, teoricoTra) {
  const residuoTra = (a, b) => a.quantita + somma(moves, ENTRATE, a.t, b.t) - somma(moves, USCITE, a.t, b.t) - b.quantita;
  let negativi = 0;
  let totali = 0;
  for (let i = 1; i < counts.length; i++) {
    if (counts[i].t - counts[i - 1].t < DODICI_ORE) continue;
    totali++;
    if (residuoTra(counts[i - 1], counts[i]) < 0) negativi++;
  }
  const primo = counts[0];
  const giorni = primo ? (counts[counts.length - 1].t - primo.t) / GIORNO : 0;
  const valido = counts.length >= MIN_CONTEGGI && giorni >= MIN_GIORNI;
  const consumo = valido
    ? -pendenza(counts.map((c) => ({ t: c.t, y: c.quantita + somma(moves, USCITE, primo.t, c.t) - somma(moves, ENTRATE, primo.t, c.t) })))
    : null;
  const teorico = valido && teoricoTra ? pendenza(counts.map((c) => ({ t: c.t, y: teoricoTra(primo.t, c.t) }))) : null;
  // Misurabile: il consumo del periodo, teorico se c'è e altrimenti da conteggi, è almeno 5 unità di conteggio
  const consumato = teoricoTra ? (primo ? teoricoTra(primo.t, primo.t + giorni * GIORNO) : 0) : valido ? consumo * giorni : 0;
  const misurabile = consumato >= MIN_UNITA;
  return { valido, giorni, consumo, teorico, misurabile, negativi, totali, incoerenti: misurabile && totali > 0 && negativi / totali > 0.3 };
}

// Consumo misurato sugli intervalli puliti tra due conteggi di verifica dell'admin consecutivi, finiti negli ultimi `giorni`.
// Un intervallo è pulito se alla sua fine non c'è un ordine con il prodotto ancora da confermare (ordineAperto = istante di invio
// del più vecchio) e se il residuo non è negativo: un residuo negativo vuol dire entrate, trasporti o produzioni non registrate.
// consumato = conteggio iniziale + entrate − uscite − conteggio finale. tra = teorico tra due istanti.
// Con almeno 2 intervalli con teorico il fattore è la media dei rapporti consumato / teorico pesata per giorni, tra 0,7 e 1,5
export function consumoMisurato(moves, tra, now, giorni, ordineAperto = null) {
  const verifiche = moves.filter((m) => m.tipo === 'conteggio' && m.verifica);
  const intervalli = [];
  for (let i = 1; i < verifiche.length; i++) {
    const a = verifiche[i - 1];
    const b = verifiche[i];
    if (b.t - a.t < DODICI_ORE || b.t < now - giorni * GIORNO) continue;
    if (ordineAperto != null && ordineAperto < b.t) continue;
    const consumato = a.quantita + somma(moves, ENTRATE, a.t, b.t) - somma(moves, USCITE, a.t, b.t) - b.quantita;
    if (consumato < 0) continue;
    intervalli.push({ giorni: (b.t - a.t) / GIORNO, consumato, teorico: tra(a.t, b.t) });
  }
  if (!intervalli.length) return null;
  const totale = (lista, campo) => lista.reduce((s, x) => s + x[campo], 0);
  const conTeorico = intervalli.filter((x) => x.teorico > 0);
  const media = conTeorico.reduce((s, x) => s + x.giorni * (x.consumato / x.teorico), 0) / totale(conTeorico, 'giorni');
  return {
    intervalli: intervalli.length,
    giorni: totale(intervalli, 'giorni'),
    consumo: totale(intervalli, 'consumato') / totale(intervalli, 'giorni'),
    fattore: conTeorico.length >= 2 ? Math.min(1.5, Math.max(0.7, media)) : null
  };
}

// Consumo al giorno e consumo tra due istanti: dalle vendite se c'è un teorico, altrimenti da conteggi, poi da ricevimenti
// rete = semilavorato trasportabile senza produzioni e trasporti registrati: i conteggi del singolo negozio non dicono il consumo
function stimaConsumo(counts, moves, fine, vendite, rete) {
  if (rete) {
    const periodo = { valido: false, negativi: 0, totali: 0, incoerenti: false };
    // Il fattore di rete corregge il teorico solo quando le produzioni sono registrate, altrimenti vale 1
    const fattore = rete.fattore ?? 1;
    return vendite.media > 0
      ? { fonte: 'vendite', fattore, consumo: vendite.media * fattore, tra: (da, a) => vendite.tra(da, a) * fattore, periodo }
      : { fonte: 'nessun_dato', fattore: null, consumo: null, tra: () => 0, periodo };
  }
  if (vendite.media > 0) {
    const periodo = consumoPeriodo(counts, moves, vendite.tra);
    // Senza retta, con consumo negativo o con un prodotto non misurabile il teorico resta senza correzione
    const correggibile = periodo.valido && periodo.misurabile && periodo.teorico > 0 && periodo.consumo >= 0;
    const fattore = correggibile ? Math.min(1.5, Math.max(0.7, periodo.consumo / periodo.teorico)) : 1;
    return { fonte: 'vendite', fattore, consumo: vendite.media * fattore, tra: (da, a) => vendite.tra(da, a) * fattore, periodo };
  }
  const periodo = consumoPeriodo(counts, moves);
  // Consumo negativo sul periodo: nessun consumo, non si inventa un valore
  if (periodo.valido && periodo.consumo < 0) return { fonte: 'nessun_dato', fattore: null, consumo: null, tra: () => 0, periodo };
  const consumo = periodo.valido ? periodo.consumo : somma(moves, ['ricevimento'], fine - 28 * GIORNO, fine) / 28;
  return { fonte: periodo.valido ? 'conteggi' : 'ricevimenti', fattore: null, consumo, tra: (da, a) => consumo * ((a - da) / GIORNO), periodo };
}

// Consumo al giorno da conteggi e teorico sullo stesso periodo, sui conteggi da `dal` in poi.
// I conteggi segnati sospetti dall'ultimo ricalcolo non contano
export function confrontaConsumo(moves, teorico, dal) {
  const c = consumoPeriodo(moves.filter((m) => m.tipo === 'conteggio' && !m.sospetto && m.t >= dal), moves, consumoTeorico(teorico).tra);
  return c.valido ? { giorni: c.giorni, conteggi: c.consumo, teorico: c.teorico, misurabile: c.misurabile } : null;
}

// Giacenza stimata all'istante t partendo da un valore noto
const stimaDa = (base, moves, tra, t) =>
  Math.max(0, base.quantita + somma(moves, ENTRATE, base.t, t) - somma(moves, USCITE, base.t, t) - tra(base.t, t));

// Un conteggio è sospetto quando si allontana dalla stima subito prima più di max(3 × consumo al giorno, 2 unità, 30% della stima)
// e i movimenti registrati nelle 24 ore precedenti non bastano a spiegare la differenza.
// stato = { base, pendente, consumo, tra }: base è il valore da cui riparte la stima, pendente il conteggio sospetto non ancora confermato
function valuta(stato, moves, c) {
  if (!stato.base || stato.consumo == null) return { sospetto: false };
  const confronta = (da) => {
    const stima = stimaDa(da, moves, stato.tra, c.t);
    const differenza = Math.abs(c.quantita - stima);
    return { stima, differenza, tolleranza: Math.max(3 * stato.consumo, 2, 0.3 * stima) };
  };
  // Il riconteggio conferma il valore del conteggio sospetto
  if (stato.pendente) {
    const v = confronta(stato.pendente);
    if (v.differenza <= v.tolleranza) return { sospetto: false, conferma: true };
  }
  const v = confronta(stato.base);
  if (v.differenza <= v.tolleranza) return { sospetto: false };
  const vicini = moves.reduce((s, m) => (m.tipo !== 'conteggio' && m.t > c.t - GIORNO && m.t <= c.t ? s + Math.abs(m.quantita) : s), 0);
  return { sospetto: vicini < v.differenza - v.tolleranza, stima: v.stima };
}

// Scorre i conteggi in ordine: dopo un conteggio sospetto la stima riparte dalla media tra stima e contato,
// e il conteggio resta sospetto finché quello successivo non lo conferma
function esaminaConteggi(counts, moves, stima) {
  const stato = { base: null, pendente: null, consumo: stima.consumo, tra: stima.tra };
  const sospetti = new Set();
  counts.forEach((c) => {
    const v = valuta(stato, moves, c);
    if (v.conferma) sospetti.delete(stato.pendente);
    // Un conteggio di verifica dell'admin non è mai sospetto: la stima riparte dal suo valore
    const sospetto = v.sospetto && !c.verifica;
    if (sospetto) sospetti.add(c);
    stato.base = sospetto ? { t: c.t, quantita: (v.stima + c.quantita) / 2 } : c;
    stato.pendente = sospetto ? c : null;
  });
  return { stato, sospetti };
}

// minimo = istante prima del quale la finestra del consumo non può iniziare
// ordineAperto = istante di invio del più vecchio ordine con il prodotto ancora da confermare, per gli intervalli puliti
export function calcolaGiacenza(moves, now, soglia, teorico, rete = false, minimo = 0, ordineAperto = null) {
  const tutti = moves.filter((m) => m.tipo === 'conteggio');
  const vendite = consumoTeorico(teorico);
  // Con almeno 2 intervalli puliti tra verifiche admin negli ultimi 56 giorni il fattore viene da quelli e non dai conteggi dei dipendenti
  const misurato = rete ? null : consumoMisurato(moves, vendite.tra, now, 56, ordineAperto);
  const daVerifiche = !!misurato?.fattore && vendite.media > 0;
  const stimaCon = (conteggi) => {
    const s = stimaConsumo(conteggi, moves, now, vendite, rete);
    if (!daVerifiche) return s;
    const fattore = misurato.fattore;
    return { ...s, fonte: 'vendite', fattore, consumo: vendite.media * fattore, tra: (da, a) => vendite.tra(da, a) * fattore };
  };
  // I conteggi sospetti si trovano con il consumo di tutti i conteggi, poi il consumo si ricalcola senza quelli non confermati
  const { stato, sospetti } = esaminaConteggi(tutti, moves, stimaCon(finestraConsumo(tutti, now, minimo).counts));
  const counts = tutti.filter((c) => !sospetti.has(c));
  const finestra = finestraConsumo(counts, now, minimo);
  const stima = stimaCon(finestra.counts);
  const consumo = stima.consumo;
  const usciteGiorno = somma(moves, USCITE, now - 28 * GIORNO, now) / 28;
  const { negativi, totali, incoerenti } = stima.periodo;
  const base = {
    consumo, usciteGiorno, negativi, totali, incoerenti, fonte: stima.fonte, fattore: stima.fattore,
    teoricoGiorno: vendite.media > 0 ? vendite.media : null,
    giorniFinestra: finestra.giorni,
    misurato,
    fonteFattore: daVerifiche ? 'verifiche_admin' : stima.fonte === 'vendite' && !rete ? 'conteggi' : null,
    sospetti,
    ricontrollo: !!stato.pendente,
    // Un conteggio fatto adesso con questa quantità sarebbe sospetto?
    sospetto: (quantita) => valuta({ ...stato, consumo, tra: stima.tra }, moves, { quantita, t: now }).sospetto
  };

  const ultimo = tutti[tutti.length - 1];
  if (!ultimo) return { ...base, ultimo: null, giacenza: null, giorniCopertura: null, affidabilita: 'nessun_dato', scarto: null };

  const giacenza = stimaDa(stato.base, moves, stima.tra, now);

  // Affidabilità: stima calcolata subito prima dell'ultimo conteggio, confrontata con il valore contato
  let affidabilita = 'ok';
  let scarto = null;
  const precedente = [...counts].reverse().find((c) => ultimo.t - c.t >= DODICI_ORE);
  if (precedente) {
    const consumato = stimaConsumo(finestra.counts.filter((c) => c.t <= precedente.t), moves, ultimo.t, vendite, rete).tra(precedente.t, ultimo.t);
    scarto = Math.abs(stimaDa(precedente, moves, () => consumato, ultimo.t) - ultimo.quantita) / Math.max(consumato, 1);
    // Se l'ultimo conteggio è una verifica admin la giacenza è buona anche quando la stima era lontana
    if (scarto > soglia && !ultimo.verifica) affidabilita = 'da_verificare';
  }
  if (incoerenti || stato.pendente) affidabilita = 'da_verificare';

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
  // Dopo un conteggio sospetto il prodotto torna in lista la sera dopo
  const ricontrollo = r.ricontrollo
    ? { data: addGiorni(ultimoGiorno, 1) < oggi ? oggi : addGiorni(ultimoGiorno, 1), motivo: 'Ricontrollo dopo un conteggio anomalo', priorita: 2 }
    : null;
  if (fisso?.attivo) {
    const start = ultimoGiorno === oggi ? addGiorni(oggi, 1) : oggi;
    const data = prossimaRicorrenza(fisso, start);
    return ricontrollo && ricontrollo.data < data ? ricontrollo : { data, motivo: 'Giorno fisso', priorita: 1 };
  }
  const candidati = ricontrollo ? [ricontrollo] : [];
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