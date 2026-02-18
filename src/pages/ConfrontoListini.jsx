import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp, Package, DollarSign, Building2, AlertTriangle, Store, Download, X } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ResponsiveTable from "../components/ui/ResponsiveTable";

export default function ConfrontoListini() {
  const [selectedNomeInterno, setSelectedNomeInterno] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadCategories, setDownloadCategories] = useState([]);
  const [downloadFornitori, setDownloadFornitori] = useState([]);
  const [showMatchingModal, setShowMatchingModal] = useState(false);
  const [selectedProductForMatch, setSelectedProductForMatch] = useState(null);
  const [matchFormData, setMatchFormData] = useState({ ricetta_id: '' });
  const [showDetailsExpanded, setShowDetailsExpanded] = useState(false);

  const { data: materiePrime = [], isLoading } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list()
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: prodottiVenduti = [] } = useQuery({
    queryKey: ['prodotti-venduti'],
    queryFn: async () => {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const dateFilter = oneMonthAgo.toISOString().split('T')[0];
      return base44.entities.ProdottiVenduti.filter({ data_vendita: { $gte: dateFilter } });
    }
  });

  const { data: ricette = [] } = useQuery({
    queryKey: ['ricette'],
    queryFn: () => base44.entities.Ricetta.list()
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ['prodotto-venduto-mappings'],
    queryFn: () => base44.entities.ProdottoVendutoMapping.filter({ attivo: true })
  });

  // Get unique nomi interni
  const nomiInterni = [...new Set(materiePrime.map((p) => p.nome_interno).filter(Boolean))].sort();

  // Group products by nome_interno
  const productsGrouped = materiePrime.
  filter((p) => p.nome_interno && p.prezzo_unitario).
  reduce((acc, product) => {
    const key = product.nome_interno;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(product);
    return acc;
  }, {});

  // Filter and sort
  const filteredGrouped = Object.entries(productsGrouped).
  filter(([nomeInterno, products]) => {
    if (selectedNomeInterno !== 'all' && nomeInterno !== selectedNomeInterno) return false;
    if (selectedCategory !== 'all' && !products.some((p) => p.categoria === selectedCategory)) return false;
    return true; // Show all products
  }).
  sort(([a], [b]) => a.localeCompare(b));

  // Get the unit label for display (kg for kg/g, litri for litri/ml)
  const getDisplayUnit = (unitaMisuraPeso) => {
    if (['kg', 'g'].includes(unitaMisuraPeso)) return 'kg';
    if (['litri', 'ml'].includes(unitaMisuraPeso)) return 'litri';
    return unitaMisuraPeso;
  };

  // Normalize weight to base unit (kg/litri) - only for measurable units
  const normalizeToBaseUnit = (product) => {
    // Check if product has peso_dimensione_unita (measurable)
    if (!product.peso_dimensione_unita || !product.unita_misura_peso) {
      // If unita_per_confezione is set, use that
      if (product.unita_per_confezione && product.peso_unita_interna && product.unita_misura_interna) {
        const unitWeight = ['kg', 'litri'].includes(product.unita_misura_interna) ?
        product.peso_unita_interna :
        product.peso_unita_interna / 1000;
        return product.unita_per_confezione * unitWeight;
      }
      return null; // Not measurable
    }

    // Convert to kg/litri based on unita_misura_peso
    if (['kg', 'litri'].includes(product.unita_misura_peso)) {
      return product.peso_dimensione_unita;
    } else if (['g', 'ml'].includes(product.unita_misura_peso)) {
      return product.peso_dimensione_unita / 1000;
    }

    return null;
  };

  const getNormalizedPrice = (product) => {
    const weight = normalizeToBaseUnit(product);
    if (!weight || !product.prezzo_unitario) return null;
    return product.prezzo_unitario / weight;
  };

  const getBestPrice = (products) => {
    const prices = products.map((p) => getNormalizedPrice(p)).filter((p) => p !== null);
    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  const getWorstPrice = (products) => {
    const prices = products.map((p) => getNormalizedPrice(p)).filter((p) => p !== null);
    return prices.length > 0 ? Math.max(...prices) : 0;
  };

  const getSavingsPercentage = (products) => {
    const best = getBestPrice(products);
    const worst = getWorstPrice(products);
    return worst > 0 ? ((worst - best) / worst * 100).toFixed(1) : 0;
  };

  // Calculate total potential savings - only for products currently in use that are not the best price
  const totalPotentialSavings = filteredGrouped.reduce((sum, [nomeInterno, products]) => {
    if (products.length <= 1) return sum;

    const bestPrice = getBestPrice(products);

    // Find products in use that are NOT the best price
    let savingsForThisProduct = 0;
    products.forEach((product) => {
      const productPrice = getNormalizedPrice(product);
      if (!productPrice || productPrice === bestPrice) return;

      const inUsoPerStore = product.in_uso_per_store || {};
      const isInUse = Object.values(inUsoPerStore).some((v) => v);

      if (isInUse && productPrice > bestPrice) {
        savingsForThisProduct = Math.max(savingsForThisProduct, productPrice - bestPrice);
      }
    });

    return sum + savingsForThisProduct;
  }, 0);

  // Find products in use that are not the best price - one entry per product max
  const getProductsNotOptimal = () => {
    const issuesMap = {};

    filteredGrouped.forEach(([nomeInterno, products]) => {
      // Se già aggiunto, skip
      if (issuesMap[nomeInterno]) return;

      const bestPriceProduct = products.reduce((best, p) => {
        const currentPrice = getNormalizedPrice(p);
        const bestPrice = getNormalizedPrice(best);
        if (!currentPrice) return best;
        if (!bestPrice) return p;
        return currentPrice < bestPrice ? p : best;
      }, products[0]);

      const bestPrice = getNormalizedPrice(bestPriceProduct);

      // Trova il prodotto in uso (quello con in_uso_per_store non vuoto)
      let productInUse = null;
      let storeIds = [];

      products.forEach((product) => {
        const productPrice = getNormalizedPrice(product);
        if (!productPrice || !bestPrice || productPrice === bestPrice) return; // Skip se non è un problema

        const inUsoPerStore = product.in_uso_per_store || {};

        if (selectedStore === 'all') {
          // Trova tutti gli store dove è in uso questo prodotto
          stores.forEach((store) => {
            if (inUsoPerStore[store.id]) {
              if (!productInUse) productInUse = product;
              if (!storeIds.includes(store.id)) {
                storeIds.push(store.id);
              }
            }
          });
        } else {
          // Check specific store
          if (inUsoPerStore[selectedStore]) {
            productInUse = product;
            storeIds = [selectedStore];
          }
        }
      });

      // Se trovato un prodotto in uso con problema, aggiungilo una sola volta
      if (productInUse && storeIds.length > 0) {
        const productPrice = getNormalizedPrice(productInUse);
        issuesMap[nomeInterno] = {
          nomeInterno,
          productInUse,
          bestProduct: bestPriceProduct,
          priceDiff: productPrice - bestPrice,
          storeIds,
          storeCount: storeIds.length
        };
      }
    });

    return Object.values(issuesMap);
  };

  const notOptimalProducts = getProductsNotOptimal();

  // Get all unique categories from MateriePrime enum
  const allCategories = [
    "Angolo di Sardegna",
    "Bevande", 
    "Consumabili",
    "Dolci",
    "Ingredienti base",
    "Ingredienti pronti",
    "Ortofrutta",
    "Packaging",
    "Pulizia"
  ];

  const handleDownloadListino = () => {
    const prodottiDaEsportare = materiePrime.filter(p => {
      if (!p.attivo) return false;
      if (downloadCategories.length > 0 && !downloadCategories.includes(p.categoria)) return false;
      if (downloadFornitori.length > 0 && !downloadFornitori.includes(p.fornitore)) return false;
      return true;
    });

    // Create CSV content
    const headers = ['Nome Prodotto', 'Nome Interno', 'Categoria', 'Fornitore', 'Marca', 'Prezzo Unitario (€)', 'Unità di Misura', 'Peso/Dimensione', 'Unità Misura Peso'];
    const rows = prodottiDaEsportare.map(p => [
      p.nome_prodotto || '',
      p.nome_interno || '',
      p.categoria || '',
      p.fornitore || '',
      p.marca || '',
      p.prezzo_unitario?.toFixed(2) || '0.00',
      p.unita_misura || '',
      p.peso_dimensione_unita || '',
      p.unita_misura_peso || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filters = [];
    if (downloadCategories.length > 0) filters.push(downloadCategories.join('_'));
    if (downloadFornitori.length > 0) filters.push(downloadFornitori.join('_'));
    link.download = `listino_${filters.length > 0 ? filters.join('_') : 'completo'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setShowDownloadModal(false);
    setDownloadCategories([]);
    setDownloadFornitori([]);
  };

  const toggleCategory = (category) => {
    setDownloadCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const toggleFornitore = (fornitore) => {
    setDownloadFornitori(prev => 
      prev.includes(fornitore) ? prev.filter(f => f !== fornitore) : [...prev, fornitore]
    );
  };

  const allFornitori = [...new Set(materiePrime.map(p => p.fornitore).filter(Boolean))].sort();

  // Calcola confezioni e unità vendute nell'ultimo mese per nome_interno
  const venduteMensili = React.useMemo(() => {
    const map = {};
    
    // Filtra solo ultimi 30 giorni
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const prodottiUltimi30Giorni = prodottiVenduti.filter(v => {
      const dataStr = v.data_vendita?.split('T')[0] || v.data_vendita;
      return dataStr >= thirtyDaysAgoStr;
    });
    
    prodottiUltimi30Giorni.forEach(vendita => {
      // Cerca prima nel mapping manuale
      const mapping = mappings.find(m => m.flavor_prodotto_venduto === vendita.flavor);
      let materiaPrimaDiretta = null;
      
      if (mapping) {
        // Usa il mapping configurato
        materiaPrimaDiretta = materiePrime.find(mp => mp.id === mapping.materia_prima_id);
      } else {
        // Fallback: match per nome
        materiaPrimaDiretta = materiePrime.find(mp => mp.nome_prodotto === vendita.flavor);
      }
      
      // Caso 1: Prodotto venduto direttamente (es. Ichnusa, Acqua)
      if (materiaPrimaDiretta?.nome_interno) {
        const nomeInterno = materiaPrimaDiretta.nome_interno;
        // Per prodotti diretti, la quantità venduta è in unità (non pizze)
        // total_pizzas_sold contiene il numero di unità vendute per i prodotti diretti
        const unitaVendute = vendita.total_pizzas_sold || 0;
        
        if (!map[nomeInterno]) {
          map[nomeInterno] = { confezioni: 0, unita: 0 };
        }
        
        // Confezioni: unità / unita_per_confezione
        if (materiaPrimaDiretta.unita_per_confezione && materiaPrimaDiretta.unita_per_confezione > 0) {
          const confezioniVendute = unitaVendute / materiaPrimaDiretta.unita_per_confezione;
          map[nomeInterno].confezioni += confezioniVendute;
        }
        map[nomeInterno].unita += unitaVendute;
        return;
      }

      // Caso 2: Prodotto con ricetta
      const ricetta = ricette.find(r => r.nome_prodotto === vendita.flavor);
      if (!ricetta) return;

      ricetta.ingredienti?.forEach(ingrediente => {
        const materiaPrima = materiePrime.find(mp => mp.id === ingrediente.materia_prima_id);
        if (!materiaPrima?.nome_interno) return;

        const nomeInterno = materiaPrima.nome_interno;
        const quantitaPerProdotto = ingrediente.quantita || 0;
        const quantitaVenduta = vendita.total_pizzas_sold || 0;
        const quantitaTotale = quantitaPerProdotto * quantitaVenduta;

        // Converti a kg/litri base
        let quantitaInKgLitri = quantitaTotale;
        if (ingrediente.unita_misura === 'g' || ingrediente.unita_misura === 'ml') {
          quantitaInKgLitri = quantitaTotale / 1000;
        }

        // Converti in confezioni
        const kgPerConfezione = normalizeToBaseUnit(materiaPrima);
        if (kgPerConfezione) {
          const confezioniNecessarie = quantitaInKgLitri / kgPerConfezione;
          
          // Calcola unità (se disponibile unita_per_confezione)
          const unitaTotali = materiaPrima.unita_per_confezione ? 
            confezioniNecessarie * materiaPrima.unita_per_confezione : 0;

          if (!map[nomeInterno]) {
            map[nomeInterno] = { confezioni: 0, unita: 0 };
          }
          map[nomeInterno].confezioni += confezioniNecessarie;
          map[nomeInterno].unita += unitaTotali;
        }
      });
    });

    return map;
  }, [prodottiVenduti, ricette, materiePrime]);

  // Calcola risparmio mensile potenziale
  const calcolaRisparmioMensile = (nomeInterno, products) => {
    const venduteDati = venduteMensili[nomeInterno];
    if (!venduteDati || venduteDati.confezioni === 0) return 0;
    const confezioniMensili = venduteDati.confezioni;

    // Trova il prodotto in uso
    const productInUse = products.find(p => {
      const inUsoPerStore = p.in_uso_per_store || {};
      if (selectedStore === 'all') {
        return Object.values(inUsoPerStore).some(v => v);
      } else {
        return inUsoPerStore[selectedStore];
      }
    });

    if (!productInUse) return 0;

    // Trova il prodotto col miglior prezzo
    const bestProduct = products.reduce((best, p) => {
      const currentPrice = p.prezzo_unitario;
      const bestPrice = best.prezzo_unitario;
      if (!currentPrice) return best;
      if (!bestPrice) return p;
      return currentPrice < bestPrice ? p : best;
    }, products[0]);

    const priceDiff = productInUse.prezzo_unitario - bestProduct.prezzo_unitario;
    if (priceDiff <= 0) return 0;

    return priceDiff * confezioniMensili;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <DollarSign className="w-10 h-10 text-[#8b7355]" />
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#000000' }}>Confronto Listini</h1>
              <p className="text-sm" style={{ color: '#000000' }}>Confronta prezzi dello stesso prodotto da fornitori diversi</p>
            </div>
          </div>
          <button
            onClick={() => setShowDownloadModal(true)}
            className="neumorphic-flat px-4 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 text-slate-700 font-medium">
            <Download className="w-5 h-5" />
            <span className="hidden md:inline">Scarica Listino</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <NeumorphicCard className="px-4 py-2">
          <select
            value={selectedNomeInterno}
            onChange={(e) => setSelectedNomeInterno(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none">

            <option value="all">Tutti i Prodotti</option>
            {nomiInterni.map((nome) =>
            <option key={nome} value={nome}>{nome}</option>
            )}
          </select>
        </NeumorphicCard>

        <NeumorphicCard className="px-4 py-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none">

            <option value="all">Tutte le Categorie</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </NeumorphicCard>

        <NeumorphicCard className="px-4 py-2">
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none">

            <option value="all">Tutti i Negozi</option>
            {stores.map((store) =>
            <option key={store.id} value={store.id}>{store.name}</option>
            )}
          </select>
        </NeumorphicCard>
      </div>

      {/* Alert for non-optimal products */}
      {notOptimalProducts.length > 0 &&
      <NeumorphicCard className="p-6 bg-orange-50 border-2 border-orange-200">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-orange-800 mb-1">
                ⚠️ Prodotti in uso non ottimali ({notOptimalProducts.length})
              </h3>
              <p className="text-sm text-orange-700 mb-2">
                {selectedStore === 'all' ?
              'Ci sono prodotti in uso che non hanno il miglior prezzo disponibile' :
              `Nel negozio selezionato ci sono prodotti in uso che non hanno il miglior prezzo`
              }
              </p>
              {/* Risparmio mensile totale */}
              {(() => {
                const risparmioTotale = notOptimalProducts.reduce((sum, issue) => {
                  const venduteDati = venduteMensili[issue.nomeInterno];
                  if (!venduteDati) return sum;
                  const risparmioPerConfezione = issue.productInUse.prezzo_unitario - issue.bestProduct.prezzo_unitario;
                  return sum + (risparmioPerConfezione * venduteDati.confezioni);
                }, 0);
                
                if (risparmioTotale > 0) {
                  return (
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white font-bold">
                      💰 Risparmio mensile totale: €{risparmioTotale.toFixed(2)}
                    </div>
                  );
                }
              })()}
            </div>
          </div>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {notOptimalProducts.map((issue, idx) =>
          <div key={idx} className="neumorphic-pressed p-3 rounded-lg bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-bold text-slate-700 text-sm">{issue.nomeInterno}</p>
                    <p className="text-xs text-slate-500 mb-2">
                      <Store className="w-3 h-3 inline mr-1" />
                      {selectedStore === 'all' ? `${issue.storeCount} negozi` : stores.find(s => s.id === selectedStore)?.name}
                    </p>
                    <p className="text-xs text-orange-600">
                      In uso: <strong>{issue.productInUse.nome_prodotto}</strong> ({issue.productInUse.fornitore || 'N/D'})
                    </p>
                    <p className="text-xs text-green-600">
                      Miglior prezzo: <strong>{issue.bestProduct.nome_prodotto}</strong> ({issue.bestProduct.fornitore || 'N/D'})
                    </p>
                    {(() => {
                      const venduteDati = venduteMensili[issue.nomeInterno];
                      if (venduteDati && venduteDati.confezioni > 0) {
                        const risparmioPerConfezione = issue.productInUse.prezzo_unitario - issue.bestProduct.prezzo_unitario;
                        const risparmioMensile = risparmioPerConfezione * venduteDati.confezioni;
                        return (
                          <p className="text-xs text-blue-600 mt-2">
                            📊 {venduteDati.confezioni.toFixed(1)} confezioni ({venduteDati.unita > 0 ? `${Math.round(venduteDati.unita)} unità` : ''}) → <strong>€{risparmioMensile.toFixed(2)}/mese</strong>
                          </p>
                        );
                      }
                    })()}
                  </div>
                  <div className="text-right">
                    <span className="text-red-600 font-bold text-sm">
                      +€{issue.priceDiff.toFixed(2)}/kg
                    </span>
                  </div>
                </div>
              </div>
          )}
          </div>
        </NeumorphicCard>
      }

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Package className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{filteredGrouped.length}</h3>
          <p className="text-sm text-[#9b9b9b]">Prodotti Confrontati</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-blue-600 mb-1">
            {[...new Set(materiePrime.map((p) => p.fornitore).filter(Boolean))].length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Fornitori Attivi</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <TrendingDown className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">€{totalPotentialSavings.toFixed(2)}</h3>
          <p className="text-sm text-[#9b9b9b]">Risparmio Potenziale</p>
        </NeumorphicCard>
      </div>

      {/* Comparison Table */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Confronto Prezzi</h2>
        
        {isLoading ?
        <p className="text-center text-[#9b9b9b] py-8">Caricamento...</p> :
        filteredGrouped.length === 0 ?
        <div className="text-center py-8">
            <p className="text-[#9b9b9b]">Nessun prodotto con più fornitori trovato</p>
            <p className="text-xs text-[#9b9b9b] mt-2">
              Assicurati di usare lo stesso "Nome Interno" per prodotti equivalenti
            </p>
          </div> :

        <div className="space-y-6">
            {filteredGrouped.map(([nomeInterno, products]) => {
            const sortedByPrice = [...products].sort((a, b) => a.prezzo_unitario - b.prezzo_unitario);
            const bestPrice = sortedByPrice[0].prezzo_unitario;
            const savingsPercent = getSavingsPercentage(products);

            const risparmioMensile = calcolaRisparmioMensile(nomeInterno, products);
            const venduteDati = venduteMensili[nomeInterno];

            return (
              <div key={nomeInterno} className="neumorphic-pressed p-5 rounded-xl">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-[#6b6b6b]">{nomeInterno}</h3>
                      <p className="text-sm text-[#9b9b9b]">
                        {products[0].categoria} • {products.length} {products.length === 1 ? 'fornitore' : 'fornitori'}
                      </p>
                      {venduteDati && venduteDati.confezioni > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                          <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                            📊 {venduteDati.confezioni.toFixed(1)} confezioni ({venduteDati.unita > 0 ? `${Math.round(venduteDati.unita)} unità` : 'ultimo mese'})
                          </span>
                          {risparmioMensile > 0 && (
                            <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 font-bold">
                              💰 Risparmio mensile: €{risparmioMensile.toFixed(2)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {products.length > 1 &&
                  <div className="text-right">
                        <div className="flex items-center gap-2 text-green-600 font-bold">
                          <TrendingDown className="w-5 h-5" />
                          <span>-{savingsPercent}%</span>
                        </div>
                        <p className="text-xs text-[#9b9b9b]">risparmio max</p>
                      </div>
                  }
                  </div>

                  <ResponsiveTable
                    headers={[
                      { label: 'Fornitore', align: 'left' },
                      { label: 'Prodotto', align: 'left' },
                      { label: 'Marca', align: 'left' },
                      { label: 'Prezzo/Unità', align: 'right' },
                      { label: 'Convenienza', align: 'center' }
                    ]}
                    data={sortedByPrice}
                    renderRow={(product, index) => {
                      const normalizedPrice = getNormalizedPrice(product);
                      const normalizedBest = getBestPrice(products);
                      const priceDiff = normalizedPrice && normalizedBest ? normalizedPrice - normalizedBest : 0;
                      const isBest = normalizedPrice === normalizedBest && products.length > 1;
                      const weight = normalizeToBaseUnit(product);

                      return (
                        <tr
                          key={product.id}
                          className={`border-b border-slate-200 ${isBest ? 'bg-green-50' : ''}`}>
                            <td className="p-3">
                              <span className="font-medium text-[#6b6b6b]">
                                {product.fornitore || 'N/D'}
                              </span>
                            </td>
                            <td className="p-3">
                              <div>
                                <span className="text-sm text-[#6b6b6b]">
                                  {product.nome_prodotto}
                                </span>
                                {weight &&
                              <div className="text-xs text-[#9b9b9b] mt-1">
                                    {weight >= 1 ? `${weight.toFixed(2)} kg/L` : `${(weight * 1000).toFixed(0)} g/ml`} per unità
                                  </div>
                              }
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="text-sm text-[#9b9b9b]">
                                {product.marca || '-'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div>
                                <span className={`font-bold ${isBest ? 'text-green-600 text-lg' : 'text-[#6b6b6b]'}`}>
                                  €{product.prezzo_unitario?.toFixed(2)}
                                </span>
                                <span className="text-xs text-[#9b9b9b] ml-1">
                                  / {product.unita_misura}
                                </span>
                              </div>
                              {normalizedPrice && product.unita_misura_peso &&
                            <div className="text-xs font-bold text-blue-600 mt-1">
                                  €{normalizedPrice.toFixed(2)}/{getDisplayUnit(product.unita_misura_peso)}
                                </div>
                            }
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                {products.length === 1 ?
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                                    Unico Fornitore
                                  </span> :
                              isBest ?
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                    <TrendingDown className="w-3 h-3" />
                                    Miglior Prezzo
                                  </span> :

                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                    <TrendingUp className="w-3 h-3" />
                                    +€{priceDiff.toFixed(2)}/{product.unita_misura_peso ? getDisplayUnit(product.unita_misura_peso) : 'kg'}
                                  </span>
                              }
                                {product.in_uso_per_store && Object.entries(product.in_uso_per_store).some(([storeId, inUso]) => {
                                if (!inUso) return false;
                                if (selectedStore !== 'all' && storeId !== selectedStore) return false;
                                return true;
                              }) &&
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                              isBest ? 'bg-green-50 text-green-600' : 'bg-orange-100 text-orange-700'}`
                              }>
                                    ✓ In uso
                                    {!isBest && <AlertTriangle className="w-3 h-3" />}
                                  </span>
                              }
                              </div>
                            </td>
                          </tr>
                      );
                    }}
                    renderMobileCard={(product, index) => {
                      const normalizedPrice = getNormalizedPrice(product);
                      const normalizedBest = getBestPrice(products);
                      const priceDiff = normalizedPrice && normalizedBest ? normalizedPrice - normalizedBest : 0;
                      const isBest = normalizedPrice === normalizedBest && products.length > 1;
                      const weight = normalizeToBaseUnit(product);
                      const inUso = product.in_uso_per_store && Object.entries(product.in_uso_per_store).some(([storeId, inUso]) => {
                        if (!inUso) return false;
                        if (selectedStore !== 'all' && storeId !== selectedStore) return false;
                        return true;
                      });

                      return (
                        <div key={product.id} className={`neumorphic-pressed p-4 rounded-xl ${isBest ? 'border-2 border-green-300' : ''}`}>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{product.nome_prodotto}</p>
                              <p className="text-xs text-slate-500">{product.fornitore || 'N/D'}</p>
                              {product.marca && <p className="text-xs text-slate-400">{product.marca}</p>}
                            </div>
                            {isBest ? (
                              <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center gap-1">
                                <TrendingDown className="w-3 h-3" />
                                Migliore
                              </span>
                            ) : priceDiff > 0 && (
                              <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                +€{priceDiff.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg mb-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-500">Prezzo</span>
                              <div className="text-right">
                                <p className={`font-bold ${isBest ? 'text-green-600 text-lg' : 'text-slate-700'}`}>
                                  €{product.prezzo_unitario?.toFixed(2)}
                                </p>
                                <p className="text-xs text-slate-500">/ {product.unita_misura}</p>
                              </div>
                            </div>
                            {normalizedPrice && product.unita_misura_peso && (
                              <div className="mt-2 pt-2 border-t border-slate-200">
                                <p className="text-xs font-bold text-blue-600 text-right">
                                  €{normalizedPrice.toFixed(2)}/{getDisplayUnit(product.unita_misura_peso)}
                                </p>
                              </div>
                            )}
                          </div>
                          {weight && (
                            <p className="text-xs text-slate-500">
                              {weight >= 1 ? `${weight.toFixed(2)} kg/L` : `${(weight * 1000).toFixed(0)} g/ml`} per unità
                            </p>
                          )}
                          {inUso && (
                            <div className={`mt-2 px-2 py-1 rounded-lg text-xs font-bold text-center ${
                              isBest ? 'bg-green-50 text-green-600' : 'bg-orange-100 text-orange-700'
                            }`}>
                              ✓ In uso {!isBest && '⚠️'}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                </div>);

          })}
          </div>
        }
      </NeumorphicCard>

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Scarica Listino</h2>
              <button onClick={() => {setShowDownloadModal(false); setDownloadCategories([]); setDownloadFornitori([]);}} className="nav-button p-2 rounded-lg">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="space-y-4 mb-4 max-h-[60vh] overflow-y-auto">
              {/* Categorie */}
              <div>
                <p className="text-sm font-bold text-slate-700 mb-3">Categorie:</p>
                
                <div className="space-y-2">
                  <button
                    onClick={() => setDownloadCategories(downloadCategories.length === allCategories.length ? [] : allCategories)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors">
                    {downloadCategories.length === allCategories.length ? '✓ Deseleziona Tutto' : '☐ Seleziona Tutto'}
                  </button>
                  {allCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                        downloadCategories.includes(cat) 
                          ? 'bg-blue-100 text-blue-700 font-medium' 
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}>
                      {downloadCategories.includes(cat) ? '✓' : '☐'} {cat}
                    </button>
                  ))}
                </div>

                {downloadCategories.length === 0 && (
                  <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded-lg">
                    Nessuna categoria = tutte
                  </p>
                )}
              </div>

              {/* Fornitori */}
              <div>
                <p className="text-sm font-bold text-slate-700 mb-3">Fornitori:</p>
                
                <div className="space-y-2">
                  <button
                    onClick={() => setDownloadFornitori(downloadFornitori.length === allFornitori.length ? [] : allFornitori)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-green-600 hover:bg-green-50 transition-colors">
                    {downloadFornitori.length === allFornitori.length ? '✓ Deseleziona Tutto' : '☐ Seleziona Tutto'}
                  </button>
                  {allFornitori.map(fornitore => (
                    <button
                      key={fornitore}
                      onClick={() => toggleFornitore(fornitore)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                        downloadFornitori.includes(fornitore) 
                          ? 'bg-green-100 text-green-700 font-medium' 
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}>
                      {downloadFornitori.includes(fornitore) ? '✓' : '☐'} {fornitore}
                    </button>
                  ))}
                </div>

                {downloadFornitori.length === 0 && (
                  <p className="text-xs text-green-600 mt-2 bg-green-50 p-2 rounded-lg">
                    Nessun fornitore = tutti
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {setShowDownloadModal(false); setDownloadCategories([]); setDownloadFornitori([]);}}
                className="flex-1 neumorphic-flat px-4 py-3 rounded-xl text-slate-700 font-medium hover:bg-slate-100 transition-colors">
                Annulla
              </button>
              <button
                onClick={handleDownloadListino}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2">
                <Download className="w-5 h-5" />
                Scarica CSV
              </button>
            </div>
          </NeumorphicCard>
        </div>
      )}
    </div>);

}