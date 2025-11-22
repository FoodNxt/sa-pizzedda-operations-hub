import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Camera,
  ClipboardList,
  Users,
  Edit,
  DollarSign,
  ChefHat,
  Pizza,
  Trash2
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";

export default function FormsDipendente() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: pageAccessConfig } = useQuery({
    queryKey: ['page-access-config'],
    queryFn: async () => {
      const configs = await base44.entities.PageAccessConfig.list();
      return configs.find(c => c.is_active);
    },
  });

  const userRoles = user?.ruoli_dipendente || [];

  const forms = [
    {
      title: "Controllo Pulizia Cassiere",
      description: "Controllo pulizia area cassa",
      icon: Camera,
      url: "ControlloPuliziaCassiere",
      roles: ["Cassiere"],
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Controllo Pulizia Pizzaiolo",
      description: "Controllo pulizia area pizza",
      icon: Camera,
      url: "ControlloPuliziaPizzaiolo",
      roles: ["Pizzaiolo"],
      color: "from-orange-500 to-red-600"
    },
    {
      title: "Controllo Pulizia Store Manager",
      description: "Controllo pulizia generale",
      icon: Camera,
      url: "ControlloPuliziaStoreManager",
      roles: ["Store Manager"],
      color: "from-purple-500 to-pink-600"
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
      color: "from-teal-500 to-cyan-600"
    },
    {
      title: "Feedback P2P",
      description: "Dai feedback ai tuoi colleghi",
      icon: Users,
      url: "FeedbackP2P",
      color: "from-rose-500 to-pink-600"
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
    },
    {
      title: "Teglie Buttate",
      description: "Registra teglie buttate",
      icon: Trash2,
      url: "FormTeglieButtate",
      roles: ["Pizzaiolo", "Store Manager"],
      color: "from-red-500 to-rose-600"
    },
    {
      title: "Preparazioni",
      description: "Gestione preparazioni",
      icon: ClipboardList,
      url: "Preparazioni",
      roles: ["Pizzaiolo", "Store Manager"],
      color: "from-violet-500 to-purple-600"
    }
  ];

  // Get pages that should show in Forms from config
  const getFormsPages = () => {
    if (!pageAccessConfig || !user) return [];
    
    const userRoles = user.ruoli_dipendente || [];
    let pagesConfig = [];

    if (userRoles.length === 0) {
      pagesConfig = pageAccessConfig.after_registration || [];
    } else {
      const contractStarted = user.data_inizio_contratto && new Date(user.data_inizio_contratto) <= new Date();
      
      if (contractStarted) {
        if (userRoles.includes('Pizzaiolo')) {
          pagesConfig = [...pagesConfig, ...(pageAccessConfig.pizzaiolo_pages || [])];
        }
        if (userRoles.includes('Cassiere')) {
          pagesConfig = [...pagesConfig, ...(pageAccessConfig.cassiere_pages || [])];
        }
        if (userRoles.includes('Store Manager')) {
          pagesConfig = [...pagesConfig, ...(pageAccessConfig.store_manager_pages || [])];
        }
      }
    }

    // Filter only pages that should show in Forms
    return pagesConfig
      .filter(p => (typeof p === 'object' && p.showInForms))
      .map(p => p.page);
  };

  const formsPages = getFormsPages();

  // Filter forms based on config
  const filteredForms = forms.filter(form => formsPages.includes(form.url));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
          Form
        </h1>
        <p className="text-sm text-slate-500">Compila i form richiesti per il tuo ruolo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredForms.map((form, index) => {
          const Icon = form.icon;

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