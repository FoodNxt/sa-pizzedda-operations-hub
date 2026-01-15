import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Camera, Upload, CheckCircle, AlertCircle, Loader2, ClipboardCheck } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import VoiceButton from "../components/VoiceButton";

// Usa file picker nativo al posto di CameraCapture per maggiore compatibilità
const SimpleCameraCapture = ({ onCapture, onClose }) => {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onCapture(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200] p-4">
      <NeumorphicCard className="p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-[#6b6b6b] mb-4">Scatta o Carica Foto</h3>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="w-full mb-4"
          autoFocus
        />
        <button
          onClick={onClose}
          className="w-full neumorphic-flat px-6 py-3 rounded-xl text-[#6b6b6b]"
        >
          Annulla
        </button>
      </NeumorphicCard>
    </div>
  );
};

export default function ControlloPuliziaPizzaiolo() {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const redirectTo = urlParams.get('redirect');
  const storeIdFromUrl = urlParams.get('storeId') || urlParams.get('store_id');
  const turnoId = urlParams.get('turno_id');
  const attivitaNome = urlParams.get('attivita');
  
  const [selectedStore, setSelectedStore] = useState(storeIdFromUrl || '');
  const [storeLockedFromShift, setStoreLockedFromShift] = useState(!!storeIdFromUrl);
  const [currentUser, setCurrentUser] = useState(null);
  const [photos, setPhotos] = useState({});
  const [previews, setPreviews] = useState({});
  const [risposte, setRisposte] = useState({});
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');
  const [activeCamera, setActiveCamera] = useState(null);

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

  const { data: attrezzature = [] } = useQuery({
    queryKey: ['attrezzature'],
    queryFn: () => base44.entities.Attrezzatura.list(),
  });

  // Load domande for Pizzaiolo - solo dopo selezione store
  const { data: domande = [], isLoading: isLoadingDomande } = useQuery({
    queryKey: ['domande-pulizia-pizzaiolo', selectedStore],
    queryFn: async () => {
      if (!selectedStore) return [];
      
      const allDomande = await base44.entities.DomandaPulizia.list('ordine');
      
      // Filtra domande per ruolo Pizzaiolo
      const domandePerRuolo = allDomande.filter(d => 
        d.attiva !== false && 
        d.ruoli_assegnati?.includes('Pizzaiolo')
      );
      
      // Filtra domande con attrezzature in base a quelle presenti nel locale
      const attrezzatureDelLocale = attrezzature.filter(a => {
        if (a.attivo === false) return false;
        if (!a.stores_assegnati || a.stores_assegnati.length === 0) return true;
        return a.stores_assegnati.includes(selectedStore);
      }).map(a => a.nome);
      
      return domandePerRuolo.filter(d => {
        // Se la domanda ha un'attrezzatura, verifica che sia presente nel locale
        if (d.attrezzatura) {
          return attrezzatureDelLocale.includes(d.attrezzatura);
        }
        // Domande senza attrezzatura sono sempre mostrate
        return true;
      });
    },
    enabled: !!selectedStore,
  });

  const handlePhotoCapture = (questionId, file) => {
    setPhotos(prev => ({ ...prev, [questionId]: file }));
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews(prev => ({ ...prev, [questionId]: reader.result }));
    };
    reader.readAsDataURL(file);
    setActiveCamera(null);
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

    const domandeObbligatorie = domande.filter(d => d.obbligatoria !== false && d.richiesto !== false);
    for (const domanda of domandeObbligatorie) {
      if (domanda.tipo_controllo === 'foto' && !photos[domanda.id]) {
        setError(`Carica la foto: ${domanda.attrezzatura}`);
        return;
      }
      if (domanda.tipo_controllo === 'scelta_multipla' && !risposte[domanda.id]) {
        setError(`Rispondi alla domanda: ${domanda.domanda_testo}`);
        return;
      }
      if (domanda.tipo_controllo === 'scelta_multipla' && domanda.richiedi_foto_multipla === 'sempre' && !photos[`${domanda.id}_foto`]) {
        setError(`Carica la foto per: ${domanda.domanda_testo}`);
        return;
      }
      if (domanda.tipo_controllo === 'scelta_multipla' && 
          domanda.richiedi_foto_multipla === 'condizionale' && 
          risposte[domanda.id] === domanda.risposta_richiede_foto && 
          !photos[`${domanda.id}_foto`]) {
        setError(`Carica la foto richiesta`);
        return;
      }
    }

    setUploading(true);
    setUploadProgress('Caricamento foto in corso...');

    try {
      console.log('=== INIZIO SUBMIT PULIZIE PIZZAIOLO ===');
      
      const uploadedUrls = {};
      const fotoDomande = domande.filter(d => d.tipo_controllo === 'foto');
      for (const domanda of fotoDomande) {
        const file = photos[domanda.id];
        if (file) {
          console.log(`Caricamento foto: ${domanda.attrezzatura}`);
          setUploadProgress(`Caricamento ${domanda.attrezzatura}...`);
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          uploadedUrls[domanda.id] = file_url;
        }
      }

      // Upload conditional photos
      const domandeMultipleConFoto = domande.filter(d => 
        d.tipo_controllo === 'scelta_multipla' && 
        (d.richiedi_foto_multipla === 'sempre' || 
         (d.richiedi_foto_multipla === 'condizionale' && risposte[d.id] === d.risposta_richiede_foto))
      );
      
      for (const domanda of domandeMultipleConFoto) {
        const file = photos[`${domanda.id}_foto`];
        if (file) {
          console.log(`Caricamento foto condizionale`);
          setUploadProgress(`Caricamento foto...`);
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          uploadedUrls[`${domanda.id}_foto`] = file_url;
        }
      }

      setUploadProgress('Creazione ispezione...');

      const store = stores.find(s => s.id === selectedStore);
      
      // Build clean domande_risposte array
      const domandeRisposte = [];
      for (const d of domande) {
        const risposta = d.tipo_controllo === 'foto' ? uploadedUrls[d.id] : risposte[d.id];
        if (risposta) {
          const item = {
            domanda_id: d.id,
            domanda_testo: d.domanda_testo || `Foto: ${d.attrezzatura || 'Attrezzatura'}`,
            tipo_controllo: d.tipo_controllo,
            risposta: risposta
          };
          
          // Add optional fields only if they exist
          if (d.attrezzatura) item.attrezzatura = d.attrezzatura;
          if (d.prompt_ai) item.prompt_ai = d.prompt_ai;
          if (uploadedUrls[`${d.id}_foto`]) item.foto_aggiuntiva = uploadedUrls[`${d.id}_foto`];
          
          domandeRisposte.push(item);
        }
      }

      const inspectionData = {
        store_name: store?.name || 'Store sconosciuto',
        store_id: selectedStore,
        inspection_date: new Date().toISOString(),
        inspector_name: currentUser.nome_cognome || currentUser.full_name || currentUser.email || 'Ispettore',
        inspector_role: 'Pizzaiolo',
        analysis_status: 'processing',
        inspection_type: 'pizzaiolo',
        domande_risposte: domandeRisposte
      };

      console.log('Creazione ispezione...');
      const inspection = await base44.entities.CleaningInspection.create(inspectionData);
      console.log('Ispezione creata:', inspection.id);

      setUploadProgress('Avvio analisi AI...');

      base44.functions.invoke('analyzeCleaningInspection', {
        inspection_id: inspection.id,
        domande_risposte: inspectionData.domande_risposte
      }).catch(err => console.error('Errore AI:', err));

      if (turnoId && attivitaNome) {
        await base44.entities.AttivitaCompletata.create({
          dipendente_id: currentUser.id,
          dipendente_nome: currentUser.nome_cognome || currentUser.full_name,
          turno_id: turnoId,
          turno_data: new Date().toISOString().split('T')[0],
          store_id: store?.id || selectedStore,
          attivita_nome: decodeURIComponent(attivitaNome),
          form_page: 'ControlloPuliziaPizzaiolo',
          completato_at: new Date().toISOString()
        });
      }

      console.log('=== SUBMIT COMPLETATO ===');
      navigate(createPageUrl(redirectTo || 'TurniDipendente'));
    } catch (error) {
      console.error('=== ERRORE SUBMIT ===', error);
      setError(`Errore: ${error.message || 'Errore sconosciuto'}`);
      setUploading(false);
    }
  };

  const canSubmit = () => {
    if (!selectedStore || !currentUser || uploading) return false;
    if (currentUser?.user_type === 'dipendente' && !(currentUser.ruoli_dipendente || []).includes('Pizzaiolo')) return false;
    
    const domandeObbligatorie = domande.filter(d => d.obbligatoria !== false && d.richiesto !== false);
    for (const domanda of domandeObbligatorie) {
      if (domanda.tipo_controllo === 'foto' && !photos[domanda.id]) return false;
      if (domanda.tipo_controllo === 'scelta_multipla' && !risposte[domanda.id]) return false;
      if (domanda.tipo_controllo === 'scelta_multipla' && domanda.richiedi_foto_multipla === 'sempre' && !photos[`${domanda.id}_foto`]) return false;
      if (domanda.tipo_controllo === 'scelta_multipla' && 
          domanda.richiedi_foto_multipla === 'condizionale' && 
          risposte[domanda.id] === domanda.risposta_richiede_foto && 
          !photos[`${domanda.id}_foto`]) return false;
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store Selection - Always visible */}
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
                        // I dipendenti possono sempre vedere tutti i locali
                        return true;
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

            {/* Questions Section */}
            {!selectedStore ? (
            <NeumorphicCard className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">Seleziona un Locale</h3>
              <p className="text-[#9b9b9b]">Seleziona prima il locale per caricare le domande</p>
            </NeumorphicCard>
            ) : isLoadingDomande ? (
            <NeumorphicCard className="p-12 text-center">
              <Loader2 className="w-12 h-12 text-[#8b7355] animate-spin mx-auto mb-4" />
              <p className="text-[#9b9b9b]">Caricamento domande...</p>
            </NeumorphicCard>
            ) : domande.length === 0 ? (
            <NeumorphicCard className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">Nessuna domanda disponibile</h3>
              <p className="text-[#9b9b9b]">Non ci sono domande configurate per questo locale</p>
            </NeumorphicCard>
            ) : (
            <NeumorphicCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <ClipboardCheck className="w-6 h-6 text-[#8b7355]" />
                <h2 className="text-xl font-bold text-[#6b6b6b]">Controlli di Pulizia</h2>
              </div>

              <div className="space-y-6">
                {domande.map((domanda, index) => (
                <div key={domanda.id} className="neumorphic-pressed p-5 rounded-xl">
                  {domanda.tipo_controllo === 'foto' || domanda.tipo_controllo === 'photo' ? (
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
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveCamera(domanda.id);
                          }}
                          className="w-full neumorphic-flat p-8 rounded-lg text-center hover:shadow-lg transition-all"
                          disabled={uploading}
                        >
                          <Camera className="w-8 h-8 text-[#9b9b9b] mx-auto mb-2" />
                          <p className="text-sm text-[#9b9b9b]">Scatta Foto</p>
                        </button>
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
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <label className="text-sm font-medium text-[#6b6b6b] flex-1">
                          {index + 1}. {domanda.domanda_testo}
                          {(domanda.obbligatoria !== false && domanda.richiesto !== false) && <span className="text-red-600 ml-1">*</span>}
                        </label>
                        <VoiceButton text={domanda.domanda_testo} />
                      </div>
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

                      {/* Photo upload for multiple choice */}
                      {(domanda.richiedi_foto_multipla === 'sempre' || 
                        (domanda.richiedi_foto_multipla === 'condizionale' && risposte[domanda.id] === domanda.risposta_richiede_foto)) && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Camera className="w-5 h-5 text-[#8b7355]" />
                            <h4 className="font-bold text-[#6b6b6b] text-sm">
                              Foto richiesta
                              {domanda.richiedi_foto_multipla === 'sempre' && <span className="text-red-600 ml-1">*</span>}
                            </h4>
                          </div>

                          {previews[`${domanda.id}_foto`] ? (
                            <div className="relative">
                              <img 
                                src={previews[`${domanda.id}_foto`]} 
                                alt="Foto risposta"
                                className="w-full h-48 object-cover rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setPhotos(prev => {
                                    const newPhotos = {...prev};
                                    delete newPhotos[`${domanda.id}_foto`];
                                    return newPhotos;
                                  });
                                  setPreviews(prev => {
                                    const newPreviews = {...prev};
                                    delete newPreviews[`${domanda.id}_foto`];
                                    return newPreviews;
                                  });
                                }}
                                className="absolute top-2 right-2 neumorphic-flat p-2 rounded-full text-red-600"
                                disabled={uploading}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActiveCamera(`${domanda.id}_foto`)}
                              className="w-full neumorphic-flat p-6 rounded-lg text-center"
                              disabled={uploading}
                            >
                              <Camera className="w-6 h-6 text-[#9b9b9b] mx-auto mb-2" />
                              <p className="text-sm text-[#9b9b9b]">Scatta Foto</p>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </NeumorphicCard>
        )}

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

      {/* Camera Modal */}
      {activeCamera && (
        <SimpleCameraCapture
          onCapture={(file) => handlePhotoCapture(activeCamera, file)}
          onClose={() => setActiveCamera(null)}
        />
      )}
    </div>
  );
}