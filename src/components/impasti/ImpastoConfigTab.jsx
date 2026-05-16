import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";
import { Plus, Save, Trash2, Calendar, Store, Info, Edit, X } from "lucide-react";
import moment from "moment";

export default function ImpastoConfigTab() {
  const queryClient = useQueryClient();
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [editingExtra, setEditingExtra] = useState(null);
  const [extraForm, setExtraForm] = useState({
    store_id: "",
    data: "",
    palline_extra: "",
    ignora_limite_max: false,
    note: ""
  });

  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: impastiConfig = [] } = useQuery({
    queryKey: ["impasti-config"],
    queryFn: () => base44.entities.ImpastiConfig.list()
  });

  const { data: extras = [] } = useQuery({
    queryKey: ["impasto-extra"],
    queryFn: () => base44.entities.ImpastoExtra.list("-data", 200)
  });

  // --- Buffer Logic ---
  const globalConfig = impastiConfig.find(c => c.is_active && !c.store_id);
  const globalBuffer = globalConfig?.buffer_palline || 0;

  const getStoreBuffer = (storeId) => {
    const storeConfig = impastiConfig.find(c => c.is_active && c.store_id === storeId);
    return storeConfig?.buffer_palline ?? null; // null = usa globale
  };

  const [bufferForm, setBufferForm] = useState({ store_id: "", buffer: "" });
  const [editingBufferStoreId, setEditingBufferStoreId] = useState(null);

  const saveGlobalBufferMutation = useMutation({
    mutationFn: async (buffer) => {
      if (globalConfig) {
        return await base44.entities.ImpastiConfig.update(globalConfig.id, { buffer_palline: buffer });
      } else {
        return await base44.entities.ImpastiConfig.create({ buffer_palline: buffer, is_active: true });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["impasti-config"] })
  });

  const saveStoreBufferMutation = useMutation({
    mutationFn: async ({ storeId, buffer }) => {
      const existing = impastiConfig.find(c => c.is_active && c.store_id === storeId);
      if (existing) {
        return await base44.entities.ImpastiConfig.update(existing.id, { buffer_palline: buffer });
      } else {
        return await base44.entities.ImpastiConfig.create({
          store_id: storeId,
          buffer_palline: buffer,
          is_active: true,
          impasto_minimo: globalConfig?.impasto_minimo || 0,
          impasto_massimo: globalConfig?.impasto_massimo || 100
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["impasti-config"] });
      setEditingBufferStoreId(null);
      setBufferForm({ store_id: "", buffer: "" });
    }
  });

  // --- Extras Logic ---
  const futureExtras = extras.filter(e => e.data >= moment().format("YYYY-MM-DD"));
  const pastExtras = extras.filter(e => e.data < moment().format("YYYY-MM-DD"));

  const createExtraMutation = useMutation({
    mutationFn: (data) => base44.entities.ImpastoExtra.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["impasto-extra"] });
      resetExtraForm();
    }
  });

  const updateExtraMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ImpastoExtra.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["impasto-extra"] });
      resetExtraForm();
    }
  });

  const deleteExtraMutation = useMutation({
    mutationFn: (id) => base44.entities.ImpastoExtra.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["impasto-extra"] })
  });

  const resetExtraForm = () => {
    setExtraForm({ store_id: "", data: "", palline_extra: "", ignora_limite_max: false, note: "" });
    setEditingExtra(null);
    setShowExtraForm(false);
  };

  const handleSaveExtra = () => {
    const store = stores.find(s => s.id === extraForm.store_id);
    const data = {
      store_id: extraForm.store_id,
      store_name: store?.name || "",
      data: extraForm.data,
      palline_extra: parseInt(extraForm.palline_extra) || 0,
      ignora_limite_max: extraForm.ignora_limite_max,
      note: extraForm.note
    };
    if (editingExtra) {
      updateExtraMutation.mutate({ id: editingExtra.id, data });
    } else {
      createExtraMutation.mutate(data);
    }
  };

  const handleEditExtra = (extra) => {
    setEditingExtra(extra);
    setExtraForm({
      store_id: extra.store_id,
      data: extra.data,
      palline_extra: extra.palline_extra,
      ignora_limite_max: extra.ignora_limite_max || false,
      note: extra.note || ""
    });
    setShowExtraForm(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. Buffer Palline */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Buffer Palline Giornaliero</h2>
        <p className="text-sm text-slate-500 mb-4">
          Palline extra aggiunte ogni giorno al fabbisogno precotture nel calcolo impasto.
          Imposta un valore globale (default per tutti i locali) e override per singolo store.
        </p>

        {/* Global Buffer */}
        <div className="neumorphic-pressed p-4 rounded-xl mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-700">Buffer globale (default)</p>
              <p className="text-xs text-slate-500">Applicato a tutti i locali senza override specifico</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={globalBuffer}
                onChange={(e) => saveGlobalBufferMutation.mutate(parseInt(e.target.value) || 0)}
                className="w-20 neumorphic-flat px-3 py-2 rounded-lg outline-none text-center font-bold"
              />
              <span className="text-sm text-slate-500">palline/giorno</span>
            </div>
          </div>
        </div>

        {/* Per-store Buffers */}
        <p className="text-sm font-medium text-slate-600 mb-2">Override per store</p>
        <div className="space-y-2">
          {stores.map(store => {
            const storeBuffer = getStoreBuffer(store.id);
            const isEditing = editingBufferStoreId === store.id;

            return (
              <div key={store.id} className="neumorphic-flat p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-700">{store.name}</span>
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={bufferForm.buffer}
                      onChange={(e) => setBufferForm({ ...bufferForm, buffer: e.target.value })}
                      className="w-20 neumorphic-pressed px-3 py-1.5 rounded-lg outline-none text-center font-bold text-sm"
                      autoFocus
                    />
                    <NeumorphicButton
                      onClick={() => saveStoreBufferMutation.mutate({ storeId: store.id, buffer: parseInt(bufferForm.buffer) || 0 })}
                      variant="primary"
                      className="text-xs px-3 py-1.5"
                    >
                      <Save className="w-3 h-3" />
                    </NeumorphicButton>
                    <button onClick={() => setEditingBufferStoreId(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                      <X className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${storeBuffer !== null ? "text-blue-600" : "text-slate-400"}`}>
                      {storeBuffer !== null ? `${storeBuffer} palline/giorno` : `${globalBuffer} (globale)`}
                    </span>
                    <button
                      onClick={() => { setEditingBufferStoreId(store.id); setBufferForm({ store_id: store.id, buffer: storeBuffer !== null ? storeBuffer : globalBuffer }); }}
                      className="p-1.5 rounded-lg hover:bg-blue-50"
                    >
                      <Edit className="w-3.5 h-3.5 text-blue-600" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-xl">
          <p className="text-xs text-blue-800 flex items-start gap-1.5">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Il buffer viene sommato al fabbisogno di ciascuno dei 3 giorni nel calcolo impasto. Es. buffer=5 → +15 palline sul totale 3 giorni.</span>
          </p>
        </div>
      </NeumorphicCard>

      {/* 2. Extra per data specifica */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Quantità Extra per Data</h2>
            <p className="text-sm text-slate-500">Imposta palline aggiuntive per store + data specifica (es. eventi, feste)</p>
          </div>
          <NeumorphicButton onClick={() => setShowExtraForm(true)} variant="primary" className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Aggiungi
          </NeumorphicButton>
        </div>

        {/* Form */}
        {showExtraForm && (
          <div className="neumorphic-pressed p-4 rounded-xl mb-4">
            <h3 className="font-bold text-slate-700 mb-3">{editingExtra ? "Modifica Extra" : "Nuova Quantità Extra"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Store</label>
                <select
                  value={extraForm.store_id}
                  onChange={(e) => setExtraForm({ ...extraForm, store_id: e.target.value })}
                  className="w-full neumorphic-flat px-3 py-2 rounded-lg outline-none"
                >
                  <option value="">Seleziona store...</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Data</label>
                <input
                  type="date"
                  value={extraForm.data}
                  onChange={(e) => setExtraForm({ ...extraForm, data: e.target.value })}
                  className="w-full neumorphic-flat px-3 py-2 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Palline Extra</label>
                <input
                  type="number"
                  min="1"
                  value={extraForm.palline_extra}
                  onChange={(e) => setExtraForm({ ...extraForm, palline_extra: e.target.value })}
                  className="w-full neumorphic-flat px-3 py-2 rounded-lg outline-none"
                  placeholder="es. 10"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Note</label>
                <input
                  type="text"
                  value={extraForm.note}
                  onChange={(e) => setExtraForm({ ...extraForm, note: e.target.value })}
                  className="w-full neumorphic-flat px-3 py-2 rounded-lg outline-none"
                  placeholder="es. Evento speciale"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={extraForm.ignora_limite_max}
                  onChange={(e) => setExtraForm({ ...extraForm, ignora_limite_max: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-slate-700 font-medium">Ignora limite massimo impasto</span>
              </label>
            </div>
            <div className="flex gap-2 mt-3">
              <NeumorphicButton onClick={resetExtraForm}>Annulla</NeumorphicButton>
              <NeumorphicButton
                onClick={handleSaveExtra}
                variant="primary"
                disabled={!extraForm.store_id || !extraForm.data || !extraForm.palline_extra}
              >
                <Save className="w-4 h-4 inline mr-1" /> Salva
              </NeumorphicButton>
            </div>
          </div>
        )}

        {/* Futuri */}
        {futureExtras.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-green-700 mb-2">Prossimi / Oggi</p>
            <div className="space-y-2">
              {futureExtras.sort((a, b) => a.data.localeCompare(b.data)).map(extra => (
                <div key={extra.id} className="neumorphic-flat p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <div>
                      <span className="font-medium text-slate-800">{moment(extra.data).format("DD/MM/YYYY")}</span>
                      <span className="text-slate-400 mx-2">·</span>
                      <span className="text-slate-600">{extra.store_name}</span>
                      {extra.note && <span className="text-xs text-slate-400 ml-2">({extra.note})</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-green-700">+{extra.palline_extra} palline</span>
                    {extra.ignora_limite_max && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">No max</span>
                    )}
                    <button onClick={() => handleEditExtra(extra)} className="p-1.5 rounded-lg hover:bg-blue-50">
                      <Edit className="w-3.5 h-3.5 text-blue-600" />
                    </button>
                    <button onClick={() => { if (confirm("Eliminare?")) deleteExtraMutation.mutate(extra.id); }} className="p-1.5 rounded-lg hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Passati */}
        {pastExtras.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-400 mb-2">Passati</p>
            <div className="space-y-1">
              {pastExtras.slice(0, 10).map(extra => (
                <div key={extra.id} className="neumorphic-flat p-2.5 rounded-xl flex items-center justify-between opacity-60">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm text-slate-600">{moment(extra.data).format("DD/MM/YYYY")}</span>
                    <span className="text-sm text-slate-500">{extra.store_name}</span>
                    {extra.note && <span className="text-xs text-slate-400">({extra.note})</span>}
                  </div>
                  <span className="text-sm font-medium text-slate-500">+{extra.palline_extra}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {futureExtras.length === 0 && pastExtras.length === 0 && (
          <p className="text-slate-500 text-center py-8">Nessuna quantità extra configurata</p>
        )}

        <div className="mt-4 p-3 bg-blue-50 rounded-xl">
          <p className="text-xs text-blue-800 flex items-start gap-1.5">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Le palline extra vengono aggiunte all'impasto suggerito solo quando il calcolo viene fatto nel giorno specifico indicato. Es. se imposti +25 per il 25 aprile, il 25 aprile l'impasto suggerito sarà il calcolo standard + 25 palline. Se "Ignora limite massimo" è attivo, il limite max da Impostazioni non viene applicato.</span>
          </p>
        </div>
      </NeumorphicCard>
    </div>
  );
}