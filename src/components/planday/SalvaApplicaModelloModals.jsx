import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";
import { X, Save, Calendar, Loader2 } from "lucide-react";
import moment from "moment";

export function SalvaSettimanaModelloModal({ show, onClose, weekStart, turni, settimaneModello }) {
  const [nome, setNome] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [selectedExisting, setSelectedExisting] = useState('');
  const [mode, setMode] = useState('new'); // 'new' or 'update'
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SettimanaModello.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settimane-modello'] });
      handleClose();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SettimanaModello.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settimane-modello'] });
      handleClose();
    }
  });

  const handleClose = () => {
    setNome('');
    setDescrizione('');
    setSelectedExisting('');
    setMode('new');
    onClose();
  };

  const buildTurniModello = () => {
    return turni.filter((t) => t.data && moment(t.data).isValid()).map((t) => ({
      giorno_settimana: moment(t.data).isoWeekday(),
      store_id: t.store_id,
      ora_inizio: t.ora_inizio,
      ora_fine: t.ora_fine,
      ruolo: t.ruolo,
      dipendente_id: t.dipendente_id || '',
      tipo_turno: t.tipo_turno || 'Normale',
      note: t.note || ''
    }));
  };

  const handleSave = () => {
    if (turni.length === 0) {
      alert('Nessun turno da salvare nella settimana corrente');
      return;
    }

    const turniModello = buildTurniModello();

    if (mode === 'update' && selectedExisting) {
      const existing = settimaneModello.find((m) => m.id === selectedExisting);
      updateMutation.mutate({
        id: selectedExisting,
        data: {
          nome: existing.nome,
          descrizione: existing.descrizione,
          turni_modello: turniModello
        }
      });
    } else {
      if (!nome.trim()) {
        alert('Inserisci un nome per il modello');
        return;
      }
      createMutation.mutate({
        nome: nome.trim(),
        descrizione: descrizione.trim(),
        turni_modello: turniModello
      });
    }
  };

  if (!show) return null;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <NeumorphicCard className="p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">Salva Settimana come Modello</h2>
          <button onClick={handleClose} className="nav-button p-2 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-xl">
          <p className="text-sm text-blue-800">
            <strong>Settimana Corrente:</strong><br />
            {weekStart.format('DD MMM')} - {weekStart.clone().add(6, 'days').format('DD MMM YYYY')}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {turni.length} turni in questa settimana
          </p>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('new')}
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              mode === 'new' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' : 'nav-button text-slate-700'
            }`}
          >
            Nuovo Modello
          </button>
          <button
            onClick={() => setMode('update')}
            disabled={settimaneModello.length === 0}
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              mode === 'update' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' : 'nav-button text-slate-700'
            } ${settimaneModello.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Aggiorna Esistente
          </button>
        </div>

        <div className="space-y-4">
          {mode === 'new' ? (
            <>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Nome Modello *</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                  placeholder="Es: Settimana Standard Gennaio" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Descrizione</label>
                <textarea
                  value={descrizione}
                  onChange={(e) => setDescrizione(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none h-20 resize-none"
                  placeholder="Descrizione opzionale..." />
              </div>
            </>
          ) : (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Seleziona Modello da Aggiornare *</label>
              <select
                value={selectedExisting}
                onChange={(e) => setSelectedExisting(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
              >
                <option value="">-- Seleziona --</option>
                {settimaneModello.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome} ({m.turni_modello?.length || 0} turni)
                  </option>
                ))}
              </select>
              {selectedExisting && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ I turni del modello verranno sostituiti con quelli della settimana corrente
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <NeumorphicButton onClick={handleClose} className="flex-1">
            Annulla
          </NeumorphicButton>
          <NeumorphicButton
            onClick={handleSave}
            variant="primary"
            className="flex-1"
            disabled={turni.length === 0 || isPending || (mode === 'update' && !selectedExisting)}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'update' ? 'Aggiorna Modello' : 'Salva Modello'}
          </NeumorphicButton>
        </div>
      </NeumorphicCard>
    </div>
  );
}

export function ApplicaModelloModal({ show, onClose, settimaneModello, users, uscite }) {
  const [selectedModello, setSelectedModello] = useState('');
  const [range, setRange] = useState({
    dataInizio: '',
    dataFine: '',
    applicaSenzaFine: false,
    includiDipendenti: true
  });
  const [isApplying, setIsApplying] = useState(false);
  const queryClient = useQueryClient();

  const handleClose = () => {
    setSelectedModello('');
    setRange({ dataInizio: '', dataFine: '', applicaSenzaFine: false, includiDipendenti: true });
    onClose();
  };

  const handleApply = async () => {
    if (!selectedModello || !range.dataInizio) {
      alert('Seleziona un modello e una data di inizio');
      return;
    }
    if (!range.applicaSenzaFine && !range.dataFine) {
      alert('Seleziona una data di fine o attiva "Applica senza fine"');
      return;
    }

    const modello = settimaneModello.find((m) => m.id === selectedModello);
    if (!modello) return;

    const startApply = moment(range.dataInizio);
    const endApply = range.applicaSenzaFine
      ? moment(range.dataInizio).add(52, 'weeks')
      : moment(range.dataFine);

    const turniDaCreare = [];
    let currentWeekStart = startApply.clone().startOf('isoWeek');

    while (currentWeekStart.isSameOrBefore(endApply)) {
      for (const turnoModello of modello.turni_modello) {
        if (!turnoModello.giorno_settimana || turnoModello.giorno_settimana < 1 || turnoModello.giorno_settimana > 7) continue;
        const newDate = currentWeekStart.clone().isoWeekday(turnoModello.giorno_settimana);

        if (newDate.isSameOrAfter(startApply) && newDate.isSameOrBefore(endApply)) {
          const dipendente = users.find((u) => u.id === turnoModello.dipendente_id);
          const includiDipendente = range.includiDipendenti !== false;

          let assignDipId = includiDipendente ? turnoModello.dipendente_id || '' : '';
          let assignDipNome = includiDipendente ? (dipendente?.nome_cognome || dipendente?.full_name || '') : '';

          // If employee has an "Uscita", make the shift free
          if (assignDipId) {
            const uscitaDip = uscite.find((u) => u.dipendente_id === assignDipId);
            if (uscitaDip) {
              const dataUscita = moment(uscitaDip.data_uscita);
              if (newDate.isSameOrAfter(dataUscita)) {
                assignDipId = '';
                assignDipNome = '';
              }
            }
          }

          turniDaCreare.push({
            store_id: turnoModello.store_id,
            data: newDate.format('YYYY-MM-DD'),
            ora_inizio: turnoModello.ora_inizio,
            ora_fine: turnoModello.ora_fine,
            ruolo: turnoModello.ruolo,
            dipendente_id: assignDipId,
            dipendente_nome: assignDipNome,
            tipo_turno: turnoModello.tipo_turno || 'Normale',
            note: turnoModello.note || '',
            stato: 'programmato'
          });
        }
      }
      currentWeekStart.add(1, 'week');
    }

    if (turniDaCreare.length === 0) {
      alert('Nessun turno da creare nel range selezionato');
      return;
    }

    const liberi = turniDaCreare.filter((t) => !t.dipendente_id).length;
    let msg = `Verranno creati ${turniDaCreare.length} turni.`;
    if (liberi > 0) msg += `\n${liberi} turni saranno liberi (dipendenti usciti).`;
    msg += '\nContinuare?';

    if (!confirm(msg)) return;

    setIsApplying(true);
    for (const turno of turniDaCreare) {
      await base44.entities.TurnoPlanday.create(turno);
    }
    queryClient.invalidateQueries({ queryKey: ['turni-planday'] });
    setIsApplying(false);
    alert(`Creati ${turniDaCreare.length} turni con successo!${liberi > 0 ? ` (${liberi} liberi per dipendenti usciti)` : ''}`);
    handleClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <NeumorphicCard className="p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">Applica Modello Settimana</h2>
          <button onClick={handleClose} className="nav-button p-2 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Seleziona Modello *</label>
            <select
              value={selectedModello}
              onChange={(e) => setSelectedModello(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
            >
              <option value="">-- Seleziona modello --</option>
              {settimaneModello.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} ({m.turni_modello?.length || 0} turni)
                </option>
              ))}
            </select>
            {selectedModello && (() => {
              const modello = settimaneModello.find((m) => m.id === selectedModello);
              if (modello?.descrizione) {
                return <p className="text-xs text-slate-500 mt-1">{modello.descrizione}</p>;
              }
              return null;
            })()}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Applica da *</label>
            <input
              type="date"
              value={range.dataInizio}
              onChange={(e) => setRange({ ...range, dataInizio: e.target.value })}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Dipendenti</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRange({ ...range, includiDipendenti: true })}
                className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  range.includiDipendenti !== false
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    : 'nav-button text-slate-700'
                }`}
              >
                Con dipendenti assegnati
              </button>
              <button
                type="button"
                onClick={() => setRange({ ...range, includiDipendenti: false })}
                className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  range.includiDipendenti === false
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    : 'nav-button text-slate-700'
                }`}
              >
                Solo turni liberi
              </button>
            </div>
          </div>

          {range.includiDipendenti !== false && uscite.length > 0 && (
            <div className="p-3 bg-yellow-50 rounded-xl">
              <p className="text-xs text-yellow-800">
                ℹ️ I turni assegnati a dipendenti con uscita registrata verranno creati come turni liberi.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="applica-senza-fine-modal"
              checked={range.applicaSenzaFine}
              onChange={(e) => setRange({ ...range, applicaSenzaFine: e.target.checked })}
              className="w-5 h-5" />
            <label htmlFor="applica-senza-fine-modal" className="text-sm font-medium text-slate-700">
              Applica indefinitamente (max 1 anno)
            </label>
          </div>

          {!range.applicaSenzaFine && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Fino a *</label>
              <input
                type="date"
                value={range.dataFine}
                onChange={(e) => setRange({ ...range, dataFine: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <NeumorphicButton onClick={handleClose} className="flex-1">
            Annulla
          </NeumorphicButton>
          <NeumorphicButton
            onClick={handleApply}
            variant="primary"
            className="flex-1"
            disabled={!selectedModello || isApplying}
          >
            {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Applica Modello'}
          </NeumorphicButton>
        </div>
      </NeumorphicCard>
    </div>
  );
}