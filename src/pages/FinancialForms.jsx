import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DollarSign,
  MinusCircle,
  PlusCircle,
  FileText
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";

export default function FinancialForms() {
  const forms = [
    {
      title: "Form Conteggio Cassa",
      description: "Registra il conteggio della cassa",
      icon: DollarSign,
      url: createPageUrl("ConteggioCassa"),
      gradient: "from-blue-500 to-blue-600"
    },
    {
      title: "Form Prelievi",
      description: "Registra prelievi di contante dalla cassa",
      icon: MinusCircle,
      url: createPageUrl("FormPrelievi"),
      gradient: "from-red-500 to-pink-600"
    },
    {
      title: "Form Deposito",
      description: "Registra depositi contanti in banca (BPM/Sella)",
      icon: PlusCircle,
      url: createPageUrl("FormDeposito"),
      gradient: "from-green-500 to-emerald-600"
    }
  ];

  return (
    <ProtectedPage pageName="FinancialForms">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-10 h-10 text-blue-600" />
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              Forms Finanziari
            </h1>
          </div>
          <p className="text-sm text-slate-500">Gestione cassa, prelievi e depositi</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {forms.map((form) => {
            const Icon = form.icon;
            return (
              <Link key={form.title} to={form.url}>
                <NeumorphicCard className="p-6 hover:shadow-2xl transition-all group cursor-pointer h-full">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${form.gradient} mx-auto mb-4 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2 text-center">
                    {form.title}
                  </h3>
                  <p className="text-sm text-slate-500 text-center">
                    {form.description}
                  </p>
                </NeumorphicCard>
              </Link>
            );
          })}
        </div>

        <NeumorphicCard className="p-6 bg-blue-50">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 mb-2">ℹ️ Informazioni</p>
              <ul className="space-y-1 text-xs text-blue-700">
                <li>• <strong>Conteggio Cassa:</strong> Registra il valore contante in cassa</li>
                <li>• <strong>Prelievi:</strong> Sottrae automaticamente dall'ultimo conteggio cassa</li>
                <li>• <strong>Depositi:</strong> Traccia i depositi in banca BPM o Sella</li>
              </ul>
            </div>
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}