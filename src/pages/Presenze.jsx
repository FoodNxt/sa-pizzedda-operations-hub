import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import { Users, Clock, CheckCircle, AlertCircle, MapPin, Loader2, Settings, X } from "lucide-react";
import { format, parseISO, isWithinInterval, parse } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Presenze() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [includedTipiTurno, setIncludedTipiTurno] = useState([]);

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

      // Prendi turni di oggi (escludendo quelli con uscita timbrata)
      const turniOggi = await base44.entities.TurnoPlanday.filter({
        data: oggi,
        stato: { $ne: 'annullato' },
        timbratura_uscita: null
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
    // Prendi da config
    if (tipiTurnoConfig.length > 0) {
      return tipiTurnoConfig.
      map((t) => t.tipo_turno).
      sort();
    }
    // Fallback: raccogli dai turni
    const tipiSet = new Set();
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
    const timbrati = turniAttivi.filter((t) => t.timbratura_entrata).length;
    const nonTimbrati = turniAttivi.filter((t) => !t.timbratura_entrata).length;

    return {
      store,
      turniAttivi,
      turniProssimi,
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
            <h1 className="text-slate-50 text-3xl font-bold flex items-center gap-3">Presenze in Tempo Reale


            </h1>
            <p className="text-slate-50 mt-1">Monitora chi è in turno in questo momento</p>
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
          {storeStats.map(({ store, turniAttivi, turniProssimi, timbrati, nonTimbrati, totale }) =>
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

              {turniAttivi.length === 0 ?
            <div className="neumorphic-pressed p-8 rounded-xl text-center">
                  <Clock className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">Nessuno in turno in questo momento</p>
                </div> :

            <div className="space-y-2">
                  {turniAttivi.map((turno) =>
              <div
                key={turno.id}
                className={`neumorphic-pressed p-4 rounded-xl flex items-center justify-between ${
                !turno.timbrata_entrata ? 'border-l-4 border-orange-500' : ''}`
                }>

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
                            </div>
                          </div> :

                  <div className="flex items-center gap-2 text-orange-600">
                            <AlertCircle className="w-5 h-5" />
                            <p className="text-xs font-medium">Non Timbrata</p>
                          </div>
                  }
                      </div>
                    </div>
              )}
                </div>
            }

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