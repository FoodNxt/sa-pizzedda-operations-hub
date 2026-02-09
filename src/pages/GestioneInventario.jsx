import React, { useState } from "react";
import { Package, ChefHat, Truck } from "lucide-react";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import MateriePrimeTab from "../components/inventory/MateriePrimeTab";
import RicetteTab from "../components/inventory/RicetteTab";
import FornitoriTab from "../components/inventory/FornitoriTab";

export default function GestioneInventario() {
  const [activeTab, setActiveTab] = useState('materie_prime'); // materie_prime | ricette | fornitori

  const tabs = [
    { id: 'materie_prime', label: 'Materie Prime', icon: Package },
    { id: 'ricette', label: 'Ricette', icon: ChefHat },
    { id: 'fornitori', label: 'Elenco Fornitori', icon: Truck }
  ];

  return (
    <ProtectedPage pageName="MateriePrime">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        <div className="mb-4 lg:mb-6">
          <h1 className="mb-1 text-2xl font-bold lg:text-3xl" style={{ color: '#000000' }}>
            Gestione Inventario
          </h1>
          <p className="text-sm" style={{ color: '#000000' }}>
            Gestisci materie prime, ricette e fornitori
          </p>
        </div>

        {/* Tabs */}
        <NeumorphicCard className="p-2">
          <div className="flex gap-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-transparent text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </NeumorphicCard>

        {/* Tab Content */}
        {activeTab === 'materie_prime' && <MateriePrimeTab />}
        {activeTab === 'ricette' && <RicetteTab />}
        {activeTab === 'fornitori' && <FornitoriTab />}
      </div>
    </ProtectedPage>
  );
}