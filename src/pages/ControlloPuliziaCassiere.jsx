
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Camera, Upload, Sparkles, CheckCircle, AlertCircle, Loader2, ClipboardCheck } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";

export default function ControlloPuliziaCassiere() {
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
  
  const [manualInspection, setManualInspection] = useState({
    pulizia_pavimenti_angoli: '',
    pulizia_tavoli_sala: '',
    pulizia_vetrata_ingresso: '',
    pulizia_tavolette_takeaway: '',
    etichette_prodotti_aperti: '',
    cartoni_pizza_pronti: ''
  });
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');

  // Get current user and check role
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        // Check if user has correct role - UPDATED to check array
        if (user.user_type === 'dipendente') {
          const userRoles = user.ruoli_dipendente || [];
          if (!userRoles.includes('Cassiere')) {
            setError('⚠️ Accesso negato. Questa pagina è riservata ai Cassieri.');
          }
        }
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

    // Check role access - UPDATED to check array
    if (currentUser?.user_type === 'dipendente') {
      const userRoles = currentUser.ruoli_dipendente || [];
      if (!userRoles.includes('Cassiere')) {
        setError('⚠️ Solo i Cassieri possono compilare questo form');
        return;
      }
    }

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

    const missingFields = [];
    if (!manualInspection.pulizia_pavimenti_angoli) missingFields.push('Pulizia pavimenti');
    if (!manualInspection.pulizia_tavoli_sala) missingFields.push('Pulizia tavoli');
    if (!manualInspection.pulizia_vetrata_ingresso) missingFields.push('Pulizia vetrata');
    if (!manualInspection.pulizia_tavolette_takeaway) missingFields.push('Pulizia tavolette');
    if (!manualInspection.etichette_prodotti_aperti) missingFields.push('Etichette prodotti');
    if (!manualInspection.cartoni_pizza_pronti) missingFields.push('Cartoni pizza');
    
    if (missingFields.length > 0) {
      setError(`Completa i seguenti campi: ${missingFields.join(', ')}`);
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
        analysis_status: 'processing',
        inspection_type: 'cassiere',
        ...manualInspection
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

  const canSubmit = selectedStore && 
    equipment.every(eq => photos[eq.key]) && 
    currentUser &&
    manualInspection.pulizia_pavimenti_angoli &&
    manualInspection.pulizia_tavoli_sala &&
    manualInspection.pulizia_vetrata_ingresso &&
    manualInspection.pulizia_tavolette_takeaway &&
    manualInspection.etichette_prodotti_aperti &&
    manualInspection.cartoni_pizza_pronti &&
    !(currentUser?.user_type === 'dipendente' && !(currentUser.ruoli_dipendente || []).includes('Cassiere'));

  // Block access if wrong role - UPDATED to check array
  if (currentUser?.user_type === 'dipendente') {
    const userRoles = currentUser.ruoli_dipendente || [];
    if (!userRoles.includes('Cassiere')) {
      return (
        <div className="max-w-5xl mx-auto space-y-6">
          <NeumorphicCard className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#6b6b6b] mb-2">Accesso Negato</h2>
            <p className="text-[#9b9b9b] mb-4">
              Questa pagina è riservata ai dipendenti con ruolo <strong>Cassiere</strong>.
            </p>
            <p className="text-sm text-[#9b9b9b]">
              I tuoi ruoli attuali: <strong>{userRoles.length > 0 ? userRoles.join(', ') : 'Nessun ruolo assegnato'}</strong>
            </p>
          </NeumorphicCard>
        </div>
      );
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Controllo Pulizia Cassiere</h1>
        <p className="text-[#9b9b9b]">Carica le foto delle attrezzature e compila il check di pulizia.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store Selection */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-semibold text-[#6b6b6b] mb-4 flex items-center">
            <ClipboardCheck className="mr-2" size={20} /> Selezione Locale
          </h2>
          <select
            className="w-full p-3 bg-[#e0e0e0] text-[#6b6b6b] rounded-md shadow-inner-neumorphic focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            disabled={uploading}
          >
            <option value="">Seleziona un locale</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </NeumorphicCard>

        {/* Photo Upload Grid */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-semibold text-[#6b6b6b] mb-4 flex items-center">
            <Camera className="mr-2" size={20} /> Carica Foto Attrezzature
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipment.map((item) => (
              <div key={item.key} className="flex flex-col items-center">
                <label className="block text-sm font-medium text-[#6b6b6b] mb-2 cursor-pointer neumorphic-button hover:neumorphic-button-hover active:neumorphic-button-active">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoChange(item.key, e.target.files[0])}
                    disabled={uploading}
                  />
                  <span className="flex items-center justify-center p-3">
                    <Upload className="mr-2" size={20} /> Carica Foto {item.label} {item.icon}
                  </span>
                </label>
                {previews[item.key] && (
                  <img
                    src={previews[item.key]}
                    alt={item.label}
                    className="mt-2 rounded-md w-32 h-32 object-cover shadow-neumorphic-card"
                  />
                )}
                {photos[item.key] && (
                  <p className="text-sm text-green-600 mt-1 flex items-center">
                    <CheckCircle className="mr-1" size={16} /> Caricata
                  </p>
                )}
              </div>
            ))}
          </div>
        </NeumorphicCard>

        {/* Manual Inspection */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-semibold text-[#6b6b6b] mb-4 flex items-center">
            <Sparkles className="mr-2" size={20} /> Controllo Pulizia Manuale
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(manualInspection).map((key) => (
              <div key={key}>
                <label htmlFor={key} className="block text-sm font-medium text-[#6b6b6b] mb-1">
                  {key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                </label>
                <select
                  id={key}
                  className="w-full p-3 bg-[#e0e0e0] text-[#6b6b6b] rounded-md shadow-inner-neumorphic focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={manualInspection[key]}
                  onChange={(e) => setManualInspection({ ...manualInspection, [key]: e.target.value })}
                  disabled={uploading}
                >
                  <option value="">Seleziona stato</option>
                  <option value="ottimo">Ottimo</option>
                  <option value="buono">Buono</option>
                  <option value="sufficiente">Sufficiente</option>
                  <option value="insufficiente">Insufficiente</option>
                </select>
              </div>
            ))}
          </div>
        </NeumorphicCard>

        {/* Error Message */}
        {error && (
          <NeumorphicCard className="p-4 bg-red-100 border border-red-400 text-red-700">
            <AlertCircle className="inline mr-2" size={20} /> {error}
          </NeumorphicCard>
        )}

        {/* Processing Status */}
        {uploading && (
          <NeumorphicCard className="p-4 bg-blue-100 border border-blue-400 text-blue-700 flex items-center">
            <Loader2 className="animate-spin mr-2" size={20} /> {uploadProgress}
          </NeumorphicCard>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className={`w-full p-4 text-lg font-bold rounded-xl shadow-neumorphic-button 
            ${canSubmit && !uploading 
              ? 'bg-[#A8E6CF] text-[#3a7d5b] hover:shadow-neumorphic-button-hover active:shadow-neumorphic-button-active' 
              : 'bg-[#cccccc] text-[#9b9b9b] cursor-not-allowed'
            }`}
          disabled={!canSubmit || uploading}
        >
          {uploading ? 'Invio in corso...' : 'Invia Controllo Pulizia'}
        </button>
      </form>
    </div>
  );
}
