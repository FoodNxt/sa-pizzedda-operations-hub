import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import PlandayStoreView from "../components/planday/PlandayStoreView";
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, X, Save, Clock, 
  Store as StoreIcon, Trash2, Loader2, Users, Settings,
  ArrowRightLeft, Check, AlertTriangle, CheckCircle, MapPin
} from "lucide-react";
import moment from "moment";
import "moment/locale/it";

moment.locale('it');

const RUOLI = ["Pizzaiolo", "Cassiere", "Store Manager"];

export default function PlandayStoreManager() {
  const [currentView, setCurrentView] = useState('turni'); // 'turni', 'richieste', 'prove'
  const [selectedStore, setSelectedStore] = useState('');
  const [weekStart, setWeekStart] = useState(moment().startOf('isoWeek'));
  const [showForm, setShowForm] = useState(false);
  const [editingTurno, setEditingTurno] = useState(null);
  const [showCandidatoForm, setShowCandidatoForm] = useState(false);
  const [turnoForm, setTurnoForm] = useState({
    store_id: '',
    data: '',
    ora_inizio: '09:00',
    ora_fine: '17:00',
    ruolo: 'Pizzaiolo',
    dipendente_id: '',
    tipo_turno: 'Normale',
    note: ''
  });
  const [candidatoForm, setCandidatoForm] = useState({
    nome: '',
    cognome: '',
    telefono: '',
    posizione: 'Pizzaiolo',
    store_preferito: '',
    note: ''
  });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allStores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  // Store manager ha accesso a TUTTI gli store
  const myStores = useMemo(() => {
    return allStores;
  }, [allStores]);

  // Imposta primo store come selezionato di default
  useEffect(() => {
    if (!selectedStore && myStores.length > 0) {
      setSelectedStore(myStores[0].id);
    }
  }, [myStores, selectedStore]);

  // Carica TUTTI i dipendenti usando funzione backend con service role
  const { data: users = [] } = useQuery({
    queryKey: ['all-dipendenti-planday'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAllDipendentiForPlanday', {});
      return response.data.dipendenti || [];
    }
  });

  // Carica TUTTI i turni della settimana (non filtrati per store)
  const { data: allTurniWeek = [], isLoading } = useQuery({
    queryKey: ['turni-store-manager-all', weekStart.format('YYYY-MM-DD')],
    queryFn: async () => {
      const startDate = weekStart.format('YYYY-MM-DD');
      const endDate = weekStart.clone().add(6, 'days').format('YYYY-MM-DD');
      
      const allTurni = await base44.entities.TurnoPlanday.list();
      
      return allTurni.filter(t => 
        t.data >= startDate &&
        t.data <= endDate
      );
    }
  });

  // Filtra i turni lato client per lo store selezionato (se presente)
  const turni = useMemo(() => {
    if (!selectedStore) return allTurniWeek;
    
    const selectedStoreName = allStores.find(s => s.id === selectedStore)?.name;
    return allTurniWeek.filter(t => 
      t.store_id === selectedStore || t.store_nome === selectedStoreName
    );
  }, [allTurniWeek, selectedStore, allStores]);

  const { data: tipiTurnoConfigs = [] } = useQuery({
    queryKey: ['tipo-turno-configs'],
    queryFn: () => base44.entities.TipoTurnoConfig.list(),
  });

  const { data: formTrackerConfigs = [] } = useQuery({
    queryKey: ['form-tracker-configs'],
    queryFn: () => base44.entities.FormTrackerConfig.list(),
  });

  const { data: struttureTurno = [] } = useQuery({
    queryKey: ['strutture-turno'],
    queryFn: () => base44.entities.StrutturaTurno.list(),
  });

  const { data: candidati = [] } = useQuery({
    queryKey: ['candidati-planday'],
    queryFn: () => base44.entities.Candidato.filter({ stato: { $in: ['nuovo', 'in_valutazione', 'prova_programmata'] } }),
  });

  // Richieste scambi turni per i miei store
  const { data: scambiTurni = [] } = useQuery({
    queryKey: ['scambi-turni-sm', selectedStore],
    queryFn: async () => {
      const oggi = moment().format('YYYY-MM-DD');
      const myStoreIds = myStores.map(s => s.id);
      const allTurni = await base44.entities.TurnoPlanday.filter({
        data: { $gte: oggi }
      });
      // Filtra solo turni dei miei store con richieste pending/accepted
      return allTurni.filter(t => 
        myStoreIds.includes(t.store_id) &&
        t.richiesta_scambio && 
        ['pending', 'accepted_by_colleague'].includes(t.richiesta_scambio?.stato) &&
        t.id === t.richiesta_scambio?.mio_turno_id // Solo il turno del richiedente
      );
    },
    enabled: myStores.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TurnoPlanday.create(data),
    onSuccess: async (newTurno, variables) => {
      queryClient.invalidateQueries({ queryKey: ['turni-store-manager'] });
      
      // Invia email di notifica al dipendente se assegnato
      if (variables.dipendente_id && variables.dipendente_nome) {
        try {
          const dipendente = users.find(u => u.id === variables.dipendente_id);
          
          if (dipendente?.email) {
            const emailTemplates = await base44.entities.EmailNotificationTemplate.filter({
              tipo_notifica: 'turno',
              attivo: true
            });

            if (emailTemplates.length > 0) {
              const emailTemplate = emailTemplates[0];
              const storeName = getStoreName(variables.store_id);
              
              let emailBody = emailTemplate.corpo
                .replace(/\{\{nome_dipendente\}\}/g, variables.dipendente_nome)
                .replace(/\{\{data\}\}/g, moment(variables.data).format('DD/MM/YYYY'))
                .replace(/\{\{ora_inizio\}\}/g, variables.ora_inizio)
                .replace(/\{\{ora_fine\}\}/g, variables.ora_fine)
                .replace(/\{\{ruolo\}\}/g, variables.ruolo)
                .replace(/\{\{store\}\}/g, storeName)
                .replace(/\{\{tipo_turno\}\}/g, variables.tipo_turno || 'Normale');

              let emailSubject = emailTemplate.oggetto
                .replace(/\{\{nome_dipendente\}\}/g, variables.dipendente_nome)
                .replace(/\{\{data\}\}/g, moment(variables.data).format('DD/MM/YYYY'));

              await base44.integrations.Core.SendEmail({
                to: dipendente.email,
                subject: emailSubject,
                body: emailBody
              });

              await base44.entities.EmailLog.create({
                tipo_notifica: 'turno',
                destinatario_email: dipendente.email,
                destinatario_nome: variables.dipendente_nome,
                oggetto: emailSubject,
                corpo: emailBody,
                data_invio: new Date().toISOString(),
                inviato_da: currentUser.email,
                status: 'inviata',
                riferimento_id: newTurno.id
              });
            }
          }
        } catch (emailError) {
          console.error('Errore invio email turno:', emailError);
        }
      }
      
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TurnoPlanday.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-store-manager'] });
      queryClient.invalidateQueries({ queryKey: ['scambi-turni-sm'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TurnoPlanday.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-store-manager'] });
    },
  });

  const createCandidatoMutation = useMutation({
    mutationFn: (data) => base44.entities.Candidato.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidati-planday'] });
      setCandidatoForm({
        nome: '',
        cognome: '',
        telefono: '',
        posizione: 'Pizzaiolo',
        store_preferito: '',
        note: ''
      });
      setShowCandidatoForm(false);
      alert('Candidato aggiunto con successo!');
    },
  });

  const resetForm = () => {
    setTurnoForm({
      store_id: selectedStore || '',
      data: '',
      ora_inizio: '09:00',
      ora_fine: '17:00',
      ruolo: 'Pizzaiolo',
      dipendente_id: '',
      tipo_turno: 'Normale',
      note: ''
    });
    setEditingTurno(null);
    setShowForm(false);
  };

  const handleSaveTurnoFromChild = (turnoData, existingId = null) => {
    const dipendente = users.find(u => u.id === turnoData.dipendente_id);
    const momento = getTurnoTipo({ ora_inizio: turnoData.ora_inizio });
    const sequence = momento === 'Mattina' ? 'first' : 'second';
    
    const dataToSave = {
      ...turnoData,
      dipendente_nome: dipendente?.nome_cognome || dipendente?.full_name || '',
      stato: 'programmato',
      momento_turno: momento,
      turno_sequence: sequence
    };
    
    if (existingId) {
      updateMutation.mutate({ id: existingId, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const getTurnoTipo = (turno) => {
    const [h] = turno.ora_inizio.split(':').map(Number);
    return h < 14 ? 'Mattina' : 'Sera';
  };

  const getTurnoSequenceFromMomento = (turno) => {
    const momento = getTurnoTipo(turno);
    return momento === 'Mattina' ? 'first' : 'second';
  };

  const getFormDovutiPerTurno = (turno) => {
    if (!turno) return [];
    
    const tipoTurno = turno.tipo_turno || 'Normale';
    const tipoConfig = tipiTurnoConfigs.find(tc => tc.tipo_turno === tipoTurno);
    if (tipoConfig && tipoConfig.richiede_form === false) return [];
    
    const turnoRuolo = turno.ruolo;
    const turnoStoreId = turno.store_id;
    const turnoSequence = turno.turno_sequence || getTurnoSequenceFromMomento(turno);
    const turnoDayOfWeek = new Date(turno.data).getDay();
    
    const activeConfigs = formTrackerConfigs.filter(c => c.is_active);
    const formDovuti = [];
    
    activeConfigs.forEach(config => {
      const configRoles = config.assigned_roles || [];
      if (configRoles.length > 0 && !configRoles.includes(turnoRuolo)) return;
      
      const configStores = config.assigned_stores || [];
      if (configStores.length > 0 && !configStores.includes(turnoStoreId)) return;
      
      const daysOfWeek = config.days_of_week || [];
      if (daysOfWeek.length > 0 && !daysOfWeek.includes(turnoDayOfWeek)) return;
      
      const configSequences = config.shift_sequences || [config.shift_sequence || 'first'];
      if (!configSequences.includes(turnoSequence)) return;
      
      formDovuti.push(config.form_name);
    });
    
    return formDovuti;
  };

  const getAttivitaTurno = (turno) => {
    if (!turno.ruolo || !turno.store_id) return [];
    
    const [h] = turno.ora_inizio.split(':').map(Number);
    const momento = h < 14 ? 'Mattina' : 'Sera';
    const dayOfWeek = new Date(turno.data).getDay();
    
    const schemasApplicabili = struttureTurno.filter(st => {
      if (st.ruolo !== turno.ruolo) return false;
      
      const stStores = st.assigned_stores || [];
      if (stStores.length > 0 && !stStores.includes(turno.store_id)) return false;
      
      if (st.giorno_settimana !== dayOfWeek) return false;
      
      if (st.is_active === false) return false;
      
      return true;
    });
    
    if (schemasApplicabili.length === 0) return [];
    
    const attivitaMap = new Map();
    
    schemasApplicabili.forEach(st => {
      if (st.slots && Array.isArray(st.slots) && st.slots.length > 0) {
        st.slots.forEach(slot => {
          if (slot.attivita && !attivitaMap.has(slot.attivita)) {
            attivitaMap.set(slot.attivita, {
              nome: slot.attivita,
              ora_inizio: slot.ora_inizio,
              ora_fine: slot.ora_fine,
            });
          }
        });
      }
    });
    
    return Array.from(attivitaMap.values());
  };

  const getStoreName = (storeId) => allStores.find(s => s.id === storeId)?.name || '';

  const [coloriRuolo] = useState({
    'Pizzaiolo': '#f97316',
    'Cassiere': '#3b82f6',
    'Store Manager': '#a855f7'
  });

  const [coloriTipoTurno] = useState({
    'Normale': '#94a3b8',
    'Straordinario': '#ef4444',
    'Formazione': '#22c55e',
    'Affiancamento': '#f59e0b',
    'Apertura': '#3b82f6',
    'Chiusura': '#8b5cf6'
  });

  const tipiTurno = ['Normale', 'Straordinario', 'Formazione', 'Affiancamento', 'Apertura', 'Chiusura'];

  if (!currentUser) {
    return (
      <ProtectedPage pageName="PlandayStoreManager">
        <div className="max-w-4xl mx-auto p-8">
          <NeumorphicCard className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-4" />
            <p className="text-slate-600">Caricamento...</p>
          </NeumorphicCard>
        </div>
      </ProtectedPage>
    );
  }

  if (myStores.length === 0) {
    return (
      <ProtectedPage pageName="PlandayStoreManager">
        <div className="max-w-4xl mx-auto p-8">
          <NeumorphicCard className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Nessuno Store Assegnato</h2>
            <p className="text-slate-600">Non sei assegnato come Store Manager a nessun locale.</p>
          </NeumorphicCard>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage pageName="PlandayStoreManager">
      <div className="max-w-full mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              Planday Store Manager
            </h1>
            <p className="text-slate-500 mt-1">Gestione turni per i tuoi store</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <NeumorphicButton 
              onClick={() => setCurrentView('turni')}
              variant={currentView === 'turni' ? 'primary' : 'default'}
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Gestione Turni
            </NeumorphicButton>
            <NeumorphicButton 
              onClick={() => setCurrentView('richieste')}
              variant={currentView === 'richieste' ? 'primary' : 'default'}
              className="flex items-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Richieste Scambi
              {scambiTurni.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {scambiTurni.length}
                </span>
              )}
            </NeumorphicButton>
            <NeumorphicButton 
              onClick={() => setCurrentView('prove')}
              variant={currentView === 'prove' ? 'primary' : 'default'}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Prove
            </NeumorphicButton>
          </div>
        </div>

        {/* Vista Turni */}
        {currentView === 'turni' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <NeumorphicCard className="p-4 text-center">
                <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-800">{turni.length}</p>
                <p className="text-xs text-slate-500">Turni Settimana</p>
              </NeumorphicCard>
              <NeumorphicCard className="p-4 text-center">
                <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">
                  {new Set(turni.map(t => t.dipendente_id).filter(Boolean)).size}
                </p>
                <p className="text-xs text-slate-500">Dipendenti Attivi</p>
              </NeumorphicCard>
              <NeumorphicCard className="p-4 text-center">
                <StoreIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-600">{myStores.length}</p>
                <p className="text-xs text-slate-500">Tuoi Store</p>
              </NeumorphicCard>
            </div>

            {/* Controls */}
            <NeumorphicCard className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <NeumorphicButton onClick={() => setWeekStart(weekStart.clone().subtract(1, 'week'))}>
                    <ChevronLeft className="w-4 h-4" />
                  </NeumorphicButton>
                  <span className="px-4 py-2 font-medium text-slate-700 whitespace-nowrap">
                    {weekStart.format('DD MMM')} - {weekStart.clone().add(6, 'days').format('DD MMM YYYY')}
                  </span>
                  <NeumorphicButton onClick={() => setWeekStart(weekStart.clone().add(1, 'week'))}>
                    <ChevronRight className="w-4 h-4" />
                  </NeumorphicButton>
                  <NeumorphicButton onClick={() => setWeekStart(moment().startOf('isoWeek'))}>
                    Oggi
                  </NeumorphicButton>
                </div>

                <NeumorphicButton 
                  onClick={() => {
                    setTurnoForm({ 
                      store_id: selectedStore,
                      data: moment().format('YYYY-MM-DD'),
                      ora_inizio: '09:00',
                      ora_fine: '17:00',
                      ruolo: 'Pizzaiolo',
                      dipendente_id: '',
                      tipo_turno: 'Normale',
                      note: ''
                    });
                    setShowForm(true);
                  }} 
                  variant="primary" 
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nuovo Turno
                </NeumorphicButton>
              </div>
            </NeumorphicCard>

            {/* Form Turno */}
            {showForm && (
              <NeumorphicCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingTurno ? 'Modifica Turno' : 'Nuovo Turno'}
                  </h2>
                  <button onClick={resetForm} className="nav-button p-2 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Data *</label>
                    <input
                      type="date"
                      value={turnoForm.data}
                      onChange={(e) => setTurnoForm({ ...turnoForm, data: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Ruolo *</label>
                    <select
                      value={turnoForm.ruolo}
                      onChange={(e) => setTurnoForm({ ...turnoForm, ruolo: e.target.value, dipendente_id: '' })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    >
                      {RUOLI.map(ruolo => (
                        <option key={ruolo} value={ruolo}>{ruolo}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Tipo Turno</label>
                    <select
                      value={turnoForm.tipo_turno}
                      onChange={(e) => setTurnoForm({ ...turnoForm, tipo_turno: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    >
                      {tipiTurno.map(tipo => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Ora Inizio *</label>
                    <input
                      type="time"
                      value={turnoForm.ora_inizio}
                      onChange={(e) => setTurnoForm({ ...turnoForm, ora_inizio: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Ora Fine *</label>
                    <input
                      type="time"
                      value={turnoForm.ora_fine}
                      onChange={(e) => setTurnoForm({ ...turnoForm, ora_fine: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Dipendente</label>
                  <select
                    value={turnoForm.dipendente_id}
                    onChange={(e) => setTurnoForm({ ...turnoForm, dipendente_id: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="">Non assegnato</option>
                    {users
                      .filter(u => {
                        // Filtra solo per ruolo
                        return u.ruoli_dipendente?.includes(turnoForm.ruolo);
                      })
                      .sort((a, b) => {
                        const nameA = a.nome_cognome || a.full_name || '';
                        const nameB = b.nome_cognome || b.full_name || '';
                        return nameA.localeCompare(nameB);
                      })
                      .map(u => {
                        // Controlla se ha già turni in quella data/orario
                        const altriTurni = turni.filter(t => 
                          t.dipendente_id === u.id && 
                          t.data === turnoForm.data &&
                          t.id !== editingTurno?.id
                        );
                        
                        let conflitto = false;
                        if (turnoForm.ora_inizio && turnoForm.ora_fine && altriTurni.length > 0) {
                          const [startH, startM] = turnoForm.ora_inizio.split(':').map(Number);
                          const [endH, endM] = turnoForm.ora_fine.split(':').map(Number);
                          const startMinutes = startH * 60 + startM;
                          const endMinutes = endH * 60 + endM;
                          
                          conflitto = altriTurni.some(t => {
                            const [tStartH, tStartM] = t.ora_inizio.split(':').map(Number);
                            const [tEndH, tEndM] = t.ora_fine.split(':').map(Number);
                            const tStartMinutes = tStartH * 60 + tStartM;
                            const tEndMinutes = tEndH * 60 + tEndM;
                            
                            return (
                              (startMinutes >= tStartMinutes && startMinutes < tEndMinutes) ||
                              (endMinutes > tStartMinutes && endMinutes <= tEndMinutes) ||
                              (startMinutes <= tStartMinutes && endMinutes >= tEndMinutes)
                            );
                          });
                        }
                        
                        const label = `${u.nome_cognome || u.full_name}${conflitto ? ' ⚠️ GIÀ IN TURNO' : altriTurni.length > 0 ? ' ✓ Disponibile' : ''}`;
                        
                        return (
                          <option key={u.id} value={u.id} disabled={conflitto}>
                            {label}
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Note</label>
                  <input
                    type="text"
                    value={turnoForm.note}
                    onChange={(e) => setTurnoForm({ ...turnoForm, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    placeholder="Note opzionali..."
                  />
                </div>

                <div className="flex gap-3">
                  <NeumorphicButton onClick={resetForm} className="flex-1">Annulla</NeumorphicButton>
                  <NeumorphicButton 
                    onClick={() => {
                      const dipendente = users.find(u => u.id === turnoForm.dipendente_id);
                      const momento = getTurnoTipo({ ora_inizio: turnoForm.ora_inizio });
                      const sequence = momento === 'Mattina' ? 'first' : 'second';
                      
                      const dataToSave = {
                        ...turnoForm,
                        dipendente_nome: dipendente?.nome_cognome || dipendente?.full_name || '',
                        momento_turno: momento,
                        turno_sequence: sequence,
                        stato: 'programmato'
                      };

                      if (editingTurno) {
                        updateMutation.mutate({ id: editingTurno.id, data: dataToSave });
                      } else {
                        createMutation.mutate(dataToSave);
                      }
                    }}
                    variant="primary" 
                    className="flex-1 flex items-center justify-center gap-2"
                    disabled={!turnoForm.data || !turnoForm.ora_inizio || !turnoForm.ora_fine}
                  >
                    <Save className="w-4 h-4" />
                    Salva
                  </NeumorphicButton>
                </div>
              </NeumorphicCard>
            )}

            {/* Vista Store */}
            <PlandayStoreView
              turni={turni}
              users={users}
              stores={myStores}
              selectedStore={selectedStore}
              setSelectedStore={setSelectedStore}
              weekStart={weekStart}
              setWeekStart={setWeekStart}
              onEditTurno={(turno) => {
                setEditingTurno(turno);
                setTurnoForm({
                  store_id: turno.store_id,
                  data: turno.data,
                  ora_inizio: turno.ora_inizio,
                  ora_fine: turno.ora_fine,
                  ruolo: turno.ruolo,
                  dipendente_id: turno.dipendente_id || '',
                  tipo_turno: turno.tipo_turno || 'Normale',
                  note: turno.note || ''
                });
                setShowForm(true);
              }}
              onAddTurno={(day, dipendenteId) => {
                const dipendente = users.find(u => u.id === dipendenteId);
                setTurnoForm({
                  store_id: selectedStore,
                  data: day.format('YYYY-MM-DD'),
                  ora_inizio: '09:00',
                  ora_fine: '17:00',
                  ruolo: dipendente?.ruoli_dipendente?.[0] || 'Pizzaiolo',
                  dipendente_id: dipendenteId,
                  tipo_turno: 'Normale',
                  note: ''
                });
                setShowForm(true);
              }}
              onSaveTurno={handleSaveTurnoFromChild}
              onDeleteTurno={(id) => {
                if (confirm('Eliminare questo turno?')) {
                  deleteMutation.mutate(id);
                }
              }}
              getStoreName={getStoreName}
              tipiTurno={tipiTurno}
              coloriTipoTurno={coloriTipoTurno}
              coloriRuolo={coloriRuolo}
              formTrackerConfigs={formTrackerConfigs}
              struttureTurno={struttureTurno}
              getFormDovutiPerTurno={getFormDovutiPerTurno}
              getAttivitaTurno={getAttivitaTurno}
              getTurnoSequenceFromMomento={getTurnoSequenceFromMomento}
              candidati={candidati}
            />
          </>
        )}

        {/* Vista Prove */}
        {currentView === 'prove' && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Candidati per Prove
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Aggiungi candidati che andranno a popolare la pagina ATS
                </p>
              </div>
              <NeumorphicButton
                onClick={() => setShowCandidatoForm(true)}
                variant="primary"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nuovo Candidato
              </NeumorphicButton>
            </div>

            {/* Form Candidato */}
            {showCandidatoForm && (
              <NeumorphicCard className="p-6 mb-6 bg-blue-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Aggiungi Candidato</h3>
                  <button onClick={() => setShowCandidatoForm(false)} className="nav-button p-2 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Nome *</label>
                    <input
                      type="text"
                      value={candidatoForm.nome}
                      onChange={(e) => setCandidatoForm({ ...candidatoForm, nome: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      placeholder="Mario"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Cognome *</label>
                    <input
                      type="text"
                      value={candidatoForm.cognome}
                      onChange={(e) => setCandidatoForm({ ...candidatoForm, cognome: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      placeholder="Rossi"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Telefono *</label>
                    <input
                      type="tel"
                      value={candidatoForm.telefono}
                      onChange={(e) => setCandidatoForm({ ...candidatoForm, telefono: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      placeholder="+39 123 456 7890"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Posizione *</label>
                    <select
                      value={candidatoForm.posizione}
                      onChange={(e) => setCandidatoForm({ ...candidatoForm, posizione: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    >
                      <option value="Pizzaiolo">Pizzaiolo</option>
                      <option value="Cassiere">Cassiere</option>
                      <option value="Store Manager">Store Manager</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Store Preferito</label>
                  <select
                    value={candidatoForm.store_preferito}
                    onChange={(e) => setCandidatoForm({ ...candidatoForm, store_preferito: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="">-- Nessuna preferenza --</option>
                    {myStores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Note</label>
                  <textarea
                    value={candidatoForm.note}
                    onChange={(e) => setCandidatoForm({ ...candidatoForm, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none h-24"
                    placeholder="Note aggiuntive sul candidato..."
                  />
                </div>

                <div className="flex gap-3">
                  <NeumorphicButton onClick={() => setShowCandidatoForm(false)} className="flex-1">
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton
                    onClick={() => {
                      if (!candidatoForm.nome || !candidatoForm.cognome || !candidatoForm.telefono) {
                        alert('Compila tutti i campi obbligatori');
                        return;
                      }
                      createCandidatoMutation.mutate({
                        ...candidatoForm,
                        prova_dipendente_id: currentUser?.id,
                        prova_dipendente_nome: currentUser?.nome_cognome || currentUser?.full_name
                      });
                    }}
                    variant="primary"
                    className="flex-1 flex items-center justify-center gap-2"
                    disabled={createCandidatoMutation.isPending}
                  >
                    <Save className="w-4 h-4" />
                    Salva Candidato
                  </NeumorphicButton>
                </div>
              </NeumorphicCard>
            )}

            {/* Lista Candidati */}
            <div className="space-y-3">
              {candidati.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nessun candidato inserito</p>
                </div>
              ) : (
                candidati.map(candidato => {
                  if (!candidato) return null;
                  return (
                    <div key={candidato.id} className="neumorphic-pressed p-4 rounded-xl">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-800 text-lg">
                            {candidato.nome} {candidato.cognome}
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                            <div className="text-slate-600">
                              📞 {candidato.telefono || 'N/A'}
                            </div>
                            <div className="text-slate-600">
                              👤 {candidato.posizione || 'N/A'}
                            </div>
                            {candidato.store_preferito && (
                              <div className="text-slate-600">
                                📍 {getStoreName(candidato.store_preferito) || 'N/A'}
                              </div>
                            )}
                            <div>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                candidato.stato === 'nuovo' ? 'bg-blue-100 text-blue-800' :
                                candidato.stato === 'in_valutazione' ? 'bg-yellow-100 text-yellow-800' :
                                candidato.stato === 'prova_programmata' ? 'bg-purple-100 text-purple-800' :
                                candidato.stato === 'assunto' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {candidato.stato === 'nuovo' ? 'Nuovo' :
                                 candidato.stato === 'in_valutazione' ? 'In valutazione' :
                                 candidato.stato === 'prova_programmata' ? 'Prova programmata' :
                                 candidato.stato === 'assunto' ? 'Assunto' : 'Scartato'}
                              </span>
                            </div>
                          </div>
                          {candidato.note && (
                            <p className="text-sm text-slate-500 mt-2">{candidato.note}</p>
                          )}
                          {candidato.prova_dipendente_nome && (
                            <p className="text-xs text-slate-400 mt-2">
                              Inserito da: {candidato.prova_dipendente_nome}
                            </p>
                          )}
                          {candidato.prova_data && moment(candidato.prova_data).isValid() && (
                            <p className="text-xs text-blue-600 mt-1">
                              📅 Prova: {moment(candidato.prova_data).format('DD/MM/YYYY')} {candidato.prova_ora_inizio && `alle ${candidato.prova_ora_inizio}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </NeumorphicCard>
        )}

        {/* Vista Richieste Scambi */}
        {currentView === 'richieste' && (
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-purple-500" />
              Richieste Scambio Turni
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Approva o rifiuta le richieste di scambio turno per i tuoi store
            </p>

            {scambiTurni.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
                <p className="text-slate-500">Nessuna richiesta di scambio in attesa</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scambiTurni.sort((a, b) => new Date(b.richiesta_scambio?.data_richiesta) - new Date(a.richiesta_scambio?.data_richiesta)).map(turnoRichiedente => {
                  const scambio = turnoRichiedente.richiesta_scambio;
                  
                  return (
                    <ScambioTurnoCard 
                      key={turnoRichiedente.id}
                      turnoRichiedente={turnoRichiedente}
                      scambio={scambio}
                      currentUser={currentUser}
                      queryClient={queryClient}
                      getStoreName={getStoreName}
                    />
                  );
                })}


              </div>
            )}
          </NeumorphicCard>
        )}
      </div>
    </ProtectedPage>
  );
}

// Componente per gestire l'intera card di scambio
function ScambioTurnoCard({ turnoRichiedente, scambio, currentUser, queryClient, getStoreName }) {
  const { data: turnoAltro } = useQuery({
    queryKey: ['turno-altro-sm', scambio.suo_turno_id],
    queryFn: async () => {
      const turni = await base44.entities.TurnoPlanday.filter({ id: scambio.suo_turno_id });
      return turni[0] || null;
    },
    enabled: !!scambio.suo_turno_id,
  });

  const nomeRicevente = turnoAltro?.dipendente_nome || scambio.richiesto_a_nome || 'Caricamento...';

  return (
    <div className="neumorphic-pressed p-4 rounded-xl">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <ArrowRightLeft className="w-5 h-5 text-purple-500" />
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-lg">
              <span className="text-xs text-blue-600 font-medium">CEDE:</span>
              <span className="font-bold text-slate-800">{scambio.richiesto_da_nome || turnoRichiedente.dipendente_nome}</span>
            </div>
            <span className="text-slate-400">→</span>
            <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-lg">
              <span className="text-xs text-green-600 font-medium">RICEVE:</span>
              <span className="font-bold text-slate-800">{nomeRicevente}</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              scambio.stato === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              scambio.stato === 'accepted_by_colleague' ? 'bg-blue-100 text-blue-800' :
              'bg-slate-100 text-slate-800'
            }`}>
              {scambio.stato === 'pending' ? 'In attesa collega' : 'Da approvare'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Turno CEDUTO */}
            <div className="p-3 bg-red-50 rounded-lg border-2 border-red-200">
              <p className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1">
                <X className="w-3 h-3" />
                {scambio.richiesto_da_nome || turnoRichiedente.dipendente_nome} CEDE:
              </p>
              <p className="font-medium text-slate-700 text-sm">
                {moment(turnoRichiedente.data).format('ddd DD/MM')}
              </p>
              <div className="text-xs text-slate-600 mt-1">
                🕐 {turnoRichiedente.ora_inizio} - {turnoRichiedente.ora_fine}
              </div>
              <div className="text-xs text-slate-600">
                👤 {turnoRichiedente.ruolo}
              </div>
              <div className="text-xs text-slate-500">
                📍 {getStoreName(turnoRichiedente.store_id)}
              </div>
            </div>

            {/* Turno RICHIESTO */}
            <TurnoAltroDisplay 
              turnoId={scambio.suo_turno_id}
              richiestoANome={nomeRicevente}
              getStoreName={getStoreName}
            />
          </div>

          <p className="text-xs text-slate-400 mt-2">
            Richiesto il {scambio.data_richiesta && moment(scambio.data_richiesta).isValid() ? moment(scambio.data_richiesta).format('DD/MM/YYYY HH:mm') : 'N/A'}
          </p>
        </div>
        
        {scambio.stato === 'accepted_by_colleague' && (
          <div className="flex flex-col gap-2 ml-3">
            <button
              onClick={async () => {
                const [turno1List, turno2List] = await Promise.all([
                  base44.entities.TurnoPlanday.filter({ id: scambio.mio_turno_id }),
                  base44.entities.TurnoPlanday.filter({ id: scambio.suo_turno_id })
                ]);
                
                const turno1 = turno1List[0];
                const turno2 = turno2List[0];
                
                if (!turno1 || !turno2) {
                  alert('Errore: turni non trovati');
                  return;
                }
                
                const updatedRichiesta = {
                  ...scambio,
                  stato: 'approved_by_manager',
                  data_approvazione_manager: new Date().toISOString(),
                  approvato_da: currentUser?.id,
                  approvato_da_nome: currentUser?.nome_cognome || currentUser?.full_name
                };
                
                await Promise.all([
                  base44.entities.TurnoPlanday.update(turno1.id, {
                    dipendente_id: turno2.dipendente_id,
                    dipendente_nome: turno2.dipendente_nome,
                    richiesta_scambio: updatedRichiesta
                  }),
                  base44.entities.TurnoPlanday.update(turno2.id, {
                    dipendente_id: turno1.dipendente_id,
                    dipendente_nome: turno1.dipendente_nome,
                    richiesta_scambio: updatedRichiesta
                  })
                ]);
                
                queryClient.invalidateQueries({ queryKey: ['scambi-turni-sm'] });
                queryClient.invalidateQueries({ queryKey: ['turni-store-manager'] });
              }}
              className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Approva
            </button>
            <button
              onClick={async () => {
                const updatedRichiesta = {
                  ...scambio,
                  stato: 'rejected_by_manager',
                  data_approvazione_manager: new Date().toISOString(),
                  approvato_da: currentUser?.id,
                  approvato_da_nome: currentUser?.nome_cognome || currentUser?.full_name
                };
                
                await Promise.all([
                  base44.entities.TurnoPlanday.update(scambio.mio_turno_id, {
                    richiesta_scambio: updatedRichiesta
                  }),
                  base44.entities.TurnoPlanday.update(scambio.suo_turno_id, {
                    richiesta_scambio: updatedRichiesta
                  })
                ]);
                
                queryClient.invalidateQueries({ queryKey: ['scambi-turni-sm'] });
              }}
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Rifiuta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente per mostrare il turno dell'altro dipendente
function TurnoAltroDisplay({ turnoId, richiestoANome, getStoreName }) {
  const { data: turnoAltro, isLoading } = useQuery({
    queryKey: ['turno-altro-sm', turnoId],
    queryFn: async () => {
      const turni = await base44.entities.TurnoPlanday.filter({ id: turnoId });
      return turni[0] || null;
    },
    enabled: !!turnoId,
  });

  if (isLoading) {
    return (
      <div className="p-3 bg-green-50 rounded-lg border-2 border-green-200">
        <Loader2 className="w-4 h-4 animate-spin text-green-600" />
      </div>
    );
  }

  if (!turnoAltro) return null;

  return (
    <div className="p-3 bg-green-50 rounded-lg border-2 border-green-200">
      <p className="text-xs font-bold text-green-600 mb-2 flex items-center gap-1">
        <Check className="w-3 h-3" />
        {richiestoANome} RICEVE:
      </p>
      <p className="font-medium text-slate-700 text-sm">
        {moment(turnoAltro.data).format('ddd DD/MM')}
      </p>
      <div className="text-xs text-slate-600 mt-1">
        🕐 {turnoAltro.ora_inizio} - {turnoAltro.ora_fine}
      </div>
      <div className="text-xs text-slate-600">
        👤 {turnoAltro.ruolo}
      </div>
      <div className="text-xs text-slate-500">
        📍 {getStoreName(turnoAltro.store_id)}
      </div>
    </div>
  );
}