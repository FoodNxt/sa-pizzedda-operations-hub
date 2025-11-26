import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp, Package, DollarSign, Building2, AlertTriangle, Store } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";

export default function ConfrontoListini() {
  const [selectedNomeInterno, setSelectedNomeInterno] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');

  const { data: materiePrime = [], isLoading } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list(),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  // Get unique nomi interni
  const nomiInterni = [...new Set(materiePrime.map(p => p.nome_interno).filter(Boolean))].sort();

  // Group products by nome_interno
  const productsGrouped = materiePrime
    .filter(p => p.nome_interno && p.prezzo_unitario)
    .reduce((acc, product) => {
      const key = product.nome_interno;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(product);
      return acc;
    }, {});

  // Filter and sort
  const filteredGrouped = Object.entries(productsGrouped)
    .filter(([nomeInterno, products]) => {
      if (selectedNomeInterno !== 'all' && nomeInterno !== selectedNomeInterno) return false;
      if (selectedCategory !== 'all' && !products.some(p => p.categoria === selectedCategory)) return false;
      return true; // Show all products
    })
    .sort(([a], [b]) => a.localeCompare(b));

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
        const unitWeight = ['kg', 'litri'].includes(product.unita_misura_interna)
          ? product.peso_unita_interna
          : product.peso_unita_interna / 1000;
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
    const prices = products.map(p => getNormalizedPrice(p)).filter(p => p !== null);
    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  const getWorstPrice = (products) => {
    const prices = products.map(p => getNormalizedPrice(p)).filter(p => p !== null);
    return prices.length > 0 ? Math.max(...prices) : 0;
  };

  const getSavingsPercentage = (products) => {
    const best = getBestPrice(products);
    const worst = getWorstPrice(products);
    return worst > 0 ? (((worst - best) / worst) * 100).toFixed(1) : 0;
  };

  // Calculate total potential savings - only for products currently in use that are not the best price
  const totalPotentialSavings = filteredGrouped.reduce((sum, [nomeInterno, products]) => {
    if (products.length <= 1) return sum;
    
    const bestPrice = getBestPrice(products);
    
    // Find products in use that are NOT the best price
    let savingsForThisProduct = 0;
    products.forEach(product => {
      const productPrice = getNormalizedPrice(product);
      if (!productPrice || productPrice === bestPrice) return;
      
      const inUsoPerStore = product.in_uso_per_store || {};
      const isInUse = Object.values(inUsoPerStore).some(v => v);
      
      if (isInUse && productPrice > bestPrice) {
        savingsForThisProduct = Math.max(savingsForThisProduct, productPrice - bestPrice);
      }
    });
    
    return sum + savingsForThisProduct;
  }, 0);

  // Find products in use that are not the best price (for specific store or all stores)
  const getProductsNotOptimal = () => {
    const issues = [];
    
    filteredGrouped.forEach(([nomeInterno, products]) => {
      const bestPriceProduct = products.reduce((best, p) => {
        const currentPrice = getNormalizedPrice(p);
        const bestPrice = getNormalizedPrice(best);
        if (!currentPrice) return best;
        if (!bestPrice) return p;
        return currentPrice < bestPrice ? p : best;
      }, products[0]);

      const bestPrice = getNormalizedPrice(bestPriceProduct);

      products.forEach(product => {
        const productPrice = getNormalizedPrice(product);
        if (!productPrice || !bestPrice) return;
        
        const inUsoPerStore = product.in_uso_per_store || {};
        
        if (selectedStore === 'all') {
          // Check all stores
          stores.forEach(store => {
            if (inUsoPerStore[store.id] && productPrice > bestPrice) {
              issues.push({
                store: store.name,
                storeId: store.id,
                nomeInterno,
                productInUse: product,
                bestProduct: bestPriceProduct,
                priceDiff: productPrice - bestPrice
              });
            }
          });
        } else {
          // Check specific store
          if (inUsoPerStore[selectedStore] && productPrice > bestPrice) {
            const store = stores.find(s => s.id === selectedStore);
            issues.push({
              store: store?.name || 'N/D',
              storeId: selectedStore,
              nomeInterno,
              productInUse: product,
              bestProduct: bestPriceProduct,
              priceDiff: productPrice - bestPrice
            });
          }
        }
      });
    });
    
    return issues;
  };

  const notOptimalProducts = getProductsNotOptimal();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Confronto Listini</h1>
        </div>
        <p className="text-[#9b9b9b]">Confronta prezzi dello stesso prodotto da fornitori diversi</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <NeumorphicCard className="px-4 py-2">
          <select
            value={selectedNomeInterno}
            onChange={(e) => setSelectedNomeInterno(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none"
          >
            <option value="all">Tutti i Prodotti</option>
            {nomiInterni.map(nome => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
        </NeumorphicCard>

        <NeumorphicCard className="px-4 py-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none"
          >
            <option value="all">Tutte le Categorie</option>
            <option value="ingredienti">Ingredienti</option>
            <option value="condimenti">Condimenti</option>
            <option value="verdure">Verdure</option>
            <option value="latticini">Latticini</option>
            <option value="dolci">Dolci</option>
            <option value="bevande">Bevande</option>
            <option value="pulizia">Pulizia</option>
            <option value="altro">Altro</option>
          </select>
        </NeumorphicCard>

        <NeumorphicCard className="px-4 py-2">
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none"
          >
            <option value="all">Tutti i Negozi</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </NeumorphicCard>
      </div>

      {/* Alert for non-optimal products */}
      {notOptimalProducts.length > 0 && (
        <NeumorphicCard className="p-6 bg-orange-50 border-2 border-orange-200">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-orange-800 mb-1">
                ⚠️ Prodotti in uso non ottimali ({notOptimalProducts.length})
              </h3>
              <p className="text-sm text-orange-700">
                {selectedStore === 'all' 
                  ? 'Ci sono prodotti in uso che non hanno il miglior prezzo disponibile'
                  : `Nel negozio selezionato ci sono prodotti in uso che non hanno il miglior prezzo`
                }
              </p>
            </div>
          </div>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {notOptimalProducts.map((issue, idx) => (
              <div key={idx} className="neumorphic-pressed p-3 rounded-lg bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-700 text-sm">{issue.nomeInterno}</p>
                    <p className="text-xs text-slate-500">
                      <Store className="w-3 h-3 inline mr-1" />
                      {issue.store}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      In uso: <strong>{issue.productInUse.nome_prodotto}</strong> ({issue.productInUse.fornitore || 'N/D'})
                    </p>
                    <p className="text-xs text-green-600">
                      Miglior prezzo: <strong>{issue.bestProduct.nome_prodotto}</strong> ({issue.bestProduct.fornitore || 'N/D'})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-red-600 font-bold text-sm">
                      +€{issue.priceDiff.toFixed(2)}/kg
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </NeumorphicCard>
      )}

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
            {[...new Set(materiePrime.map(p => p.fornitore).filter(Boolean))].length}
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
        
        {isLoading ? (
          <p className="text-center text-[#9b9b9b] py-8">Caricamento...</p>
        ) : filteredGrouped.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#9b9b9b]">Nessun prodotto con più fornitori trovato</p>
            <p className="text-xs text-[#9b9b9b] mt-2">
              Assicurati di usare lo stesso "Nome Interno" per prodotti equivalenti
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredGrouped.map(([nomeInterno, products]) => {
              const sortedByPrice = [...products].sort((a, b) => a.prezzo_unitario - b.prezzo_unitario);
              const bestPrice = sortedByPrice[0].prezzo_unitario;
              const savingsPercent = getSavingsPercentage(products);

              return (
                <div key={nomeInterno} className="neumorphic-pressed p-5 rounded-xl">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-[#6b6b6b]">{nomeInterno}</h3>
                      <p className="text-sm text-[#9b9b9b]">
                        {products[0].categoria} • {products.length} {products.length === 1 ? 'fornitore' : 'fornitori'}
                      </p>
                    </div>
                    {products.length > 1 && (
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-green-600 font-bold">
                          <TrendingDown className="w-5 h-5" />
                          <span>-{savingsPercent}%</span>
                        </div>
                        <p className="text-xs text-[#9b9b9b]">risparmio max</p>
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-300">
                          <th className="text-left p-3 text-[#9b9b9b] font-medium text-sm">Fornitore</th>
                          <th className="text-left p-3 text-[#9b9b9b] font-medium text-sm">Prodotto</th>
                          <th className="text-left p-3 text-[#9b9b9b] font-medium text-sm">Marca</th>
                          <th className="text-right p-3 text-[#9b9b9b] font-medium text-sm">Prezzo/Unità</th>
                          <th className="text-center p-3 text-[#9b9b9b] font-medium text-sm">Convenienza</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedByPrice.map((product, index) => {
                          const normalizedPrice = getNormalizedPrice(product);
                          const normalizedBest = getBestPrice(products);
                          const priceDiff = normalizedPrice && normalizedBest ? normalizedPrice - normalizedBest : 0;
                          const isBest = normalizedPrice === normalizedBest && products.length > 1;
                          const weight = normalizeToBaseUnit(product);

                          return (
                            <tr 
                              key={product.id} 
                              className={`border-b border-slate-200 ${isBest ? 'bg-green-50' : ''}`}
                            >
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
                                  {weight && (
                                    <div className="text-xs text-[#9b9b9b] mt-1">
                                      {weight >= 1 ? `${weight.toFixed(2)} kg/L` : `${(weight * 1000).toFixed(0)} g/ml`} per unità
                                    </div>
                                  )}
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
                                {normalizedPrice && product.unita_misura_peso && (
                                  <div className="text-xs font-bold text-blue-600 mt-1">
                                    €{normalizedPrice.toFixed(2)}/{getDisplayUnit(product.unita_misura_peso)}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  {products.length === 1 ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                                      Unico Fornitore
                                    </span>
                                  ) : isBest ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                      <TrendingDown className="w-3 h-3" />
                                      Miglior Prezzo
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                      <TrendingUp className="w-3 h-3" />
                                      +€{priceDiff.toFixed(2)}/{product.unita_misura_peso ? getDisplayUnit(product.unita_misura_peso) : 'kg'}
                                    </span>
                                  )}
                                  {/* Show if product is in use for any store */}
                                  {product.in_uso_per_store && Object.entries(product.in_uso_per_store).some(([storeId, inUso]) => {
                                    if (!inUso) return false;
                                    if (selectedStore !== 'all' && storeId !== selectedStore) return false;
                                    return true;
                                  }) && (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                                      isBest ? 'bg-green-50 text-green-600' : 'bg-orange-100 text-orange-700'
                                    }`}>
                                      ✓ In uso
                                      {!isBest && <AlertTriangle className="w-3 h-3" />}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </NeumorphicCard>
    </div>
  );
}