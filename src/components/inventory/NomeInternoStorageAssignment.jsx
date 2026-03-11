import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Save, ChevronDown, ChevronUp, Loader2, Check } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";

export default function NomeInternoStorageAssignment({ nomeInterno, products, stores }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assignments, setAssignments] = useState({});
  const [initialized, setInitialized] = useState(false);
  const queryClient = useQueryClient();

  const { data: mappe = [] } = useQuery({
    queryKey: ['mappe-locali'],
    queryFn: () => base44.entities.MappaLocale.list(),
    staleTime: 2 * 60 * 1000,
    enabled: expanded
  });

  // Initialize assignments from existing product data
  if (expanded && !initialized && products.length > 0) {
    const existing = {};
    products.forEach(p => {
      if (p.storage_area_per_store) {
        Object.entries(p.storage_area_per_store).forEach(([storeId, areaId]) => {
          existing[storeId] = areaId;
        });
      }
    });
    setAssignments(existing);
    setInitialized(true);
  }

  const handleSave = async () => {
    setSaving(true);
    // Update all products with this nome_interno
    for (const product of products) {
      await base44.entities.MateriePrime.update(product.id, {
        storage_area_per_store: assignments
      });
    }
    queryClient.invalidateQueries({ queryKey: ['materie-prime'] });
    setSaving(false);
  };

  // Get storage areas for a specific store
  const getAreasForStore = (storeId) => {
    const mappa = mappe.find(m => m.store_id === storeId);
    return mappa?.storage_areas || [];
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => {
          setExpanded(!expanded);
          if (!expanded) setInitialized(false);
        }}
        className="flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
      >
        <MapPin className="w-3 h-3" />
        Posizione stoccaggio
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
          {stores.map(store => {
            const areas = getAreasForStore(store.id);
            const currentArea = assignments[store.id];
            const areaName = areas.find(a => a.id === currentArea)?.nome;

            return (
              <div key={store.id} className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600 w-24 truncate">{store.name}</span>
                {areas.length > 0 ? (
                  <select
                    value={currentArea || ''}
                    onChange={(e) => setAssignments(prev => ({ ...prev, [store.id]: e.target.value || null }))}
                    className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none"
                  >
                    <option value="">— Nessuna area —</option>
                    {areas.map(area => (
                      <option key={area.id} value={area.id}>{area.nome}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-slate-400 italic">Nessuna area configurata</span>
                )}
              </div>
            );
          })}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors mt-2"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Salva posizioni
          </button>
        </div>
      )}
    </div>
  );
}