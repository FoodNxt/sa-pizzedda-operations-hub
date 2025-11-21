import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Send, CheckCircle, Clock, Edit, Save, X, History } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ReactQuill from 'react-quill';

export default function RegolamentoDipendenti() {
  const [showForm, setShowForm] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [contenuto, setContenuto] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  const queryClient = useQueryClient();

  const { data: regolamenti = [] } = useQuery({
    queryKey: ['regolamenti'],
    queryFn: () => base44.entities.RegolamentoDipendenti.list('-versione'),
  });

  const { data: firme = [] } = useQuery({
    queryKey: ['regolamenti-firmati'],
    queryFn: () => base44.entities.RegolamentoFirmato.list('-created_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-dipendenti'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.user_type === 'dipendente' || u.user_type === 'user');
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const creaRegolamentoMutation = useMutation({
    mutationFn: async (contenuto) => {
      const maxVersione = regolamenti.length > 0 ? Math.max(...regolamenti.map(r => r.versione || 0)) : 0;
      const nuovaVersione = maxVersione + 1;

      await base44.entities.RegolamentoDipendenti.filter({ attivo: true }).then(async (attivi) => {
        for (const reg of attivi) {
          await base44.entities.RegolamentoDipendenti.update(reg.id, { attivo: false });
        }
      });

      return base44.entities.RegolamentoDipendenti.create({
        versione: nuovaVersione,
        contenuto: contenuto,
        data_creazione: new Date().toISOString(),
        attivo: true,
        creato_da: currentUser?.email || 'admin'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regolamenti'] });
      setContenuto('');
      setShowForm(false);
      alert('Regolamento creato con successo!');
    },
  });

  const inviaRegolamentoMutation = useMutation({
    mutationFn: async ({ regolamentoId, userIds }) => {
      const regolamento = regolamenti.find(r => r.id === regolamentoId);
      
      for (const userId of userIds) {
        const user = users.find(u => u.id === userId);
        // Check if already signed
        const giàFirmato = firme.find(f => f.user_id === userId && f.regolamento_id === regolamentoId);
        
        if (!giàFirmato && user) {
          await base44.entities.RegolamentoFirmato.create({
            user_id: user.id,
            user_email: user.email,
            user_name: user.nome_cognome || user.full_name || user.email,
            regolamento_id: regolamento.id,
            versione: regolamento.versione,
            data_firma: null
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regolamenti-firmati'] });
      setSelectedUsers([]);
      setShowSendModal(false);
      alert('Regolamento inviato ai dipendenti selezionati!');
    },
  });

  const regolamentoAttivo = regolamenti.find(r => r.attivo);
  const versioni = regolamenti.filter(r => !r.attivo);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (contenuto.trim()) {
      creaRegolamentoMutation.mutate(contenuto);
    }
  };

  const handleSendRegolamento = () => {
    if (regolamentoAttivo && selectedUsers.length > 0) {
      inviaRegolamentoMutation.mutate({
        regolamentoId: regolamentoAttivo.id,
        userIds: selectedUsers
      });
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getFirmePerRegolamento = (regolamentoId) => {
    return firme.filter(f => f.regolamento_id === regolamentoId);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
            Regolamento Dipendenti
          </h1>
          <p className="text-sm text-slate-500">Gestisci il regolamento aziendale</p>
        </div>
        <div className="flex gap-3">
          <NeumorphicButton
            onClick={() => setShowVersions(!showVersions)}
            className="flex items-center gap-2"
          >
            <History className="w-5 h-5" />
            Versioni
          </NeumorphicButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <NeumorphicCard className="p-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-3 flex items-center justify-center shadow-lg">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-1">v{regolamentoAttivo?.versione || 0}</h3>
            <p className="text-xs text-slate-500">Versione Attiva</p>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mx-auto mb-3 flex items-center justify-center shadow-lg">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-green-600 mb-1">
              {regolamentoAttivo ? getFirmePerRegolamento(regolamentoAttivo.id).filter(f => f.data_firma).length : 0}
            </h3>
            <p className="text-xs text-slate-500">Firme Raccolte</p>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 mx-auto mb-3 flex items-center justify-center shadow-lg">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-yellow-600 mb-1">
              {regolamentoAttivo ? getFirmePerRegolamento(regolamentoAttivo.id).filter(f => !f.data_firma).length : 0}
            </h3>
            <p className="text-xs text-slate-500">In Attesa</p>
          </div>
        </NeumorphicCard>
      </div>

      {regolamentoAttivo ? (
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">Regolamento Attivo (v{regolamentoAttivo.versione})</h2>
            <div className="flex gap-3">
              <NeumorphicButton
                onClick={() => setShowSendModal(true)}
                variant="primary"
                className="flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                Invia ai Dipendenti
              </NeumorphicButton>
              <NeumorphicButton
                onClick={() => {
                  setContenuto(regolamentoAttivo.contenuto);
                  setShowForm(true);
                }}
                className="flex items-center gap-2"
              >
                <Edit className="w-5 h-5" />
                Modifica
              </NeumorphicButton>
            </div>
          </div>
          <div className="neumorphic-pressed p-6 rounded-xl">
            <div 
              className="text-sm text-slate-700 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: regolamentoAttivo.contenuto }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Creato il {new Date(regolamentoAttivo.data_creazione || regolamentoAttivo.created_date).toLocaleDateString('it-IT')} 
            da {regolamentoAttivo.creato_da}
          </p>
        </NeumorphicCard>
      ) : (
        <NeumorphicCard className="p-12 text-center">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">Nessun Regolamento Attivo</h3>
          <p className="text-slate-500 mb-6">Crea la prima versione del regolamento</p>
          <NeumorphicButton
            onClick={() => setShowForm(true)}
            variant="primary"
            className="flex items-center gap-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
            Crea Regolamento
          </NeumorphicButton>
        </NeumorphicCard>
      )}

      {showVersions && versioni.length > 0 && (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Versioni Precedenti</h2>
          <div className="space-y-3">
            {versioni.map(reg => (
              <NeumorphicCard key={reg.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 mb-1">Versione {reg.versione}</h3>
                    <p className="text-xs text-slate-500">
                      Creato il {new Date(reg.data_creazione || reg.created_date).toLocaleDateString('it-IT')}
                    </p>
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">{reg.contenuto}</p>
                  </div>
                </div>
              </NeumorphicCard>
            ))}
          </div>
        </NeumorphicCard>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">
                  {regolamentoAttivo ? 'Modifica Regolamento (Nuova Versione)' : 'Nuovo Regolamento'}
                </h2>
                <button onClick={() => { setShowForm(false); setContenuto(''); }} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Contenuto Regolamento
                  </label>
                  <div className="neumorphic-pressed rounded-xl overflow-hidden">
                    <ReactQuill
                      value={contenuto}
                      onChange={setContenuto}
                      modules={{
                        toolbar: [
                          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                          [{ 'size': ['small', false, 'large', 'huge'] }],
                          ['bold', 'italic', 'underline'],
                          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                          ['clean']
                        ]
                      }}
                      className="bg-white"
                      style={{ minHeight: '300px' }}
                    />
                  {regolamentoAttivo && (
                    <p className="text-xs text-orange-600 mt-2">
                      ⚠️ Salvando, verrà creata la versione {(regolamentoAttivo.versione || 0) + 1} e quella attuale diventerà storica.
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <NeumorphicButton type="button" onClick={() => { setShowForm(false); setContenuto(''); }} className="flex-1">
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton type="submit" variant="primary" className="flex-1">
                    <Save className="w-5 h-5 mr-2" />
                    Salva Regolamento
                  </NeumorphicButton>
                </div>
              </form>
            </NeumorphicCard>
          </div>
        </div>
      )}

      {showSendModal && regolamentoAttivo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Invia Regolamento</h2>
                <button onClick={() => { setShowSendModal(false); setSelectedUsers([]); }} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Seleziona Dipendenti
                </label>
                {users.map(user => {
                  const giàFirmato = firme.find(f => f.user_id === user.id && f.regolamento_id === regolamentoAttivo.id && f.data_firma);
                  const inAttesa = firme.find(f => f.user_id === user.id && f.regolamento_id === regolamentoAttivo.id && !f.data_firma);
                  
                  return (
                    <div key={user.id} className="neumorphic-flat p-3 rounded-lg">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          disabled={giàFirmato || inAttesa}
                          className="w-5 h-5"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">
                            {user.nome_cognome || user.full_name || user.email}
                          </p>
                          {giàFirmato && (
                            <p className="text-xs text-green-600">✓ Già firmato</p>
                          )}
                          {inAttesa && (
                            <p className="text-xs text-yellow-600">⏳ In attesa di firma</p>
                          )}
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <NeumorphicButton 
                  type="button" 
                  onClick={() => { setShowSendModal(false); setSelectedUsers([]); }} 
                  className="flex-1"
                >
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton 
                  onClick={handleSendRegolamento}
                  variant="primary" 
                  className="flex-1"
                  disabled={selectedUsers.length === 0}
                >
                  <Send className="w-5 h-5 mr-2" />
                  Invia ({selectedUsers.length})
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          </div>
        </div>
      )}
    </div>
  );
}