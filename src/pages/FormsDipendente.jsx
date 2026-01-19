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
  Trash2,
  UserCheck,
  AlertTriangle,
  Truck
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
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Controllo Pulizia Pizzaiolo",
      description: "Controllo pulizia area pizza",
      icon: Camera,
      url: "ControlloPuliziaPizzaiolo",
      color: "from-orange-500 to-red-600"
    },
    {
      title: "Controllo Pulizia Store Manager",
      description: "Controllo pulizia generale",
      icon: Camera,
      url: "ControlloPuliziaStoreManager",
      color: "from-purple-500 to-pink-600"
    },
    {
      title: "Inventario",
      description: "Form inventario e gestione magazzino",
      icon: ClipboardList,
      url: "FormInventario",
      color: "from-green-500 to-emerald-600"
    },
    {
      title: "Inventario Store Manager",
      description: "Gestione completa inventario",
      icon: ClipboardList,
      url: "InventarioStoreManager",
      color: "from-emerald-500 to-green-600"
    },
    {
      title: "Conteggio Cassa",
      description: "Registra il conteggio cassa",
      icon: DollarSign,
      url: "ConteggioCassa",
      color: "from-teal-500 to-cyan-600"
    },
    {
      title: "Prelievi",
      description: "Registra prelievi dalla cassa",
      icon: DollarSign,
      url: "FormPrelievi",
      color: "from-red-500 to-orange-600",
      requiresStoreManager: true
    },
    {
      title: "Depositi",
      description: "Registra depositi alla cassa",
      icon: DollarSign,
      url: "FormDeposito",
      color: "from-green-500 to-teal-600",
      requiresStoreManager: true
    },
    {
      title: "Pagamenti Contanti",
      description: "Registra pagamenti in contanti",
      icon: DollarSign,
      url: "FormPagamentiContanti",
      color: "from-blue-500 to-indigo-600",
      requiresStoreManager: true
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
      color: "from-amber-500 to-yellow-600"
    },
    {
      title: "Precotture",
      description: "Gestione precotture",
      icon: Pizza,
      url: "Precotture",
      color: "from-indigo-500 to-blue-600"
    },
    {
      title: "Teglie Buttate",
      description: "Registra teglie buttate",
      icon: Trash2,
      url: "FormTeglieButtate",
      color: "from-red-500 to-rose-600"
    },
    {
      title: "Preparazioni",
      description: "Gestione preparazioni",
      icon: ClipboardList,
      url: "Preparazioni",
      color: "from-violet-500 to-purple-600"
    },
    {
      title: "Valutazione Prove",
      description: "Valuta i candidati",
      icon: UserCheck,
      url: "ValutazioneProvaForm",
      color: "from-pink-500 to-rose-600",
      requiresAbilitatoProve: true
    },
    {
      title: "Segnalazioni",
      description: "Segnala problemi o anomalie",
      icon: AlertTriangle,
      url: "Segnalazioni",
      color: "from-orange-500 to-red-600"
    },
    {
      title: "Sprechi",
      description: "Registra prodotti sprecati",
      icon: Trash2,
      url: "FormSprechi",
      color: "from-red-500 to-orange-600"
    }
  ];

  // Normalize config (convert strings to objects)
  const normalizePageConfig = (pages) => {
    if (!pages || pages.length === 0) return [];
    return pages.map(p => {
      if (typeof p === 'string') {
        return { page: p, showInMenu: true, showInForms: false };
      }
      return p;
    });
  };

  // Get pages that should show in Forms from config
  const getFormsPages = () => {
    if (!pageAccessConfig || !user) return [];
    
    const userRoles = user.ruoli_dipendente || [];
    let pagesConfig = [];

    if (userRoles.length === 0) {
      pagesConfig = normalizePageConfig(pageAccessConfig.after_registration || []);
    } else {
      const contractStarted = user.data_inizio_contratto && new Date(user.data_inizio_contratto) <= new Date();
      
      if (contractStarted) {
        if (userRoles.includes('Pizzaiolo')) {
          pagesConfig = [...pagesConfig, ...normalizePageConfig(pageAccessConfig.pizzaiolo_pages || [])];
        }
        if (userRoles.includes('Cassiere')) {
          pagesConfig = [...pagesConfig, ...normalizePageConfig(pageAccessConfig.cassiere_pages || [])];
        }
        if (userRoles.includes('Store Manager')) {
          pagesConfig = [...pagesConfig, ...normalizePageConfig(pageAccessConfig.store_manager_pages || [])];
        }
      }
    }

    // Remove duplicates by page name
    const seen = new Set();
    pagesConfig = pagesConfig.filter(p => {
      if (seen.has(p.page)) return false;
      seen.add(p.page);
      return true;
    });

    // Filter only pages that should show in Forms
    return pagesConfig
      .filter(p => p.showInForms === true)
      .map(p => p.page);
  };

  const formsPages = getFormsPages();

  // Filter forms based on config
  let filteredForms = forms.filter(form => {
    // Check if in formsPages config
    if (!formsPages.includes(form.url)) return false;
    
    // Check if requires Store Manager role
    if (form.requiresStoreManager && !userRoles.includes('Store Manager')) return false;
    
    return true;
  });

  // Add ValutazioneProvaForm for users with abilitato_prove
  if (user?.abilitato_prove) {
    const valutazioneForm = forms.find(f => f.url === 'ValutazioneProvaForm');
    if (valutazioneForm && !filteredForms.some(f => f.url === 'ValutazioneProvaForm')) {
      filteredForms = [...filteredForms, valutazioneForm];
    }
  }

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