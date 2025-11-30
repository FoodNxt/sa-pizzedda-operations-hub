import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { 
  Clock, Calendar, Store, User, MapPin, AlertTriangle, 
  CheckCircle, XCircle, Filter, ChevronLeft, ChevronRight,
  Bell, Settings, Save, X, Loader2, MessageSquare
} from "lucide-react";
import moment from "moment";
import "moment/locale/it";

moment.locale('it');

export default function Timbrature() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedDipendente, setSelectedDipendente] = useState('all');
  const [selectedRuolo, setSelectedRuolo] = useState('all');
  const [dateFrom, setDateFrom] = useState(moment().subtract(7, 'days').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(moment().format('YYYY-MM-DD'));
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    enabled: false,
    minutiRitardo: 15,
    whatsappNumber: '',
    notifyManagers: true
  });

  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: turni = [], isLoading } = useQuery({
    queryKey: ['turni-timbrature', dateFrom, dateTo],
    queryFn: async () => {
      return base44.entities.TurnoPlanday.filter({
        data: { $gte: dateFrom, $lte: dateTo }
      });
    },
  });

  const { data: config = null } = useQuery({
    queryKey: ['timbratura-alert-config'],
    queryFn: async () => {
      const configs = await base44.entities.TimbraturaConfig.list();
      if (configs[0]) {
        setAlertConfig({
          enabled: configs[0].alert_enabled || false,
          minutiRitardo: configs[0].alert_minuti_ritardo || 15,
          whatsappNumber: configs[0].alert_whatsapp_number || '',
          notifyManagers: configs[0].alert_notify_managers !== false
        });
      }
      return configs[0] || null;
    },
  });

  const saveAlertMutation = useMutation({
    mutationFn: async (data) => {
      const configs = await base44.entities.TimbraturaConfig.list();
      const updateData = {
        alert_enabled: data.enabled,
        alert_minuti_ritardo: data.minutiRitardo,
        alert_whatsapp_number: data.whatsappNumber,
        alert_notify_managers: data.notifyManagers
      };
      if (configs.length > 0) {
        return base44.entities.TimbraturaConfig.update(configs[0].id, updateData);
      } else {
        return base44.entities.TimbraturaConfig.create(updateData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timbratura-alert-config'] });
      setShowAlertSettings(false);
    },
  });

  // Filtra turni
  const filteredTurni = useMemo(() => {
    return turni.filter(t => {
      if (selectedStore !== 'all' && t.store_id !== selectedStore) return false;
      if (selectedDipendente !== 'all' && t.dipendente_id !== selectedDipendente) return false;
      if (selectedRuolo !== 'all' && t.ruolo !== selectedRuolo) return false;
      return true;
    }).sort((a, b) => {
      // Ordina per data e ora
      const dateA = `${a.data} ${a.ora_inizio}`;
      const dateB = `${b.data} ${b.ora_inizio}`;
      return dateB.localeCompare(dateA);
    });
  }, [turni, selectedStore, selectedDipendente, selectedRuolo]);

  // Calcola statistiche
  const stats = useMemo(() => {
    const turniConTimbratura = filteredTurni.filter(t => t.timbrata_entrata);
    const turniSenzaTimbratura = filteredTurni.filter(t => !t.timbrata_entrata && t.stato !== 'programmato');
    const turniInRitardo = turniConTimbratura.filter(t => {
      if (!t.timbrata_entrata) return false;
      const oraInizio = moment(`${t.data} ${t.ora_inizio}`);
      const timbrataEntrata = moment(t.timbrata_entrata);
      return timbrataEntrata.isAfter(oraInizio);
    });
    
    const totaleMinutiRitardo = turniInRitardo.reduce((sum, t) => {
      const oraInizio = moment(`${t.data} ${t.ora_inizio}`);
      const timbrataEntrata = moment(t.timbrata_entrata);
      return sum + timbrataEntrata.diff(oraInizio, 'minutes');
    }, 0);

    return {
      totale: filteredTurni.length,
      conTimbratura: turniConTimbratura.length,
      senzaTimbratura: turniSenzaTimbratura.length,
      inRitardo: turniInRitardo.length,
      totaleMinutiRitardo
    };
  }, [filteredTurni]);

  const getStoreName = (storeId) => stores.find(s => s.id === storeId)?.name || '';
  const getDipendenteName = (dipId) => {
    const user = users.find(u => u.id === dipId);
    return user?.nome_cognome || user?.full_name || '';
  };

  const getTimbraturaTipo = (turno) => {
    if (!turno.timbrata_entrata && turno.stato === 'programmato') {
      return { tipo: 'programmato', color: 'text-slate-500', bg: 'bg-slate-100', label: 'Programmato' };
    }
    if (!turno.timbrata_entrata) {
      return { tipo: 'mancata', color: 'text-red-600', bg: 'bg-red-100', label: 'Non Timbrato' };
    }
    const oraInizio = moment(`${turno.data} ${turno.ora_inizio}`);
    const timbrataEntrata = moment(turno.timbrata_entrata);
    const ritardo = timbrataEntrata.diff(oraInizio, 'minutes');
    
    if (ritardo > 0) {
      return { tipo: 'ritardo', color: 'text-orange-600', bg: 'bg-orange-100', label: `+${ritardo} min`, ritardo };
    }
    return { tipo: 'puntuale', color: 'text-green-600', bg: 'bg-green-100', label: 'Puntuale' };
  };

  return (
    <ProtectedPage pageName="Timbrature">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              Timbrature
            </h1>
            <p className="text-slate-500 mt-1">Monitora le timbrature di tutti i dipendenti</p>
          </div>
          <NeumorphicButton 
            onClick={() => setShowAlertSettings(true)}
            className="flex items-center gap-2"
          >
            <Bell className="w-4 h-4" />
            Alert WhatsApp
          </NeumorphicButton>
        </div>

        {/* Filtri */}
        <NeumorphicCard className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-slate-600" />
            <span className="font-medium text-slate-700">Filtri</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Store</label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-3 py-2 rounded-xl text-sm outline-none"
              >
                <option value="all">Tutti gli store</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Dipendente</label>
              <select
                value={selectedDipendente}
                onChange={(e) => setSelectedDipendente(e.target.value)}
                className="w-full neumorphic-pressed px-3 py-2 rounded-xl text-sm outline-none"
              >
                <option value="all">Tutti</option>
                {users.filter(u => u.user_type === 'dipendente' || u.user_type === 'user').map(u => (
                  <option key={u.id} value={u.id}>{u.nome_cognome || u.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Ruolo</label>
              <select
                value={selectedRuolo}
                onChange={(e) => setSelectedRuolo(e.target.value)}
                className="w-full neumorphic-pressed px-3 py-2 rounded-xl text-sm outline-none"
              >
                <option value="all">Tutti</option>
                <option value="Pizzaiolo">Pizzaiolo</option>
                <option value="Cassiere">Cassiere</option>
                <option value="Store Manager">Store Manager</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Da</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full neumorphic-pressed px-3 py-2 rounded-xl text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">A</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full neumorphic-pressed px-3 py-2 rounded-xl text-sm outline-none"
              />
            </div>
          </div>
        </NeumorphicCard>

        {/* Statistiche */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <NeumorphicCard className="p-4 text-center">
            <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{stats.totale}</p>
            <p className="text-xs text-slate-500">Turni Totali</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{stats.conTimbratura}</p>
            <p className="text-xs text-slate-500">Timbrati</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-600">{stats.senzaTimbratura}</p>
            <p className="text-xs text-slate-500">Non Timbrati</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-600">{stats.inRitardo}</p>
            <p className="text-xs text-slate-500">In Ritardo</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-600">{Math.round(stats.totaleMinutiRitardo / 60)}h</p>
            <p className="text-xs text-slate-500">Totale Ritardi</p>
          </NeumorphicCard>
        </div>

        {/* Lista Timbrature */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Lista Timbrature</h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : filteredTurni.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nessuna timbratura trovata</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Data</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Dipendente</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Store</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Ruolo</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Turno</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Entrata</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Uscita</th>
                    <th className="text-center p-3 text-sm font-medium text-slate-600">Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTurni.slice(0, 100).map(turno => {
                    const stato = getTimbraturaTipo(turno);
                    return (
                      <tr key={turno.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3">
                          <div className="font-medium text-slate-800">
                            {moment(turno.data).format('DD/MM/YYYY')}
                          </div>
                          <div className="text-xs text-slate-500">
                            {moment(turno.data).format('dddd')}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-800">
                            {turno.dipendente_nome || getDipendenteName(turno.dipendente_id) || '-'}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-slate-600">
                          {getStoreName(turno.store_id)}
                        </td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            turno.ruolo === 'Pizzaiolo' ? 'bg-orange-100 text-orange-700' :
                            turno.ruolo === 'Cassiere' ? 'bg-blue-100 text-blue-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {turno.ruolo}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-slate-600">
                          {turno.ora_inizio} - {turno.ora_fine}
                        </td>
                        <td className="p-3 text-sm">
                          {turno.timbrata_entrata ? (
                            <div>
                              <div className="font-medium text-slate-800">
                                {moment(turno.timbrata_entrata).format('HH:mm')}
                              </div>
                              {turno.posizione_entrata && (
                                <div className="text-xs text-slate-400 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  GPS
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-sm">
                          {turno.timbrata_uscita ? (
                            <div className="font-medium text-slate-800">
                              {moment(turno.timbrata_uscita).format('HH:mm')}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${stato.bg} ${stato.color}`}>
                            {stato.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </NeumorphicCard>

        {/* Modal Alert Settings */}
        {showAlertSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-green-600" />
                  Alert WhatsApp
                </h2>
                <button onClick={() => setShowAlertSettings(false)} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="alert-enabled"
                    checked={alertConfig.enabled}
                    onChange={(e) => setAlertConfig({ ...alertConfig, enabled: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <label htmlFor="alert-enabled" className="text-sm font-medium text-slate-700">
                    Abilita alert per mancata timbratura
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Invia alert dopo (minuti di ritardo)
                  </label>
                  <input
                    type="number"
                    min="5"
                    value={alertConfig.minutiRitardo}
                    onChange={(e) => setAlertConfig({ ...alertConfig, minutiRitardo: parseInt(e.target.value) || 15 })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Se il dipendente non timbra entro X minuti dall'inizio del turno
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Numero WhatsApp per notifiche
                  </label>
                  <input
                    type="tel"
                    value={alertConfig.whatsappNumber}
                    onChange={(e) => setAlertConfig({ ...alertConfig, whatsappNumber: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                    placeholder="+39 333 1234567"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Inserisci il numero con prefisso internazionale
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="notify-managers"
                    checked={alertConfig.notifyManagers}
                    onChange={(e) => setAlertConfig({ ...alertConfig, notifyManagers: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <label htmlFor="notify-managers" className="text-sm font-medium text-slate-700">
                    Notifica anche gli Store Manager dello store
                  </label>
                </div>

                <div className="neumorphic-pressed p-4 rounded-xl bg-green-50">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium mb-1">Come funziona:</p>
                      <p>Quando un dipendente non timbra entro i minuti impostati dall'inizio del turno, verrà inviato un messaggio WhatsApp al numero configurato con i dettagli del turno mancato.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <NeumorphicButton onClick={() => setShowAlertSettings(false)} className="flex-1">
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton 
                  onClick={() => saveAlertMutation.mutate(alertConfig)}
                  variant="primary"
                  className="flex-1 flex items-center justify-center gap-2"
                  disabled={saveAlertMutation.isPending}
                >
                  {saveAlertMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salva
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}