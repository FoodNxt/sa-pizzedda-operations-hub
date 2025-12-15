import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, X, Save, Clock, 
  User, Trash2, Loader2, MapPin, Users, ArrowRightLeft, Check, CheckCircle
} from "lucide-react";
import moment from "moment";
import "moment/locale/it";

moment.locale('it');

const RUOLI = ["Pizzaiolo", "Cassiere", "Store Manager"];

export default function PlandayStoreManager() {
  const [activeTab, setActiveTab] = useState('turni'); // 'turni' or 'richieste'
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

  // Current user (Store Manager)
  const { data: currentUser } = useQuery({
    queryKey: ['current-user-sm'],
    queryFn: () => base44.auth.me(),
  });

  // Stores where user is Store Manager
  const { data: allStores = [] } = useQuery({
    queryKey: ['all-stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const myStores = useMemo(() => {
    if (!currentUser?.id) return [];
    return allStores.filter(s => s.store_manager_id === currentUser.id);
  }, [allStores, currentUser]);

  // Automatically select first store if only one
  React.useEffect(() => {
    if (myStores.length === 1 && !selectedStore) {
      setSelectedStore(myStores[0].id);
    }
  }, [myStores, selectedStore]);

  const { data: users = [] } = useQuery({
    queryKey: ['users-sm'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: turni = [], isLoading } = useQuery({
    queryKey: ['turni-sm', selectedStore, weekStart.format('YYYY-MM-DD')],
    queryFn: async () => {
      if (!selectedStore) return [];
      const startDate = weekStart.format('YYYY-MM-DD');
      const endDate = weekStart.clone().add(6, 'days').format('YYYY-MM-DD');
      
      return base44.entities.TurnoPlanday.filter({
        store_id: selectedStore,
        data: { $gte: startDate, $lte: endDate }
      });
    },
    enabled: !!selectedStore,
  });

  // Richieste scambio per gli store del manager
  const { data: scambiTurni = [] } = useQuery({
    queryKey: ['scambi-turni-sm', myStores.map(s => s.id)],
    queryFn: async () => {
      if (myStores.length === 0) return [];
      const allTurni = await base44.entities.TurnoPlanday.list('-data', 500);
      
      // Filtra turni degli store del manager con richieste pending o accepted_by_colleague
      // Mostra solo il turno del richiedente (mio_turno_id)
      return allTurni.filter(t => 
        t.richiesta_scambio && 
        myStores.some(s => s.id === t.store_id) &&
        ['pending', 'accepted_by_colleague'].includes(t.richiesta_scambio.stato) &&
        t.id === t.richiesta_scambio.mio_turno_id
      );
    },
    enabled: myStores.length > 0 && activeTab === 'richieste',
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TurnoPlanday.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-sm'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TurnoPlanday.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-sm'] });
      queryClient.invalidateQueries({ queryKey: ['scambi-turni-sm'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TurnoPlanday.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-sm'] });
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

  const handleEditTurno = (turno) => {
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
  };

  const handleSaveTurno = async () => {
    const dipendente = users.find(u => u.id === turnoForm.dipendente_id);
    const momento = turnoForm.ora_inizio.split(':')[0] < 14 ? 'Mattina' : 'Sera';
    const sequence = momento === 'Mattina' ? 'first' : 'second';
    
    const dataToSave = {
      ...turnoForm,
      dipendente_nome: dipendente?.nome_cognome || dipendente?.full_name || '',
      momento_turno: momento,
      turno_sequence: sequence,
      stato: 'programmato'
    };

    if (editingTurno) {
      await updateMutation.mutateAsync({ id: editingTurno.id, data: dataToSave });
    } else {
      await createMutation.mutateAsync(dataToSave);
    }
  };

  const approvaScambio = async (scambio) => {
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
  };

  const rifiutaScambio = async (scambio) => {
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
  };

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(weekStart.clone().add(i, 'days'));
    }
    return days;
  }, [weekStart]);

  const turniByDay = useMemo(() => {
    const grouped = {};
    turni.forEach(turno => {
      if (!grouped[turno.data]) grouped[turno.data] = [];
      grouped[turno.data].push(turno);
    });
    return grouped;
  }, [turni]);

  const getStoreName = (storeId) => allStores.find(s => s.id === storeId)?.name || '';

  const dipendentiPerStore = useMemo(() => {
    if (!turnoForm.store_id) return users.filter(u => u.ruoli_dipendente?.length > 0);
    
    return users.filter(u => {
      const assignedStores = u.assigned_stores || [];
      if (assignedStores.length === 0) return u.ruoli_dipendente?.length > 0;
      return assignedStores.includes(turnoForm.store_id) && u.ruoli_dipendente?.length > 0;
    });
  }, [users, turnoForm.store_id]);

  const canAssignToRole = (user, role) => {
    const ruoli = user.ruoli_dipendente || [];
    return ruoli.includes(role);
  };

  // Component for displaying the other shift in swap request
  const TurnoAltroDisplay = ({ turnoId, richiestoANome }) => {
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
        <div className="text-xs text-slate-400 mt-1 pt-1 border-t border-green-200">
          Originale: {turnoAltro.dipendente_nome}
        </div>
      </div>
    );
  };

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <NeumorphicCard className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-slate-500">Caricamento...</p>
        </NeumorphicCard>
      </div>
    );
  }

  if (myStores.length === 0) {
    return (
      <ProtectedPage pageName="PlandayStoreManager">
        <div className="max-w-4xl mx-auto p-8">
          <NeumorphicCard className="p-8 text-center">
            <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Nessuno Store Assegnato</h2>
            <p className="text-slate-500">Non sei Store Manager di nessun locale.</p>
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
            <p className="text-slate-500 mt-1">Gestione turni per i tuoi locali</p>
          </div>
          <div className="flex gap-2">
            <NeumorphicButton 
              onClick={() => setActiveTab('turni')}
              variant={activeTab === 'turni' ? 'primary' : 'default'}
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Turni
            </NeumorphicButton>
            <NeumorphicButton 
              onClick={() => setActiveTab('richieste')}
              variant={activeTab === 'richieste' ? 'primary' : 'default'}
              className="flex items-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Richieste
              {scambiTurni.filter(s => s.richiesta_scambio?.stato === 'accepted_by_colleague').length > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {scambiTurni.filter(s => s.richiesta_scambio?.stato === 'accepted_by_colleague').length}
                </span>
              )}
            </NeumorphicButton>
          </div>
        </div>

        {/* Tab Turni */}
        {activeTab === 'turni' && (
          <>
            {/* Controls */}
            <NeumorphicCard className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="">Seleziona locale</option>
                    {myStores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <NeumorphicButton onClick={() => setWeekStart(weekStart.clone().subtract(1, 'week'))}>
                    <ChevronLeft className="w-4 h-4" />
                  </NeumorphicButton>
                  <span className="px-4 py-2 font-medium text-slate-700">
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
                      store_id: selectedStore || (myStores[0]?.id || ''),
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
                  disabled={!selectedStore}
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
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Locale *</label>
                    <select
                      value={turnoForm.store_id}
                      onChange={(e) => setTurnoForm({ ...turnoForm, store_id: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    >
                      <option value="">Seleziona locale</option>
                      {myStores.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </div>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Dipendente</label>
                    <select
                      value={turnoForm.dipendente_id}
                      onChange={(e) => setTurnoForm({ ...turnoForm, dipendente_id: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    >
                      <option value="">Non assegnato</option>
                      {dipendentiPerStore.map(u => {
                        const canAssign = canAssignToRole(u, turnoForm.ruolo);
                        const nome = u.nome_cognome || u.full_name;
                        return (
                          <option 
                            key={u.id} 
                            value={u.id}
                            disabled={!canAssign}
                          >
                            {canAssign ? '✅' : '🚫'} {nome}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Note</label>
                  <input
                    type="text"
                    value={turnoForm.note}
                    onChange={(e) => setTurnoForm({ ...turnoForm, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    placeholder="Note opzionali..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <NeumorphicButton onClick={resetForm} className="flex-1">Annulla</NeumorphicButton>
                  <NeumorphicButton 
                    onClick={handleSaveTurno} 
                    variant="primary" 
                    className="flex-1 flex items-center justify-center gap-2"
                    disabled={!turnoForm.store_id || !turnoForm.data || !turnoForm.ora_inizio || !turnoForm.ora_fine}
                  >
                    <Save className="w-4 h-4" />
                    Salva
                  </NeumorphicButton>
                </div>
              </NeumorphicCard>
            )}

            {/* Calendario Turni */}
            {selectedStore && (
              <NeumorphicCard className="p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[700px]">
                      {/* Header giorni */}
                      <div className="grid grid-cols-7 gap-2 mb-4">
                        {weekDays.map(day => (
                          <div 
                            key={day.format('YYYY-MM-DD')} 
                            className={`p-3 text-center rounded-lg ${
                              day.isSame(moment(), 'day') ? 'bg-blue-100' : 'bg-slate-50'
                            }`}
                          >
                            <div className="font-medium text-slate-700">{day.format('ddd')}</div>
                            <div className="text-lg font-bold text-slate-800">{day.format('DD')}</div>
                            <div className="text-xs text-slate-500">{day.format('MMM')}</div>
                          </div>
                        ))}
                      </div>

                      {/* Turni per giorno */}
                      <div className="grid grid-cols-7 gap-2">
                        {weekDays.map(day => {
                          const dayKey = day.format('YYYY-MM-DD');
                          const dayTurni = (turniByDay[dayKey] || []).sort((a, b) => 
                            a.ora_inizio.localeCompare(b.ora_inizio)
                          );

                          return (
                            <div key={dayKey} className="min-h-[200px]">
                              {dayTurni.length === 0 ? (
                                <div className="text-center text-slate-400 text-xs py-4">
                                  Nessun turno
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {dayTurni.map(turno => (
                                    <div 
                                      key={turno.id}
                                      className="neumorphic-pressed p-2 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                                      onClick={() => handleEditTurno(turno)}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-slate-700">
                                          {turno.ora_inizio}-{turno.ora_fine}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm('Eliminare questo turno?')) {
                                              deleteMutation.mutate(turno.id);
                                            }
                                          }}
                                          className="text-red-500 hover:text-red-700"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                      <div className="text-xs text-slate-600 mb-1">{turno.ruolo}</div>
                                      {turno.dipendente_nome && (
                                        <div className="text-xs font-medium text-slate-800 truncate">
                                          {turno.dipendente_nome}
                                        </div>
                                      )}
                                      {!turno.dipendente_nome && (
                                        <div className="text-xs text-slate-400">Non assegnato</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </NeumorphicCard>
            )}

            {!selectedStore && (
              <div className="text-center py-12">
                <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Seleziona un locale per visualizzare i turni</p>
              </div>
            )}
          </>
        )}

        {/* Tab Richieste Scambi */}
        {activeTab === 'richieste' && (
          <div className="space-y-4">
            <NeumorphicCard className="p-4">
              <h2 className="text-xl font-bold text-slate-800 mb-4">
                Richieste Scambi Turno
              </h2>

              {scambiTurni.length === 0 ? (
                <div className="text-center py-12">
                  <ArrowRightLeft className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nessuna richiesta in attesa</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scambiTurni
                    .sort((a, b) => {
                      // Priorità a "accepted_by_colleague"
                      if (a.richiesta_scambio?.stato === 'accepted_by_colleague' && b.richiesta_scambio?.stato !== 'accepted_by_colleague') return -1;
                      if (a.richiesta_scambio?.stato !== 'accepted_by_colleague' && b.richiesta_scambio?.stato === 'accepted_by_colleague') return 1;
                      return new Date(b.richiesta_scambio?.data_richiesta) - new Date(a.richiesta_scambio?.data_richiesta);
                    })
                    .map(turnoRichiedente => {
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
                                  'bg-blue-100 text-blue-800'
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
                                  <div className="text-xs text-slate-400 mt-1 pt-1 border-t border-red-200">
                                    Originale: {turnoRichiedente.dipendente_nome}
                                  </div>
                                </div>

                                {/* Turno RICHIESTO */}
                                <TurnoAltroDisplay 
                                  turnoId={scambio.suo_turno_id}
                                  richiestoANome={scambio.richiesto_a_nome}
                                />
                              </div>

                              <p className="text-xs text-slate-400 mt-2">
                                Richiesto il {moment(scambio.data_richiesta).format('DD/MM/YYYY HH:mm')}
                              </p>
                            </div>
                            
                            {scambio.stato === 'accepted_by_colleague' && (
                              <div className="flex flex-col gap-2 ml-3">
                                <button
                                  onClick={() => approvaScambio(scambio)}
                                  className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" /> Approva
                                </button>
                                <button
                                  onClick={() => rifiutaScambio(scambio)}
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
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}