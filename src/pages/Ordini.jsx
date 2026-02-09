import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, CheckCircle, AlertTriangle, X, Camera, Upload, Loader2, Volume2, ChevronDown, ChevronRight } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import ProtectedPage from "../components/ProtectedPage";

export default function Ordini() {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [receivedQuantities, setReceivedQuantities] = useState({});
  const [confirmedProducts, setConfirmedProducts] = useState({});
  const [ddtPhotos, setDdtPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [expandedStores, setExpandedStores] = useState({});
  const [showCreateMultiStoreOrder, setShowCreateMultiStoreOrder] = useState(false);
  const [selectedFornitore, setSelectedFornitore] = useState(null);
  const [destinationStore, setDestinationStore] = useState(null);
  const [selectedProductsForOrder, setSelectedProductsForOrder] = useState({});
  const queryClient = useQueryClient();

  const { data: materiePrime = [] } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list()
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: ordiniInviati = [] } = useQuery({
    queryKey: ['ordini-inviati'],
    queryFn: () => base44.entities.OrdineFornitore.filter({ status: 'inviato' })
  });

  const completeOrderMutation = useMutation({
    mutationFn: ({ orderId, data }) => base44.entities.OrdineFornitore.update(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordini-inviati'] });
      setSelectedOrder(null);
      setReceivedQuantities({});
      alert('✅ Ordine completato!');
    }
  });

  const createMultiStoreOrderMutation = useMutation({
    mutationFn: async (data) => base44.entities.OrdineFornitore.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordini-inviati'] });
      setShowCreateMultiStoreOrder(false);
      setSelectedFornitore(null);
      setDestinationStore(null);
      setSelectedProductsForOrder({});
      alert('✅ Ordine creato e inviato!');
    }
  });

  // Get list of fornitori from orders
  const fornitori = useMemo(() => {
    const fornitoriSet = new Set(ordiniInviati.map(o => o.fornitore).filter(Boolean));
    return Array.from(fornitoriSet).sort();
  }, [ordiniInviati]);

  // Get products from selected fornitore (from multiple stores if needed)
  const productsFromFornitore = useMemo(() => {
    if (!selectedFornitore) return [];
    
    const productsMap = new Map();
    ordiniInviati
      .filter(o => o.fornitore === selectedFornitore)
      .forEach(order => {
        order.prodotti?.forEach(prod => {
          const key = prod.prodotto_id;
          if (!productsMap.has(key)) {
            productsMap.set(key, { ...prod });
          }
        });
      });
    
    return Array.from(productsMap.values());
  }, [selectedFornitore, ordiniInviati]);

  // Filter orders by user's assigned stores
  const myOrders = useMemo(() => {
    if (!currentUser) return [];

    // Admin e manager vedono tutti gli ordini
    if (currentUser.user_type === 'admin' || currentUser.user_type === 'manager') {
      return ordiniInviati;
    }

    // Dipendenti vedono ordini dei loro locali assegnati
    const assignedStores = currentUser.assigned_stores || [];

    if (assignedStores.length === 0) return [];

    return ordiniInviati.filter((order) =>
    assignedStores.includes(order.store_id)
    );
  }, [ordiniInviati, currentUser]);

  // Group orders by store (for dipendente view)
  const ordiniPerStore = useMemo(() => {
    if (!currentUser || currentUser.user_type === 'admin' || currentUser.user_type === 'manager') {
      return null;
    }

    const grouped = {};
    myOrders.forEach((ordine) => {
      if (!grouped[ordine.store_id]) {
        grouped[ordine.store_id] = {
          store_id: ordine.store_id,
          store_name: ordine.store_name,
          ordini: []
        };
      }
      grouped[ordine.store_id].ordini.push(ordine);
    });

    return Object.values(grouped).sort((a, b) => a.store_name.localeCompare(b.store_name));
  }, [myOrders, currentUser]);

  const openOrderDetail = (order) => {
    setSelectedOrder(order);
    const initialQuantities = {};
    const initialConfirmed = {};
    order.prodotti.forEach((prod) => {
      initialQuantities[prod.prodotto_id] = prod.quantita_ordinata;
      initialConfirmed[prod.prodotto_id] = false;
    });
    setReceivedQuantities(initialQuantities);
    setConfirmedProducts(initialConfirmed);
    setDdtPhotos([]);
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPhoto(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }
      setDdtPhotos((prev) => [...prev, ...uploadedUrls]);
    } catch (error) {
      alert('Errore nel caricamento delle foto: ' + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (index) => {
    setDdtPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCompleteOrder = async () => {
    if (!selectedOrder) return;

    // Check if all quantities match
    const allMatch = selectedOrder.prodotti.every((prod) =>
    receivedQuantities[prod.prodotto_id] === prod.quantita_ordinata
    );

    if (!allMatch) {
      alert('ATTENZIONE: Le quantità ricevute non corrispondono a quelle ordinate.');
    }

    const updatedProdotti = selectedOrder.prodotti.map((prod) => ({
      ...prod,
      quantita_ricevuta: receivedQuantities[prod.prodotto_id] || 0
    }));

    await completeOrderMutation.mutateAsync({
      orderId: selectedOrder.id,
      data: {
        status: 'completato',
        data_completamento: new Date().toISOString(),
        completato_da: currentUser.email,
        prodotti: updatedProdotti,
        foto_ddt: ddtPhotos
      }
    });
  };

  const allProductsConfirmed = selectedOrder ?
  selectedOrder.prodotti.
  filter((p) => p.quantita_ordinata > 0).
  every((prod) => confirmedProducts[prod.prodotto_id]) :
  false;

  const speakProductName = async (productName) => {
    if (!productName) return;

    setPlayingAudio(productName);
    try {
      // Use Web Speech API
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(productName);
        utterance.lang = 'it-IT';
        utterance.rate = 0.9;
        utterance.onend = () => setPlayingAudio(null);
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Error speaking:', error);
      setPlayingAudio(null);
    }
  };

  return (
    <ProtectedPage pageName="Ordini">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-slate-50 mb-2 text-3xl font-bold">📦 Ordini</h1>
          <p className="text-slate-50">Gestisci gli ordini inviati ai fornitori</p>
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

        {myOrders.length === 0 ?
        <NeumorphicCard className="p-12 text-center">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">Nessun ordine in attesa</h3>
            <p className="text-[#9b9b9b]">Non ci sono ordini da gestire per i tuoi locali</p>
          </NeumorphicCard> :
        ordiniPerStore ? (
        /* Vista dipendente - raggruppata per store */
        <div className="space-y-6">
            {ordiniPerStore.map((storeGroup) =>
          <NeumorphicCard key={storeGroup.store_id} className="p-6">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-blue-200">
                  <div className="neumorphic-flat w-12 h-12 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[#6b6b6b]">{storeGroup.store_name}</h2>
                    <p className="text-sm text-[#9b9b9b]">{storeGroup.ordini.length} ordini in attesa</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {storeGroup.ordini.map((ordine) =>
              <div
                key={ordine.id}
                onClick={() => openOrderDetail(ordine)}
                className="neumorphic-pressed p-5 rounded-xl cursor-pointer hover:shadow-xl transition-all">

                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-2xl font-bold text-blue-600 mb-1">{ordine.fornitore}</h3>
                          <p className="text-xs text-[#9b9b9b]">
                            Inviato: {format(parseISO(ordine.data_invio), 'dd/MM/yyyy HH:mm', { locale: it })}
                          </p>
                        </div>
                        <div className="text-right">
                          {(() => {
                      const totaleCalcolato = ordine.prodotti.reduce((sum, p) => {
                        const currentProduct = materiePrime.find((prod) => prod.id === p.prodotto_id);
                        const ivaCorrente = currentProduct?.iva_percentuale ?? p.iva_percentuale ?? 22;
                        const prezzoConIVA = (p.prezzo_unitario || 0) * (1 + ivaCorrente / 100);
                        return sum + prezzoConIVA * p.quantita_ordinata;
                      }, 0);
                      return (
                        <>
                                <p className="text-2xl font-bold text-green-600">€{totaleCalcolato.toFixed(2)}</p>
                                <p className="text-xs text-green-700 font-medium">IVA inclusa</p>
                                <p className="text-xs text-[#9b9b9b] mt-1">{ordine.prodotti.length} prodotti</p>
                              </>);

                    })()}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {ordine.prodotti.slice(0, 4).map((prod, idx) =>
                  <span key={idx} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-100 text-blue-700">
                            {prod.nome_prodotto}
                          </span>
                  )}
                        {ordine.prodotti.length > 4 &&
                  <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600">
                            +{ordine.prodotti.length - 4} altri
                          </span>
                  }
                      </div>
                    </div>
              )}
                </div>
              </NeumorphicCard>
          )}
          </div>) : (

        /* Vista admin/manager - lista semplice */
        <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Ordini da Ricevere</h2>
            <div className="space-y-3">
              {myOrders.map((ordine) =>
            <div
              key={ordine.id}
              onClick={() => openOrderDetail(ordine)}
              className="neumorphic-pressed p-4 rounded-xl cursor-pointer hover:shadow-xl transition-all">

                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-[#6b6b6b]">{ordine.store_name}</h3>
                      <p className="text-lg font-bold text-blue-600">{ordine.fornitore}</p>
                      <p className="text-xs text-[#9b9b9b]">
                        Inviato: {format(parseISO(ordine.data_invio), 'dd/MM/yyyy HH:mm', { locale: it })}
                      </p>
                    </div>
                    <div className="text-right">
                      {(() => {
                    const totaleCalcolato = ordine.prodotti.reduce((sum, p) => {
                      const currentProduct = materiePrime.find((prod) => prod.id === p.prodotto_id);
                      const ivaCorrente = currentProduct?.iva_percentuale ?? p.iva_percentuale ?? 22;
                      const prezzoConIVA = (p.prezzo_unitario || 0) * (1 + ivaCorrente / 100);
                      return sum + prezzoConIVA * p.quantita_ordinata;
                    }, 0);
                    return (
                      <>
                            <p className="text-xl font-bold text-green-600">€{totaleCalcolato.toFixed(2)}</p>
                            <p className="text-xs text-green-700 font-medium">IVA inclusa</p>
                            <p className="text-xs text-[#9b9b9b] mt-1">{ordine.prodotti.length} prodotti</p>
                          </>);

                  })()}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ordine.prodotti.slice(0, 3).map((prod, idx) =>
                <span key={idx} className="px-2 py-1 rounded-lg text-xs bg-blue-100 text-blue-700">
                        {prod.nome_prodotto}
                      </span>
                )}
                    {ordine.prodotti.length > 3 &&
                <span className="px-2 py-1 rounded-lg text-xs bg-slate-100 text-slate-600">
                        +{ordine.prodotti.length - 3}
                      </span>
                }
                  </div>
                </div>
            )}
            </div>
          </NeumorphicCard>)
        }

        {/* Order Detail Modal */}
        {selectedOrder &&
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

              {/* DDT Photo Upload */}
              <div className="mb-6">
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Foto DDT (opzionale)
                </label>
                <div className="space-y-3">
                  <label className="neumorphic-pressed p-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-50 transition-colors">
                    <Upload className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">
                      {uploadingPhoto ? 'Caricamento...' : 'Carica Foto DDT'}
                    </span>
                    <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="hidden" />

                  </label>

                  {ddtPhotos.length > 0 &&
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {ddtPhotos.map((url, idx) =>
                  <div key={idx} className="relative neumorphic-flat rounded-xl overflow-hidden group">
                          <img src={url} alt={`DDT ${idx + 1}`} className="w-full h-32 object-cover" />
                          <button
                      onClick={() => removePhoto(idx)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">

                            <X className="w-4 h-4" />
                          </button>
                        </div>
                  )}
                    </div>
                }
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {selectedOrder.prodotti.filter((p) => p.quantita_ordinata > 0).map((prod) => {
                const receivedQty = receivedQuantities[prod.prodotto_id] || 0;
                const isMatch = receivedQty === prod.quantita_ordinata;
                const isConfirmed = confirmedProducts[prod.prodotto_id];
                const materiaPrima = materiePrime.find((m) => m.id === prod.prodotto_id);

                return (
                  <div key={prod.prodotto_id} className={`neumorphic-pressed p-4 rounded-xl transition-all ${
                  isConfirmed ? 'border-2 border-green-500' : ''}`
                  }>
                      {materiaPrima?.foto_url &&
                    <div className="mb-3">
                          <img
                        src={materiaPrima.foto_url}
                        alt={prod.nome_prodotto}
                        className="w-full h-32 object-cover rounded-lg" />

                        </div>
                    }
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-[#6b6b6b]">{prod.nome_prodotto}</p>
                            <button
                            type="button"
                            onClick={() => speakProductName(prod.nome_prodotto)}
                            disabled={playingAudio === prod.nome_prodotto}
                            className="nav-button p-1.5 rounded-lg hover:bg-blue-50"
                            title="Ascolta il nome">

                              <Volume2 className={`w-4 h-4 ${playingAudio === prod.nome_prodotto ? 'text-blue-600 animate-pulse' : 'text-slate-600'}`} />
                            </button>
                          </div>
                          <p className="text-sm text-[#9b9b9b]">
                            Ordinato: {prod.quantita_ordinata} {prod.unita_misura}
                          </p>
                        </div>
                        {isMatch ?
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" /> :

                      <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                      }
                      </div>
                      
                      <div className="mb-3">
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
                        !isMatch ? 'border-2 border-orange-300' : ''}`
                        } />

                      </div>

                      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                        <input
                        type="checkbox"
                        checked={isConfirmed}
                        onChange={(e) => setConfirmedProducts({
                          ...confirmedProducts,
                          [prod.prodotto_id]: e.target.checked
                        })}
                        className="w-5 h-5" />

                        <label className="text-sm font-medium text-blue-800 cursor-pointer">
                          Ho verificato questo prodotto
                        </label>
                      </div>
                    </div>);

              })}
              </div>

              <div className="flex gap-3">
                <NeumorphicButton onClick={() => setSelectedOrder(null)} className="flex-1">
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton
                onClick={handleCompleteOrder}
                variant="primary"
                disabled={!allProductsConfirmed}
                className="flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">

                  <CheckCircle className="w-5 h-5" />
                  Completa Ordine
                </NeumorphicButton>
              </div>
              {!allProductsConfirmed &&
            <p className="text-center text-sm text-orange-600 mt-2">
                  ⚠️ Devi confermare tutti i prodotti prima di completare l'ordine
                </p>
            }
            </NeumorphicCard>
          </div>
        }
      </div>
    </ProtectedPage>);

}