import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const [selectedStore, setSelectedStore] = useState('');
  const [teglieRosse, setTeglieRosse] = useState('');
  const [teglieBianche, setTeglieBianche] = useState('');
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
    };
    fetchUser();
  }, []);

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

    if (!teglieRosse && !teglieBianche) {
      alert('Inserisci almeno un valore');
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
        teglie_bianche_buttate: teglieBianche ? parseInt(teglieBianche) : 0
      });

      setSaveSuccess(true);
      setTeglieRosse('');
      setTeglieBianche('');
      setSelectedStore('');
      
      queryClient.invalidateQueries({ queryKey: ['teglie-buttate'] });

      setTimeout(() => setSaveSuccess(false), 3000);
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
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                required
                disabled={saving}
              >
                <option value="">Seleziona locale...</option>
                {stores
                  .filter(store => !currentUser?.assigned_stores || currentUser.assigned_stores.length === 0 || currentUser.assigned_stores.includes(store.id))
                  .map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))
                }
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Teglie Rosse Buttate
                </label>
                <input
                  type="number"
                  min="0"
                  value={teglieRosse}
                  onChange={(e) => setTeglieRosse(e.target.value)}
                  placeholder="0"
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-2xl font-bold"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Teglie Bianche Buttate
                </label>
                <input
                  type="number"
                  min="0"
                  value={teglieBianche}
                  onChange={(e) => setTeglieBianche(e.target.value)}
                  placeholder="0"
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-2xl font-bold"
                  disabled={saving}
                />
              </div>
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