import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Truck,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Phone,
  Mail,
  MapPin,
  Clock,
  Package,
  CheckCircle,
  Euro
} from 'lucide-react';
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";
import {
  Truck,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Phone,
  Mail,
  MapPin,
  Clock,
  Package,
  CheckCircle,
  Euro
} from 'lucide-react';
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";

export default function FornitoriContent() {
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    ragione_sociale: '',
    partita_iva: '',
    sede_legale: '',
    categorie_fornitore: [],
    giorni_consegna: [],
    tempo_consegna_giorni: '',
    metodologia_ricezione_ordine: 'Email',
    ordine_minimo: '',
    contatto_email: '',
    contatto_telefono: '',
    referente_nome: '',
    note: '',
    attivo: true
  });

  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['fornitori'],
    queryFn: () => base44.entities.Fornitore.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Fornitore.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornitori'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Fornitore.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornitori'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Fornitore.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornitori'] });
    },
  });

  const resetForm = () => {
    setFormData({
      ragione_sociale: '',
      partita_iva: '',
      sede_legale: '',
      categorie_fornitore: [],
      giorni_consegna: [],
      tempo_consegna_giorni: '',
      metodologia_ricezione_ordine: 'Email',
      ordine_minimo: '',
      contatto_email: '',
      contatto_telefono: '',
      referente_nome: '',
      note: '',
      attivo: true
    });
    setEditingSupplier(null);
    setShowForm(false);
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    const categorie = supplier.categorie_fornitore || (supplier.tipo_fornitore ? [supplier.tipo_fornitore] : []);
    setFormData({
      ragione_sociale: supplier.ragione_sociale,
      partita_iva: supplier.partita_iva || '',
      sede_legale: supplier.sede_legale || '',
      categorie_fornitore: categorie,
      giorni_consegna: supplier.giorni_consegna || [],
      tempo_consegna_giorni: supplier.tempo_consegna_giorni || '',
      metodologia_ricezione_ordine: supplier.metodologia_ricezione_ordine || 'Email',
      ordine_minimo: supplier.ordine_minimo || '',
      contatto_email: supplier.contatto_email || '',
      contatto_telefono: supplier.contatto_telefono || '',
      referente_nome: supplier.referente_nome || '',
      note: supplier.note || '',
      attivo: supplier.attivo !== false
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      tempo_consegna_giorni: formData.tempo_consegna_giorni ? parseInt(formData.tempo_consegna_giorni) : null,
      ordine_minimo: formData.ordine_minimo ? parseFloat(formData.ordine_minimo) : null,
      tipo_fornitore: formData.categorie_fornitore.length > 0 ? formData.categorie_fornitore[0] : 'altro'
    };

    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Sei sicuro di voler eliminare questo fornitore?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      giorni_consegna: prev.giorni_consegna.includes(day)
        ? prev.giorni_consegna.filter(d => d !== day)
        : [...prev.giorni_consegna, day]
    }));
  };

  const handleCategoriaToggle = (categoria) => {
    setFormData(prev => ({
      ...prev,
      categorie_fornitore: prev.categorie_fornitore.includes(categoria)
        ? prev.categorie_fornitore.filter(c => c !== categoria)
        : [...prev.categorie_fornitore, categoria]
    }));
  };

  const tipoFornitoreLabels = {
    food: 'Food',
    beverage: 'Beverage',
    consumabili: 'Consumabili',
    freschi: 'Freschi',
    latticini: 'Latticini',
    dolci: 'Dolci',
    pulizia: 'Pulizia',
    packaging: 'Packaging',
    altro: 'Altro'
  };

  const giornoLabels = {
    lunedi: 'Lun',
    martedi: 'Mar',
    mercoledi: 'Mer',
    giovedi: 'Gio',
    venerdi: 'Ven',
    sabato: 'Sab',
    domenica: 'Dom'
  };

  const suppliersByType = suppliers.reduce((acc, supplier) => {
    const categorie = supplier.categorie_fornitore && supplier.categorie_fornitore.length > 0 
      ? supplier.categorie_fornitore 
      : [supplier.tipo_fornitore || 'altro'];
    
    categorie.forEach(type => {
      if (!acc[type]) acc[type] = [];
      if (!acc[type].find(s => s.id === supplier.id)) {
        acc[type].push(supplier);
      }
    });
    return acc;
  }, {});
  
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <NeumorphicCard className="p-4">
          <div className="text-center">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
              <Truck className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">{suppliers.length}</h3>
            <p className="text-xs text-slate-500">Totali</p>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-4">
          <div className="text-center">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
              <CheckCircle className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <h3 className="text-xl lg:text-2xl font-bold text-green-600 mb-1">
              {suppliers.filter(s => s.attivo !== false).length}
            </h3>
            <p className="text-xs text-slate-500">Attivi</p>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-4">
          <div className="text-center">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <h3 className="text-xl lg:text-2xl font-bold text-purple-600 mb-1">
              {Object.keys(suppliersByType).length}
            </h3>
            <p className="text-xs text-slate-500">Categorie</p>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-4">
          <div className="text-center">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
              <Mail className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <h3 className="text-xl lg:text-2xl font-bold text-yellow-600 mb-1">
              {suppliers.filter(s => s.contatto_email).length}
            </h3>
            <p className="text-xs text-slate-500">Con Email</p>
          </div>
        </NeumorphicCard>
      </div>

      <div className="flex justify-end">
        <NeumorphicButton
          onClick={() => setShowForm(true)}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Aggiungi</span>
        </NeumorphicButton>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
          <NeumorphicCard className="w-full lg:max-w-3xl max-h-[90vh] overflow-y-auto p-4 lg:p-6 rounded-t-3xl lg:rounded-2xl">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#e0e5ec] z-10 pb-4">
              <h2 className="text-2xl font-bold text-[#6b6b6b]">
                {editingSupplier ? 'Modifica Fornitore' : 'Nuovo Fornitore'}
              </h2>
              <button
                onClick={resetForm}
                className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <X className="w-5 h-5 text-[#9b9b9b]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="neumorphic-flat p-5 rounded-xl">
                <h3 className="font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#8b7355]" />
                  Anagrafica
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Ragione Sociale <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.ragione_sociale}
                      onChange={(e) => setFormData({ ...formData, ragione_sociale: e.target.value })}
                      placeholder="es. Molino Rossi S.r.l."
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Partita IVA
                      </label>
                      <input
                        type="text"
                        value={formData.partita_iva}
                        onChange={(e) => setFormData({ ...formData, partita_iva: e.target.value })}
                        placeholder="es. IT12345678901"
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Categorie Fornitore <span className="text-red-600">*</span>
                      </label>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                        {Object.entries(tipoFornitoreLabels).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleCategoriaToggle(key)}
                            className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                              formData.categorie_fornitore.includes(key)
                                ? 'neumorphic-pressed text-[#8b7355]'
                                : 'neumorphic-flat text-[#9b9b9b]'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Seleziona una o più categorie</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Sede Legale
                    </label>
                    <input
                      type="text"
                      value={formData.sede_legale}
                      onChange={(e) => setFormData({ ...formData, sede_legale: e.target.value })}
                      placeholder="es. Via Roma 123, Milano"
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="neumorphic-flat p-5 rounded-xl">
                <h3 className="font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#8b7355]" />
                  Dettagli Fornitore
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Giorni di Consegna
                    </label>
                    <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                      {Object.entries(giornoLabels).map(([day, label]) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleDayToggle(day)}
                          className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                            formData.giorni_consegna.includes(day)
                              ? 'neumorphic-pressed text-[#8b7355]'
                              : 'neumorphic-flat text-[#9b9b9b]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Tempo di Consegna (giorni)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.tempo_consegna_giorni}
                        onChange={(e) => setFormData({ ...formData, tempo_consegna_giorni: e.target.value })}
                        placeholder="es. 3"
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Metodologia Ricezione Ordine
                      </label>
                      <select
                        value={formData.metodologia_ricezione_ordine}
                        onChange={(e) => setFormData({ ...formData, metodologia_ricezione_ordine: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      >
                        <option value="Email">Email</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Marketplace">Marketplace</option>
                        <option value="Invio File dedicato">Invio File dedicato</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                      <Euro className="w-4 h-4" />
                      Ordine Minimo (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.ordine_minimo}
                      onChange={(e) => setFormData({ ...formData, ordine_minimo: e.target.value })}
                      placeholder="es. 50.00"
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="neumorphic-flat p-5 rounded-xl">
                <h3 className="font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-[#8b7355]" />
                  Contatti
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Nome Referente
                    </label>
                    <input
                      type="text"
                      value={formData.referente_nome}
                      onChange={(e) => setFormData({ ...formData, referente_nome: e.target.value })}
                      placeholder="es. Mario Rossi"
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.contatto_email}
                        onChange={(e) => setFormData({ ...formData, contatto_email: e.target.value })}
                        placeholder="es. ordini@fornitore.it"
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Telefono
                      </label>
                      <input
                        type="tel"
                        value={formData.contatto_telefono}
                        onChange={(e) => setFormData({ ...formData, contatto_telefono: e.target.value })}
                        placeholder="es. +39 02 1234567"
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Note
                    </label>
                    <textarea
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      placeholder="Note aggiuntive..."
                      rows={3}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="attivo"
                  checked={formData.attivo}
                  onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="attivo" className="text-sm font-medium text-[#6b6b6b]">
                  Fornitore attivo (visibile nei prodotti)
                </label>
              </div>

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
                  {editingSupplier ? 'Aggiorna' : 'Salva'}
                </NeumorphicButton>
              </div>
            </form>
          </NeumorphicCard>
        </div>
      )}

      {isLoading ? (
        <NeumorphicCard className="p-12 text-center">
          <p className="text-slate-500">Caricamento...</p>
        </NeumorphicCard>
      ) : suppliers.length === 0 ? (
        <NeumorphicCard className="p-12 text-center">
          <Truck className="w-16 h-16 text-slate-300 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">Nessun fornitore</h3>
          <p className="text-slate-500 mb-4">Inizia aggiungendo il primo fornitore</p>
        </NeumorphicCard>
      ) : (
        <NeumorphicCard className="p-4 lg:p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 lg:mb-6">
            Tutti i Fornitori
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({suppliers.length})
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
            {suppliers.map((supplier) => {
              const categorie = supplier.categorie_fornitore && supplier.categorie_fornitore.length > 0 
                ? supplier.categorie_fornitore 
                : (supplier.tipo_fornitore ? [supplier.tipo_fornitore] : []);
              
              return (
                <div key={supplier.id} className="neumorphic-pressed p-3 lg:p-4 rounded-xl">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 mb-1 text-sm lg:text-base truncate">{supplier.ragione_sociale}</h3>
                      {supplier.partita_iva && (
                        <p className="text-xs text-slate-500 truncate">P.IVA: {supplier.partita_iva}</p>
                      )}
                    </div>
                    {supplier.attivo !== false ? (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 whitespace-nowrap ml-2">
                        ATTIVO
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 whitespace-nowrap ml-2">
                        INATTIVO
                      </span>
                    )}
                  </div>

                  {categorie.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {categorie.map(cat => (
                        <span key={cat} className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          {tipoFornitoreLabels[cat] || cat}
                        </span>
                      ))}
                    </div>
                  )}

                  {supplier.sede_legale && (
                    <div className="flex items-start gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-700 break-words">{supplier.sede_legale}</p>
                    </div>
                  )}

                  <div className="space-y-2 mb-3">
                    {supplier.contatto_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <p className="text-sm text-slate-700 truncate">{supplier.contatto_email}</p>
                      </div>
                    )}
                    {supplier.contatto_telefono && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <p className="text-sm text-slate-700">{supplier.contatto_telefono}</p>
                      </div>
                    )}
                  </div>

                  {supplier.giorni_consegna && supplier.giorni_consegna.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-slate-500 mb-1">Giorni consegna:</p>
                      <div className="flex flex-wrap gap-1">
                        {supplier.giorni_consegna.map(day => (
                          <span key={day} className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {giornoLabels[day]}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {supplier.tempo_consegna_giorni && (
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <p className="text-sm text-slate-700">Consegna in {supplier.tempo_consegna_giorni}gg</p>
                    </div>
                  )}

                  {supplier.ordine_minimo && (
                    <div className="flex items-center gap-2 mb-3">
                      <Euro className="w-4 h-4 text-slate-400" />
                      <p className="text-sm text-slate-700">Ordine min. €{supplier.ordine_minimo.toFixed(2)}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-3 border-t border-slate-300">
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="flex-1 nav-button px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">Modifica</span>
                    </button>
                    <button
                      onClick={() => handleDelete(supplier.id)}
                      className="flex-1 nav-button px-3 py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-600">Elimina</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </NeumorphicCard>
      )}
    </div>
  );
}