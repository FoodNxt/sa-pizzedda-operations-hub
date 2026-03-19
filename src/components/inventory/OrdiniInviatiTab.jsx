import React from "react";
import {
  Package,
  CheckCircle2 as CheckCircle,
  Send,
  AlertTriangle,
  Truck,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import OrderArrivalAlert from "./OrderArrivalAlert";
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

export default function OrdiniInviatiTab({
  ordiniInviati,
  ordiniCompletati,
  selectedStore,
  products,
  inventory,
  inventoryCantina,
  expandedFornitori,
  setExpandedFornitori,
  setEditingInviatoOrder,
  openConfirmOrder,
  deleteOrderMutation
}) {
  if (ordiniInviati.length === 0) {
    return (
      <div className="space-y-4">
        <NeumorphicCard className="p-12 text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">Nessun ordine inviato</h3>
          <p className="text-slate-500">Gli ordini inviati appariranno qui</p>
        </NeumorphicCard>
      </div>
    );
  }

  // Calculate average delivery times per supplier from completed orders
  const avgDeliveryTimes = {};
  ordiniCompletati.forEach((ordine) => {
    if (ordine.data_invio && ordine.data_completamento) {
      const giorni = Math.ceil((new Date(ordine.data_completamento) - new Date(ordine.data_invio)) / (1000 * 60 * 60 * 24));
      if (!avgDeliveryTimes[ordine.fornitore]) {
        avgDeliveryTimes[ordine.fornitore] = { total: 0, count: 0 };
      }
      avgDeliveryTimes[ordine.fornitore].total += giorni;
      avgDeliveryTimes[ordine.fornitore].count++;
    }
  });

  const avgDeliveryDays = {};
  Object.entries(avgDeliveryTimes).forEach(([fornitore, data]) => {
    avgDeliveryDays[fornitore] = Math.round(data.total / data.count);
  });

  // Group orders by supplier
  const ordersBySupplier = {};
  ordiniInviati
    .filter((o) => selectedStore === 'all' || o.store_id === selectedStore)
    .forEach((ordine) => {
      if (!ordersBySupplier[ordine.fornitore]) {
        ordersBySupplier[ordine.fornitore] = [];
      }
      ordersBySupplier[ordine.fornitore].push(ordine);
    });

  return (
    <div className="space-y-4">
      {Object.entries(ordersBySupplier).map(([fornitore, ordini]) => {
        const isExpanded = expandedFornitori[fornitore];
        const totalOrders = ordini.length;
        const totalValue = ordini.reduce((sum, o) => sum + o.totale_ordine, 0);

        return (
          <NeumorphicCard key={fornitore} className="overflow-hidden">
            <button
              onClick={() => setExpandedFornitori((prev) => ({ ...prev, [fornitore]: !prev[fornitore] }))}
              className="w-full p-6 text-left hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">{fornitore}</h2>
                    <p className="text-xs text-slate-500">
                      {totalOrders} ordini • €{totalValue.toFixed(2)}
                      {avgDeliveryDays[fornitore] && ` • Media: ${avgDeliveryDays[fornitore]}gg`}
                    </p>
                  </div>
                </div>
                {isExpanded ?
                  <ChevronDown className="w-5 h-5 text-slate-600" /> :
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                }
              </div>
            </button>

            {isExpanded && (
              <div className="p-6 pt-0 space-y-3">
                {ordini.map((ordine) => {
                  const giorniTrascorsi = Math.ceil((new Date() - new Date(ordine.data_invio)) / (1000 * 60 * 60 * 24));
                  const tempoMedio = avgDeliveryDays[ordine.fornitore] || null;
                  const isInRitardo = tempoMedio && giorniTrascorsi > tempoMedio;

                  return (
                    <div key={ordine.id} className={`neumorphic-pressed p-4 rounded-xl ${isInRitardo ? 'border-2 border-red-400' : ''}`}>
                      <OrderArrivalAlert
                        ordine={ordine}
                        inventory={inventory}
                        inventoryCantina={inventoryCantina}
                      />
                      {isInRitardo && (
                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-red-800 text-sm">⚠️ Ritardo nella consegna</p>
                            <p className="text-xs text-red-700">
                              Tempo medio: {tempoMedio}gg • Trascorsi: {giorniTrascorsi}gg
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-800">{ordine.store_name}</h3>
                          <p className="text-xs text-slate-400">
                            Inviato: {format(parseISO(ordine.data_invio), 'dd/MM/yyyy HH:mm', { locale: it })}
                          </p>
                          <p className="text-xs text-slate-400">
                            Giorni trascorsi: {giorniTrascorsi}
                          </p>
                          {(() => {
                            const totaleCalcolato = ordine.prodotti
                              .filter((p) => p.quantita_ordinata > 0)
                              .reduce((sum, p) => {
                                const currentProduct = products.find((prod) => prod.id === p.prodotto_id);
                                const ivaCorrente = currentProduct?.iva_percentuale ?? p.iva_percentuale ?? 22;
                                const prezzoConIVA = (p.prezzo_unitario || 0) * (1 + ivaCorrente / 100);
                                return sum + prezzoConIVA * p.quantita_ordinata;
                              }, 0);
                            return (
                              <div className="mt-2">
                                <p className="text-sm text-slate-500 line-through">€{ordine.totale_ordine.toFixed(2)}</p>
                                <p className="text-xl font-bold text-blue-600">€{totaleCalcolato.toFixed(2)}</p>
                                <p className="text-xs text-green-700 font-medium">IVA inclusa</p>
                                <p className="text-xs text-slate-500 mt-1">{ordine.prodotti.filter((p) => p.quantita_ordinata > 0).length} prodotti</p>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingInviatoOrder(ordine);
                            }}
                            className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-1 shadow-md">
                            <Edit className="w-4 h-4" />
                            <span className="text-sm font-medium">Modifica</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openConfirmOrder(ordine);
                            }}
                            className="px-3 py-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all flex items-center gap-1 shadow-md">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Conferma</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Eliminare questo ordine?')) {
                                deleteOrderMutation.mutate(ordine.id);
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-red-50 transition-colors border border-red-200">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-300">
                              <th className="text-left p-2 text-slate-600 font-medium text-xs">Prodotto</th>
                              <th className="text-right p-2 text-slate-600 font-medium text-xs">Quantità</th>
                              <th className="text-right p-2 text-slate-600 font-medium text-xs">Prezzo Unit.</th>
                              <th className="text-right p-2 text-slate-600 font-medium text-xs">Totale</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ordine.prodotti.filter((prod) => prod.quantita_ordinata > 0).map((prod, idx) => {
                              const currentProduct = products.find((p) => p.id === prod.prodotto_id);
                              const ivaCorrente = currentProduct?.iva_percentuale ?? prod.iva_percentuale ?? 22;
                              const prezzoUnitarioConIVA = (prod.prezzo_unitario || 0) * (1 + ivaCorrente / 100);
                              const totaleConIVA = prezzoUnitarioConIVA * prod.quantita_ordinata;

                              return (
                                <tr key={idx} className="border-b border-slate-200">
                                  <td className="p-2 text-slate-700">
                                    {prod.nome_prodotto}
                                    <span className="text-xs text-slate-400 ml-1">(IVA {ivaCorrente}%)</span>
                                  </td>
                                  <td className="p-2 text-right text-slate-700">
                                    {prod.quantita_ordinata} {prod.unita_misura}
                                  </td>
                                  <td className="p-2 text-right text-slate-600">
                                    €{prezzoUnitarioConIVA.toFixed(2)}
                                  </td>
                                  <td className="p-2 text-right font-bold text-blue-600">
                                    €{totaleConIVA.toFixed(2)}
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
        );
      })}
    </div>
  );
}