import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Camera,
  ClipboardList,
  Users,
  Edit,
  DollarSign,
  ChefHat,
  Pizza
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";

export default function FormsDipendente() {
  const forms = [
    {
      title: "Pulizia",
      description: "Controllo pulizia del tuo ruolo",
      icon: Camera,
      pages: [
        { name: "Cassiere", url: "ControlloPuliziaCassiere", roles: ["Cassiere"] },
        { name: "Pizzaiolo", url: "ControlloPuliziaPizzaiolo", roles: ["Pizzaiolo"] },
        { name: "Store Manager", url: "ControlloPuliziaStoreManager", roles: ["Store Manager"] }
      ],
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Inventario",
      description: "Form inventario e gestione magazzino",
      icon: ClipboardList,
      url: "InventoryForms",
      color: "from-green-500 to-emerald-600"
    },
    {
      title: "Conteggio Cassa",
      description: "Registra il conteggio cassa",
      icon: DollarSign,
      url: "ConteggioCassa",
      color: "from-purple-500 to-pink-600"
    },
    {
      title: "Feedback P2P",
      description: "Dai feedback ai tuoi colleghi",
      icon: Users,
      url: "FeedbackP2P",
      color: "from-orange-500 to-red-600"
    },
    {
      title: "Impasto",
      description: "Gestione impasto",
      icon: ChefHat,
      url: "Impasto",
      roles: ["Pizzaiolo", "Store Manager"],
      color: "from-amber-500 to-yellow-600"
    },
    {
      title: "Precotture",
      description: "Gestione precotture",
      icon: Pizza,
      url: "Precotture",
      roles: ["Pizzaiolo", "Store Manager"],
      color: "from-indigo-500 to-blue-600"
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
          Form
        </h1>
        <p className="text-sm text-slate-500">Compila i form richiesti per il tuo ruolo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {forms.map((form, index) => {
          const Icon = form.icon;
          
          // If form has sub-pages (like Pulizia)
          if (form.pages) {
            return (
              <NeumorphicCard key={index} className="p-6">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${form.color} mx-auto mb-4 flex items-center justify-center shadow-lg`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 text-center mb-2">{form.title}</h3>
                <p className="text-sm text-slate-600 text-center mb-4">{form.description}</p>
                <div className="space-y-2">
                  {form.pages.map((page, idx) => (
                    <Link
                      key={idx}
                      to={createPageUrl(page.url)}
                      className="block w-full nav-button px-4 py-3 rounded-xl text-slate-700 hover:text-slate-900 transition-colors text-center font-medium"
                    >
                      {page.name}
                    </Link>
                  ))}
                </div>
              </NeumorphicCard>
            );
          }

          // Regular form card
          return (
            <Link key={index} to={createPageUrl(form.url)}>
              <NeumorphicCard className="p-6 hover:shadow-xl transition-all cursor-pointer">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${form.color} mx-auto mb-4 flex items-center justify-center shadow-lg`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 text-center mb-2">{form.title}</h3>
                <p className="text-sm text-slate-600 text-center">{form.description}</p>
              </NeumorphicCard>
            </Link>
          );
        })}
      </div>

      {/* Info Card */}
      <NeumorphicCard className="p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <Edit className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">📝 Informazioni</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>Compila i form assegnati in base al tuo ruolo</li>
              <li>Alcuni form sono richiesti quotidianamente, altri settimanalmente</li>
              <li>I tuoi manager monitoreranno il completamento dei form</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}