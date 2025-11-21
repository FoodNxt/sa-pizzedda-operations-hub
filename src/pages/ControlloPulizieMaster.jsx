import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  CheckSquare,
  Camera,
  GripVertical,
  AlertCircle
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function ControlloPulizieMaster() {
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all'); // NEW: Role filter
  const [formData, setFormData] = useState({
    testo_domanda: '',
    tipo_controllo: 'multipla',
    attrezzatura: '',
    opzioni_risposta: [''],
    risposta_corretta: '',
    ruoli_assegnati: [],
    store_ids: [],
    ordine: 0,
    obbligatoria: true,
    attiva: true
  });

  const queryClient = useQueryClient();

  const { data: domande = [], isLoading } = useQuery({
    queryKey: ['domande-pulizia'],
    queryFn: () => base44.entities.DomandaPulizia.list('ordine'),
  });

  // NEW: Load stores for store selection
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DomandaPulizia.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domande-pulizia'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DomandaPulizia.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domande-pulizia'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DomandaPulizia.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domande-pulizia'] });
    },
  });

  const resetForm = () => {
    setFormData({
      testo_domanda: '',
      tipo_controllo: 'multipla',
      attrezzatura: '',
      opzioni_risposta: [''],
      risposta_corretta: '',
      ruoli_assegnati: [],
      store_ids: [],
      ordine: 0,
      obbligatoria: true,
      attiva: true
    });
    setEditingQuestion(null);
    setShowForm(false);
  };

  const handleEdit = (domanda) => {
    setEditingQuestion(domanda);
    setFormData({
      testo_domanda: domanda.testo_domanda || '',
      tipo_controllo: domanda.tipo_controllo,
      attrezzatura: domanda.attrezzatura || '',
      opzioni_risposta: domanda.opzioni_risposta || [''],
      risposta_corretta: domanda.risposta_corretta || '',
      ruoli_assegnati: domanda.ruoli_assegnati || [],
      store_ids: domanda.store_ids || [],
      ordine: domanda.ordine || 0,
      obbligatoria: domanda.obbligatoria !== false,
      attiva: domanda.attiva !== false
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let dataToSubmit = { ...formData }; // Create a mutable copy

    // FIXED: Different validation for foto vs multipla
    if (dataToSubmit.tipo_controllo === 'foto') {
      if (!dataToSubmit.attrezzatura.trim()) {
        alert("Specifica l'attrezzatura da fotografare");
        return;
      }
      // For foto type, set testo_domanda = attrezzatura if empty
      if (!dataToSubmit.testo_domanda.trim()) {
        dataToSubmit.testo_domanda = `Foto: ${dataToSubmit.attrezzatura}`;
      }
    } else {
      // multipla
      if (!dataToSubmit.testo_domanda.trim()) {
        alert('Inserisci il testo della domanda');
        return;
      }
      const opzioniValide = dataToSubmit.opzioni_risposta.filter(o => o.trim());
      if (opzioniValide.length < 2) {
        alert('Aggiungi almeno 2 opzioni di risposta');
        return;
      }
      dataToSubmit.opzioni_risposta = opzioniValide;
    }

    if (dataToSubmit.ruoli_assegnati.length === 0) {
      alert('Seleziona almeno un ruolo');
      return;
    }

    const finalData = {
      ...dataToSubmit,
      ordine: parseInt(dataToSubmit.ordine) || 0
    };

    if (editingQuestion) {
      updateMutation.mutate({ id: editingQuestion.id, data: finalData });
    } else {
      createMutation.mutate(finalData);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Sei sicuro di voler eliminare questa domanda?')) {
      deleteMutation.mutate(id);
    }
  };

  const toggleRuolo = (ruolo) => {
    setFormData(prev => ({
      ...prev,
      ruoli_assegnati: prev.ruoli_assegnati.includes(ruolo)
        ? prev.ruoli_assegnati.filter(r => r !== ruolo)
        : [...prev.ruoli_assegnati, ruolo]
    }));
  };

  const toggleStore = (storeId) => {
    setFormData(prev => ({
      ...prev,
      store_ids: prev.store_ids.includes(storeId)
        ? prev.store_ids.filter(s => s !== storeId)
        : [...prev.store_ids, storeId]
    }));
  };

  const addOpzione = () => {
    setFormData(prev => ({
      ...prev,
      opzioni_risposta: [...prev.opzioni_risposta, '']
    }));
  };

  const updateOpzione = (index, value) => {
    setFormData(prev => ({
      ...prev,
      opzioni_risposta: prev.opzioni_risposta.map((o, i) => i === index ? value : o)
    }));
  };

  const removeOpzione = (index) => {
    if (formData.opzioni_risposta.length > 1) {
      setFormData(prev => ({
        ...prev,
        opzioni_risposta: prev.opzioni_risposta.filter((_, i) => i !== index)
      }));
    }
  };

  const getRuoloBadgeColor = (ruolo) => {
    switch(ruolo) {
      case 'Cassiere': return 'bg-blue-100 text-blue-700';
      case 'Pizzaiolo': return 'bg-orange-100 text-orange-700';
      case 'Store Manager': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // NEW: Filter domande by role
  const filteredDomande = roleFilter === 'all' 
    ? domande 
    : domande.filter(d => d.ruoli_assegnati?.includes(roleFilter));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <CheckSquare className="w-10 h-10 text-[#8b7355]" />
              <h1 className="text-3xl font-bold text-[#6b6b6b]">Controllo Pulizie Master</h1>
            </div>
            <p className="text-[#9b9b9b]">Gestisci domande e controlli per i form di pulizia</p>
          </div>
          <NeumorphicButton
            onClick={() => setShowForm(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuova Domanda
          </NeumorphicButton>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <CheckSquare className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{domande.length}</h3>
          <p className="text-sm text-[#9b9b9b]">Domande Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <CheckSquare className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-blue-600 mb-1">
            {domande.filter(d => d.ruoli_assegnati?.includes('Cassiere')).length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Cassiere</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <CheckSquare className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-3xl font-bold text-orange-600 mb-1">
            {domande.filter(d => d.ruoli_assegnati?.includes('Pizzaiolo')).length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Pizzaiolo</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <CheckSquare className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-3xl font-bold text-purple-600 mb-1">
            {domande.filter(d => d.ruoli_assegnati?.includes('Store Manager')).length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Store Manager</p>
        </NeumorphicCard>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6 my-8">
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#e0e5ec] z-10 pb-4">
                <h2 className="text-2xl font-bold text-[#6b6b6b]">
                  {editingQuestion ? 'Modifica Domanda' : 'Nuova Domanda'}
                </h2>
                <button
                  onClick={resetForm}
                  className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <X className="w-5 h-5 text-[#9b9b9b]" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tipo Controllo */}
                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-3 block">
                    Tipo di Controllo <span className="text-red-600">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipo_controllo: 'multipla' })}
                      className={`neumorphic-flat p-4 rounded-xl flex items-center gap-3 transition-all ${
                        formData.tipo_controllo === 'multipla'
                          ? 'border-2 border-[#8b7355]'
                          : ''
                      }`}
                    >
                      <CheckSquare className={`w-6 h-6 ${formData.tipo_controllo === 'multipla' ? 'text-[#8b7355]' : 'text-[#9b9b9b]'}`} />
                      <div className="text-left">
                        <p className="font-bold text-[#6b6b6b]">Risposta Multipla</p>
                        <p className="text-xs text-[#9b9b9b]">Domanda con opzioni</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipo_controllo: 'foto' })}
                      className={`neumorphic-flat p-4 rounded-xl flex items-center gap-3 transition-all ${
                        formData.tipo_controllo === 'foto'
                          ? 'border-2 border-[#8b7355]'
                          : ''
                      }`}
                    >
                      <Camera className={`w-6 h-6 ${formData.tipo_controllo === 'foto' ? 'text-[#8b7355]' : 'text-[#9b9b9b]'}`} />
                      <div className="text-left">
                        <p className="font-bold text-[#6b6b6b]">Foto Attrezzatura</p>
                        <p className="text-xs text-[#9b9b9b]">Carica una foto</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* UPDATED: Conditional input based on tipo_controllo */}
                {formData.tipo_controllo === 'foto' ? (
                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Nome Attrezzatura <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.attrezzatura}
                      onChange={(e) => setFormData({ ...formData, attrezzatura: e.target.value })}
                      placeholder="es. Forno, Frigo, Lavandino..."
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                    />
                    <p className="text-xs text-[#9b9b9b] mt-2">
                      💡 Specifica quale attrezzatura va fotografata
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Testo Domanda <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.testo_domanda}
                      onChange={(e) => setFormData({ ...formData, testo_domanda: e.target.value })}
                      placeholder="es. La pulizia dei pavimenti è soddisfacente?"
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                    />
                  </div>
                )}

                {/* Opzioni Risposta (solo per multipla) */}
                {formData.tipo_controllo === 'multipla' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-[#6b6b6b]">
                        Opzioni di Risposta <span className="text-red-600">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={addOpzione}
                        className="neumorphic-flat px-3 py-1 rounded-lg text-xs text-[#8b7355] flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Aggiungi
                      </button>
                    </div>
                    <div className="space-y-2">
                      {formData.opzioni_risposta.map((opzione, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opzione}
                            onChange={(e) => updateOpzione(index, e.target.value)}
                            placeholder={`Opzione ${index + 1}`}
                            className="flex-1 neumorphic-pressed px-4 py-2 rounded-lg text-[#6b6b6b] outline-none"
                          />
                          {formData.opzioni_risposta.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeOpzione(index)}
                              className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4">
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Risposta Corretta
                      </label>
                      <select
                        value={formData.risposta_corretta}
                        onChange={(e) => setFormData({ ...formData, risposta_corretta: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      >
                        <option value="">Seleziona la risposta corretta...</option>
                        {formData.opzioni_risposta.filter(o => o.trim() !== '').map((opzione, index) => (
                          <option key={index} value={opzione}>{opzione}</option>
                        ))}
                      </select>
                      <p className="text-xs text-[#9b9b9b] mt-2">
                        💡 Seleziona quale dovrebbe essere la risposta corretta per questa domanda
                      </p>
                    </div>
                  </div>
                )}

                {/* Ruoli Assegnati */}
                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-3 block">
                    Assegna a Ruoli <span className="text-red-600">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Cassiere', 'Pizzaiolo', 'Store Manager'].map(ruolo => (
                      <div key={ruolo} className="neumorphic-pressed p-3 rounded-lg">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.ruoli_assegnati.includes(ruolo)}
                            onChange={() => toggleRuolo(ruolo)}
                            className="w-5 h-5 rounded"
                          />
                          <span className="text-sm font-medium text-[#6b6b6b]">{ruolo}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* NEW: Store Selection */}
                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-3 block">
                    Negozi (vuoto = tutti)
                  </label>
                  <div className="neumorphic-pressed p-4 rounded-xl max-h-48 overflow-y-auto">
                    {stores.length > 0 ? (
                      <div className="space-y-2">
                        {stores.map(store => (
                          <label key={store.id} className="flex items-center gap-2 cursor-pointer hover:bg-[#d5dae3] p-2 rounded">
                            <input
                              type="checkbox"
                              checked={formData.store_ids.includes(store.id)}
                              onChange={() => toggleStore(store.id)}
                              className="w-4 h-4 rounded"
                            />
                            <span className="text-sm text-[#6b6b6b]">{store.name}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#9b9b9b]">Nessun negozio disponibile</p>
                    )}
                  </div>
                  <p className="text-xs text-[#9b9b9b] mt-2">
                    💡 Se non selezioni nessun negozio, la domanda si applicherà a tutti
                  </p>
                </div>

                {/* Ordine & Flags */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Ordine (0 = inizio)
                    </label>
                    <input
                      type="number"
                      value={formData.ordine}
                      onChange={(e) => setFormData({ ...formData, ordine: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      min="0"
                    />
                  </div>

                  <div className="space-y-3 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.obbligatoria}
                        onChange={(e) => setFormData({ ...formData, obbligatoria: e.target.checked })}
                        className="w-5 h-5 rounded"
                      />
                      <span className="text-sm font-medium text-[#6b6b6b]">Obbligatoria</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.attiva}
                        onChange={(e) => setFormData({ ...formData, attiva: e.target.checked })}
                        className="w-5 h-5 rounded"
                      />
                      <span className="text-sm font-medium text-[#6b6b6b]">Attiva</span>
                    </label>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4 border-t border-[#c1c1c1]">
                  <NeumorphicButton
                    type="button"
                    onClick={resetForm}
                    className="flex-1"
                  >
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton
                    type="submit"
                    variant="primary"
                    className="flex-1 flex items-center justify-center gap-2"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <Save className="w-5 h-5" />
                    {editingQuestion ? 'Aggiorna' : 'Salva'}
                  </NeumorphicButton>
                </div>
              </form>
            </NeumorphicCard>
          </div>
        </div>
      )}

      {/* Domande List */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#6b6b6b]">Lista Domande</h2>
          
          {/* NEW: Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="neumorphic-pressed px-4 py-2 rounded-lg text-[#6b6b6b] outline-none"
          >
            <option value="all">Tutti i Ruoli</option>
            <option value="Cassiere">Cassiere</option>
            <option value="Pizzaiolo">Pizzaiolo</option>
            <option value="Store Manager">Store Manager</option>
          </select>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-[#9b9b9b]">Caricamento...</p>
          </div>
        ) : filteredDomande.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">
              {roleFilter === 'all' ? 'Nessuna domanda' : `Nessuna domanda per ${roleFilter}`}
            </h3>
            <p className="text-[#9b9b9b]">Inizia creando la prima domanda di controllo</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDomande.map((domanda) => (
              <div key={domanda.id} className="neumorphic-flat p-5 rounded-xl">
                <div className="flex items-start gap-4">
                  <div className="neumorphic-pressed p-2 rounded-lg cursor-move">
                    <GripVertical className="w-5 h-5 text-[#9b9b9b]" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {domanda.tipo_controllo === 'foto' ? (
                          <Camera className="w-6 h-6 text-[#8b7355]" />
                        ) : (
                          <CheckSquare className="w-6 h-6 text-[#8b7355]" />
                        )}
                        <div>
                          <h3 className="font-bold text-[#6b6b6b]">
                            {domanda.tipo_controllo === 'foto' 
                              ? `Foto: ${domanda.attrezzatura}` 
                              : domanda.testo_domanda}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-[#9b9b9b]">Ordine: {domanda.ordine}</span>
                            {domanda.obbligatoria && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Obbligatoria</span>
                            )}
                            {domanda.attiva === false && (
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Disattivata</span>
                            )}
                            {domanda.store_ids && domanda.store_ids.length > 0 && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                {domanda.store_ids.length} negozi
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(domanda)}
                          className="neumorphic-flat p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(domanda.id)}
                          className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>

                    {/* Opzioni (se multipla) */}
                    {domanda.tipo_controllo === 'multipla' && domanda.opzioni_risposta && (
                      <div className="neumorphic-pressed p-3 rounded-lg mb-3">
                        <p className="text-xs text-[#9b9b9b] mb-2">Opzioni:</p>
                        <div className="flex flex-wrap gap-2">
                          {domanda.opzioni_risposta.map((opzione, idx) => (
                            <span 
                              key={idx} 
                              className={`text-xs px-2 py-1 rounded-full ${
                                opzione === domanda.risposta_corretta 
                                  ? 'bg-green-100 text-green-700 font-bold' 
                                  : 'bg-blue-50 text-blue-700'
                              }`}
                            >
                              {opzione}
                              {opzione === domanda.risposta_corretta && ' ✓'}
                            </span>
                          ))}
                        </div>
                        {domanda.risposta_corretta && (
                          <div className="mt-2 pt-2 border-t border-[#d1d1d1]">
                            <p className="text-xs text-[#9b9b9b]">
                              Risposta corretta: <span className="font-bold text-green-700">{domanda.risposta_corretta}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ruoli */}
                    <div className="flex flex-wrap gap-2">
                      {domanda.ruoli_assegnati?.map((ruolo, idx) => (
                        <span key={idx} className={`text-xs px-3 py-1 rounded-full font-medium ${getRuoloBadgeColor(ruolo)}`}>
                          {ruolo}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </NeumorphicCard>

      {/* Info */}
      <NeumorphicCard className="p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">💡 Come funziona</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>Crea domande a <strong>risposta multipla</strong> o <strong>con foto</strong></li>
              <li>Assegna ogni domanda a uno o più ruoli (Cassiere, Pizzaiolo, Store Manager)</li>
              <li>Seleziona i negozi specifici o lascia vuoto per applicare a tutti</li>
              <li>Le domande appariranno automaticamente nei rispettivi form di controllo</li>
              <li>Usa l'<strong>ordine</strong> per definire la sequenza di visualizzazione</li>
              <li>Puoi disattivare temporaneamente una domanda senza eliminarla</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}