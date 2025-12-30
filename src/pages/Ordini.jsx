import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, CheckCircle, AlertTriangle, X } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import ProtectedPage from "../components/ProtectedPage";

export default function Ordini() {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [receivedQuantities, setReceivedQuantities] = useState({});
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: ordiniInviati = [] } = useQuery({
    queryKey: ['ordini-inviati'],
    queryFn: () => base44.entities.OrdineFornitore.filter({ status: 'inviato' }),
  });

  const completeOrderMutation = useMutation({
    mutationFn: ({ orderId, data }) => base44.entities.OrdineFornitore.update(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordini-inviati'] });
      setSelectedOrder(null);
      setReceivedQuantities({});
      alert('✅ Ordine completato!');
    },
  });

  // Filter orders by user's assigned stores
  const myOrders = useMemo(() => {
    if (!currentUser) return [];
    const assignedStores = currentUser.assigned_stores || [];
    
    return ordiniInviati.filter(order => 
      assignedStores.length === 0 || assignedStores.includes(order.store_name)
    );
  }, [ordiniInviati, currentUser]);

  const openOrderDetail = (order) => {
    setSelectedOrder(order);
    const initialQuantities = {};
    order.prodotti.forEach(prod => {
      initialQuantities[prod.prodotto_id] = prod.quantita_ordinata;
    });
    setReceivedQuantities(initialQuantities);
  };

  const handleCompleteOrder = async () => {
    if (!selectedOrder) return;

    // Check if all quantities match
    const allMatch = selectedOrder.prodotti.every(prod => 
      receivedQuantities[prod.prodotto_id] === prod.quantita_ordinata
    );

    if (!allMatch) {
      const confirm = window.confirm(
        'ATTENZIONE: Le quantità ricevute non corrispondono a quelle ordinate. Vuoi comunque completare l\'ordine?'
      );
      if (!confirm) return;
    }

    const updatedProdotti = selectedOrder.prodotti.map(prod => ({
      ...prod,
      quantita_ricevuta: receivedQuantities[prod.prodotto_id] || 0
    }));

    await completeOrderMutation.mutateAsync({
      orderId: selectedOrder.id,
      data: {
        status: 'completato',
        data_completamento: new Date().toISOString(),
        completato_da: currentUser.email,
        prodotti: updatedProdotti
      }
    });
  };

  return (
    <ProtectedPage pageName="Ordini">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">📦 Ordini</h1>
          <p className="text-[#9b9b9b]">Gestisci gli ordini inviati ai fornitori</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <NeumorphicCard className="p-6 text-center">
            <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Package className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{myOrders.length}</h3>
            <p className="text-sm text-[#9b9b9b]">Ordini in Attesa</p>
          </NeumorphicCard>
        </div>

        {myOrders.length === 0 ? (
          <NeumorphicCard className="p-12 text-center">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">Nessun ordine in attesa</h3>
            <p className="text-[#9b9b9b]">Non ci sono ordini da gestire per i tuoi locali</p>
          </NeumorphicCard>
        ) : (
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Ordini da Ricevere</h2>
            <div className="space-y-3">
              {myOrders.map(ordine => (
                <div 
                  key={ordine.id}
                  onClick={() => openOrderDetail(ordine)}
                  className="neumorphic-pressed p-4 rounded-xl cursor-pointer hover:shadow-xl transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-[#6b6b6b]">{ordine.store_name}</h3>
                      <p className="text-sm text-[#9b9b9b]">{ordine.fornitore}</p>
                      <p className="text-xs text-[#9b9b9b]">
                        Inviato: {format(parseISO(ordine.data_invio), 'dd/MM/yyyy HH:mm', { locale: it })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">€{ordine.totale_ordine.toFixed(2)}</p>
                      <p className="text-xs text-[#9b9b9b]">{ordine.prodotti.length} prodotti</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ordine.prodotti.slice(0, 3).map((prod, idx) => (
                      <span key={idx} className="px-2 py-1 rounded-lg text-xs bg-blue-100 text-blue-700">
                        {prod.nome_prodotto}
                      </span>
                    ))}
                    {ordine.prodotti.length > 3 && (
                      <span className="px-2 py-1 rounded-lg text-xs bg-slate-100 text-slate-600">
                        +{ordine.prodotti.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </NeumorphicCard>
        )}

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-[#6b6b6b]">Conferma Ricezione</h2>
                  <p className="text-sm text-[#9b9b9b]">{selectedOrder.store_name} - {selectedOrder.fornitore}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-yellow-800 text-sm">Importante!</p>
                    <p className="text-xs text-yellow-700">
                      Verifica che le quantità ricevute corrispondano a quelle ordinate prima di completare.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {selectedOrder.prodotti.map((prod) => {
                  const receivedQty = receivedQuantities[prod.prodotto_id] || 0;
                  const isMatch = receivedQty === prod.quantita_ordinata;
                  
                  return (
                    <div key={prod.prodotto_id} className="neumorphic-pressed p-4 rounded-xl">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-bold text-[#6b6b6b]">{prod.nome_prodotto}</p>
                          <p className="text-sm text-[#9b9b9b]">
                            Ordinato: {prod.quantita_ordinata} {prod.unita_misura}
                          </p>
                        </div>
                        {isMatch ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-[#9b9b9b] mb-1 block">Quantità Ricevuta</label>
                          <input
                            type="number"
                            step="0.1"
                            value={receivedQty}
                            onChange={(e) => setReceivedQuantities({
                              ...receivedQuantities,
                              [prod.prodotto_id]: parseFloat(e.target.value) || 0
                            })}
                            className={`w-full neumorphic-pressed px-3 py-2 rounded-lg text-[#6b6b6b] outline-none ${
                              !isMatch ? 'border-2 border-orange-300' : ''
                            }`}
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={() => setReceivedQuantities({
                              ...receivedQuantities,
                              [prod.prodotto_id]: prod.quantita_ordinata
                            })}
                            className="w-full neumorphic-flat px-3 py-2 rounded-lg text-sm text-[#6b6b6b] hover:bg-blue-50 transition-colors"
                          >
                            Usa Ordinato
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <NeumorphicButton onClick={() => setSelectedOrder(null)} className="flex-1">
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton
                  onClick={handleCompleteOrder}
                  variant="primary"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Completa Ordine
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}