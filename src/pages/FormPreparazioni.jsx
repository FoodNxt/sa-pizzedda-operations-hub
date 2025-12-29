import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Save,
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

export default function FormPreparazioni() {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const redirectTo = urlParams.get('redirect');
  const turnoId = urlParams.get('turno_id');
  const attivitaNome = urlParams.get('attivita');
  const preselectedStoreId = urlParams.get('store_id');
  
  const [selectedStore, setSelectedStore] = useState('');
  const [preparazioni, setPreparazioni] = useState([
    { tipo: '', peso: '' }
  ]);
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

  const { data: preparazioniList = [] } = useQuery({
    queryKey: ['preparazioni'],
    queryFn: () => base44.entities.Preparazioni.list('-data_rilevazione', 100),
  });

  const tipiPreparazione = [
    'Salsiccia',
    'Crema di Gorgonzola',
    'Crema di pecorino',
    'Patate'
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
      
      queryClient.invalidateQueries({ queryKey: ['preparazioni'] });

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
            form_page: 'FormPreparazioni',
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
          setPreparazioni([{ tipo: '', peso: '' }]);
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
          Form Preparazioni
        </h1>
        <p className="text-sm text-slate-500">Registra le preparazioni effettuate</p>
      </div>

      {saveSuccess && (
        <NeumorphicCard className="p-4 bg-green-50 border-2 border-green-400">
          <div className="flex items-center gap-3">
            <Save className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800 font-medium">
              Preparazioni salvate! ✅
            </p>
          </div>
        </NeumorphicCard>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <NeumorphicCard className="p-4 lg:p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Informazioni</h2>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                <Store className="w-4 h-4" />
                Locale <span className="text-red-600">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {stores
                  .filter(store => !currentUser?.assigned_stores || currentUser.assigned_stores.length === 0 || currentUser.assigned_stores.includes(store.id))
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
              <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                <User className="w-4 h-4" />
                Compilato da
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Preparazioni</h3>
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
              <div key={index} className="neumorphic-pressed p-3 lg:p-4 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-1">
                    <label className="text-xs lg:text-sm font-medium text-slate-700 mb-2 block">
                      Preparazione
                    </label>
                    <select
                      value={prep.tipo}
                      onChange={(e) => updatePreparazione(index, 'tipo', e.target.value)}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                      disabled={saving}
                    >
                      <option value="">Seleziona...</option>
                      {tipiPreparazione.map(tipo => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs lg:text-sm font-medium text-slate-700 mb-2 block">
                      Peso (grammi)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={prep.peso}
                      onChange={(e) => updatePreparazione(index, 'peso', e.target.value)}
                      placeholder="500"
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                      disabled={saving}
                    />
                  </div>

                  <div className="flex items-end">
                    {preparazioni.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePreparazione(index)}
                        className="nav-button p-3 rounded-xl hover:bg-red-50 transition-colors w-full"
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
                Salva Preparazioni
              </>
            )}
          </NeumorphicButton>
        </NeumorphicCard>
      </form>

      {userType !== 'dipendente' && (
        <NeumorphicCard className="p-4 lg:p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Ultime Preparazioni</h2>
          
          {preparazioniList.length > 0 ? (
            <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b-2 border-blue-600">
                    <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Data</th>
                    <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Locale</th>
                    <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Preparazione</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Peso (g)</th>
                    <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Rilevato da</th>
                  </tr>
                </thead>
                <tbody>
                  {preparazioniList.map((p) => (
                    <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="p-2 lg:p-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700 text-sm">
                            {format(new Date(p.data_rilevazione), 'dd/MM/yyyy HH:mm', { locale: it })}
                          </span>
                        </div>
                      </td>
                      <td className="p-2 lg:p-3 text-slate-700 text-sm">{p.store_name}</td>
                      <td className="p-2 lg:p-3 text-slate-700 font-medium text-sm">{p.tipo_preparazione}</td>
                      <td className="p-2 lg:p-3 text-right text-blue-600 font-bold text-sm">{p.peso_grammi}g</td>
                      <td className="p-2 lg:p-3 text-slate-700 text-sm">{p.rilevato_da}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-300 opacity-50 mx-auto mb-4" />
              <p className="text-slate-500">Nessuna preparazione</p>
            </div>
          )}
        </NeumorphicCard>
      )}
    </div>
  );
}