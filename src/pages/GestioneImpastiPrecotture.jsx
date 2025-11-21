import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import { ChefHat, Plus, Edit, Save, X, Calendar } from "lucide-react";

const giorni = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export default function GestioneImpastiPrecotture() {
  const [selectedStore, setSelectedStore] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [editData, setEditData] = useState({});
  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: impasti = [] } = useQuery({
    queryKey: ['gestione-impasti'],
    queryFn: () => base44.entities.GestioneImpasti.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.GestioneImpasti.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestione-impasti'] });
      setEditingRow(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GestioneImpasti.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestione-impasti'] });
      setEditingRow(null);
    },
  });

  const filteredImpasti = useMemo(() => {
    if (!selectedStore) return [];
    return impasti.filter(i => i.store_id === selectedStore || i.store_name === selectedStore);
  }, [impasti, selectedStore]);

  const getDataForDay = (giorno) => {
    return filteredImpasti.find(i => i.giorno_settimana === giorno);
  };

  const getTotaleGiornaliero = (data) => {
    if (!data) return 0;
    return (data.pranzo_bianche || 0) + (data.pranzo_rosse || 0) +
           (data.pomeriggio_bianche || 0) + (data.pomeriggio_rosse || 0) +
           (data.cena_bianche || 0) + (data.cena_rosse || 0);
  };

  const getImpastoPer3Giorni = (giornoIndex) => {
    let totale = 0;
    for (let i = 0; i < 3; i++) {
      const idx = (giornoIndex + i) % 7;
      const data = getDataForDay(giorni[idx]);
      totale += getTotaleGiornaliero(data);
    }
    return totale;
  };

  const handleEdit = (giorno, data) => {
    setEditingRow(giorno);
    setEditData(data || {
      pranzo_bianche: 0,
      pranzo_rosse: 0,
      pomeriggio_bianche: 0,
      pomeriggio_rosse: 0,
      cena_bianche: 0,
      cena_rosse: 0
    });
  };

  const handleSave = async (giorno) => {
    const store = stores.find(s => s.id === selectedStore);
    const existing = getDataForDay(giorno);

    const payload = {
      store_name: store?.name,
      store_id: selectedStore,
      giorno_settimana: giorno,
      ...editData
    };

    if (existing) {
      await updateMutation.mutateAsync({ id: existing.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  return (
    <ProtectedPage pageName="GestioneImpastiPrecotture" requiredUserTypes={['admin']}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              Gestione Impasti/Precotture
            </h1>
            <p className="text-slate-500 mt-1">Configura precotture per negozio e turno</p>
          </div>
        </div>

        <NeumorphicCard className="p-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Seleziona Negozio
          </label>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
          >
            <option value="">-- Seleziona Negozio --</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </NeumorphicCard>

        {selectedStore && (
          <>
            <NeumorphicCard className="p-6 bg-blue-50">
              <h3 className="text-lg font-bold text-blue-800 mb-3">ℹ️ Come funziona la colonna "Impasto 3 Giorni"</h3>
              <div className="space-y-2 text-sm text-blue-900">
                <p>
                  <strong>Calcolo:</strong> Per ogni giorno, viene calcolato il totale delle precotture necessarie per i successivi 3 giorni (giorno corrente + 2 giorni futuri).
                </p>
                <p>
                  <strong>Esempio per Lunedì:</strong> Somma delle precotture di Lunedì + Martedì + Mercoledì.
                </p>
                <p>
                  <strong>Utilizzo:</strong> Questo dato indica quante palline di impasto devono essere preparate in anticipo per coprire la produzione dei prossimi 3 giorni. L'impasto viene fatto maturare per 72 ore prima dell'uso.
                </p>
                <p className="mt-3 p-3 bg-white rounded-lg">
                  <strong>💡 Nota:</strong> Se oggi è Lunedì e la colonna mostra "120", significa che devi preparare 120 palline di impasto che saranno pronte da usare Giovedì (dopo 72 ore di maturazione).
                </p>
              </div>
            </NeumorphicCard>

            <NeumorphicCard className="p-6 overflow-x-auto">
              <div className="flex items-center gap-2 mb-4">
                <ChefHat className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-slate-800">Pianificazione Settimanale</h2>
              </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-3 px-2 font-semibold text-slate-700">Giorno</th>
                    <th className="text-center py-3 px-2 font-semibold text-slate-700 bg-blue-50">Pranzo<br/>Bianche</th>
                    <th className="text-center py-3 px-2 font-semibold text-slate-700 bg-red-50">Pranzo<br/>Rosse</th>
                    <th className="text-center py-3 px-2 font-semibold text-slate-700 bg-blue-50">Pomeriggio<br/>Bianche</th>
                    <th className="text-center py-3 px-2 font-semibold text-slate-700 bg-red-50">Pomeriggio<br/>Rosse</th>
                    <th className="text-center py-3 px-2 font-semibold text-slate-700 bg-blue-50">Cena<br/>Bianche</th>
                    <th className="text-center py-3 px-2 font-semibold text-slate-700 bg-red-50">Cena<br/>Rosse</th>
                    <th className="text-center py-3 px-2 font-semibold text-slate-700 bg-green-50">Totale<br/>Giornata</th>
                    <th className="text-center py-3 px-2 font-semibold text-slate-700 bg-yellow-50">Impasto<br/>3 Giorni</th>
                    <th className="text-center py-3 px-2">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {giorni.map((giorno, idx) => {
                    const data = getDataForDay(giorno);
                    const isEditing = editingRow === giorno;
                    const totaleGiorno = getTotaleGiornaliero(isEditing ? editData : data);
                    const impasto3Giorni = getImpastoPer3Giorni(idx);

                    return (
                      <tr key={giorno} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-2 font-medium text-slate-700">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {giorno}
                          </div>
                        </td>
                        {isEditing ? (
                          <>
                            <td className="text-center py-2 px-1">
                              <input
                                type="number"
                                min="0"
                                value={editData.pranzo_bianche || 0}
                                onChange={(e) => setEditData({...editData, pranzo_bianche: parseInt(e.target.value) || 0})}
                                className="w-16 text-center neumorphic-pressed px-2 py-1 rounded-lg"
                              />
                            </td>
                            <td className="text-center py-2 px-1">
                              <input
                                type="number"
                                min="0"
                                value={editData.pranzo_rosse || 0}
                                onChange={(e) => setEditData({...editData, pranzo_rosse: parseInt(e.target.value) || 0})}
                                className="w-16 text-center neumorphic-pressed px-2 py-1 rounded-lg"
                              />
                            </td>
                            <td className="text-center py-2 px-1">
                              <input
                                type="number"
                                min="0"
                                value={editData.pomeriggio_bianche || 0}
                                onChange={(e) => setEditData({...editData, pomeriggio_bianche: parseInt(e.target.value) || 0})}
                                className="w-16 text-center neumorphic-pressed px-2 py-1 rounded-lg"
                              />
                            </td>
                            <td className="text-center py-2 px-1">
                              <input
                                type="number"
                                min="0"
                                value={editData.pomeriggio_rosse || 0}
                                onChange={(e) => setEditData({...editData, pomeriggio_rosse: parseInt(e.target.value) || 0})}
                                className="w-16 text-center neumorphic-pressed px-2 py-1 rounded-lg"
                              />
                            </td>
                            <td className="text-center py-2 px-1">
                              <input
                                type="number"
                                min="0"
                                value={editData.cena_bianche || 0}
                                onChange={(e) => setEditData({...editData, cena_bianche: parseInt(e.target.value) || 0})}
                                className="w-16 text-center neumorphic-pressed px-2 py-1 rounded-lg"
                              />
                            </td>
                            <td className="text-center py-2 px-1">
                              <input
                                type="number"
                                min="0"
                                value={editData.cena_rosse || 0}
                                onChange={(e) => setEditData({...editData, cena_rosse: parseInt(e.target.value) || 0})}
                                className="w-16 text-center neumorphic-pressed px-2 py-1 rounded-lg"
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="text-center py-2 px-2 bg-blue-50">{data?.pranzo_bianche || 0}</td>
                            <td className="text-center py-2 px-2 bg-red-50">{data?.pranzo_rosse || 0}</td>
                            <td className="text-center py-2 px-2 bg-blue-50">{data?.pomeriggio_bianche || 0}</td>
                            <td className="text-center py-2 px-2 bg-red-50">{data?.pomeriggio_rosse || 0}</td>
                            <td className="text-center py-2 px-2 bg-blue-50">{data?.cena_bianche || 0}</td>
                            <td className="text-center py-2 px-2 bg-red-50">{data?.cena_rosse || 0}</td>
                          </>
                        )}
                        <td className="text-center py-2 px-2 font-bold text-green-700 bg-green-50">{totaleGiorno}</td>
                        <td className="text-center py-2 px-2 font-bold text-yellow-700 bg-yellow-50">{impasto3Giorni}</td>
                        <td className="text-center py-2 px-2">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleSave(giorno)}
                                className="nav-button p-2 rounded-lg hover:bg-green-50"
                                title="Salva"
                              >
                                <Save className="w-4 h-4 text-green-600" />
                              </button>
                              <button
                                onClick={() => setEditingRow(null)}
                                className="nav-button p-2 rounded-lg hover:bg-red-50"
                                title="Annulla"
                              >
                                <X className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEdit(giorno, data)}
                              className="nav-button p-2 rounded-lg hover:bg-blue-50"
                              title="Modifica"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </NeumorphicCard>
          </>
        )}
      </div>
    </ProtectedPage>
  );
}