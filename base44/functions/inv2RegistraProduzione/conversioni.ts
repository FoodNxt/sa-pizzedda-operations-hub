// Conversioni di unità per le produzioni del laboratorio

const PESO = { g: 1, grammi: 1, kg: 1000 };
const VOLUME = { ml: 1, litri: 1000 };

// Quantità in grammi o ml (le altre unità restano come sono)
export const inBase = (quantita, unita) => quantita * (PESO[unita] || VOLUME[unita] || 1);

// Porta la quantità prodotta nell'unità di conteggio del semilavorato
export function convertiCarico(quantita, unita, imp) {
  const destinazione = imp?.unita_conteggio;
  if (!destinazione || destinazione === unita) return { quantita, unita };
  for (const scala of [PESO, VOLUME]) {
    if (scala[unita] && scala[destinazione]) return { quantita: (quantita * scala[unita]) / scala[destinazione], unita: destinazione };
  }
  // Vaschette, sacchi e simili: si passa dal peso di una unità di conteggio
  if (PESO[unita] && imp.peso_unita_conteggio_kg > 0) {
    return { quantita: (quantita * PESO[unita]) / 1000 / imp.peso_unita_conteggio_kg, unita: destinazione };
  }
  return { quantita, unita };
}

// Stessa logica di espandiIngredienti in src/pages/ControlloConsumi.jsx:
// espande i semilavorati nei loro ingredienti e converte nell'unità della materia prima.
export function espandiIngredienti(ingredienti, moltiplicatore, ricette, materie, livello = 0) {
  const risultato = {};
  if (!ingredienti || ingredienti.length === 0 || livello > 10) return risultato;
  const aggiungi = (key, voce) => {
    if (!risultato[key]) risultato[key] = { ...voce, quantita: 0 };
    risultato[key].quantita += voce.quantita;
  };

  ingredienti.forEach((ing) => {
    const semilavorato = ricette.find((r) => (r.id === ing.materia_prima_id || r.nome_prodotto === ing.nome_prodotto) && r.is_semilavorato);
    if (semilavorato && semilavorato.ingredienti) {
      let moltiplicatoreSemilavorato = moltiplicatore * ing.quantita;
      if (semilavorato.quantita_prodotta && semilavorato.unita_misura_prodotta) {
        let qtaProdotta = semilavorato.quantita_prodotta;
        if (semilavorato.unita_misura_prodotta === 'kg' || semilavorato.unita_misura_prodotta === 'litri') qtaProdotta *= 1000;
        moltiplicatoreSemilavorato = (ing.quantita / qtaProdotta) * moltiplicatore;
      }
      const sub = espandiIngredienti(semilavorato.ingredienti, moltiplicatoreSemilavorato, ricette, materie, livello + 1);
      Object.entries(sub).forEach(([key, voce]) => aggiungi(key, voce));
      return;
    }

    const mp = materie.find((m) => m.id === ing.materia_prima_id || m.nome_prodotto === ing.nome_prodotto);
    const base = ing.quantita * moltiplicatore;
    let quantita = base;
    let unita = ing.unita_misura;
    if (mp) {
      if (mp.peso_dimensione_unita && mp.unita_misura_peso) {
        let convertita = base;
        if (ing.unita_misura === 'g' && mp.unita_misura_peso === 'kg') convertita = base / 1000;
        else if (ing.unita_misura === 'ml' && mp.unita_misura_peso === 'litri') convertita = base / 1000;
        else if (ing.unita_misura === 'kg' && mp.unita_misura_peso === 'g') convertita = base * 1000;
        else if (ing.unita_misura === 'litri' && mp.unita_misura_peso === 'ml') convertita = base * 1000;
        quantita = convertita / mp.peso_dimensione_unita;
        unita = mp.unita_misura;
      } else if (mp.unita_per_confezione && mp.unita_per_confezione > 1) {
        quantita = base / mp.unita_per_confezione;
        unita = mp.unita_misura || 'confezioni';
      }
    }
    aggiungi(ing.materia_prima_id || ing.nome_prodotto, { id: mp?.id, nome: mp?.nome_prodotto || ing.nome_prodotto, quantita, unita_misura: unita });
  });

  return risultato;
}