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
  const [currentView, setCurrentView] = useState('turni'); // 'turni' o 'richieste'
  const [selectedStore, setSelectedStore] = useState('');
  const [weekStart, setWeekStart] = useState(moment().startOf('isoWeek'));
  const [showForm, setShowForm] = useState(false);
  const [editingTurno, setEditingTurno] = useState(null);
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

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allStores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  // Filtra solo gli store dove sono store manager (usando store_manager_id)
  const myStores = useMemo(() => {
    if (!currentUser?.id) return [];
    return allStores.filter(s => s.store_manager_id === currentUser.id);
  }, [allStores, currentUser]);

  // Imposta primo store come selezionato di default
  useEffect(() => {
    if (!selectedStore && myStores.length > 0) {
      setSelectedStore(myStores[0].id);
    }
  }, [myStores, selectedStore]);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  // Trasforma Employee in formato compatibile con User per il resto del codice
  const users = useMemo(() => {
    return employees.map(emp => ({
      id: emp.employee_id_external || emp.id,
      nome_cognome: emp.full_name,
      full_name: emp.full_name,
      email: emp.email,
      ruoli_dipendente: emp.function_name ? [emp.function_name] : []
    }));
  }, [employees]);

  const { data: turni = [], isLoading } = useQuery({
    queryKey: ['turni-store-manager', selectedStore, weekStart.format('YYYY-MM-DD')],
    queryFn: async () => {
      const startDate = weekStart.format('YYYY-MM-DD');
      const endDate = weekStart.clone().add(6, 'days').format('YYYY-MM-DD');
      
      const filters = {
        data: { $gte: startDate, $lte: endDate }
      };
      if (selectedStore) {
        filters.store_id = selectedStore;
      }
      return base44.entities.TurnoPlanday.filter(filters);
    },
    enabled: !!selectedStore,
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-store-manager'] });
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
    const tipoConfig = tipoTurnoConfigs.find(tc => tc.tipo_turno === tipoTurno);
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
                <div className="flex items-center gap-4">
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
                  >
                    {myStores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>

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
                    {users.filter(u => u.ruoli_dipendente?.includes(turnoForm.ruolo)).map(u => (
                      <option key={u.id} value={u.id}>
                        {u.nome_cognome || u.full_name}
                      </option>
                    ))}
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
                    <div key={turnoRichiedente.id} className="neumorphic-pressed p-4 rounded-xl">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <ArrowRightLeft className="w-5 h-5 text-purple-500" />
                            <span className="font-bold text-slate-800">{scambio.richiesto_da_nome}</span>
                            <span className="text-slate-500">↔</span>
                            <span className="font-bold text-slate-800">{scambio.richiesto_a_nome}</span>
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
                                {scambio.richiesto_da_nome} CEDE:
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
                              richiestoANome={scambio.richiesto_a_nome}
                              getStoreName={getStoreName}
                            />
                          </div>

                          <p className="text-xs text-slate-400 mt-2">
                            Richiesto il {moment(scambio.data_richiesta).format('DD/MM/YYYY HH:mm')}
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
                })}
              </div>
            )}
          </NeumorphicCard>
        )}
      </div>
    </ProtectedPage>
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