import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ChefHat,
  Truck,
  Upload,
  Settings
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";

export default function InventarioAdmin() {
  const forms = [
    {
      title: "Ricette",
      description: "Gestisci ricette, ingredienti e calcola il food cost",
      icon: ChefHat,
      url: createPageUrl("Ricette"),
      gradient: "from-orange-500 to-red-600"
    },
    {
      title: "Elenco Fornitori",
      description: "Visualizza e gestisci i fornitori",
      icon: Truck,
      url: createPageUrl("ElencoFornitori"),
      gradient: "from-blue-500 to-indigo-600"
    }
  ];

  return (
    <ProtectedPage pageName="InventarioAdmin">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-10 h-10 text-[#8b7355]" />
            <h1 className="text-3xl font-bold text-[#6b6b6b]">Inventory Admin</h1>
          </div>
          <p className="text-[#9b9b9b]">Configurazione avanzata dell'inventario</p>
        </div>

        {/* Forms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {forms.map((form) => {
            const Icon = form.icon;
            return (
              <Link key={form.title} to={form.url}>
                <NeumorphicCard className="p-6 hover:shadow-xl transition-all cursor-pointer h-full">
                  <div className="flex flex-col">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${form.gradient} mb-4 flex items-center justify-center shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <h2 className="text-xl font-bold text-[#6b6b6b] mb-2">{form.title}</h2>
                    <p className="text-sm text-[#9b9b9b]">{form.description}</p>
                  </div>
                </NeumorphicCard>
              </Link>
            );
          })}
        </div>

        {/* Info Box */}
        <NeumorphicCard className="p-6 bg-blue-50">
          <h3 className="font-bold text-blue-800 mb-3">ℹ️ Informazioni</h3>
          <div className="space-y-2 text-sm text-blue-700">
            <p><strong>• Ricette:</strong> Crea e gestisci le ricette con calcolo automatico del food cost</p>
            <p><strong>• Elenco Fornitori:</strong> Gestisci i dati dei fornitori e i loro contatti</p>
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}