
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Camera, Upload, Sparkles, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";

export default function FotoLocale() {
  const navigate = useNavigate();
  
  const [selectedStore, setSelectedStore] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
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
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
        setError('Errore nel caricamento utente');
      }
    };
    fetchUser();
  }, []);

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

    if (!currentUser) {
      setError('Utente non identificato');
      return;
    }

    const missingPhotos = equipment.filter(eq => !photos[eq.key]);
    if (missingPhotos.length > 0) {
      setError(`Carica le foto mancanti: ${missingPhotos.map(eq => eq.label).join(', ')}`);
      return;
    }

    try {
      setUploading(true);
      setUploadProgress('Caricamento foto in corso...');

      const uploadedUrls = {};
      for (const eq of equipment) {
        const file = photos[eq.key];
        if (file) {
          setUploadProgress(`Caricamento ${eq.label}...`);
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          uploadedUrls[eq.key] = file_url;
        }
      }

      setUploadProgress('Creazione ispezione...');

      const store = stores.find(s => s.id === selectedStore);
      const inspectionData = {
        store_name: store.name,
        store_id: store.id,
        inspection_date: new Date().toISOString(),
        inspector_name: currentUser.nome_cognome || currentUser.full_name || currentUser.email,
        analysis_status: 'processing'
      };

      equipment.forEach(eq => {
        inspectionData[`${eq.key}_foto_url`] = uploadedUrls[eq.key];
      });

      const inspection = await base44.entities.CleaningInspection.create(inspectionData);

      setUploadProgress('Avvio analisi AI in background...');

      base44.functions.invoke('analyzeCleaningInspection', {
        inspection_id: inspection.id,
        equipment_photos: uploadedUrls
      }).catch(error => {
        console.error('Error starting AI analysis:', error);
      });

      navigate(createPageUrl('Pulizie'));

    } catch (error) {
      console.error('Error processing inspection:', error);
      setError('Errore durante il caricamento: ' + error.message);
      setUploading(false);
    }
  };

  const canSubmit = selectedStore && equipment.every(eq => photos[eq.key]) && currentUser;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Controllo pulizia locale</h1>
        <p className="text-[#9b9b9b]">Carica le foto delle attrezzature</p>
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
                disabled={uploading}
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
                Ispettore
              </label>
              <div className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] bg-gray-50">
                {currentUser ? (currentUser.nome_cognome || currentUser.full_name || currentUser.email) : 'Caricamento...'}
              </div>
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
                      disabled={uploading}
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
                      disabled={uploading}
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
        {uploading && (
          <NeumorphicCard className="p-6 bg-blue-50">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <div>
                <p className="font-bold text-blue-800">{uploadProgress}</p>
                <p className="text-sm text-blue-600">
                  {uploadProgress.includes('background') 
                    ? 'Puoi navigare via - l\'analisi continuerà automaticamente'
                    : 'Attendere prego...'}
                </p>
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
            disabled={uploading}
          >
            Annulla
          </button>
          
          <button
            type="submit"
            disabled={!canSubmit || uploading}
            className={`flex-1 neumorphic-flat px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              canSubmit && !uploading
                ? 'text-[#8b7355] hover:shadow-lg'
                : 'text-[#9b9b9b] opacity-50 cursor-not-allowed'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Caricamento...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Carica e Avvia Analisi
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
            <h3 className="font-bold text-green-800 mb-2">💡 Come funziona</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Scatta foto ben illuminate e a fuoco</li>
              <li>• Inquadra l'intera attrezzatura</li>
              <li>• Dopo il caricamento, l'analisi AI continuerà in background</li>
              <li>• Puoi navigare liberamente - riceverai i risultati nella pagina Storico Pulizie</li>
              <li>• L'analisi richiede circa 1-2 minuti</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}
