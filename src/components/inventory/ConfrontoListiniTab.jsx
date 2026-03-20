import React, { useState } from "react";
import { Package, AlertTriangle, Building2, TrendingDown, TrendingUp, Store, Download, X } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";

export default function ConfrontoListiniTab({ products, stores, selectedNomeInterno, setSelectedNomeInterno, selectedCategoryListini, setSelectedCategoryListini, selectedStoreListini, setSelectedStoreListini }) {
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadCategories, setDownloadCategories] = useState([]);
  const [downloadFornitori, setDownloadFornitori] = useState([]);

  const allCategories = ["Angolo di Sardegna", "Bevande", "Consumabili", "Dolci", "Ingredienti base", "Ingredienti pronti", "Ortofrutta", "Packaging", "Pulizia"];

  const productsGrouped = products
    .filter((p) => p.nome_interno && p.prezzo_unitario)
    .reduce((acc, product) => {
      const key = product.nome_interno;
      if (!acc[key]) acc[key] = [];
      acc[key].push(product);
      return acc;
    }, {});

  const filteredGrouped = Object.entries(productsGrouped)
    .filter(([nomeInterno, prods]) => {
      if (selectedNomeInterno !== 'all' && nomeInterno !== selectedNomeInterno) return false;
      if (selectedCategoryListini !== 'all' && !prods.some((p) => p.categoria === selectedCategoryListini)) return false;
      return true;
    })
    .sort(([a], [b]) => a.localeCompare(b));

  const getDisplayUnit = (unitaMisuraPeso) => {
    if (['kg', 'g'].includes(unitaMisuraPeso)) return 'kg';
    if (['litri', 'ml'].includes(unitaMisuraPeso)) return 'litri';
    return unitaMisuraPeso;
  };

  const normalizeToBaseUnit = (product) => {
    if (!product.peso_dimensione_unita || !product.unita_misura_peso) {
      if (product.unita_per_confezione && product.peso_unita_interna && product.unita_misura_interna) {
        const unitWeight = ['kg', 'litri'].includes(product.unita_misura_interna) ? product.peso_unita_interna : product.peso_unita_interna / 1000;
        return product.unita_per_confezione * unitWeight;
      }
      return null;
    }
    if (['kg', 'litri'].includes(product.unita_misura_peso)) return product.peso_dimensione_unita;
    if (['g', 'ml'].includes(product.unita_misura_peso)) return product.peso_dimensione_unita / 1000;
    return null;
  };

  const getNormalizedPrice = (product) => {
    const weight = normalizeToBaseUnit(product);
    if (!weight || !product.prezzo_unitario) return null;
    return product.prezzo_unitario / weight;
  };

  const getBestPrice = (prods) => {
    const prices = prods.map((p) => getNormalizedPrice(p)).filter((p) => p !== null);
    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  const getWorstPrice = (prods) => {
    const prices = prods.map((p) => getNormalizedPrice(p)).filter((p) => p !== null);
    return prices.length > 0 ? Math.max(...prices) : 0;
  };

  const getSavingsPercentage = (prods) => {
    const best = getBestPrice(prods);
    const worst = getWorstPrice(prods);
    return worst > 0 ? ((worst - best) / worst * 100).toFixed(1) : 0;
  };

  const getProductsNotOptimal = () => {
    const issues = [];
    filteredGrouped.forEach(([nomeInterno, prods]) => {
      const bestPriceProduct = prods.reduce((best, p) => {
        const currentPrice = getNormalizedPrice(p);
        const bestPrice = getNormalizedPrice(best);
        if (!currentPrice) return best;
        if (!bestPrice) return p;
        return currentPrice < bestPrice ? p : best;
      }, prods[0]);
      const bestPrice = getNormalizedPrice(bestPriceProduct);
      prods.forEach((product) => {
        const productPrice = getNormalizedPrice(product);
        if (!productPrice || !bestPrice) return;
        const inUsoPerStore = product.in_uso_per_store || {};
        if (selectedStoreListini === 'all') {
          stores.forEach((store) => {
            if (inUsoPerStore[store.id] && productPrice > bestPrice) {
              issues.push({ store: store.name, storeId: store.id, nomeInterno, productInUse: product, bestProduct: bestPriceProduct, priceDiff: productPrice - bestPrice });
            }
          });
        } else {
          if (inUsoPerStore[selectedStoreListini] && productPrice > bestPrice) {
            const store = stores.find((s) => s.id === selectedStoreListini);
            issues.push({ store: store?.name || 'N/D', storeId: selectedStoreListini, nomeInterno, productInUse: product, bestProduct: bestPriceProduct, priceDiff: productPrice - bestPrice });
          }
        }
      });
    });
    return issues;
  };

  const notOptimalProducts = getProductsNotOptimal();

  const totalPotentialSavings = filteredGrouped.reduce((sum, [, prods]) => {
    if (prods.length <= 1) return sum;
    const bestPrice = getBestPrice(prods);
    let savingsForThisProduct = 0;
    prods.forEach((product) => {
      const productPrice = getNormalizedPrice(product);
      if (!productPrice || productPrice === bestPrice) return;
      const inUsoPerStore = product.in_uso_per_store || {};
      const isInUse = Object.values(inUsoPerStore).some((v) => v);
      if (isInUse && productPrice > bestPrice) savingsForThisProduct = Math.max(savingsForThisProduct, productPrice - bestPrice);
    });
    return sum + savingsForThisProduct;
  }, 0);

  const handleDownload = () => {
    const prodottiDaEsportare = products.filter(p => {
      if (!p.attivo) return false;
      if (downloadCategories.length > 0 && !downloadCategories.includes(p.categoria)) return false;
      if (downloadFornitori.length > 0 && !downloadFornitori.includes(p.fornitore)) return false;
      return true;
    });
    const headers = ['Nome Prodotto', 'Nome Interno', 'Categoria', 'Fornitore', 'Marca', 'Prezzo Unitario (€)', 'Unità di Misura', 'Peso/Dimensione', 'Unità Misura Peso'];
    const rows = prodottiDaEsportare.map(p => [p.nome_prodotto || '', p.nome_interno || '', p.categoria || '', p.fornitore || '', p.marca || '', p.prezzo_unitario?.toFixed(2) || '0.00', p.unita_misura || '', p.peso_dimensione_unita || '', p.unita_misura_peso || '']);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <NeumorphicCard className="px-4 py-2">
          <select value={selectedNomeInterno} onChange={(e) => setSelectedNomeInterno(e.target.value)} className="bg-transparent text-slate-600 outline-none">
            <option value="all">Tutti i Prodotti</option>
            {[...new Set(products.map((p) => p.nome_interno).filter(Boolean))].sort().map((nome) => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
        </NeumorphicCard>
        <NeumorphicCard className="px-4 py-2">
          <select value={selectedCategoryListini} onChange={(e) => setSelectedCategoryListini(e.target.value)} className="bg-transparent text-slate-600 outline-none">
            <option value="all">Tutte le Categorie</option>
            {allCategories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
          </select>
        </NeumorphicCard>
        <NeumorphicCard className="px-4 py-2">
          <select value={selectedStoreListini} onChange={(e) => setSelectedStoreListini(e.target.value)} className="bg-transparent text-slate-600 outline-none">
            <option value="all">Tutti i Negozi</option>
            {stores.map((store) => (<option key={store.id} value={store.id}>{store.name}</option>))}
          </select>
        </NeumorphicCard>
        <button onClick={() => setShowDownloadModal(true)} className="neumorphic-flat px-4 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 text-slate-700 font-medium">
          <Download className="w-5 h-5" />
          <span className="hidden md:inline">Scarica Listino</span>
        </button>
      </div>

      {notOptimalProducts.length > 0 && (
        <NeumorphicCard className="p-6 bg-orange-50 border-2 border-orange-200">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-orange-800 mb-1">⚠️ Prodotti in uso non ottimali ({notOptimalProducts.length})</h3>
              <p className="text-sm text-orange-700">
                {selectedStoreListini === 'all' ? 'Ci sono prodotti in uso che non hanno il miglior prezzo disponibile' : 'Nel negozio selezionato ci sono prodotti in uso che non hanno il miglior prezzo'}
              </p>
            </div>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {notOptimalProducts.map((issue, idx) => (
              <div key={idx} className="neumorphic-pressed p-3 rounded-lg bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-700 text-sm">{issue.nomeInterno}</p>
                    <p className="text-xs text-slate-500"><Store className="w-3 h-3 inline mr-1" />{issue.store}</p>
                    <p className="text-xs text-orange-600 mt-1">In uso: <strong>{issue.productInUse.nome_prodotto}</strong> ({issue.productInUse.fornitore || 'N/D'})</p>
                    <p className="text-xs text-green-600">Miglior prezzo: <strong>{issue.bestProduct.nome_prodotto}</strong> ({issue.bestProduct.fornitore || 'N/D'})</p>
                  </div>
                  <span className="text-red-600 font-bold text-sm">+€{issue.priceDiff.toFixed(2)}/kg</span>
                </div>
              </div>
            ))}
          </div>
        </NeumorphicCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"><Package className="w-8 h-8 text-blue-600" /></div>
          <h3 className="text-3xl font-bold text-slate-700 mb-1">{filteredGrouped.length}</h3>
          <p className="text-sm text-slate-500">Prodotti Confrontati</p>
        </NeumorphicCard>
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"><Building2 className="w-8 h-8 text-blue-600" /></div>
          <h3 className="text-3xl font-bold text-blue-600 mb-1">{[...new Set(products.map((p) => p.fornitore).filter(Boolean))].length}</h3>
          <p className="text-sm text-slate-500">Fornitori Attivi</p>
        </NeumorphicCard>
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"><TrendingDown className="w-8 h-8 text-green-600" /></div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">€{totalPotentialSavings.toFixed(2)}</h3>
          <p className="text-sm text-slate-500">Risparmio Potenziale</p>
        </NeumorphicCard>
      </div>

      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Confronto Prezzi</h2>
        {filteredGrouped.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">Nessun prodotto con più fornitori trovato</p>
            <p className="text-xs text-slate-400 mt-2">Assicurati di usare lo stesso "Nome Interno" per prodotti equivalenti</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredGrouped.map(([nomeInterno, prods]) => {
              const sortedByPrice = [...prods].sort((a, b) => (a.prezzo_unitario || 0) - (b.prezzo_unitario || 0));
              const savingsPercent = getSavingsPercentage(prods);
              return (
                <div key={nomeInterno} className="neumorphic-pressed p-5 rounded-xl">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">{nomeInterno}</h3>
                      <p className="text-sm text-slate-500">{prods[0].categoria} • {prods.length} {prods.length === 1 ? 'fornitore' : 'fornitori'}</p>
                    </div>
                    {prods.length > 1 && (
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-green-600 font-bold"><TrendingDown className="w-5 h-5" /><span>-{savingsPercent}%</span></div>
                        <p className="text-xs text-slate-400">risparmio max</p>
                      </div>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-300">
                          <th className="text-left p-3 text-slate-600 font-medium">Fornitore</th>
                          <th className="text-left p-3 text-slate-600 font-medium">Prodotto</th>
                          <th className="text-left p-3 text-slate-600 font-medium">Marca</th>
                          <th className="text-right p-3 text-slate-600 font-medium">Prezzo/Unità</th>
                          <th className="text-center p-3 text-slate-600 font-medium">Convenienza</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedByPrice.map((product) => {
                          const normalizedPrice = getNormalizedPrice(product);
                          const normalizedBest = getBestPrice(prods);
                          const priceDiff = normalizedPrice && normalizedBest ? normalizedPrice - normalizedBest : 0;
                          const isBest = normalizedPrice === normalizedBest && prods.length > 1;
                          const weight = normalizeToBaseUnit(product);
                          const inUso = product.in_uso_per_store && Object.entries(product.in_uso_per_store).some(([storeId, v]) => {
                            if (!v) return false;
                            if (selectedStoreListini !== 'all' && storeId !== selectedStoreListini) return false;
                            return true;
                          });
                          return (
                            <tr key={product.id} className={`border-b border-slate-200 ${isBest ? 'bg-green-50' : ''}`}>
                              <td className="p-3"><span className="font-medium text-slate-700">{product.fornitore || 'N/D'}</span></td>
                              <td className="p-3">
                                <span className="text-sm text-slate-700">{product.nome_prodotto}</span>
                                {weight && <div className="text-xs text-slate-500 mt-1">{weight >= 1 ? `${weight.toFixed(2)} kg/L` : `${(weight * 1000).toFixed(0)} g/ml`} per unità</div>}
                              </td>
                              <td className="p-3"><span className="text-sm text-slate-500">{product.marca || '-'}</span></td>
                              <td className="p-3 text-right">
                                <span className={`font-bold ${isBest ? 'text-green-600 text-lg' : 'text-slate-700'}`}>€{product.prezzo_unitario?.toFixed(2)}</span>
                                <span className="text-xs text-slate-500 ml-1">/ {product.unita_misura}</span>
                                {normalizedPrice && product.unita_misura_peso && <div className="text-xs font-bold text-blue-600 mt-1">€{normalizedPrice.toFixed(2)}/{getDisplayUnit(product.unita_misura_peso)}</div>}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  {prods.length === 1 ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">Unico Fornitore</span>
                                  ) : isBest ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold"><TrendingDown className="w-3 h-3" />Miglior Prezzo</span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold"><TrendingUp className="w-3 h-3" />+€{priceDiff.toFixed(2)}/{product.unita_misura_peso ? getDisplayUnit(product.unita_misura_peso) : 'kg'}</span>
                                  )}
                                  {inUso && (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${isBest ? 'bg-green-50 text-green-600' : 'bg-orange-100 text-orange-700'}`}>
                                      ✓ In uso {!isBest && <AlertTriangle className="w-3 h-3" />}
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

      {showDownloadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Scarica Listino</h2>
              <button onClick={() => { setShowDownloadModal(false); setDownloadCategories([]); setDownloadFornitori([]); }} className="nav-button p-2 rounded-lg"><X className="w-5 h-5 text-slate-600" /></button>
            </div>
            <div className="space-y-4 mb-4 max-h-[60vh] overflow-y-auto">
              <div>
                <p className="text-sm font-bold text-slate-700 mb-3">Categorie:</p>
                <div className="space-y-2">
                  <button onClick={() => setDownloadCategories(downloadCategories.length === allCategories.length ? [] : [...allCategories])} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors">
                    {downloadCategories.length === 9 ? '✓ Deseleziona Tutto' : '☐ Seleziona Tutto'}
                  </button>
                  {allCategories.map(cat => (
                    <button key={cat} onClick={() => setDownloadCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${downloadCategories.includes(cat) ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-100'}`}>
                      {downloadCategories.includes(cat) ? '✓' : '☐'} {cat}
                    </button>
                  ))}
                </div>
                {downloadCategories.length === 0 && <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded-lg">Nessuna categoria = tutte</p>}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 mb-3">Fornitori:</p>
                <div className="space-y-2">
                  {(() => {
                    const allFornitori = [...new Set(products.map(p => p.fornitore).filter(Boolean))].sort();
                    return (
                      <>
                        <button onClick={() => setDownloadFornitori(downloadFornitori.length === allFornitori.length ? [] : allFornitori)} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-green-600 hover:bg-green-50 transition-colors">
                          {downloadFornitori.length === allFornitori.length ? '✓ Deseleziona Tutto' : '☐ Seleziona Tutto'}
                        </button>
                        {allFornitori.map(f => (
                          <button key={f} onClick={() => setDownloadFornitori(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${downloadFornitori.includes(f) ? 'bg-green-100 text-green-700 font-medium' : 'text-slate-700 hover:bg-slate-100'}`}>
                            {downloadFornitori.includes(f) ? '✓' : '☐'} {f}
                          </button>
                        ))}
                      </>
                    );
                  })()}
                </div>
                {downloadFornitori.length === 0 && <p className="text-xs text-green-600 mt-2 bg-green-50 p-2 rounded-lg">Nessun fornitore = tutti</p>}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowDownloadModal(false); setDownloadCategories([]); setDownloadFornitori([]); }} className="flex-1 neumorphic-flat px-4 py-3 rounded-xl text-slate-700 font-medium hover:bg-slate-100 transition-colors">Annulla</button>
              <button onClick={handleDownload} className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2">
                <Download className="w-5 h-5" /> Scarica CSV
              </button>
            </div>
          </NeumorphicCard>
        </div>
      )}
    </div>
  );
}