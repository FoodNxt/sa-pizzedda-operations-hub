import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import { Users, Clock, CheckCircle, AlertCircle, MapPin, Loader2, Settings, X, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { format, parseISO, isWithinInterval, parse } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Presenze() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [includedTipiTurno, setIncludedTipiTurno] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null); // {turno, tipo}
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [timbraturaMessage, setTimbraturaMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const isAdmin = currentUser?.user_type === 'admin';

  const resetManualFields = () => {
    setManualDate('');
    setManualTime('');
    setAdminNote('');
  };

  const adminTimbraMutation = useMutation({
    mutationFn: async ({ turnoId, tipo, oraManuale, notaAdmin }) => {
      const payload = { turnoId, tipo };
      if (oraManuale) payload.oraManuale = oraManuale;
      if (notaAdmin) payload.notaAdmin = notaAdmin;
      const response = await base44.functions.invoke('timbraTurno', payload);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['turni-oggi'] });
      setConfirmAction(null);
      resetManualFields();
      setTimbraturaMessage({
        type: 'success',
        text: `${variables.tipo === 'entrata' ? 'Entrata' : 'Uscita'} timbrata con successo (Admin)`
      });
      setTimeout(() => setTimbraturaMessage(null), 4000);
    },
    onError: (error) => {
      setTimbraturaMessage({ type: 'error', text: error?.response?.data?.error || error.message });
      setTimeout(() => setTimbraturaMessage(null), 5000);
    }
  });

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: turni = [] } = useQuery({
    queryKey: ['turni-oggi'],
    queryFn: async () => {
      const oggi = new Date().toISOString().split('T')[0];

      // Prendi turni di oggi (tutti, anche quelli completati)
      const turniOggi = await base44.entities.TurnoPlanday.filter({
        data: oggi,
        stato: { $ne: 'annullato' }
      });

      const turniAperti = await base44.entities.TurnoPlanday.filter({
        timbratura_entrata: { $ne: null },
        timbratura_uscita: null
      });

      // Combina ed elimina duplicati
      const allShifts = [...turniOggi];
      turniAperti.forEach((t) => {
        if (!allShifts.find((s) => s.id === t.id)) {
          allShifts.push(t);
        }
      });

      return allShifts;
    },
    refetchInterval: 60000
  });

  const { data: tipiTurnoConfig = [], isLoading: isLoadingTipi } = useQuery({
    queryKey: ['tipi-turno-config'],
    queryFn: async () => {
      const data = await base44.entities.TipoTurnoConfig.list();
      console.log('TipoTurnoConfig loaded:', data);
      return data;
    }
  });

  const availableTipiTurno = useMemo(() => {
    // Start with config types
    const tipiSet = new Set(
      tipiTurnoConfig.map((t) => t.tipo_turno).filter(Boolean)
    );
    // Merge any tipo_turno found in actual shift data (handles missing config entries like "Formazione")
    turni.forEach((t) => {
      if (t.tipo_turno) tipiSet.add(t.tipo_turno);
    });
    return Array.from(tipiSet).sort();
  }, [tipiTurnoConfig, turni]);

  useEffect(() => {
    if (includedTipiTurno.length === 0 && availableTipiTurno.length > 0) {
      setIncludedTipiTurno([...availableTipiTurno]);
    }
  }, [availableTipiTurno]);

  // Determina turni attivi in questo momento
  const getTurniAttiviPerStore = (storeId) => {
    const now = currentTime;
    const todayStr = format(now, 'yyyy-MM-dd');

    return turni.filter((turno) => {
      if (turno.store_id !== storeId) return false;
      if (turno.data !== todayStr) return false;
      if (includedTipiTurno.length > 0 && !includedTipiTurno.includes(turno.tipo_turno)) return false;
      // Escludi turni completati (con uscita timbrata)
      if (turno.timbratura_uscita) return false;

      try {
        // Parse ora_inizio e ora_fine
        const [oraInizioH, oraInizioM] = turno.ora_inizio.split(':').map(Number);
        const [oraFineH, oraFineM] = turno.ora_fine.split(':').map(Number);

        const inizioDate = new Date(now);
        inizioDate.setHours(oraInizioH, oraInizioM, 0, 0);

        const fineDate = new Date(now);
        fineDate.setHours(oraFineH, oraFineM, 0, 0);

        // Se fine < inizio, il turno va oltre la mezzanotte
        if (fineDate < inizioDate) {
          fineDate.setDate(fineDate.getDate() + 1);
        }

        // Mostra se:
        // 1. Orario turno include ora attuale
        const inOrario = isWithinInterval(now, { start: inizioDate, end: fineDate });
        // 2. Timbrato entrata prima dell'inizio turno
        const timbratoPrecoce = turno.timbratura_entrata && parseISO(turno.timbratura_entrata) < inizioDate;
        // 3. Timbrato entrata ma non ancora uscita dopo fine turno
        const nonTimbratoUscita = turno.timbratura_entrata && !turno.timbratura_uscita && now > fineDate;

        return inOrario || timbratoPrecoce || nonTimbratoUscita;
      } catch (error) {
        console.error('Error parsing turno times:', error);
        return false;
      }
    });
  };

  // Determina turni completati oggi
  const getTurniCompletatiPerStore = (storeId) => {
    const todayStr = format(currentTime, 'yyyy-MM-dd');

    return turni.filter((turno) => {
      if (turno.store_id !== storeId) return false;
      if (turno.data !== todayStr) return false;
      if (includedTipiTurno.length > 0 && !includedTipiTurno.includes(turno.tipo_turno)) return false;
      // Solo turni con uscita timbrata
      return turno.timbratura_entrata && turno.timbratura_uscita;
    });
  };

  // Determina turni che devono ancora iniziare oggi
  const getTurniProssimiPerStore = (storeId) => {
    const now = currentTime;
    const todayStr = format(now, 'yyyy-MM-dd');

    return turni.
    filter((turno) => {
      if (turno.store_id !== storeId) return false;
      if (turno.data !== todayStr) return false;
      if (includedTipiTurno.length > 0 && !includedTipiTurno.includes(turno.tipo_turno)) return false;

      try {
        const [oraInizioH, oraInizioM] = turno.ora_inizio.split(':').map(Number);
        const inizioDate = new Date(now);
        inizioDate.setHours(oraInizioH, oraInizioM, 0, 0);

        return inizioDate > now;
      } catch (error) {
        return false;
      }
    }).
    map((turno) => {
      const [oraInizioH, oraInizioM] = turno.ora_inizio.split(':').map(Number);
      const inizioDate = new Date(now);
      inizioDate.setHours(oraInizioH, oraInizioM, 0, 0);

      const diffMs = inizioDate - now;
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffMinutes = diffMs / (1000 * 60) % 60;

      return {
        ...turno,
        inizioDate,
        diffHours: Math.floor(diffHours),
        diffMinutes: Math.floor(diffMinutes),
        diffTotal: diffHours
      };
    }).
    sort((a, b) => a.diffTotal - b.diffTotal);
  };

  const storeStats = stores.map((store) => {
    const turniAttivi = getTurniAttiviPerStore(store.id);
    const turniProssimi = getTurniProssimiPerStore(store.id);
    const turniCompletati = getTurniCompletatiPerStore(store.id);
    console.log(`Store ${store.name}: attivi=${turniAttivi.length}, prossimi=${turniProssimi.length}, completati=${turniCompletati.length}`);
    const timbrati = turniAttivi.filter((t) => t.timbratura_entrata).length;
    const nonTimbrati = turniAttivi.filter((t) => !t.timbratura_entrata).length;

    return {
      store,
      turniAttivi,
      turniProssimi,
      turniCompletati,
      timbrati,
      nonTimbrati,
      totale: turniAttivi.length
    };
  });

  const totalPresenti = storeStats.reduce((sum, s) => sum + s.totale, 0);
  const totalTimbrati = storeStats.reduce((sum, s) => sum + s.timbrati, 0);
  const totalNonTimbrati = storeStats.reduce((sum, s) => sum + s.nonTimbrati, 0);

  return (
    <ProtectedPage pageName="Presenze">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: '#000000' }}>Presenze in Tempo Reale
            </h1>
            <p className="mt-1" style={{ color: '#000000' }}>Monitora chi è in turno in questo momento</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSettings(true)}
              className="neumorphic-flat p-3 rounded-xl hover:bg-slate-100 transition-all">

              <Settings className="w-5 h-5 text-slate-600" />
            </button>
            <div className="text-right">
              <p className="text-sm text-slate-500">Aggiornato alle</p>
              <p className="text-xl font-bold text-slate-800">
                {format(currentTime, 'HH:mm', { locale: it })}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NeumorphicCard className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-3 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-1">{totalPresenti}</h3>
            <p className="text-sm text-slate-500">Dipendenti in Turno</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 mx-auto mb-3 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-green-600 mb-1">{totalTimbrati}</h3>
            <p className="text-sm text-slate-500">Entrate Timbrate</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 mx-auto mb-3 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-orange-600 mb-1">{totalNonTimbrati}</h3>
            <p className="text-sm text-slate-500">Non Timbrate</p>
          </NeumorphicCard>
        </div>

        {/* Store List */}
        <div className="grid grid-cols-1 gap-4">
          {storeStats.map(({ store, turniAttivi, turniProssimi, turniCompletati, timbrati, nonTimbrati, totale }) =>
          <NeumorphicCard key={store.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{store.name}</h2>
                    <p className="text-sm text-slate-500">{store.address}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-800">{totale}</p>
                  <p className="text-xs text-slate-500">in turno</p>
                </div>
              </div>

              {/* Turni Attivi Ora */}
              {turniAttivi.length > 0 ? (
                <div className="space-y-2">
                  {turniAttivi.map((turno) =>
                    <div
                      key={turno.id}
                      className={`neumorphic-pressed p-4 rounded-xl flex items-center justify-between ${
                        !turno.timbratura_entrata ? 'border-l-4 border-orange-500' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-bold text-slate-800">{turno.dipendente_nome}</p>
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700">
                            {turno.ruolo}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{turno.ora_inizio} - {turno.ora_fine}</span>
                          </div>
                          {turno.tipo_turno && turno.tipo_turno !== 'Normale' &&
                            <span className="text-xs text-slate-500">({turno.tipo_turno})</span>
                          }
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {turno.timbratura_entrata ?
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-5 h-5" />
                            <div className="text-right">
                              <p className="text-xs font-medium">Entrata Timbrata</p>
                              <p className="text-xs">
                                {format(parseISO(turno.timbratura_entrata), 'HH:mm', { locale: it })}
                              </p>
                              {turno.timbrato_da_admin &&
                                <p className="text-[10px] text-purple-600 flex items-center gap-0.5 justify-end">
                                  <ShieldCheck className="w-3 h-3" /> Admin
                                </p>
                              }
                            </div>
                          </div> :
                          <div className="flex items-center gap-2 text-orange-600">
                            <AlertCircle className="w-5 h-5" />
                            <p className="text-xs font-medium">Non Timbrata</p>
                          </div>
                        }
                        {/* Admin action buttons */}
                        {isAdmin && !turno.timbratura_entrata &&
                          <button
                            onClick={() => setConfirmAction({ turno, tipo: 'entrata' })}
                            className="ml-2 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 flex items-center gap-1 shadow-sm"
                          >
                            <LogIn className="w-3 h-3" /> Entrata
                          </button>
                        }
                        {isAdmin && turno.timbratura_entrata && !turno.timbratura_uscita &&
                          <button
                            onClick={() => setConfirmAction({ turno, tipo: 'uscita' })}
                            className="ml-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 flex items-center gap-1 shadow-sm"
                          >
                            <LogOut className="w-3 h-3" /> Uscita
                          </button>
                        }
                      </div>
                    </div>
                  )}

                  {totale > 0 &&
                    <div className="mt-3 flex gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-slate-600">{timbrati} timbrati</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-slate-600">{nonTimbrati} non timbrati</span>
                      </div>
                    </div>
                  }
                </div>
              ) : (
                <div className="neumorphic-pressed p-8 rounded-xl text-center">
                  <Clock className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">Nessuno in turno in questo momento</p>
                </div>
              )}

              {/* Turni Completati Oggi */}
              {turniCompletati.length > 0 &&
            <div className="mt-4 pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Turni Completati Oggi
                  </h3>
                  <div className="space-y-2">
                    {turniCompletati.map((turno) =>
                <div
                  key={turno.id}
                  className="neumorphic-pressed p-3 rounded-xl bg-green-50">

                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-slate-700 text-sm">{turno.dipendente_nome}</p>
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-200 text-green-700">
                                {turno.ruolo}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-600">
                              <span className="text-slate-500">Turno: {turno.ora_inizio} - {turno.ora_fine}</span>
                              {turno.tipo_turno && turno.tipo_turno !== 'Normale' &&
                        <span className="text-slate-500">({turno.tipo_turno})</span>
                        }
                            </div>
                            <div className="flex items-center gap-3 text-xs mt-1">
                              <span className="text-green-700 font-medium">
                                Timbrato: {format(parseISO(turno.timbratura_entrata), 'HH:mm')} - {format(parseISO(turno.timbratura_uscita), 'HH:mm')}
                              </span>
                              {turno.timbrato_da_admin &&
                                <span className="text-[10px] text-purple-600 flex items-center gap-0.5 bg-purple-50 px-1.5 py-0.5 rounded-full">
                                  <ShieldCheck className="w-3 h-3" /> {turno.timbrato_da_nome || 'Admin'}
                                </span>
                              }
                            </div>
                          </div>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                      </div>
                )}
                  </div>
                </div>
            }

              {/* Prossimi Turni */}
              {turniProssimi.length > 0 &&
            <div className="mt-4 pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Prossimi Turni Oggi
                  </h3>
                  <div className="space-y-2">
                    {turniProssimi.map((turno) =>
                <div
                  key={turno.id}
                  className="neumorphic-pressed p-3 rounded-xl flex items-center justify-between bg-slate-50">

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-slate-700 text-sm">{turno.dipendente_nome}</p>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-700">
                              {turno.ruolo}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <span>{turno.ora_inizio} - {turno.ora_fine}</span>
                            {turno.tipo_turno && turno.tipo_turno !== 'Normale' &&
                      <span className="text-slate-500">({turno.tipo_turno})</span>
                      }
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="px-3 py-1 rounded-lg bg-blue-100">
                            <p className="text-xs font-bold text-blue-700">
                              {turno.diffHours > 0 && `${turno.diffHours}h `}
                              {turno.diffMinutes}m
                            </p>
                            <p className="text-xs text-blue-600">tra</p>
                          </div>
                        </div>
                      </div>
                )}
                  </div>
                </div>
            }
            </NeumorphicCard>
          )}
        </div>

        {/* Info */}
        <NeumorphicCard className="p-4 bg-blue-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">ℹ️ Informazioni</p>
              <ul className="text-xs space-y-1">
                <li>• La pagina mostra i dipendenti il cui orario di turno include l'ora attuale</li>
                <li>• I dipendenti che hanno timbrato l'uscita vengono automaticamente nascosti</li>
                <li>• L'indicatore arancione segnala chi non ha ancora timbrato l'entrata</li>
                <li>• La pagina si aggiorna automaticamente ogni minuto</li>
              </ul>
            </div>
          </div>
        </NeumorphicCard>

        {/* Admin Timbratura Message */}
        {timbraturaMessage &&
          <div className={`fixed top-4 right-4 z-[70] p-4 rounded-xl shadow-lg flex items-center gap-3 max-w-sm ${
            timbraturaMessage.type === 'success' ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
          }`}>
            {timbraturaMessage.type === 'success' ?
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" /> :
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            }
            <span className={`text-sm ${timbraturaMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {timbraturaMessage.text}
            </span>
          </div>
        }

        {/* Admin Confirm Dialog with Manual Time Selection */}
        {confirmAction &&
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <NeumorphicCard className="p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                Timbratura Manuale Admin
              </h3>
              <div className="neumorphic-pressed p-4 rounded-xl mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Dipendente</span>
                  <span className="font-bold text-slate-800">{confirmAction.turno.dipendente_nome}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Turno</span>
                  <span className="font-medium text-slate-700">{confirmAction.turno.data} • {confirmAction.turno.ora_inizio} - {confirmAction.turno.ora_fine}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Ruolo</span>
                  <span className="font-medium text-slate-700">{confirmAction.turno.ruolo}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Azione</span>
                  <span className={`font-bold ${confirmAction.tipo === 'entrata' ? 'text-green-700' : 'text-blue-700'}`}>
                    {confirmAction.tipo === 'entrata' ? 'Timbra Entrata' : 'Timbra Uscita'}
                  </span>
                </div>
                {confirmAction.tipo === 'uscita' && confirmAction.turno.timbratura_entrata &&
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Entrata registrata</span>
                    <span className="font-medium text-green-700">{format(parseISO(confirmAction.turno.timbratura_entrata), 'dd/MM HH:mm')}</span>
                  </div>
                }
              </div>

              {/* Manual Date & Time Selection */}
              <div className="neumorphic-pressed p-4 rounded-xl mb-4 space-y-3">
                <p className="text-sm font-bold text-slate-700">Orario timbratura:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Data</label>
                    <input
                      type="date"
                      value={manualDate || confirmAction.turno.data}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="w-full neumorphic-flat px-3 py-2 rounded-lg outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Ora</label>
                    <input
                      type="time"
                      value={manualTime || (confirmAction.tipo === 'entrata' ? confirmAction.turno.ora_inizio : confirmAction.turno.ora_fine)}
                      onChange={(e) => setManualTime(e.target.value)}
                      className="w-full neumorphic-flat px-3 py-2 rounded-lg outline-none text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Lascia i valori predefiniti per usare l'orario programmato del turno, oppure modifica per un orario personalizzato.
                </p>
              </div>

              {/* Admin Note */}
              <div className="mb-4">
                <label className="text-xs text-slate-500 mb-1 block">Nota admin (opzionale)</label>
                <input
                  type="text"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Es: dipendente ha dimenticato di timbrare"
                  className="w-full neumorphic-pressed px-3 py-2 rounded-lg outline-none text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setConfirmAction(null); resetManualFields(); }}
                  disabled={adminTimbraMutation.isPending}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    const selectedDate = manualDate || confirmAction.turno.data;
                    const selectedTime = manualTime || (confirmAction.tipo === 'entrata' ? confirmAction.turno.ora_inizio : confirmAction.turno.ora_fine);
                    const oraManuale = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
                    adminTimbraMutation.mutate({
                      turnoId: confirmAction.turno.id,
                      tipo: confirmAction.tipo,
                      oraManuale,
                      notaAdmin: adminNote || undefined
                    });
                  }}
                  disabled={adminTimbraMutation.isPending}
                  className={`flex-1 px-4 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 ${
                    confirmAction.tipo === 'entrata' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {adminTimbraMutation.isPending ?
                    <Loader2 className="w-4 h-4 animate-spin" /> :
                    confirmAction.tipo === 'entrata' ? <><LogIn className="w-4 h-4" /> Conferma</> : <><LogOut className="w-4 h-4" /> Conferma</>
                  }
                </button>
              </div>
            </NeumorphicCard>
          </div>
        }

        {/* Settings Modal */}
        {showSettings &&
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-800">Impostazioni Presenze</h3>
                <button
                onClick={() => setShowSettings(false)}
                className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors">

                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl">
                <h4 className="font-bold text-slate-800 mb-3">Tipi di Turno da Visualizzare</h4>
                <p className="text-xs text-slate-500 mb-3">
                  Seleziona quali tipi di turno mostrare nella view Presenze
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {isLoadingTipi ?
                <p className="text-sm text-slate-500 text-center py-4">
                      Caricamento tipi di turno...
                    </p> :
                availableTipiTurno.length > 0 ?
                availableTipiTurno.map((tipo) =>
                <label key={tipo} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
                        <input
                    type="checkbox"
                    checked={includedTipiTurno.includes(tipo)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setIncludedTipiTurno((prev) => [...prev, tipo]);
                      } else {
                        setIncludedTipiTurno((prev) => prev.filter((t) => t !== tipo));
                      }
                    }}
                    className="w-5 h-5 rounded flex-shrink-0" />

                        <span className="font-medium text-slate-700 text-sm">{tipo}</span>
                      </label>
                ) :

                <p className="text-sm text-slate-500 text-center py-4">
                      Nessun tipo di turno trovato
                    </p>
                }
                </div>
                {includedTipiTurno.length === 0 && availableTipiTurno.length > 0 &&
              <p className="text-xs text-orange-600 mt-2">
                    ⚠️ Seleziona almeno un tipo di turno
                  </p>
              }
              </div>

              <div className="mt-6 flex justify-end">
                <button
                onClick={() => setShowSettings(false)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all">

                  Applica
                </button>
              </div>
            </NeumorphicCard>
          </div>
        }
      </div>
    </ProtectedPage>);

}