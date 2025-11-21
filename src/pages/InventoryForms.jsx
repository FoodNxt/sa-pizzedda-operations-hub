import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ClipboardList,
  Package,
  AlertTriangle,
  ChefHat,
  ClipboardCheck,
  ArrowRight
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";

export default function InventoryForms() {
  const forms = [
    {
      title: "Form Inventario",
      description: "Registra le quantità dell'inventario negozio",
      icon: ClipboardList,
      url: createPageUrl("FormInventario"),
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Form Cantina",
      description: "Registra le quantità dell'inventario cantina",
      icon: ClipboardList,
      url: createPageUrl("FormCantina"),
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "Form Teglie Buttate",
      description: "Registra le teglie rosse e bianche buttate",
      icon: AlertTriangle,
      url: createPageUrl("FormTeglieButtate"),
      color: "from-orange-500 to-red-600"
    },
    {
      title: "Form Preparazioni",
      description: "Registra i pesi delle preparazioni",
      icon: ChefHat,
      url: createPageUrl("FormPreparazioni"),
      color: "from-green-500 to-emerald-600"
    }
  ];

  return (
    <ProtectedPage pageName="InventoryForms">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
            Forms Inventario
          </h1>
          <p className="text-sm text-slate-500">Seleziona il form da compilare</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forms.map((form, index) => {
            const Icon = form.icon;
            return (
              <Link key={index} to={form.url}>
                <NeumorphicCard className="p-6 hover:shadow-xl transition-all cursor-pointer group">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${form.color} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">
                    {form.title}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {form.description}
                  </p>
                </NeumorphicCard>
              </Link>
            );
          })}
        </div>

        <NeumorphicCard className="p-6 bg-blue-50">
          <div className="flex items-start gap-3">
            <Package className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div className="text-sm text-blue-800">
              <p className="font-bold mb-2">💡 Informazioni</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Form Inventario</strong>: per rilevazioni rapide del negozio</li>
                <li>• <strong>Form Cantina</strong>: per rilevazioni rapide della cantina</li>
                <li>• <strong>Teglie Buttate</strong>: monitora gli sprechi giornalieri</li>
                <li>• <strong>Preparazioni</strong>: traccia i pesi delle preparazioni</li>
              </ul>
            </div>
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}