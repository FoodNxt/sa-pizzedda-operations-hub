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
        
        // Check if user has correct role
        if (user.user_type === 'dipendente' && user.ruolo_dipendente !== 'Cassiere') {
          setError('⚠️ Accesso negato. Questa pagina è riservata ai Cassieri.');
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

    // Check role access
    if (currentUser?.user_type === 'dipendente' && currentUser?.ruolo_dipendente !== 'Cassiere') {
      setError('⚠️ Solo i Cassieri possono compilare questo form');
      return;
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
    !(currentUser?.user_type === 'dipendente' && currentUser?.ruolo_dipendente !== 'Cassiere');

  // Block access if wrong role
  if (currentUser?.user_type === 'dipendente' && currentUser?.ruolo_dipendente !== 'Cassiere') {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <NeumorphicCard className="p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#6b6b6b] mb-2">Accesso Negato</h2>
          <p className="text-[#9b9b9b] mb-4">
            Questa pagina è riservata ai dipendenti con ruolo <strong>Cassiere</strong>.
          </p>
          <p className="text-sm text-[#9b9b9b]">
            Il tuo ruolo attuale: <strong>{currentUser?.ruolo_dipendente || 'Non assegnato'}</strong>
          </p>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Controllo Pulizia Cassiere</h1>
        <p className="text-[#9b9b9b]">Carica le foto delle attrezzature</p>
      </div>

      {/* ... keep existing code (form with Store Selection, Photo Upload Grid, Manual Inspection, Error Message, Processing Status, Submit Button, Info Card) ... */}
    </div>
  );
}