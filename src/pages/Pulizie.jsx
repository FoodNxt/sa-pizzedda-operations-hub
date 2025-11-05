import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Sparkles, Camera, Calendar, Store, CheckCircle, AlertTriangle, XCircle, Plus, ChevronRight } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Pulizie() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateFilter, setDateFilter] = useState('month');

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['cleaningInspections'],
    queryFn: () => base44.entities.CleaningInspection.list('-inspection_date'),
  });

  // Filter inspections
  const filteredInspections = inspections.filter(inspection => {
    if (selectedStore !== 'all' && inspection.store_id !== selectedStore) return false;
    
    const inspectionDate = new Date(inspection.inspection_date);
    const now = new Date();
    const daysDiff = Math.floor((now - inspectionDate) / (1000 * 60 * 60 * 24));
    
    if (dateFilter === 'week' && daysDiff > 7) return false;
    if (dateFilter === 'month' && daysDiff > 30) return false;
    
    return true;
  });

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pulito': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'medio': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'sporco': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pulito': return 'bg-green-50 text-green-700';
      case 'medio': return 'bg-yellow-50 text-yellow-700';
      case 'sporco': return 'bg-red-50 text-red-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const getOverallStatusColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Calculate stats
  const totalInspections = filteredInspections.length;
  const avgScore = filteredInspections.length > 0
    ? (filteredInspections.reduce((sum, i) => sum + (i.overall_score || 0), 0) / filteredInspections.length).toFixed(1)
    : 0;
  const criticalIssues = filteredInspections.filter(i => i.critical_issues).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Pulizie Locali</h1>
          <p className="text-[#9b9b9b]">Sistema di ispezione con analisi AI</p>
        </div>
        <Link to={createPageUrl('FotoLocale')}>
          <NeumorphicButton variant="primary" className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Nuova Ispezione
          </NeumorphicButton>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Camera className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{totalInspections}</h3>
          <p className="text-sm text-[#9b9b9b]">Ispezioni Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className={`text-3xl font-bold mb-1 ${getOverallStatusColor(avgScore)}`}>
            {avgScore}%
          </h3>
          <p className="text-sm text-[#9b9b9b]">Punteggio Medio Pulizia</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-3xl font-bold text-red-600 mb-1">{criticalIssues}</h3>
          <p className="text-sm text-[#9b9b9b]">Problemi Critici</p>
        </NeumorphicCard>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <NeumorphicCard className="px-4 py-2">
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none"
          >
            <option value="all">Tutti i Locali</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </NeumorphicCard>

        <NeumorphicCard className="px-4 py-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none"
          >
            <option value="week">Ultima Settimana</option>
            <option value="month">Ultimo Mese</option>
            <option value="all">Tutte</option>
          </select>
        </NeumorphicCard>
      </div>

      {/* Inspections List */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Storico Ispezioni</h2>
        
        {isLoading ? (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-[#8b7355] animate-spin mx-auto mb-4" />
            <p className="text-[#9b9b9b]">Caricamento ispezioni...</p>
          </div>
        ) : filteredInspections.length > 0 ? (
          <div className="space-y-4">
            {filteredInspections.map((inspection) => (
              <div key={inspection.id} className="neumorphic-flat p-5 rounded-xl hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="neumorphic-pressed w-12 h-12 rounded-full flex items-center justify-center">
                      <Store className="w-6 h-6 text-[#8b7355]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#6b6b6b]">{inspection.store_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-[#9b9b9b] mt-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(inspection.inspection_date), 'dd MMMM yyyy - HH:mm', { locale: it })}
                      </div>
                      {inspection.inspector_name && (
                        <p className="text-sm text-[#9b9b9b] mt-1">Ispettore: {inspection.inspector_name}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-3xl font-bold mb-1 ${getOverallStatusColor(inspection.overall_score)}`}>
                      {inspection.overall_score || 0}%
                    </div>
                    <p className="text-xs text-[#9b9b9b]">Punteggio Globale</p>
                  </div>
                </div>

                {/* Equipment Status Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                  {[
                    { name: 'Forno', key: 'forno' },
                    { name: 'Impastatrice', key: 'impastatrice' },
                    { name: 'Tavolo', key: 'tavolo_lavoro' },
                    { name: 'Frigo', key: 'frigo' },
                    { name: 'Cassa', key: 'cassa' },
                    { name: 'Lavandino', key: 'lavandino' }
                  ].map((equipment) => {
                    const status = inspection[`${equipment.key}_pulizia_status`];
                    return (
                      <div key={equipment.key} className={`neumorphic-pressed p-3 rounded-lg ${getStatusColor(status)}`}>
                        <div className="flex items-center justify-between mb-1">
                          {getStatusIcon(status)}
                        </div>
                        <p className="text-xs font-medium">{equipment.name}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Critical Issues */}
                {inspection.critical_issues && (
                  <div className="neumorphic-pressed p-3 rounded-lg bg-red-50 flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-700 mb-1">Problemi Critici:</p>
                      <p className="text-sm text-red-600">{inspection.critical_issues}</p>
                    </div>
                  </div>
                )}

                {/* View Details Link */}
                <button className="w-full mt-3 neumorphic-flat px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-[#6b6b6b] hover:text-[#8b7355] transition-colors">
                  <span className="text-sm font-medium">Vedi Dettagli</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Camera className="w-16 h-16 text-[#9b9b9b] opacity-50 mx-auto mb-4" />
            <p className="text-[#9b9b9b] mb-4">Nessuna ispezione trovata</p>
            <Link to={createPageUrl('FotoLocale')}>
              <NeumorphicButton className="flex items-center gap-2 mx-auto">
                <Plus className="w-5 h-5" />
                Crea Prima Ispezione
              </NeumorphicButton>
            </Link>
          </div>
        )}
      </NeumorphicCard>

      {/* Info Card */}
      <NeumorphicCard className="p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-bold text-blue-800 mb-2">Analisi AI Automatica</h3>
            <p className="text-sm text-blue-700">
              Ogni foto viene analizzata da un'intelligenza artificiale che valuta automaticamente lo stato di pulizia delle attrezzature.
              Il sistema identifica sporco, incrostazioni, disordine e fornisce raccomandazioni dettagliate.
            </p>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}