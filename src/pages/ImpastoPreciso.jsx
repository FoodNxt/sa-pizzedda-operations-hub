import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { ChefHat, Calculator, ArrowLeft } from "lucide-react";

export default function ImpastoPreciso() {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const redirectTo = urlParams.get("redirect");

  const [numeroPalline, setNumeroPalline] = useState("");
  const [tipoRicetta, setTipoRicetta] = useState(null);

  const { data: ricettaIngredienti = [] } = useQuery({
    queryKey: ["ricetta-impasto"],
    queryFn: () => base44.entities.RicettaImpasto.list(),
  });

  const { data: impastiConfig = [] } = useQuery({
    queryKey: ["impasti-config"],
    queryFn: () => base44.entities.ImpastiConfig.list(),
  });

  const globalConfig = impastiConfig.find(c => c.is_active && !c.store_id);
  const ricettaDefault = globalConfig?.ricetta_default || 'farina_semola';
  const selectedRicetta = tipoRicetta || ricettaDefault;

  const sortedIngredienti = [...ricettaIngredienti]
    .filter((i) => i.attivo !== false && (i.tipo_ricetta || 'farina_semola') === selectedRicetta)
    .sort((a, b) => (a.ordine || 0) - (b.ordine || 0));

  const ingredientiCalcolati = useMemo(() => {
    const n = parseInt(numeroPalline);
    if (!n || n <= 0 || sortedIngredienti.length === 0) return null;

    return sortedIngredienti.map((ing) => {
      let quantita = ing.quantita_per_pallina * n;

      if (ing.arrotondamento === "intero") {
        quantita = Math.ceil(quantita);
      } else if (ing.arrotondamento === "decine") {
        quantita = Math.ceil(quantita / 10) * 10;
      } else if (ing.arrotondamento === "centinaia") {
        quantita = Math.ceil(quantita / 100) * 100;
      }

      // Convert for display
      let displayValue = quantita;
      let displayUnit = ing.unita_misura;
      if (ing.unita_misura === "kg") {
        displayValue = quantita * 1000;
        displayUnit = "g";
      }
      if (ing.unita_misura === "litri") {
        displayValue = quantita * 1000;
        displayUnit = "ml";
      }
      displayValue = Math.round(displayValue);

      return {
        nome: ing.nome_ingrediente,
        displayValue,
        displayUnit,
      };
    });
  }, [numeroPalline, sortedIngredienti]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(redirectTo ? createPageUrl(redirectTo) : -1)}
          className="nav-button p-2 rounded-xl"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Impasto Preciso</h1>
          <p className="text-slate-500 mt-1">
            Inserisci il numero di palline e ottieni la ricetta
          </p>
        </div>
      </div>

      <NeumorphicCard className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Tipo di ricetta
          </label>
          <div className="flex gap-2">
            {[{ key: 'farina_semola', label: 'Farina + Semola' }, { key: 'solo_farina', label: 'Solo Farina' }].map(opt => (
              <button
                key={opt.key}
                onClick={() => setTipoRicetta(opt.key)}
                className={`px-4 py-2.5 rounded-xl font-medium transition-all text-sm ${
                  selectedRicetta === opt.key
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                    : 'neumorphic-flat text-slate-700'
                }`}
              >
                {opt.label}
                {ricettaDefault === opt.key && <span className="ml-1 text-xs opacity-75">(default)</span>}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Quante palline vuoi fare?
          </label>
          <input
            type="number"
            min="1"
            value={numeroPalline}
            onChange={(e) => setNumeroPalline(e.target.value)}
            placeholder="Es. 30"
            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-lg"
          />
        </div>
      </NeumorphicCard>

      {ingredientiCalcolati && (
        <NeumorphicCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Ricetta per {numeroPalline} palline
              </h2>
              <p className="text-sm text-slate-500">Ingredienti necessari</p>
            </div>
          </div>

          <div className="neumorphic-pressed p-4 rounded-xl">
            <div className="space-y-2">
              {ingredientiCalcolati.map((ing, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center py-3 border-b border-slate-200 last:border-0"
                >
                  <span className="text-slate-700 font-medium text-base">
                    {ing.nome}
                  </span>
                  <span className="text-slate-800 font-bold text-lg">
                    {ing.displayValue} {ing.displayUnit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </NeumorphicCard>
      )}

      {!ingredientiCalcolati && sortedIngredienti.length === 0 && (
        <NeumorphicCard className="p-6 text-center">
          <p className="text-slate-500">
            Nessun ingrediente configurato nella ricetta. Chiedi al tuo manager
            di configurare la ricetta impasto.
          </p>
        </NeumorphicCard>
      )}
    </div>
  );
}