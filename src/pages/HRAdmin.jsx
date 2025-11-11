import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Settings,
  GraduationCap,
  Clock,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";

export default function HRAdmin() {
  const adminTools = [
    {
      title: "Academy Admin",
      description: "Gestisci corsi, lezioni e quiz per la formazione dei dipendenti",
      url: createPageUrl("AcademyAdmin"),
      icon: GraduationCap,
      color: "text-purple-600"
    },
    {
      title: "Ricalcola Ritardi Turni",
      description: "Ricalcola i ritardi e le timbrature mancanti per tutti i turni",
      url: createPageUrl("RecalculateShifts"),
      icon: Clock,
      color: "text-blue-600"
    },
    {
      title: "Elimina Turni Duplicati",
      description: "Pulisci il database eliminando turni duplicati",
      url: createPageUrl("CleanupDuplicateShifts"),
      icon: AlertTriangle,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Settings className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">HR Admin</h1>
        </div>
        <p className="text-[#9b9b9b]">Strumenti amministrativi per la gestione delle risorse umane</p>
      </div>

      {/* Info Card */}
      <NeumorphicCard className="p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <Settings className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-blue-800 mb-2">🛠️ Strumenti Amministrativi HR</h3>
            <p className="text-sm text-blue-700">
              Questa sezione raccoglie tutti gli strumenti amministrativi per la gestione del personale, 
              inclusi formazione, manutenzione dati turni e configurazioni avanzate.
            </p>
          </div>
        </div>
      </NeumorphicCard>

      {/* Admin Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminTools.map((tool, idx) => (
          <Link key={idx} to={tool.url}>
            <NeumorphicCard className="p-6 hover:shadow-xl transition-all duration-300 h-full cursor-pointer group">
              <div className="flex flex-col h-full">
                <div className="neumorphic-flat w-16 h-16 rounded-full mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <tool.icon className={`w-8 h-8 ${tool.color}`} />
                </div>
                <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">{tool.title}</h3>
                <p className="text-sm text-[#9b9b9b] mb-4 flex-grow">{tool.description}</p>
                <div className="flex items-center gap-2 text-[#8b7355] font-medium text-sm group-hover:gap-3 transition-all">
                  <span>Apri</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </NeumorphicCard>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">📊 Riepilogo Rapido</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="neumorphic-pressed p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-[#9b9b9b]">Academy</p>
                <p className="text-lg font-bold text-[#6b6b6b]">Gestione Corsi</p>
              </div>
            </div>
          </div>
          <div className="neumorphic-pressed p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-[#9b9b9b]">Turni</p>
                <p className="text-lg font-bold text-[#6b6b6b]">Manutenzione Dati</p>
              </div>
            </div>
          </div>
          <div className="neumorphic-pressed p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-[#9b9b9b]">Pulizia</p>
                <p className="text-lg font-bold text-[#6b6b6b]">Database Turni</p>
              </div>
            </div>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}