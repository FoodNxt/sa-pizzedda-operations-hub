import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  CheckCircle2 as CheckCircle,
  Send,
  AlertTriangle,
  Truck,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Mail,
  Save,
  Bell
} from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import OrderArrivalAlert, { useOrderArrivalDetection } from "./OrderArrivalAlert";
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

function GlobalArrivalBanner({ ordiniInviati, inventory, inventoryCantina }) {
  const totalAlerts = ordiniInviati.filter((ordine) => {
    if (!ordine?.data_invio || !ordine?.prodotti) return false;
    const allInv = [...(inventory || []), ...(inventoryCantina || [])];
    const dataInvio = new Date(ordine.data_invio);

    return ordine.prodotti.some((prod) => {
      if (prod.quantita_ordinata <= 0) return false;
      const readings = allInv
        .filter((r) => r.prodotto_id === prod.prodotto_id && r.store_id === ordine.store_id)
        .sort((a, b) => new Date(a.data_rilevazione) - new Date(b.data_rilevazione));
      if (readings.length < 2) return false;
      const readingsBeforeOrder = readings.filter((r) => new Date(r.data_rilevazione) <= dataInvio);
      const readingsAfterOrder = readings.filter((r) => new Date(r.data_rilevazione) > dataInvio);
      if (readingsBeforeOrder.length === 0 || readingsAfterOrder.length === 0) return false;
      const lastBefore = readingsBeforeOrder[readingsBeforeOrder.length - 1];
      const lastAfter = readingsAfterOrder[readingsAfterOrder.length - 1];
      return (lastAfter.quantita_rilevata || 0) > (lastBefore.quantita_rilevata || 0);
    });
  }).length;

  if (totalAlerts === 0) return null;

  return (
    <div className="mb-6 p-5 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl shadow-xl text-white">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-white bg-opacity-20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-7 h-7 text-white" />
        </div>
        <div>
          <p className="text-xl font-bold">⚠️ {totalAlerts} ordini con possibile arrivo NON SEGNATO</p>
          <p className="text-sm text-white text-opacity-90 mt-1">
            L'inventario è aumentato dopo l'invio per alcuni prodotti. Controlla e conferma la ricezione.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmailAlertConfig() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState('');
  const [attivo, setAttivo] = useState(true);

  const { data: configs = [] } = useQuery({
    queryKey: ['order-arrival-alert-config'],
    queryFn: () => base44.entities.OrderArrivalAlertConfig.list(),
    onSuccess: (data) => {
      if (data.length > 0) {
        setEmail(data[0].email_destinatario || '');
        setAttivo(data[0].attivo !== false);
      }
    }
  });

  const currentConfig = configs[0];

  React.useEffect(() => {
    if (currentConfig) {
      setEmail(currentConfig.email_destinatario || '');
      setAttivo(currentConfig.attivo !== false);
    }
  }, [currentConfig]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (currentConfig) {
        return base44.entities.OrderArrivalAlertConfig.update(currentConfig.id, {
          email_destinatario: email,
          attivo
        });
      }
      return base44.entities.OrderArrivalAlertConfig.create({
        email_destinatario: email,
        attivo
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-arrival-alert-config'] });
      setEditing(false);
    }
  });

  if (!editing) {
    return (
      <div className="mb-4">
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
        >
          <Bell className="w-4 h-4" />
          {currentConfig?.email_destinatario
            ? `Notifiche email: ${currentConfig.email_destinatario} (${currentConfig.attivo !== false ? 'attivo' : 'disattivo'})`
            : 'Configura notifiche email arrivi non segnati'}
        </button>
      </div>
    );
  }

  return (
    <NeumorphicCard className="p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="w-5 h-5 text-blue-600" />
        <h3 className="font-bold text-slate-800 text-sm">Notifica email arrivi non segnati</h3>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email destinatario..."
          className="flex-1 neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={attivo}
            onChange={(e) => setAttivo(e.target.checked)}
            className="w-4 h-4"
          />
          Attivo
        </label>
        <button
          onClick={() => {
            if (!email) { alert('Inserisci una email'); return; }
            saveMutation.mutate();
          }}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all"
        >
          <Save className="w-4 h-4" />
          Salva
        </button>
        <button
          onClick={() => setEditing(false)}
          className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all"
        >
          Annulla
        </button>
      </div>
      <p className="text-xs text-slate-500 mt-2">
        Riceverai una email automatica ogni giorno se ci sono ordini con possibile arrivo non segnato.
      </p>
    </NeumorphicCard>
  );
}

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
      <GlobalArrivalBanner
        ordiniInviati={ordiniInviati}
        inventory={inventory}
        inventoryCantina={inventoryCantina}
      />
      <EmailAlertConfig />
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