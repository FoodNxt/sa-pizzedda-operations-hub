
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Sparkles, Camera, Calendar, Store, CheckCircle, AlertTriangle, XCircle, Plus, ChevronRight, X, Loader2 } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Pulizie() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateFilter, setDateFilter] = useState('month');
  const [detailsModalInspection, setDetailsModalInspection] = useState(null);

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
      case 'pulito': return 'bg-green-50 text-green-700 border-green-200';
      case 'medio': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'sporco': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
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

  const equipment = [
    { name: 'Forno', key: 'forno', icon: '🔥' },
    { name: 'Impastatrice', key: 'impastatrice', icon: '⚙️' },
    { name: 'Tavolo', key: 'tavolo_lavoro', icon: '📋' },
    { name: 'Frigo', key: 'frigo', icon: '❄️' },
    { name: 'Cassa', key: 'cassa', icon: '💰' },
    { name: 'Lavandino', key: 'lavandino', icon: '🚰' }
  ];

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
                      {inspection.analysis_status === 'processing' ? (
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      ) : (
                        <Store className="w-6 h-6 text-[#8b7355]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-[#6b6b6b]">{inspection.store_name}</h3>
                        {inspection.analysis_status === 'processing' && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            Analisi in corso...
                          </span>
                        )}
                        {inspection.analysis_status === 'failed' && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                            Analisi fallita
                          </span>
                        )}
                      </div>
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
                    {inspection.analysis_status === 'completed' ? (
                      <>
                        <div className={`text-3xl font-bold mb-1 ${getOverallStatusColor(inspection.overall_score)}`}>
                          {inspection.overall_score || 0}%
                        </div>
                        <p className="text-xs text-[#9b9b9b]">Punteggio Globale</p>
                      </>
                    ) : inspection.analysis_status === 'processing' ? (
                      <div className="text-sm text-blue-600 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        In elaborazione...
                      </div>
                    ) : (
                      <div className="text-sm text-red-600">
                        Errore analisi
                      </div>
                    )}
                  </div>
                </div>

                {/* Equipment Status Grid */}
                {inspection.analysis_status === 'completed' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                    {equipment.map((eq) => {
                      const status = inspection[`${eq.key}_pulizia_status`];
                      return (
                        <div key={eq.key} className={`neumorphic-pressed p-3 rounded-lg border-2 ${getStatusColor(status)}`}>
                          <div className="flex items-center justify-between mb-1">
                            {getStatusIcon(status)}
                          </div>
                          <p className="text-xs font-medium">{eq.name}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Critical Issues */}
                {inspection.critical_issues && inspection.analysis_status === 'completed' && (
                  <div className="neumorphic-pressed p-3 rounded-lg bg-red-50 flex items-start gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-700 mb-1">Problemi Critici:</p>
                      <p className="text-sm text-red-600">{inspection.critical_issues}</p>
                    </div>
                  </div>
                )}

                {/* View Details Button */}
                {inspection.analysis_status === 'completed' && (
                  <button 
                    onClick={() => setDetailsModalInspection(inspection)}
                    className="w-full mt-3 neumorphic-flat px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-[#6b6b6b] hover:text-[#8b7355] transition-colors"
                  >
                    <span className="text-sm font-medium">Vedi Dettagli</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
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

      {/* Details Modal */}
      {detailsModalInspection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <NeumorphicCard className="max-w-6xl w-full my-8 p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#6b6b6b] mb-1">
                  Dettaglio Ispezione - {detailsModalInspection.store_name}
                </h2>
                <p className="text-[#9b9b9b]">
                  {format(new Date(detailsModalInspection.inspection_date), 'dd MMMM yyyy - HH:mm', { locale: it })}
                </p>
                {detailsModalInspection.inspector_name && (
                  <p className="text-sm text-[#9b9b9b] mt-1">
                    Ispettore: {detailsModalInspection.inspector_name}
                  </p>
                )}
              </div>
              <button
                onClick={() => setDetailsModalInspection(null)}
                className="neumorphic-flat p-2 rounded-lg text-[#6b6b6b] hover:text-red-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overall Score */}
            <div className="neumorphic-pressed p-6 rounded-xl text-center mb-6">
              <p className="text-sm text-[#9b9b9b] mb-2">Punteggio Complessivo</p>
              <div className={`text-5xl font-bold ${getOverallStatusColor(detailsModalInspection.overall_score)}`}>
                {detailsModalInspection.overall_score}%
              </div>
            </div>

            {/* Equipment Details Grid */}
            <div className="space-y-6">
              {equipment.map((eq) => {
                const photoUrl = detailsModalInspection[`${eq.key}_foto_url`];
                const status = detailsModalInspection[`${eq.key}_pulizia_status`];
                const notes = detailsModalInspection[`${eq.key}_note_ai`];

                if (!photoUrl) return null;

                return (
                  <div key={eq.key} className="neumorphic-flat p-6 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{eq.icon}</span>
                      <h3 className="text-xl font-bold text-[#6b6b6b]">{eq.name}</h3>
                      <div className={`ml-auto px-4 py-2 rounded-lg border-2 flex items-center gap-2 ${getStatusColor(status)}`}>
                        {getStatusIcon(status)}
                        <span className="font-bold capitalize">{status}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Photo */}
                      <div className="neumorphic-pressed p-4 rounded-xl">
                        <img 
                          src={photoUrl} 
                          alt={eq.name}
                          className="w-full h-auto rounded-lg"
                        />
                      </div>

                      {/* Analysis */}
                      <div className="space-y-4">
                        <div className="neumorphic-pressed p-4 rounded-xl">
                          <h4 className="font-bold text-[#6b6b6b] mb-2 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#8b7355]" />
                            Analisi AI
                          </h4>
                          <p className="text-sm text-[#6b6b6b] leading-relaxed">
                            {notes || 'Nessuna nota disponibile'}
                          </p>
                        </div>

                        {status === 'sporco' && (
                          <div className="neumorphic-pressed p-4 rounded-xl bg-red-50 border-2 border-red-200">
                            <h4 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" />
                              Richiede Intervento Urgente
                            </h4>
                            <p className="text-sm text-red-600">
                              Questa attrezzatura necessita di pulizia immediata per garantire gli standard igienici.
                            </p>
                          </div>
                        )}

                        {status === 'medio' && (
                          <div className="neumorphic-pressed p-4 rounded-xl bg-yellow-50 border-2 border-yellow-200">
                            <h4 className="font-bold text-yellow-700 mb-2 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" />
                              Miglioramento Consigliato
                            </h4>
                            <p className="text-sm text-yellow-600">
                              Condizioni accettabili ma consigliata una pulizia più approfondita.
                            </p>
                          </div>
                        )}

                        {status === 'pulito' && (
                          <div className="neumorphic-pressed p-4 rounded-xl bg-green-50 border-2 border-green-200">
                            <h4 className="font-bold text-green-700 mb-2 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              Ottimo Stato
                            </h4>
                            <p className="text-sm text-green-600">
                              L'attrezzatura è perfettamente pulita e conforme agli standard igienici.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Critical Issues Summary */}
            {detailsModalInspection.critical_issues && (
              <div className="neumorphic-flat p-6 rounded-xl mt-6 bg-red-50 border-2 border-red-300">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-red-700 mb-2 text-lg">
                      Riepilogo Problemi Critici
                    </h3>
                    <p className="text-red-600">{detailsModalInspection.critical_issues}</p>
                  </div>
                </div>
              </div>
            )}
          </NeumorphicCard>
        </div>
      )}

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
