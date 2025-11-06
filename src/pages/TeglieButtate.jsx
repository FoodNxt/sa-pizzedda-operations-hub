import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Trash2,
  Save,
  CheckCircle,
  Store,
  User,
  Calendar
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function TeglieButtate() {
  const [selectedStore, setSelectedStore] = useState('');
  const [teglieRosse, setTeglieRosse] = useState('');
  const [teglieBianche, setTeglieBianche] = useState('');
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

  const totalRosseOggi = teglie
    .filter(t => {
      const date = new Date(t.data_rilevazione);
      const today = new Date();
      return date.toDateString() === today.toDateString();
    })
    .reduce((sum, t) => sum + (t.teglie_rosse_buttate || 0), 0);

  const totalBiancheOggi = teglie
    .filter(t => {
      const date = new Date(t.data_rilevazione);
      const today = new Date();
      return date.toDateString() === today.toDateString();
    })
    .reduce((sum, t) => sum + (t.teglie_bianche_buttate || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Trash2 className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Teglie Buttate</h1>
        </div>
        <p className="text-[#9b9b9b]">Registra le teglie buttate</p>
      </div>

      {saveSuccess && (
        <NeumorphicCard className="p-4 bg-green-50 border-2 border-green-400">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800 font-medium">
              Rilevazione salvata con successo! ✅
            </p>
          </div>
        </NeumorphicCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-red-100">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-3xl font-bold text-red-600 mb-1">
            {totalRosseOggi}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Teglie Rosse Oggi</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-gray-100">
            <Trash2 className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-3xl font-bold text-gray-600 mb-1">
            {totalBiancheOggi}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Teglie Bianche Oggi</p>
        </NeumorphicCard>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Nuova Rilevazione</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                <Store className="w-4 h-4" />
                Locale <span className="text-red-600">*</span>
              </label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                required
                disabled={saving}
              >
                <option value="">Seleziona locale...</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                  Teglie Rosse Buttate
                </label>
                <input
                  type="number"
                  min="0"
                  value={teglieRosse}
                  onChange={(e) => setTeglieRosse(e.target.value)}
                  placeholder="0"
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none text-2xl font-bold"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                  Teglie Bianche Buttate
                </label>
                <input
                  type="number"
                  min="0"
                  value={teglieBianche}
                  onChange={(e) => setTeglieBianche(e.target.value)}
                  placeholder="0"
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none text-2xl font-bold"
                  disabled={saving}
                />
              </div>
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

        <NeumorphicCard className="p-6">
          <NeumorphicButton
            type="submit"
            variant="primary"
            className="w-full py-4 text-lg font-bold flex items-center justify-center gap-3"
            disabled={saving || !selectedStore}
          >
            {saving ? (
              <>
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="w-6 h-6" />
                Salva Rilevazione
              </>
            )}
          </NeumorphicButton>
        </NeumorphicCard>
      </form>

      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Ultime Rilevazioni</h2>
        
        {teglie.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#8b7355]">
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Data e Ora</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Locale</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Rilevato da</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Rosse</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Bianche</th>
                </tr>
              </thead>
              <tbody>
                {teglie.map((t) => (
                  <tr key={t.id} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#9b9b9b]" />
                        <span className="text-[#6b6b6b]">
                          {format(new Date(t.data_rilevazione), 'dd/MM/yyyy HH:mm', { locale: it })}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-[#6b6b6b]">{t.store_name}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-[#6b6b6b] text-sm">{t.rilevato_da}</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-red-600 font-bold text-lg">{t.teglie_rosse_buttate}</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-gray-600 font-bold text-lg">{t.teglie_bianche_buttate}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Trash2 className="w-16 h-16 text-[#9b9b9b] opacity-50 mx-auto mb-4" />
            <p className="text-[#9b9b9b]">Nessuna rilevazione registrata</p>
          </div>
        )}
      </NeumorphicCard>
    </div>
  );
}