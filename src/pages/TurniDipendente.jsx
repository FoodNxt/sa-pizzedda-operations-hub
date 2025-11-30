import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { 
  Calendar, Clock, MapPin, CheckCircle, AlertCircle, 
  Loader2, LogIn, LogOut, ChevronLeft, ChevronRight
} from "lucide-react";
import moment from "moment";
import "moment/locale/it";

moment.locale('it');

export default function TurniDipendente() {
  const [weekStart, setWeekStart] = useState(moment().startOf('isoWeek'));
  const [currentPosition, setCurrentPosition] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [timbraturaMessage, setTimbraturaMessage] = useState(null);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: config = null } = useQuery({
    queryKey: ['timbratura-config'],
    queryFn: async () => {
      const configs = await base44.entities.TimbraturaConfig.list();
      return configs[0] || { distanza_massima_metri: 100, tolleranza_ritardo_minuti: 5, abilita_timbratura_gps: true };
    },
  });

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
      setTimbraturaMessage({
        type: 'error',
        text: error.message
      });
      setTimeout(() => setTimbraturaMessage(null), 3000);
    }
  });

  // Calcola distanza tra due punti GPS
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // raggio Terra in metri
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
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
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          reject(new Error('Impossibile ottenere la posizione GPS'));
        },
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

        const distance = calculateDistance(
          position.lat, position.lng,
          store.latitude, store.longitude
        );

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
      // GPS disabilitato o store senza coordinate
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
      const key = turno.data;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(turno);
    });
    return grouped;
  }, [turni]);

  const turnoOggi = useMemo(() => {
    const oggi = moment().format('YYYY-MM-DD');
    return turni.filter(t => t.data === oggi);
  }, [turni]);

  return (
    <ProtectedPage pageName="TurniDipendente">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
            I Miei Turni
          </h1>
          <p className="text-slate-500 mt-1">Visualizza e timbra i tuoi turni</p>
        </div>

        {/* Messaggio timbratura */}
        {timbraturaMessage && (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${
            timbraturaMessage.type === 'success' 
              ? 'bg-green-100 border border-green-300' 
              : 'bg-red-100 border border-red-300'
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

        {/* Turni di oggi */}
        {turnoOggi.length > 0 && (
          <NeumorphicCard className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <h2 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Turni di Oggi
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

                    {/* Info timbrature */}
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

                    {/* Pulsanti timbratura */}
                    <div className="flex gap-3">
                      {canTimbraEntrata && (
                        <NeumorphicButton
                          onClick={() => handleTimbra(turno, 'entrata')}
                          variant="primary"
                          className="flex-1 flex items-center justify-center gap-2"
                          disabled={loadingGPS || timbraMutation.isPending}
                        >
                          {loadingGPS ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <LogIn className="w-4 h-4" />
                          )}
                          Timbra Entrata
                        </NeumorphicButton>
                      )}
                      {canTimbraUscita && (
                        <NeumorphicButton
                          onClick={() => handleTimbra(turno, 'uscita')}
                          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white"
                          disabled={loadingGPS || timbraMutation.isPending}
                        >
                          {loadingGPS ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <LogOut className="w-4 h-4" />
                          )}
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
                <NeumorphicCard 
                  key={dayKey} 
                  className={`p-4 ${isToday ? 'border-2 border-blue-400' : ''}`}
                >
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
                    <p className="text-slate-500 text-sm italic ml-13">Nessun turno programmato</p>
                  ) : (
                    <div className="space-y-2 ml-13">
                      {dayTurni.map(turno => (
                        <div 
                          key={turno.id}
                          className={`p-3 rounded-lg border ${
                            turno.stato === 'completato' ? 'bg-green-50 border-green-200' :
                            turno.stato === 'in_corso' ? 'bg-blue-50 border-blue-200' :
                            'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-slate-600" />
                              <span className="font-medium">{turno.ora_inizio} - {turno.ora_fine}</span>
                            </div>
                            <span className="text-sm text-slate-600">{turno.ruolo}</span>
                          </div>
                          <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
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
      </div>
    </ProtectedPage>
  );
}