import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Send, CheckCircle, Clock, X, AlertCircle, History, BookOpen } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";

export default function RegolamentoSection() {
  const [showForm, setShowForm] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [contenuto, setContenuto] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  const queryClient = useQueryClient();
  const { data: regolamenti = [] } = useQuery({
    queryKey: ['regolamenti'],
    queryFn: () => base44.entities.RegolamentoDipendenti.list('-versione')
  });
  const { data: firme = [] } = useQuery({
    queryKey: ['regolamenti-firmati'],
    queryFn: () => base44.entities.RegolamentoFirmato.list('-data_firma')
  });
  const { data: users = [] } = useQuery({
    queryKey: ['users-dip'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter((u) => u.user_type === 'dipendente' || u.user_type === 'user');
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const regolamentoAttivo = regolamenti.find((r) => r.attivo);
      if (regolamentoAttivo) {
        await base44.entities.RegolamentoDipendenti.update(regolamentoAttivo.id, { attivo: false });
      }
      return base44.entities.RegolamentoDipendenti.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regolamenti'] });
      setShowForm(false);
      setContenuto('');
    }
  });

  const sendToEmployeesMutation = useMutation({
    mutationFn: async ({ regolamentoId, userIds }) => {
      const regolamento = regolamenti.find((r) => r.id === regolamentoId);
      const firmeToCreate = [];
      for (const userId of userIds) {
        const user = users.find((u) => u.id === userId);
        firmeToCreate.push({
          user_id: userId,
          user_email: user.email,
          user_name: user.nome_cognome || user.full_name || user.email,
          regolamento_id: regolamentoId,
          versione: regolamento.versione,
          firmato: false
        });
      }
      return Promise.all(firmeToCreate.map((f) => base44.entities.RegolamentoFirmato.create(f)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regolamenti-firmati'] });
      setShowSendModal(false);
      setSelectedUsers([]);
      alert('Regolamento inviato con successo!');
    }
  });

  const regolamentoAttivo = regolamenti.find((r) => r.attivo);

  const handleSubmit = (e) => {
    e.preventDefault();
    const versione = (regolamentoAttivo?.versione || 0) + 1;
    createMutation.mutate({ versione, contenuto, data_creazione: new Date().toISOString(), attivo: true });
  };

  const toggleUser = (userId) => {
    setSelectedUsers((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };

  return (
    <>
      <div className="flex gap-3 mb-6">
        <NeumorphicButton onClick={() => setShowForm(true)} variant="primary" className="flex items-center gap-2">
          <Plus className="w-5 h-5" /> Nuova Versione
        </NeumorphicButton>
        {regolamentoAttivo && <>
          <NeumorphicButton onClick={() => setShowSendModal(true)} className="flex items-center gap-2">
            <Send className="w-5 h-5" /> Invia ai Dipendenti
          </NeumorphicButton>
          <NeumorphicButton onClick={() => setShowHistory(true)} className="flex items-center gap-2">
            <History className="w-5 h-5" /> Storico
          </NeumorphicButton>
        </>}
      </div>

      {regolamentoAttivo ? <>
        <NeumorphicCard className="p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Regolamento Attivo (v{regolamentoAttivo.versione})</h2>
          <div className="neumorphic-pressed p-6 rounded-xl">
            <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">{regolamentoAttivo.contenuto}</pre>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Stato Firme (v{regolamentoAttivo.versione})</h3>
          {(() => {
            const firmeVersAttiva = firme.filter((f) => f.versione === regolamentoAttivo.versione);
            const firmati = firmeVersAttiva.filter((f) => f.firmato);
            const nonFirmati = firmeVersAttiva.filter((f) => !f.firmato);
            const utentiConFirma = firmeVersAttiva.map((f) => f.user_id);
            const nonInviati = users.filter((u) => !utentiConFirma.includes(u.id));

            return (
              <div className="space-y-6">
                {firmati.length > 0 && <div>
                  <h4 className="text-sm font-bold text-green-700 mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Firmati ({firmati.length})</h4>
                  <div className="space-y-2">
                    {firmati.map((f) => <div key={f.id} className="neumorphic-flat p-3 rounded-lg bg-green-50 flex items-center justify-between">
                      <div><p className="text-sm font-medium text-slate-800">{f.user_name}</p><p className="text-xs text-green-600">Firmato: {f.data_firma ? new Date(f.data_firma).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</p></div>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>)}
                  </div>
                </div>}
                {nonFirmati.length > 0 && <div>
                  <h4 className="text-sm font-bold text-orange-700 mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> In Attesa Firma ({nonFirmati.length})</h4>
                  <div className="space-y-2">
                    {nonFirmati.map((f) => <div key={f.id} className="neumorphic-flat p-3 rounded-lg bg-orange-50 flex items-center justify-between">
                      <div><p className="text-sm font-medium text-slate-800">{f.user_name}</p><p className="text-xs text-slate-500">Inviato: {f.created_date ? new Date(f.created_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</p></div>
                      <Clock className="w-5 h-5 text-orange-600" />
                    </div>)}
                  </div>
                </div>}
                {nonInviati.length > 0 && <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-slate-500 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Non Inviato ({nonInviati.length})</h4>
                    <button onClick={async () => { if (!confirm(`Inviare il regolamento a ${nonInviati.length} dipendenti?`)) return; await sendToEmployeesMutation.mutateAsync({ regolamentoId: regolamentoAttivo.id, userIds: nonInviati.map((u) => u.id) }); }} className="nav-button px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 bg-blue-50 hover:bg-blue-100">
                      <Send className="w-3.5 h-3.5 text-blue-600" /> Invia a Tutti
                    </button>
                  </div>
                  <div className="space-y-2">
                    {nonInviati.map((u) => <div key={u.id} className="neumorphic-flat p-3 rounded-lg bg-slate-50 flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-700">{u.nome_cognome || u.full_name || u.email}</p>
                      <button onClick={async () => { if (!confirm(`Inviare il regolamento a ${u.nome_cognome || u.full_name || u.email}?`)) return; await sendToEmployeesMutation.mutateAsync({ regolamentoId: regolamentoAttivo.id, userIds: [u.id] }); }} className="nav-button p-1.5 rounded-lg hover:bg-blue-50">
                        <Send className="w-4 h-4 text-blue-600" />
                      </button>
                    </div>)}
                  </div>
                </div>}
              </div>
            );
          })()}
        </NeumorphicCard>
      </> : <NeumorphicCard className="p-12 text-center"><BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" /><p className="text-slate-500">Nessun regolamento attivo</p></NeumorphicCard>}

      {showForm && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between mb-4"><h2 className="text-xl font-bold">Nuovo Regolamento</h2><button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button></div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea value={contenuto} onChange={(e) => setContenuto(e.target.value)} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none h-96 resize-none" placeholder="Inserisci il testo del regolamento..." required />
            <NeumorphicButton type="submit" variant="primary" className="w-full">Salva Versione {(regolamentoAttivo?.versione || 0) + 1}</NeumorphicButton>
          </form>
        </NeumorphicCard>
      </div>}

      {showSendModal && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <NeumorphicCard className="max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between mb-4"><h2 className="text-xl font-bold">Seleziona Dipendenti</h2><button onClick={() => setShowSendModal(false)}><X className="w-5 h-5" /></button></div>
          <div className="space-y-2 mb-4">
            {users.map((u) => <button key={u.id} type="button" onClick={() => toggleUser(u.id)} className={`w-full p-3 rounded-xl text-left transition-all ${selectedUsers.includes(u.id) ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' : 'nav-button'}`}>{u.nome_cognome || u.full_name || u.email}</button>)}
          </div>
          <NeumorphicButton onClick={() => sendToEmployeesMutation.mutate({ regolamentoId: regolamentoAttivo.id, userIds: selectedUsers })} variant="primary" className="w-full">Invia a {selectedUsers.length} dipendenti</NeumorphicButton>
        </NeumorphicCard>
      </div>}

      {showHistory && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <NeumorphicCard className="max-w-6xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between mb-4"><h2 className="text-xl font-bold">Storico Versioni</h2><button onClick={() => setShowHistory(false)}><X className="w-5 h-5" /></button></div>
          <div className="space-y-6">
            {regolamenti.map((r) => {
              const firmeVers = firme.filter((f) => f.versione === r.versione);
              const firmatiV = firmeVers.filter((f) => f.firmato);
              const nonFirmatiV = firmeVers.filter((f) => !f.firmato);
              const utentiConFirmaV = firmeVers.map((f) => f.user_id);
              const nonInviatiV = users.filter((u) => !utentiConFirmaV.includes(u.id));
              return (
                <NeumorphicCard key={r.id} className="p-4">
                  <div className="flex items-center justify-between mb-3"><p className="font-bold text-slate-800">Versione {r.versione}</p>{r.attivo && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Attivo</span>}</div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="neumorphic-pressed p-2 rounded-lg bg-green-50 text-center"><p className="text-lg font-bold text-green-700">{firmatiV.length}</p><p className="text-xs text-green-600">Firmati</p></div>
                    <div className="neumorphic-pressed p-2 rounded-lg bg-orange-50 text-center"><p className="text-lg font-bold text-orange-700">{nonFirmatiV.length}</p><p className="text-xs text-orange-600">In Attesa</p></div>
                    <div className="neumorphic-pressed p-2 rounded-lg bg-slate-50 text-center"><p className="text-lg font-bold text-slate-700">{nonInviatiV.length}</p><p className="text-xs text-slate-600">Non Inviato</p></div>
                  </div>
                  <details className="neumorphic-pressed p-3 rounded-lg">
                    <summary className="cursor-pointer text-sm font-medium text-slate-700">Dettaglio Dipendenti</summary>
                    <div className="mt-3 space-y-3">
                      {firmatiV.length > 0 && <div><p className="text-xs font-bold text-green-700 mb-1">✓ Firmati:</p>{firmatiV.map((f) => <p key={f.id} className="text-xs text-slate-600 pl-2">• {f.user_name}</p>)}</div>}
                      {nonFirmatiV.length > 0 && <div><p className="text-xs font-bold text-orange-700 mb-1">⏱ In Attesa:</p>{nonFirmatiV.map((f) => <p key={f.id} className="text-xs text-slate-600 pl-2">• {f.user_name}</p>)}</div>}
                      {nonInviatiV.length > 0 && <div><p className="text-xs font-bold text-slate-500 mb-1">✗ Non Inviato:</p>{nonInviatiV.map((u) => <p key={u.id} className="text-xs text-slate-600 pl-2">• {u.nome_cognome || u.full_name || u.email}</p>)}</div>}
                    </div>
                  </details>
                </NeumorphicCard>
              );
            })}
          </div>
        </NeumorphicCard>
      </div>}
    </>
  );
}