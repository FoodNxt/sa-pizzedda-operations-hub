import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Save, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StorageAreaEditor from "../components/inventory/StorageAreaEditor";

export default function PosizioniProdotti() {
  const queryClient = useQueryClient();
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [saving, setSaving] = useState(false);
  const [localAreas, setLocalAreas] = useState([]);
  const [localBg, setLocalBg] = useState("");

  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: mappe = [], isLoading } = useQuery({
    queryKey: ["mappe-locali"],
    queryFn: () => base44.entities.MappaLocale.list(),
  });

  const currentMappa = mappe.find((m) => m.store_id === selectedStoreId);

  const handleStoreChange = (storeId) => {
    setSelectedStoreId(storeId);
    const mappa = mappe.find((m) => m.store_id === storeId);
    setLocalAreas(mappa?.storage_areas || []);
    setLocalBg(mappa?.background_image || "");
  };

  const handleUploadBg = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setLocalBg(file_url);
  };

  const handleSave = async () => {
    if (!selectedStoreId) return;
    setSaving(true);
    const store = stores.find((s) => s.id === selectedStoreId);
    const data = {
      store_id: selectedStoreId,
      store_name: store?.name || "",
      background_image: localBg,
      storage_areas: localAreas,
    };
    if (currentMappa) {
      await base44.entities.MappaLocale.update(currentMappa.id, data);
    } else {
      await base44.entities.MappaLocale.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ["mappe-locali"] });
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("Inventory")}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">📍 Posizione Prodotti</h1>
            <p className="text-sm text-slate-500">Gestisci le aree di stoccaggio sulla planimetria</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedStoreId} onValueChange={handleStoreChange}>
              <SelectTrigger className="w-60">
                <SelectValue placeholder="Seleziona locale..." />
              </SelectTrigger>
              <SelectContent>
                {stores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedStoreId && (
              <>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadBg} />
                  <Button variant="outline" size="sm" asChild>
                    <span className="gap-1"><Upload className="w-4 h-4" /> Carica planimetria</span>
                  </Button>
                </label>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salva
                </Button>
              </>
            )}
          </div>

          {selectedStoreId ? (
            <StorageAreaEditor
              areas={localAreas}
              onChange={setLocalAreas}
              backgroundImage={localBg}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              Seleziona un locale per iniziare
            </div>
          )}
        </div>
      </div>
    </div>
  );
}