import React, { useState } from "react";
import { FileText } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";

// Import dei componenti dalle vecchie pagine
import ContrattiContent from "../components/documenti/ContrattiContent";
import LettereRichiamoContent from "../components/documenti/LettereRichiamoContent";
import RegolamentoContent from "../components/documenti/RegolamentoContent";

export default function Documenti() {
  const [activeTab, setActiveTab] = useState('contratti');

  return (
    <ProtectedPage pageName="Documenti">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-10 h-10 text-[#8b7355]" />
              <h1 className="text-3xl font-bold text-[#6b6b6b]">Gestione Documenti</h1>
            </div>
            <p className="text-[#9b9b9b]">Contratti, lettere di richiamo e regolamento dipendenti</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('contratti')}
            className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'contratti' ? 'neumorphic-pressed text-[#8b7355]' : 'neumorphic-flat text-[#9b9b9b]'
            }`}
          >
            Contratti
          </button>
          <button
            onClick={() => setActiveTab('lettere')}
            className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'lettere' ? 'neumorphic-pressed text-[#8b7355]' : 'neumorphic-flat text-[#9b9b9b]'
            }`}
          >
            Lettere Richiamo
          </button>
          <button
            onClick={() => setActiveTab('regolamento')}
            className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'regolamento' ? 'neumorphic-pressed text-[#8b7355]' : 'neumorphic-flat text-[#9b9b9b]'
            }`}
          >
            Regolamento
          </button>
        </div>

        {/* Content */}
        {activeTab === 'contratti' && <ContrattiContent />}
        {activeTab === 'lettere' && <LettereRichiamoContent />}
        {activeTab === 'regolamento' && <RegolamentoContent />}
      </div>
    </ProtectedPage>
  );
}