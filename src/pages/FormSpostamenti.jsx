import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { Truck, Save, ArrowRight, Package, Weight, Store } from 'lucide-react';

export default function FormSpostamenti() {
  const [formData, setFormData] = useState({
    materia_prima_id: '',
    peso_kg: '',
    store_origine_id: '',
    store_destinazione_id: '',
    note: ''
  });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: materiePrime = [] } = useQuery({
    queryKey: ['materie-prime-trasportabili'],
    queryFn: async () => {
      const all = await base44.entities.MateriePrime.filter({ trasportabile: true });
      return all.filter(m => m.attivo !== false);
    },
  });

  const { data: ricette = [] } = useQuery({
    queryKey: ['ricette-trasportabili'],
    queryFn: async () => {
      const all = await base44.entities.Ricetta.filter({ trasportabile: true });
      return all.filter(r => r.attivo !== false);
    },
  });

  const { data: tipiPreparazione = [] } = useQuery({
    queryKey: ['tipi-preparazione-trasporto'],
    queryFn: () => base44.entities.TipoPreparazione.filter({ mostra_trasporto_store_manager: true })
  });

  const { data: ricetteSemilavorati = [] } = useQuery({
    queryKey: ['ricette-semilavorati-tutti'],
    queryFn: () => base44.entities.Ricetta.filter({ is_semilavorato: true })
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Spostamento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spostamenti'] });
      resetForm();
      alert('✅ Spostamento registrato con successo!');
    },
  });

  const resetForm = () => {
    setFormData({
      materia_prima_id: '',
      peso_kg: '',
      store_origine_id: '',
      store_destinazione_id: '',
      note: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert('⚠️ Errore: utente non trovato');
      return;
    }
    
    if (formData.store_origine_id === formData.store_destinazione_id) {
      alert('⚠️ Origine e destinazione devono essere diversi');
      return;
    }

    // Determine if it's a materia prima or ricetta
    const isRicetta = formData.materia_prima_id.startsWith('ricetta_');
    const productId = formData.materia_prima_id.replace(/^(mp_|ricetta_)/, '');
    
    let productName = '';
    let productType = '';
    
    if (isRicetta) {
      const ricetta = ricette.find(r => r.id === productId) || ricetteSemilavorati.find(r => r.id === productId);
      productName = ricetta?.nome_prodotto || '';
      productType = 'ricetta';
    } else {
      const materiaPrima = materiePrime.find(m => m.id === productId);
      productName = materiaPrima?.nome_prodotto || '';
      productType = 'materia_prima';
    }

    const storeOrigine = stores.find(s => s.id === formData.store_origine_id);
    const storeDestinazione = stores.find(s => s.id === formData.store_destinazione_id);

    const dataToSubmit = {
      materia_prima_id: productId,
      materia_prima_nome: productName,
      tipo_prodotto: productType,
      peso_kg: parseFloat(formData.peso_kg),
      store_origine_id: formData.store_origine_id,
      store_origine_nome: storeOrigine?.name || '',
      store_destinazione_id: formData.store_destinazione_id,
      store_destinazione_nome: storeDestinazione?.name || '',
      dipendente_id: currentUser.id,
      dipendente_nome: currentUser.nome_cognome || currentUser.full_name || currentUser.email,
      data_spostamento: new Date().toISOString(),
      note: formData.note
    };

    createMutation.mutate(dataToSubmit);
  };

  const getStoreName = (storeId) => {
    return stores.find(s => s.id === storeId)?.name || '';
  };

  return (
    <ProtectedPage pageName="InventoryForms">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
            Spostamenti tra Negozi
          </h1>
          <p className="text-sm text-slate-500">Registra i trasferimenti di prodotti tra locali</p>
        </div>

        <NeumorphicCard className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Prodotto */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                <Package className="w-4 h-4" />
                Prodotto *
              </label>
              <select
                required
                value={formData.materia_prima_id}
                onChange={(e) => setFormData({ ...formData, materia_prima_id: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              >
                <option value="">Seleziona prodotto...</option>
                <optgroup label="📦 Materie Prime">
                  {materiePrime.map(mp => (
                    <option key={`mp_${mp.id}`} value={`mp_${mp.id}`}>
                      {mp.nome_prodotto} {mp.marca ? `(${mp.marca})` : ''}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🍕 Ricette / Semilavorati">
                  {ricette.map(r => (
                    <option key={`ricetta_${r.id}`} value={`ricetta_${r.id}`}>
                      {r.nome_prodotto} {r.is_semilavorato ? '(Semilavorato)' : ''}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🚛 Semilavorati da Trasportare (da Preparazioni)">
                  {tipiPreparazione.map(tipo => {
                    const semilav = ricetteSemilavorati.find(r => r.id === tipo.semilavorato_id);
                    if (!semilav) return null;
                    return (
                      <option key={`semilav_${semilav.id}`} value={`ricetta_${semilav.id}`}>
                        {semilav.nome_prodotto} (da {tipo.store_preparazione_nome || 'prep.'})
                      </option>
                    );
                  }).filter(Boolean)}
                </optgroup>
              </select>
              {materiePrime.length === 0 && ricette.length === 0 && tipiPreparazione.length === 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ Nessun prodotto trasportabile configurato. Contatta l'amministratore.
                </p>
              )}
            </div>

            {/* Peso */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                <Weight className="w-4 h-4" />
                Peso (kg) *
              </label>
              <input
                type="number"
                required
                step="0.1"
                min="0.1"
                value={formData.peso_kg}
                onChange={(e) => setFormData({ ...formData, peso_kg: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                placeholder="Es: 10.5"
              />
            </div>

            {/* Origine e Destinazione */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  Da (Origine) *
                </label>
                <select
                  required
                  value={formData.store_origine_id}
                  onChange={(e) => setFormData({ ...formData, store_origine_id: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                >
                  <option value="">Seleziona negozio...</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  A (Destinazione) *
                </label>
                <select
                  required
                  value={formData.store_destinazione_id}
                  onChange={(e) => setFormData({ ...formData, store_destinazione_id: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                >
                  <option value="">Seleziona negozio...</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Note (opzionale)
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none h-24 resize-none"
                placeholder="Aggiungi note..."
              />
            </div>

            {/* Preview */}
            {formData.store_origine_id && formData.store_destinazione_id && formData.materia_prima_id && formData.peso_kg && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-800 font-medium mb-2">📦 Riepilogo:</p>
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <span className="font-bold">
                    {(() => {
                      const isRicetta = formData.materia_prima_id.startsWith('ricetta_');
                      const productId = formData.materia_prima_id.replace(/^(mp_|ricetta_)/, '');
                      if (isRicetta) {
                        return ricette.find(r => r.id === productId)?.nome_prodotto || ricetteSemilavorati.find(r => r.id === productId)?.nome_prodotto;
                      }
                      return materiePrime.find(m => m.id === productId)?.nome_prodotto;
                    })()}
                  </span>
                  <span>•</span>
                  <span>{formData.peso_kg} kg</span>
                  <span>•</span>
                  <span>{getStoreName(formData.store_origine_id)}</span>
                  <ArrowRight className="w-4 h-4" />
                  <span>{getStoreName(formData.store_destinazione_id)}</span>
                </div>
              </div>
            )}

            <NeumorphicButton
              type="submit"
              variant="primary"
              className="w-full flex items-center justify-center gap-2 py-4"
              disabled={createMutation.isPending}
            >
              <Save className="w-5 h-5" />
              Registra Spostamento
            </NeumorphicButton>
          </form>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 bg-blue-50">
          <div className="flex items-start gap-3">
            <Truck className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div className="text-sm text-blue-800">
              <p className="font-bold mb-2">ℹ️ Informazioni</p>
              <ul className="space-y-1 text-xs">
                <li>• Registra qui quando sposti prodotti da un negozio all'altro</li>
                <li>• Sono visualizzati solo i prodotti configurati come "trasportabili"</li>
                <li>• Lo spostamento viene registrato con data e ora automaticamente</li>
              </ul>
            </div>
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}