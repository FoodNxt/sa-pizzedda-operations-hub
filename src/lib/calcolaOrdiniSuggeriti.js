// Calcola gli ordini suggeriti confrontando le giacenze rilevate con le soglie critiche.
// Gestisce anche i semilavorati: per somma proporzionale alla materia prima (default)
// oppure con conteggio a sacchi e soglia propria (inventario_a_sacchi).

const toGrams = (qty, unit) =>
  unit === 'kg' || unit === 'litri' ? (qty || 0) * 1000 : (qty || 0);

export function calcolaOrdiniSuggeriti({ inventory = [], inventoryCantina = [], products = [], stores = [], ricette = [] }) {
  const orders = [];
  const allInventory = [...inventory, ...inventoryCantina];
  const latestByProduct = {};

  allInventory.forEach((item) => {
    const key = `${item.store_id}-${item.prodotto_id}`;
    if (!latestByProduct[key] || new Date(item.data_rilevazione) > new Date(latestByProduct[key].data_rilevazione)) {
      latestByProduct[key] = item;
    }
  });

  const findRicetta = (reading) => ricette.find((r) =>
    r.nome_prodotto?.toLowerCase() === reading.nome_prodotto?.toLowerCase() && r.somma_a_materia_prima_id
  );

  const isDisponibilePerStore = (product, storeId) => {
    if (!product || product.attivo === false) return false;
    const assegnato = !product.assigned_stores || product.assigned_stores.length === 0 || product.assigned_stores.includes(storeId);
    if (!assegnato) return false;
    return product.in_uso_per_store?.[storeId] === true ||
      (product.in_uso_per_store?.[storeId] === undefined && product.in_uso === true);
  };

  const getSoglie = (product, storeId) => ({
    quantitaCritica: product.store_specific_quantita_critica?.[storeId] || product.quantita_critica || product.quantita_minima || 0,
    quantitaOrdine: product.store_specific_quantita_ordine?.[storeId] || product.quantita_ordine || 0
  });

  // STEP 1: giacenze dirette
  const aggregatedQuantities = {};
  Object.values(latestByProduct).forEach((reading) => {
    aggregatedQuantities[`${reading.store_id}-${reading.prodotto_id}`] = reading.quantita_rilevata || 0;
  });

  // STEP 2: somma proporzionale dei semilavorati alle materie prime
  Object.values(latestByProduct).forEach((reading) => {
    const ricetta = findRicetta(reading);
    if (!ricetta || ricetta.inventario_a_sacchi || !ricetta.somma_ingrediente_id) return;

    const ingrediente = ricetta.somma_ingrediente_id.startsWith('ing_')
      ? ricetta.ingredienti?.[parseInt(ricetta.somma_ingrediente_id.replace('ing_', ''))]
      : ricetta.ingredienti?.find((ing) => ing.materia_prima_id === ricetta.somma_ingrediente_id);

    if (!ingrediente || !ricetta.quantita_prodotta || ricetta.quantita_prodotta <= 0) return;

    const materiaPrimaTarget = products.find((p) => p.id === ricetta.somma_a_materia_prima_id);
    if (!materiaPrimaTarget) return;

    const ratio = toGrams(ingrediente.quantita, ingrediente.unita_misura) /
      toGrams(ricetta.quantita_prodotta, ricetta.unita_misura_prodotta);
    const rawMaterialNeededGrams = toGrams(reading.quantita_rilevata, reading.unita_misura) * ratio;

    let qtyToAdd = rawMaterialNeededGrams;
    if (materiaPrimaTarget.unita_misura === 'sacchi' && materiaPrimaTarget.peso_dimensione_unita) {
      qtyToAdd = rawMaterialNeededGrams / (materiaPrimaTarget.peso_dimensione_unita * 1000);
    } else if (materiaPrimaTarget.unita_misura === 'kg' || materiaPrimaTarget.unita_misura === 'litri') {
      qtyToAdd = rawMaterialNeededGrams / 1000;
    }

    const targetKey = `${reading.store_id}-${ricetta.somma_a_materia_prima_id}`;
    aggregatedQuantities[targetKey] = (aggregatedQuantities[targetKey] || 0) + qtyToAdd;
  });

  // FASE 1: prodotti rilevati direttamente
  Object.values(latestByProduct).forEach((reading) => {
    const product = products.find((p) => p.id === reading.prodotto_id);
    const store = stores.find((s) => s.id === reading.store_id);
    if (!store || !isDisponibilePerStore(product, reading.store_id)) return;

    const quantitaEffettiva = aggregatedQuantities[`${reading.store_id}-${reading.prodotto_id}`] ?? (reading.quantita_rilevata || 0);
    const { quantitaCritica, quantitaOrdine } = getSoglie(product, reading.store_id);

    if (quantitaEffettiva <= quantitaCritica && quantitaOrdine > 0) {
      orders.push({
        ...reading,
        quantita_rilevata: quantitaEffettiva,
        quantita_aggregata: quantitaEffettiva,
        product,
        store,
        quantita_critica: quantitaCritica,
        quantita_ordine: quantitaOrdine,
        fornitore: product.fornitore || 'Non specificato'
      });
    }
  });

  // FASE 2: materie prime non rilevate ma alimentate dai semilavorati
  Object.entries(aggregatedQuantities).forEach(([key, quantitaAggregata]) => {
    if (latestByProduct[key]) return;

    const [storeId, prodottoId] = key.split('-');
    const product = products.find((p) => p.id === prodottoId);
    const store = stores.find((s) => s.id === storeId);
    if (!store || !isDisponibilePerStore(product, storeId)) return;

    const { quantitaCritica, quantitaOrdine } = getSoglie(product, storeId);
    if (quantitaAggregata <= quantitaCritica && quantitaOrdine > 0) {
      orders.push({
        store_id: storeId,
        prodotto_id: prodottoId,
        nome_prodotto: product.nome_prodotto,
        quantita_rilevata: quantitaAggregata,
        quantita_aggregata: quantitaAggregata,
        unita_misura: product.unita_misura,
        data_rilevazione: new Date().toISOString(),
        product,
        store,
        quantita_critica: quantitaCritica,
        quantita_ordine: quantitaOrdine,
        fornitore: product.fornitore || 'Non specificato',
        is_from_semilavorato: true
      });
    }
  });

  // FASE 3: semilavorati contati a sacchi → soglia propria, ordina la materia prima collegata
  Object.values(latestByProduct).forEach((reading) => {
    const ricetta = findRicetta(reading);
    if (!ricetta?.inventario_a_sacchi) return;

    const sacchi = reading.quantita_rilevata || 0;
    const soglia = ricetta.soglia_minima_sacchi || 0;
    if (sacchi > soglia) return;

    const product = products.find((p) => p.id === ricetta.somma_a_materia_prima_id);
    const store = stores.find((s) => s.id === reading.store_id);
    if (!product || product.attivo === false || !store) return;
    if (orders.some((o) => o.store_id === reading.store_id && o.prodotto_id === product.id)) return;

    const { quantitaOrdine } = getSoglie(product, reading.store_id);
    if (quantitaOrdine <= 0) return;

    orders.push({
      store_id: reading.store_id,
      prodotto_id: product.id,
      nome_prodotto: product.nome_prodotto,
      quantita_rilevata: sacchi,
      quantita_aggregata: sacchi,
      unita_misura: product.unita_misura,
      data_rilevazione: reading.data_rilevazione,
      product,
      store,
      quantita_critica: soglia,
      quantita_ordine: quantitaOrdine,
      fornitore: product.fornitore || 'Non specificato',
      is_from_semilavorato: true
    });
  });

  return orders;
}