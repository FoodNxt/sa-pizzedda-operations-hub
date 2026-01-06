import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Save, MapPin, Package } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function FormSprechi() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedStore, setSelectedStore] = useState('');
  const [formData, setFormData] = useState({
    prodotto_id: '',
    motivo: '',
    quantita_grammi: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      if (user.assigned_store_id) {
        setSelectedStore(user.assigned_store_id);
      }
    });
  }, []);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: sprechiConfigs = [] } = useQuery({
    queryKey: ['sprechi-configs'],
    queryFn: () => base44.entities.SprechiConfig.list(),
  });

  const { data: materiePrime = [] } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list(),
  });

  const { data: ricette = [] } = useQuery({
    queryKey: ['ricette'],
    queryFn: () => base44.entities.Ricetta.list(),
  });

  const activeSprechiConfig = sprechiConfigs.find(c => c.is_active) || null;

  const createSprecoMutation = useMutation({
    mutationFn: (data) => base44.entities.Spreco.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprechi'] });
      setFormData({ prodotto_id: '', motivo: '', quantita_grammi: '' });
      setIsSaving(false);
      alert('✅ Spreco registrato con successo');
    },
    onError: (error) => {
      console.error('Error creating spreco:', error);
      setIsSaving(false);
      alert('❌ Errore nel salvataggio');
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedStore || !formData.prodotto_id || !formData.motivo || !formData.quantita_grammi) {
      alert('⚠️ Compila tutti i campi obbligatori');
      return;
    }

    const quantita = parseFloat(formData.quantita_grammi);
    if (isNaN(quantita) || quantita <= 0) {
      alert('⚠️ Inserisci una quantità valida');
      return;
    }

    setIsSaving(true);

    const selectedProdottoConfig = activeSprechiConfig.prodotti_abilitati.find(
      p => p.prodotto_id === formData.prodotto_id
    );

    if (!selectedProdottoConfig) {
      alert('⚠️ Prodotto non trovato nella configurazione');
      setIsSaving(false);
      return;
    }

    let costoUnitario = 0;
    if (selectedProdottoConfig.tipo === 'materia_prima') {
      const mp = materiePrime.find(m => m.id === formData.prodotto_id);
      costoUnitario = mp?.prezzo_unitario || 0;
    } else {
      const r = ricette.find(r => r.id === formData.prodotto_id);
      costoUnitario = r?.costo_unitario || 0;
    }

    const store = stores.find(s => s.id === selectedStore);

    const sprecoData = {
      store_id: selectedStore,
      store_name: store?.name || '',
      data_rilevazione: new Date().toISOString(),
      prodotto_id: formData.prodotto_id,
      prodotto_nome: selectedProdottoConfig.nome,
      tipo_prodotto: selectedProdottoConfig.tipo,
      quantita_grammi: quantita,
      motivo: formData.motivo,
      rilevato_da: currentUser?.email || '',
      costo_unitario: costoUnitario
    };

    createSprecoMutation.mutate(sprecoData);
  };

  const prodottiAbilitati = activeSprechiConfig?.prodotti_abilitati || [];
  const motiviDisponibili = activeSprechiConfig?.motivi_disponibili || [];

  if (!activeSprechiConfig) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <NeumorphicCard className="p-8 text-center">
          <Trash2 className="w-16 h-16 text-orange-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#6b6b6b] mb-2">Configurazione Mancante</h2>
          <p className="text-[#9b9b9b]">
            La configurazione degli sprechi non è stata ancora impostata. 
            Contatta un amministratore per configurare il sistema.
          </p>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Trash2 className="w-10 h-10 text-orange-600" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Registra Spreco</h1>
        </div>
        <p className="text-[#9b9b9b]">Registra prodotti buttati</p>
      </div>

      {/* Current User Info */}
      {currentUser && (
        <NeumorphicCard className="p-4 bg-blue-50">
          <p className="text-sm text-blue-800">
            <strong>Utente:</strong> {currentUser.nome_cognome || currentUser.full_name || currentUser.email}
          </p>
        </NeumorphicCard>
      )}

      {/* Form */}
      <NeumorphicCard className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Store Selection */}
          <div>
            <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Locale *
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              required
            >
              <option value="">Seleziona locale...</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>

          {/* Product Selection */}
          <div>
            <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
              <Package className="w-4 h-4" />
              Prodotto *
            </label>
            <select
              value={formData.prodotto_id}
              onChange={(e) => setFormData({ ...formData, prodotto_id: e.target.value })}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              required
            >
              <option value="">Seleziona prodotto...</option>
              {prodottiAbilitati.map((prodotto) => (
                <option key={prodotto.prodotto_id} value={prodotto.prodotto_id}>
                  {prodotto.nome} ({prodotto.tipo})
                </option>
              ))}
            </select>
          </div>

          {/* Motivo */}
          <div>
            <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
              Motivo *
            </label>
            <select
              value={formData.motivo}
              onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              required
            >
              <option value="">Seleziona motivo...</option>
              {motiviDisponibili.map((motivo, idx) => (
                <option key={idx} value={motivo}>{motivo}</option>
              ))}
            </select>
          </div>

          {/* Quantity in grams */}
          <div>
            <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
              Quantità (grammi) *
            </label>
            <input
              type="number"
              value={formData.quantita_grammi}
              onChange={(e) => setFormData({ ...formData, quantita_grammi: e.target.value })}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              placeholder="es. 500"
              min="1"
              step="1"
              required
            />
            {formData.quantita_grammi && (
              <p className="text-xs text-[#9b9b9b] mt-1">
                = {(parseFloat(formData.quantita_grammi) / 1000).toFixed(3)} kg
              </p>
            )}
          </div>

          {/* Submit */}
          <NeumorphicButton
            type="submit"
            variant="primary"
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>Salvataggio...</>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Registra Spreco
              </>
            )}
          </NeumorphicButton>
        </form>
      </NeumorphicCard>

      {/* Info */}
      <NeumorphicCard className="p-4 bg-yellow-50">
        <p className="text-sm text-yellow-800">
          <strong>ℹ️ Nota:</strong> Inserisci la quantità in grammi del prodotto buttato. 
          Il sistema calcolerà automaticamente l'impatto economico.
        </p>
      </NeumorphicCard>
    </div>
  );
}