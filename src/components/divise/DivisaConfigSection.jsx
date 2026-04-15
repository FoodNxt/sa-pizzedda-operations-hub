import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Loader2, Plus, X } from "lucide-react";
import NeumorphicCard from "@/components/neumorphic/NeumorphicCard";

const GRUPPI = ["FT", "PT", "CM"];
const GRUPPI_LABELS = { FT: "Full Time", PT: "Part Time", CM: "Contratto Misto" };

export default function DivisaConfigSection({ config, onSave, isSaving }) {
  const defaultElements = config?.elementi_divisa?.length > 0
    ? config.elementi_divisa
    : ["Maglietta", "Pantaloni", "Grembiule", "Bandana"];

  const [elementi, setElementi] = useState(defaultElements);
  const [newElemento, setNewElemento] = useState("");
  const [dotazione, setDotazione] = useState(config?.dotazione_per_gruppo || {
    FT: {}, PT: {}, CM: {}
  });

  const addElemento = () => {
    const name = newElemento.trim();
    if (!name || elementi.includes(name)) return;
    setElementi([...elementi, name]);
    setNewElemento("");
  };

  const removeElemento = (name) => {
    setElementi(elementi.filter(e => e !== name));
    const newDot = { ...dotazione };
    GRUPPI.forEach(g => {
      if (newDot[g]) {
        const { [name]: _, ...rest } = newDot[g];
        newDot[g] = rest;
      }
    });
    setDotazione(newDot);
  };

  const updateQty = (gruppo, elemento, val) => {
    const num = parseInt(val) || 0;
    setDotazione(prev => ({
      ...prev,
      [gruppo]: { ...(prev[gruppo] || {}), [elemento]: num }
    }));
  };

  const handleSave = () => {
    onSave({
      config_name: "default",
      elementi_divisa: elementi,
      dotazione_per_gruppo: dotazione,
      is_active: true
    });
  };

  return (
    <NeumorphicCard className="p-5">
      <h3 className="font-bold text-slate-800 mb-4">Configurazione Dotazione Divise</h3>

      <div className="mb-4">
        <label className="text-sm font-medium text-slate-600 mb-2 block">Elementi Divisa</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {elementi.map(el => (
            <span key={el} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              {el}
              <button onClick={() => removeElemento(el)} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newElemento}
            onChange={e => setNewElemento(e.target.value)}
            placeholder="Nuovo elemento..."
            className="h-9 w-48"
            onKeyDown={e => e.key === "Enter" && addElemento()}
          />
          <Button size="sm" variant="outline" onClick={addElemento} className="gap-1">
            <Plus className="w-4 h-4" /> Aggiungi
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2 text-slate-600 font-medium">Elemento</th>
              {GRUPPI.map(g => (
                <th key={g} className="text-center py-2 px-2 text-slate-600 font-medium">
                  {g} <span className="text-xs text-slate-400 block">{GRUPPI_LABELS[g]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {elementi.map(el => (
              <tr key={el} className="border-b last:border-0">
                <td className="py-2 px-2 font-medium text-slate-700">{el}</td>
                {GRUPPI.map(g => (
                  <td key={g} className="py-2 px-2 text-center">
                    <Input
                      type="number"
                      min={0}
                      value={dotazione[g]?.[el] || 0}
                      onChange={e => updateQty(g, el, e.target.value)}
                      className="h-8 w-16 text-center mx-auto"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salva Configurazione
        </Button>
      </div>
    </NeumorphicCard>
  );
}