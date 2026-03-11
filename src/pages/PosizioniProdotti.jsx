import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Upload, Save, Trash2, X, GripVertical, Loader2 } from "lucide-react";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import StorageAreaEditor from "../components/inventory/StorageAreaEditor";

export default function PosizioniProdotti() {
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: mappe = [], isLoading: loadingMappe } = useQuery({
    queryKey: ['mappe-locali'],
    queryFn: () => base44.entities.MappaLocale.list(),
    staleTime: 2 * 60 * 1000
  });

  const selectedStore = stores.find(s => s.id === selectedStoreId);
  const selectedMappa = mappe.find(m => m.store_id === selectedStoreId);

  return (
    <ProtectedPage pageName="PosizioniProdotti">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
            <MapPin className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Posizione Prodotti</h1>
            <p className="text-sm text-slate-500">Crea piantine dei locali e posiziona aree di stoccaggio</p>
          </div>
        </div>

        {/* Store selector */}
        <NeumorphicCard className="p-4">
          <label className="text-sm font-medium text-slate-700 mb-2 block">Seleziona Locale</label>
          <div className="flex flex-wrap gap-2">
            {stores.map(store => (
              <button
                key={store.id}
                onClick={() => setSelectedStoreId(store.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedStoreId === store.id
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {store.name}
              </button>
            ))}
          </div>
        </NeumorphicCard>

        {selectedStoreId && (
          <StorageAreaEditor
            store={selectedStore}
            mappa={selectedMappa}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['mappe-locali'] })}
          />
        )}

        {!selectedStoreId && (
          <NeumorphicCard className="p-12 text-center">
            <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Seleziona un locale per gestire le aree di stoccaggio</p>
          </NeumorphicCard>
        )}
      </div>
    </ProtectedPage>
  );
}