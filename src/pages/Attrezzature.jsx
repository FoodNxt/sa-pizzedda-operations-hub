import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { Package, Plus, Edit, Trash2, X, Save, Store, User } from 'lucide-react';

export default function Attrezzature() {
  const [showForm, setShowForm] = useState(false);
  const [editingAttrezzatura, setEditingAttrezzatura] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    stores_assegnati: [],
    ruolo_responsabile: '',
    attivo: true
  });

  const queryClient = useQueryClient();

  const { data: attrezzature = [] } = useQuery({
    queryKey: ['attrezzature'],
    queryFn: () => base44.entities.Attrezzatura.list(),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });



  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Attrezzatura.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attrezzature'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Attrezzatura.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attrezzature'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Attrezzatura.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attrezzature'] });
    },
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      stores_assegnati: [],
      ruolo_responsabile: '',
      attivo: true
    });
    setEditingAttrezzatura(null);
    setShowForm(false);
  };

  const handleEdit = (attrezzatura) => {
    setEditingAttrezzatura(attrezzatura);
    setFormData({
      nome: attrezzatura.nome || '',
      stores_assegnati: attrezzatura.stores_assegnati || [],
      ruolo_responsabile: attrezzatura.ruolo_responsabile || '',
      attivo: attrezzatura.attivo !== false
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingAttrezzatura) {
      updateMutation.mutate({ id: editingAttrezzatura.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleStore = (storeId) => {
    setFormData(prev => ({
      ...prev,
      stores_assegnati: prev.stores_assegnati.includes(storeId)
        ? prev.stores_assegnati.filter(id => id !== storeId)
        : [...prev.stores_assegnati, storeId]
    }));
  };

  const getStoreName = (storeId) => {
    return stores.find(s => s.id === storeId)?.name || storeId;
  };

  return (
    <ProtectedPage pageName="Attrezzature">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#6b6b6b] mb-1">Attrezzature</h1>
            <p className="text-[#9b9b9b]">Gestisci le attrezzature dei locali</p>
          </div>
          <NeumorphicButton
            onClick={() => setShowForm(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuova Attrezzatura
          </NeumorphicButton>
        </div>

        {/* Attrezzature List */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Elenco Attrezzature ({attrezzature.length})</h2>
          {attrezzature.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-[#9b9b9b]">Nessuna attrezzatura creata</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attrezzature.map((attrezzatura) => (
                <div
                  key={attrezzatura.id}
                  className={`neumorphic-pressed p-4 rounded-xl ${
                    attrezzatura.attivo === false ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-5 h-5 text-[#8b7355]" />
                        <h3 className="font-bold text-[#6b6b6b]">{attrezzatura.nome}</h3>
                        {attrezzatura.attivo === false && (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                            Disattivata
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(!attrezzatura.stores_assegnati || attrezzatura.stores_assegnati.length === 0) ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                            Tutti i locali
                          </span>
                        ) : (
                          attrezzatura.stores_assegnati.map((storeId) => (
                            <span
                              key={storeId}
                              className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700"
                            >
                              {getStoreName(storeId)}
                            </span>
                          ))
                        )}
                      </div>
                      {attrezzatura.ruolo_responsabile && (
                        <div className="flex items-center gap-1 text-sm text-[#8b7355]">
                          <User className="w-4 h-4" />
                          <span>Responsabile: <strong>{attrezzatura.ruolo_responsabile}</strong></span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(attrezzatura)}
                        className="neumorphic-flat p-2 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Eliminare questa attrezzatura?')) {
                            deleteMutation.mutate(attrezzatura.id);
                          }
                        }}
                        className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </NeumorphicCard>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full">
              <NeumorphicCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[#6b6b6b]">
                    {editingAttrezzatura ? 'Modifica Attrezzatura' : 'Nuova Attrezzatura'}
                  </h2>
                  <button onClick={resetForm} className="text-[#9b9b9b] hover:text-[#6b6b6b]">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Nome Attrezzatura <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      placeholder="Es: Forno, Impastatrice, Frigo..."
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      <Store className="w-4 h-4 inline mr-1" />
                      Locali (vuoto = tutti i locali)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {stores.map((store) => (
                        <button
                          key={store.id}
                          type="button"
                          onClick={() => toggleStore(store.id)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            formData.stores_assegnati.includes(store.id)
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                              : 'neumorphic-flat text-[#6b6b6b]'
                          }`}
                        >
                          {store.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      <User className="w-4 h-4 inline mr-1" />
                      Ruolo Responsabile Pulizia
                    </label>
                    <select
                      value={formData.ruolo_responsabile}
                      onChange={(e) => setFormData({ ...formData, ruolo_responsabile: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                    >
                      <option value="">Nessun ruolo responsabile</option>
                      <option value="Pizzaiolo">Pizzaiolo</option>
                      <option value="Cassiere">Cassiere</option>
                      <option value="Store Manager">Store Manager</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="attivo"
                      checked={formData.attivo}
                      onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <label htmlFor="attivo" className="text-sm font-medium text-[#6b6b6b]">
                      Attrezzatura Attiva
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <NeumorphicButton type="button" onClick={resetForm}>
                      Annulla
                    </NeumorphicButton>
                    <NeumorphicButton type="submit" variant="primary">
                      <Save className="w-5 h-5 inline mr-2" />
                      {editingAttrezzatura ? 'Aggiorna' : 'Crea'}
                    </NeumorphicButton>
                  </div>
                </form>
              </NeumorphicCard>
            </div>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}