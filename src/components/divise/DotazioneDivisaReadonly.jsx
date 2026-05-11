import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import { Loader2, Package } from "lucide-react";

const GRUPPI = ["FT", "PT", "CM"];
const GRUPPI_LABELS = { FT: "Full Time", PT: "Part Time", CM: "Contratto Misto" };

export default function DotazioneDivisaReadonly() {
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["divisa-config-readonly"],
    queryFn: () => base44.entities.DivisaConfig.list(),
  });

  const config = configs.find((c) => c.is_active) || null;

  if (isLoading) {
    return (
      <NeumorphicCard className="p-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
      </NeumorphicCard>
    );
  }

  if (!config || !config.elementi_divisa?.length) {
    return (
      <NeumorphicCard className="p-6 text-center">
        <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Nessuna configurazione dotazione divise disponibile</p>
      </NeumorphicCard>
    );
  }

  const dotazione = config.dotazione_per_gruppo || {};

  return (
    <NeumorphicCard className="p-5">
      <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
        <Package className="w-5 h-5 text-blue-600" />
        Dotazione Divise per Contratto
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-3 text-slate-600 font-semibold">Elemento</th>
              {GRUPPI.map((g) => (
                <th key={g} className="text-center py-2 px-3">
                  <span className="font-bold text-slate-700">{g}</span>
                  <br />
                  <span className="text-xs text-slate-400 font-normal">{GRUPPI_LABELS[g]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {config.elementi_divisa.map((elemento) => (
              <tr key={elemento} className="border-b border-slate-100">
                <td className="py-2.5 px-3 font-medium text-slate-700">{elemento}</td>
                {GRUPPI.map((g) => (
                  <td key={g} className="text-center py-2.5 px-3">
                    <span className="inline-block bg-slate-100 text-slate-700 font-semibold rounded-lg px-3 py-1 min-w-[40px]">
                      {dotazione[g]?.[elemento] ?? 0}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </NeumorphicCard>
  );
}