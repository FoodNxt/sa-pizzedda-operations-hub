// Materie prime contate in grammi e ordinate a kg: il conteggio si porta in kg,
// così si confronta con la quantità critica e si mostra nell'unità d'ordine
export function inUnitaOrdine(rilevazioni, materiePrime) {
  const perId = Object.fromEntries(materiePrime.map((p) => [p.id, p]));
  return rilevazioni.map((r) =>
    r.unita_misura === 'grammi' && perId[r.prodotto_id]?.unita_misura === 'kg'
      ? { ...r, quantita_rilevata: (r.quantita_rilevata || 0) / 1000, unita_misura: 'kg' }
      : r
  );
}