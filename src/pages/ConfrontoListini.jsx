import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp, Package, DollarSign, Building2 } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";

export default function ConfrontoListini() {
  const [selectedNomeInterno, setSelectedNomeInterno] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: materiePrime = [], isLoading } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list(),
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
      return products.length > 1; // Show only if there are multiple suppliers
    })
    .sort(([a], [b]) => a.localeCompare(b));

  const getBestPrice = (products) => {
    return Math.min(...products.map(p => p.prezzo_unitario));
  };

  const getWorstPrice = (products) => {
    return Math.max(...products.map(p => p.prezzo_unitario));
  };

  const getSavingsPercentage = (products) => {
    const best = getBestPrice(products);
    const worst = getWorstPrice(products);
    return worst > 0 ? (((worst - best) / worst) * 100).toFixed(1) : 0;
  };

  // Calculate total potential savings
  const totalPotentialSavings = filteredGrouped.reduce((sum, [_, products]) => {
    const best = getBestPrice(products);
    const worst = getWorstPrice(products);
    return sum + (worst - best);
  }, 0);

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
      </div>

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
                        {products[0].categoria} • {products.length} fornitori
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-green-600 font-bold">
                        <TrendingDown className="w-5 h-5" />
                        <span>-{savingsPercent}%</span>
                      </div>
                      <p className="text-xs text-[#9b9b9b]">risparmio max</p>
                    </div>
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
                          const priceDiff = product.prezzo_unitario - bestPrice;
                          const isBest = index === 0;

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
                                <span className="text-sm text-[#6b6b6b]">
                                  {product.nome_prodotto}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="text-sm text-[#9b9b9b]">
                                  {product.marca || '-'}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <span className={`font-bold ${isBest ? 'text-green-600 text-lg' : 'text-[#6b6b6b]'}`}>
                                  €{product.prezzo_unitario?.toFixed(2)}
                                </span>
                                <span className="text-xs text-[#9b9b9b] ml-1">
                                  / {product.unita_misura}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                {isBest ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                    <TrendingDown className="w-3 h-3" />
                                    Miglior Prezzo
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                    <TrendingUp className="w-3 h-3" />
                                    +€{priceDiff.toFixed(2)}
                                  </span>
                                )}
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