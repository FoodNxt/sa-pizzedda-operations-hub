import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { Package, TrendingUp, TrendingDown, Truck, AlertTriangle, Settings, X } from "lucide-react";
import { format, parseISO, startOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { it } from 'date-fns/locale';

export default function ControlloConsumi() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('confronto'); // 'confronto' o 'consumi_teorici'
  const [viewMode, setViewMode] = useState('daily'); // 'daily', 'weekly', 'monthly'
  const [selectedStore, setSelectedStore] = useState("all");
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showSettings, setShowSettings] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({
    materie_prime: true,
    semilavorati: true,
    prodotti_finiti: true
  });
  const [expandedMozzarellaRows, setExpandedMozzarellaRows] = useState({});
  const [expandedProducts, setExpandedProducts] = useState({});
  const [prodottiChiaveViewMode, setProdottiChiaveViewMode] = useState('daily'); // 'daily', 'weekly', 'monthly'
  const [expandedConsumiTeoruiDettagli, setExpandedConsumiTeoriciDettagli] = useState({});

  // Fetch data
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: prodottiVenduti = [] } = useQuery({
    queryKey: ['prodotti-venduti'],
    queryFn: () => base44.entities.ProdottiVenduti.list()
  });

  const { data: ricette = [] } = useQuery({
    queryKey: ['ricette'],
    queryFn: () => base44.entities.Ricetta.list()
  });

  const { data: inventari = [] } = useQuery({
    queryKey: ['inventari'],
    queryFn: () => base44.entities.RilevazioneInventario.list()
  });

  const { data: ordini = [] } = useQuery({
    queryKey: ['ordini'],
    queryFn: () => base44.entities.OrdineFornitore.list()
  });

  const { data: materiePrime = [] } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list()
  });

  const { data: sprechi = [] } = useQuery({
    queryKey: ['sprechi'],
    queryFn: () => base44.entities.Spreco.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  // Helper: determina il tipo di prodotto
  const getProductType = (prodottoId, nomeProdotto) => {
    // Cerca in materie prime
    const mp = materiePrime.find((m) => m.id === prodottoId || m.nome_prodotto === nomeProdotto);
    if (mp) return 'materie_prime';

    // Cerca in ricette
    const ricetta = ricette.find((r) => r.id === prodottoId || r.nome_prodotto === nomeProdotto);
    if (ricetta) {
      if (ricetta.is_semilavorato) return 'semilavorati';
      return 'prodotti_finiti';
    }

    // Default: materie prime
    return 'materie_prime';
  };

  // Raggruppa prodotti per categoria
  const productsByCategory = {
    materie_prime: materiePrime.map((m) => ({ id: m.id, nome: m.nome_prodotto })),
    semilavorati: ricette.filter((r) => r.is_semilavorato).map((r) => ({ id: r.id, nome: r.nome_prodotto })),
    prodotti_finiti: ricette.filter((r) => !r.is_semilavorato).map((r) => ({ id: r.id, nome: r.nome_prodotto }))
  };

  // Inizializza selectedProducts con tutti i prodotti se vuoto
  React.useEffect(() => {
    if (selectedProducts.length === 0 && (materiePrime.length > 0 || ricette.length > 0)) {
      const allProducts = [
      ...productsByCategory.materie_prime.map((p) => p.id),
      ...productsByCategory.semilavorati.map((p) => p.id),
      ...productsByCategory.prodotti_finiti.map((p) => p.id)];

      setSelectedProducts(allProducts);
    }
  }, [materiePrime, ricette]);

  const toggleProduct = (productId) => {
    setSelectedProducts((prev) =>
    prev.includes(productId) ?
    prev.filter((id) => id !== productId) :
    [...prev, productId]
    );
  };

  const toggleCategory = (category) => {
    const categoryProducts = productsByCategory[category].map((p) => p.id);
    const allSelected = categoryProducts.every((id) => selectedProducts.includes(id));

    if (allSelected) {
      setSelectedProducts((prev) => prev.filter((id) => !categoryProducts.includes(id)));
    } else {
      setSelectedProducts((prev) => [...new Set([...prev, ...categoryProducts])]);
    }
  };

  // Filtra per store e date
  const filteredVendite = prodottiVenduti.filter((v) => {
    const matchStore = selectedStore === "all" || v.store_id === selectedStore;
    const matchDate = v.data_vendita >= startDate && v.data_vendita <= endDate;
    return matchStore && matchDate;
  });

  const filteredSprechi = sprechi.filter((s) => {
    const matchStore = selectedStore === "all" || s.store_id === selectedStore;
    const dataSpreco = s.data_rilevazione.split('T')[0];
    const matchDate = dataSpreco >= startDate && dataSpreco <= endDate;
    return matchStore && matchDate;
  });

  const filteredInventari = inventari.filter((i) => {
    const matchStore = selectedStore === "all" || i.store_id === selectedStore;
    const dataRil = i.data_rilevazione.split('T')[0];
    const matchDate = dataRil >= startDate && dataRil <= endDate;
    return matchStore && matchDate;
  });

  // Includi anche inventari del giorno precedente al periodo (per quantità iniziale)
  const allInventari = inventari.filter((i) => {
    const matchStore = selectedStore === "all" || i.store_id === selectedStore;
    const dataRil = i.data_rilevazione.split('T')[0];
    const dayBeforeStart = format(subDays(parseISO(startDate), 1), 'yyyy-MM-dd');
    const matchDate = dataRil >= dayBeforeStart && dataRil <= endDate;
    return matchStore && matchDate;
  });

  const filteredOrdini = ordini.filter((o) => {
    const matchStore = selectedStore === "all" || o.store_id === selectedStore;
    if (!o.data_completamento) return false;
    const dataCompl = o.data_completamento.split('T')[0];
    const matchDate = dataCompl >= startDate && dataCompl <= endDate;
    return matchStore && matchDate;
  });

  // Organizza inventari per prodotto e data
  const inventariPerProdotto = {};
  allInventari.forEach((inv) => {
    const key = inv.prodotto_id;
    if (!inventariPerProdotto[key]) {
      inventariPerProdotto[key] = [];
    }
    inventariPerProdotto[key].push(inv);
  });

  // Ordina per data
  Object.keys(inventariPerProdotto).forEach((prodottoId) => {
    inventariPerProdotto[prodottoId].sort((a, b) =>
    new Date(a.data_rilevazione) - new Date(b.data_rilevazione)
    );
  });

  // Funzione ricorsiva per espandere ingredienti (inclusi semilavorati)
  const espandiIngredienti = (ingredienti, moltiplicatore = 1) => {
    const risultato = {};

    if (!ingredienti || ingredienti.length === 0) return risultato;

    ingredienti.forEach((ing) => {
      const key = ing.materia_prima_id || ing.nome_prodotto;

      // Verifica se è un semilavorato
      const ricettaSemilavorato = ricette.find((r) =>
      (r.id === ing.materia_prima_id || r.nome_prodotto === ing.nome_prodotto) && r.is_semilavorato
      );

      if (ricettaSemilavorato && ricettaSemilavorato.ingredienti) {
        // È un semilavorato: espandi ricorsivamente i suoi ingredienti
        const subIngredienti = espandiIngredienti(ricettaSemilavorato.ingredienti, moltiplicatore * ing.quantita);
        Object.keys(subIngredienti).forEach((subKey) => {
          if (!risultato[subKey]) {
            risultato[subKey] = {
              nome: subIngredienti[subKey].nome,
              quantita: 0,
              unita_misura: subIngredienti[subKey].unita_misura
            };
          }
          risultato[subKey].quantita += subIngredienti[subKey].quantita;
        });
      } else {
        // È una materia prima
        const materiaPrima = materiePrime.find((m) => m.id === ing.materia_prima_id || m.nome_prodotto === ing.nome_prodotto);

        let quantitaBase = ing.quantita * moltiplicatore;
        let unitaMisuraFinale = ing.unita_misura;
        let quantitaFinale = quantitaBase;

        if (materiaPrima) {
          // CASO 1: Materia prima con peso/dimensione unitaria (es. mozzarella 2.5kg, estathe 24 lattine)
          if (materiaPrima.peso_dimensione_unita && materiaPrima.unita_misura_peso) {
            // Converti l'unità della ricetta in quella della materia prima
            let quantitaConvertita = quantitaBase;

            // Conversione grammi -> kg
            if (ing.unita_misura === 'g' && materiaPrima.unita_misura_peso === 'kg') {
              quantitaConvertita = quantitaBase / 1000;
            }
            // Conversione ml -> litri
            else if (ing.unita_misura === 'ml' && materiaPrima.unita_misura_peso === 'litri') {
              quantitaConvertita = quantitaBase / 1000;
            }
            // Conversione kg -> g (se necessario)
            else if (ing.unita_misura === 'kg' && materiaPrima.unita_misura_peso === 'g') {
              quantitaConvertita = quantitaBase * 1000;
            }
            // Conversione litri -> ml (se necessario)
            else if (ing.unita_misura === 'litri' && materiaPrima.unita_misura_peso === 'ml') {
              quantitaConvertita = quantitaBase * 1000;
            }

            // Calcola quanti pezzi/unità servono
            quantitaFinale = quantitaConvertita / materiaPrima.peso_dimensione_unita;
            unitaMisuraFinale = materiaPrima.unita_misura;
          }
          // CASO 2: Materia prima con unità per confezione (es. 24 lattine per confezione)
          else if (materiaPrima.unita_per_confezione && materiaPrima.unita_per_confezione > 1) {
            quantitaFinale = quantitaBase / materiaPrima.unita_per_confezione;
            unitaMisuraFinale = materiaPrima.unita_misura || 'confezioni';
          }
        }

        if (!risultato[key]) {
          risultato[key] = {
            nome: ing.nome_prodotto,
            quantita: 0,
            unita_misura: unitaMisuraFinale
          };
        }
        risultato[key].quantita += quantitaFinale;
      }
    });

    return risultato;
  };

  // Funzione per espandere ingredienti SENZA conversione a pezzi (solo grammi originali)
  const espandiIngredientiGrammi = (ingredienti, moltiplicatore = 1) => {
    const risultato = {};

    if (!ingredienti || ingredienti.length === 0) return risultato;

    ingredienti.forEach((ing) => {
      const key = ing.materia_prima_id || ing.nome_prodotto;

      // Verifica se è un semilavorato
      const ricettaSemilavorato = ricette.find((r) =>
      (r.id === ing.materia_prima_id || r.nome_prodotto === ing.nome_prodotto) && r.is_semilavorato
      );

      if (ricettaSemilavorato && ricettaSemilavorato.ingredienti) {
        // È un semilavorato: espandi ricorsivamente
        const subIngredienti = espandiIngredientiGrammi(ricettaSemilavorato.ingredienti, moltiplicatore * ing.quantita);
        Object.keys(subIngredienti).forEach((subKey) => {
          if (!risultato[subKey]) {
            risultato[subKey] = {
              nome: subIngredienti[subKey].nome,
              quantita: 0,
              unita_misura: subIngredienti[subKey].unita_misura
            };
          }
          risultato[subKey].quantita += subIngredienti[subKey].quantita;
        });
      } else {
        // È una materia prima - NON fare conversione a pezzi
        const quantitaFinale = ing.quantita * moltiplicatore;

        if (!risultato[key]) {
          risultato[key] = {
            nome: ing.nome_prodotto,
            quantita: 0,
            unita_misura: ing.unita_misura
          };
        }
        risultato[key].quantita += quantitaFinale;
      }
    });

    return risultato;
  };

  // Calcola quantità vendute per giorno e prodotto (da prodotti venduti)
  const quantitaVendutePerGiorno = {};
  filteredVendite.forEach((vendita) => {
    const ricetta = ricette.find((r) => r.nome_prodotto === vendita.flavor);
    if (!ricetta || !ricetta.ingredienti) return;

    const qty = vendita.total_pizzas_sold || 0;
    const date = vendita.data_vendita;

    if (!quantitaVendutePerGiorno[date]) {
      quantitaVendutePerGiorno[date] = {};
    }

    // Espandi ingredienti ricorsivamente
    const ingredientiEspansi = espandiIngredienti(ricetta.ingredienti, qty);

    Object.keys(ingredientiEspansi).forEach((key) => {
      if (!quantitaVendutePerGiorno[date][key]) {
        quantitaVendutePerGiorno[date][key] = {
          nome: ingredientiEspansi[key].nome,
          quantita: 0,
          unita_misura: ingredientiEspansi[key].unita_misura
        };
      }
      quantitaVendutePerGiorno[date][key].quantita += ingredientiEspansi[key].quantita;
    });
  });

  // Calcola ordini ricevuti per giorno
  const ordiniPerGiorno = {};
  filteredOrdini.forEach((ordine) => {
    if (ordine.status !== 'completato' || !ordine.data_completamento) return;
    const date = ordine.data_completamento.split('T')[0];

    if (!ordiniPerGiorno[date]) {
      ordiniPerGiorno[date] = {};
    }

    ordine.prodotti.forEach((prod) => {
      const key = prod.prodotto_id;
      if (!ordiniPerGiorno[date][key]) {
        ordiniPerGiorno[date][key] = {
          nome: prod.nome_prodotto,
          quantita: 0,
          unita_misura: prod.unita_misura
        };
      }
      ordiniPerGiorno[date][key].quantita += prod.quantita_ricevuta || 0;
    });
  });

  // Costruisci dati giornalieri per ogni prodotto
  const datiGiornalieriPerProdotto = {};

  // Itera su tutti gli inventari
  Object.keys(inventariPerProdotto).forEach((prodottoId) => {
    const invs = inventariPerProdotto[prodottoId];

    invs.forEach((inv, idx) => {
      const date = inv.data_rilevazione.split('T')[0];

      // Salta se la data non è nel range selezionato
      if (date < startDate || date > endDate) return;

      // Applica filtro prodotti selezionati
      if (!selectedProducts.includes(prodottoId)) return;

      if (!datiGiornalieriPerProdotto[date]) {
        datiGiornalieriPerProdotto[date] = {};
      }

      // Quantità iniziale: dall'inventario del giorno precedente
      const prevInv = idx > 0 ? invs[idx - 1] : null;
      const qtyIniziale = prevInv ? prevInv.quantita_rilevata : 0;

      // Quantità venduta
      const qtyVenduta = quantitaVendutePerGiorno[date]?.[prodottoId]?.quantita || 0;

      // Quantità arrivata con ordini
      const qtyArrivata = ordiniPerGiorno[date]?.[prodottoId]?.quantita || 0;

      // Quantità finale: dall'inventario del giorno stesso
      const qtyFinale = inv.quantita_rilevata;

      // Delta: Quantità finale - (Quantità iniziale - Quantità venduta + Quantità arrivata)
      const attesa = qtyIniziale - qtyVenduta + qtyArrivata;
      const delta = qtyFinale - attesa;

      datiGiornalieriPerProdotto[date][prodottoId] = {
        nome: inv.nome_prodotto,
        unita_misura: inv.unita_misura,
        qtyIniziale,
        qtyVenduta,
        qtyArrivata,
        qtyFinale,
        delta
      };
    });
  });

  const datesSorted = Object.keys(datiGiornalieriPerProdotto).sort().reverse();

  // Calcola dati aggregati settimanali/mensili per Confronto Consumi
  const calculateAggregatedConfronto = (mode) => {
    if (mode === 'daily') return { data: datiGiornalieriPerProdotto, dates: datesSorted };

    const aggregated = {};

    // Raggruppa date per periodo
    const datesByPeriod = {};
    Object.keys(datiGiornalieriPerProdotto).forEach((date) => {
      const d = parseISO(date);
      let periodoKey;

      if (mode === 'weekly') {
        const weekStart = startOfWeek(d, { weekStartsOn: 1 });
        periodoKey = format(weekStart, 'yyyy-MM-dd');
      } else if (mode === 'monthly') {
        periodoKey = format(d, 'yyyy-MM');
      }

      if (!datesByPeriod[periodoKey]) {
        datesByPeriod[periodoKey] = [];
      }
      datesByPeriod[periodoKey].push(date);
    });

    // Per ogni periodo, aggrega i dati
    Object.keys(datesByPeriod).forEach((periodoKey) => {
      const datesInPeriod = datesByPeriod[periodoKey].sort();

      if (!aggregated[periodoKey]) {
        aggregated[periodoKey] = {};
      }

      // Per ogni prodotto, aggrega attraverso tutte le date del periodo
      const allProdIds = new Set();
      datesInPeriod.forEach((date) => {
        Object.keys(datiGiornalieriPerProdotto[date] || {}).forEach((prodId) => {
          allProdIds.add(prodId);
        });
      });

      allProdIds.forEach((prodId) => {
        let qtyInizialeFirst = null;
        let qtyFinaleLast = null;
        let qtyVenditaTotale = 0;
        let qtyArrivataTotale = 0;
        let nome = '';
        let unita_misura = '';

        datesInPeriod.forEach((date) => {
          const prod = datiGiornalieriPerProdotto[date]?.[prodId];
          if (!prod) return;

          if (!nome) nome = prod.nome;
          if (!unita_misura) unita_misura = prod.unita_misura;

          // Prima qty iniziale del periodo
          if (qtyInizialeFirst === null) {
            qtyInizialeFirst = prod.qtyIniziale;
          }

          // Ultima qty finale del periodo
          qtyFinaleLast = prod.qtyFinale;

          // Accumula vendite e arrivi
          qtyVenditaTotale += prod.qtyVenduta;
          qtyArrivataTotale += prod.qtyArrivata;
        });

        if (qtyInizialeFirst !== null && qtyFinaleLast !== null) {
          const attesa = qtyInizialeFirst - qtyVenditaTotale + qtyArrivataTotale;
          const delta = qtyFinaleLast - attesa;

          aggregated[periodoKey][prodId] = {
            nome,
            unita_misura,
            qtyIniziale: qtyInizialeFirst,
            qtyVenduta: qtyVenditaTotale,
            qtyArrivata: qtyArrivataTotale,
            qtyFinale: qtyFinaleLast,
            delta
          };
        }
      });
    });

    const dates = Object.keys(aggregated).sort().reverse();
    return { data: aggregated, dates };
  };

  const confrontoAggregato = calculateAggregatedConfronto(viewMode);
  const datiConfrontoView = confrontoAggregato.data;
  const dateConfrontoSorted = confrontoAggregato.dates;

  // Calcola consumi teorici da ProdottiVenduti + statistiche debug
  const consumiTeoriciPerGiorno = {};
  const debugStats = {
    totalePizzeVendute: 0,
    pizzeConRicetta: 0,
    pizzeSenzaRicetta: 0,
    ricetteNonTrovate: new Set()
  };

  filteredVendite.forEach((vendita) => {
    const qty = vendita.total_pizzas_sold || 0;
    debugStats.totalePizzeVendute += qty;

    const ricetta = ricette.find((r) => r.nome_prodotto === vendita.flavor);
    if (!ricetta || !ricetta.ingredienti) {
      debugStats.pizzeSenzaRicetta += qty;
      if (vendita.flavor) {
        debugStats.ricetteNonTrovate.add(vendita.flavor);
      }
      return;
    }

    debugStats.pizzeConRicetta += qty;
    const date = vendita.data_vendita;

    if (!consumiTeoriciPerGiorno[date]) {
      consumiTeoriciPerGiorno[date] = {};
    }

    // Espandi ingredienti ricorsivamente per consumi teorici
    const ingredientiEspansi = espandiIngredienti(ricetta.ingredienti, qty);

    Object.keys(ingredientiEspansi).forEach((key) => {
      if (!consumiTeoriciPerGiorno[date][key]) {
        const materiaPrima = materiePrime.find((m) => m.id === key || m.nome_prodotto === ingredientiEspansi[key].nome);
        consumiTeoriciPerGiorno[date][key] = {
          nome: ingredientiEspansi[key].nome,
          quantita: 0,
          unita_misura: ingredientiEspansi[key].unita_misura,
          peso_dimensione_unita: materiaPrima?.peso_dimensione_unita,
          unita_misura_peso: materiaPrima?.unita_misura_peso
        };
      }
      consumiTeoriciPerGiorno[date][key].quantita += ingredientiEspansi[key].quantita;
    });
  });

  // Aggrega per settimana o mese
  const aggregateData = (data, mode) => {
    if (mode === 'daily') return data;

    const aggregated = {};
    Object.keys(data).forEach((date) => {
      const d = parseISO(date);
      let key;

      if (mode === 'weekly') {
        const weekStart = startOfDay(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = format(weekStart, 'yyyy-MM-dd');
      } else if (mode === 'monthly') {
        key = format(d, 'yyyy-MM');
      }

      if (!aggregated[key]) {
        aggregated[key] = {};
      }

      Object.keys(data[date]).forEach((prodId) => {
        if (!aggregated[key][prodId]) {
          aggregated[key][prodId] = {
            nome: data[date][prodId].nome,
            quantita: 0,
            unita_misura: data[date][prodId].unita_misura,
            peso_dimensione_unita: data[date][prodId].peso_dimensione_unita,
            unita_misura_peso: data[date][prodId].unita_misura_peso
          };
        }
        aggregated[key][prodId].quantita += data[date][prodId].quantita;
      });
    });

    return aggregated;
  };

  const consumiAggregati = aggregateData(consumiTeoriciPerGiorno, viewMode);
  const datesConsumiSorted = Object.keys(consumiAggregati).sort().reverse();

  // Calcola dettagli breakdown per consumi teorici
  const consumiTeoriciDettagli = {};
  Object.keys(consumiTeoriciPerGiorno).forEach((date) => {
    consumiTeoriciDettagli[date] = {};
    Object.keys(consumiTeoriciPerGiorno[date]).forEach((prodId) => {
      const breakdown = [];
      
      // Filtra vendite della data
      filteredVendite.filter((v) => v.data_vendita === date).forEach((vendita) => {
        const ricetta = ricette.find((r) => r.nome_prodotto === vendita.flavor);
        if (!ricetta || !ricetta.ingredienti) return;

        const qty = vendita.total_pizzas_sold || 0;
        const ingredientiEspansi = espandiIngredienti(ricetta.ingredienti, qty);

        if (ingredientiEspansi[prodId]) {
          // Calcola i dettagli della ricetta
          const ricettaIngredienti = espandiIngredientiGrammi(ricetta.ingredienti, 1);
          breakdown.push({
            nomeProdotto: vendita.flavor,
            quantitaVenduta: qty,
            ingredientePerUnita: ricettaIngredienti[prodId]?.quantita || 0,
            unitaMisura: ricettaIngredienti[prodId]?.unita_misura || consumiTeoriciPerGiorno[date][prodId].unita_misura,
            consumoTotale: ingredientiEspansi[prodId].quantita
          });
        }
      });

      consumiTeoriciDettagli[date][prodId] = breakdown;
    });
  });

  // Calcola statistiche aggregate
  const stats = {
    giorniAnalizzati: datesSorted.length,
    prodottiMonitorati: 0,
    deltaPositivoTotale: 0,
    deltaNegativoTotale: 0
  };

  let prodottiSet = new Set();
  datesSorted.forEach((date) => {
    const prodotti = datiGiornalieriPerProdotto[date] || {};
    Object.keys(prodotti).forEach((prodId) => {
      prodottiSet.add(prodId);
      const delta = prodotti[prodId].delta;
      if (delta > 0) stats.deltaPositivoTotale += delta;
      if (delta < 0) stats.deltaNegativoTotale += Math.abs(delta);
    });
  });
  stats.prodottiMonitorati = prodottiSet.size;

  // Calcola dati dettagliati per prodotti chiave (mozzarella, pomodoro, farina, semola)
  const calcProdottiChiaveData = (mode) => {
    const mozzarellaProducts = materiePrime.filter((m) => {
      const nome = m.nome_prodotto.toLowerCase();
      return nome.includes('mozzarella') ||
      nome.includes('pomodoro') ||
      nome.includes('farina') ||
      nome.includes('semola');
    });

    const details = {};

    mozzarellaProducts.forEach((mozz) => {
      const datiMozz = {
        nome: mozz.nome_prodotto,
        pesoUnitario: mozz.peso_dimensione_unita,
        unitaMisura: mozz.unita_misura,
        periodi: []
      };

      if (mode === 'daily') {
        // Generate all dates in the range
        const allDatesInRange = [];
        let currentDate = parseISO(startDate);
        const lastDate = parseISO(endDate);

        while (currentDate <= lastDate) {
          allDatesInRange.push(format(currentDate, 'yyyy-MM-dd'));
          currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
        }

        // Initialize with inventory from day before startDate if exists
        let prevQtyAttesa = null;
        let prevWasInventoried = false; // Track if previous day had inventory
        const dayBeforeStart = format(subDays(parseISO(startDate), 1), 'yyyy-MM-dd');
        const invDayBefore = allInventari.find((inv) =>
        inv.prodotto_id === mozz.id && inv.data_rilevazione.split('T')[0] === dayBeforeStart
        );
        if (invDayBefore) {
          prevQtyAttesa = invDayBefore.quantita_rilevata;
          prevWasInventoried = true;
        }

        allDatesInRange.forEach((date) => {
          const prod = datiGiornalieriPerProdotto[date]?.[mozz.id];

          // Check if inventory was done on this date
          const inventarioEsistente = filteredInventari.find((inv) =>
          inv.prodotto_id === mozz.id && inv.data_rilevazione.split('T')[0] === date
          );

          const breakdown = [];
          filteredVendite.filter((v) => v.data_vendita === date).forEach((vendita) => {
            const ricetta = ricette.find((r) => r.nome_prodotto === vendita.flavor);
            if (!ricetta || !ricetta.ingredienti) return;

            const qty = vendita.total_pizzas_sold || 0;
            const ingredientiGrammi = espandiIngredientiGrammi(ricetta.ingredienti, 1);

            const mozzKey = mozz.id || mozz.nome_prodotto;
            if (ingredientiGrammi[mozzKey]) {
              breakdown.push({
                nomeProdotto: vendita.flavor,
                quantitaVenduta: qty,
                grammiPerUnita: ingredientiGrammi[mozzKey].quantita,
                grammiTotali: ingredientiGrammi[mozzKey].quantita * qty
              });
            }
          });

          const grammiVenduti = breakdown.reduce((sum, item) => sum + item.grammiTotali, 0);
          const kgVenduti = grammiVenduti / 1000;

          const sprechiProdotto = filteredSprechi.filter((s) => {
            const dataSpreco = s.data_rilevazione.split('T')[0];
            return dataSpreco === date && s.prodotto_id === mozz.id;
          });
          const totaleSprechiGrammi = sprechiProdotto.reduce((sum, s) => sum + (s.quantita_grammi || 0), 0);
          const totaleSprechiKg = totaleSprechiGrammi / 1000;

          const qtyArrivata = ordiniPerGiorno[date]?.[mozz.id]?.quantita || 0;
          const pezziVenduti = prod?.qtyVenduta || quantitaVendutePerGiorno[date]?.[mozz.id]?.quantita || 0;

          if (!inventarioEsistente) {
            // NO inventory done - use expected quantity from previous day as initial
            const qtyIniziale = prevQtyAttesa !== null ? prevQtyAttesa : 0;
            const qtyAttesa = qtyIniziale - pezziVenduti + qtyArrivata;

            datiMozz.periodi.push({
              periodo: date,
              inventarioMancante: true,
              qtyInizialeteorica: !prevWasInventoried, // Theoretical only if prev day had no inventory
              qtyIniziale,
              grammiVenduti,
              kgVenduti,
              pezziVenduti,
              qtyArrivata,
              sprechiGrammi: totaleSprechiGrammi,
              sprechiKg: totaleSprechiKg,
              qtyFinale: null,
              qtyAttesa,
              delta: null,
              breakdown
            });

            // Next day will use this expected quantity as initial (theoretical)
            prevQtyAttesa = qtyAttesa;
            prevWasInventoried = false;
          } else {
            // Inventory exists - qtyIniziale is theoretical only if previous day had no inventory
            const qtyIniziale = prevQtyAttesa !== null ? prevQtyAttesa : prod?.qtyIniziale || 0;
            const qtyFinale = prod?.qtyFinale || inventarioEsistente.quantita_rilevata || 0;
            const qtyAttesa = qtyIniziale - pezziVenduti + qtyArrivata;
            const delta = qtyFinale - qtyAttesa;

            datiMozz.periodi.push({
              periodo: date,
              inventarioMancante: false,
              qtyInizialeteorica: !prevWasInventoried, // Theoretical only if prev day had no inventory
              qtyIniziale,
              grammiVenduti,
              kgVenduti,
              pezziVenduti,
              qtyArrivata,
              sprechiGrammi: totaleSprechiGrammi,
              sprechiKg: totaleSprechiKg,
              qtyFinale,
              qtyAttesa,
              delta,
              breakdown
            });

            // Next day will use actual final quantity from inventory
            prevQtyAttesa = qtyFinale;
            prevWasInventoried = true;
          }
        });
      } else {
        // Weekly or Monthly aggregation
        const periodi = {};

        datesSorted.forEach((date) => {
          const d = parseISO(date);
          let periodoKey;

          if (mode === 'weekly') {
            const weekStart = startOfWeek(d, { weekStartsOn: 1 });
            periodoKey = format(weekStart, 'yyyy-MM-dd');
          } else if (mode === 'monthly') {
            periodoKey = format(d, 'yyyy-MM');
          }

          if (!periodi[periodoKey]) {
            periodi[periodoKey] = {
              dates: [],
              breakdown: []
            };
          }
          periodi[periodoKey].dates.push(date);
        });

        // Per ogni periodo, aggrega i dati
        Object.keys(periodi).sort().forEach((periodoKey) => {
          const datesInPeriod = periodi[periodoKey].dates.sort();
          const firstDate = datesInPeriod[0];
          const lastDate = datesInPeriod[datesInPeriod.length - 1];

          // Qty iniziale: cerca inventario del giorno prima dell'INIZIO EFFETTIVO del periodo
          // Per weekly: periodoKey è il lunedì, cerco domenica prima
          // Per monthly: periodoKey è YYYY-MM, cerco ultimo giorno del mese precedente
          let qtyIniziale = 0;
          let qtyInizialeTeorica = false;
          let dayBeforePeriod;

          if (mode === 'weekly') {
            // periodoKey è già la data del lunedì (inizio settimana)
            dayBeforePeriod = format(subDays(parseISO(periodoKey), 1), 'yyyy-MM-dd');
          } else if (mode === 'monthly') {
            // periodoKey è YYYY-MM, quindi costruisco il primo del mese e poi sottraggo 1 giorno
            const firstDayOfMonth = parseISO(periodoKey + '-01');
            dayBeforePeriod = format(subDays(firstDayOfMonth, 1), 'yyyy-MM-dd');
          }

          const invDayBefore = allInventari.find((inv) =>
          inv.prodotto_id === mozz.id && inv.data_rilevazione.split('T')[0] === dayBeforePeriod
          );

          if (invDayBefore) {
            // Usa l'inventario del giorno prima dell'inizio periodo
            qtyIniziale = invDayBefore.quantita_rilevata;
            qtyInizialeTeorica = false;
          } else {
            // Usa quantità attesa del primo giorno del periodo
            const firstProd = datiGiornalieriPerProdotto[firstDate]?.[mozz.id];
            if (firstProd) {
              // Calcola qtyAttesa per il primo giorno
              const firstDayVendite = quantitaVendutePerGiorno[firstDate]?.[mozz.id]?.quantita || 0;
              const firstDayArrivi = ordiniPerGiorno[firstDate]?.[mozz.id]?.quantita || 0;
              qtyIniziale = (firstProd.qtyFinale || 0) - firstDayArrivi + firstDayVendite;
            } else {
              qtyIniziale = 0;
            }
            qtyInizialeTeorica = true;
          }

          // Trova operatore per inventario inizio periodo (giorno prima)
          const initialOperatore = invDayBefore ? users.find((u) => u.email === invDayBefore.created_by) : null;

          // Trova inventario e operatore dell'ultimo giorno
          const lastInventario = filteredInventari.find((inv) =>
          inv.prodotto_id === mozz.id && inv.data_rilevazione.split('T')[0] === lastDate
          );
          const lastOperatore = lastInventario ? users.find((u) => u.email === lastInventario.created_by) : null;

          // Qty finale: dall'inventario dell'ultimo giorno
          const lastProd = datiGiornalieriPerProdotto[lastDate]?.[mozz.id];
          const qtyFinale = lastProd ? lastProd.qtyFinale : 0;

          // Accumula vendite, arrivi, sprechi
          let grammiVendutiTotali = 0;
          let pezziVendutiTotali = 0;
          let qtyArrivataTotale = 0;
          let sprechiGrammiTotali = 0;
          const allBreakdown = [];

          datesInPeriod.forEach((date) => {
            const prod = datiGiornalieriPerProdotto[date]?.[mozz.id];
            if (prod) {
              pezziVendutiTotali += prod.qtyVenduta;
              qtyArrivataTotale += prod.qtyArrivata;
            }

            // Breakdown vendite
            filteredVendite.filter((v) => v.data_vendita === date).forEach((vendita) => {
              const ricetta = ricette.find((r) => r.nome_prodotto === vendita.flavor);
              if (!ricetta || !ricetta.ingredienti) return;

              const qty = vendita.total_pizzas_sold || 0;
              const ingredientiGrammi = espandiIngredientiGrammi(ricetta.ingredienti, 1);

              const mozzKey = mozz.id || mozz.nome_prodotto;
              if (ingredientiGrammi[mozzKey]) {
                const existing = allBreakdown.find((b) => b.nomeProdotto === vendita.flavor);
                if (existing) {
                  existing.quantitaVenduta += qty;
                  existing.grammiTotali += ingredientiGrammi[mozzKey].quantita * qty;
                } else {
                  allBreakdown.push({
                    nomeProdotto: vendita.flavor,
                    quantitaVenduta: qty,
                    grammiPerUnita: ingredientiGrammi[mozzKey].quantita,
                    grammiTotali: ingredientiGrammi[mozzKey].quantita * qty
                  });
                }
                grammiVendutiTotali += ingredientiGrammi[mozzKey].quantita * qty;
              }
            });

            // Sprechi
            filteredSprechi.filter((s) => {
              const dataSpreco = s.data_rilevazione.split('T')[0];
              return dataSpreco === date && s.prodotto_id === mozz.id;
            }).forEach((s) => {
              sprechiGrammiTotali += s.quantita_grammi || 0;
            });
          });

          const kgVendutiTotali = grammiVendutiTotali / 1000;
          const sprechiKgTotali = sprechiGrammiTotali / 1000;
          const qtyAttesa = qtyIniziale - pezziVendutiTotali + qtyArrivataTotale;
          const delta = qtyFinale - qtyAttesa;

          datiMozz.periodi.push({
            periodo: periodoKey,
            qtyIniziale,
            qtyInizialeteorica: qtyInizialeTeorica,
            grammiVenduti: grammiVendutiTotali,
            kgVenduti: kgVendutiTotali,
            pezziVenduti: pezziVendutiTotali,
            qtyArrivata: qtyArrivataTotale,
            sprechiGrammi: sprechiGrammiTotali,
            sprechiKg: sprechiKgTotali,
            qtyFinale,
            qtyAttesa,
            delta,
            breakdown: allBreakdown,
            initialInventario: invDayBefore ? {
              data: invDayBefore.data_rilevazione.split('T')[0],
              timestamp: invDayBefore.data_rilevazione,
              operatore: initialOperatore?.nome_cognome || initialOperatore?.full_name || invDayBefore.created_by
            } : null,
            lastInventario: lastInventario ? {
              data: lastInventario.data_rilevazione.split('T')[0],
              timestamp: lastInventario.data_rilevazione,
              operatore: lastOperatore?.nome_cognome || lastOperatore?.full_name || lastInventario.created_by
            } : null
          });
        });
      }

      if (datiMozz.periodi.length > 0) {
        details[mozz.id] = datiMozz;
      }
    });

    return details;
  };

  const mozzarellaDetails = calcProdottiChiaveData(prodottiChiaveViewMode);

  return (
    <ProtectedPage pageName="ControlloConsumi">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="mb-6">
          <h1 className="bg-clip-text text-slate-50 text-3xl font-bold from-slate-700 to-slate-900">Controllo Consumi

          </h1>
          <p className="text-slate-50 mt-1">Confronto tra consumi teorici ed effettivi</p>
        </div>

        {/* Tabs */}
        <NeumorphicCard className="p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('confronto')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'confronto' ?
              'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' :
              'text-slate-600 hover:bg-slate-50'}`
              }>

              Confronto Consumi
            </button>
            <button
              onClick={() => setActiveTab('consumi_teorici')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'consumi_teorici' ?
              'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' :
              'text-slate-600 hover:bg-slate-50'}`
              }>

              Consumi Teorici
            </button>
          </div>
        </NeumorphicCard>

        {/* Filtri */}
        <NeumorphicCard className="p-6">
          <div className="flex items-end gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Negozio
                </label>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-2 rounded-lg text-slate-700">

                  <option value="all">Tutti i negozi</option>
                  {stores.map((store) =>
                  <option key={store.id} value={store.id}>{store.name}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Data Inizio
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-2 rounded-lg text-slate-700" />

              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Data Fine
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-2 rounded-lg text-slate-700" />

              </div>
            </div>
            <NeumorphicButton onClick={() => setShowSettings(true)} className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Impostazioni
            </NeumorphicButton>
          </div>
        </NeumorphicCard>

        {/* View Mode Selector */}
        <NeumorphicCard className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">Vista:</span>
            <div className="flex gap-2">
              {['daily', 'weekly', 'monthly'].map((mode) =>
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === mode ?
                'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' :
                'neumorphic-flat text-slate-600'}`
                }>

                  {mode === 'daily' ? 'Giornaliera' : mode === 'weekly' ? 'Settimanale' : 'Mensile'}
                </button>
              )}
            </div>
          </div>
        </NeumorphicCard>

        {/* Statistiche */}
        {activeTab === 'confronto' &&
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="neumorphic-flat p-3 rounded-xl">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Giorni Analizzati</p>
                <p className="text-2xl font-bold text-slate-700">{stats.giorniAnalizzati}</p>
              </div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="neumorphic-flat p-3 rounded-xl bg-blue-100">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Prodotti Monitorati</p>
                <p className="text-2xl font-bold text-slate-700">{stats.prodottiMonitorati}</p>
              </div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="neumorphic-flat p-3 rounded-xl bg-green-100">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Delta Positivo</p>
                <p className="text-2xl font-bold text-green-600">+{stats.deltaPositivoTotale.toFixed(1)}</p>
              </div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="neumorphic-flat p-3 rounded-xl bg-red-100">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Delta Negativo</p>
                <p className="text-2xl font-bold text-red-600">-{stats.deltaNegativoTotale.toFixed(1)}</p>
              </div>
            </div>
          </NeumorphicCard>
        </div>
        }

        {/* Dettaglio Prodotti Chiave */}
        {activeTab === 'confronto' && Object.keys(mozzarellaDetails).length > 0 &&
        <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-700">📊 Dettaglio Prodotti Chiave</h2>
              <div className="flex gap-2">
                {['daily', 'weekly', 'monthly'].map((mode) =>
              <button
                key={mode}
                onClick={() => setProdottiChiaveViewMode(mode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                prodottiChiaveViewMode === mode ?
                'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' :
                'neumorphic-flat text-slate-600'}`
                }>

                    {mode === 'daily' ? 'Giornaliera' : mode === 'weekly' ? 'Settimanale' : 'Mensile'}
                  </button>
              )}
              </div>
            </div>
            <div className="space-y-4">
              {Object.keys(mozzarellaDetails).map((mozzId) => {
              const mozz = mozzarellaDetails[mozzId];
              const isExpanded = expandedProducts[mozzId];
              return (
                <div key={mozzId} className="neumorphic-pressed rounded-lg">
                    <button
                    onClick={() => setExpandedProducts((prev) => ({ ...prev, [mozzId]: !prev[mozzId] }))}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">

                      <div className="flex items-center gap-3">
                        <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                        <div>
                          <h3 className="font-bold text-lg text-slate-800">{mozz.nome}</h3>
                          <p className="text-sm text-slate-600">
                            Peso unitario: <span className="font-bold">{mozz.pesoUnitario} {mozz.unitaMisura === 'pezzi' ? 'kg/pezzo' : ''}</span>
                          </p>
                        </div>
                      </div>
                    </button>
                    
                    {isExpanded &&
                  <div className="p-4 pt-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b-2 border-slate-300">
                                <th className="text-left py-2 px-3">{prodottiChiaveViewMode === 'daily' ? 'Data' : prodottiChiaveViewMode === 'weekly' ? 'Settimana' : 'Mese'}</th>
                                <th className="text-right py-2 px-3">Qty Iniziale<br /><span className="text-xs font-normal">({mozz.unitaMisura})</span></th>
                                <th className="text-right py-2 px-3">Grammi Venduti<br /><span className="text-xs font-normal">(ricette)</span></th>
                                <th className="text-right py-2 px-3">Kg Venduti</th>
                                <th className="text-right py-2 px-3">Pezzi Venduti<br /><span className="text-xs font-normal">(calcolati)</span></th>
                                <th className="text-right py-2 px-3">Sprechi<br /><span className="text-xs font-normal">(g / kg)</span></th>
                                <th className="text-right py-2 px-3">Qty Arrivata<br /><span className="text-xs font-normal">({mozz.unitaMisura})</span></th>
                                <th className="text-right py-2 px-3">Qty Attesa<br /><span className="text-xs font-normal">({mozz.unitaMisura})</span></th>
                                <th className="text-right py-2 px-3">Qty Finale<br /><span className="text-xs font-normal">({mozz.unitaMisura})</span></th>
                                <th className="text-right py-2 px-3">Delta<br /><span className="text-xs font-normal">({mozz.unitaMisura} | %)</span></th>
                              </tr>
                            </thead>
                            <tbody>
                              {mozz.periodi.map((periodo) => {
                            const rowKey = `${mozzId}-${periodo.periodo}`;
                            const isRowExpanded = expandedMozzarellaRows[rowKey];
                            const deltaPercent = periodo.pezziVenduti !== 0 ? periodo.delta / periodo.pezziVenduti * 100 : 0;
                            return (
                              <React.Fragment key={periodo.periodo}>
                                    <tr className={`border-b border-slate-100 hover:bg-slate-50 ${periodo.inventarioMancante ? 'bg-yellow-50' : ''}`}>
                                      <td className="py-2 px-3">
                                        <button
                                      onClick={() => setExpandedMozzarellaRows((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }))}
                                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800">

                                          <span className="text-xs">{isRowExpanded ? '▼' : '▶'}</span>
                                          {prodottiChiaveViewMode === 'daily' ?
                                      format(parseISO(periodo.periodo), 'dd/MM/yyyy') :
                                      prodottiChiaveViewMode === 'weekly' ?
                                      `${format(parseISO(periodo.periodo), 'dd/MM/yyyy')}` :
                                      format(parseISO(periodo.periodo + '-01'), 'MMMM yyyy', { locale: it })
                                      }
                                          {periodo.inventarioMancante &&
                                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800">
                                              No inv.
                                            </span>
                                      }
                                        </button>
                                      </td>
                                      <td className="py-2 px-3 text-right font-medium">
                                        <div className="flex items-center justify-end gap-1">
                                          <span>{periodo.qtyIniziale.toFixed(2)}</span>
                                          {periodo.qtyInizialeteorica &&
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700" title="Valore teorico calcolato">
                                              T
                                            </span>
                                      }
                                        </div>
                                      </td>
                                      <td className="py-2 px-3 text-right text-orange-600">{periodo.grammiVenduti.toFixed(0)} g</td>
                                      <td className="py-2 px-3 text-right text-orange-600 font-medium">{periodo.kgVenduti.toFixed(2)} kg</td>
                                      <td className="py-2 px-3 text-right text-orange-700 font-bold">-{periodo.pezziVenduti.toFixed(2)}</td>
                                      <td className="py-2 px-3 text-right text-red-600">
                                        {periodo.sprechiGrammi > 0 ?
                                    <div>
                                            <div className="font-medium">{periodo.sprechiGrammi.toFixed(0)} g</div>
                                            <div className="text-xs">({periodo.sprechiKg.toFixed(2)} kg)</div>
                                          </div> :
                                    '-'}
                                      </td>
                                      <td className="py-2 px-3 text-right text-blue-600 font-medium">+{periodo.qtyArrivata.toFixed(2)}</td>
                                      <td className="py-2 px-3 text-right text-slate-600">{periodo.qtyAttesa.toFixed(2)}</td>
                                      <td className="py-2 px-3 text-right font-bold">
                                        {periodo.inventarioMancante ?
                                    <span className="text-yellow-600">-</span> :

                                    periodo.qtyFinale.toFixed(2)
                                    }
                                      </td>
                                      <td className={`py-2 px-3 text-right ${
                                  periodo.inventarioMancante ? 'text-yellow-600' :
                                  periodo.delta > 0 ? 'text-green-600' :
                                  periodo.delta < 0 ? 'text-red-600' :
                                  'text-slate-600'}`
                                  }>
                                        {periodo.inventarioMancante ?
                                    <span className="text-xs">N/A</span> :

                                    <>
                                            <div className="font-bold">{periodo.delta > 0 ? '+' : ''}{periodo.delta.toFixed(2)}</div>
                                            <div className="text-xs">({deltaPercent > 0 ? '+' : ''}{deltaPercent.toFixed(1)}%)</div>
                                          </>
                                    }
                                      </td>
                                    </tr>
                                    {isRowExpanded &&
                                <tr>
                                        <td colSpan="10" className={`p-4 ${periodo.inventarioMancante ? 'bg-yellow-50' : 'bg-slate-50'}`}>
                                          <div className="text-sm space-y-4">
                                            {periodo.inventarioMancante &&
                                      <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg mb-4">
                                                <p className="font-bold text-yellow-800 flex items-center gap-2">
                                                  <AlertTriangle className="w-4 h-4" />
                                                  ⚠️ Inventario non compilato in questa data
                                                </p>
                                                <p className="text-xs text-yellow-700 mt-1">
                                                  La quantità iniziale è stata calcolata dalla quantità attesa del giorno precedente
                                                </p>
                                              </div>
                                      }
                                            {prodottiChiaveViewMode !== 'daily' &&
                                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                                                <p className="font-bold text-blue-800 mb-2">📅 Dettaglio Form Inventario:</p>
                                                <div className="grid grid-cols-2 gap-4 ml-4 text-xs">
                                                  <div>
                                                    <p className="font-medium text-slate-700">Inizio Periodo:</p>
                                                    {periodo.initialInventario ?
                                            <>
                                                        <p className="text-slate-600">Data: {format(parseISO(periodo.initialInventario.timestamp), 'dd/MM/yyyy HH:mm')}</p>
                                                        <p className="text-slate-600">Operatore: {periodo.initialInventario.operatore}</p>
                                                      </> :

                                            <>
                                                        <p className="text-slate-600">Data: -</p>
                                                        <p className="text-purple-600 font-medium">Operatore: Teorico</p>
                                                      </>
                                            }
                                                  </div>
                                                  <div>
                                                    <p className="font-medium text-slate-700">Fine Periodo:</p>
                                                    {periodo.lastInventario ?
                                            <>
                                                        <p className="text-slate-600">Data: {format(parseISO(periodo.lastInventario.timestamp), 'dd/MM/yyyy HH:mm')}</p>
                                                        <p className="text-slate-600">Operatore: {periodo.lastInventario.operatore}</p>
                                                      </> :

                                            <>
                                                        <p className="text-slate-600">Data: -</p>
                                                        <p className="text-purple-600 font-medium">Operatore: Teorico</p>
                                                      </>
                                            }
                                                  </div>
                                                </div>
                                              </div>
                                      }
                                            {periodo.breakdown && periodo.breakdown.length > 0 &&
                                      <>
                                                <p className="font-bold text-slate-700 mb-2">📋 Breakdown Calcolo Grammi Venduti:</p>
                                      <div className="space-y-1 ml-4">
                                        {periodo.breakdown.map((item, idx) =>
                                          <div key={idx} className="flex items-center justify-between text-slate-600">
                                            <span>
                                              <span className="font-medium text-slate-800">{item.nomeProdotto}</span>
                                              {' × '}
                                              <span className="font-medium text-blue-600">{item.quantitaVenduta}</span>
                                              {' pezzi × '}
                                              <span className="text-orange-600">{item.grammiPerUnita.toFixed(2)} g/pezzo</span>
                                            </span>
                                            <span className="font-bold text-orange-700">
                                              = {item.grammiTotali.toFixed(0)} g
                                            </span>
                                          </div>
                                          )}
                                        <div className="border-t border-slate-300 mt-2 pt-2 flex justify-between font-bold text-slate-800">
                                          <span>TOTALE:</span>
                                          <span className="text-orange-700">{periodo.grammiVenduti.toFixed(0)} g</span>
                                        </div>
                                      </div>
                                      </>
                                      }
                                    </div>
                                  </td>
                                </tr>
                                }
                            </React.Fragment>);

                          })}
                            </tbody>
                            </table>
                            </div>
                            </div>
                  }
                            </div>);

            })}
                            </div>
                            </NeumorphicCard>
        }

        {/* Tabella dati confronto */}
        {activeTab === 'confronto' &&
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-700 mb-4">
            Dettaglio {viewMode === 'daily' ? 'Giornaliero' : viewMode === 'weekly' ? 'Settimanale' : 'Mensile'} per Prodotto
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                    {viewMode === 'daily' ? 'Data' : viewMode === 'weekly' ? 'Settimana' : 'Mese'}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Prodotto</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Qty Iniziale</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Qty Venduta</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Qty Arrivata</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Qty Finale</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Delta</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">UM</th>
                </tr>
              </thead>
              <tbody>
                {dateConfrontoSorted.map((date) => {
                  const prodotti = datiConfrontoView[date] || {};

                  return Object.keys(prodotti).map((prodId) => {
                    const prod = prodotti[prodId];
                    const isDeltaPositive = prod.delta > 0;
                    const isDeltaNegative = prod.delta < 0;

                    return (
                      <tr key={`${date}-${prodId}`} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {viewMode === 'daily' ?
                          format(parseISO(date), 'dd/MM/yyyy') :
                          viewMode === 'weekly' ?
                          `${format(parseISO(date), 'dd/MM/yyyy')}` :
                          format(parseISO(date + '-01'), 'MMMM yyyy', { locale: it })
                          }
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-700 font-medium">{prod.nome}</td>
                        <td className="py-3 px-4 text-sm text-slate-700 text-right">{prod.qtyIniziale.toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm text-orange-600 text-right font-medium">-{prod.qtyVenduta.toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm text-blue-600 text-right font-medium">+{prod.qtyArrivata.toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm text-slate-700 text-right font-bold">{prod.qtyFinale.toFixed(2)}</td>
                        <td className={`py-3 px-4 text-sm text-right font-bold ${
                        isDeltaPositive ? 'text-green-600' : isDeltaNegative ? 'text-red-600' : 'text-slate-600'}`
                        }>
                          {prod.delta > 0 ? '+' : ''}{prod.delta.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500">{prod.unita_misura}</td>
                      </tr>);

                  });
                })}
              </tbody>
            </table>
          </div>

          {dateConfrontoSorted.length === 0 &&
          <div className="text-center py-8 text-slate-500">
              Nessun dato disponibile per il periodo selezionato
            </div>
          }
        </NeumorphicCard>
        }

        {/* Tabella Consumi Teorici */}
        {activeTab === 'consumi_teorici' &&
        <>
            {/* Statistiche Debug */}
            {debugStats.pizzeSenzaRicetta > 0 &&
          <NeumorphicCard className="p-4 mb-4 bg-orange-50 border-l-4 border-orange-500">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-bold text-orange-900 mb-1">Attenzione: Ricette Mancanti</h3>
                    <p className="text-sm text-orange-800 mb-2">
                      <strong>{debugStats.pizzeSenzaRicetta}</strong> pizze su <strong>{debugStats.totalePizzeVendute}</strong> non hanno una ricetta corrispondente e non sono state incluse nel calcolo dei consumi teorici.
                    </p>
                    <p className="text-xs text-orange-700">
                      <strong>Pizze senza ricetta:</strong> {Array.from(debugStats.ricetteNonTrovate).join(', ')}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      💡 Crea le ricette mancanti nella sezione "Ricette" per includere queste pizze nel calcolo.
                    </p>
                  </div>
                </div>
              </NeumorphicCard>
          }

            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-700">
                  Consumi Teorici per {viewMode === 'daily' ? 'Giorno' : viewMode === 'weekly' ? 'Settimana' : 'Mese'}
                </h2>
                <div className="text-sm text-slate-600">
                  {debugStats.pizzeConRicetta} / {debugStats.totalePizzeVendute} pizze processate
                </div>
              </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-300">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      {viewMode === 'daily' ? 'Data' : viewMode === 'weekly' ? 'Settimana' : 'Mese'}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Materia Prima</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Quantità Consumata</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">UM</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Confezione/Pezzo</th>
                  </tr>
                </thead>
                <tbody>
                  {datesConsumiSorted.map((date) => {
                    const prodotti = consumiAggregati[date] || {};

                    return Object.keys(prodotti).map((prodId) => {
                      const prod = prodotti[prodId];
                      const rowKey = `${date}-${prodId}`;
                      const isExpanded = expandedConsumiTeoruiDettagli[rowKey];
                      
                      // Aggrega dettagli quando viewMode !== 'daily'
                      let dettagliRiga = [];
                      if (viewMode === 'daily' && consumiTeoriciDettagli[date]) {
                        dettagliRiga = consumiTeoriciDettagli[date][prodId] || [];
                      }

                      return (
                        <React.Fragment key={rowKey}>
                          <tr className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4 text-sm text-slate-600">
                              <button
                                onClick={() => setExpandedConsumiTeoriciDettagli((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }))}
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
                                <span className="text-xs">{dettagliRiga.length > 0 && isExpanded ? '▼' : dettagliRiga.length > 0 ? '▶' : '•'}</span>
                                {viewMode === 'daily' ?
                                format(parseISO(date), 'dd/MM/yyyy') :
                                viewMode === 'weekly' ?
                                `${format(parseISO(date), 'dd/MM/yyyy')}` :
                                format(parseISO(date + '-01'), 'MMMM yyyy', { locale: it })
                                }
                              </button>
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-700 font-medium">{prod.nome}</td>
                            <td className="py-3 px-4 text-sm text-blue-600 text-right font-bold">
                              {prod.quantita.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-500">{prod.unita_misura}</td>
                            <td className="py-3 px-4 text-sm text-slate-500">
                              {prod.peso_dimensione_unita && prod.unita_misura_peso ?
                              `${prod.peso_dimensione_unita} ${prod.unita_misura_peso}` :
                              '-'
                              }
                            </td>
                          </tr>
                          {isExpanded && dettagliRiga.length > 0 &&
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <td colSpan="5" className="p-4">
                                <div className="ml-6">
                                  <p className="font-bold text-slate-700 mb-3">📋 Dettaglio Calcolo:</p>
                                  <div className="space-y-2">
                                    {dettagliRiga.map((item, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-sm text-slate-600 bg-white p-2 rounded border border-slate-200">
                                        <div className="flex-1">
                                          <span className="font-medium text-slate-800">{item.nomeProdotto}</span>
                                          <span className="text-slate-500"> × </span>
                                          <span className="font-medium text-blue-600">{item.quantitaVenduta}</span>
                                          <span className="text-slate-500"> pezzi × </span>
                                          <span className="text-orange-600">{item.ingredientePerUnita.toFixed(2)} {item.unitaMisura}/pezzo</span>
                                        </div>
                                        <div className="font-bold text-orange-700 ml-4">
                                          = {item.consumoTotale.toFixed(2)} {item.unitaMisura}
                                        </div>
                                      </div>
                                    ))}
                                    <div className="border-t border-slate-300 mt-2 pt-2 flex justify-between font-bold text-slate-800 bg-white p-2 rounded">
                                      <span>TOTALE:</span>
                                      <span className="text-orange-700">{prod.quantita.toFixed(2)} {prod.unita_misura}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          }
                        </React.Fragment>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>

            {datesConsumiSorted.length === 0 &&
            <div className="text-center py-8 text-slate-500">
                Nessun dato disponibile per il periodo selezionato
              </div>
            }
            </NeumorphicCard>
          </>
        }

        {/* Modal Impostazioni */}
        {showSettings &&
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <NeumorphicCard className="max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-700">Impostazioni Controllo Consumi</h3>
                <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-slate-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="text-sm text-slate-600 mb-4">Seleziona i prodotti da monitorare:</p>

              <div className="space-y-3">
                {/* Materie Prime */}
                <div className="neumorphic-pressed rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                      type="checkbox"
                      checked={productsByCategory.materie_prime.every((p) => selectedProducts.includes(p.id))}
                      onChange={() => toggleCategory('materie_prime')}
                      className="w-5 h-5 rounded" />

                      <div>
                        <p className="font-bold text-slate-700">Materie Prime</p>
                        <p className="text-xs text-slate-500">{productsByCategory.materie_prime.length} prodotti</p>
                      </div>
                    </label>
                    <button
                    onClick={() => setExpandedCategories((prev) => ({ ...prev, materie_prime: !prev.materie_prime }))}
                    className="text-slate-500 hover:text-slate-700">

                      {expandedCategories.materie_prime ? '▼' : '▶'}
                    </button>
                  </div>

                  {expandedCategories.materie_prime &&
                <div className="ml-8 space-y-2 max-h-48 overflow-y-auto">
                      {productsByCategory.materie_prime.map((product) =>
                  <label key={product.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                          <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="w-4 h-4 rounded" />

                          <span className="text-sm text-slate-700">{product.nome}</span>
                        </label>
                  )}
                    </div>
                }
                </div>

                {/* Semilavorati */}
                <div className="neumorphic-pressed rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                      type="checkbox"
                      checked={productsByCategory.semilavorati.every((p) => selectedProducts.includes(p.id))}
                      onChange={() => toggleCategory('semilavorati')}
                      className="w-5 h-5 rounded" />

                      <div>
                        <p className="font-bold text-slate-700">Semilavorati</p>
                        <p className="text-xs text-slate-500">{productsByCategory.semilavorati.length} prodotti</p>
                      </div>
                    </label>
                    <button
                    onClick={() => setExpandedCategories((prev) => ({ ...prev, semilavorati: !prev.semilavorati }))}
                    className="text-slate-500 hover:text-slate-700">

                      {expandedCategories.semilavorati ? '▼' : '▶'}
                    </button>
                  </div>

                  {expandedCategories.semilavorati &&
                <div className="ml-8 space-y-2 max-h-48 overflow-y-auto">
                      {productsByCategory.semilavorati.map((product) =>
                  <label key={product.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                          <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="w-4 h-4 rounded" />

                          <span className="text-sm text-slate-700">{product.nome}</span>
                        </label>
                  )}
                    </div>
                }
                </div>

                {/* Prodotti Finiti */}
                <div className="neumorphic-pressed rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                      type="checkbox"
                      checked={productsByCategory.prodotti_finiti.every((p) => selectedProducts.includes(p.id))}
                      onChange={() => toggleCategory('prodotti_finiti')}
                      className="w-5 h-5 rounded" />

                      <div>
                        <p className="font-bold text-slate-700">Prodotti Finiti</p>
                        <p className="text-xs text-slate-500">{productsByCategory.prodotti_finiti.length} prodotti</p>
                      </div>
                    </label>
                    <button
                    onClick={() => setExpandedCategories((prev) => ({ ...prev, prodotti_finiti: !prev.prodotti_finiti }))}
                    className="text-slate-500 hover:text-slate-700">

                      {expandedCategories.prodotti_finiti ? '▼' : '▶'}
                    </button>
                  </div>

                  {expandedCategories.prodotti_finiti &&
                <div className="ml-8 space-y-2 max-h-48 overflow-y-auto">
                      {productsByCategory.prodotti_finiti.map((product) =>
                  <label key={product.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                          <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="w-4 h-4 rounded" />

                          <span className="text-sm text-slate-700">{product.nome}</span>
                        </label>
                  )}
                    </div>
                }
                </div>
              </div>

              <div className="mt-6 flex justify-between items-center">
                <p className="text-sm text-slate-600">
                  {selectedProducts.length} prodotti selezionati
                </p>
                <NeumorphicButton onClick={() => setShowSettings(false)} variant="primary">
                  Applica Filtri
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          </div>
        }
      </div>
    </ProtectedPage>);

}