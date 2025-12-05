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
  Send,
  Eye,
  FastForward, // Added FastForward icon
  FileCheck // Added FileCheck icon
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function UsersManagement() {
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
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
    tipo_contratto: 'determinato',
    durata_contratto_mesi: 0,
    data_fine_contratto: '',
    planday: false,
    abilitato_prove: false,
    status: 'active'
  });
  const [sendingContract, setSendingContract] = useState(false);
  const [skippingContract, setSkippingContract] = useState(false); // Added skippingContract state

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
      // The setEditingUser(null) and setFormData(...) logic was moved to handleSave and handleCancel
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
    setSelectedTemplate('');
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
      tipo_contratto: user.tipo_contratto || 'determinato',
      durata_contratto_mesi: user.durata_contratto_mesi || 0,
      data_fine_contratto: user.data_fine_contratto || '',
      planday: user.planday || false,
      abilitato_prove: user.abilitato_prove || false,
      status: user.status || 'active'
    });
  };

  const handleViewUser = (user) => {
    setViewingUser(user);
  };

  const handleSave = async () => { // Made async
    if (!formData.nome_cognome?.trim()) {
      alert('Il Nome Cognome è obbligatorio');
      return;
    }

    await updateMutation.mutateAsync({ // Await the mutation
      id: editingUser.id,
      data: formData
    });

    setEditingUser(null); // Moved here after successful update
    setSelectedTemplate(''); // Moved here after successful update
  };

  const handleCancel = () => {
    setEditingUser(null);
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
      tipo_contratto: 'determinato',
      durata_contratto_mesi: 0,
      data_fine_contratto: '',
      planday: false,
      abilitato_prove: false,
      status: 'active'
    });
    setSelectedTemplate('');
  };

  const handleStoreToggle = (storeName) => {
    setFormData(prev => {
      const isCurrentlyAssigned = prev.assigned_stores.includes(storeName);
      let newAssignedStores;

      // If no stores are assigned, it means 'All stores'. Toggling one means assigning only that one.
      // If 'All stores' implicitly, and we toggle one, we should create an explicit list with all *but* the toggled one.
      if (prev.assigned_stores.length === 0) { // Currently assigned to all
        if (stores.length === 1 && stores[0].name === storeName) { // Only one store exists and it's the one we're toggling
            newAssignedStores = []; // Effectively unassign from all, or keep it empty meaning 'all'
        } else {
            newAssignedStores = stores.filter(s => s.name !== storeName).map(s => s.name);
        }
      } else if (isCurrentlyAssigned) { // Assigned to specific stores, and this one is in the list
        const filtered = prev.assigned_stores.filter(name => name !== storeName);
        if (filtered.length === 0) { // If filtering makes it empty, revert to 'all' (empty array)
            newAssignedStores = [];
        } else {
            newAssignedStores = filtered;
        }
      } else { // Assigned to specific stores, and this one is not in the list
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

  // Check if all required fields are filled
  const isFormComplete = () => {
    const baseValid = formData.nome_cognome?.trim() &&
           formData.phone?.trim() &&
           formData.data_nascita &&
           formData.codice_fiscale?.trim() &&
           formData.indirizzo_residenza?.trim() &&
           formData.iban?.trim() &&
           formData.employee_group &&
           formData.ore_settimanali > 0 &&
           formData.data_inizio_contratto;
    
    // For tempo indeterminato, we don't need durata or data_fine
    if (formData.tipo_contratto === 'indeterminato') {
      return baseValid;
    }
    
    // For determinato, we need either durata OR data_fine
    return baseValid && (formData.durata_contratto_mesi > 0 || formData.data_fine_contratto);
  };

  const canSendContract = () => {
    return isFormComplete() && selectedTemplate;
  };

  const handleSkipContract = async () => {
    if (!isFormComplete()) {
      alert('Compila tutti i campi obbligatori prima di skippare il contratto');
      return;
    }

    if (!confirm('Vuoi skippare il contratto? Il dipendente avrà accesso a tutte le funzionalità come se avesse già firmato.')) {
      return;
    }

    try {
      setSkippingContract(true);

      // Save user data first
      await updateMutation.mutateAsync({
        id: editingUser.id,
        data: formData
      });

      // Create a dummy signed contract
      await createContrattoMutation.mutateAsync({
        user_id: editingUser.id,
        user_email: editingUser.email,
        user_nome_cognome: formData.nome_cognome,
        template_id: 'skipped',
        template_nome: 'Contratto Skippato (Già Firmato Offline)',
        contenuto_contratto: `Contratto per ${formData.nome_cognome}\n\nQuesto contratto è stato skippato dall'amministratore poiché il dipendente ha già firmato un contratto offline.`,
        nome_cognome: formData.nome_cognome,
        phone: formData.phone,
        data_nascita: formData.data_nascita,
        citta_nascita: formData.citta_nascita, // Added citta_nascita
        codice_fiscale: formData.codice_fiscale,
        indirizzo_residenza: formData.indirizzo_residenza,
        iban: formData.iban,
        taglia_maglietta: formData.taglia_maglietta,
        user_type: formData.user_type,
        ruoli_dipendente: formData.ruoli_dipendente,
        assigned_stores: formData.assigned_stores,
        employee_group: formData.employee_group,
        // function_name was here
        ore_settimanali: formData.ore_settimanali,
        data_inizio_contratto: formData.data_inizio_contratto,
        durata_contratto_mesi: formData.durata_contratto_mesi,
        status: 'firmato',
        data_invio: new Date().toISOString(),
        data_firma: new Date().toISOString(),
        firma_dipendente: 'Skippato Admin'
      });

      alert('Contratto skippato con successo! Il dipendente ha ora accesso completo.');
      handleCancel();

    } catch (error) {
      console.error('Error skipping contract:', error);
      alert('Errore durante lo skip del contratto');
    } finally {
      setSkippingContract(false);
    }
  };

  const handleSendContract = async () => {
    if (!canSendContract()) {
      if (!selectedTemplate) {
        alert('Seleziona un template per il contratto');
      } else {
        alert('Compila tutti i campi obbligatori prima di inviare il contratto');
      }
      return;
    }

    if (!confirm('Vuoi creare e inviare il contratto a questo dipendente?')) {
      return;
    }

    try {
      setSendingContract(true);

      console.log('Step 1: Saving user data...');
      await updateMutation.mutateAsync({
        id: editingUser.id,
        data: formData
      });
      console.log('✓ User data saved successfully');

      console.log('Step 2: Finding template...');
      const template = templates.find(t => t.id === selectedTemplate);
      if (!template) {
        throw new Error('Template non trovato. Riprova a selezionare un template.');
      }
      console.log('✓ Template found:', template.nome_template);

      console.log('Step 3: Replacing variables...');
      const replaceVariables = (content, data) => {
        let result = content;
        
        const oggi = new Date();
        let dataFineContratto = '';
        if (data.data_inizio_contratto && data.durata_contratto_mesi) {
          const dataInizio = new Date(data.data_inizio_contratto);
          const dataFine = new Date(dataInizio);
          dataFine.setMonth(dataFine.getMonth() + parseInt(data.durata_contratto_mesi));
          dataFineContratto = dataFine.toLocaleDateString('it-IT');
        }

        const variables = {
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
          '{{data_oggi}}': oggi.toLocaleDateString('it-IT'),
          '{{data_fine_contratto}}': dataFineContratto,
          '{{ruoli}}': (data.ruoli_dipendente || []).join(', ') || 'Nessun ruolo',
          '{{locali}}': (data.assigned_stores || []).join(', ') || 'Tutti i locali'
        };

        Object.keys(variables).forEach(key => {
          result = result.split(key).join(variables[key]);
        });

        return result;
      };

      const contenutoContratto = replaceVariables(template.contenuto_template, formData);
      console.log('✓ Variables replaced successfully');

      console.log('Step 4: Preparing contract data...');
      const contractData = {
        user_id: editingUser.id,
        user_email: editingUser.email,
        user_nome_cognome: formData.nome_cognome,
        template_id: template.id,
        template_nome: template.nome_template,
        contenuto_contratto: contenutoContratto,
        nome_cognome: formData.nome_cognome,
        phone: formData.phone,
        data_nascita: formData.data_nascita,
        citta_nascita: formData.citta_nascita || '',
        codice_fiscale: formData.codice_fiscale,
        indirizzo_residenza: formData.indirizzo_residenza,
        iban: formData.iban,
        taglia_maglietta: formData.taglia_maglietta || '',
        user_type: formData.user_type || 'dipendente',
        ruoli_dipendente: formData.ruoli_dipendente || [],
        assigned_stores: formData.assigned_stores || [],
        employee_group: formData.employee_group,
        ore_settimanali: formData.ore_settimanali,
        data_inizio_contratto: formData.data_inizio_contratto,
        durata_contratto_mesi: formData.durata_contratto_mesi,
        status: 'inviato',
        data_invio: new Date().toISOString()
      };
      
      console.log('Contract data prepared');

      console.log('Step 5: Creating contract record...');
      await createContrattoMutation.mutateAsync(contractData);
      console.log('✓ Contract created successfully');

      console.log('Step 6: Sending email notification...');
      try {
        await base44.integrations.Core.SendEmail({
          to: editingUser.email,
          subject: 'Nuovo Contratto di Lavoro',
          body: `Gentile ${formData.nome_cognome},\n\nÈ stato generato un nuovo contratto di lavoro per te.\nPuoi visualizzarlo e firmarlo accedendo alla piattaforma.\n\nCordiali saluti,\nSa Pizzedda`
        });
        console.log('✓ Email sent successfully');
      } catch (error) {
        console.error('✗ Error sending email:', error);
        console.warn('Contract created but email could not be sent');
        alert('Contratto creato con successo, ma l\'email non è stata inviata. Avvisa manualmente il dipendente.');
      }

      alert('Contratto creato e inviato con successo! ✅');
      handleCancel();

    } catch (error) {
      console.error('❌ Error in handleSendContract:', error);
      alert(error.message || 'Errore durante l\'invio del contratto. Controlla i log della console per dettagli.');
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

      {/* View User Modal */}
      {viewingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6 my-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#6b6b6b]">Scheda Utente</h2>
                <button
                  onClick={() => setViewingUser(null)}
                  className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <X className="w-5 h-5 text-[#9b9b9b]" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Header */}
                <div className="neumorphic-flat p-5 rounded-xl">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full neumorphic-pressed flex items-center justify-center">
                      <span className="text-2xl font-bold text-[#8b7355]">
                        {(viewingUser.nome_cognome || viewingUser.full_name || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#6b6b6b]">{viewingUser.nome_cognome || viewingUser.full_name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getUserTypeColor(viewingUser.user_type)}`}>
                        {getUserTypeLabel(viewingUser.user_type)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dati Anagrafici */}
                <div className="neumorphic-flat p-5 rounded-xl">
                  <h3 className="font-bold text-[#6b6b6b] mb-3">Dati Anagrafici</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[#9b9b9b]">Email</p>
                      <p className="text-[#6b6b6b] font-medium">{viewingUser.email}</p>
                    </div>
                    <div>
                      <p className="text-[#9b9b9b]">Telefono</p>
                      <p className="text-[#6b6b6b] font-medium">{viewingUser.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[#9b9b9b]">Data di Nascita</p>
                      <p className="text-[#6b6b6b] font-medium">
                        {viewingUser.data_nascita ? new Date(viewingUser.data_nascita).toLocaleDateString('it-IT') : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#9b9b9b]">Città di Nascita</p>
                      <p className="text-[#6b6b6b] font-medium">{viewingUser.citta_nascita || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[#9b9b9b]">Codice Fiscale</p>
                      <p className="text-[#6b6b6b] font-medium uppercase">{viewingUser.codice_fiscale || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[#9b9b9b]">Taglia Maglietta</p>
                      <p className="text-[#6b6b6b] font-medium">{viewingUser.taglia_maglietta || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[#9b9b9b]">Indirizzo</p>
                      <p className="text-[#6b6b6b] font-medium">{viewingUser.indirizzo_residenza || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[#9b9b9b]">IBAN</p>
                      <p className="text-[#6b6b6b] font-medium uppercase">{viewingUser.iban || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Documenti Caricati */}
                <div className="neumorphic-flat p-5 rounded-xl">
                  <h3 className="font-bold text-[#6b6b6b] mb-3 flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-[#8b7355]" />
                    Documenti Caricati
                  </h3>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="neumorphic-pressed p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[#9b9b9b]">Documento d'Identità</span>
                        {viewingUser.documento_identita_url ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <a 
                              href={viewingUser.documento_identita_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              Visualizza
                            </a>
                            <button
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = viewingUser.documento_identita_url;
                                a.download = `Documento_Identita_${viewingUser.nome_cognome || viewingUser.full_name || 'utente'}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                              }}
                              className="text-green-600 text-xs hover:underline flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer"
                              title="Scarica Documento d'Identità"
                            >
                              <FileText className="w-3 h-3" />
                              Scarica
                            </button>
                          </div>
                        ) : (
                          <X className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                    </div>
                    <div className="neumorphic-pressed p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[#9b9b9b]">Codice Fiscale (Documento)</span>
                        {viewingUser.codice_fiscale_documento_url ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <a 
                              href={viewingUser.codice_fiscale_documento_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              Visualizza
                            </a>
                            <button
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = viewingUser.codice_fiscale_documento_url;
                                a.download = `Codice_Fiscale_${viewingUser.nome_cognome || viewingUser.full_name || 'utente'}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                              }}
                              className="text-green-600 text-xs hover:underline flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer"
                              title="Scarica Codice Fiscale"
                            >
                              <FileText className="w-3 h-3" />
                              Scarica
                            </button>
                          </div>
                        ) : (
                          <X className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                    </div>
                    <div className="neumorphic-pressed p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[#9b9b9b]">Permesso di Soggiorno</span>
                        {viewingUser.permesso_soggiorno_url ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <a 
                              href={viewingUser.permesso_soggiorno_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              Visualizza
                            </a>
                            <button
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = viewingUser.permesso_soggiorno_url;
                                a.download = `Permesso_Soggiorno_${viewingUser.nome_cognome || viewingUser.full_name || 'utente'}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                              }}
                              className="text-green-600 text-xs hover:underline flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer"
                              title="Scarica Permesso di Soggiorno"
                            >
                              <FileText className="w-3 h-3" />
                              Scarica
                            </button>
                          </div>
                        ) : (
                          <span className="text-[#9b9b9b] text-xs">Non applicabile</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dati Lavorativi */}
                <div className="neumorphic-flat p-5 rounded-xl">
                  <h3 className="font-bold text-[#6b6b6b] mb-3">Dati Lavorativi</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[#9b9b9b]">Gruppo Contrattuale</p>
                      <p className="text-[#6b6b6b] font-medium">{viewingUser.employee_group || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[#9b9b9b]">Ore Settimanali</p>
                      <p className="text-[#6b6b6b] font-medium">{viewingUser.ore_settimanali || '-'}h</p>
                    </div>
                    <div>
                      <p className="text-[#9b9b9b]">Data Inizio</p>
                      <p className="text-[#6b6b6b] font-medium">
                        {viewingUser.data_inizio_contratto ? new Date(viewingUser.data_inizio_contratto).toLocaleDateString('it-IT') : '-'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[#9b9b9b]">Tipo Contratto</p>
                      <p className="text-[#6b6b6b] font-medium">
                        {viewingUser.tipo_contratto === 'indeterminato' ? (
                          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                            Tempo Indeterminato
                          </span>
                        ) : (
                          <>
                            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold mr-2">
                              Tempo Determinato
                            </span>
                            {viewingUser.durata_contratto_mesi > 0 && (
                              <span>{viewingUser.durata_contratto_mesi} mesi</span>
                            )}
                            {viewingUser.data_fine_contratto && (
                              <span>fino al {new Date(viewingUser.data_fine_contratto).toLocaleDateString('it-IT')}</span>
                            )}
                          </>
                        )}
                      </p>
                    </div>
                    {viewingUser.user_type === 'dipendente' && (
                      <div className="col-span-2">
                        <p className="text-[#9b9b9b] mb-2">Ruoli</p>
                        <div className="flex flex-wrap gap-2">
                          {viewingUser.ruoli_dipendente && viewingUser.ruoli_dipendente.length > 0 ? (
                            viewingUser.ruoli_dipendente.map((role, idx) => (
                              <span key={idx} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                                {role}
                              </span>
                            ))
                          ) : (
                            <span className="text-[#6b6b6b]">Nessun ruolo</span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="col-span-2">
                      <p className="text-[#9b9b9b]">Locali Assegnati</p>
                      <p className="text-[#6b6b6b] font-medium">
                        {!viewingUser.assigned_stores || viewingUser.assigned_stores.length === 0
                          ? 'Tutti i locali'
                          : viewingUser.assigned_stores.join(', ')}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[#9b9b9b]">Planday</p>
                      <div className="flex items-center gap-2 text-[#6b6b6b] font-medium">
                        {viewingUser.planday ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <X className="w-5 h-5 text-gray-400" />
                          )}
                          {viewingUser.planday ? 'Abilitato' : 'Non Abilitato'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </NeumorphicCard>
          </div>
        </div>
      )}

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

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Città di Nascita
                      </label>
                      <input
                        type="text"
                        value={formData.citta_nascita}
                        onChange={(e) => setFormData({ ...formData, citta_nascita: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                        placeholder="Cagliari"
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
                    
                    {/* Removed 'Ruolo/Funzione' input field */}

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

                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Tipo Contratto <span className="text-red-600">*</span>
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, tipo_contratto: 'determinato' })}
                          className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                            formData.tipo_contratto === 'determinato'
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                              : 'neumorphic-flat text-[#6b6b6b]'
                          }`}
                        >
                          Tempo Determinato
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, tipo_contratto: 'indeterminato', durata_contratto_mesi: 0, data_fine_contratto: '' })}
                          className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                            formData.tipo_contratto === 'indeterminato'
                              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                              : 'neumorphic-flat text-[#6b6b6b]'
                          }`}
                        >
                          Tempo Indeterminato
                        </button>
                      </div>
                    </div>

                    {formData.tipo_contratto === 'determinato' && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                            Durata Contratto (Mesi)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.durata_contratto_mesi}
                            onChange={(e) => setFormData({ ...formData, durata_contratto_mesi: parseInt(e.target.value) || 0, data_fine_contratto: '' })}
                            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                            placeholder="12"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                            Oppure Data Fine Contratto
                          </label>
                          <input
                            type="date"
                            value={formData.data_fine_contratto}
                            onChange={(e) => setFormData({ ...formData, data_fine_contratto: e.target.value, durata_contratto_mesi: 0 })}
                            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            Usa questo campo se preferisci specificare una data esatta
                          </p>
                        </div>
                      </>
                    )}

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

                    <div className="neumorphic-pressed p-3 rounded-lg">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.planday}
                          onChange={(e) => setFormData({ ...formData, planday: e.target.checked })}
                          className="w-5 h-5 rounded"
                        />
                        <span className="text-[#6b6b6b] font-medium">Abilitato Planday</span>
                      </label>
                    </div>

                    <div className="neumorphic-pressed p-3 rounded-lg bg-purple-50">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.abilitato_prove || false}
                          onChange={(e) => setFormData({ ...formData, abilitato_prove: e.target.checked })}
                          className="w-5 h-5 rounded"
                        />
                        <div>
                          <span className="text-[#6b6b6b] font-medium">Abilitato a fare Prove</span>
                          <p className="text-xs text-purple-600">Può affiancare candidati durante turni di prova</p>
                        </div>
                      </label>
                    </div>
                  </div>
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

                {/* Template Selection */}
                {isFormComplete() && (
                  <div className="neumorphic-flat p-5 rounded-xl border-2 border-[#8b7355]">
                    <h3 className="font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#8b7355]" />
                      Seleziona Template Contratto
                    </h3>
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
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-6 border-t border-[#c1c1c1] mt-6">
                <NeumorphicButton
                  onClick={handleCancel}
                  className="flex-1 min-w-[120px]"
                >
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton
                  onClick={handleSave}
                  variant="primary"
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-2"
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
                {isFormComplete() && ( // Changed to isFormComplete for the Skip button
                  <NeumorphicButton
                    onClick={handleSkipContract}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-2 bg-yellow-500 text-white"
                    disabled={skippingContract}
                  >
                    {skippingContract ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Skipping...
                      </>
                    ) : (
                      <>
                        <FastForward className="w-5 h-5" />
                        Skip Contratto
                      </>
                    )}
                  </NeumorphicButton>
                )}
                {canSendContract() && (
                  <NeumorphicButton
                    onClick={handleSendContract}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-2 bg-blue-500 text-white"
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
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Tipo</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Locali</th>
                  <th className="text-center p-3 text-[#9b9b9b] font-medium">Registrato</th>
                  <th className="text-center p-3 text-[#9b9b9b] font-medium">Planday</th>
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
                      <td className="p-3 text-center">
                        <span className="text-xs text-[#6b6b6b]">
                          {user.created_date ? (() => {
                            try {
                              return new Date(user.created_date).toLocaleDateString('it-IT');
                            } catch (e) {
                              return 'N/A';
                            }
                          })() : 'N/A'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center">
                          {user.planday ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <X className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
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
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewUser(user)}
                            className="neumorphic-flat p-2 rounded-lg hover:bg-purple-50 transition-colors"
                            title="Scheda utente"
                          >
                            <Eye className="w-4 h-4 text-purple-600" />
                          </button>
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
              <li>Compila TUTTI i campi obbligatori (marcati con *) e seleziona un "Template Contratto" per abilitare il bottone "Manda Contratto"</li>
              <li>Il contratto verrà creato automaticamente e inviato via email al dipendente</li>
              <li>Puoi visualizzare e gestire tutti i contratti dalla pagina "Contratti" nel menu People</li>
              <li>Se il dipendente ha già firmato un contratto offline, puoi usare "Skip Contratto" per dargli accesso e generare un contratto con status "firmato".</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}