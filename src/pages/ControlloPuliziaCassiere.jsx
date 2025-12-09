import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Camera, Upload, CheckCircle, AlertCircle, Loader2, ClipboardCheck } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";

export default function ControlloPuliziaCassiere() {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const redirectTo = urlParams.get('redirect');
  const storeIdFromUrl = urlParams.get('storeId');
  
  const [selectedStore, setSelectedStore] = useState(storeIdFromUrl || '');
  const [storeLockedFromShift, setStoreLockedFromShift] = useState(!!storeIdFromUrl);
  const [currentUser, setCurrentUser] = useState(null);
  const [photos, setPhotos] = useState({});
  const [previews, setPreviews] = useState({});
  const [risposte, setRisposte] = useState({});
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');

  // Get current user and check role
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
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

  // Load domande for Cassiere
  const { data: domande = [], isLoading: isLoadingDomande } = useQuery({
    queryKey: ['domande-pulizia-cassiere'],
    queryFn: async () => {
      const allDomande = await base44.entities.DomandaPulizia.list('ordine');
      return allDomande.filter(d => 
        d.attiva !== false && 
        d.ruoli_assegnati?.includes('Cassiere')
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

    // Validate all required questions
    const domandeObbligatorie = domande.filter(d => d.obbligatoria !== false && d.richiesto !== false);
    for (const domanda of domandeObbligatorie) {
      if (domanda.tipo_controllo === 'foto' && !photos[domanda.id]) {
        setError(`Carica la foto: ${domanda.attrezzatura}`);
        return;
      }
      if (domanda.tipo_controllo === 'scelta_multipla' && !risposte[domanda.id]) {
        setError(`Rispondi alla domanda: ${domanda.domanda_testo || domanda.testo_domanda}`);
        return;
      }
    }

    try {
      setUploading(true);
      setUploadProgress('Caricamento foto in corso...');

      // Upload photos
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
        inspector_role: 'Cassiere',
        analysis_status: 'processing',
        inspection_type: 'cassiere',
        domande_risposte: domande.map(d => ({
          domanda_id: d.id,
          domanda_testo: d.domanda_testo || (d.tipo_controllo === 'foto' ? `Foto: ${d.attrezzatura}` : d.testo_domanda),
          tipo_controllo: d.tipo_controllo,
          risposta: d.tipo_controllo === 'foto' ? uploadedUrls[d.id] : risposte[d.id],
          attrezzatura: d.attrezzatura,
          prompt_ai: d.prompt_ai
        }))
      };

      // Add photo URLs for backward compatibility with analyzeCleaningInspection
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
        domande_risposte: inspectionData.domande_risposte
      }).catch(error => {
        console.error('Error starting AI analysis:', error);
      });

      navigate(redirectTo ? createPageUrl(redirectTo) : createPageUrl('Pulizie'));

    } catch (error) {
      console.error('Error processing inspection:', error);
      setError('Errore durante il caricamento: ' + error.message);
      setUploading(false);
    }
  };

  // Calculate if can submit
  const canSubmit = () => {
    if (!selectedStore || !currentUser || uploading) return false;
    if (currentUser?.user_type === 'dipendente' && !(currentUser.ruoli_dipendente || []).includes('Cassiere')) return false;
    
    const domandeObbligatorie = domande.filter(d => d.obbligatoria !== false && d.richiesto !== false);
    for (const domanda of domandeObbligatorie) {
      if (domanda.tipo_controllo === 'foto' && !photos[domanda.id]) return false;
      if (domanda.tipo_controllo === 'scelta_multipla' && !risposte[domanda.id]) return false;
    }
    return true;
  };

  // Block access if wrong role
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
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Controllo Pulizia Cassiere 💰</h1>
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
          {/* Store Selection */}
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Informazioni Ispezione</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#9b9b9b] mb-2 block">
                  Locale <span className="text-red-600">*</span>
                </label>
                {storeLockedFromShift ? (
                  <div className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] bg-gray-50">
                    {stores.find(s => s.id === selectedStore)?.name || 'Caricamento...'}
                    <span className="text-xs text-slate-500 ml-2">(dal turno)</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {stores
                      .filter(store => {
                        if (currentUser?.user_type === 'admin' || currentUser?.user_type === 'manager') return true;
                        if (!currentUser?.assigned_stores || currentUser.assigned_stores.length === 0) return true;
                        return currentUser.assigned_stores.includes(store.id);
                      })
                      .map(store => (
                        <button
                          key={store.id}
                          type="button"
                          onClick={() => setSelectedStore(store.id)}
                          disabled={uploading}
                          className={`px-4 py-3 rounded-xl font-medium transition-all ${
                            selectedStore === store.id
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                              : 'neumorphic-flat text-[#6b6b6b] hover:shadow-md'
                          }`}
                        >
                          {store.name}
                        </button>
                      ))}
                  </div>
                )}
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

          {/* Dynamic Questions */}
          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <ClipboardCheck className="w-6 h-6 text-[#8b7355]" />
              <h2 className="text-xl font-bold text-[#6b6b6b]">Controlli di Pulizia</h2>
            </div>

            <div className="space-y-6">
              {domande.map((domanda, index) => (
                <div key={domanda.id} className="neumorphic-pressed p-5 rounded-xl">
                  {domanda.tipo_controllo === 'foto' || domanda.tipo_controllo === 'photo' ? (
                    /* Photo Question */
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
                        <div>
                          <label 
                            htmlFor={`photo-${domanda.id}`}
                            className="block cursor-pointer"
                          >
                            <div className="neumorphic-flat p-8 rounded-lg text-center hover:shadow-lg transition-all">
                              <Upload className="w-8 h-8 text-[#9b9b9b] mx-auto mb-2" />
                              <p className="text-sm text-[#9b9b9b]">Clicca per caricare foto</p>
                            </div>
                          </label>
                          <input
                            id={`photo-${domanda.id}`}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => {
                              e.preventDefault();
                              handlePhotoChange(domanda.id, e.target.files[0]);
                            }}
                            className="hidden"
                            disabled={uploading}
                          />
                        </div>
                      )}

                      {photos[domanda.id] && (
                        <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>Foto caricata</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Multiple Choice Question */
                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-3 block">
                        {index + 1}. {domanda.domanda_testo}
                        {(domanda.obbligatoria !== false && domanda.richiesto !== false) && <span className="text-red-600 ml-1">*</span>}
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
          <div className="flex gap-3 pb-32 lg:pb-0">
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
              className={`flex-1 neumorphic-flat px-6 py-4 lg:py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-lg lg:text-base ${
                canSubmit()
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl'
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