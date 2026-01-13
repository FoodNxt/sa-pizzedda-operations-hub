import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { Plus, Euro, TrendingDown, Trash2, Edit, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from 'date-fns/locale';

export default function PianoQuarter() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('ads');
  const [showFormAds, setShowFormAds] = useState(false);
  const [showFormPromo, setShowFormPromo] = useState(false);
  const [editingAds, setEditingAds] = useState(null);
  const [editingPromo, setEditingPromo] = useState(null);

  const [formAds, setFormAds] = useState({
    piattaforma: 'Glovo',
    stores_ids: [],
    budget: '',
    percentuale_cofinanziamento: '',
    data_inizio: '',
    data_fine: '',
    note: ''
  });

  const [formPromo, setFormPromo] = useState({
    piattaforma: 'Glovo',
    stores_ids: [],
    prodotti_scontati: [],
    percentuale_sconto: '',
    data_inizio: '',
    data_fine: '',
    note: ''
  });

  const [nuovoProdotto, setNuovoProdotto] = useState('');

  // Fetch data
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: pianiAds = [] } = useQuery({
    queryKey: ['piani-ads'],
    queryFn: () => base44.entities.PianoAdsQuarterly.list()
  });

  const { data: pianiPromo = [] } = useQuery({
    queryKey: ['piani-promo'],
    queryFn: () => base44.entities.PianoPromoSettimanale.list()
  });

  // Mutations
  const createAdsMutation = useMutation({
    mutationFn: (data) => base44.entities.PianoAdsQuarterly.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piani-ads'] });
      resetFormAds();
    }
  });

  const updateAdsMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PianoAdsQuarterly.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piani-ads'] });
      resetFormAds();
    }
  });

  const deleteAdsMutation = useMutation({
    mutationFn: (id) => base44.entities.PianoAdsQuarterly.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piani-ads'] });
    }
  });

  const createPromoMutation = useMutation({
    mutationFn: (data) => base44.entities.PianoPromoSettimanale.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piani-promo'] });
      resetFormPromo();
    }
  });

  const updatePromoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PianoPromoSettimanale.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piani-promo'] });
      resetFormPromo();
    }
  });

  const deletePromoMutation = useMutation({
    mutationFn: (id) => base44.entities.PianoPromoSettimanale.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piani-promo'] });
    }
  });

  const resetFormAds = () => {
    setFormAds({
      piattaforma: 'Glovo',
      stores_ids: [],
      budget: '',
      percentuale_cofinanziamento: '',
      data_inizio: '',
      data_fine: '',
      note: ''
    });
    setShowFormAds(false);
    setEditingAds(null);
  };

  const resetFormPromo = () => {
    setFormPromo({
      piattaforma: 'Glovo',
      stores_ids: [],
      prodotti_scontati: [],
      percentuale_sconto: '',
      data_inizio: '',
      data_fine: '',
      note: ''
    });
    setShowFormPromo(false);
    setEditingPromo(null);
  };

  const handleSubmitAds = (e) => {
    e.preventDefault();
    const stores_names = stores.filter(s => formAds.stores_ids.includes(s.id)).map(s => s.name);
    const data = { ...formAds, stores_names };

    if (editingAds) {
      updateAdsMutation.mutate({ id: editingAds.id, data });
    } else {
      createAdsMutation.mutate(data);
    }
  };

  const handleSubmitPromo = (e) => {
    e.preventDefault();
    const stores_names = stores.filter(s => formPromo.stores_ids.includes(s.id)).map(s => s.name);
    const data = { ...formPromo, stores_names };

    if (editingPromo) {
      updatePromoMutation.mutate({ id: editingPromo.id, data });
    } else {
      createPromoMutation.mutate(data);
    }
  };

  const handleEditAds = (piano) => {
    setFormAds({
      piattaforma: piano.piattaforma,
      stores_ids: piano.stores_ids || [],
      budget: piano.budget,
      percentuale_cofinanziamento: piano.percentuale_cofinanziamento,
      data_inizio: piano.data_inizio,
      data_fine: piano.data_fine,
      note: piano.note || ''
    });
    setEditingAds(piano);
    setShowFormAds(true);
  };

  const handleEditPromo = (piano) => {
    setFormPromo({
      piattaforma: piano.piattaforma,
      stores_ids: piano.stores_ids || [],
      prodotti_scontati: piano.prodotti_scontati || [],
      percentuale_sconto: piano.percentuale_sconto,
      data_inizio: piano.data_inizio,
      data_fine: piano.data_fine,
      note: piano.note || ''
    });
    setEditingPromo(piano);
    setShowFormPromo(true);
  };

  const toggleStore = (storeId, isAds = true) => {
    if (isAds) {
      setFormAds(prev => ({
        ...prev,
        stores_ids: prev.stores_ids.includes(storeId)
          ? prev.stores_ids.filter(id => id !== storeId)
          : [...prev.stores_ids, storeId]
      }));
    } else {
      setFormPromo(prev => ({
        ...prev,
        stores_ids: prev.stores_ids.includes(storeId)
          ? prev.stores_ids.filter(id => id !== storeId)
          : [...prev.stores_ids, storeId]
      }));
    }
  };

  const toggleAllStores = (isAds = true) => {
    const allStoreIds = stores.map(s => s.id);
    if (isAds) {
      const allSelected = formAds.stores_ids.length === allStoreIds.length;
      setFormAds(prev => ({ ...prev, stores_ids: allSelected ? [] : allStoreIds }));
    } else {
      const allSelected = formPromo.stores_ids.length === allStoreIds.length;
      setFormPromo(prev => ({ ...prev, stores_ids: allSelected ? [] : allStoreIds }));
    }
  };

  const aggiungiProdotto = () => {
    if (nuovoProdotto.trim()) {
      setFormPromo(prev => ({
        ...prev,
        prodotti_scontati: [...prev.prodotti_scontati, nuovoProdotto.trim()]
      }));
      setNuovoProdotto('');
    }
  };

  const rimuoviProdotto = (index) => {
    setFormPromo(prev => ({
      ...prev,
      prodotti_scontati: prev.prodotti_scontati.filter((_, i) => i !== index)
    }));
  };

  return (
    <ProtectedPage pageName="PianoQuarter">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
            Piano Quarter
          </h1>
          <p className="text-slate-500 mt-1">Gestione piani trimestrali di Ads e Promo</p>
        </div>

        {/* Tabs */}
        <NeumorphicCard className="p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('ads')}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'ads'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Euro className="w-5 h-5 inline mr-2" />
              Ads
            </button>
            <button
              onClick={() => setActiveTab('promo')}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'promo'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <TrendingDown className="w-5 h-5 inline mr-2" />
              Promo
            </button>
          </div>
        </NeumorphicCard>

        {/* Sezione Ads */}
        {activeTab === 'ads' && (
          <>
            <div className="flex justify-end">
              <NeumorphicButton
                onClick={() => setShowFormAds(true)}
                variant="primary"
                className="flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nuovo Piano Ads
              </NeumorphicButton>
            </div>

            {showFormAds && (
              <NeumorphicCard className="p-6">
                <h2 className="text-xl font-bold text-slate-700 mb-4">
                  {editingAds ? 'Modifica Piano Ads' : 'Nuovo Piano Ads'}
                </h2>
                <form onSubmit={handleSubmitAds} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Piattaforma</label>
                      <select
                        value={formAds.piattaforma}
                        onChange={(e) => setFormAds({ ...formAds, piattaforma: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                        required
                      >
                        <option value="Glovo">Glovo</option>
                        <option value="Deliveroo">Deliveroo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Budget (€)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formAds.budget}
                        onChange={(e) => setFormAds({ ...formAds, budget: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">% Cofinanziamento</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={formAds.percentuale_cofinanziamento}
                        onChange={(e) => setFormAds({ ...formAds, percentuale_cofinanziamento: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Data Inizio</label>
                      <input
                        type="date"
                        value={formAds.data_inizio}
                        onChange={(e) => setFormAds({ ...formAds, data_inizio: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Data Fine</label>
                      <input
                        type="date"
                        value={formAds.data_fine}
                        onChange={(e) => setFormAds({ ...formAds, data_fine: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-700">Locali di Riferimento</label>
                      <button
                        type="button"
                        onClick={() => toggleAllStores(true)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {formAds.stores_ids.length === stores.length ? 'Deseleziona Tutti' : 'Seleziona Tutti'}
                      </button>
                    </div>
                    <div className="neumorphic-pressed p-4 rounded-lg space-y-2 max-h-48 overflow-y-auto">
                      {stores.map(store => (
                        <label key={store.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={formAds.stores_ids.includes(store.id)}
                            onChange={() => toggleStore(store.id, true)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-slate-700">{store.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
                    <textarea
                      value={formAds.note}
                      onChange={(e) => setFormAds({ ...formAds, note: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                      rows="3"
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <NeumorphicButton type="button" onClick={resetFormAds}>
                      Annulla
                    </NeumorphicButton>
                    <NeumorphicButton type="submit" variant="primary">
                      {editingAds ? 'Aggiorna' : 'Crea'}
                    </NeumorphicButton>
                  </div>
                </form>
              </NeumorphicCard>
            )}

            <div className="space-y-4">
              {pianiAds.map(piano => (
                <NeumorphicCard key={piano.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg font-medium text-sm">
                          {piano.piattaforma}
                        </span>
                        <span className="text-sm text-slate-500">
                          {format(parseISO(piano.data_inizio), 'dd MMM yyyy', { locale: it })} - {format(parseISO(piano.data_fine), 'dd MMM yyyy', { locale: it })}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-slate-500">Budget</p>
                          <p className="text-lg font-bold text-slate-700">€{piano.budget}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Cofinanziamento</p>
                          <p className="text-lg font-bold text-green-600">{piano.percentuale_cofinanziamento}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Locali</p>
                          <p className="text-sm font-medium text-slate-700">{piano.stores_names?.join(', ') || 'N/A'}</p>
                        </div>
                      </div>
                      {piano.note && (
                        <p className="text-sm text-slate-600 mt-2">{piano.note}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditAds(piano)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Eliminare questo piano ads?')) {
                            deleteAdsMutation.mutate(piano.id);
                          }
                        }}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </NeumorphicCard>
              ))}

              {pianiAds.length === 0 && !showFormAds && (
                <div className="text-center py-12 text-slate-500">
                  Nessun piano ads creato
                </div>
              )}
            </div>
          </>
        )}

        {/* Sezione Promo */}
        {activeTab === 'promo' && (
          <>
            <div className="flex justify-end">
              <NeumorphicButton
                onClick={() => setShowFormPromo(true)}
                variant="primary"
                className="flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nuova Promo
              </NeumorphicButton>
            </div>

            {showFormPromo && (
              <NeumorphicCard className="p-6">
                <h2 className="text-xl font-bold text-slate-700 mb-4">
                  {editingPromo ? 'Modifica Promo' : 'Nuova Promo'}
                </h2>
                <form onSubmit={handleSubmitPromo} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Piattaforma</label>
                      <select
                        value={formPromo.piattaforma}
                        onChange={(e) => setFormPromo({ ...formPromo, piattaforma: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                        required
                      >
                        <option value="Glovo">Glovo</option>
                        <option value="Deliveroo">Deliveroo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">% Sconto</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={formPromo.percentuale_sconto}
                        onChange={(e) => setFormPromo({ ...formPromo, percentuale_sconto: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Data Inizio</label>
                      <input
                        type="date"
                        value={formPromo.data_inizio}
                        onChange={(e) => setFormPromo({ ...formPromo, data_inizio: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Data Fine</label>
                      <input
                        type="date"
                        value={formPromo.data_fine}
                        onChange={(e) => setFormPromo({ ...formPromo, data_fine: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-700">Locali di Riferimento</label>
                      <button
                        type="button"
                        onClick={() => toggleAllStores(false)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {formPromo.stores_ids.length === stores.length ? 'Deseleziona Tutti' : 'Seleziona Tutti'}
                      </button>
                    </div>
                    <div className="neumorphic-pressed p-4 rounded-lg space-y-2 max-h-48 overflow-y-auto">
                      {stores.map(store => (
                        <label key={store.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={formPromo.stores_ids.includes(store.id)}
                            onChange={() => toggleStore(store.id, false)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-slate-700">{store.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Prodotti in Sconto</label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={nuovoProdotto}
                        onChange={(e) => setNuovoProdotto(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            aggiungiProdotto();
                          }
                        }}
                        placeholder="Nome prodotto..."
                        className="flex-1 neumorphic-pressed px-4 py-2 rounded-lg"
                      />
                      <NeumorphicButton type="button" onClick={aggiungiProdotto}>
                        <Plus className="w-4 h-4" />
                      </NeumorphicButton>
                    </div>
                    <div className="neumorphic-pressed p-3 rounded-lg space-y-2">
                      {formPromo.prodotti_scontati.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-2">Nessun prodotto aggiunto</p>
                      )}
                      {formPromo.prodotti_scontati.map((prodotto, index) => (
                        <div key={index} className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg">
                          <span className="text-sm text-slate-700">{prodotto}</span>
                          <button
                            type="button"
                            onClick={() => rimuoviProdotto(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
                    <textarea
                      value={formPromo.note}
                      onChange={(e) => setFormPromo({ ...formPromo, note: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
                      rows="3"
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <NeumorphicButton type="button" onClick={resetFormPromo}>
                      Annulla
                    </NeumorphicButton>
                    <NeumorphicButton type="submit" variant="primary">
                      {editingPromo ? 'Aggiorna' : 'Crea'}
                    </NeumorphicButton>
                  </div>
                </form>
              </NeumorphicCard>
            )}

            <div className="space-y-4">
              {pianiPromo.map(piano => (
                <NeumorphicCard key={piano.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-lg font-medium text-sm">
                          {piano.piattaforma}
                        </span>
                        <span className="text-sm text-slate-500">
                          {format(parseISO(piano.data_inizio), 'dd MMM yyyy', { locale: it })} - {format(parseISO(piano.data_fine), 'dd MMM yyyy', { locale: it })}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-slate-500">Sconto</p>
                          <p className="text-lg font-bold text-orange-600">{piano.percentuale_sconto}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Prodotti</p>
                          <p className="text-sm font-medium text-slate-700">{piano.prodotti_scontati?.length || 0} prodotti</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Locali</p>
                          <p className="text-sm font-medium text-slate-700">{piano.stores_names?.join(', ') || 'N/A'}</p>
                        </div>
                      </div>
                      {piano.prodotti_scontati && piano.prodotti_scontati.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-slate-500 mb-2">Prodotti in sconto:</p>
                          <div className="flex flex-wrap gap-2">
                            {piano.prodotti_scontati.map((prod, idx) => (
                              <span key={idx} className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs">
                                {prod}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {piano.note && (
                        <p className="text-sm text-slate-600 mt-2">{piano.note}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditPromo(piano)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Eliminare questa promo?')) {
                            deletePromoMutation.mutate(piano.id);
                          }
                        }}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </NeumorphicCard>
              ))}

              {pianiPromo.length === 0 && !showFormPromo && (
                <div className="text-center py-12 text-slate-500">
                  Nessuna promo creata
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedPage>
  );
}