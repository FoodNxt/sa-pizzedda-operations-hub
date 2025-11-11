import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Plus,
  Edit,
  Save,
  X,
  Trash2,
  Send,
  CheckCircle,
  Clock,
  Calendar,
  User,
  Phone,
  MapPin,
  CreditCard,
  Briefcase,
  Shield,
  Store,
  ShoppingBag
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function Contratti() {
  const [showForm, setShowForm] = useState(false);
  const [editingContratto, setEditingContratto] = useState(null);
  const [formData, setFormData] = useState({
    user_id: '',
    user_email: '',
    user_nome_cognome: '',
    nome_cognome: '',
    phone: '',
    data_nascita: '',
    codice_fiscale: '',
    indirizzo_residenza: '',
    iban: '',
    taglia_maglietta: '',
    user_type: 'dipendente',
    ruoli_dipendente: [],
    assigned_stores: [],
    employee_group: '',
    function_name: '',
    ore_settimanali: 0,
    data_inizio_contratto: '',
    durata_contratto_mesi: 0,
    status: 'bozza',
    note: ''
  });

  const queryClient = useQueryClient();

  const { data: contratti = [], isLoading } = useQuery({
    queryKey: ['contratti'],
    queryFn: () => base44.entities.Contratto.list('-created_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contratto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratti'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contratto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratti'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contratto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratti'] });
    },
  });

  const resetForm = () => {
    setFormData({
      user_id: '',
      user_email: '',
      user_nome_cognome: '',
      nome_cognome: '',
      phone: '',
      data_nascita: '',
      codice_fiscale: '',
      indirizzo_residenza: '',
      iban: '',
      taglia_maglietta: '',
      user_type: 'dipendente',
      ruoli_dipendente: [],
      assigned_stores: [],
      employee_group: '',
      function_name: '',
      ore_settimanali: 0,
      data_inizio_contratto: '',
      durata_contratto_mesi: 0,
      status: 'bozza',
      note: ''
    });
    setEditingContratto(null);
    setShowForm(false);
  };

  const handleEdit = (contratto) => {
    setEditingContratto(contratto);
    setFormData({
      user_id: contratto.user_id || '',
      user_email: contratto.user_email || '',
      user_nome_cognome: contratto.user_nome_cognome || '',
      nome_cognome: contratto.nome_cognome || '',
      phone: contratto.phone || '',
      data_nascita: contratto.data_nascita || '',
      codice_fiscale: contratto.codice_fiscale || '',
      indirizzo_residenza: contratto.indirizzo_residenza || '',
      iban: contratto.iban || '',
      taglia_maglietta: contratto.taglia_maglietta || '',
      user_type: contratto.user_type || 'dipendente',
      ruoli_dipendente: contratto.ruoli_dipendente || [],
      assigned_stores: contratto.assigned_stores || [],
      employee_group: contratto.employee_group || '',
      function_name: contratto.function_name || '',
      ore_settimanali: contratto.ore_settimanali || 0,
      data_inizio_contratto: contratto.data_inizio_contratto || '',
      durata_contratto_mesi: contratto.durata_contratto_mesi || 0,
      status: contratto.status || 'bozza',
      note: contratto.note || ''
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingContratto) {
      updateMutation.mutate({ id: editingContratto.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Sei sicuro di voler eliminare questo contratto?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSendContract = async (contratto) => {
    if (!confirm('Vuoi inviare questo contratto via email?')) return;

    try {
      await base44.integrations.Core.SendEmail({
        to: contratto.user_email || contratto.nome_cognome,
        subject: 'Contratto di Lavoro - Sa Pizzedda',
        body: `Gentile ${contratto.nome_cognome},\n\nÈ stato generato il tuo contratto di lavoro.\nPuoi visualizzarlo accedendo alla piattaforma.\n\nCordiali saluti,\nSa Pizzedda`
      });

      await updateMutation.mutateAsync({
        id: contratto.id,
        data: {
          ...contratto,
          status: 'inviato',
          data_invio: new Date().toISOString()
        }
      });

      alert('Contratto inviato con successo!');
    } catch (error) {
      console.error('Error sending contract:', error);
      alert('Errore durante l\'invio del contratto');
    }
  };

  const handleUserSelect = (userId) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setFormData({
        ...formData,
        user_id: user.id,
        user_email: user.email,
        user_nome_cognome: user.nome_cognome || user.full_name || '',
        nome_cognome: user.nome_cognome || user.full_name || '',
        phone: user.phone || '',
        data_nascita: user.data_nascita || '',
        codice_fiscale: user.codice_fiscale || '',
        indirizzo_residenza: user.indirizzo_residenza || '',
        iban: user.iban || '',
        taglia_maglietta: user.taglia_maglietta || '',
        user_type: user.user_type || 'dipendente',
        ruoli_dipendente: user.ruoli_dipendente || [],
        assigned_stores: user.assigned_stores || [],
        employee_group: user.employee_group || '',
        function_name: user.function_name || '',
        ore_settimanali: user.ore_settimanali || 0,
        data_inizio_contratto: user.data_inizio_contratto || '',
        durata_contratto_mesi: user.durata_contratto_mesi || 0
      });
    }
  };

  const handleRoleToggle = (role) => {
    setFormData(prev => {
      const hasRole = prev.ruoli_dipendente.includes(role);
      return {
        ...prev,
        ruoli_dipendente: hasRole
          ? prev.ruoli_dipendente.filter(r => r !== role)
          : [...prev.ruoli_dipendente, role]
      };
    });
  };

  const handleStoreToggle = (storeName) => {
    setFormData(prev => {
      const isAssigned = prev.assigned_stores.includes(storeName);
      return {
        ...prev,
        assigned_stores: isAssigned
          ? prev.assigned_stores.filter(s => s !== storeName)
          : [...prev.assigned_stores, storeName]
      };
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      'bozza': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Bozza' },
      'inviato': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Inviato' },
      'firmato': { bg: 'bg-green-100', text: 'text-green-700', label: 'Firmato' },
      'archiviato': { bg: 'bg-red-100', text: 'text-red-700', label: 'Archiviato' }
    };
    const badge = badges[status] || badges.bozza;
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>{badge.label}</span>;
  };

  const stats = {
    totale: contratti.length,
    bozza: contratti.filter(c => c.status === 'bozza').length,
    inviati: contratti.filter(c => c.status === 'inviato').length,
    firmati: contratti.filter(c => c.status === 'firmato').length
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-10 h-10 text-[#8b7355]" />
            <h1 className="text-3xl font-bold text-[#6b6b6b]">Gestione Contratti</h1>
          </div>
          <p className="text-[#9b9b9b]">Crea e gestisci i contratti dei dipendenti</p>
        </div>
        <NeumorphicButton
          onClick={() => setShowForm(!showForm)}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuovo Contratto
        </NeumorphicButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <FileText className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{stats.totale}</h3>
          <p className="text-sm text-[#9b9b9b]">Contratti Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Clock className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-3xl font-bold text-gray-600 mb-1">{stats.bozza}</h3>
          <p className="text-sm text-[#9b9b9b]">Bozze</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Send className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-blue-600 mb-1">{stats.inviati}</h3>
          <p className="text-sm text-[#9b9b9b]">Inviati</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">{stats.firmati}</h3>
          <p className="text-sm text-[#9b9b9b]">Firmati</p>
        </NeumorphicCard>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6 my-8">
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#e0e5ec] z-10 pb-4">
                <h2 className="text-2xl font-bold text-[#6b6b6b]">
                  {editingContratto ? 'Modifica Contratto' : 'Nuovo Contratto'}
                </h2>
                <button onClick={resetForm} className="text-[#9b9b9b] hover:text-[#6b6b6b]">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* User Selection */}
                {!editingContratto && (
                  <div className="neumorphic-flat p-5 rounded-xl">
                    <label className="text-sm font-medium text-[#6b6b6b] mb-3 block">
                      Seleziona Dipendente (Opzionale - compila automaticamente i campi)
                    </label>
                    <select
                      value={formData.user_id}
                      onChange={(e) => handleUserSelect(e.target.value)}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                    >
                      <option value="">-- Seleziona un dipendente --</option>
                      {users.filter(u => u.user_type === 'dipendente').map(user => (
                        <option key={user.id} value={user.id}>
                          {user.nome_cognome || user.full_name || user.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Rest of the form - same structure as UsersManagement */}
                {/* Anagrafica */}
                <div className="neumorphic-flat p-5 rounded-xl">
                  <h3 className="font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-[#8b7355]" />
                    Dati Anagrafici
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Nome Cognome <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nome_cognome}
                        onChange={(e) => setFormData({ ...formData, nome_cognome: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                        placeholder="Mario Rossi"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Data di Nascita <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.data_nascita}
                        onChange={(e) => setFormData({ ...formData, data_nascita: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Codice Fiscale <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.codice_fiscale}
                        onChange={(e) => setFormData({ ...formData, codice_fiscale: e.target.value.toUpperCase() })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none uppercase"
                        maxLength={16}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Cellulare <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Indirizzo di Residenza <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.indirizzo_residenza}
                        onChange={(e) => setFormData({ ...formData, indirizzo_residenza: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        IBAN <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.iban}
                        onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none uppercase"
                        maxLength={34}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4" />
                        Taglia Maglietta
                      </label>
                      <select
                        value={formData.taglia_maglietta}
                        onChange={(e) => setFormData({ ...formData, taglia_maglietta: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      >
                        <option value="">-- Seleziona --</option>
                        <option value="XS">XS</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="XXL">XXL</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dati Lavorativi */}
                <div className="neumorphic-flat p-5 rounded-xl">
                  <h3 className="font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-[#8b7355]" />
                    Dati Lavorativi
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Gruppo Contrattuale <span className="text-red-600">*</span>
                      </label>
                      <select
                        required
                        value={formData.employee_group}
                        onChange={(e) => setFormData({ ...formData, employee_group: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      >
                        <option value="">-- Seleziona --</option>
                        <option value="FT">FT - Full Time</option>
                        <option value="PT">PT - Part Time</option>
                        <option value="CM">CM - Contratto Misto</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Ruolo/Funzione <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.function_name}
                        onChange={(e) => setFormData({ ...formData, function_name: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Ore Settimanali <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.5"
                        value={formData.ore_settimanali}
                        onChange={(e) => setFormData({ ...formData, ore_settimanali: parseFloat(e.target.value) || 0 })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Data Inizio Contratto <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.data_inizio_contratto}
                        onChange={(e) => setFormData({ ...formData, data_inizio_contratto: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Durata Contratto (Mesi) <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.durata_contratto_mesi}
                        onChange={(e) => setFormData({ ...formData, durata_contratto_mesi: parseInt(e.target.value) || 0 })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Stato Contratto
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      >
                        <option value="bozza">Bozza</option>
                        <option value="inviato">Inviato</option>
                        <option value="firmato">Firmato</option>
                        <option value="archiviato">Archiviato</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-[#6b6b6b] mb-3 block">
                        Ruoli Dipendente
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {['Pizzaiolo', 'Cassiere', 'Store Manager'].map(role => (
                          <div key={role} className="neumorphic-pressed p-3 rounded-lg">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.ruoli_dipendente.includes(role)}
                                onChange={() => handleRoleToggle(role)}
                                className="w-5 h-5 rounded"
                              />
                              <span className="text-[#6b6b6b] font-medium">{role}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Note */}
                <div className="neumorphic-flat p-5 rounded-xl">
                  <label className="text-sm font-medium text-[#6b6b6b] mb-3 block">
                    Note
                  </label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none h-24 resize-none"
                    placeholder="Note aggiuntive sul contratto..."
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <NeumorphicButton type="button" onClick={resetForm}>
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton type="submit" variant="primary">
                    {editingContratto ? 'Aggiorna' : 'Crea'} Contratto
                  </NeumorphicButton>
                </div>
              </form>
            </NeumorphicCard>
          </div>
        </div>
      )}

      {/* Contratti List */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Lista Contratti</h2>
        
        {isLoading ? (
          <p className="text-center text-[#9b9b9b] py-8">Caricamento...</p>
        ) : contratti.length === 0 ? (
          <p className="text-center text-[#9b9b9b] py-8">Nessun contratto creato</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#8b7355]">
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Dipendente</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Ruolo</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Contratto</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Inizio</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Durata</th>
                  <th className="text-center p-3 text-[#9b9b9b] font-medium">Stato</th>
                  <th className="text-center p-3 text-[#9b9b9b] font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {contratti.map((contratto) => (
                  <tr key={contratto.id} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-[#6b6b6b]">{contratto.nome_cognome}</p>
                        {contratto.user_email && (
                          <p className="text-xs text-[#9b9b9b]">{contratto.user_email}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-[#6b6b6b]">{contratto.function_name || '-'}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-[#6b6b6b]">{contratto.employee_group} - {contratto.ore_settimanali}h/sett</span>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-[#6b6b6b]">
                        {contratto.data_inizio_contratto ? new Date(contratto.data_inizio_contratto).toLocaleDateString('it-IT') : '-'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-[#6b6b6b]">{contratto.durata_contratto_mesi} mesi</span>
                    </td>
                    <td className="p-3 text-center">
                      {getStatusBadge(contratto.status)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(contratto)}
                          className="neumorphic-flat p-2 rounded-lg hover:bg-blue-50 transition-colors"
                          title="Modifica"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                        {contratto.status === 'bozza' && (
                          <button
                            onClick={() => handleSendContract(contratto)}
                            className="neumorphic-flat p-2 rounded-lg hover:bg-green-50 transition-colors"
                            title="Invia"
                          >
                            <Send className="w-4 h-4 text-green-600" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(contratto.id)}
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
        )}
      </NeumorphicCard>
    </div>
  );
}