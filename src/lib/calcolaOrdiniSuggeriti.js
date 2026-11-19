// Calcola gli ordini suggeriti confrontando le giacenze rilevate con le soglie critiche.
// Gestisce anche i semilavorati: per somma proporzionale alla materia prima (default)
// oppure con conteggio a sacchi e soglia propria (inventario_a_sacchi).

const toGrams = (qty, unit) =>
  unit === 'kg' || unit === 'litri' ? (qty || 0) * 1000 : (qty || 0);

const PESATO = ['grammi', 'g', 'kg'];
const due = (n) => Math.round(n * 100) / 100;

// Conteggio in grammi di un prodotto ordinato a kg: si porta in kg per confrontarlo con la quantità critica
const inUnitaProdotto = (reading, product) =>
  reading.unita_misura === 'grammi' && product?.unita_misura === 'kg'
    ? (reading.quantita_rilevata || 0) / 1000
    : reading.quantita_rilevata || 0;

// Grammi di semilavorato → materia prima collegata: prima la resa della ricetta (ingrediente / quantità prodotta),
// poi l'unità della materia prima. null = ricetta senza ingrediente o senza quantità prodotta
const inMateriaPrima = (grammi, ricetta, materiaPrima) => {
  const ingrediente = ricetta.somma_ingrediente_id?.startsWith('ing_')
    ? ricetta.ingredienti?.[parseInt(ricetta.somma_ingrediente_id.replace('ing_', ''))]
    : ricetta.ingredienti?.find((ing) => ing.materia_prima_id === ricetta.somma_ingrediente_id);
  if (!ingrediente || !(ricetta.quantita_prodotta > 0)) return null;
  const crudi = grammi * toGrams(ingrediente.quantita, ingrediente.unita_misura) /
    toGrams(ricetta.quantita_prodotta, ricetta.unita_misura_prodotta);
  if (materiaPrima.unita_misura === 'kg' || materiaPrima.unita_misura === 'litri') return crudi / 1000;
  if (['grammi', 'ml'].includes(materiaPrima.unita_misura)) return crudi;
  // Sacchi, pezzi, confezioni: serve il peso di una unità. Se manca non si converte
  if (!(materiaPrima.peso_dimensione_unita > 0)) return null;
  const grammiPerUnita = materiaPrima.peso_dimensione_unita * (['g', 'ml'].includes(materiaPrima.unita_misura_peso) ? 1 : 1000);
  return crudi / grammiPerUnita;
};

export function calcolaOrdiniSuggeriti({ inventory = [], inventoryCantina = [], products = [], stores = [], ricette = [] }) {
  const orders = [];
  // I negozi non attivi non ricevono suggerimenti d'ordine
  stores = stores.filter((s) => s.status === 'active');
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

  // Per ogni negozio e semilavorato vale solo il conteggio più recente, anche se fatto sul vecchio prodotto con lo stesso nome
  const perSemilavorato = {};
  Object.values(latestByProduct).forEach((reading) => {
    const ricetta = findRicetta(reading);
    if (!ricetta) return;
    const key = `${reading.store_id}-${ricetta.id}`;
    const attuale = perSemilavorato[key];
    if (!attuale || new Date(reading.data_rilevazione) > new Date(attuale.reading.data_rilevazione)) perSemilavorato[key] = { reading, ricetta };
  });
  const semilavorati = Object.values(perSemilavorato).map(({ reading, ricetta }) => {
    const pesato = PESATO.includes(reading.unita_misura);
    return {
      reading,
      ricetta,
      pesato,
      // Soglia propria del semilavorato: in grammi per negozio, oppure a sacchi per i conteggi ancora fatti a sacchi
      soglia: pesato
        ? ricetta.soglia_minima_grammi_per_store?.[reading.store_id]
        : ricetta.inventario_a_sacchi ? ricetta.soglia_minima_sacchi || 0 : ricetta.soglia_minima_sacchi
    };
  });

  // STEP 1: giacenze dirette
  const aggregatedQuantities = {};
  Object.values(latestByProduct).forEach((reading) => {
    aggregatedQuantities[`${reading.store_id}-${reading.prodotto_id}`] = inUnitaProdotto(reading, products.find((p) => p.id === reading.prodotto_id));
  });

  // STEP 2: i semilavorati pesati e senza soglia propria si sommano alla materia prima collegata
  semilavorati.forEach(({ reading, ricetta, pesato, soglia }) => {
    if (!pesato || soglia != null) return;
    const materiaPrimaTarget = products.find((p) => p.id === ricetta.somma_a_materia_prima_id);
    if (!materiaPrimaTarget) return;
    const qtyToAdd = inMateriaPrima(toGrams(reading.quantita_rilevata, reading.unita_misura), ricetta, materiaPrimaTarget);
    if (qtyToAdd == null) return;

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
        unita_misura: product.unita_conteggio_inventario ? product.unita_misura : reading.unita_misura,
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

  // FASE 3: semilavorati con soglia propria (grammi o sacchi) → ordina la materia prima collegata
  semilavorati.forEach(({ reading, ricetta, pesato, soglia: sogliaPropria }) => {
    if (sogliaPropria == null) return;
    const contato = pesato ? toGrams(reading.quantita_rilevata, reading.unita_misura) : reading.quantita_rilevata || 0;
    if (contato > sogliaPropria) return;

    const product = products.find((p) => p.id === ricetta.somma_a_materia_prima_id);
    const store = stores.find((s) => s.id === reading.store_id);
    if (!product || product.attivo === false || !store) return;
    if (orders.some((o) => o.store_id === reading.store_id && o.prodotto_id === product.id)) return;

    const { quantitaOrdine } = getSoglie(product, reading.store_id);
    if (quantitaOrdine <= 0) return;

    // I grammi si mostrano nell'unità della materia prima, passando per la resa della ricetta
    const mostra = (q) => (pesato ? due(inMateriaPrima(q, ricetta, product) ?? q) : q);
    const sacchi = mostra(contato);
    const soglia = mostra(sogliaPropria);

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