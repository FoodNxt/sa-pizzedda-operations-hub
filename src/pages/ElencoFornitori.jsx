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
  Building2,
  Phone,
  Mail,
  Calendar,
  Clock,
  Package,
  CheckCircle,
  Search
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function ElencoFornitori() {
  const [showForm, setShowForm] = useState(false);
  const [editingFornitore, setEditingFornitore] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    ragione_sociale: '',
    partita_iva: '',
    sede_legale: '',
    tipo_fornitore: 'food',
    giorni_consegna: [],
    tempo_consegna_giorni: '',
    metodologia_ricezione_ordine: 'Email',
    email: '',
    telefono: '',
    referente: '',
    note: '',
    attivo: true
  });

  const queryClient = useQueryClient();

  const { data: fornitori = [], isLoading } = useQuery({
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
      tipo_fornitore: 'food',
      giorni_consegna: [],
      tempo_consegna_giorni: '',
      metodologia_ricezione_ordine: 'Email',
      email: '',
      telefono: '',
      referente: '',
      note: '',
      attivo: true
    });
    setEditingFornitore(null);
    setShowForm(false);
  };

  const handleEdit = (fornitore) => {
    setEditingFornitore(fornitore);
    setFormData({
      ragione_sociale: fornitore.ragione_sociale,
      partita_iva: fornitore.partita_iva,
      sede_legale: fornitore.sede_legale || '',
      tipo_fornitore: fornitore.tipo_fornitore || 'food',
      giorni_consegna: fornitore.giorni_consegna || [],
      tempo_consegna_giorni: fornitore.tempo_consegna_giorni || '',
      metodologia_ricezione_ordine: fornitore.metodologia_ricezione_ordine || 'Email',
      email: fornitore.email || '',
      telefono: fornitore.telefono || '',
      referente: fornitore.referente || '',
      note: fornitore.note || '',
      attivo: fornitore.attivo !== false
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      tempo_consegna_giorni: formData.tempo_consegna_giorni ? parseInt(formData.tempo_consegna_giorni) : null
    };

    if (editingFornitore) {
      updateMutation.mutate({ id: editingFornitore.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Sei sicuro di voler eliminare questo fornitore?')) {
      deleteMutation.mutate(id);
    }
  };

  const toggleGiornoConsegna = (giorno) => {
    setFormData(prev => ({
      ...prev,
      giorni_consegna: prev.giorni_consegna.includes(giorno)
        ? prev.giorni_consegna.filter(g => g !== giorno)
        : [...prev.giorni_consegna, giorno]
    }));
  };

  const filteredFornitori = fornitori.filter(f =>
    f.ragione_sociale?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.partita_iva?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.tipo_fornitore?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tipoFornitoreLabels = {
    food: 'Food',
    beverage: 'Beverage',
    consumabili: 'Consumabili',
    freschi: 'Freschi',
    latticini: 'Latticini',
    surgelati: 'Surgelati',
    dolci: 'Dolci',
    packaging: 'Packaging',
    pulizia: 'Pulizia',
    altro: 'Altro'
  };

  const giorniSettimana = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

  const fornitoriPerTipo = filteredFornitori.reduce((acc, fornitore) => {
    const tipo = fornitore.tipo_fornitore || 'altro';
    if (!acc[tipo]) acc[tipo] = [];
    acc[tipo].push(fornitore);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Truck className="w-10 h-10 text-[#8b7355]" />
              <h1 className="text-3xl font-bold text-[#6b6b6b]">Elenco Fornitori</h1>
            </div>
            <p className="text-[#9b9b9b]">Gestisci i fornitori e i loro dettagli</p>
          </div>
          <NeumorphicButton
            onClick={() => setShowForm(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Aggiungi Fornitore
          </NeumorphicButton>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Truck className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{fornitori.length}</h3>
          <p className="text-sm text-[#9b9b9b]">Fornitori Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">
            {fornitori.filter(f => f.attivo !== false).length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Fornitori Attivi</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Package className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-blue-600 mb-1">
            {Object.keys(fornitoriPerTipo).length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Tipologie</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-3xl font-bold text-yellow-600 mb-1">
            {fornitori.filter(f => f.giorni_consegna && f.giorni_consegna.length > 0).length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Con Calendario</p>
        </NeumorphicCard>
      </div>

      {/* Search */}
      <NeumorphicCard className="p-4">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-[#9b9b9b]" />
          <input
            type="text"
            placeholder="Cerca fornitore, P.IVA o tipologia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
          />
        </div>
      </NeumorphicCard>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#e0e5ec] z-10 pb-4">
              <h2 className="text-2xl font-bold text-[#6b6b6b]">
                {editingFornitore ? 'Modifica Fornitore' : 'Nuovo Fornitore'}
              </h2>
              <button
                onClick={resetForm}
                className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <X className="w-5 h-5 text-[#9b9b9b]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Anagrafica Section */}
              <div className="neumorphic-flat p-5 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Building2 className="w-5 h-5 text-[#8b7355]" />
                  <h3 className="font-bold text-[#6b6b6b]">Anagrafica</h3>
                </div>

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
                        Partita IVA <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.partita_iva}
                        onChange={(e) => setFormData({ ...formData, partita_iva: e.target.value })}
                        placeholder="es. 12345678901"
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Tipo Fornitore <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={formData.tipo_fornitore}
                        onChange={(e) => setFormData({ ...formData, tipo_fornitore: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                        required
                      >
                        {Object.entries(tipoFornitoreLabels).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
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
                      placeholder="es. Via Roma 1, Milano"
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Dettagli Fornitore Section */}
              <div className="neumorphic-flat p-5 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Package className="w-5 h-5 text-[#8b7355]" />
                  <h3 className="font-bold text-[#6b6b6b]">Dettagli Fornitore</h3>
                </div>

                <div className="space-y-4">
                  {/* Giorni Consegna */}
                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-3 block flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Giorni di Consegna
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {giorniSettimana.map(giorno => (
                        <div key={giorno} className="neumorphic-pressed p-3 rounded-lg">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.giorni_consegna.includes(giorno)}
                              onChange={() => toggleGiornoConsegna(giorno)}
                              className="w-4 h-4 rounded"
                            />
                            <span className="text-sm text-[#6b6b6b]">{giorno}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                    {formData.giorni_consegna.length > 0 && (
                      <p className="text-xs text-green-600 mt-2">
                        ✓ Consegne: {formData.giorni_consegna.join(', ')}
                      </p>
                    )}
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
                        placeholder="es. 2"
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
                </div>
              </div>

              {/* Contatti Section */}
              <div className="neumorphic-flat p-5 rounded-xl">
                <h3 className="font-bold text-[#6b6b6b] mb-4">Contatti</h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="ordini@fornitore.it"
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Telefono/WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        placeholder="+39 123 456 7890"
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Referente
                    </label>
                    <input
                      type="text"
                      value={formData.referente}
                      onChange={(e) => setFormData({ ...formData, referente: e.target.value })}
                      placeholder="Nome referente"
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                    />
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

              {/* Active Status */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="attivo"
                  checked={formData.attivo}
                  onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="attivo" className="text-sm font-medium text-[#6b6b6b]">
                  Fornitore attivo
                </label>
              </div>

              {/* Action Buttons */}
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
                  {editingFornitore ? 'Aggiorna' : 'Salva'}
                </NeumorphicButton>
              </div>
            </form>
          </NeumorphicCard>
        </div>
      )}

      {/* Fornitori List by Type */}
      {isLoading ? (
        <NeumorphicCard className="p-12 text-center">
          <p className="text-[#9b9b9b]">Caricamento...</p>
        </NeumorphicCard>
      ) : filteredFornitori.length === 0 ? (
        <NeumorphicCard className="p-12 text-center">
          <Truck className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">
            {searchTerm ? 'Nessun fornitore trovato' : 'Nessun fornitore'}
          </h3>
          <p className="text-[#9b9b9b] mb-4">
            {searchTerm ? 'Prova a modificare i criteri di ricerca' : 'Inizia aggiungendo il primo fornitore'}
          </p>
        </NeumorphicCard>
      ) : (
        Object.entries(fornitoriPerTipo).map(([tipo, tipoFornitori]) => (
          <NeumorphicCard key={tipo} className="p-6">
            <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">
              {tipoFornitoreLabels[tipo] || tipo}
              <span className="ml-2 text-sm font-normal text-[#9b9b9b]">
                ({tipoFornitori.length} fornitori)
              </span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#8b7355]">
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Ragione Sociale</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">P.IVA</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Consegne</th>
                    <th className="text-center p-3 text-[#9b9b9b] font-medium">Tempi</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Contatto</th>
                    <th className="text-center p-3 text-[#9b9b9b] font-medium">Stato</th>
                    <th className="text-center p-3 text-[#9b9b9b] font-medium">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {tipoFornitori.map((fornitore) => (
                    <tr key={fornitore.id} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-[#6b6b6b]">{fornitore.ragione_sociale}</p>
                          {fornitore.referente && (
                            <p className="text-xs text-[#9b9b9b]">Ref: {fornitore.referente}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-[#6b6b6b] font-mono text-sm">
                        {fornitore.partita_iva}
                      </td>
                      <td className="p-3">
                        {fornitore.giorni_consegna && fornitore.giorni_consegna.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {fornitore.giorni_consegna.map(g => (
                              <span key={g} className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                                {g.substring(0, 3)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#9b9b9b] text-sm">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {fornitore.tempo_consegna_giorni ? (
                          <span className="font-bold text-[#8b7355]">
                            {fornitore.tempo_consegna_giorni} gg
                          </span>
                        ) : (
                          <span className="text-[#9b9b9b]">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-[#6b6b6b]">
                          {fornitore.metodologia_ricezione_ordine && (
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                              {fornitore.metodologia_ricezione_ordine}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center">
                          {fornitore.attivo !== false ? (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                              ATTIVO
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                              INATTIVO
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(fornitore)}
                            className="neumorphic-flat p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Modifica"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(fornitore.id)}
                            className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Elimina"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </NeumorphicCard>
        ))
      )}
    </div>
  );
}