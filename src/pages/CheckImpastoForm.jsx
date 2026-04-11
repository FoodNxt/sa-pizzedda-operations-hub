import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { ClipboardCheck, Store, Save, Loader2, User, Calendar, Trash2 } from "lucide-react";
import moment from "moment";

const PALLINE_PER_BARELLA = 6;

export default function CheckImpastoForm() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedStore, setSelectedStore] = useState("");
  const [inputMode, setInputMode] = useState("palline");
  const [pallineInput, setPallineInput] = useState("");
  const [barelleInput, setBarelleInput] = useState("");
  const [note, setNote] = useState("");
  const [filterStore, setFilterStore] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: checks = [], isLoading } = useQuery({
    queryKey: ["check-impasto"],
    queryFn: () => base44.entities.CheckImpasto.list("-data_check", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CheckImpasto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["check-impasto"] });
      setPallineInput("");
      setBarelleInput("");
      setNote("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CheckImpasto.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["check-impasto"] }),
  });

  const handlePallineChange = (val) => {
    setPallineInput(val);
    const num = parseFloat(val) || 0;
    setBarelleInput(num > 0 ? (num / PALLINE_PER_BARELLA).toFixed(1) : "");
  };

  const handleBarelleChange = (val) => {
    setBarelleInput(val);
    const num = parseFloat(val) || 0;
    setPallineInput(num > 0 ? Math.round(num * PALLINE_PER_BARELLA).toString() : "");
  };

  const handleSubmit = () => {
    const store = stores.find((s) => s.id === selectedStore);
    if (!store || !pallineInput) return;

    createMutation.mutate({
      store_id: store.id,
      store_name: store.name,
      palline_count: parseInt(pallineInput) || 0,
      barelle_count: parseFloat(barelleInput) || 0,
      data_check: new Date().toISOString(),
      rilevato_da: currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email || "Sconosciuto",
      note: note || undefined,
    });
  };

  // Pre-select store for store managers with assigned stores
  useEffect(() => {
    if (currentUser && stores.length > 0 && !selectedStore) {
      const assignedStores = currentUser.assigned_stores || [];
      if (assignedStores.length === 1) {
        const match = stores.find((s) => assignedStores.includes(s.name));
        if (match) setSelectedStore(match.id);
      }
    }
  }, [currentUser, stores, selectedStore]);

  const filteredChecks = filterStore
    ? checks.filter((c) => c.store_id === filterStore)
    : checks;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-slate-900">Check Impasto</h1>
        <p className="text-slate-500 text-sm mt-1">Registra il conteggio palline/barelle presenti</p>
      </div>

      {/* Form */}
      <NeumorphicCard className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              <Store className="w-4 h-4 inline mr-1" />
              Locale
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
            >
              <option value="">Seleziona locale...</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Inserisci come</label>
            <div className="flex gap-2">
              <button
                onClick={() => setInputMode("palline")}
                className={`flex-1 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  inputMode === "palline"
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                    : "neumorphic-flat text-slate-700"
                }`}
              >
                Palline
              </button>
              <button
                onClick={() => setInputMode("barelle")}
                className={`flex-1 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  inputMode === "barelle"
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                    : "neumorphic-flat text-slate-700"
                }`}
              >
                Barelle
              </button>
            </div>
          </div>

          {inputMode === "palline" ? (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">N° Palline</label>
              <input
                type="number"
                min="0"
                value={pallineInput}
                onChange={(e) => handlePallineChange(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                placeholder="es. 30"
              />
              {pallineInput && (
                <p className="text-xs text-slate-500 mt-1">
                  = {(parseFloat(pallineInput) / PALLINE_PER_BARELLA).toFixed(1)} barelle
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">N° Barelle</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={barelleInput}
                onChange={(e) => handleBarelleChange(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                placeholder="es. 5"
              />
              {barelleInput && (
                <p className="text-xs text-slate-500 mt-1">
                  = {Math.round(parseFloat(barelleInput) * PALLINE_PER_BARELLA)} palline
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Note (opzionale)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              placeholder="Note..."
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <NeumorphicButton
            onClick={handleSubmit}
            variant="primary"
            disabled={!selectedStore || !pallineInput || createMutation.isPending}
            className="flex items-center gap-2"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salva Check
          </NeumorphicButton>
          {saved && (
            <span className="text-green-600 text-sm font-medium">✓ Salvato!</span>
          )}
        </div>
      </NeumorphicCard>

      {/* Storico */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-xl font-bold text-slate-800">Storico Check</h2>
          <select
            value={filterStore}
            onChange={(e) => setFilterStore(e.target.value)}
            className="neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none text-sm"
          >
            <option value="">Tutti i locali</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filteredChecks.length === 0 ? (
          <p className="text-slate-500 text-center py-8">Nessun check effettuato</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 px-2 text-slate-700">Data/Ora</th>
                  <th className="text-left py-3 px-2 text-slate-700">Locale</th>
                  <th className="text-left py-3 px-2 text-slate-700">Operatore</th>
                  <th className="text-right py-3 px-2 text-slate-700">Palline</th>
                  <th className="text-right py-3 px-2 text-slate-700">Barelle</th>
                  <th className="text-left py-3 px-2 text-slate-700">Note</th>
                </tr>
              </thead>
              <tbody>
                {filteredChecks.map((check) => (
                  <tr key={check.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-2 text-slate-700">
                      {moment(check.data_check).format("DD/MM/YYYY HH:mm")}
                    </td>
                    <td className="py-3 px-2 font-medium text-slate-800">{check.store_name}</td>
                    <td className="py-3 px-2 text-slate-600">{check.rilevato_da}</td>
                    <td className="py-3 px-2 text-right font-bold text-blue-700">{check.palline_count}</td>
                    <td className="py-3 px-2 text-right font-bold text-green-700">{check.barelle_count}</td>
                    <td className="py-3 px-2 text-slate-500 text-xs">{check.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </NeumorphicCard>
    </div>
  );
}