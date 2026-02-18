import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LinkIcon, Plus, Trash2, Save, Search } from "lucide-react";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function MappingProdottiVenduti() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  const [formData, setFormData] = useState({
    flavor_prodotto_venduto: '',
    materia_prima_id: '',
    attivo: true
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ['prodotto-venduto-mappings'],
    queryFn: () => base44.entities.ProdottoVendutoMapping.list()
  });

  const { data: materiePrime = [] } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list()
  });

  const { data: prodottiVenduti = [] } = useQuery({
    queryKey: ['prodotti-venduti'],
    queryFn: () => base44.entities.ProdottiVenduti.list('-data_vendita', 5000)
  });

  // Get unique flavors
  const uniqueFlavors = React.useMemo(() => {
    const flavors = new Set();
    prodottiVenduti.forEach(p => {
      if (p.flavor) flavors.add(p.flavor);
    });
    return Array.from(flavors).sort();
  }, [prodottiVenduti]);

  // Get unmapped flavors
  const unmappedFlavors = React.useMemo(() => {
    const mappedFlavors = new Set(mappings.map(m => m.flavor_prodotto_venduto));
    return uniqueFlavors.filter(f => !mappedFlavors.has(f));
  }, [uniqueFlavors, mappings]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProdottoVendutoMapping.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prodotto-venduto-mappings'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProdottoVendutoMapping.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prodotto-venduto-mappings'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProdottoVendutoMapping.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prodotto-venduto-mappings'] });
    }
  });

  const resetForm = () => {
    setFormData({ flavor_prodotto_venduto: '', materia_prima_id: '', attivo: true });
    setEditingMapping(null);
    setShowForm(false);
  };

  const handleSubmit = () => {
    if (!formData.flavor_prodotto_venduto || !formData.materia_prima_id) return;

    const materiaPrima = materiePrime.find(mp => mp.id === formData.materia_prima_id);
    const dataToSubmit = {
      ...formData,
      materia_prima_nome: materiaPrima?.nome_prodotto || '',
      nome_interno: materiaPrima?.nome_interno || ''
    };

    if (editingMapping) {
      updateMutation.mutate({ id: editingMapping.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const handleEdit = (mapping) => {
    setEditingMapping(mapping);
    setFormData({
      flavor_prodotto_venduto: mapping.flavor_prodotto_venduto,
      materia_prima_id: mapping.materia_prima_id,
      attivo: mapping.attivo ?? true
    });
    setShowForm(true);
  };

  const filteredMappings = mappings.filter(m => 
    m.flavor_prodotto_venduto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.nome_interno?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <LinkIcon className="w-10 h-10 text-blue-600" />
          <h1 className="text-3xl font-bold">Mapping Prodotti Venduti</h1>
        </div>
        <p className="text-slate-600">
          Collega i prodotti venduti alle materie prime per calcolare correttamente i risparmi
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NeumorphicCard className="p-6 text-center">
          <h3 className="text-3xl font-bold text-blue-600 mb-2">{mappings.length}</h3>
          <p className="text-sm text-slate-600">Mapping Configurati</p>
        </NeumorphicCard>
        <NeumorphicCard className="p-6 text-center">
          <h3 className="text-3xl font-bold text-green-600 mb-2">{uniqueFlavors.length}</h3>
          <p className="text-sm text-slate-600">Prodotti Totali</p>
        </NeumorphicCard>
        <NeumorphicCard className="p-6 text-center">
          <h3 className="text-3xl font-bold text-orange-600 mb-2">{unmappedFlavors.length}</h3>
          <p className="text-sm text-slate-600">Non Mappati</p>
        </NeumorphicCard>
      </div>

      {/* Unmapped Products Alert */}
      {unmappedFlavors.length > 0 && (
        <NeumorphicCard className="p-4 border-l-4 border-orange-500">
          <h3 className="font-bold text-orange-700 mb-2">⚠️ Prodotti non mappati ({unmappedFlavors.length})</h3>
          <div className="flex flex-wrap gap-2">
            {unmappedFlavors.slice(0, 10).map(flavor => (
              <button
                key={flavor}
                onClick={() => {
                  setFormData({ ...formData, flavor_prodotto_venduto: flavor });
                  setShowForm(true);
                }}
                className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-sm hover:bg-orange-200 transition-colors"
              >
                + {flavor}
              </button>
            ))}
            {unmappedFlavors.length > 10 && (
              <span className="text-sm text-slate-500">... e altri {unmappedFlavors.length - 10}</span>
            )}
          </div>
        </NeumorphicCard>
      )}

      {/* Add Button */}
      <div className="flex justify-end">
        <NeumorphicButton
          onClick={() => setShowForm(!showForm)}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuovo Mapping
        </NeumorphicButton>
      </div>

      {/* Form */}
      {showForm && (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-700 mb-4">
            {editingMapping ? 'Modifica Mapping' : 'Nuovo Mapping'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Prodotto Venduto (Flavor)
              </label>
              <select
                value={formData.flavor_prodotto_venduto}
                onChange={(e) => setFormData({ ...formData, flavor_prodotto_venduto: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-2 rounded-xl"
              >
                <option value="">Seleziona prodotto...</option>
                {uniqueFlavors.map(flavor => (
                  <option key={flavor} value={flavor}>{flavor}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Materia Prima
              </label>
              <select
                value={formData.materia_prima_id}
                onChange={(e) => setFormData({ ...formData, materia_prima_id: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-2 rounded-xl"
              >
                <option value="">Seleziona materia prima...</option>
                {materiePrime.map(mp => (
                  <option key={mp.id} value={mp.id}>
                    {mp.nome_prodotto} ({mp.nome_interno})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.attivo}
                onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm text-slate-600">Attivo</label>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <NeumorphicButton onClick={handleSubmit} variant="primary">
              <Save className="w-4 h-4 mr-2" />
              Salva
            </NeumorphicButton>
            <NeumorphicButton onClick={resetForm}>
              Annulla
            </NeumorphicButton>
          </div>
        </NeumorphicCard>
      )}

      {/* Search */}
      <NeumorphicCard className="p-4">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca mapping..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 neumorphic-pressed px-4 py-2 rounded-xl outline-none"
          />
        </div>
      </NeumorphicCard>

      {/* Mappings List */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-slate-700 mb-4">Mapping Configurati</h2>
        {filteredMappings.length === 0 ? (
          <p className="text-center text-slate-400 py-8">Nessun mapping configurato</p>
        ) : (
          <div className="space-y-3">
            {filteredMappings.map(mapping => (
              <div key={mapping.id} className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-slate-700">{mapping.flavor_prodotto_venduto}</h3>
                      {!mapping.attivo && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full">
                          Inattivo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <LinkIcon className="w-4 h-4" />
                      <span>{mapping.materia_prima_nome}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-blue-600 font-medium">{mapping.nome_interno}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(mapping)}
                      className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Modifica"
                    >
                      <Save className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Eliminare questo mapping?')) {
                          deleteMutation.mutate(mapping.id);
                        }
                      }}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      title="Elimina"
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
    </div>
  );
}