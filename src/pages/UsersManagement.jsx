
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Edit,
  Save,
  X,
  Shield,
  User,
  Mail,
  AlertCircle,
  CheckCircle,
  Phone,
  Calendar,
  MapPin,
  ShoppingBag,
  Store // Added Store icon
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function UsersManagement() {
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    nome_cognome: '',
    initials: '',
    user_type: 'dipendente',
    ruoli_dipendente: [], // Changed from ruolo_dipendente to ruoli_dipendente (array)
    assigned_stores: [],
    employee_id_external: '',
    employee_group: '',
    function_name: '',
    phone: '',
    data_nascita: '',
    codice_fiscale: '',
    indirizzo_domicilio: '',
    taglia_maglietta: '',
    status: 'active'
  });

  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  // New query for stores
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      // Optional: reset form data after successful save
      setFormData({
        nome_cognome: '',
        initials: '',
        user_type: 'dipendente',
        ruoli_dipendente: [], // Changed
        assigned_stores: [],
        employee_id_external: '',
        employee_group: '',
        function_name: '',
        phone: '',
        data_nascita: '',
        codice_fiscale: '',
        indirizzo_domicilio: '',
        taglia_maglietta: '',
        status: 'active'
      });
    },
  });

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      nome_cognome: user.nome_cognome || '',
      initials: user.initials || '',
      user_type: user.user_type || 'dipendente',
      ruoli_dipendente: user.ruoli_dipendente || [], // Changed
      assigned_stores: user.assigned_stores || [], // Populating new field
      employee_id_external: user.employee_id_external || '',
      employee_group: user.employee_group || '',
      function_name: user.function_name || '',
      phone: user.phone || '',
      data_nascita: user.data_nascita || '',
      codice_fiscale: user.codice_fiscale || '',
      indirizzo_domicilio: user.indirizzo_domicilio || '',
      taglia_maglietta: user.taglia_maglietta || '',
      status: user.status || 'active'
    });
    // Removed setShowForm(true) as editingUser state already controls modal visibility
  };

  const handleSave = () => {
    if (!formData.nome_cognome?.trim()) {
      alert('Il Nome Cognome è obbligatorio');
      return;
    }

    updateMutation.mutate({
      id: editingUser.id,
      data: formData
    });
  };

  const handleCancel = () => {
    setEditingUser(null);
    setFormData({
      nome_cognome: '',
      initials: '',
      user_type: 'dipendente',
      ruoli_dipendente: [], // Changed
      assigned_stores: [], // Resetting new field
      employee_id_external: '',
      employee_group: '',
      function_name: '',
      phone: '',
      data_nascita: '',
      codice_fiscale: '',
      indirizzo_domicilio: '',
      taglia_maglietta: '',
      status: 'active'
    });
  };

  // New function to toggle store assignment - UPDATED to use store names
  const handleStoreToggle = (storeName) => {
    setFormData(prev => {
      const isCurrentlyAssigned = prev.assigned_stores.includes(storeName);
      let newAssignedStores;

      if (prev.assigned_stores.length === 0 && stores.length > 0) {
        // If it was "all assigned" and we uncheck one, initialize with all stores minus the one being unchecked
        newAssignedStores = stores.filter(s => s.name !== storeName).map(s => s.name);
      } else if (isCurrentlyAssigned) {
        // If it's explicitly assigned and we uncheck it
        newAssignedStores = prev.assigned_stores.filter(name => name !== storeName);
      } else {
        // If it's not explicitly assigned and we check it
        newAssignedStores = [...prev.assigned_stores, storeName];
      }

      return { ...prev, assigned_stores: newAssignedStores };
    });
  };

  // Function to toggle role - NEW
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


  const getUserTypeLabel = (type) => {
    switch(type) {
      case 'admin': return 'Amministratore';
      case 'manager': return 'Manager';
      case 'dipendente': return 'Dipendente';
      default: return 'N/A';
    }
  };

  const getUserTypeColor = (type) => {
    switch(type) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'manager': return 'bg-blue-100 text-blue-700';
      case 'dipendente': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Users className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Gestione Utenti</h1>
        </div>
        <p className="text-[#9b9b9b]">Visualizza e modifica gli utenti del sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Users className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{users.length}</h3>
          <p className="text-sm text-[#9b9b9b]">Utenti Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-3xl font-bold text-red-600 mb-1">
            {users.filter(u => u.user_type === 'admin').length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Admin</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-blue-600 mb-1">
            {users.filter(u => u.user_type === 'manager').length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Manager</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <User className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">
            {users.filter(u => u.user_type === 'dipendente').length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Dipendenti</p>
        </NeumorphicCard>
      </div>

      {/* Edit Modal - FIXED with overflow */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6 my-8">
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#e0e5ec] z-10 pb-4">
                <h2 className="text-2xl font-bold text-[#6b6b6b]">
                  Modifica Utente
                </h2>
                <button
                  onClick={handleCancel}
                  className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <X className="w-5 h-5 text-[#9b9b9b]" />
                </button>
              </div>

              <div className="space-y-6">
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
                        value={formData.nome_cognome}
                        onChange={(e) => setFormData({ ...formData, nome_cognome: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                        placeholder="Mario Rossi"
                      />
                      <p className="text-xs text-[#9b9b9b] mt-1">
                        ⚠️ Deve corrispondere ESATTAMENTE a "employee_name" negli Shifts per il matching automatico
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Iniziali
                      </label>
                      <input
                        type="text"
                        value={formData.initials}
                        onChange={(e) => setFormData({ ...formData, initials: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                        placeholder="M.R."
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Data di Nascita
                      </label>
                      <input
                        type="date"
                        value={formData.data_nascita}
                        onChange={(e) => setFormData({ ...formData, data_nascita: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Codice Fiscale
                      </label>
                      <input
                        type="text"
                        value={formData.codice_fiscale}
                        onChange={(e) => setFormData({ ...formData, codice_fiscale: e.target.value.toUpperCase() })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none uppercase"
                        placeholder="RSSMRA80A01H501Z"
                        maxLength={16}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Numero di Cellulare
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                        placeholder="+39 333 1234567"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Indirizzo di Domicilio
                      </label>
                      <input
                        type="text"
                        value={formData.indirizzo_domicilio}
                        onChange={(e) => setFormData({ ...formData, indirizzo_domicilio: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                        placeholder="Via Roma 123, 20100 Milano (MI)"
                      />
                    </div>
                  </div>
                </div>

                {/* Dati Lavorativi */}
                <div className="neumorphic-flat p-5 rounded-xl">
                  <h3 className="font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#8b7355]" />
                    Dati Lavorativi
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Tipo Utente
                      </label>
                      <select
                        value={formData.user_type}
                        onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      >
                        <option value="dipendente">Dipendente</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Amministratore</option>
                      </select>
                    </div>

                    {/* Ruoli Dipendente - UPDATED to multi-select */}
                    {formData.user_type === 'dipendente' && (
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-[#6b6b6b] mb-3 block">
                          Ruoli Dipendente (può avere più ruoli)
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
                        <p className="text-xs text-[#9b9b9b] mt-2">
                          ℹ️ Seleziona uno o più ruoli per questo dipendente
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        ID Esterno (Planday)
                      </label>
                      <input
                        type="text"
                        value={formData.employee_id_external}
                        onChange={(e) => setFormData({ ...formData, employee_id_external: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                        placeholder="EMP001"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Gruppo Contrattuale
                      </label>
                      <select
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
                        Ruolo/Funzione
                      </label>
                      <input
                        type="text"
                        value={formData.function_name}
                        onChange={(e) => setFormData({ ...formData, function_name: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                        placeholder="Pizzaiolo, Cassiere, Manager..."
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

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Stato
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      >
                        <option value="active">Attivo</option>
                        <option value="inactive">Inattivo</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* NEW: Assegnazione Locali - UPDATED to use store names */}
                <div className="neumorphic-flat p-5 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <Store className="w-5 h-5 text-[#8b7355]" />
                    <h3 className="font-bold text-[#6b6b6b]">Assegnazione Locali</h3>
                  </div>
                  <p className="text-sm text-[#9b9b9b] mb-4">
                    {formData.assigned_stores.length === 0
                      ? '✓ Utente assegnato a TUTTI i locali'
                      : `Utente assegnato a ${formData.assigned_stores.length} locale/i su ${stores.length}`}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {stores.map(store => (
                      <div key={store.id} className="neumorphic-pressed p-3 rounded-lg">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.assigned_stores.length === 0 || formData.assigned_stores.includes(store.name)}
                            onChange={() => handleStoreToggle(store.name)}
                            className="w-5 h-5 rounded"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-[#6b6b6b]">{store.name}</p>
                            <p className="text-xs text-[#9b9b9b]">{store.address}</p>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>

                  {formData.assigned_stores.length > 0 && formData.assigned_stores.length < stores.length && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, assigned_stores: [] })}
                      className="mt-3 text-sm text-blue-600 hover:underline"
                    >
                      Assegna a tutti i locali
                    </button>
                  )}
                </div>

                {/* Email (Read-only) */}
                <div className="neumorphic-pressed p-4 rounded-xl bg-gray-50">
                  <label className="text-sm font-medium text-[#9b9b9b] mb-2 block flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email (non modificabile)
                  </label>
                  <p className="text-[#6b6b6b] font-medium">{editingUser.email}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-[#c1c1c1] mt-6">
                <NeumorphicButton
                  onClick={handleCancel}
                  className="flex-1"
                >
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton
                  onClick={handleSave}
                  variant="primary"
                  className="flex-1 flex items-center justify-center gap-2"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-[#8b7355] border-t-transparent rounded-full animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Salva Modifiche
                    </>
                  )}
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          </div>
        </div>
      )}

      {/* Users Table - UPDATED to show roles */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Lista Utenti</h2>
        
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-[#9b9b9b]">Caricamento...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
            <p className="text-[#6b6b6b] font-medium">Nessun utente trovato</p>
          </div>
        ) : null }

        {!isLoading && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#8b7355]">
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Utente</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Email</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Telefono</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Ruolo</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Tipo</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Locali</th> {/* New Table Header */}
                  <th className="text-center p-3 text-[#9b9b9b] font-medium">Stato</th>
                  <th className="text-center p-3 text-[#9b9b9b] font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const assignedStoresCount = !user.assigned_stores || user.assigned_stores.length === 0
                    ? stores.length
                    : user.assigned_stores.length;

                  return (
                    <tr key={user.id} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full neumorphic-flat flex items-center justify-center">
                            <span className="text-sm font-bold text-[#8b7355]">
                              {user.initials || (user.nome_cognome || user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-[#6b6b6b]">
                              {user.nome_cognome || user.full_name || 'Nome non impostato'}
                            </p>
                            {user.employee_id_external && (
                              <p className="text-xs text-[#9b9b9b]">ID: {user.employee_id_external}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-[#9b9b9b]" />
                          <span className="text-[#6b6b6b] text-sm">{user.email}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        {user.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-[#9b9b9b]" />
                            <span className="text-[#6b6b6b] text-sm">{user.phone}</span>
                          </div>
                        ) : (
                          <span className="text-[#9b9b9b] text-sm">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div>
                          <span className="text-sm text-[#6b6b6b]">{user.function_name || '-'}</span>
                          {user.user_type === 'dipendente' && user.ruoli_dipendente && user.ruoli_dipendente.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {user.ruoli_dipendente.map((role, idx) => (
                                <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                  {role}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getUserTypeColor(user.user_type)}`}>
                          {getUserTypeLabel(user.user_type)}
                        </span>
                      </td>
                      <td className="p-3"> {/* New Table Data for Stores */}
                        <span className="text-sm text-[#6b6b6b]">
                          {assignedStoresCount === stores.length
                            ? 'Tutti'
                            : `${assignedStoresCount}/${stores.length}`}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center">
                          {user.status === 'active' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <X className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleEdit(user)}
                            className="neumorphic-flat p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Modifica"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </NeumorphicCard>

      {/* Info Box */}
      <NeumorphicCard className="p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">ℹ️ Informazioni sul Matching Automatico</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li><strong>Nome Cognome</strong> (campo editabile) viene usato per il matching con <strong>employee_name</strong> negli Shifts</li>
              <li>Il matching viene fatto in modo <strong>case-insensitive</strong> e ignora spazi multipli</li>
              <li>Il nome deve corrispondere ESATTAMENTE (es. "Mario Rossi" nell'User deve matchare con "Mario Rossi" negli Shifts)</li>
              <li>Questo matching viene usato per assegnare: <strong>recensioni, ritardi e timbrature mancate</strong></li>
              <li>I dipendenti possono modificare il proprio <strong>Nome Cognome</strong> dalla pagina "Profilo"</li>
              <li>Gli utenti <strong>admin</strong> hanno accesso completo al sistema</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}
