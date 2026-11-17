// Ordina i prodotti lungo il percorso più corto sulla piantina.
// I prodotti senza pin restano in coda, nell'ordine in cui arrivano.
export function ordinaPercorso(righe, piantina) {
  const pin = piantina?.pin || {};
  const conPin = righe.filter((r) => pin[r.item_id]);
  const senza = righe.filter((r) => !pin[r.item_id]);
  if (conPin.length < 2) return [...conPin, ...senza];

  const rapporto = piantina.rapporto || 1;
  const punto = (p) => ({ x: p.x * rapporto, y: p.y });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const partenza = punto(piantina.partenza || { x: 0, y: 0 });

  // Si parte dal prodotto più vicino e si va ogni volta al più vicino rimasto
  const liberi = conPin.map((r) => ({ r, ...punto(pin[r.item_id]) }));
  const giro = [{ ...partenza }];
  while (liberi.length) {
    const ultimo = giro[giro.length - 1];
    let migliore = 0;
    for (let i = 1; i < liberi.length; i++) if (dist(ultimo, liberi[i]) < dist(ultimo, liberi[migliore])) migliore = i;
    giro.push(liberi.splice(migliore, 1)[0]);
  }

  // Poi si raddrizzano i tratti che si incrociano (2-opt), tenendo ferma la partenza
  let migliorato = true;
  while (migliorato) {
    migliorato = false;
    for (let i = 1; i < giro.length - 1; i++) {
      for (let j = i + 1; j < giro.length; j++) {
        const dopo = giro[j + 1];
        const prima = dist(giro[i - 1], giro[i]) + (dopo ? dist(giro[j], dopo) : 0);
        const poi = dist(giro[i - 1], giro[j]) + (dopo ? dist(giro[i], dopo) : 0);
        if (poi < prima - 1e-9) {
          giro.splice(i, j - i + 1, ...giro.slice(i, j + 1).reverse());
          migliorato = true;
        }
      }
    }
  }
  return [...giro.slice(1).map((g) => g.r), ...senza];
}