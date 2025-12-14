import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ClipboardCheck, 
  Calendar, 
  MapPin, 
  User, 
  CheckCircle, 
  XCircle,
  Settings,
  X,
  Save,
  AlertCircle
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function ValutazionePulizie() {
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    metodo_calcolo: 'media',
    punteggio_pulito: 100,
    punteggio_sporco: 0,
    pesi_domande: {},
    note: ''
  });

  const queryClient = useQueryClient();

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['cleaning-inspections', selectedStore, selectedRole, dateFrom, dateTo],
    queryFn: async () => {
      let filters = {};
      if (selectedStore) filters.store_id = selectedStore;
      if (selectedRole) filters.inspector_role = selectedRole;
      
      const allInspections = await base44.entities.CleaningInspection.filter(filters, '-inspection_date');
      
      // Filter by date range if specified
      if (dateFrom || dateTo) {
        return allInspections.filter(insp => {
          const inspDate = new Date(insp.inspection_date);
          if (dateFrom && inspDate < new Date(dateFrom)) return false;
          if (dateTo && inspDate > new Date(dateTo + 'T23:59:59')) return false;
          return true;
        });
      }
      
      return allInspections;
    },
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['pulizie-configs'],
    queryFn: () => base44.entities.PulizieConfig.list(),
  });

  const activeConfig = configs.find(c => c.is_active) || null;

  const createConfigMutation = useMutation({
    mutationFn: (data) => base44.entities.PulizieConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulizie-configs'] });
      setShowSettings(false);
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PulizieConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulizie-configs'] });
      setShowSettings(false);
    },
  });

  const calculateScore = (inspection) => {
    if (!inspection.domande_risposte || inspection.domande_risposte.length === 0) {
      return 0;
    }

    const config = activeConfig || {
      metodo_calcolo: 'media',
      punteggio_pulito: 100,
      punteggio_sporco: 0
    };

    const fotoDomande = inspection.domande_risposte.filter(d => d.tipo_controllo === 'foto');
    
    if (fotoDomande.length === 0) return 0;

    let totalScore = 0;
    let totalWeight = 0;

    fotoDomande.forEach(domanda => {
      // Get AI status from inspection fields
      const attrezzatura = domanda.attrezzatura?.toLowerCase().replace(/\s+/g, '_');
      const statusField = `${attrezzatura}_pulizia_status`;
      const correctedField = `${attrezzatura}_corrected_status`;
      
      let status = inspection[correctedField] || inspection[statusField];
      
      // Calculate score based on status
      let score = 0;
      if (status === 'pulito') {
        score = config.punteggio_pulito;
      } else if (status === 'sporco') {
        score = config.punteggio_sporco;
      }

      // Get weight
      const weight = config.metodo_calcolo === 'personalizzato' 
        ? (config.pesi_domande?.[domanda.domanda_id] || 1)
        : 1;

      totalScore += score * weight;
      totalWeight += weight;
    });

    if (config.metodo_calcolo === 'somma') {
      return Math.round(totalScore);
    } else {
      return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    }
  };

  const handleOpenSettings = () => {
    if (activeConfig) {
      setSettingsForm({
        metodo_calcolo: activeConfig.metodo_calcolo,
        punteggio_pulito: activeConfig.punteggio_pulito,
        punteggio_sporco: activeConfig.punteggio_sporco,
        pesi_domande: activeConfig.pesi_domande || {},
        note: activeConfig.note || ''
      });
    } else {
      setSettingsForm({
        metodo_calcolo: 'media',
        punteggio_pulito: 100,
        punteggio_sporco: 0,
        pesi_domande: {},
        note: ''
      });
    }
    setShowSettings(true);
  };

  const handleSaveSettings = () => {
    const data = {
      ...settingsForm,
      is_active: true
    };

    if (activeConfig) {
      updateConfigMutation.mutate({ id: activeConfig.id, data });
    } else {
      createConfigMutation.mutate(data);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Valutazione Pulizie</h1>
          <p className="text-[#9b9b9b]">Visualizza e valuta tutti i form pulizia completati</p>
        </div>
        <NeumorphicButton onClick={handleOpenSettings} className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Impostazioni
        </NeumorphicButton>
      </div>

      {/* Filters */}
      <NeumorphicCard className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Locale</label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            >
              <option value="">Tutti i locali</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Ruolo</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            >
              <option value="">Tutti i ruoli</option>
              <option value="Pizzaiolo">Pizzaiolo</option>
              <option value="Cassiere">Cassiere</option>
              <option value="Store Manager">Store Manager</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Data Da</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Data A</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            />
          </div>
        </div>
      </NeumorphicCard>

      {/* Current Configuration Info */}
      {activeConfig && (
        <NeumorphicCard className="p-4 bg-blue-50">
          <div className="flex items-center gap-2 text-blue-700">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">
              <strong>Metodo calcolo attivo:</strong> {
                activeConfig.metodo_calcolo === 'media' ? 'Media dei punteggi' :
                activeConfig.metodo_calcolo === 'somma' ? 'Somma dei punteggi' :
                'Personalizzato'
              } | 
              <strong> Pulito: {activeConfig.punteggio_pulito}</strong> | 
              <strong> Sporco: {activeConfig.punteggio_sporco}</strong>
            </p>
          </div>
        </NeumorphicCard>
      )}

      {/* Inspections List */}
      <div className="space-y-4">
        {isLoading ? (
          <NeumorphicCard className="p-12 text-center">
            <p className="text-[#9b9b9b]">Caricamento...</p>
          </NeumorphicCard>
        ) : inspections.length === 0 ? (
          <NeumorphicCard className="p-12 text-center">
            <ClipboardCheck className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">Nessuna ispezione trovata</h3>
            <p className="text-[#9b9b9b]">Non ci sono form pulizia completati con i filtri selezionati</p>
          </NeumorphicCard>
        ) : (
          inspections.map((inspection) => {
            const score = calculateScore(inspection);
            const scoreColor = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-orange-600' : 'text-red-600';
            
            return (
              <NeumorphicCard key={inspection.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <div className={`text-3xl font-bold ${scoreColor}`}>
                        {score}%
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[#6b6b6b]">{inspection.store_name}</h3>
                        <div className="flex items-center gap-4 text-sm text-[#9b9b9b] mt-1">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {inspection.inspector_name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(inspection.inspection_date), "d MMM yyyy 'alle' HH:mm", { locale: it })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Questions Results */}
                    <div className="space-y-2 mt-4">
                      {inspection.domande_risposte?.filter(d => d.tipo_controllo === 'foto').map((domanda, idx) => {
                        const attrezzatura = domanda.attrezzatura?.toLowerCase().replace(/\s+/g, '_');
                        const statusField = `${attrezzatura}_pulizia_status`;
                        const correctedField = `${attrezzatura}_corrected_status`;
                        const status = inspection[correctedField] || inspection[statusField];
                        
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                            <span className="text-sm text-[#6b6b6b]">{domanda.attrezzatura}</span>
                            <div className="flex items-center gap-2">
                              {status === 'pulito' ? (
                                <>
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-medium text-green-600">Pulito</span>
                                </>
                              ) : status === 'sporco' ? (
                                <>
                                  <XCircle className="w-5 h-5 text-red-600" />
                                  <span className="text-sm font-medium text-red-600">Sporco</span>
                                </>
                              ) : (
                                <span className="text-sm text-[#9b9b9b]">Non valutato</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="ml-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      inspection.inspector_role === 'Pizzaiolo' ? 'bg-orange-100 text-orange-700' :
                      inspection.inspector_role === 'Cassiere' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {inspection.inspector_role}
                    </span>
                  </div>
                </div>
              </NeumorphicCard>
            );
          })
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="bg-white p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#6b6b6b]">Impostazioni Calcolo Punteggio</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="neumorphic-flat p-2 rounded-lg text-[#9b9b9b] hover:text-[#6b6b6b]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                  Metodo di Calcolo
                </label>
                <select
                  value={settingsForm.metodo_calcolo}
                  onChange={(e) => setSettingsForm({ ...settingsForm, metodo_calcolo: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                >
                  <option value="media">Media dei punteggi (consigliato)</option>
                  <option value="somma">Somma dei punteggi</option>
                  <option value="personalizzato">Personalizzato (con pesi)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  {settingsForm.metodo_calcolo === 'media' && 'Il punteggio finale è la media di tutte le valutazioni'}
                  {settingsForm.metodo_calcolo === 'somma' && 'Il punteggio finale è la somma di tutte le valutazioni'}
                  {settingsForm.metodo_calcolo === 'personalizzato' && 'Puoi assegnare pesi diversi alle domande (funzionalità avanzata)'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                    Punteggio "Pulito"
                  </label>
                  <input
                    type="number"
                    value={settingsForm.punteggio_pulito}
                    onChange={(e) => setSettingsForm({ ...settingsForm, punteggio_pulito: parseInt(e.target.value) || 0 })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                    Punteggio "Sporco"
                  </label>
                  <input
                    type="number"
                    value={settingsForm.punteggio_sporco}
                    onChange={(e) => setSettingsForm({ ...settingsForm, punteggio_sporco: parseInt(e.target.value) || 0 })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                  Note (opzionale)
                </label>
                <textarea
                  value={settingsForm.note}
                  onChange={(e) => setSettingsForm({ ...settingsForm, note: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none h-24"
                  placeholder="Aggiungi note sulla configurazione..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowSettings(false)}
                  className="neumorphic-flat px-6 py-3 rounded-xl text-[#6b6b6b] hover:text-[#9b9b9b]"
                >
                  Annulla
                </button>
                <NeumorphicButton
                  onClick={handleSaveSettings}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Salva Configurazione
                </NeumorphicButton>
              </div>
            </div>
          </NeumorphicCard>
        </div>
      )}
    </div>
  );
}