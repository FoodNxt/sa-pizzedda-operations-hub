import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DollarSign,
  Save,
  CheckCircle,
  User,
  FileText,
  Building2,
  PlusCircle
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";

export default function FormDeposito() {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const redirectTo = urlParams.get('redirect');
  const turnoId = urlParams.get('turno_id');
  const attivitaNome = urlParams.get('attivita');
  
  const [banca, setBanca] = useState('');
  const [importo, setImporto] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!banca) {
      alert('Seleziona una banca');
      return;
    }

    if (!importo || parseFloat(importo) <= 0) {
      alert('Inserisci un importo valido');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      const now = new Date().toISOString();

      await base44.entities.Deposito.create({
        data_deposito: now,
        rilevato_da: currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email || 'N/A',
        importo: parseFloat(importo),
        banca: banca,
        note: note || ''
      });

      setSaveSuccess(true);
      
      queryClient.invalidateQueries({ queryKey: ['depositi'] });

      // Segna attività come completata se viene da un turno
      if (turnoId && attivitaNome) {
        try {
          await base44.entities.AttivitaCompletata.create({
            dipendente_id: currentUser.id,
            dipendente_nome: currentUser.nome_cognome || currentUser.full_name,
            turno_id: turnoId,
            turno_data: new Date().toISOString().split('T')[0],
            store_id: null,
            attivita_nome: decodeURIComponent(attivitaNome),
            form_page: 'FormDeposito',
            completato_at: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error marking activity as completed:', error);
        }
      }

      // Redirect dopo un breve delay
      setTimeout(() => {
        if (redirectTo) {
          navigate(createPageUrl(redirectTo));
        } else {
          setSaveSuccess(false);
          setImporto('');
          setNote('');
          setBanca('');
        }
      }, 1500);
    } catch (error) {
      console.error('Error saving deposito:', error);
      alert('Errore durante il salvataggio: ' + error.message);
    }

    setSaving(false);
  };

  return (
    <ProtectedPage pageName="FormDeposito">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <PlusCircle className="w-10 h-10 text-green-600" />
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              Form Deposito
            </h1>
          </div>
          <p className="text-sm text-slate-500">Registra depositi contanti in banca</p>
        </div>

        {saveSuccess && (
          <NeumorphicCard className="p-4 bg-green-50 border-2 border-green-400">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800 font-medium">
                Deposito registrato con successo! ✅
              </p>
            </div>
          </NeumorphicCard>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Nuovo Deposito</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Banca <span className="text-red-600">*</span>
                </label>
                <select
                  value={banca}
                  onChange={(e) => setBanca(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  required
                  disabled={saving}
                >
                  <option value="">Seleziona banca...</option>
                  <option value="BPM">BPM</option>
                  <option value="Sella">Sella</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Importo Deposito (€) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={importo}
                  onChange={(e) => setImporto(e.target.value)}
                  placeholder="es. 1500.00"
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-2xl font-bold"
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Note
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note aggiuntive (opzionale)"
                  rows={3}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none resize-none"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Rilevato da
                </label>
                <div className="neumorphic-pressed px-4 py-3 rounded-xl">
                  <p className="text-slate-700">
                    {currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email || 'Caricamento...'}
                  </p>
                </div>
              </div>

              <div className="neumorphic-pressed p-3 rounded-xl bg-blue-50">
                <p className="text-xs text-blue-800">
                  ℹ️ La data e l'ora del deposito verranno registrate automaticamente
                </p>
              </div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <NeumorphicButton
              type="submit"
              variant="primary"
              className="w-full py-4 text-lg font-bold flex items-center justify-center gap-3"
              disabled={saving || !banca || !importo}
            >
              {saving ? (
                <>
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvataggio in corso...
                </>
              ) : (
                <>
                  <Save className="w-6 h-6" />
                  Registra Deposito
                </>
              )}
            </NeumorphicButton>
          </NeumorphicCard>
        </form>
      </div>
    </ProtectedPage>
  );
}