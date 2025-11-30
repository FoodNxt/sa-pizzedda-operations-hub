import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { Camera, ClipboardCheck, Users, ChefHat, UserCheck } from 'lucide-react';

export default function FormPulizia() {
  const [activeSection, setActiveSection] = useState('master');

  const sections = [
    { id: 'master', label: 'Controllo Master', icon: ClipboardCheck, page: 'ControlloPulizieMaster', description: 'Form principale di controllo pulizia' },
    { id: 'cassiere', label: 'Form Cassiere', icon: Users, page: 'ControlloPuliziaCassiere', description: 'Controllo pulizia per cassieri' },
    { id: 'pizzaiolo', label: 'Form Pizzaiolo', icon: ChefHat, page: 'ControlloPuliziaPizzaiolo', description: 'Controllo pulizia per pizzaioli' },
    { id: 'store_manager', label: 'Form Store Manager', icon: UserCheck, page: 'ControlloPuliziaStoreManager', description: 'Controllo pulizia per Store Manager' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Camera className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Form Pulizia</h1>
        </div>
        <p className="text-[#9b9b9b]">Seleziona il form di controllo pulizia da compilare</p>
      </div>

      {/* Section Tabs */}
      <NeumorphicCard className="p-4">
        <div className="flex flex-wrap gap-2">
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                  activeSection === section.id 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                    : 'neumorphic-flat text-[#6b6b6b] hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {section.label}
              </button>
            );
          })}
        </div>
      </NeumorphicCard>

      {/* Selected Section Content */}
      {sections.map(section => {
        if (activeSection !== section.id) return null;
        const Icon = section.icon;
        
        return (
          <NeumorphicCard key={section.id} className="p-8 text-center">
            <div className="neumorphic-flat w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Icon className="w-10 h-10 text-[#8b7355]" />
            </div>
            <h2 className="text-2xl font-bold text-[#6b6b6b] mb-2">{section.label}</h2>
            <p className="text-[#9b9b9b] mb-6">{section.description}</p>
            <Link to={createPageUrl(section.page)}>
              <NeumorphicButton variant="primary" className="px-8 py-4 text-lg">
                Apri Form
              </NeumorphicButton>
            </Link>
          </NeumorphicCard>
        );
      })}
    </div>
  );
}