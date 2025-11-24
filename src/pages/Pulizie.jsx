import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Sparkles, Camera, Calendar, Store, CheckCircle, AlertTriangle, XCircle, Plus, ChevronRight, X, Loader2, Edit, Save, TrendingUp } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Pulizie() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateFilter, setDateFilter] = useState('month');
  const [detailsModalInspection, setDetailsModalInspection] = useState(null);
  const [correctingEquipment, setCorrectingEquipment] = useState(null);
  const [correctionData, setCorrectionData] = useState({});

  const queryClient = useQueryClient();

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
      case 'non_valutabile': return <AlertTriangle className="w-5 h-5 text-gray-400" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pulito': return 'bg-green-50 text-green-700 border-green-200';
      case 'medio': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'sporco': return 'bg-red-50 text-red-700 border-red-200';
      case 'non_valutabile': return 'bg-gray-50 text-gray-700 border-gray-200';
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

  // Mutation for saving corrections
  const saveCorrectionMutation = useMutation({
    mutationFn: async ({ inspectionId, equipmentKey, correctedStatus, correctionNote }) => {
      // Get the current inspection to recalculate overall score
      const inspection = detailsModalInspection;
      
      // Count equipment statuses for score calculation
      let puliti = 0;
      let medi = 0;
      let sporchi = 0;
      let total = 0;
      
      equipment.forEach(eq => {
        const status = eq.key === equipmentKey 
          ? correctedStatus 
          : (inspection[`${eq.key}_corrected`] 
              ? inspection[`${eq.key}_corrected_status`]
              : inspection[`${eq.key}_pulizia_status`]);
        
        if (status && inspection[`${eq.key}_foto_url`]) {
          total++;
          if (status === 'pulito') puliti++;
          else if (status === 'medio') medi++;
          else if (status === 'sporco') sporchi++;
        }
      });
      
      // Calculate new overall score (pulito=100, medio=50, sporco=0)
      const newOverallScore = total > 0 
        ? Math.round(((puliti * 100 + medi * 50) / total))
        : 0;
      
      const updateData = {
        [`${equipmentKey}_corrected`]: true,
        [`${equipmentKey}_corrected_status`]: correctedStatus,
        [`${equipmentKey}_correction_note`]: correctionNote,
        has_corrections: true,
        overall_score: newOverallScore
      };

      await base44.entities.CleaningInspection.update(inspectionId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaningInspections'] });
      setCorrectingEquipment(null);
      setCorrectionData({});
    }
  });

  const handleStartCorrection = (equipmentKey) => {
    const inspection = detailsModalInspection;
    setCorrectingEquipment(equipmentKey);
    setCorrectionData({
      status: inspection[`${equipmentKey}_pulizia_status`],
      note: ''
    });
  };

  const handleSaveCorrection = (equipmentKey) => {
    saveCorrectionMutation.mutate({
      inspectionId: detailsModalInspection.id,
      equipmentKey,
      correctedStatus: correctionData.status,
      correctionNote: correctionData.note
    });
  };

  // Calculate accuracy stats
  const accuracyStats = {
    totalInspections: inspections.filter(i => i.analysis_status === 'completed').length,
    correctedInspections: inspections.filter(i => i.analysis_status === 'completed' && i.has_corrections === true).length,
    get accuracyRate() {
      if (this.totalInspections === 0) return 100;
      const accurateCount = this.totalInspections - this.correctedInspections;
      return ((accurateCount / this.totalInspections) * 100).toFixed(1);
    }
  };

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

      {/* Stats - UPDATED with accuracy */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">{accuracyStats.accuracyRate}%</h3>
          <p className="text-sm text-[#9b9b9b]">Accuratezza AI</p>
          <p className="text-xs text-[#9b9b9b] mt-1">
            {accuracyStats.correctedInspections} correzioni su {accuracyStats.totalInspections}
          </p>
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
                        {inspection.has_corrections && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            Correzioni AI
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
                      const status = inspection[`${eq.key}_corrected`]
                        ? inspection[`${eq.key}_corrected_status`]
                        : inspection[`${eq.key}_pulizia_status`];
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-6xl w-full max-h-[95vh] overflow-y-auto my-4">
            <NeumorphicCard className="p-6">
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
                onClick={() => {setDetailsModalInspection(null); setCorrectingEquipment(null);}}
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
                const aiStatus = detailsModalInspection[`${eq.key}_pulizia_status`];
                const aiNotes = detailsModalInspection[`${eq.key}_note_ai`];
                const isCorrected = detailsModalInspection[`${eq.key}_corrected`];
                const correctedStatus = detailsModalInspection[`${eq.key}_corrected_status`];
                const correctionNote = detailsModalInspection[`${eq.key}_correction_note`];
                const isEditing = correctingEquipment === eq.key;

                const displayStatus = isCorrected ? correctedStatus : aiStatus;

                if (!photoUrl) return null;

                return (
                  <div key={eq.key} className="neumorphic-flat p-6 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{eq.icon}</span>
                      <h3 className="text-xl font-bold text-[#6b6b6b]">{eq.name}</h3>

                      {/* Status Badge */}
                      <div className={`ml-auto px-4 py-2 rounded-lg border-2 flex items-center gap-2 ${getStatusColor(displayStatus)}`}>
                        {getStatusIcon(displayStatus)}
                        <span className="font-bold capitalize">{displayStatus}</span>
                      </div>

                      {/* Correction Badge */}
                      {isCorrected && (
                        <div className="px-3 py-1 rounded-lg bg-blue-100 text-blue-700 text-sm font-medium">
                          ✓ Corretto
                        </div>
                      )}

                      {/* Edit Button */}
                      {!isEditing && (
                        <button
                          onClick={() => handleStartCorrection(eq.key)}
                          className="neumorphic-flat p-2 rounded-lg text-[#6b6b6b] hover:text-[#8b7355] transition-colors"
                          title="Correggi valutazione"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      )}
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

                      {/* Analysis / Correction Form */}
                      <div className="space-y-4">
                        {isEditing ? (
                          /* Correction Form */
                          <div className="neumorphic-pressed p-4 rounded-xl bg-yellow-50 border-2 border-yellow-300">
                            <h4 className="font-bold text-[#6b6b6b] mb-3 flex items-center gap-2">
                              <Edit className="w-4 h-4 text-[#8b7355]" />
                              Correggi Valutazione AI
                            </h4>

                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                                  Valutazione Corretta:
                                </label>
                                <select
                                  value={correctionData.status}
                                  onChange={(e) => setCorrectionData({...correctionData, status: e.target.value})}
                                  className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-[#6b6b6b] outline-none bg-transparent"
                                >
                                  <option value="pulito">Pulito</option>
                                  <option value="medio">Medio</option>
                                  <option value="sporco">Sporco</option>
                                  <option value="non_valutabile">Non Valutabile</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                                  Perché l'AI ha sbagliato? (opzionale)
                                </label>
                                <textarea
                                  value={correctionData.note}
                                  onChange={(e) => setCorrectionData({...correctionData, note: e.target.value})}
                                  placeholder="Es: L'AI non ha notato le incrostazioni dietro..."
                                  className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-[#6b6b6b] outline-none h-24 resize-none"
                                />
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveCorrection(eq.key)}
                                  disabled={saveCorrectionMutation.isPending}
                                  className="flex-1 neumorphic-flat px-4 py-2 rounded-lg text-green-700 hover:text-green-800 font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                  {saveCorrectionMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Save className="w-4 h-4" />
                                  )}
                                  Salva Correzione
                                </button>
                                <button
                                  onClick={() => setCorrectingEquipment(null)}
                                  className="neumorphic-flat px-4 py-2 rounded-lg text-[#9b9b9b] hover:text-red-600 transition-colors"
                                >
                                  Annulla
                                </button>
                              </div>
                            </div>

                            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                              <p className="text-xs text-blue-800">
                                💡 Le tue correzioni aiutano l'AI a imparare! La prossima volta sarà più accurata.
                              </p>
                            </div>
                          </div>
                        ) : (
                          /* Analysis Display */
                          <>
                            <div className="neumorphic-pressed p-4 rounded-xl">
                              <h4 className="font-bold text-[#6b6b6b] mb-2 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-[#8b7355]" />
                                {isCorrected ? 'Valutazione Originale AI' : 'Analisi AI'}
                              </h4>
                              <p className="text-sm text-[#6b6b6b] leading-relaxed">
                                {aiNotes || 'Nessuna nota disponibile dall\'AI'}
                              </p>
                            </div>

                            {isCorrected && (
                              <div className="neumorphic-pressed p-4 rounded-xl bg-blue-50 border-2 border-blue-300">
                                <h4 className="font-bold text-blue-700 mb-2 flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4" />
                                  Correzione Applicata
                                </h4>
                                <p className="text-sm text-blue-800 mb-2">
                                  <strong>Stato corretto:</strong> <span className="capitalize">{correctedStatus}</span>
                                </p>
                                {correctionNote && (
                                  <p className="text-sm text-blue-800">
                                    <strong>Nota:</strong> {correctionNote}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Status-specific alerts */}
                            {displayStatus === 'sporco' && (
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

                            {displayStatus === 'medio' && (
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

                            {displayStatus === 'pulito' && (
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
                          </>
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

            {/* All Form Responses */}
            {detailsModalInspection.domande_risposte && detailsModalInspection.domande_risposte.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xl font-bold text-[#6b6b6b] mb-4">📋 Tutte le Risposte del Form</h3>
                
                <div className="space-y-3">
                  {detailsModalInspection.domande_risposte.map((risposta, idx) => (
                    <div key={idx} className="neumorphic-flat p-4 rounded-xl">
                      <div className="flex items-start gap-3">
                        {risposta.tipo_controllo === 'foto' ? (
                          <Camera className="w-5 h-5 text-[#8b7355] flex-shrink-0 mt-0.5" />
                        ) : (
                          <ClipboardCheck className="w-5 h-5 text-[#8b7355] flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#6b6b6b] mb-2">
                            {risposta.domanda_testo}
                          </p>
                          {risposta.tipo_controllo === 'foto' ? (
                            risposta.risposta ? (
                              <img 
                                src={risposta.risposta} 
                                alt={risposta.attrezzatura} 
                                className="w-full max-w-sm h-auto rounded-lg border-2 border-slate-200"
                              />
                            ) : (
                              <p className="text-sm text-slate-500 italic">Nessuna foto caricata</p>
                            )
                          ) : (
                            <span className="inline-block px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-100 text-blue-700">
                              {risposta.risposta}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </NeumorphicCard>
          </div>
        </div>
      )}

      {/* Info Card - UPDATED */}
      <NeumorphicCard className="p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-bold text-blue-800 mb-2">🎓 Sistema di Apprendimento AI</h3>
            <p className="text-sm text-blue-700 mb-2">
              Ogni foto viene analizzata da un'intelligenza artificiale che valuta automaticamente lo stato di pulizia.
            </p>
            <p className="text-sm text-blue-700 mb-2">
              <strong>Nuovo:</strong> Puoi correggere le valutazioni dell'AI! L'AI imparerà dalle tue correzioni e diventerà sempre più accurata nel tempo.
            </p>
            <div className="neumorphic-pressed p-3 rounded-lg bg-white mt-3">
              <p className="text-xs text-blue-800 font-medium">
                📊 Accuratezza attuale: <strong>{accuracyStats.accuracyRate}%</strong> ({accuracyStats.correctedInspections} su {accuracyStats.totalInspections} ispezioni con correzioni)
              </p>
            </div>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}