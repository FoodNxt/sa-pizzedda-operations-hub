import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DollarSign,
  Save,
  CheckCircle,
  Store,
  User,
  Calendar,
  TrendingUp
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function ConteggioCassa() {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const redirectTo = urlParams.get('redirect');
  const turnoId = urlParams.get('turno_id');
  const attivitaNome = urlParams.get('attivita');
  
  const [selectedStore, setSelectedStore] = useState('');
  const [valoreConteggio, setValoreConteggio] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userType, setUserType] = useState(null); // Added new state for userType

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        setUserType(user.user_type); // Set userType here
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: conteggi = [] } = useQuery({
    queryKey: ['conteggi-cassa'],
    queryFn: () => base44.entities.ConteggioCassa.list('-data_conteggio', 50),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedStore) {
      alert('Seleziona un locale');
      return;
    }

    if (!valoreConteggio || parseFloat(valoreConteggio) < 0) {
      alert('Inserisci un valore valido');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      const store = stores.find(s => s.id === selectedStore);
      const now = new Date().toISOString();

      await base44.entities.ConteggioCassa.create({
        store_name: store.name,
        store_id: store.id,
        data_conteggio: now,
        rilevato_da: currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email || 'N/A',
        valore_conteggio: parseFloat(valoreConteggio)
      });

      setSaveSuccess(true);
      
      queryClient.invalidateQueries({ queryKey: ['conteggi-cassa'] });

      // Segna attività come completata se viene da un turno
      if (turnoId && attivitaNome) {
        try {
          await base44.entities.AttivitaCompletata.create({
            dipendente_id: currentUser.id,
            dipendente_nome: currentUser.nome_cognome || currentUser.full_name,
            turno_id: turnoId,
            turno_data: new Date().toISOString().split('T')[0],
            store_id: store.id,
            attivita_nome: decodeURIComponent(attivitaNome),
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
          setValoreConteggio('');
          setSelectedStore('');
        }
      }, 1500);
    } catch (error) {
      console.error('Error saving conteggio:', error);
      alert('Errore durante il salvataggio: ' + error.message);
    }

    setSaving(false);
  };



  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <DollarSign className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Form Conteggio Cassa</h1>
        </div>
        <p className="text-[#9b9b9b]">Registra il conteggio della cassa</p>
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <NeumorphicCard className="p-4 bg-green-50 border-2 border-green-400">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800 font-medium">
              Conteggio salvato con successo! ✅
            </p>
          </div>
        </NeumorphicCard>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Nuovo Conteggio</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                <Store className="w-4 h-4" />
                Locale <span className="text-red-600">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {stores
                  .filter(store => {
                    if (currentUser?.user_type === 'admin' || currentUser?.user_type === 'manager') return true;
                    if (!currentUser?.assigned_stores || currentUser.assigned_stores.length === 0) return false;
                    return currentUser.assigned_stores.includes(store.id);
                  })
                  .map(store => (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => setSelectedStore(store.id)}
                      disabled={saving}
                      className={`px-4 py-3 rounded-xl font-medium transition-all ${
                        selectedStore === store.id
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                          : 'neumorphic-flat text-[#6b6b6b] hover:shadow-md'
                      }`}
                    >
                      {store.name}
                    </button>
                  ))
                }
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Conteggio Cassa (€) <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valoreConteggio}
                onChange={(e) => setValoreConteggio(e.target.value)}
                placeholder="es. 1250.50"
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none text-2xl font-bold"
                required
                disabled={saving}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                <User className="w-4 h-4" />
                Rilevato da
              </label>
              <div className="neumorphic-pressed px-4 py-3 rounded-xl">
                <p className="text-[#6b6b6b]">
                  {currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email || 'Caricamento...'}
                </p>
              </div>
            </div>

            <div className="neumorphic-pressed p-3 rounded-xl bg-blue-50">
              <p className="text-xs text-blue-800">
                ℹ️ La data e l'ora verranno registrate automaticamente al momento del salvataggio
              </p>
            </div>
          </div>
        </NeumorphicCard>

        {/* Submit Button */}
        <NeumorphicCard className="p-6">
          <NeumorphicButton
            type="submit"
            variant="primary"
            className="w-full py-4 text-lg font-bold flex items-center justify-center gap-3"
            disabled={saving || !selectedStore || !valoreConteggio}
          >
            {saving ? (
              <>
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Salvataggio in corso...
              </>
            ) : (
              <>
                <Save className="w-6 h-6" />
                Salva Conteggio
              </>
            )}
          </NeumorphicButton>
        </NeumorphicCard>
      </form>


    </div>
  );
}