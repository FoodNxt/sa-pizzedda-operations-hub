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

  // Helper: determina il tipo di prodotto
  const getProductType = (prodottoId, nomeProdotto) => {
    // Cerca in materie prime
    const mp = materiePrime.find(m => m.id === prodottoId || m.nome_prodotto === nomeProdotto);
    if (mp) return 'materie_prime';

    // Cerca in ricette
    const ricetta = ricette.find(r => r.id === prodottoId || r.nome_prodotto === nomeProdotto);
    if (ricetta) {
      if (ricetta.is_semilavorato) return 'semilavorati';
      return 'prodotti_finiti';
    }

    // Default: materie prime
    return 'materie_prime';
  };

  // Raggruppa prodotti per categoria
  const productsByCategory = {
    materie_prime: materiePrime.map(m => ({ id: m.id, nome: m.nome_prodotto })),
    semilavorati: ricette.filter(r => r.is_semilavorato).map(r => ({ id: r.id, nome: r.nome_prodotto })),
    prodotti_finiti: ricette.filter(r => !r.is_semilavorato).map(r => ({ id: r.id, nome: r.nome_prodotto }))
  };

  // Inizializza selectedProducts con tutti i prodotti se vuoto
  React.useEffect(() => {
    if (selectedProducts.length === 0 && (materiePrime.length > 0 || ricette.length > 0)) {
      const allProducts = [
        ...productsByCategory.materie_prime.map(p => p.id),
        ...productsByCategory.semilavorati.map(p => p.id),
        ...productsByCategory.prodotti_finiti.map(p => p.id)
      ];
      setSelectedProducts(allProducts);
    }
  }, [materiePrime, ricette]);

  const toggleProduct = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleCategory = (category) => {
    const categoryProducts = productsByCategory[category].map(p => p.id);
    const allSelected = categoryProducts.every(id => selectedProducts.includes(id));
    
    if (allSelected) {
      setSelectedProducts(prev => prev.filter(id => !categoryProducts.includes(id)));
    } else {
      setSelectedProducts(prev => [...new Set([...prev, ...categoryProducts])]);
    }
  };

  // Filtra per store e date
  const filteredVendite = prodottiVenduti.filter(v => {
    const matchStore = selectedStore === "all" || v.store_id === selectedStore;
    const matchDate = v.data_vendita >= startDate && v.data_vendita <= endDate;
    return matchStore && matchDate;
  });

  const filteredInventari = inventari.filter(i => {
    const matchStore = selectedStore === "all" || i.store_id === selectedStore;
    const dataRil = i.data_rilevazione.split('T')[0];
    const matchDate = dataRil >= startDate && dataRil <= endDate;
    return matchStore && matchDate;
  });

  // Includi anche inventari del giorno precedente al periodo (per quantità iniziale)
  const allInventari = inventari.filter(i => {
    const matchStore = selectedStore === "all" || i.store_id === selectedStore;
    const dataRil = i.data_rilevazione.split('T')[0];
    const dayBeforeStart = format(subDays(parseISO(startDate), 1), 'yyyy-MM-dd');
    const matchDate = dataRil >= dayBeforeStart && dataRil <= endDate;
    return matchStore && matchDate;
  });

  const filteredOrdini = ordini.filter(o => {
    const matchStore = selectedStore === "all" || o.store_id === selectedStore;
    if (!o.data_completamento) return false;
    const dataCompl = o.data_completamento.split('T')[0];
    const matchDate = dataCompl >= startDate && dataCompl <= endDate;
    return matchStore && matchDate;
  });

  // Organizza inventari per prodotto e data
  const inventariPerProdotto = {};
  allInventari.forEach(inv => {
    const key = inv.prodotto_id;
    if (!inventariPerProdotto[key]) {
      inventariPerProdotto[key] = [];
    }
    inventariPerProdotto[key].push(inv);
  });

  // Ordina per data
  Object.keys(inventariPerProdotto).forEach(prodottoId => {
    inventariPerProdotto[prodottoId].sort((a, b) => 
      new Date(a.data_rilevazione) - new Date(b.data_rilevazione)
    );
  });

  // Calcola quantità vendute per giorno e prodotto (da prodotti venduti)
  const quantitaVendutePerGiorno = {};
  filteredVendite.forEach(vendita => {
    const ricetta = ricette.find(r => r.nome_prodotto === vendita.flavor);
    if (!ricetta || !ricetta.ingredienti) return;

    const qty = vendita.total_pizzas_sold || 0;
    const date = vendita.data_vendita;

    if (!quantitaVendutePerGiorno[date]) {
      quantitaVendutePerGiorno[date] = {};
    }

    ricetta.ingredienti.forEach(ing => {
      const key = ing.materia_prima_id || ing.nome_prodotto;
      if (!quantitaVendutePerGiorno[date][key]) {
        quantitaVendutePerGiorno[date][key] = {
          nome: ing.nome_prodotto,
          quantita: 0,
          unita_misura: ing.unita_misura
        };
      }
      quantitaVendutePerGiorno[date][key].quantita += (ing.quantita * qty);
    });
  });

  // Calcola ordini ricevuti per giorno
  const ordiniPerGiorno = {};
  filteredOrdini.forEach(ordine => {
    if (ordine.status !== 'completato' || !ordine.data_completamento) return;
    const date = ordine.data_completamento.split('T')[0];

    if (!ordiniPerGiorno[date]) {
      ordiniPerGiorno[date] = {};
    }

    ordine.prodotti.forEach(prod => {
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
  Object.keys(inventariPerProdotto).forEach(prodottoId => {
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
    
    // Raggruppa per prodotto
    const prodottiData = {};
    
    Object.keys(inventariPerProdotto).forEach(prodottoId => {
      if (!selectedProducts.includes(prodottoId)) return;

      const invs = inventariPerProdotto[prodottoId];
      
      // Trova inventario iniziale (giorno prima del periodo) e finale (ultimo del periodo)
      let invIniziale = null;
      let invFinale = null;
      
      invs.forEach(inv => {
        const date = inv.data_rilevazione.split('T')[0];
        const dayBeforeStart = format(subDays(parseISO(startDate), 1), 'yyyy-MM-dd');
        
        if (date === dayBeforeStart) {
          invIniziale = inv;
        }
        if (date >= startDate && date <= endDate) {
          if (!invFinale || date > invFinale.data_rilevazione.split('T')[0]) {
            invFinale = inv;
          }
        }
      });

      if (!invIniziale || !invFinale) return;

      // Calcola vendite totali nel periodo
      let qtyVenditaTotale = 0;
      Object.keys(quantitaVendutePerGiorno).forEach(date => {
        if (date >= startDate && date <= endDate) {
          qtyVenditaTotale += quantitaVendutePerGiorno[date]?.[prodottoId]?.quantita || 0;
        }
      });

      // Calcola arrivi totali nel periodo
      let qtyArrivataTotale = 0;
      Object.keys(ordiniPerGiorno).forEach(date => {
        if (date >= startDate && date <= endDate) {
          qtyArrivataTotale += ordiniPerGiorno[date]?.[prodottoId]?.quantita || 0;
        }
      });

      const qtyIniziale = invIniziale.quantita_rilevata;
      const qtyFinale = invFinale.quantita_rilevata;
      const attesa = qtyIniziale - qtyVenditaTotale + qtyArrivataTotale;
      const delta = qtyFinale - attesa;

      // Determina periodo
      let periodoKey;
      if (mode === 'weekly') {
        const weekStart = startOfWeek(parseISO(startDate), { weekStartsOn: 1 });
        periodoKey = format(weekStart, 'yyyy-MM-dd');
      } else if (mode === 'monthly') {
        periodoKey = format(parseISO(startDate), 'yyyy-MM');
      }

      if (!aggregated[periodoKey]) {
        aggregated[periodoKey] = {};
      }

      aggregated[periodoKey][prodottoId] = {
        nome: invIniziale.nome_prodotto,
        unita_misura: invIniziale.unita_misura,
        qtyIniziale,
        qtyVenduta: qtyVenditaTotale,
        qtyArrivata: qtyArrivataTotale,
        qtyFinale,
        delta
      };
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

  filteredVendite.forEach(vendita => {
    const qty = vendita.total_pizzas_sold || 0;
    debugStats.totalePizzeVendute += qty;

    const ricetta = ricette.find(r => r.nome_prodotto === vendita.flavor);
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

    ricetta.ingredienti.forEach(ing => {
      const key = ing.materia_prima_id || ing.nome_prodotto;
      if (!consumiTeoriciPerGiorno[date][key]) {
        consumiTeoriciPerGiorno[date][key] = {
          nome: ing.nome_prodotto,
          quantita: 0,
          unita_misura: ing.unita_misura
        };
      }
      consumiTeoriciPerGiorno[date][key].quantita += (ing.quantita * qty);
    });
  });

  // Aggrega per settimana o mese
  const aggregateData = (data, mode) => {
    if (mode === 'daily') return data;

    const aggregated = {};
    Object.keys(data).forEach(date => {
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

      Object.keys(data[date]).forEach(prodId => {
        if (!aggregated[key][prodId]) {
          aggregated[key][prodId] = {
            nome: data[date][prodId].nome,
            quantita: 0,
            unita_misura: data[date][prodId].unita_misura
          };
        }
        aggregated[key][prodId].quantita += data[date][prodId].quantita;
      });
    });

    return aggregated;
  };

  const consumiAggregati = aggregateData(consumiTeoriciPerGiorno, viewMode);
  const datesConsumiSorted = Object.keys(consumiAggregati).sort().reverse();

  // Calcola statistiche aggregate
  const stats = {
    giorniAnalizzati: datesSorted.length,
    prodottiMonitorati: 0,
    deltaPositivoTotale: 0,
    deltaNegativoTotale: 0
  };

  let prodottiSet = new Set();
  datesSorted.forEach(date => {
    const prodotti = datiGiornalieriPerProdotto[date] || {};
    Object.keys(prodotti).forEach(prodId => {
      prodottiSet.add(prodId);
      const delta = prodotti[prodId].delta;
      if (delta > 0) stats.deltaPositivoTotale += delta;
      if (delta < 0) stats.deltaNegativoTotale += Math.abs(delta);
    });
  });
  stats.prodottiMonitorati = prodottiSet.size;

  return (
    <ProtectedPage pageName="ControlloConsumi">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
            Controllo Consumi
          </h1>
          <p className="text-slate-500 mt-1">Confronto tra consumi teorici ed effettivi</p>
        </div>

        {/* Tabs */}
        <NeumorphicCard className="p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('confronto')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'confronto'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Confronto Consumi
            </button>
            <button
              onClick={() => setActiveTab('consumi_teorici')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'consumi_teorici'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
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
                  className="w-full neumorphic-pressed px-4 py-2 rounded-lg text-slate-700"
                >
                  <option value="all">Tutti i negozi</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
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
                  className="w-full neumorphic-pressed px-4 py-2 rounded-lg text-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Data Fine
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-2 rounded-lg text-slate-700"
                />
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
              {['daily', 'weekly', 'monthly'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === mode
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'neumorphic-flat text-slate-600'
                  }`}
                >
                  {mode === 'daily' ? 'Giornaliera' : mode === 'weekly' ? 'Settimanale' : 'Mensile'}
                </button>
              ))}
            </div>
          </div>
        </NeumorphicCard>

        {/* Statistiche */}
        {activeTab === 'confronto' && (
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
        )}

        {/* Tabella dati confronto */}
        {activeTab === 'confronto' && (
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
                {dateConfrontoSorted.map(date => {
                  const prodotti = datiConfrontoView[date] || {};
                  
                  return Object.keys(prodotti).map(prodId => {
                    const prod = prodotti[prodId];
                    const isDeltaPositive = prod.delta > 0;
                    const isDeltaNegative = prod.delta < 0;

                    return (
                      <tr key={`${date}-${prodId}`} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {viewMode === 'daily' 
                            ? format(parseISO(date), 'dd/MM/yyyy')
                            : viewMode === 'weekly'
                            ? `${format(parseISO(date), 'dd/MM/yyyy')}`
                            : format(parseISO(date + '-01'), 'MMMM yyyy', { locale: it })
                          }
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-700 font-medium">{prod.nome}</td>
                        <td className="py-3 px-4 text-sm text-slate-700 text-right">{prod.qtyIniziale.toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm text-orange-600 text-right font-medium">-{prod.qtyVenduta.toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm text-blue-600 text-right font-medium">+{prod.qtyArrivata.toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm text-slate-700 text-right font-bold">{prod.qtyFinale.toFixed(2)}</td>
                        <td className={`py-3 px-4 text-sm text-right font-bold ${
                          isDeltaPositive ? 'text-green-600' : isDeltaNegative ? 'text-red-600' : 'text-slate-600'
                        }`}>
                          {prod.delta > 0 ? '+' : ''}{prod.delta.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500">{prod.unita_misura}</td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>

          {dateConfrontoSorted.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              Nessun dato disponibile per il periodo selezionato
            </div>
          )}
        </NeumorphicCard>
        )}

        {/* Tabella Consumi Teorici */}
        {activeTab === 'consumi_teorici' && (
          <>
            {/* Statistiche Debug */}
            {debugStats.pizzeSenzaRicetta > 0 && (
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
            )}

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
                  </tr>
                </thead>
                <tbody>
                  {datesConsumiSorted.map(date => {
                    const prodotti = consumiAggregati[date] || {};
                    
                    return Object.keys(prodotti).map(prodId => {
                      const prod = prodotti[prodId];

                      return (
                        <tr key={`${date}-${prodId}`} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {viewMode === 'daily' 
                              ? format(parseISO(date), 'dd/MM/yyyy')
                              : viewMode === 'weekly'
                              ? `${format(parseISO(date), 'dd/MM/yyyy')}`
                              : format(parseISO(date + '-01'), 'MMMM yyyy', { locale: it })
                            }
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-700 font-medium">{prod.nome}</td>
                          <td className="py-3 px-4 text-sm text-blue-600 text-right font-bold">
                            {prod.quantita.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-500">{prod.unita_misura}</td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>

            {datesConsumiSorted.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                Nessun dato disponibile per il periodo selezionato
              </div>
            )}
            </NeumorphicCard>
          </>
        )}

        {/* Modal Impostazioni */}
        {showSettings && (
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
                        checked={productsByCategory.materie_prime.every(p => selectedProducts.includes(p.id))}
                        onChange={() => toggleCategory('materie_prime')}
                        className="w-5 h-5 rounded"
                      />
                      <div>
                        <p className="font-bold text-slate-700">Materie Prime</p>
                        <p className="text-xs text-slate-500">{productsByCategory.materie_prime.length} prodotti</p>
                      </div>
                    </label>
                    <button
                      onClick={() => setExpandedCategories(prev => ({ ...prev, materie_prime: !prev.materie_prime }))}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      {expandedCategories.materie_prime ? '▼' : '▶'}
                    </button>
                  </div>

                  {expandedCategories.materie_prime && (
                    <div className="ml-8 space-y-2 max-h-48 overflow-y-auto">
                      {productsByCategory.materie_prime.map(product => (
                        <label key={product.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={() => toggleProduct(product.id)}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm text-slate-700">{product.nome}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Semilavorati */}
                <div className="neumorphic-pressed rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={productsByCategory.semilavorati.every(p => selectedProducts.includes(p.id))}
                        onChange={() => toggleCategory('semilavorati')}
                        className="w-5 h-5 rounded"
                      />
                      <div>
                        <p className="font-bold text-slate-700">Semilavorati</p>
                        <p className="text-xs text-slate-500">{productsByCategory.semilavorati.length} prodotti</p>
                      </div>
                    </label>
                    <button
                      onClick={() => setExpandedCategories(prev => ({ ...prev, semilavorati: !prev.semilavorati }))}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      {expandedCategories.semilavorati ? '▼' : '▶'}
                    </button>
                  </div>

                  {expandedCategories.semilavorati && (
                    <div className="ml-8 space-y-2 max-h-48 overflow-y-auto">
                      {productsByCategory.semilavorati.map(product => (
                        <label key={product.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={() => toggleProduct(product.id)}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm text-slate-700">{product.nome}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prodotti Finiti */}
                <div className="neumorphic-pressed rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={productsByCategory.prodotti_finiti.every(p => selectedProducts.includes(p.id))}
                        onChange={() => toggleCategory('prodotti_finiti')}
                        className="w-5 h-5 rounded"
                      />
                      <div>
                        <p className="font-bold text-slate-700">Prodotti Finiti</p>
                        <p className="text-xs text-slate-500">{productsByCategory.prodotti_finiti.length} prodotti</p>
                      </div>
                    </label>
                    <button
                      onClick={() => setExpandedCategories(prev => ({ ...prev, prodotti_finiti: !prev.prodotti_finiti }))}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      {expandedCategories.prodotti_finiti ? '▼' : '▶'}
                    </button>
                  </div>

                  {expandedCategories.prodotti_finiti && (
                    <div className="ml-8 space-y-2 max-h-48 overflow-y-auto">
                      {productsByCategory.prodotti_finiti.map(product => (
                        <label key={product.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={() => toggleProduct(product.id)}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm text-slate-700">{product.nome}</span>
                        </label>
                      ))}
                    </div>
                  )}
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
        )}
      </div>
    </ProtectedPage>
  );
}