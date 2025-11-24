import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Camera, Upload, CheckCircle, AlertCircle, Loader2, ClipboardCheck } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";

export default function ControlloPuliziaPizzaiolo() {
  const navigate = useNavigate();
  
  const [selectedStore, setSelectedStore] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [photos, setPhotos] = useState({});
  const [previews, setPreviews] = useState({});
  const [risposte, setRisposte] = useState({});
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        if (user.user_type === 'dipendente') {
          const userRoles = user.ruoli_dipendente || [];
          if (!userRoles.includes('Pizzaiolo')) {
            setError('⚠️ Accesso negato. Questa pagina è riservata ai Pizzaioli.');
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

  const { data: domande = [], isLoading: isLoadingDomande } = useQuery({
    queryKey: ['domande-pulizia-pizzaiolo'],
    queryFn: async () => {
      const allDomande = await base44.entities.DomandaPulizia.list('ordine');
      return allDomande.filter(d => 
        d.attiva !== false && 
        d.ruoli_assegnati?.includes('Pizzaiolo')
      );
    },
  });

  const handlePhotoChange = (questionId, file) => {
    if (file) {
      setPhotos(prev => ({ ...prev, [questionId]: file }));
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [questionId]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (currentUser?.user_type === 'dipendente') {
      const userRoles = currentUser.ruoli_dipendente || [];
      if (!userRoles.includes('Pizzaiolo')) {
        setError('⚠️ Solo i Pizzaioli possono compilare questo form');
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

    const domandeObbligatorie = domande.filter(d => d.obbligatoria !== false);
    for (const domanda of domandeObbligatorie) {
      if (domanda.tipo_controllo === 'foto' && !photos[domanda.id]) {
        setError(`Carica la foto: ${domanda.attrezzatura}`);
        return;
      }
      if (domanda.tipo_controllo === 'multipla' && !risposte[domanda.id]) {
        setError(`Rispondi alla domanda: ${domanda.testo_domanda}`);
        return;
      }
    }

    try {
      setUploading(true);
      setUploadProgress('Caricamento foto in corso...');

      const uploadedUrls = {};
      const fotoDomande = domande.filter(d => d.tipo_controllo === 'foto');
      for (const domanda of fotoDomande) {
        const file = photos[domanda.id];
        if (file) {
          setUploadProgress(`Caricamento ${domanda.attrezzatura}...`);
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          uploadedUrls[domanda.id] = file_url;
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
        inspection_type: 'pizzaiolo',
        domande_risposte: domande.map(d => ({
          domanda_id: d.id,
          domanda_testo: d.tipo_controllo === 'foto' ? `Foto: ${d.attrezzatura}` : d.testo_domanda,
          tipo_controllo: d.tipo_controllo,
          risposta: d.tipo_controllo === 'foto' ? uploadedUrls[d.id] : risposte[d.id],
          attrezzatura: d.attrezzatura
        }))
      };

      const equipmentPhotos = {};
      fotoDomande.forEach(d => {
        if (uploadedUrls[d.id]) {
          const key = d.attrezzatura.toLowerCase().replace(/\s+/g, '_');
          inspectionData[`${key}_foto_url`] = uploadedUrls[d.id];
          equipmentPhotos[key] = uploadedUrls[d.id];
        }
      });

      const inspection = await base44.entities.CleaningInspection.create(inspectionData);

      setUploadProgress('Avvio analisi AI in background...');

      base44.functions.invoke('analyzeCleaningInspection', {
        inspection_id: inspection.id,
        equipment_photos: equipmentPhotos
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

  const canSubmit = () => {
    if (!selectedStore || !currentUser || uploading) return false;
    if (currentUser?.user_type === 'dipendente' && !(currentUser.ruoli_dipendente || []).includes('Pizzaiolo')) return false;
    
    const domandeObbligatorie = domande.filter(d => d.obbligatoria !== false);
    for (const domanda of domandeObbligatorie) {
      if (domanda.tipo_controllo === 'foto' && !photos[domanda.id]) return false;
      if (domanda.tipo_controllo === 'multipla' && !risposte[domanda.id]) return false;
    }
    return true;
  };

  if (currentUser?.user_type === 'dipendente') {
    const userRoles = currentUser.ruoli_dipendente || [];
    if (!userRoles.includes('Pizzaiolo')) {
      return (
        <div className="max-w-5xl mx-auto space-y-6">
          <NeumorphicCard className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#6b6b6b] mb-2">Accesso Negato</h2>
            <p className="text-[#9b9b9b] mb-4">
              Questa pagina è riservata ai dipendenti con ruolo <strong>Pizzaiolo</strong>.
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Controllo Pulizia Pizzaiolo 🍕</h1>
        <p className="text-[#9b9b9b]">Compila il form di controllo pulizia</p>
      </div>

      {isLoadingDomande ? (
        <NeumorphicCard className="p-12 text-center">
          <Loader2 className="w-12 h-12 text-[#8b7355] animate-spin mx-auto mb-4" />
          <p className="text-[#9b9b9b]">Caricamento domande...</p>
        </NeumorphicCard>
      ) : domande.length === 0 ? (
        <NeumorphicCard className="p-12 text-center">
          <AlertCircle className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">Nessuna domanda configurata</h3>
          <p className="text-[#9b9b9b]">Contatta l'amministratore per configurare le domande di controllo</p>
        </NeumorphicCard>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
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
                  {stores
                    .filter(store => {
                      if (currentUser?.user_type === 'admin' || currentUser?.user_type === 'manager') return true;
                      if (!currentUser?.assigned_stores || currentUser.assigned_stores.length === 0) return true;
                      return currentUser.assigned_stores.includes(store.id);
                    })
                    .map(store => (
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

          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <ClipboardCheck className="w-6 h-6 text-[#8b7355]" />
              <h2 className="text-xl font-bold text-[#6b6b6b]">Controlli di Pulizia</h2>
            </div>

            <div className="space-y-6">
              {domande.map((domanda, index) => (
                <div key={domanda.id} className="neumorphic-pressed p-5 rounded-xl">
                  {domanda.tipo_controllo === 'foto' ? (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Camera className="w-5 h-5 text-[#8b7355]" />
                        <h3 className="font-bold text-[#6b6b6b]">
                          Foto: {domanda.attrezzatura}
                          {domanda.obbligatoria !== false && <span className="text-red-600 ml-1">*</span>}
                        </h3>
                      </div>

                      {previews[domanda.id] ? (
                        <div className="relative">
                          <img 
                            src={previews[domanda.id]} 
                            alt={domanda.attrezzatura}
                            className="w-full h-64 object-cover rounded-lg mb-3"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPhotos(prev => {
                                const newPhotos = {...prev};
                                delete newPhotos[domanda.id];
                                return newPhotos;
                              });
                              setPreviews(prev => {
                                const newPreviews = {...prev};
                                delete newPreviews[domanda.id];
                                return newPreviews;
                              });
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
                            <p className="text-sm text-[#9b9b9b]">Clicca per caricare foto</p>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => handlePhotoChange(domanda.id, e.target.files[0])}
                            className="hidden"
                            disabled={uploading}
                          />
                        </label>
                      )}

                      {photos[domanda.id] && (
                        <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>Foto caricata</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-3 block">
                        {index + 1}. {domanda.testo_domanda}
                        {domanda.obbligatoria !== false && <span className="text-red-600 ml-1">*</span>}
                      </label>
                      <div className="space-y-2">
                        {domanda.opzioni_risposta?.map((opzione, idx) => (
                          <label
                            key={idx}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                              risposte[domanda.id] === opzione
                                ? 'neumorphic-flat border-2 border-[#8b7355]'
                                : 'neumorphic-pressed hover:shadow-md'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`domanda_${domanda.id}`}
                              value={opzione}
                              checked={risposte[domanda.id] === opzione}
                              onChange={(e) => setRisposte(prev => ({
                                ...prev,
                                [domanda.id]: e.target.value
                              }))}
                              className="w-5 h-5"
                              disabled={uploading}
                            />
                            <span className="text-[#6b6b6b] font-medium">{opzione}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </NeumorphicCard>

          {error && (
            <NeumorphicCard className="p-4 bg-red-50">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            </NeumorphicCard>
          )}

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
              disabled={!canSubmit()}
              className={`flex-1 neumorphic-flat px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                canSubmit()
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
                  <CheckCircle className="w-5 h-5" />
                  Invia Controllo
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}