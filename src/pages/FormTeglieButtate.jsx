import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Trash2,
  Save,
  Store,
  User,
  Calendar
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function FormTeglieButtate() {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const redirectTo = urlParams.get('redirect');
  const turnoId = urlParams.get('turno_id');
  const attivitaNome = urlParams.get('attivita');
  const preselectedStoreId = urlParams.get('store_id');
  
  const [selectedStore, setSelectedStore] = useState('');
  const [teglieRosse, setTeglieRosse] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userType, setUserType] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      setUserType(user.user_type);
      
      // Preselezione store da URL parameter
      if (preselectedStoreId) {
        setSelectedStore(preselectedStoreId);
      }
    };
    fetchUser();
  }, [preselectedStoreId]);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: teglie = [] } = useQuery({
    queryKey: ['teglie-buttate'],
    queryFn: () => base44.entities.TeglieButtate.list('-data_rilevazione', 50),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedStore) {
      alert('Seleziona un locale');
      return;
    }

    if (!teglieRosse) {
      alert('Inserisci il numero di teglie rosse buttate');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      const store = stores.find(s => s.id === selectedStore);
      const now = new Date().toISOString();

      await base44.entities.TeglieButtate.create({
        store_name: store.name,
        store_id: store.id,
        data_rilevazione: now,
        rilevato_da: currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email || 'N/A',
        teglie_rosse_buttate: teglieRosse ? parseInt(teglieRosse) : 0,
        teglie_bianche_buttate: 0
      });

      setSaveSuccess(true);
      
      queryClient.invalidateQueries({ queryKey: ['teglie-buttate'] });

      // Segna attività come completata se viene da un turno
      if (turnoId && attivitaNome) {
        try {
          await base44.entities.AttivitaCompletata.create({
            dipendente_id: currentUser.id,
            dipendente_nome: currentUser.nome_cognome || currentUser.full_name,
            turno_id: turnoId,
            turno_data: new Date().toISOString().split('T')[0],
            store_id: selectedStore,
            attivita_nome: decodeURIComponent(attivitaNome),
            form_page: 'FormTeglieButtate',
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
          setTeglieRosse('');
          setSelectedStore('');
        }
      }, 1500);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Errore durante il salvataggio: ' + error.message);
    }

    setSaving(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="mb-4">
        <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
          Form Teglie Buttate
        </h1>
        <p className="text-sm text-slate-500">Registra le teglie buttate</p>
      </div>

      {saveSuccess && (
        <NeumorphicCard className="p-4 bg-green-50 border-2 border-green-400">
          <div className="flex items-center gap-3">
            <Save className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800 font-medium">
              Rilevazione salvata con successo! ✅
            </p>
          </div>
        </NeumorphicCard>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <NeumorphicCard className="p-4 lg:p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Nuova Rilevazione</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
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
                          : 'neumorphic-flat text-slate-700 hover:shadow-md'
                      }`}
                    >
                      {store.name}
                    </button>
                  ))
                }
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Teglie Rosse Buttate <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={teglieRosse}
                onChange={(e) => setTeglieRosse(e.target.value)}
                placeholder="0"
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-2xl font-bold"
                disabled={saving}
                required
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
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-4 lg:p-6">
          <NeumorphicButton
            type="submit"
            variant="primary"
            className="w-full py-3 lg:py-4 text-base lg:text-lg font-bold flex items-center justify-center gap-3"
            disabled={saving || !selectedStore}
          >
            {saving ? (
              <>
                <div className="w-5 h-5 lg:w-6 lg:h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 lg:w-6 lg:h-6" />
                Salva Rilevazione
              </>
            )}
          </NeumorphicButton>
        </NeumorphicCard>
      </form>


    </div>
  );
}