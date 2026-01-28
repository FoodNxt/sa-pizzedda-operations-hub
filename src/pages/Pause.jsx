import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Coffee, Clock, Users, Settings, Calendar, TrendingUp, AlertCircle, Plus, Trash2, X } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { it } from 'date-fns/locale';
import ProtectedPage from "../components/ProtectedPage";

export default function Pause() {
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [formData, setFormData] = useState({
    durata_minima_turno_minuti: 240,
    durata_pausa_minuti: 15,
    numero_pause_per_turno: 1,
    slot_orari: [{ orario_inizio: '11:00', orario_fine: '15:00' }],
    numero_minimo_colleghi: 2,
    attivo: true
  });

  const queryClient = useQueryClient();

  const { data: configs = [] } = useQuery({
    queryKey: ['pause-config'],
    queryFn: () => base44.entities.PauseConfig.list('-created_date')
  });

  const { data: pause = [] } = useQuery({
    queryKey: ['pause'],
    queryFn: () => base44.entities.Pausa.list('-inizio_pausa', 200)
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const createConfigMutation = useMutation({
    mutationFn: (data) => base44.entities.PauseConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pause-config'] });
      resetForm();
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PauseConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pause-config'] });
      resetForm();
    }
  });

  const deleteConfigMutation = useMutation({
    mutationFn: (id) => base44.entities.PauseConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pause-config'] });
    }
  });

  const activeConfig = configs.find((c) => c.attivo);

  const resetForm = () => {
    setShowConfigForm(false);
    setEditingConfig(null);
    setFormData({
      durata_minima_turno_minuti: 240,
      durata_pausa_minuti: 15,
      numero_pause_per_turno: 1,
      slot_orari: [{ orario_inizio: '11:00', orario_fine: '15:00' }],
      numero_minimo_colleghi: 2,
      attivo: true
    });
  };

  const handleEdit = (config) => {
    setEditingConfig(config);
    setFormData({
      durata_minima_turno_minuti: config.durata_minima_turno_minuti,
      durata_pausa_minuti: config.durata_pausa_minuti,
      numero_pause_per_turno: config.numero_pause_per_turno || 1,
      slot_orari: config.slot_orari || [{ orario_inizio: '11:00', orario_fine: '15:00' }],
      numero_minimo_colleghi: config.numero_minimo_colleghi,
      attivo: config.attivo
    });
    setShowConfigForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingConfig) {
      updateConfigMutation.mutate({ id: editingConfig.id, data: formData });
    } else {
      createConfigMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Sei sicuro di voler eliminare questa configurazione?')) {
      deleteConfigMutation.mutate(id);
    }
  };

  const toggleConfigStatus = (config) => {
    updateConfigMutation.mutate({
      id: config.id,
      data: { attivo: !config.attivo }
    });
  };

  // Statistiche pause
  const pauseOggi = pause.filter((p) => {
    const dataP = parseISO(p.data_turno);
    const oggi = new Date();
    return dataP.toDateString() === oggi.toDateString();
  });

  const pauseInCorso = pause.filter((p) => p.stato === 'in_corso');
  const pauseCompletate = pause.filter((p) => p.stato === 'completata');
  const durataMediaPause = pauseCompletate.length > 0 ?
  Math.round(pauseCompletate.reduce((sum, p) => sum + (p.durata_effettiva_minuti || 0), 0) / pauseCompletate.length) :
  0;

  return (
    <ProtectedPage pageName="Pause">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-50 text-3xl font-bold flex items-center gap-3">Gestione Pause


            </h1>
            <p className="text-slate-50 mt-1">Configura e monitora le pause dei dipendenti</p>
          </div>
          <NeumorphicButton
            onClick={() => setShowConfigForm(!showConfigForm)}
            variant="primary"
            className="flex items-center gap-2">

            <Settings className="w-5 h-5" />
            Nuova Configurazione
          </NeumorphicButton>
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <NeumorphicCard className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 mx-auto mb-3 flex items-center justify-center">
              <Coffee className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-1">{pauseOggi.length}</h3>
            <p className="text-sm text-slate-500">Pause Oggi</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-3 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-blue-600 mb-1">{pauseInCorso.length}</h3>
            <p className="text-sm text-slate-500">In Corso</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 mx-auto mb-3 flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-green-600 mb-1">{durataMediaPause}m</h3>
            <p className="text-sm text-slate-500">Durata Media</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 mx-auto mb-3 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-purple-600 mb-1">{pauseCompletate.length}</h3>
            <p className="text-sm text-slate-500">Completate</p>
          </NeumorphicCard>
        </div>

        {/* Form configurazione */}
        {showConfigForm &&
        <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-6 h-6 text-amber-600" />
                {editingConfig ? 'Modifica Configurazione' : 'Nuova Configurazione Pause'}
              </h2>
              <button onClick={resetForm} className="text-slate-500 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Durata Minima Turno (minuti)
                  </label>
                  <input
                  type="number"
                  required
                  min="0"
                  value={formData.durata_minima_turno_minuti}
                  onChange={(e) => setFormData({ ...formData, durata_minima_turno_minuti: parseInt(e.target.value) })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none" />

                  <p className="text-xs text-slate-500 mt-1">
                    {Math.floor(formData.durata_minima_turno_minuti / 60)}h {formData.durata_minima_turno_minuti % 60}m
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Durata Pausa (minuti)
                  </label>
                  <input
                  type="number"
                  required
                  min="1"
                  value={formData.durata_pausa_minuti}
                  onChange={(e) => setFormData({ ...formData, durata_pausa_minuti: parseInt(e.target.value) })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none" />

                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Numero Pause per Turno
                  </label>
                  <input
                  type="number"
                  required
                  min="1"
                  value={formData.numero_pause_per_turno}
                  onChange={(e) => setFormData({ ...formData, numero_pause_per_turno: parseInt(e.target.value) })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none" />

                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Numero Minimo Colleghi Presenti
                  </label>
                  <input
                  type="number"
                  required
                  min="1"
                  value={formData.numero_minimo_colleghi}
                  onChange={(e) => setFormData({ ...formData, numero_minimo_colleghi: parseInt(e.target.value) })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none" />

                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700">Slot Orari Consentiti</label>
                  <NeumorphicButton
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    slot_orari: [...formData.slot_orari, { orario_inizio: '11:00', orario_fine: '15:00' }]
                  })}
                  className="text-sm flex items-center gap-1">

                    <Plus className="w-4 h-4" /> Aggiungi Slot
                  </NeumorphicButton>
                </div>
                <div className="space-y-2">
                  {formData.slot_orari.map((slot, idx) =>
                <div key={idx} className="flex items-center gap-2">
                      <input
                    type="time"
                    value={slot.orario_inizio}
                    onChange={(e) => {
                      const newSlots = [...formData.slot_orari];
                      newSlots[idx].orario_inizio = e.target.value;
                      setFormData({ ...formData, slot_orari: newSlots });
                    }}
                    className="flex-1 neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none" />

                      <span className="text-slate-500">-</span>
                      <input
                    type="time"
                    value={slot.orario_fine}
                    onChange={(e) => {
                      const newSlots = [...formData.slot_orari];
                      newSlots[idx].orario_fine = e.target.value;
                      setFormData({ ...formData, slot_orari: newSlots });
                    }}
                    className="flex-1 neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none" />

                      {formData.slot_orari.length > 1 &&
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      slot_orari: formData.slot_orari.filter((_, i) => i !== idx)
                    })}
                    className="text-red-500 hover:text-red-700">

                          <Trash2 className="w-4 h-4" />
                        </button>
                  }
                    </div>
                )}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <NeumorphicButton type="button" onClick={resetForm}>
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton type="submit" variant="primary">
                  {editingConfig ? 'Aggiorna' : 'Salva'} Configurazione
                </NeumorphicButton>
              </div>
            </form>
          </NeumorphicCard>
        }

        {/* Configurazione attiva */}
        {activeConfig &&
        <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Settings className="w-6 h-6 text-green-600" />
              Configurazione Attiva
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <Clock className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 mb-1">Turno Minimo</p>
                <p className="font-bold text-slate-800">
                  {Math.floor(activeConfig.durata_minima_turno_minuti / 60)}h {activeConfig.durata_minima_turno_minuti % 60}m
                </p>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <Coffee className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 mb-1">Durata Pausa</p>
                <p className="font-bold text-slate-800">{activeConfig.durata_pausa_minuti}m</p>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 mb-1">Slot Orari</p>
                <div className="text-xs text-slate-800 space-y-1">
                  {(activeConfig.slot_orari || []).map((slot, idx) =>
                <div key={idx} className="font-bold">
                      {slot.orario_inizio} - {slot.orario_fine}
                    </div>
                )}
                </div>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <Users className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 mb-1">Colleghi Min</p>
                <p className="font-bold text-slate-800">{activeConfig.numero_minimo_colleghi}</p>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl text-center flex flex-col gap-2 items-center justify-center">
                <NeumorphicButton
                onClick={() => handleEdit(activeConfig)}
                className="text-sm w-full">

                  Modifica
                </NeumorphicButton>
                <NeumorphicButton
                onClick={() => toggleConfigStatus(activeConfig)}
                className="text-sm w-full">

                  Disattiva
                </NeumorphicButton>
              </div>
            </div>
          </NeumorphicCard>
        }

        {/* Altre configurazioni */}
        {configs.filter((c) => !c.attivo).length > 0 &&
        <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Configurazioni Inattive</h2>
            <div className="space-y-3">
              {configs.filter((c) => !c.attivo).map((config) =>
            <div key={config.id} className="neumorphic-pressed p-4 rounded-xl flex items-center justify-between">
                  <div className="grid grid-cols-4 gap-4 flex-1">
                    <div>
                      <p className="text-xs text-slate-500">Turno Min</p>
                      <p className="font-medium text-slate-700">{config.durata_minima_turno_minuti}m</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Pausa</p>
                      <p className="font-medium text-slate-700">{config.durata_pausa_minuti}m</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Slot Orari</p>
                      <div className="text-xs text-slate-700 space-y-0.5">
                        {(config.slot_orari || []).map((slot, idx) =>
                    <div key={idx}>{slot.orario_inizio} - {slot.orario_fine}</div>
                    )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Colleghi</p>
                      <p className="font-medium text-slate-700">{config.numero_minimo_colleghi}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <NeumorphicButton
                  onClick={() => handleEdit(config)}
                  className="text-sm flex items-center gap-1">

                      <Settings className="w-4 h-4" /> Modifica
                    </NeumorphicButton>
                    <NeumorphicButton onClick={() => toggleConfigStatus(config)} className="text-sm">
                      Attiva
                    </NeumorphicButton>
                    <button
                  onClick={() => handleDelete(config.id)}
                  className="text-red-500 hover:text-red-700 p-2">

                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
            )}
            </div>
          </NeumorphicCard>
        }

        {/* Log pause */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-slate-600" />
            Logging Pause
          </h2>
          
          {pause.length === 0 ?
          <div className="text-center py-12">
              <Coffee className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nessuna pausa registrata</p>
            </div> :

          <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-amber-600">
                    <th className="text-left p-3 text-slate-600 font-medium">Data</th>
                    <th className="text-left p-3 text-slate-600 font-medium">Dipendente</th>
                    <th className="text-left p-3 text-slate-600 font-medium">Store</th>
                    <th className="text-left p-3 text-slate-600 font-medium">Inizio</th>
                    <th className="text-left p-3 text-slate-600 font-medium">Fine</th>
                    <th className="text-left p-3 text-slate-600 font-medium">Durata</th>
                    <th className="text-left p-3 text-slate-600 font-medium">Colleghi</th>
                    <th className="text-left p-3 text-slate-600 font-medium">Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {pause.map((p) =>
                <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-3 text-sm text-slate-700">
                        {format(parseISO(p.data_turno), 'dd/MM/yyyy', { locale: it })}
                      </td>
                      <td className="p-3 text-sm text-slate-700">{p.dipendente_nome}</td>
                      <td className="p-3 text-sm text-slate-700">{p.store_name}</td>
                      <td className="p-3 text-sm text-slate-700">
                        {format(parseISO(p.inizio_pausa), 'HH:mm', { locale: it })}
                      </td>
                      <td className="p-3 text-sm text-slate-700">
                        {p.fine_pausa ? format(parseISO(p.fine_pausa), 'HH:mm', { locale: it }) : '-'}
                      </td>
                      <td className="p-3 text-sm font-bold text-amber-600">
                        {p.durata_effettiva_minuti ? `${p.durata_effettiva_minuti}m` : '-'}
                      </td>
                      <td className="p-3 text-sm text-slate-700">{p.colleghi_presenti_al_momento || '-'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    p.stato === 'in_corso' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`
                    }>
                          {p.stato === 'in_corso' ? 'In corso' : 'Completata'}
                        </span>
                      </td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>
          }
        </NeumorphicCard>
      </div>
    </ProtectedPage>);

}