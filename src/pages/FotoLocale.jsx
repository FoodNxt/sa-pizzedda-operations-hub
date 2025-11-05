import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Camera, Upload, Sparkles, CheckCircle, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function FotoLocale() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedStore, setSelectedStore] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [photos, setPhotos] = useState({
    forno: null,
    impastatrice: null,
    tavolo_lavoro: null,
    frigo: null,
    cassa: null,
    lavandino: null
  });
  const [previews, setPreviews] = useState({});
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const equipment = [
    { key: 'forno', label: 'Forno', icon: '🔥' },
    { key: 'impastatrice', label: 'Impastatrice', icon: '⚙️' },
    { key: 'tavolo_lavoro', label: 'Tavolo Lavoro', icon: '📋' },
    { key: 'frigo', label: 'Frigo', icon: '❄️' },
    { key: 'cassa', label: 'Cassa', icon: '💰' },
    { key: 'lavandino', label: 'Lavandino', icon: '🚰' }
  ];

  const handlePhotoChange = (equipmentKey, file) => {
    if (file) {
      setPhotos(prev => ({ ...prev, [equipmentKey]: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [equipmentKey]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedStore) {
      setError('Seleziona un locale');
      return;
    }

    // Check if all photos are uploaded
    const missingPhotos = equipment.filter(eq => !photos[eq.key]);
    if (missingPhotos.length > 0) {
      setError(`Carica le foto mancanti: ${missingPhotos.map(eq => eq.label).join(', ')}`);
      return;
    }

    try {
      setUploading(true);
      setUploadProgress('Caricamento foto in corso...');

      // Upload all photos
      const uploadedUrls = {};
      for (const eq of equipment) {
        const file = photos[eq.key];
        if (file) {
          setUploadProgress(`Caricamento ${eq.label}...`);
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          uploadedUrls[eq.key] = file_url;
        }
      }

      setUploading(false);
      setAnalyzing(true);
      setUploadProgress('Analisi AI in corso...');

      // Analyze each photo with AI
      const analysisResults = {};
      const store = stores.find(s => s.id === selectedStore);
      
      for (const eq of equipment) {
        const url = uploadedUrls[eq.key];
        if (url) {
          setUploadProgress(`Analisi ${eq.label} con AI...`);
          
          const prompt = `Analizza questa foto di ${eq.label} in una pizzeria e valuta lo stato di pulizia.

Rispondi in formato JSON con questa struttura esatta:
{
  "pulizia_status": "pulito" | "medio" | "sporco" | "non_valutabile",
  "note": "Descrizione dettagliata dello stato di pulizia",
  "problemi_critici": ["lista", "di", "problemi"] oppure []
}

Criteri di valutazione:
- "pulito": Attrezzatura perfettamente pulita, senza residui visibili
- "medio": Presenza di piccoli residui o macchie, ma condizioni accettabili
- "sporco": Sporco evidente, incrostazioni, residui di cibo, necessita pulizia urgente
- "non_valutabile": Foto non chiara o non mostra l'attrezzatura

Sii molto critico e attento ai dettagli di igiene in una cucina professionale.`;

          try {
            const aiResponse = await base44.integrations.Core.InvokeLLM({
              prompt,
              file_urls: [url],
              response_json_schema: {
                type: "object",
                properties: {
                  pulizia_status: { type: "string" },
                  note: { type: "string" },
                  problemi_critici: { type: "array", items: { type: "string" } }
                }
              }
            });

            analysisResults[eq.key] = aiResponse;
          } catch (aiError) {
            console.error(`Error analyzing ${eq.key}:`, aiError);
            analysisResults[eq.key] = {
              pulizia_status: 'non_valutabile',
              note: 'Errore durante l\'analisi',
              problemi_critici: []
            };
          }
        }
      }

      // Calculate overall score
      const statusScores = { pulito: 100, medio: 60, sporco: 20, non_valutabile: 50 };
      const scores = equipment.map(eq => statusScores[analysisResults[eq.key]?.pulizia_status] || 50);
      const overallScore = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);

      // Collect critical issues
      const allCriticalIssues = equipment
        .map(eq => analysisResults[eq.key]?.problemi_critici || [])
        .flat()
        .filter(Boolean);

      // Create inspection record
      setUploadProgress('Salvataggio dati...');
      const inspectionData = {
        store_name: store.name,
        store_id: store.id,
        inspection_date: new Date().toISOString(),
        inspector_name: inspectorName || 'Anonimo',
        overall_score: overallScore,
        critical_issues: allCriticalIssues.length > 0 ? allCriticalIssues.join('; ') : null
      };

      // Add all equipment data
      equipment.forEach(eq => {
        const result = analysisResults[eq.key];
        inspectionData[`${eq.key}_foto_url`] = uploadedUrls[eq.key];
        inspectionData[`${eq.key}_pulizia_status`] = result?.pulizia_status || 'non_valutabile';
        inspectionData[`${eq.key}_note_ai`] = result?.note || '';
      });

      await base44.entities.CleaningInspection.create(inspectionData);

      // Invalidate queries and navigate
      queryClient.invalidateQueries({ queryKey: ['cleaningInspections'] });
      navigate(createPageUrl('Pulizie'));

    } catch (error) {
      console.error('Error processing inspection:', error);
      setError('Errore durante il caricamento: ' + error.message);
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const isProcessing = uploading || analyzing;
  const canSubmit = selectedStore && equipment.every(eq => photos[eq.key]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Nuova Ispezione Pulizia</h1>
        <p className="text-[#9b9b9b]">Carica le foto delle attrezzature per l'analisi AI</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store Selection */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Informazioni Ispezione</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[#9b9b9b] mb-2 block">
                Locale <span className="text-red-600">*</span>
              </label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                disabled={isProcessing}
                required
              >
                <option value="">Seleziona locale...</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-[#9b9b9b] mb-2 block">
                Nome Ispettore
              </label>
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                placeholder="Il tuo nome (opzionale)"
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                disabled={isProcessing}
              />
            </div>
          </div>
        </NeumorphicCard>

        {/* Photo Upload Grid */}
        <NeumorphicCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Camera className="w-6 h-6 text-[#8b7355]" />
            <h2 className="text-xl font-bold text-[#6b6b6b]">Foto Attrezzature</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipment.map((eq) => (
              <div key={eq.key} className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{eq.icon}</span>
                  <h3 className="font-bold text-[#6b6b6b]">{eq.label}</h3>
                  <span className="text-red-600 ml-auto">*</span>
                </div>

                {previews[eq.key] ? (
                  <div className="relative">
                    <img 
                      src={previews[eq.key]} 
                      alt={eq.label}
                      className="w-full h-48 object-cover rounded-lg mb-3"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotos(prev => ({ ...prev, [eq.key]: null }));
                        setPreviews(prev => ({ ...prev, [eq.key]: null }));
                      }}
                      className="absolute top-2 right-2 neumorphic-flat p-2 rounded-full text-red-600 hover:text-red-700"
                      disabled={isProcessing}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <div className="neumorphic-flat p-8 rounded-lg text-center hover:shadow-lg transition-all">
                      <Upload className="w-8 h-8 text-[#9b9b9b] mx-auto mb-2" />
                      <p className="text-sm text-[#9b9b9b]">Clicca per caricare</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handlePhotoChange(eq.key, e.target.files[0])}
                      className="hidden"
                      disabled={isProcessing}
                    />
                  </label>
                )}

                {photos[eq.key] && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Foto caricata</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </NeumorphicCard>

        {/* Error Message */}
        {error && (
          <NeumorphicCard className="p-4 bg-red-50">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          </NeumorphicCard>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <NeumorphicCard className="p-6 bg-blue-50">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <div>
                <p className="font-bold text-blue-800">{uploadProgress}</p>
                <p className="text-sm text-blue-600">Attendere prego, non chiudere la pagina...</p>
              </div>
            </div>
          </NeumorphicCard>
        )}

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(createPageUrl('Pulizie'))}
            className="neumorphic-flat px-6 py-3 rounded-xl text-[#6b6b6b] hover:text-[#9b9b9b] transition-colors"
            disabled={isProcessing}
          >
            Annulla
          </button>
          
          <button
            type="submit"
            disabled={!canSubmit || isProcessing}
            className={`flex-1 neumorphic-flat px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              canSubmit && !isProcessing
                ? 'text-[#8b7355] hover:shadow-lg'
                : 'text-[#9b9b9b] opacity-50 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Elaborazione...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Analizza con AI
              </>
            )}
          </button>
        </div>
      </form>

      {/* Info Card */}
      <NeumorphicCard className="p-6 bg-green-50">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-green-800 mb-2">💡 Suggerimenti per foto ottimali</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Scatta foto ben illuminate e a fuoco</li>
              <li>• Inquadra l'intera attrezzatura</li>
              <li>• Mostra eventuali punti problematici da vicino</li>
              <li>• L'AI analizzerà automaticamente ogni foto per valutare la pulizia</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}