import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { 
  Calendar, Clock, MapPin, CheckCircle, AlertCircle, 
  Loader2, LogIn, LogOut, ChevronLeft, ChevronRight,
  RefreshCw, X, AlertTriangle, Users, Store as StoreIcon, Navigation
} from "lucide-react";
import moment from "moment";
import "moment/locale/it";

moment.locale('it');

const COLORI_RUOLO = {
  "Pizzaiolo": "bg-orange-100 border-orange-300 text-orange-800",
  "Cassiere": "bg-blue-100 border-blue-300 text-blue-800",
  "Store Manager": "bg-purple-100 border-purple-300 text-purple-800"
};

export default function TurniDipendente() {
  const [weekStart, setWeekStart] = useState(moment().startOf('isoWeek'));
  const [currentPosition, setCurrentPosition] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [timbraturaMessage, setTimbraturaMessage] = useState(null);
  const [showScambioModal, setShowScambioModal] = useState(false);
  const [selectedTurnoScambio, setSelectedTurnoScambio] = useState(null);
  const [gpsPermissionStatus, setGpsPermissionStatus] = useState('unknown');

  const queryClient = useQueryClient();

  // Richiedi permesso GPS all'avvio
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setGpsPermissionStatus(result.state);
        result.onchange = () => setGpsPermissionStatus(result.state);
      });
    }
  }, []);

  const requestGPSPermission = () => {
    navigator.geolocation.getCurrentPosition(
      () => setGpsPermissionStatus('granted'),
      () => setGpsPermissionStatus('denied'),
      { enableHighAccuracy: true }
    );
  };

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: config = null } = useQuery({
    queryKey: ['timbratura-config'],
    queryFn: async () => {
      const configs = await base44.entities.TimbraturaConfig.list();
      return configs[0] || { distanza_massima_metri: 100, tolleranza_ritardo_minuti: 5, abilita_timbratura_gps: true };
    },
  });

  // Turni del dipendente corrente
  const { data: turni = [], isLoading } = useQuery({
    queryKey: ['turni-dipendente', currentUser?.id, weekStart.format('YYYY-MM-DD')],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const startDate = weekStart.format('YYYY-MM-DD');
      const endDate = weekStart.clone().add(6, 'days').format('YYYY-MM-DD');
      
      return base44.entities.TurnoPlanday.filter({
        dipendente_id: currentUser.id,
        data: { $gte: startDate, $lte: endDate }
      });
    },
    enabled: !!currentUser?.id,
  });

  // Turni futuri per scambio
  const { data: turniFuturi = [] } = useQuery({
    queryKey: ['turni-futuri', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const oggi = moment().format('YYYY-MM-DD');
      return base44.entities.TurnoPlanday.filter({
        dipendente_id: currentUser.id,
        data: { $gte: oggi }
      });
    },
    enabled: !!currentUser?.id,
  });

  // Tutti i turni del giorno del turno selezionato (per vedere chi lavora già)
  const { data: turniGiornoScambio = [] } = useQuery({
    queryKey: ['turni-giorno-scambio', selectedTurnoScambio?.data, selectedTurnoScambio?.store_id],
    queryFn: async () => {
      if (!selectedTurnoScambio) return [];
      return base44.entities.TurnoPlanday.filter({
        data: selectedTurnoScambio.data,
        store_id: selectedTurnoScambio.store_id
      });
    },
    enabled: !!selectedTurnoScambio,
  });

  const timbraMutation = useMutation({
    mutationFn: async ({ turnoId, tipo, posizione }) => {
      const turno = turni.find(t => t.id === turnoId);
      if (!turno) throw new Error('Turno non trovato');

      const updateData = {};
      if (tipo === 'entrata') {
        updateData.timbrata_entrata = new Date().toISOString();
        updateData.posizione_entrata = posizione;
        updateData.stato = 'in_corso';
      } else {
        updateData.timbrata_uscita = new Date().toISOString();
        updateData.posizione_uscita = posizione;
        updateData.stato = 'completato';
      }

      return base44.entities.TurnoPlanday.update(turnoId, updateData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['turni-dipendente'] });
      setTimbraturaMessage({
        type: 'success',
        text: variables.tipo === 'entrata' ? 'Entrata timbrata con successo!' : 'Uscita timbrata con successo!'
      });
      setTimeout(() => setTimbraturaMessage(null), 3000);
    },
    onError: (error) => {
      setTimbraturaMessage({ type: 'error', text: error.message });
      setTimeout(() => setTimbraturaMessage(null), 3000);
    }
  });

  const richiestaScambioMutation = useMutation({
    mutationFn: async ({ turnoId, richiestoA }) => {
      return base44.entities.TurnoPlanday.update(turnoId, {
        richiesta_scambio: {
          richiesto_da: currentUser.id,
          richiesto_a: richiestoA,
          stato: 'pending',
          data_richiesta: new Date().toISOString()
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-dipendente'] });
      queryClient.invalidateQueries({ queryKey: ['turni-futuri'] });
      setShowScambioModal(false);
      setSelectedTurnoScambio(null);
      setTimbraturaMessage({ type: 'success', text: 'Richiesta di scambio inviata!' });
      setTimeout(() => setTimbraturaMessage(null), 3000);
    }
  });

  // Calcola distanza GPS
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getGPSPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalizzazione non supportata'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => reject(new Error('Impossibile ottenere la posizione GPS')),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleTimbra = async (turno, tipo) => {
    const store = stores.find(s => s.id === turno.store_id);
    
    if (config?.abilita_timbratura_gps && store?.latitude && store?.longitude) {
      setLoadingGPS(true);
      setGpsError(null);

      try {
        const position = await getGPSPosition();
        setCurrentPosition(position);

        const distance = calculateDistance(position.lat, position.lng, store.latitude, store.longitude);

        if (distance > (config.distanza_massima_metri || 100)) {
          setGpsError(`Sei troppo lontano dal locale (${Math.round(distance)}m). Devi essere entro ${config.distanza_massima_metri || 100}m per timbrare.`);
          setLoadingGPS(false);
          return;
        }

        timbraMutation.mutate({ turnoId: turno.id, tipo, posizione: position });
      } catch (error) {
        setGpsError(error.message);
      }
      setLoadingGPS(false);
    } else {
      timbraMutation.mutate({ turnoId: turno.id, tipo, posizione: null });
    }
  };

  const getStoreName = (storeId) => stores.find(s => s.id === storeId)?.name || '';

  const getTurnoStatus = (turno) => {
    const now = moment();
    const turnoDate = moment(turno.data);
    const turnoStart = moment(`${turno.data} ${turno.ora_inizio}`);
    const turnoEnd = moment(`${turno.data} ${turno.ora_fine}`);

    if (turno.stato === 'completato') return 'completato';
    if (turno.stato === 'in_corso') return 'in_corso';
    if (turnoDate.isAfter(now, 'day')) return 'futuro';
    if (turnoDate.isBefore(now, 'day')) return 'passato';
    if (now.isBetween(turnoStart.clone().subtract(30, 'minutes'), turnoEnd)) return 'attivo';
    return 'programmato';
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

  const turnoOggi = useMemo(() => {
    const oggi = moment().format('YYYY-MM-DD');
    return turni.filter(t => t.data === oggi);
  }, [turni]);

  // Colleghi disponibili per scambio
  const colleghiPerScambio = useMemo(() => {
    if (!selectedTurnoScambio || !allUsers.length) return [];
    
    const store = stores.find(s => s.id === selectedTurnoScambio.store_id);
    
    return allUsers
      .filter(u => {
        if (u.id === currentUser?.id) return false;
        const ruoli = u.ruoli_dipendente || [];
        return ruoli.includes(selectedTurnoScambio.ruolo);
      })
      .map(u => {
        const storesAssegnati = u.store_assegnati || [];
        const isAssegnatoStore = storesAssegnati.includes(selectedTurnoScambio.store_id) || storesAssegnati.length === 0;
        const staGiaLavorando = turniGiornoScambio.some(t => 
          t.dipendente_id === u.id && t.id !== selectedTurnoScambio.id
        );
        
        return {
          ...u,
          isAssegnatoStore,
          staGiaLavorando,
          turnoEsistente: turniGiornoScambio.find(t => t.dipendente_id === u.id && t.id !== selectedTurnoScambio.id)
        };
      })
      .sort((a, b) => {
        // Prima chi non sta già lavorando e è assegnato allo store
        if (a.staGiaLavorando !== b.staGiaLavorando) return a.staGiaLavorando ? 1 : -1;
        if (a.isAssegnatoStore !== b.isAssegnatoStore) return a.isAssegnatoStore ? -1 : 1;
        return 0;
      });
  }, [selectedTurnoScambio, allUsers, turniGiornoScambio, currentUser]);

  const openScambioModal = (turno) => {
    setSelectedTurnoScambio(turno);
    setShowScambioModal(true);
  };

  return (
    <ProtectedPage pageName="TurniDipendente">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
            I Miei Turni
          </h1>
          <p className="text-slate-500 mt-1">Timbra e gestisci i tuoi turni</p>
        </div>

        {/* Messaggio */}
        {timbraturaMessage && (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${
            timbraturaMessage.type === 'success' ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
          }`}>
            {timbraturaMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span className={timbraturaMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {timbraturaMessage.text}
            </span>
          </div>
        )}

        {/* Errore GPS */}
        {gpsError && (
          <NeumorphicCard className="p-4 bg-red-50 border border-red-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800">{gpsError}</span>
            </div>
          </NeumorphicCard>
        )}

        {/* Richiesta permesso GPS */}
        {gpsPermissionStatus === 'prompt' && config?.abilita_timbratura_gps && (
          <NeumorphicCard className="p-4 bg-yellow-50 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Navigation className="w-5 h-5 text-yellow-600" />
                <span className="text-yellow-800">Per timbrare è necessario l'accesso alla posizione GPS</span>
              </div>
              <NeumorphicButton onClick={requestGPSPermission} className="text-sm">
                Attiva GPS
              </NeumorphicButton>
            </div>
          </NeumorphicCard>
        )}

        {gpsPermissionStatus === 'denied' && config?.abilita_timbratura_gps && (
          <NeumorphicCard className="p-4 bg-red-50 border border-red-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800">Accesso GPS negato. Abilita la geolocalizzazione nelle impostazioni del browser per poter timbrare.</span>
            </div>
          </NeumorphicCard>
        )}

        {/* Turni di oggi - Timbratura */}
        {turnoOggi.length > 0 && (
          <NeumorphicCard className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <h2 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Turni di Oggi - Timbratura
            </h2>
            <div className="space-y-4">
              {turnoOggi.map(turno => {
                const status = getTurnoStatus(turno);
                const canTimbraEntrata = status === 'attivo' && !turno.timbrata_entrata;
                const canTimbraUscita = status === 'in_corso' || (turno.timbrata_entrata && !turno.timbrata_uscita);

                return (
                  <div key={turno.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <span className="font-bold text-lg text-slate-800">
                          {turno.ora_inizio} - {turno.ora_fine}
                        </span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        status === 'completato' ? 'bg-green-100 text-green-800' :
                        status === 'in_corso' ? 'bg-blue-100 text-blue-800' :
                        status === 'attivo' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {status === 'completato' ? 'Completato' :
                         status === 'in_corso' ? 'In Corso' :
                         status === 'attivo' ? 'Puoi Timbrare' :
                         'Programmato'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600 mb-3">
                      <MapPin className="w-4 h-4" />
                      <span>{getStoreName(turno.store_id)}</span>
                      <span className="mx-2">•</span>
                      <span>{turno.ruolo}</span>
                    </div>

                    {(turno.timbrata_entrata || turno.timbrata_uscita) && (
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-3">
                        {turno.timbrata_entrata && (
                          <div className="flex items-center gap-1">
                            <LogIn className="w-4 h-4 text-green-600" />
                            Entrata: {moment(turno.timbrata_entrata).format('HH:mm')}
                          </div>
                        )}
                        {turno.timbrata_uscita && (
                          <div className="flex items-center gap-1">
                            <LogOut className="w-4 h-4 text-blue-600" />
                            Uscita: {moment(turno.timbrata_uscita).format('HH:mm')}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-3">
                      {canTimbraEntrata && (
                        <NeumorphicButton
                          onClick={() => handleTimbra(turno, 'entrata')}
                          variant="primary"
                          className="flex-1 flex items-center justify-center gap-2"
                          disabled={loadingGPS || timbraMutation.isPending}
                        >
                          {loadingGPS ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                          Timbra Entrata
                        </NeumorphicButton>
                      )}
                      {canTimbraUscita && (
                        <NeumorphicButton
                          onClick={() => handleTimbra(turno, 'uscita')}
                          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white"
                          disabled={loadingGPS || timbraMutation.isPending}
                        >
                          {loadingGPS ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                          Timbra Uscita
                        </NeumorphicButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </NeumorphicCard>
        )}

        {/* Turni Futuri con possibilità di scambio */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Prossimi Turni
          </h2>
          
          {turniFuturi.length === 0 ? (
            <p className="text-slate-500 text-center py-4">Nessun turno futuro programmato</p>
          ) : (
            <div className="space-y-3">
              {turniFuturi.slice(0, 10).map(turno => (
                <div key={turno.id} className={`p-4 rounded-xl border ${COLORI_RUOLO[turno.ruolo]}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold">{moment(turno.data).format('dddd DD MMMM')}</div>
                      <div className="text-sm">{turno.ora_inizio} - {turno.ora_fine}</div>
                      <div className="text-sm opacity-80">{getStoreName(turno.store_id)} • {turno.ruolo}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {turno.richiesta_scambio?.stato === 'pending' ? (
                        <span className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-xs">
                          Scambio richiesto
                        </span>
                      ) : (
                        <NeumorphicButton
                          onClick={() => openScambioModal(turno)}
                          className="text-sm px-3 py-1 flex items-center gap-1"
                        >
                          <Users className="w-4 h-4" />
                          Scambia
                        </NeumorphicButton>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </NeumorphicCard>

        {/* Navigazione settimana */}
        <NeumorphicCard className="p-4">
          <div className="flex items-center justify-between">
            <NeumorphicButton onClick={() => setWeekStart(weekStart.clone().subtract(1, 'week'))}>
              <ChevronLeft className="w-4 h-4" />
            </NeumorphicButton>
            <span className="font-medium text-slate-700">
              {weekStart.format('DD MMM')} - {weekStart.clone().add(6, 'days').format('DD MMM YYYY')}
            </span>
            <NeumorphicButton onClick={() => setWeekStart(weekStart.clone().add(1, 'week'))}>
              <ChevronRight className="w-4 h-4" />
            </NeumorphicButton>
          </div>
        </NeumorphicCard>

        {/* Vista settimanale */}
        <div className="space-y-3">
          {isLoading ? (
            <NeumorphicCard className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
            </NeumorphicCard>
          ) : (
            weekDays.map(day => {
              const dayKey = day.format('YYYY-MM-DD');
              const dayTurni = turniByDay[dayKey] || [];
              const isToday = day.isSame(moment(), 'day');

              return (
                <NeumorphicCard key={dayKey} className={`p-4 ${isToday ? 'border-2 border-blue-400' : ''}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                      isToday ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {day.format('DD')}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">{day.format('dddd')}</div>
                      <div className="text-sm text-slate-500">{day.format('MMMM YYYY')}</div>
                    </div>
                  </div>

                  {dayTurni.length === 0 ? (
                    <p className="text-slate-500 text-sm italic ml-13">Nessun turno</p>
                  ) : (
                    <div className="space-y-2 ml-13">
                      {dayTurni.map(turno => (
                        <div key={turno.id} className={`p-3 rounded-lg border ${COLORI_RUOLO[turno.ruolo]}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">{turno.ora_inizio} - {turno.ora_fine}</span>
                            </div>
                            <span className="text-sm">{turno.ruolo}</span>
                          </div>
                          <div className="text-sm opacity-80 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {getStoreName(turno.store_id)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </NeumorphicCard>
              );
            })
          )}
        </div>

        {/* Modal Scambio Turno */}
        {showScambioModal && selectedTurnoScambio && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Richiedi Scambio Turno</h2>
                <button onClick={() => { setShowScambioModal(false); setSelectedTurnoScambio(null); }} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-blue-50 rounded-xl">
                <div className="font-medium text-blue-800">
                  {moment(selectedTurnoScambio.data).format('dddd DD MMMM YYYY')}
                </div>
                <div className="text-sm text-blue-700">
                  {selectedTurnoScambio.ora_inizio} - {selectedTurnoScambio.ora_fine} • {selectedTurnoScambio.ruolo}
                </div>
                <div className="text-sm text-blue-600">
                  {getStoreName(selectedTurnoScambio.store_id)}
                </div>
              </div>

              <h3 className="font-medium text-slate-700 mb-3">Seleziona un collega:</h3>

              {colleghiPerScambio.length === 0 ? (
                <p className="text-slate-500 text-center py-4">
                  Nessun collega disponibile con il ruolo {selectedTurnoScambio.ruolo}
                </p>
              ) : (
                <div className="space-y-2">
                  {colleghiPerScambio.map(collega => (
                    <div 
                      key={collega.id}
                      className={`p-3 rounded-xl border cursor-pointer hover:bg-slate-50 transition-colors ${
                        collega.staGiaLavorando ? 'border-yellow-300 bg-yellow-50' :
                        !collega.isAssegnatoStore ? 'border-orange-300 bg-orange-50' :
                        'border-slate-200'
                      }`}
                      onClick={() => richiestaScambioMutation.mutate({ 
                        turnoId: selectedTurnoScambio.id, 
                        richiestoA: collega.id 
                      })}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                            {(collega.nome_cognome || collega.full_name || '?').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{collega.nome_cognome || collega.full_name}</div>
                            <div className="text-xs text-slate-500">{(collega.ruoli_dipendente || []).join(', ')}</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {collega.staGiaLavorando && (
                            <span className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-200 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" />
                              Lavora già ({collega.turnoEsistente?.ora_inizio}-{collega.turnoEsistente?.ora_fine})
                            </span>
                          )}
                          {!collega.isAssegnatoStore && (
                            <span className="flex items-center gap-1 text-xs text-orange-700 bg-orange-200 px-2 py-0.5 rounded-full">
                              <StoreIcon className="w-3 h-3" />
                              Non assegnato a questo store
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <NeumorphicButton onClick={() => { setShowScambioModal(false); setSelectedTurnoScambio(null); }} className="w-full">
                  Annulla
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}