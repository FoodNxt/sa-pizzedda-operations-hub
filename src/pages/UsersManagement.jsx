
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
  Store,
  FileText,
  Send
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function UsersManagement() {
  const [editingUser, setEditingUser] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [formData, setFormData] = useState({
    nome_cognome: '',
    user_type: 'dipendente',
    ruoli_dipendente: [],
    assigned_stores: [],
    employee_group: '',
    phone: '',
    data_nascita: '',
    citta_nascita: '',
    codice_fiscale: '',
    indirizzo_residenza: '',
    iban: '',
    taglia_maglietta: '',
    ore_settimanali: 0,
    data_inizio_contratto: '',
    durata_contratto_mesi: 0,
    status: 'active'
  });
  const [sendingContract, setSendingContract] = useState(false);

  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['contratto-templates'],
    queryFn: () => base44.entities.ContrattoTemplate.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      setSelectedTemplate('');
      setFormData({
        nome_cognome: '',
        user_type: 'dipendente',
        ruoli_dipendente: [],
        assigned_stores: [],
        employee_group: '',
        phone: '',
        data_nascita: '',
        citta_nascita: '',
        codice_fiscale: '',
        indirizzo_residenza: '',
        iban: '',
        taglia_maglietta: '',
        ore_settimanali: 0,
        data_inizio_contratto: '',
        durata_contratto_mesi: 0,
        status: 'active'
      });
    },
  });

  const createContrattoMutation = useMutation({
    mutationFn: (data) => base44.entities.Contratto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratti'] });
    },
  });

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      nome_cognome: user.nome_cognome || '',
      user_type: user.user_type || 'dipendente',
      ruoli_dipendente: user.ruoli_dipendente || [],
      assigned_stores: user.assigned_stores || [],
      employee_group: user.employee_group || '',
      phone: user.phone || '',
      data_nascita: user.data_nascita || '',
      citta_nascita: user.citta_nascita || '',
      codice_fiscale: user.codice_fiscale || '',
      indirizzo_residenza: user.indirizzo_residenza || '',
      iban: user.iban || '',
      taglia_maglietta: user.taglia_maglietta || '',
      ore_settimanali: user.ore_settimanali || 0,
      data_inizio_contratto: user.data_inizio_contratto || '',
      durata_contratto_mesi: user.durata_contratto_mesi || 0,
      status: user.status || 'active'
    });
    // If a contract template was associated with the user, set it here.
    // For now, it's not part of the user model, so we'll leave it blank initially.
    setSelectedTemplate('');
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
    setSelectedTemplate('');
    setFormData({
      nome_cognome: '',
      user_type: 'dipendente',
      ruoli_dipendente: [],
      assigned_stores: [],
      employee_group: '',
      phone: '',
      data_nascita: '',
      citta_nascita: '',
      codice_fiscale: '',
      indirizzo_residenza: '',
      iban: '',
      taglia_maglietta: '',
      ore_settimanali: 0,
      data_inizio_contratto: '',
      durata_contratto_mesi: 0,
      status: 'active'
    });
  };

  const handleStoreToggle = (storeName) => {
    setFormData(prev => {
      const isCurrentlyAssigned = prev.assigned_stores.includes(storeName);
      let newAssignedStores;

      if (prev.assigned_stores.length === 0 && stores.length > 0) {
        newAssignedStores = stores.filter(s => s.name !== storeName).map(s => s.name);
      } else if (isCurrentlyAssigned) {
        newAssignedStores = prev.assigned_stores.filter(name => name !== storeName);
      } else {
        newAssignedStores = [...prev.assigned_stores, storeName];
      }

      return { ...prev, assigned_stores: newAssignedStores };
    });
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

  const replaceVariables = (templateContent, data) => {
    let result = templateContent;
    
    const oggi = new Date();
    const dataFine = data.data_inizio_contratto && data.durata_contratto_mesi
      ? new Date(new Date(data.data_inizio_contratto).setMonth(new Date(data.data_inizio_contratto).getMonth() + data.durata_contratto_mesi))
      : null;

    const variables = {
      '{{data_oggi}}': oggi.toLocaleDateString('it-IT'),
      '{{nome_cognome}}': data.nome_cognome || '',
      '{{phone}}': data.phone || '',
      '{{data_nascita}}': data.data_nascita ? new Date(data.data_nascita).toLocaleDateString('it-IT') : '',
      '{{citta_nascita}}': data.citta_nascita || '',
      '{{codice_fiscale}}': data.codice_fiscale || '',
      '{{indirizzo_residenza}}': data.indirizzo_residenza || '',
      '{{iban}}': data.iban || '',
      '{{employee_group}}': data.employee_group || '',
      '{{ore_settimanali}}': data.ore_settimanali?.toString() || '',
      '{{data_inizio_contratto}}': data.data_inizio_contratto ? new Date(data.data_inizio_contratto).toLocaleDateString('it-IT') : '',
      '{{durata_contratto_mesi}}': data.durata_contratto_mesi?.toString() || '',
      '{{data_fine_contratto}}': dataFine ? dataFine.toLocaleDateString('it-IT') : '',
      '{{ruoli}}': (data.ruoli_dipendente || []).join(', '),
      '{{locali}}': (data.assigned_stores || []).join(', ') || 'Tutti i locali'
    };

    Object.keys(variables).forEach(key => {
      result = result.split(key).join(variables[key]);
    });

    return result;
  };

  // Check if all required fields are filled
  const isFormComplete = () => {
    return formData.nome_cognome?.trim() &&
           formData.phone?.trim() &&
           formData.data_nascita &&
           formData.codice_fiscale?.trim() &&
           formData.indirizzo_residenza?.trim() &&
           formData.iban?.trim() &&
           formData.employee_group &&
           formData.ore_settimanali > 0 &&
           formData.data_inizio_contratto &&
           formData.durata_contratto_mesi > 0 &&
           selectedTemplate;
  };

  const handleSendContract = async () => {
    if (!isFormComplete()) {
      alert('Compila tutti i campi obbligatori (marcati con *) e seleziona un template prima di inviare il contratto');
      return;
    }

    if (!confirm('Vuoi creare e inviare il contratto a questo dipendente?')) {
      return;
    }

    try {
      setSendingContract(true);

      const template = templates.find(t => t.id === selectedTemplate);
      if (!template) {
        alert('Template selezionato non trovato. Si prega di sceglierne uno valido.');
        return;
      }

      const contenutoContratto = replaceVariables(template.contenuto_template, formData);

      const dataFine = new Date(formData.data_inizio_contratto);
      dataFine.setMonth(dataFine.getMonth() + formData.durata_contratto_mesi);
      const dataFineISO = dataFine.toISOString().split('T')[0]; // Format YYYY-MM-DD

      await createContrattoMutation.mutateAsync({
        user_id: editingUser.id,
        user_email: editingUser.email,
        user_nome_cognome: formData.nome_cognome,
        template_id: template.id,
        template_nome: template.nome_template,
        contenuto_contratto: contenutoContratto,
        nome_cognome: formData.nome_cognome,
        phone: formData.phone,
        data_nascita: formData.data_nascita,
        citta_nascita: formData.citta_nascita,
        codice_fiscale: formData.codice_fiscale,
        indirizzo_residenza: formData.indirizzo_residenza,
        iban: formData.iban,
        taglia_maglietta: formData.taglia_maglietta,
        user_type: formData.user_type,
        ruoli_dipendente: formData.ruoli_dipendente,
        assigned_stores: formData.assigned_stores,
        employee_group: formData.employee_group,
        // function_name was removed from form data but kept in mutation. Assuming it's not required or implicitly derived.
        // If function_name is needed for contract, it should be added back to form data.
        ore_settimanali: formData.ore_settimanali,
        data_inizio_contratto: formData.data_inizio_contratto,
        durata_contratto_mesi: formData.durata_contratto_mesi,
        data_fine_contratto: dataFineISO,
        status: 'inviato',
        data_invio: new Date().toISOString()
      });

      // Send email notification
      await base44.integrations.Core.SendEmail({
        to: editingUser.email,
        subject: 'Contratto di Lavoro - Sa Pizzedda',
        body: `Gentile ${formData.nome_cognome},\n\nÈ stato generato il tuo contratto di lavoro.\nPuoi visualizzarlo e firmarlo accedendo alla piattaforma nella sezione "I Miei Contratti".\n\nCordiali saluti,\nSa Pizzedda`
      });

      alert('Contratto creato e inviato con successo!');
      handleCancel();

    } catch (error) {
      console.error('Error sending contract:', error);
      alert('Errore durante l\'invio del contratto: ' + (error.message || 'Verifica i dati inseriti.'));
    } finally {
      setSendingContract(false);
    }
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

      {/* Edit Modal */}
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
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Data di Nascita <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.data_nascita}
                        onChange={(e) => setFormData({ ...formData, data_nascita: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Città di Nascita
                      </label>
                      <input
                        type="text"
                        value={formData.citta_nascita}
                        onChange={(e) => setFormData({ ...formData, citta_nascita: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                        placeholder="Milano"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Codice Fiscale <span className="text-red-600">*</span>
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
                        Cellulare <span className="text-red-600">*</span>
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
                        Indirizzo di Residenza <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.indirizzo_residenza}
                        onChange={(e) => setFormData({ ...formData, indirizzo_residenza: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                        placeholder="Via Roma 123, 20100 Milano (MI)"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        IBAN <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.iban}
                        onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none uppercase"
                        placeholder="IT60 X054 2811 1010 0000 0123 456"
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

                    {formData.user_type === 'dipendente' && (
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
                    )}

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Gruppo Contrattuale <span className="text-red-600">*</span>
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

                    {/* function_name removed from formData for contract consistency based on outline, but if it's still needed in the user profile, it should be re-added.
                     The outline for formData initialization did not include 'function_name' but the original code did. Assuming 'employee_group' and 'ruoli_dipendente' are sufficient for contract generation.
                     If 'function_name' is still needed for user profile, it should be added back to formData state and its input.
                    */}
                    {/* 
                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Ruolo/Funzione <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.function_name}
                        onChange={(e) => setFormData({ ...formData, function_name: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                        placeholder="Pizzaiolo, Cassiere, Manager..."
                      />
                    </div>
                    */}

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Ore Settimanali <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.ore_settimanali}
                        onChange={(e) => setFormData({ ...formData, ore_settimanali: parseFloat(e.target.value) || 0 })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                        placeholder="40"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Data Inizio Contratto <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="date"
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
                        min="0"
                        value={formData.durata_contratto_mesi}
                        onChange={(e) => setFormData({ ...formData, durata_contratto_mesi: parseInt(e.target.value) || 0 })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                        placeholder="12"
                      />
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

                {/* Template Selection for Contract */}
                <div className="neumorphic-flat p-5 rounded-xl border-2 border-[#8b7355]">
                  <h3 className="font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#8b7355]" />
                    Template Contratto
                  </h3>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                    Seleziona Template per Contratto <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  >
                    <option value="">-- Seleziona un template --</option>
                    {templates.filter(t => t.attivo).map(template => (
                      <option key={template.id} value={template.id}>
                        {template.nome_template}
                      </option>
                    ))}
                  </select>
                  {selectedTemplate && (
                    <p className="text-xs text-[#9b9b9b] mt-2">
                      {templates.find(t => t.id === selectedTemplate)?.descrizione}
                    </p>
                  )}
                  <p className="text-xs text-blue-600 mt-2">
                    ℹ️ Il template selezionato verrà utilizzato quando invii il contratto al dipendente
                  </p>
                </div>

                {/* Assegnazione Locali */}
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
                {isFormComplete() && (
                  <NeumorphicButton
                    onClick={handleSendContract}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-500 text-white"
                    disabled={sendingContract}
                  >
                    {sendingContract ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Invio...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Manda Contratto
                      </>
                    )}
                  </NeumorphicButton>
                )}
              </div>
            </NeumorphicCard>
          </div>
        </div>
      )}

      {/* Users Table */}
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
        ) : null}

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
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Locali</th>
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
                              {(user.nome_cognome || user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-[#6b6b6b]">
                              {user.nome_cognome || user.full_name || 'Nome non impostato'}
                            </p>
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
                      <td className="p-3">
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
            <p className="font-medium mb-1">ℹ️ Gestione Contratti</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>Compila TUTTI i campi obbligatori (marcati con *) per abilitare il bottone "Manda Contratto"</li>
              <li><strong>Seleziona un template</strong> prima di inviare il contratto</li>
              <li>Il contratto verrà generato automaticamente con le variabili sostituite</li>
              <li>Il contratto sarà inviato via email al dipendente</li>
              <li>Puoi visualizzare e gestire tutti i contratti dalla pagina "Contratti" nel menu People</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}
