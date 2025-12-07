import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Sparkles, Camera, Calendar, Store, CheckCircle, AlertTriangle, XCircle, Plus, ChevronRight, X, Loader2, Edit, Save, TrendingUp, ClipboardCheck, Users, Clock, Settings, Eye, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format, parseISO, subDays } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Pulizie() {
  const [activeView, setActiveView] = useState('dipendenti'); // 'dipendenti', 'store_manager', 'per_locale'
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateFilter, setDateFilter] = useState('month');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [detailsModalInspection, setDetailsModalInspection] = useState(null);
  const [correctingEquipment, setCorrectingEquipment] = useState(null);
  const [correctionData, setCorrectionData] = useState({});
  const [expandedLocale, setExpandedLocale] = useState({});

  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['cleaningInspections'],
    queryFn: () => base44.entities.CleaningInspection.list('-inspection_date'),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-pulizie'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.user_type === 'dipendente' || u.user_type === 'user');
    },
  });

  const { data: smConfigs = [] } = useQuery({
    queryKey: ['controllo-sm-config'],
    queryFn: () => base44.entities.ControlloSMConfig.list(),
  });

  const currentConfig = smConfigs[0];

  // Filter inspections for dipendenti (Cassiere/Pizzaiolo)
  const filteredInspections = inspections.filter(inspection => {
    // Escludi controlli Store Manager dalla vista dipendenti
    if (inspection.inspector_role === 'Store Manager') return false;
    
    if (selectedStore !== 'all' && inspection.store_id !== selectedStore) return false;

    const inspectionDate = new Date(inspection.inspection_date);
    const now = new Date();
    const daysDiff = Math.floor((now - inspectionDate) / (1000 * 60 * 60 * 24));

    if (dateFilter === 'week' && daysDiff > 7) return false;
    if (dateFilter === 'month' && daysDiff > 30) return false;

    // Filter by role
    if (roleFilter !== 'all' && inspection.inspector_role !== roleFilter) return false;

    return true;
  });

  // Filter inspections for Store Manager
  const smInspections = useMemo(() => {
    return inspections.filter(inspection => {
      const isStoreManagerForm = inspection.inspector_role === 'Store Manager' || inspection.inspection_type === 'store_manager';
      if (!isStoreManagerForm) return false;
      if (inspection.analysis_status !== 'completed') return false;
      
      if (selectedStore !== 'all' && inspection.store_id !== selectedStore) return false;

      const inspectionDate = new Date(inspection.inspection_date);
      const now = new Date();
      const daysDiff = Math.floor((now - inspectionDate) / (1000 * 60 * 60 * 24));

      if (dateFilter === 'week' && daysDiff > 7) return false;
      if (dateFilter === 'month' && daysDiff > 30) return false;

      return true;
    });
  }, [inspections, selectedStore, dateFilter]);

  // Get employees who were on shift from 21:30 onwards the day before the inspection
  const getAssignedEmployees = (inspection) => {
    if (!inspection) return [];

    const inspectionDate = parseISO(inspection.inspection_date);
    const previousDay = subDays(inspectionDate, 1);
    const previousDayStr = format(previousDay, 'yyyy-MM-dd');
    const inspectionStoreId = inspection.store_id;

    const eveningShifts = shifts.filter(shift => {
      if (shift.store_id !== inspectionStoreId) return false;
      if (!shift.shift_date || !shift.scheduled_start) return false;

      const shiftDateStr = shift.shift_date.split('T')[0];
      if (shiftDateStr !== previousDayStr) return false;

      const startTime = shift.scheduled_start || shift.actual_start;
      if (!startTime) return false;

      const startDate = parseISO(startTime);
      const hours = startDate.getHours();
      const minutes = startDate.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      return totalMinutes >= 1290;
    });

    const employeeMap = new Map();
    eveningShifts.forEach(shift => {
      if (!employeeMap.has(shift.employee_name)) {
        const user = users.find(u => 
          (u.nome_cognome || u.full_name || u.email) === shift.employee_name
        );
        employeeMap.set(shift.employee_name, {
          employeeName: shift.employee_name,
          userId: user?.id,
          roles: user?.ruoli_dipendente || []
        });
      }
    });

    return Array.from(employeeMap.values());
  };

  // Filter SM inspections by selected employee
  const filteredSMInspections = useMemo(() => {
    if (selectedEmployee === 'all') return smInspections;
    
    return smInspections.filter(inspection => {
      const employees = getAssignedEmployees(inspection);
      return employees.some(emp => emp.employeeName === selectedEmployee);
    });
  }, [smInspections, selectedEmployee, shifts, users]);

  // Get unique employees from all SM inspections for filter
  const allAssignedEmployees = useMemo(() => {
    const employeeSet = new Set();
    smInspections.forEach(inspection => {
      const employees = getAssignedEmployees(inspection);
      employees.forEach(emp => employeeSet.add(emp.employeeName));
    });
    return Array.from(employeeSet).sort();
  }, [smInspections, shifts, users]);

  // Calculate if inspection passed based on percentage
  const calculateInspectionResult = (inspection) => {
    const threshold = currentConfig?.percentuale_superamento || 70;
    const score = inspection.overall_score || 0;
    return {
      passed: score >= threshold,
      score,
      threshold
    };
  };

  // SM Stats
  const smStats = useMemo(() => {
    const total = filteredSMInspections.length;
    const passed = filteredSMInspections.filter(i => calculateInspectionResult(i).passed).length;
    const failed = total - passed;
    const avgScore = total > 0 
      ? filteredSMInspections.reduce((sum, i) => sum + (i.overall_score || 0), 0) / total 
      : 0;

    return { total, passed, failed, avgScore };
  }, [filteredSMInspections, currentConfig]);

  // Stats per locale
  const statsPerLocale = useMemo(() => {
    return stores.map(store => {
      // Ispezioni dipendenti per questo store
      const storeInspections = inspections.filter(i => 
        i.store_id === store.id && 
        i.analysis_status === 'completed' &&
        i.inspector_role !== 'Store Manager'
      );
      
      // Ispezioni SM per questo store
      const storeSMInspections = inspections.filter(i => 
        i.store_id === store.id && 
        i.analysis_status === 'completed' &&
        (i.inspector_role === 'Store Manager' || i.inspection_type === 'store_manager')
      );

      const avgScoreDipendenti = storeInspections.length > 0 
        ? storeInspections.reduce((sum, i) => sum + (i.overall_score || 0), 0) / storeInspections.length 
        : 0;

      const avgScoreSM = storeSMInspections.length > 0 
        ? storeSMInspections.reduce((sum, i) => sum + (i.overall_score || 0), 0) / storeSMInspections.length 
        : 0;

      const threshold = currentConfig?.percentuale_superamento || 70;
      const smPassed = storeSMInspections.filter(i => (i.overall_score || 0) >= threshold).length;
      const smFailed = storeSMInspections.length - smPassed;

      return {
        store,
        inspectionsDipendenti: storeInspections,
        inspectionsSM: storeSMInspections,
        totalDipendenti: storeInspections.length,
        totalSM: storeSMInspections.length,
        avgScoreDipendenti: Math.round(avgScoreDipendenti),
        avgScoreSM: Math.round(avgScoreSM),
        smPassed,
        smFailed
      };
    }).filter(s => s.totalDipendenti > 0 || s.totalSM > 0);
  }, [stores, inspections, currentConfig]);

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

  // Get all photos from domande_risposte for this inspection
  const getAllPhotosFromRisposte = (inspection) => {
    if (!inspection.domande_risposte) return [];
    return inspection.domande_risposte
      .filter(r => r.tipo_controllo === 'foto' && r.risposta)
      .map(r => ({
        domanda_id: r.domanda_id,
        domanda_testo: r.domanda_testo,
        attrezzatura: r.attrezzatura,
        foto_url: r.risposta
      }));
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CleaningInspection.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaningInspections'] });
      setDetailsModalInspection(null);
    },
  });

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
          <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Storico Pulizie</h1>
          <p className="text-[#9b9b9b]">Sistema di ispezione con analisi AI</p>
        </div>
        <Link to={createPageUrl('FotoLocale')}>
          <NeumorphicButton variant="primary" className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Nuova Ispezione
          </NeumorphicButton>
        </Link>
      </div>

      {/* View Toggle */}
      <NeumorphicCard className="p-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveView('dipendenti')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
              activeView === 'dipendenti' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                : 'neumorphic-flat text-[#6b6b6b]'
            }`}
          >
            <Users className="w-5 h-5" />
            Form Dipendenti
          </button>
          <button
            onClick={() => setActiveView('store_manager')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
              activeView === 'store_manager' 
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg' 
                : 'neumorphic-flat text-[#6b6b6b]'
            }`}
          >
            <Settings className="w-5 h-5" />
            Controlli SM
          </button>
          <button
            onClick={() => setActiveView('per_locale')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
              activeView === 'per_locale' 
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg' 
                : 'neumorphic-flat text-[#6b6b6b]'
            }`}
          >
            <Store className="w-5 h-5" />
            Per Locale
          </button>
        </div>
      </NeumorphicCard>

      {/* Stats - UPDATED with accuracy */}
      {activeView === 'dipendenti' && (
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
      )}

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

        <NeumorphicCard className="px-4 py-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none"
          >
            <option value="all">Tutti i Ruoli</option>
            <option value="Pizzaiolo">Pizzaiolo</option>
            <option value="Cassiere">Cassiere</option>
            <option value="Store Manager">Store Manager</option>
          </select>
        </NeumorphicCard>
      </div>

      {/* Inspections List */}
      {activeView === 'dipendenti' && (
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Storico Ispezioni Dipendenti</h2>

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
      )}

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
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (confirm('Eliminare questa ispezione?')) {
                      deleteMutation.mutate(detailsModalInspection.id);
                    }
                  }}
                  className="neumorphic-flat p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  title="Elimina ispezione"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {setDetailsModalInspection(null); setCorrectingEquipment(null);}}
                  className="neumorphic-flat p-2 rounded-lg text-[#6b6b6b] hover:text-red-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
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

            {/* All Form Responses + Equipment Photos with AI Analysis */}
            <div className="mt-6">
              <h3 className="text-xl font-bold text-[#6b6b6b] mb-4">📋 Dettagli Completi Ispezione</h3>

              {detailsModalInspection.domande_risposte && detailsModalInspection.domande_risposte.length > 0 ? (
                <div className="space-y-3">
                  {detailsModalInspection.domande_risposte.map((risposta, idx) => {
                    const isFoto = risposta.tipo_controllo === 'foto' || risposta.tipo_controllo === 'photo' || (risposta.risposta && typeof risposta.risposta === 'string' && risposta.risposta.startsWith('http'));

                    // Find equipment key for AI analysis
                    const equipmentKey = risposta.attrezzatura ? risposta.attrezzatura.toLowerCase().replace(/\s+/g, '_') : null;
                    const aiStatus = equipmentKey ? detailsModalInspection[`${equipmentKey}_pulizia_status`] : null;
                    const aiNotes = equipmentKey ? detailsModalInspection[`${equipmentKey}_note_ai`] : null;
                    const isCorrected = equipmentKey ? detailsModalInspection[`${equipmentKey}_corrected`] : false;
                    const correctedStatus = equipmentKey ? detailsModalInspection[`${equipmentKey}_corrected_status`] : null;
                    const correctionNote = equipmentKey ? detailsModalInspection[`${equipmentKey}_correction_note`] : null;
                    const displayStatus = isCorrected ? correctedStatus : aiStatus;
                    const isEditing = correctingEquipment === equipmentKey;

                    return (
                      <div key={idx} className="neumorphic-flat p-4 rounded-xl">
                        <div className="flex items-start gap-3">
                          {isFoto ? (
                            <Camera className="w-5 h-5 text-[#8b7355] flex-shrink-0 mt-0.5" />
                          ) : (
                            <ClipboardCheck className="w-5 h-5 text-[#8b7355] flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-bold text-[#6b6b6b]">
                                {risposta.domanda_testo || risposta.attrezzatura || `Domanda ${idx + 1}`}
                              </p>
                              {isFoto && aiStatus && !isEditing && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartCorrection(equipmentKey);
                                  }}
                                  className="nav-button p-1 rounded text-xs flex items-center gap-1"
                                >
                                  <Edit className="w-3 h-3" />
                                  Correggi AI
                                </button>
                              )}
                            </div>

                            {isFoto ? (
                              risposta.risposta ? (
                                <div>
                                  <img 
                                    src={risposta.risposta} 
                                    alt={risposta.attrezzatura || `Foto ${idx + 1}`} 
                                    className="w-full max-w-md h-auto rounded-lg border-2 border-slate-200 mb-3"
                                  />

                                  {/* AI Analysis or Correction Form */}
                                  {isEditing ? (
                                    <div className="neumorphic-pressed p-3 rounded-lg bg-yellow-50 border border-yellow-300 mt-2">
                                      <h4 className="text-xs font-bold text-[#6b6b6b] mb-2 flex items-center gap-1">
                                        <Edit className="w-3 h-3" />
                                        Correggi Valutazione AI
                                      </h4>
                                      <div className="space-y-2">
                                        <select
                                          value={correctionData.status}
                                          onChange={(e) => setCorrectionData({...correctionData, status: e.target.value})}
                                          className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-sm outline-none"
                                        >
                                          <option value="pulito">Pulito</option>
                                          <option value="medio">Medio</option>
                                          <option value="sporco">Sporco</option>
                                          <option value="non_valutabile">Non Valutabile</option>
                                        </select>
                                        <textarea
                                          value={correctionData.note}
                                          onChange={(e) => setCorrectionData({...correctionData, note: e.target.value})}
                                          placeholder="Perché l'AI ha sbagliato?"
                                          className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-sm outline-none h-16 resize-none"
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => handleSaveCorrection(equipmentKey)}
                                            className="flex-1 nav-button px-3 py-1 rounded-lg text-xs text-green-700 hover:bg-green-50"
                                          >
                                            <Save className="w-3 h-3 inline mr-1" />
                                            Salva
                                          </button>
                                          <button
                                            onClick={() => setCorrectingEquipment(null)}
                                            className="nav-button px-3 py-1 rounded-lg text-xs text-slate-600"
                                          >
                                            Annulla
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : aiStatus ? (
                                    <div className="space-y-2">
                                      <div className={`px-3 py-2 rounded-lg border ${getStatusColor(displayStatus)}`}>
                                        <div className="flex items-center justify-between">
                                          {getStatusIcon(displayStatus)}
                                          <span className="text-sm font-bold capitalize">{displayStatus}</span>
                                        </div>
                                      </div>
                                      <div className="neumorphic-pressed p-3 rounded-lg bg-slate-50">
                                        <p className="text-xs font-medium text-slate-600 mb-1">
                                          {isCorrected ? 'Valutazione originale AI:' : 'Analisi AI:'}
                                        </p>
                                        <p className="text-xs text-slate-700">{aiNotes || 'Nessuna nota'}</p>
                                      </div>
                                      {isCorrected && (
                                        <div className="neumorphic-pressed p-3 rounded-lg bg-blue-50 border border-blue-200">
                                          <p className="text-xs font-medium text-blue-700 mb-1">✓ Corretto a: {correctedStatus}</p>
                                          {correctionNote && (
                                            <p className="text-xs text-blue-600">{correctionNote}</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <p className="text-sm text-slate-500 italic">Nessuna foto caricata</p>
                              )
                            ) : (
                              <span className="inline-block px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-100 text-blue-700">
                                {risposta.risposta || 'Nessuna risposta'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Fallback per vecchi form senza domande_risposte - mostra le foto delle attrezzature e altri campi */
                <div className="space-y-3">
                  {/* Foto attrezzature */}
                  {equipment.map((eq) => {
                    const photoUrl = detailsModalInspection[`${eq.key}_foto_url`];
                    const aiStatus = detailsModalInspection[`${eq.key}_pulizia_status`];
                    const isCorrected = detailsModalInspection[`${eq.key}_corrected`];
                    const correctedStatus = detailsModalInspection[`${eq.key}_corrected_status`];
                    const displayStatus = isCorrected ? correctedStatus : aiStatus;

                    if (!photoUrl) return null;

                    return (
                      <div key={eq.key} className="neumorphic-flat p-4 rounded-xl">
                        <div className="flex items-start gap-3">
                          <Camera className="w-5 h-5 text-[#8b7355] flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="text-sm font-bold text-[#6b6b6b]">
                                {eq.icon} Foto: {eq.name}
                              </p>
                              {displayStatus && (
                                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(displayStatus)}`}>
                                  {displayStatus}
                                </span>
                              )}
                            </div>
                            <img 
                              src={photoUrl} 
                              alt={eq.name} 
                              className="w-full max-w-md h-auto rounded-lg border-2 border-slate-200"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Campi manuali del form vecchio */}
                  {detailsModalInspection.pulizia_pavimenti_angoli && (
                    <div className="neumorphic-flat p-4 rounded-xl">
                      <div className="flex items-start gap-3">
                        <ClipboardCheck className="w-5 h-5 text-[#8b7355] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-[#6b6b6b] mb-1">Pulizia Pavimenti e Angoli</p>
                          <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getStatusColor(detailsModalInspection.pulizia_pavimenti_angoli)}`}>
                            {detailsModalInspection.pulizia_pavimenti_angoli}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {detailsModalInspection.pulizia_tavoli_sala && (
                    <div className="neumorphic-flat p-4 rounded-xl">
                      <div className="flex items-start gap-3">
                        <ClipboardCheck className="w-5 h-5 text-[#8b7355] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-[#6b6b6b] mb-1">Pulizia Tavoli Sala</p>
                          <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getStatusColor(detailsModalInspection.pulizia_tavoli_sala)}`}>
                            {detailsModalInspection.pulizia_tavoli_sala}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {detailsModalInspection.pulizia_vetrata_ingresso && (
                    <div className="neumorphic-flat p-4 rounded-xl">
                      <div className="flex items-start gap-3">
                        <ClipboardCheck className="w-5 h-5 text-[#8b7355] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-[#6b6b6b] mb-1">Pulizia Vetrata Ingresso</p>
                          <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getStatusColor(detailsModalInspection.pulizia_vetrata_ingresso)}`}>
                            {detailsModalInspection.pulizia_vetrata_ingresso}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {detailsModalInspection.pulizia_tavolette_takeaway && (
                    <div className="neumorphic-flat p-4 rounded-xl">
                      <div className="flex items-start gap-3">
                        <ClipboardCheck className="w-5 h-5 text-[#8b7355] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-[#6b6b6b] mb-1">Pulizia Tavolette Takeaway</p>
                          <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getStatusColor(detailsModalInspection.pulizia_tavolette_takeaway)}`}>
                            {detailsModalInspection.pulizia_tavolette_takeaway}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {detailsModalInspection.etichette_prodotti_aperti && (
                    <div className="neumorphic-flat p-4 rounded-xl">
                      <div className="flex items-start gap-3">
                        <ClipboardCheck className="w-5 h-5 text-[#8b7355] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-[#6b6b6b] mb-1">Etichette Prodotti Aperti</p>
                          <span className="px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-700">
                            {detailsModalInspection.etichette_prodotti_aperti?.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {detailsModalInspection.cartoni_pizza_pronti && (
                    <div className="neumorphic-flat p-4 rounded-xl">
                      <div className="flex items-start gap-3">
                        <ClipboardCheck className="w-5 h-5 text-[#8b7355] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-[#6b6b6b] mb-1">Cartoni Pizza Pronti</p>
                          <span className="px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-700">
                            {detailsModalInspection.cartoni_pizza_pronti?.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            </NeumorphicCard>
          </div>
        </div>
      )}

      {/* Info Card - UPDATED */}
      {activeView === 'dipendenti' && (
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
      )}

      {/* Store Manager Results View */}
      {activeView === 'store_manager' && (
        <>
          {/* SM Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <NeumorphicCard className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">{smStats.total}</p>
              <p className="text-xs text-slate-500">Controlli Totali</p>
            </NeumorphicCard>
            <NeumorphicCard className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{smStats.passed}</p>
              <p className="text-xs text-slate-500">Superati</p>
            </NeumorphicCard>
            <NeumorphicCard className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{smStats.failed}</p>
              <p className="text-xs text-slate-500">Non Superati</p>
            </NeumorphicCard>
            <NeumorphicCard className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{smStats.avgScore.toFixed(1)}%</p>
              <p className="text-xs text-slate-500">Media Punteggio</p>
            </NeumorphicCard>
          </div>

          {/* SM Employee Filter */}
          <NeumorphicCard className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-slate-700">Filtra per Dipendente</span>
            </div>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
            >
              <option value="all">Tutti i dipendenti</option>
              {allAssignedEmployees.map(emp => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
          </NeumorphicCard>

          {/* SM Inspections List */}
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Controlli Store Manager</h2>
            
            {filteredSMInspections.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nessun controllo trovato</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSMInspections.slice(0, 50).map(inspection => {
                  const result = calculateInspectionResult(inspection);
                  const assignedEmployees = getAssignedEmployees(inspection);
                  
                  return (
                    <div key={inspection.id} className={`neumorphic-pressed p-4 rounded-xl border-2 ${
                      result.passed ? 'border-green-200' : 'border-red-200'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-slate-800">{inspection.store_name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              result.passed 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {result.score}% {result.passed ? '✓' : '✗'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {format(parseISO(inspection.inspection_date), 'dd MMM yyyy HH:mm', { locale: it })}
                            </span>
                            {inspection.inspector_name && (
                              <span>Compilato da: {inspection.inspector_name}</span>
                            )}
                          </div>

                          {/* Assigned Employees */}
                          <div className="mt-2">
                            <p className="text-xs text-slate-500 mb-1">Dipendenti assegnati (turno sera precedente):</p>
                            {assignedEmployees.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {assignedEmployees.map((emp, idx) => (
                                  <span key={idx} className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full border border-purple-200">
                                    {emp.employeeName}
                                    {emp.roles.length > 0 && ` (${emp.roles.join(', ')})`}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-orange-600">
                                <AlertTriangle className="w-3 h-3 inline mr-1" />
                                Nessun dipendente in turno dalle 21:30 il giorno precedente
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => setDetailsModalInspection(inspection)}
                          className="nav-button p-2 rounded-lg ml-4"
                        >
                          <Eye className="w-4 h-4 text-slate-600" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </NeumorphicCard>

          {/* Info Card SM */}
          <NeumorphicCard className="p-6 bg-purple-50">
            <div className="flex items-start gap-3">
              <Clock className="w-6 h-6 text-purple-600" />
              <div>
                <h3 className="font-bold text-purple-800 mb-2">Come Funziona</h3>
                <p className="text-sm text-purple-700 mb-2">
                  I controlli dello Store Manager vengono assegnati ai dipendenti che erano in turno <strong>il giorno precedente dalle 21:30 in poi</strong>.
                </p>
                <p className="text-sm text-purple-700">
                  Se il punteggio è inferiore alla soglia impostata ({currentConfig?.percentuale_superamento || 70}%), il controllo risulta non superato.
                </p>
              </div>
            </div>
          </NeumorphicCard>
        </>
      )}
    </div>
  );
}