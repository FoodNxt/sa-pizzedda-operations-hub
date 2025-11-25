import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Save,
  CheckCircle,
  Store,
  User,
  Calendar,
  Plus,
  X
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Preparazioni() {
  const [selectedStore, setSelectedStore] = useState('');
  const [preparazioni, setPreparazioni] = useState([
    { tipo: '', peso: '' }
  ]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userType, setUserType] = useState(null); // Added userType state

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

  const { data: preparazioniList = [] } = useQuery({
    queryKey: ['preparazioni'],
    queryFn: () => base44.entities.Preparazioni.list('-data_rilevazione', 100),
  });

  const tipiPreparazione = [
    'Salsiccia',
    'Patate',
    'Zucca'
  ];

  const addPreparazione = () => {
    setPreparazioni([...preparazioni, { tipo: '', peso: '' }]);
  };

  const removePreparazione = (index) => {
    setPreparazioni(preparazioni.filter((_, i) => i !== index));
  };

  const updatePreparazione = (index, field, value) => {
    const updated = [...preparazioni];
    updated[index][field] = value;
    setPreparazioni(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedStore) {
      alert('Seleziona un locale');
      return;
    }

    const validPreparazioni = preparazioni.filter(p => p.tipo && p.peso);
    if (validPreparazioni.length === 0) {
      alert('Inserisci almeno una preparazione completa');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      const store = stores.find(s => s.id === selectedStore);
      const now = new Date().toISOString();

      const records = validPreparazioni.map(prep => ({
        store_name: store.name,
        store_id: store.id,
        data_rilevazione: now,
        rilevato_da: currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email || 'N/A',
        tipo_preparazione: prep.tipo,
        peso_grammi: parseFloat(prep.peso)
      }));

      await base44.entities.Preparazioni.bulkCreate(records);

      setSaveSuccess(true);
      setPreparazioni([{ tipo: '', peso: '' }]);
      setSelectedStore('');
      
      queryClient.invalidateQueries({ queryKey: ['preparazioni'] });

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Errore durante il salvataggio: ' + error.message);
    }

    setSaving(false);
  };

  const totalOggi = preparazioniList
    .filter(p => {
      const date = new Date(p.data_rilevazione);
      const today = new Date();
      return date.toDateString() === today.toDateString();
    }).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Package className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Preparazioni</h1>
        </div>
        <p className="text-[#9b9b9b]">Registra le preparazioni effettuate</p>
      </div>

      {saveSuccess && (
        <NeumorphicCard className="p-4 bg-green-50 border-2 border-green-400">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800 font-medium">
              Preparazioni salvate con successo! ✅
            </p>
          </div>
        </NeumorphicCard>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Nuove Preparazioni</h2>
          
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
                    if (!currentUser?.assigned_stores || currentUser.assigned_stores.length === 0) return true;
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
                }
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

            <div className="neumorphic-flat p-5 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#6b6b6b]">Elenco Preparazioni</h3>
                <NeumorphicButton
                  type="button"
                  onClick={addPreparazione}
                  className="flex items-center gap-2"
                  disabled={saving}
                >
                  <Plus className="w-4 h-4" />
                  Aggiungi
                </NeumorphicButton>
              </div>

              <div className="space-y-3">
                {preparazioni.map((prep, index) => (
                  <div key={index} className="neumorphic-pressed p-4 rounded-xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                          Preparazione
                        </label>
                        <select
                          value={prep.tipo}
                          onChange={(e) => updatePreparazione(index, 'tipo', e.target.value)}
                          className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                          disabled={saving}
                        >
                          <option value="">Seleziona...</option>
                          {tipiPreparazione.map(tipo => (
                            <option key={tipo} value={tipo}>{tipo}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                          Peso (grammi)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={prep.peso}
                          onChange={(e) => updatePreparazione(index, 'peso', e.target.value)}
                          placeholder="es. 500"
                          className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                          disabled={saving}
                        />
                      </div>

                      <div className="flex items-end">
                        {preparazioni.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePreparazione(index)}
                            className="neumorphic-flat p-3 rounded-xl hover:bg-red-50 transition-colors w-full"
                            disabled={saving}
                          >
                            <X className="w-5 h-5 text-red-600 mx-auto" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
                Salva Preparazioni
              </>
            )}
          </NeumorphicButton>
        </NeumorphicCard>
      </form>

      {/* Ultime Preparazioni - HIDDEN for dipendente */}
      {userType !== 'dipendente' && (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Ultime Preparazioni</h2>
          
          {preparazioniList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#8b7355]">
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Data e Ora</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Locale</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Preparazione</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Peso (g)</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Rilevato da</th>
                  </tr>
                </thead>
                <tbody>
                  {preparazioniList.map((p) => (
                    <tr key={p.id} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#9b9b9b]" />
                          <span className="text-[#6b6b6b]">
                            {format(new Date(p.data_rilevazione), 'dd/MM/yyyy HH:mm', { locale: it })}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-[#6b6b6b]">{p.store_name}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-[#6b6b6b] font-medium">{p.tipo_preparazione}</span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-[#8b7355] font-bold text-lg">{p.peso_grammi}g</span>
                      </td>
                      <td className="p-3">
                        <span className="text-[#6b6b6b] text-sm">{p.rilevato_da}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-[#9b9b9b] opacity-50 mx-auto mb-4" />
              <p className="text-[#9b9b9b]">Nessuna preparazione registrata</p>
            </div>
          )}
        </NeumorphicCard>
      )}
    </div>
  );
}