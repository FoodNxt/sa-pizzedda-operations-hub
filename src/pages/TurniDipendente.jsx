import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { 
  Calendar, Clock, MapPin, CheckCircle, AlertCircle, 
  Loader2, LogIn, LogOut, ChevronLeft, ChevronRight,
  RefreshCw, X, AlertTriangle, Users, Store as StoreIcon, Navigation, Timer, ClipboardList,
  Palmtree, Thermometer, Upload, FileText, ExternalLink, GraduationCap, Check, Square, CheckSquare, ArrowRightLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import moment from "moment";
import "moment/locale/it";

moment.locale('it');

const COLORI_RUOLO = {
  "Pizzaiolo": "bg-orange-100 border-orange-300 text-orange-800",
  "Cassiere": "bg-blue-100 border-blue-300 text-blue-800",
  "Store Manager": "bg-purple-100 border-purple-300 text-purple-800"
};

export default function TurniDipendente() {
  const [activeView, setActiveView] = useState('prossimo'); // 'prossimo', 'tutti', 'ferie', 'malattia', 'liberi', 'scambi'
  const [weekStart, setWeekStart] = useState(moment().startOf('isoWeek'));
  const [currentPosition, setCurrentPosition] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [timbraturaMessage, setTimbraturaMessage] = useState(null);
  const [showScambioModal, setShowScambioModal] = useState(false);
  const [selectedTurnoScambio, setSelectedTurnoScambio] = useState(null);
  const [selectedCollegaScambio, setSelectedCollegaScambio] = useState(null);
  const [selectedTurnoCollegaScambio, setSelectedTurnoCollegaScambio] = useState(null);
  const [showFerieModal, setShowFerieModal] = useState(false);
  const [showMalattiaModal, setShowMalattiaModal] = useState(false);
  const [ferieForm, setFerieForm] = useState({ data_inizio: '', data_fine: '', motivo: '' });
  const [malattiaForm, setMalattiaForm] = useState({ data_inizio: '', descrizione: '', certificato: null });
  const [uploadingCertificato, setUploadingCertificato] = useState(false);
  const [uploadingCertificatoForId, setUploadingCertificatoForId] = useState(null);
  const [gpsPermissionStatus, setGpsPermissionStatus] = useState('unknown');
  const [userPosition, setUserPosition] = useState(null);
  const [distanceToStore, setDistanceToStore] = useState(null);
  const [now, setNow] = useState(moment());

  const queryClient = useQueryClient();

  // Timer per aggiornare "now" ogni secondo
  useEffect(() => {
    const interval = setInterval(() => setNow(moment()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Richiedi permesso GPS all'avvio e traccia posizione
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setGpsPermissionStatus(result.state);
        result.onchange = () => setGpsPermissionStatus(result.state);
      });
    }
  }, []);

  // Aggiorna posizione ogni 30 secondi
  useEffect(() => {
    const updatePosition = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => {},
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    };
    updatePosition();
    const interval = setInterval(updatePosition, 30000);
    return () => clearInterval(interval);
  }, []);

  const requestGPSPermission = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsPermissionStatus('granted');
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setGpsPermissionStatus('denied'),
      { enableHighAccuracy: true }
    );
  };

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: storesData = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['all-employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: accessoStoreData = [] } = useQuery({
    queryKey: ['accesso-store'],
    queryFn: () => base44.entities.AccessoStore.list(),
  });

  const { data: config = null } = useQuery({
    queryKey: ['timbratura-config'],
    queryFn: async () => {
      const configs = await base44.entities.TimbraturaConfig.list();
      return configs[0] || { distanza_massima_metri: 100, tolleranza_ritardo_minuti: 5, abilita_timbratura_gps: true };
    },
  });

  // Richieste ferie e malattia del dipendente
  const { data: mieFerie = [] } = useQuery({
    queryKey: ['mie-ferie', currentUser?.id],
    queryFn: () => base44.entities.RichiestaFerie.filter({ dipendente_id: currentUser.id }),
    enabled: !!currentUser?.id,
  });

  const { data: mieMalattie = [] } = useQuery({
    queryKey: ['mie-malattie', currentUser?.id],
    queryFn: () => base44.entities.RichiestaMalattia.filter({ dipendente_id: currentUser.id }),
    enabled: !!currentUser?.id,
  });

  // Turni liberi disponibili per il ruolo del dipendente
  const { data: turniLiberi = [] } = useQuery({
    queryKey: ['turni-liberi', currentUser?.ruoli_dipendente],
    queryFn: async () => {
      const oggi = moment().format('YYYY-MM-DD');
      const allTurni = await base44.entities.TurnoPlanday.filter({
        data: { $gte: oggi },
        dipendente_id: ''
      });
      // Filtra per ruoli del dipendente
      const ruoli = currentUser?.ruoli_dipendente || [];
      return allTurni.filter(t => ruoli.includes(t.ruolo));
    },
    enabled: !!currentUser?.ruoli_dipendente?.length,
  });

  // Richieste turni liberi del dipendente
  const { data: mieRichiesteTurni = [] } = useQuery({
    queryKey: ['mie-richieste-turni', currentUser?.id],
    queryFn: () => base44.entities.RichiestaTurnoLibero.filter({ dipendente_id: currentUser.id }),
    enabled: !!currentUser?.id,
  });

  // Scambi turno richiesti a me (turni dove io sono "richiesto_a")
  const { data: scambiPerMe = [] } = useQuery({
    queryKey: ['scambi-per-me', currentUser?.id],
    queryFn: async () => {
      const oggi = moment().format('YYYY-MM-DD');
      const allTurni = await base44.entities.TurnoPlanday.filter({
        data: { $gte: oggi }
      });
      // Mostra solo il mio turno (suo_turno_id) per evitare duplicati
      return allTurni.filter(t => 
        t.richiesta_scambio?.richiesto_a === currentUser.id && 
        ['pending', 'accepted_by_colleague'].includes(t.richiesta_scambio?.stato) &&
        t.id === t.richiesta_scambio?.suo_turno_id
      );
    },
    enabled: !!currentUser?.id,
  });

  // Scambi turno richiesti da me (i miei turni con richiesta_scambio dove io sono richiesto_da)
  const { data: scambiDaMe = [] } = useQuery({
    queryKey: ['scambi-da-me', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const oggi = moment().format('YYYY-MM-DD');
      const allTurni = await base44.entities.TurnoPlanday.filter({
        data: { $gte: oggi }
      });
      // Filtra solo quelli con richiesta_scambio dove io sono il richiedente
      return allTurni.filter(t => 
        t.richiesta_scambio?.richiesto_da === currentUser.id
      );
    },
    enabled: !!currentUser?.id,
  });

  const scambiDaMePending = useMemo(() => {
    // Mostra solo il turno del richiedente (mio_turno_id) per evitare duplicati
    const uniqueSwaps = scambiDaMe.filter(t => 
      ['pending', 'accepted_by_colleague'].includes(t.richiesta_scambio?.stato) &&
      t.id === t.richiesta_scambio?.mio_turno_id
    );
    return uniqueSwaps;
  }, [scambiDaMe]);

  const { data: formTrackerConfigs = [] } = useQuery({
    queryKey: ['form-tracker-configs'],
    queryFn: () => base44.entities.FormTrackerConfig.list(),
  });

  const { data: struttureTurno = [] } = useQuery({
    queryKey: ['strutture-turno'],
    queryFn: () => base44.entities.StrutturaTurno.list(),
  });

  const { data: corsi = [] } = useQuery({
    queryKey: ['corsi'],
    queryFn: () => base44.entities.Corso.list(),
  });

  const { data: attivitaCompletate = [] } = useQuery({
    queryKey: ['attivita-completate', currentUser?.id],
    queryFn: () => base44.entities.AttivitaCompletata.filter({ dipendente_id: currentUser.id }),
    enabled: !!currentUser?.id,
  });

  const { data: tipoTurnoConfigs = [] } = useQuery({
    queryKey: ['tipo-turno-configs'],
    queryFn: () => base44.entities.TipoTurnoConfig.list(),
  });

  const { data: allFormData = {} } = useQuery({
    queryKey: ['all-form-data-dipendente'],
    queryFn: async () => {
      const [inventario, cantina, cassa, teglie, prep, impasti, precotture, cleaningInspections] = await Promise.all([
        base44.entities.RilevazioneInventario.list('-data_rilevazione'),
        base44.entities.RilevazioneInventarioCantina.list('-data_rilevazione'),
        base44.entities.ConteggioCassa.list('-data_conteggio'),
        base44.entities.TeglieButtate.list('-data_rilevazione'),
        base44.entities.Preparazioni.list('-data_rilevazione'),
        base44.entities.GestioneImpasti.list('-data_creazione'),
        base44.entities.CalcoloImpastoLog.list('-data_calcolo'),
        base44.entities.CleaningInspection.list('-inspection_date')
      ]);
      return {
        FormInventario: inventario,
        FormCantina: cantina,
        ConteggioCassa: cassa,
        FormTeglieButtate: teglie,
        FormPreparazioni: prep,
        Impasto: impasti,
        Precotture: precotture,
        ControlloPuliziaCassiere: cleaningInspections.filter(i => i.inspector_role === 'Cassiere'),
        ControlloPuliziaPizzaiolo: cleaningInspections.filter(i => i.inspector_role === 'Pizzaiolo'),
        ControlloPuliziaStoreManager: cleaningInspections.filter(i => i.inspector_role === 'Store Manager')
      };
    },
  });

  // Turni del dipendente corrente
  const { data: turni = [], isLoading } = useQuery({
    queryKey: ['turni-dipendente', currentUser?.id, weekStart.format('YYYY-MM-DD')],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const startDate = weekStart.format('YYYY-MM-DD');
      const endDate = weekStart.clone().add(6, 'days').format('YYYY-MM-DD');
      
      return base44.entities.TurnoPlanday.filter({
        dipendente_id: currentUser.id,
        data: { $gte: startDate, $lte: endDate }
      });
    },
    enabled: !!currentUser?.id,
  });

  // Turni futuri per scambio (include TUTTI i turni futuri, non solo i miei)
  const { data: turniFuturi = [] } = useQuery({
    queryKey: ['turni-futuri', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const oggi = moment().format('YYYY-MM-DD');
      // Prendi tutti i turni futuri per poter vedere anche quelli dei colleghi nelle richieste di scambio
      return base44.entities.TurnoPlanday.filter({
        data: { $gte: oggi }
      });
    },
    enabled: !!currentUser?.id,
  });

  // Turni futuri del collega selezionato per scambio (filtrati per non passati)
  const { data: turniFuturiCollega = [] } = useQuery({
    queryKey: ['turni-futuri-collega', selectedCollegaScambio?.id],
    queryFn: async () => {
      if (!selectedCollegaScambio?.id) return [];
      const oggi = moment().format('YYYY-MM-DD');
      const allTurni = await base44.entities.TurnoPlanday.filter({
        dipendente_id: selectedCollegaScambio.id,
        data: { $gte: oggi }
      });
      // Filtra turni con ora di inizio non ancora passata
      const now = moment();
      return allTurni.filter(t => {
        const turnoStart = moment(`${t.data} ${t.ora_inizio}`);
        return turnoStart.isAfter(now);
      });
    },
    enabled: !!selectedCollegaScambio?.id,
  });

  // Tutti i turni del giorno del turno selezionato (per vedere sovrapposizioni orarie)
  const { data: tuttiTurniGiornoScambio = [] } = useQuery({
    queryKey: ['tutti-turni-giorno-scambio', selectedTurnoScambio?.data],
    queryFn: async () => {
      if (!selectedTurnoScambio) return [];
      return base44.entities.TurnoPlanday.filter({
        data: selectedTurnoScambio.data
      });
    },
    enabled: !!selectedTurnoScambio,
  });



  const timbraMutation = useMutation({
    mutationFn: async ({ turnoId, tipo, posizione }) => {
      const turno = turni.find(t => t.id === turnoId);
      if (!turno) throw new Error('Turno non trovato');

      const updateData = {};
      if (tipo === 'entrata') {
        updateData.timbrata_entrata = new Date().toISOString();
        updateData.posizione_entrata = posizione;
        updateData.stato = 'in_corso';
      } else {
        updateData.timbrata_uscita = new Date().toISOString();
        updateData.posizione_uscita = posizione;
        updateData.stato = 'completato';
      }

      return base44.entities.TurnoPlanday.update(turnoId, updateData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['turni-dipendente'] });
      queryClient.invalidateQueries({ queryKey: ['turni-futuri'] });
      setTimbraturaMessage({
        type: 'success',
        text: variables.tipo === 'entrata' ? 'Entrata timbrata con successo!' : 'Uscita timbrata con successo!'
      });
      setTimeout(() => setTimbraturaMessage(null), 3000);
    },
    onError: (error) => {
      setTimbraturaMessage({ type: 'error', text: error.message });
      setTimeout(() => setTimbraturaMessage(null), 3000);
    }
  });

  const richiestaScambioMutation = useMutation({
    mutationFn: async ({ mioTurnoId, suoTurnoId, richiestoA }) => {
      const richiestaData = {
        richiesto_da: currentUser.id,
        richiesto_da_nome: currentUser.nome_cognome || currentUser.full_name,
        richiesto_a: richiestoA,
        mio_turno_id: mioTurnoId,
        suo_turno_id: suoTurnoId,
        stato: 'pending',
        data_richiesta: new Date().toISOString()
      };

      console.log('Salvando richiesta scambio:', richiestaData);

      // Aggiorna il mio turno con la richiesta
      const update1 = await base44.entities.TurnoPlanday.update(mioTurnoId, {
        richiesta_scambio: richiestaData
      });
      console.log('Aggiornato mio turno:', update1);

      // Aggiorna il suo turno con la richiesta
      const update2 = await base44.entities.TurnoPlanday.update(suoTurnoId, {
        richiesta_scambio: richiestaData
      });
      console.log('Aggiornato suo turno:', update2);

      return { update1, update2 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-dipendente'] });
      queryClient.invalidateQueries({ queryKey: ['turni-futuri'] });
      queryClient.invalidateQueries({ queryKey: ['scambi-per-me'] });
      queryClient.invalidateQueries({ queryKey: ['scambi-da-me'] });
      setShowScambioModal(false);
      setSelectedTurnoScambio(null);
      setSelectedCollegaScambio(null);
      setSelectedTurnoCollegaScambio(null);
      setTimbraturaMessage({ type: 'success', text: 'Richiesta di scambio inviata!' });
      setTimeout(() => setTimbraturaMessage(null), 3000);
    }
  });

  const cancellaScambioMutation = useMutation({
    mutationFn: async ({ mioTurnoId, suoTurnoId }) => {
      await Promise.all([
        base44.entities.TurnoPlanday.update(mioTurnoId, {
          richiesta_scambio: null
        }),
        base44.entities.TurnoPlanday.update(suoTurnoId, {
          richiesta_scambio: null
        })
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-dipendente'] });
      queryClient.invalidateQueries({ queryKey: ['turni-futuri'] });
      queryClient.invalidateQueries({ queryKey: ['scambi-per-me'] });
      queryClient.invalidateQueries({ queryKey: ['scambi-da-me'] });
      setTimbraturaMessage({ type: 'success', text: 'Richiesta di scambio cancellata' });
      setTimeout(() => setTimbraturaMessage(null), 3000);
    }
  });

  const richiestaFerieMutation = useMutation({
    mutationFn: async (data) => {
      // Trova turni nel range date
      const turniCoinvolti = turniFuturi.filter(t => {
        return t.data >= data.data_inizio && t.data <= data.data_fine;
      }).map(t => t.id);

      return base44.entities.RichiestaFerie.create({
        dipendente_id: currentUser.id,
        dipendente_nome: currentUser.nome_cognome || currentUser.full_name,
        dipendente_email: currentUser.email,
        data_inizio: data.data_inizio,
        data_fine: data.data_fine,
        motivo: data.motivo,
        turni_coinvolti: turniCoinvolti,
        stato: 'in_attesa'
      });
    },
    onSuccess: () => {
      setShowFerieModal(false);
      setFerieForm({ data_inizio: '', data_fine: '', motivo: '' });
      setTimbraturaMessage({ type: 'success', text: 'Richiesta ferie inviata!' });
      setTimeout(() => setTimbraturaMessage(null), 3000);
    }
  });

  const richiestaMalattiaMutation = useMutation({
    mutationFn: async (data) => {
      // Trova turni del giorno
      const oggi = data.data_inizio;
      const turniCoinvolti = turniFuturi.filter(t => t.data === oggi).map(t => t.id);

      // Aggiorna turni come Malattia (Non Certificata)
      for (const turnoId of turniCoinvolti) {
        await base44.entities.TurnoPlanday.update(turnoId, {
          tipo_turno: 'Malattia (Non Certificata)'
        });
      }

      return base44.entities.RichiestaMalattia.create({
        dipendente_id: currentUser.id,
        dipendente_nome: currentUser.nome_cognome || currentUser.full_name,
        dipendente_email: currentUser.email,
        data_inizio: data.data_inizio,
        descrizione: data.descrizione,
        certificato_url: data.certificato_url,
        turni_coinvolti: turniCoinvolti,
        stato: data.certificato_url ? 'in_attesa_verifica' : 'non_certificata'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-dipendente'] });
      queryClient.invalidateQueries({ queryKey: ['turni-futuri'] });
      setShowMalattiaModal(false);
      setMalattiaForm({ data_inizio: '', descrizione: '', certificato: null });
      setTimbraturaMessage({ type: 'success', text: 'Malattia segnalata!' });
      setTimeout(() => setTimbraturaMessage(null), 3000);
    }
  });

  const handleUploadCertificato = async (file) => {
    if (!file) return;
    setUploadingCertificato(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setMalattiaForm(prev => ({ ...prev, certificato_url: file_url }));
    } catch (error) {
      console.error('Error uploading:', error);
    }
    setUploadingCertificato(false);
  };

  // Upload certificato per malattia esistente
  const uploadCertificatoMutation = useMutation({
    mutationFn: async ({ malattiaId, file }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return base44.entities.RichiestaMalattia.update(malattiaId, {
        certificato_url: file_url,
        stato: 'in_attesa_verifica'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mie-malattie'] });
      setUploadingCertificatoForId(null);
    }
  });

  // Completa attività
  const completaAttivitaMutation = useMutation({
    mutationFn: async ({ turno, attivitaNome }) => {
      return base44.entities.AttivitaCompletata.create({
        dipendente_id: currentUser.id,
        dipendente_nome: currentUser.nome_cognome || currentUser.full_name,
        turno_id: turno.id,
        turno_data: turno.data,
        store_id: turno.store_id,
        attivita_nome: attivitaNome,
        completato_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attivita-completate'] });
    }
  });

  // Rispondi a scambio turno
  const rispondiScambioMutation = useMutation({
    mutationFn: async ({ suoTurnoId, accetta }) => {
      const suoTurno = scambiPerMe.find(t => t.id === suoTurnoId);
      if (!suoTurno) throw new Error('Turno non trovato');
      
      const mioTurnoId = suoTurno.richiesta_scambio.mio_turno_id;

      const mioTurno = await base44.entities.TurnoPlanday.filter({ id: mioTurnoId });
      if (mioTurno.length === 0) throw new Error('Turno del richiedente non trovato');

      const turno1 = mioTurno[0];
      const turno2 = suoTurno;

      if (accetta) {
        // Aggiorna stato a "accepted_by_colleague" senza scambiare dipendenti
        const updatedRichiesta = {
          ...suoTurno.richiesta_scambio,
          stato: 'accepted_by_colleague',
          data_risposta_collega: new Date().toISOString()
        };

        await Promise.all([
          base44.entities.TurnoPlanday.update(turno1.id, {
            richiesta_scambio: updatedRichiesta
          }),
          base44.entities.TurnoPlanday.update(turno2.id, {
            richiesta_scambio: updatedRichiesta
          })
        ]);
      } else {
        // Se rifiutato
        const updatedRichiesta = {
          ...suoTurno.richiesta_scambio,
          stato: 'rejected_by_colleague',
          data_risposta_collega: new Date().toISOString()
        };

        await Promise.all([
          base44.entities.TurnoPlanday.update(turno1.id, {
            richiesta_scambio: updatedRichiesta
          }),
          base44.entities.TurnoPlanday.update(turno2.id, {
            richiesta_scambio: updatedRichiesta
          })
        ]);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scambi-per-me'] });
      queryClient.invalidateQueries({ queryKey: ['scambi-da-me'] });
      queryClient.invalidateQueries({ queryKey: ['turni-dipendente'] });
      queryClient.invalidateQueries({ queryKey: ['turni-futuri'] });
      setTimbraturaMessage({ 
        type: 'success', 
        text: variables.accetta ? 'Scambio accettato! In attesa approvazione manager.' : 'Scambio rifiutato.'
      });
      setTimeout(() => setTimbraturaMessage(null), 3000);
    }
  });

  // Richiedi turno libero
  const richiediTurnoLiberoMutation = useMutation({
    mutationFn: async (turno) => {
      const storeName = storesData.find(s => s.id === turno.store_id)?.name || '';
      return base44.entities.RichiestaTurnoLibero.create({
        turno_id: turno.id,
        dipendente_id: currentUser.id,
        dipendente_nome: currentUser.nome_cognome || currentUser.full_name,
        dipendente_email: currentUser.email,
        data_turno: turno.data,
        ora_inizio: turno.ora_inizio,
        ora_fine: turno.ora_fine,
        ruolo: turno.ruolo,
        store_id: turno.store_id,
        store_name: storeName,
        stato: 'in_attesa'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mie-richieste-turni'] });
      setTimbraturaMessage({ type: 'success', text: 'Richiesta turno inviata!' });
      setTimeout(() => setTimbraturaMessage(null), 3000);
    }
  });

  const getStoreName = (storeId) => storesData.find(s => s.id === storeId)?.name || '';

  const getStatoColor = (stato) => {
    switch (stato) {
      case 'in_attesa': return 'bg-yellow-100 text-yellow-800';
      case 'approvata': case 'certificata': return 'bg-green-100 text-green-800';
      case 'rifiutata': return 'bg-red-100 text-red-800';
      case 'non_certificata': return 'bg-orange-100 text-orange-800';
      case 'in_attesa_verifica': return 'bg-blue-100 text-blue-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatoLabel = (stato) => {
    switch (stato) {
      case 'in_attesa': return 'In Attesa';
      case 'approvata': return 'Approvata';
      case 'rifiutata': return 'Rifiutata';
      case 'non_certificata': return 'Non Certificata';
      case 'in_attesa_verifica': return 'In Verifica';
      case 'certificata': return 'Certificata';
      default: return stato;
    }
  };

  // Calcola distanza GPS
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getGPSPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalizzazione non supportata'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => reject(new Error('Impossibile ottenere la posizione GPS')),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleTimbra = async (turno, tipo) => {
    const store = storesData.find(s => s.id === turno.store_id);
    
    if (config?.abilita_timbratura_gps && store?.latitude && store?.longitude) {
      setLoadingGPS(true);
      setGpsError(null);

      try {
        const position = await getGPSPosition();
        setCurrentPosition(position);

        const distance = calculateDistance(position.lat, position.lng, store.latitude, store.longitude);

        if (distance > (config.distanza_massima_metri || 100)) {
          setGpsError(`Sei troppo lontano dal locale (${Math.round(distance)}m). Devi essere entro ${config.distanza_massima_metri || 100}m per timbrare.`);
          setLoadingGPS(false);
          return;
        }

        timbraMutation.mutate({ turnoId: turno.id, tipo, posizione: position });
      } catch (error) {
        setGpsError(error.message);
      }
      setLoadingGPS(false);
    } else {
      timbraMutation.mutate({ turnoId: turno.id, tipo, posizione: null });
    }
  };

  const getTurnoStatus = (turno) => {
    const now = moment();
    const turnoDate = moment(turno.data);
    const turnoStart = moment(`${turno.data} ${turno.ora_inizio}`);
    const turnoEnd = moment(`${turno.data} ${turno.ora_fine}`);

    if (turno.stato === 'completato') return 'completato';
    if (turno.stato === 'in_corso') return 'in_corso';
    if (turnoDate.isAfter(now, 'day')) return 'futuro';
    if (turnoDate.isBefore(now, 'day')) return 'passato';
    if (now.isBetween(turnoStart.clone().subtract(30, 'minutes'), turnoEnd)) return 'attivo';
    return 'programmato';
  };

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(weekStart.clone().add(i, 'days'));
    }
    return days;
  }, [weekStart]);

  const turniByDay = useMemo(() => {
    const grouped = {};
    turni.forEach(turno => {
      if (!grouped[turno.data]) grouped[turno.data] = [];
      grouped[turno.data].push(turno);
    });
    return grouped;
  }, [turni]);

  const turnoOggi = useMemo(() => {
    const oggi = moment().format('YYYY-MM-DD');
    return turni.filter(t => t.data === oggi);
  }, [turni]);

  // Prossimo turno (oggi o futuro)
  const prossimoTurno = useMemo(() => {
    const now = moment();
    const allTurni = [...turni, ...turniFuturi];
    const oreMancataUscita = config?.ore_mancata_uscita || 2;
    
    // Prima controlla se c'è un turno finito che attende timbratura uscita
    const turnoAttendeUscita = allTurni.find(t => {
      if (t.dipendente_id !== currentUser?.id) return false;
      if (t.stato === 'completato') return false;
      if (!t.timbrata_entrata) return false;
      if (t.timbrata_uscita) return false;
      
      let turnoEnd = moment(`${t.data} ${t.ora_fine}`);
      const [endHour] = t.ora_fine.split(':').map(Number);
      if (endHour >= 0 && endHour < 6) {
        turnoEnd = turnoEnd.add(1, 'day');
      }
      
      // Il turno è finito ma non sono passate più di X ore
      const oreDallaFine = now.diff(turnoEnd, 'hours', true);
      return turnoEnd.isBefore(now) && oreDallaFine < oreMancataUscita;
    });
    
    if (turnoAttendeUscita) return turnoAttendeUscita;
    
    const futuri = allTurni
      .filter(t => {
        // Filtra SOLO turni assegnati al dipendente corrente
        if (t.dipendente_id !== currentUser?.id) return false;
        
        // Escludi turni completati
        if (t.stato === 'completato') return false;
        
        const turnoStart = moment(`${t.data} ${t.ora_inizio}`);
        let turnoEnd = moment(`${t.data} ${t.ora_fine}`);
        
        // Se il turno finisce tra 00:00 e 06:00, è il giorno dopo
        const [endHour] = t.ora_fine.split(':').map(Number);
        if (endHour >= 0 && endHour < 6) {
          turnoEnd = turnoEnd.add(1, 'day');
        }
        
        // Includi turni non ancora iniziati o in corso
        return turnoEnd.isAfter(now);
      })
      .sort((a, b) => {
        const aStart = moment(`${a.data} ${a.ora_inizio}`);
        const bStart = moment(`${b.data} ${b.ora_inizio}`);
        return aStart.diff(bStart);
      });
    return futuri[0] || null;
  }, [turni, turniFuturi, now, currentUser, config]);

  // Colleghi che lavorano nello stesso turno del prossimo turno
  const { data: colleghiProssimoTurno = [] } = useQuery({
    queryKey: ['colleghi-prossimo-turno', prossimoTurno?.data, prossimoTurno?.store_id],
    queryFn: async () => {
      if (!prossimoTurno) return [];
      return base44.entities.TurnoPlanday.filter({
        data: prossimoTurno.data,
        store_id: prossimoTurno.store_id
      });
    },
    enabled: !!prossimoTurno,
  });

  // Calcola se utente è nel raggio del prossimo turno
  const prossimoTurnoStatus = useMemo(() => {
    if (!prossimoTurno) return { canTimbra: false, reason: 'Nessun turno' };
    
    const turnoStart = moment(`${prossimoTurno.data} ${prossimoTurno.ora_inizio}`);
    const turnoEnd = moment(`${prossimoTurno.data} ${prossimoTurno.ora_fine}`);
    const minutesToStart = turnoStart.diff(now, 'minutes');
    const minutesToEnd = turnoEnd.diff(now, 'minutes');
    const store = storesData.find(s => s.id === prossimoTurno.store_id);
    
    // Già timbrato entrata? Mostra timer e controllo uscita
    if (prossimoTurno.timbrata_entrata && !prossimoTurno.timbrata_uscita) {
      const entrata = moment(prossimoTurno.timbrata_entrata);
      const durataLavorata = moment.duration(now.diff(entrata));
      const canUscita = now.isSameOrAfter(turnoEnd);
      
      // Controllo GPS anche per uscita
      let gpsOk = true;
      let gpsReason = null;
      if (config?.abilita_timbratura_gps && store?.latitude && store?.longitude) {
        if (!userPosition) {
          gpsOk = false;
          gpsReason = 'Attiva il GPS';
        } else {
          const distance = calculateDistance(userPosition.lat, userPosition.lng, store.latitude, store.longitude);
          const maxDistance = config.distanza_massima_metri || 100;
          if (distance > maxDistance) {
            gpsOk = false;
            gpsReason = `Sei a ${Math.round(distance)}m dal locale`;
          }
        }
      }
      
      return { 
        canTimbra: canUscita && gpsOk, 
        tipo: 'uscita', 
        reason: !canUscita ? `Mancano ${minutesToEnd}min alla fine del turno` : gpsReason,
        inCorso: true,
        durataLavorata,
        minutesToEnd,
        needsGPS: !gpsOk && !userPosition
      };
    }
    if (prossimoTurno.timbrata_uscita) {
      return { canTimbra: false, reason: 'Turno completato' };
    }
    
    // Controllo tempo per entrata
    if (minutesToStart > 60) {
      const hours = Math.floor(minutesToStart / 60);
      const mins = minutesToStart % 60;
      return { canTimbra: false, reason: `Mancano ${hours}h ${mins}min al turno` };
    }
    
    // Controllo GPS
    if (config?.abilita_timbratura_gps && store?.latitude && store?.longitude) {
      if (!userPosition) {
        return { canTimbra: false, reason: 'Attiva il GPS', needsGPS: true };
      }
      const distance = calculateDistance(userPosition.lat, userPosition.lng, store.latitude, store.longitude);
      const maxDistance = config.distanza_massima_metri || 100;
      if (distance > maxDistance) {
        return { canTimbra: false, reason: `Sei a ${Math.round(distance)}m dal locale (max ${maxDistance}m)` };
      }
    }
    
    return { canTimbra: true, tipo: 'entrata', reason: null };
  }, [prossimoTurno, storesData, config, userPosition, now]);

  // Helper per controllare sovrapposizione oraria
  const checkSovrapposizioneOraria = (turno1Inizio, turno1Fine, turno2Inizio, turno2Fine) => {
    const t1Start = turno1Inizio.replace(':', '');
    const t1End = turno1Fine.replace(':', '');
    const t2Start = turno2Inizio.replace(':', '');
    const t2End = turno2Fine.replace(':', '');
    
    // Gestione turni che finiscono dopo mezzanotte
    const t1FinishesNextDay = parseInt(t1End) < parseInt(t1Start);
    const t2FinishesNextDay = parseInt(t2End) < parseInt(t2Start);
    
    if (!t1FinishesNextDay && !t2FinishesNextDay) {
      return !(parseInt(t1End) <= parseInt(t2Start) || parseInt(t2End) <= parseInt(t1Start));
    }
    
    return true; // Se uno finisce dopo mezzanotte, consideriamo sovrapposizione per sicurezza
  };

  // Colleghi disponibili per scambio
  const colleghiPerScambio = useMemo(() => {
    if (!selectedTurnoScambio || !allEmployees.length) return [];
    
    console.log('=== DEBUG SCAMBIO TURNO ===');
    console.log('Turno selezionato:', selectedTurnoScambio);
    console.log('Ruolo richiesto:', selectedTurnoScambio.ruolo);
    console.log('Store ID:', selectedTurnoScambio.store_id);
    console.log('Totale dipendenti:', allEmployees.length);
    console.log('Accessi store:', accessoStoreData.length);
    
    // Filtra dipendenti per ruolo
    const dipendentiConRuolo = allEmployees.filter(emp => {
      if (emp.employee_id_external === currentUser?.id) return false;
      
      const hasRole = emp.function_name === selectedTurnoScambio.ruolo;
      console.log(`${emp.full_name}: ruolo=${emp.function_name}, match=${hasRole}`);
      return hasRole;
    });
    
    console.log('Dipendenti con ruolo corretto:', dipendentiConRuolo.length);
    
    // Mappa gli accessi store per employee_id_external
    const accessiPerDipendente = {};
    accessoStoreData.forEach(acc => {
      if (!accessiPerDipendente[acc.employee_id]) {
        accessiPerDipendente[acc.employee_id] = [];
      }
      accessiPerDipendente[acc.employee_id].push(acc.store_id);
    });
    
    return dipendentiConRuolo.map(emp => {
      const storesAssegnati = accessiPerDipendente[emp.employee_id_external] || [];
      const isAssegnatoStore = storesAssegnati.length === 0 || storesAssegnati.includes(selectedTurnoScambio.store_id);
      
      console.log(`${emp.full_name} - Stores: ${storesAssegnati.join(', ') || 'nessuno'}, assigned: ${isAssegnatoStore}`);
      
      // Trova turni del dipendente
      const turniDipendente = tuttiTurniGiornoScambio.filter(t => t.dipendente_id === emp.employee_id_external);
      
      // Controlla sovrapposizioni
      const turniSovrapposti = turniDipendente.filter(t => 
        checkSovrapposizioneOraria(
          selectedTurnoScambio.ora_inizio, 
          selectedTurnoScambio.ora_fine,
          t.ora_inizio, 
          t.ora_fine
        )
      );
      
      const haConflitti = turniSovrapposti.length > 0;
      
      return {
        id: emp.employee_id_external,
        nome_cognome: emp.full_name,
        full_name: emp.full_name,
        ruoli_dipendente: [emp.function_name],
        isAssegnatoStore,
        haConflitti,
        turniSovrapposti,
        tuttiTurniGiorno: turniDipendente
      };
    })
    .sort((a, b) => {
      if (a.haConflitti !== b.haConflitti) return a.haConflitti ? 1 : -1;
      if (a.isAssegnatoStore !== b.isAssegnatoStore) return a.isAssegnatoStore ? -1 : 1;
      return 0;
    });
  }, [selectedTurnoScambio, allEmployees, accessoStoreData, tuttiTurniGiornoScambio, currentUser]);

  const openScambioModal = (turno) => {
    // Controlla se il turno è già iniziato
    const turnoStart = moment(`${turno.data} ${turno.ora_inizio}`);
    if (turnoStart.isSameOrBefore(moment())) {
      setTimbraturaMessage({ 
        type: 'error', 
        text: 'Non puoi richiedere uno scambio per un turno già iniziato' 
      });
      setTimeout(() => setTimbraturaMessage(null), 3000);
      return;
    }

    setSelectedTurnoScambio(turno);
    setSelectedCollegaScambio(null);
    setSelectedTurnoCollegaScambio(null);
    setShowScambioModal(true);
  };

  // Helper functions
  const getTurnoSequenceFromMomento = (turno) => {
    const [h] = turno.ora_inizio.split(':').map(Number);
    return h < 14 ? 'first' : 'second';
  };

  const getFormDovutiPerTurno = (turno) => {
    if (!turno) return [];
    
    const tipoTurno = turno.tipo_turno || 'Normale';
    const tipoConfig = tipoTurnoConfigs.find(tc => tc.tipo_turno === tipoTurno);
    if (tipoConfig && tipoConfig.richiede_form === false) return [];
    
    const turnoRuolo = turno.ruolo;
    const turnoStoreId = turno.store_id;
    const turnoSequence = turno.turno_sequence || getTurnoSequenceFromMomento(turno);
    const turnoDayOfWeek = new Date(turno.data).getDay();
    const storeName = getStoreName(turnoStoreId);
    
    const activeConfigs = formTrackerConfigs.filter(c => c.is_active);
    const formDovuti = [];
    
    activeConfigs.forEach(config => {
      const configRoles = config.assigned_roles || [];
      if (configRoles.length > 0 && !configRoles.includes(turnoRuolo)) return;
      
      const configStores = config.assigned_stores || [];
      if (configStores.length > 0 && !configStores.includes(turnoStoreId)) return;
      
      const daysOfWeek = config.days_of_week || [];
      if (daysOfWeek.length > 0 && !daysOfWeek.includes(turnoDayOfWeek)) return;
      
      const configSequences = config.shift_sequences || [config.shift_sequence || 'first'];
      if (!configSequences.includes(turnoSequence)) return;
      
      // Check if completed
      const formData = allFormData[config.form_page] || [];
      const dateStart = new Date(turno.data);
      dateStart.setHours(0, 0, 0, 0);
      const nextDayEnd = new Date(turno.data);
      nextDayEnd.setDate(nextDayEnd.getDate() + 1);
      nextDayEnd.setHours(6, 0, 0, 0);
      
      const completed = formData.some(item => {
        const itemDate = new Date(item.inspection_date || item.data_rilevazione || item.data_conteggio || item.data_creazione || item.data_calcolo);
        return (item.store_name === storeName || item.store_id === turnoStoreId) &&
               (item.inspector_name === turno.dipendente_nome || item.rilevato_da === turno.dipendente_nome) &&
               itemDate >= dateStart && itemDate <= nextDayEnd;
      });
      
      formDovuti.push({ nome: config.form_name, page: config.form_page, completato: completed });
    });
    
    return formDovuti;
  };

  const getAttivitaTurno = (turno) => {
    if (!turno.ruolo || !turno.store_id) return [];
    
    const [h] = turno.ora_inizio.split(':').map(Number);
    const momento = h < 14 ? 'Mattina' : 'Sera';
    const dayOfWeek = new Date(turno.data).getDay();
    const tipoTurno = turno.tipo_turno || 'Normale';
    
    // Verifica config per tipo turno
    const tipoConfig = tipoTurnoConfigs.find(tc => tc.tipo_turno === tipoTurno);
    if (tipoConfig && tipoConfig.mostra_attivita === false) return [];
    
    // Orari del turno per filtro
    const turnoInizio = turno.ora_inizio;
    const turnoFine = turno.ora_fine;
    
    const schemasApplicabili = struttureTurno.filter(st => {
      // Check ruolo (singolo) - MUST match exactly
      if (st.ruolo !== turno.ruolo) return false;
      
      // Check stores
      const stStores = st.assigned_stores || [];
      if (stStores.length > 0 && !stStores.includes(turno.store_id)) return false;
      
      // Check giorno (singolo numero) - MUST match exactly
      if (st.giorno_settimana !== dayOfWeek) return false;
      
      // Filtro per tipo turno
      const stTipiTurno = st.tipi_turno || [];
      if (stTipiTurno.length > 0 && !stTipiTurno.includes(tipoTurno)) return false;
      
      // Check if schema is active
      if (st.is_active === false) return false;
      
      return true;
    });
    
    // Se non ci sono schemi applicabili, return empty
    if (schemasApplicabili.length === 0) return [];
    
    // Estrai attività con info complete, ordinate per ora - evita duplicati per NOME attività
    const attivitaMap = new Map();
    const attivitaInizio = [];
    const attivitaFine = [];
    
    schemasApplicabili.forEach(st => {
      if (st.slots && Array.isArray(st.slots) && st.slots.length > 0) {
        st.slots.forEach(slot => {
          if (slot.attivita) {
            // Slot necessario in ogni turno - va sempre mostrato
            if (slot.necessario_in_ogni_turno) {
              const attivita = {
                nome: slot.attivita,
                ora_inizio: slot.posizione_turno === 'inizio' ? turnoInizio : turnoFine,
                ora_fine: slot.ora_fine,
                form_page: slot.form_page,
                corsi_ids: slot.corsi_ids || (slot.corso_id ? [slot.corso_id] : []),
                richiede_form: slot.richiede_form,
                necessario_in_ogni_turno: true,
                posizione_turno: slot.posizione_turno
              };
              
              if (slot.posizione_turno === 'inizio') {
                attivitaInizio.push(attivita);
              } else {
                attivitaFine.push(attivita);
              }
              return;
            }
            
            // Verifica che lo slot sia dentro l'orario del turno (solo per slot normali)
            const slotInizio = slot.ora_inizio || '00:00';
            
            // Lo slot è valido se inizia durante il turno
            if (slotInizio >= turnoInizio && slotInizio < turnoFine) {
              // Usa solo il nome dell'attività come chiave per evitare duplicati
              const key = slot.attivita;
              if (!attivitaMap.has(key)) {
                attivitaMap.set(key, {
                  nome: slot.attivita,
                  ora_inizio: slot.ora_inizio,
                  ora_fine: slot.ora_fine,
                  form_page: slot.form_page,
                  corsi_ids: slot.corsi_ids || (slot.corso_id ? [slot.corso_id] : []),
                  richiede_form: slot.richiede_form
                });
              }
            }
          }
        });
      }
    });
    
    // Ordina slot normali per ora
    const attivitaNormali = Array.from(attivitaMap.values()).sort((a, b) => (a.ora_inizio || '').localeCompare(b.ora_inizio || ''));
    
    // Combina: inizio + normali + fine
    return [...attivitaInizio, ...attivitaNormali, ...attivitaFine];
  };
  
  const isAttivitaCompletata = (turnoId, attivitaNome) => {
    return attivitaCompletate.some(ac => 
      ac.turno_id === turnoId && ac.attivita_nome === attivitaNome
    );
  };
  
  const getCorsoNome = (corsoId) => {
    return corsi.find(c => c.id === corsoId)?.nome_corso || '';
  };

  return (
    <ProtectedPage pageName="TurniDipendente">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              I Miei Turni
            </h1>
            <p className="text-slate-500 mt-1">Timbra e gestisci i tuoi turni</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <NeumorphicButton 
              onClick={() => setActiveView('prossimo')}
              variant={activeView === 'prossimo' ? 'primary' : 'default'}
              className="flex items-center gap-2"
            >
              <Timer className="w-4 h-4" />
              Prossimo
            </NeumorphicButton>
            <NeumorphicButton 
              onClick={() => setActiveView('tutti')}
              variant={activeView === 'tutti' ? 'primary' : 'default'}
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Tutti
            </NeumorphicButton>
            <NeumorphicButton 
              onClick={() => setActiveView('liberi')}
              variant={activeView === 'liberi' ? 'primary' : 'default'}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Liberi
              {turniLiberi.length > 0 && (
                <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">{turniLiberi.length}</span>
              )}
            </NeumorphicButton>
            <NeumorphicButton 
              onClick={() => setActiveView('ferie')}
              variant={activeView === 'ferie' ? 'primary' : 'default'}
              className="flex items-center gap-2"
            >
              <Palmtree className="w-4 h-4" />
              Ferie
            </NeumorphicButton>
            <NeumorphicButton 
              onClick={() => setActiveView('malattia')}
              variant={activeView === 'malattia' ? 'primary' : 'default'}
              className="flex items-center gap-2"
            >
              <Thermometer className="w-4 h-4" />
              Malattia
            </NeumorphicButton>
            <NeumorphicButton 
              onClick={() => setActiveView('scambi')}
              variant={activeView === 'scambi' ? 'primary' : 'default'}
              className="flex items-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Scambi
              {(scambiPerMe.length > 0 || scambiDaMePending.length > 0) && (
                <span className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {scambiPerMe.length + scambiDaMePending.length}
                </span>
              )}
            </NeumorphicButton>
          </div>
        </div>

        {/* Messaggio */}
        {timbraturaMessage && (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${
            timbraturaMessage.type === 'success' ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
          }`}>
            {timbraturaMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span className={timbraturaMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {timbraturaMessage.text}
            </span>
          </div>
        )}

        {/* Errore GPS */}
        {gpsError && (
          <NeumorphicCard className="p-4 bg-red-50 border border-red-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800">{gpsError}</span>
            </div>
          </NeumorphicCard>
        )}

        {/* Richiesta permesso GPS */}
        {gpsPermissionStatus === 'prompt' && config?.abilita_timbratura_gps && (
          <NeumorphicCard className="p-4 bg-yellow-50 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Navigation className="w-5 h-5 text-yellow-600" />
                <span className="text-yellow-800">Per timbrare è necessario l'accesso alla posizione GPS</span>
              </div>
              <NeumorphicButton onClick={requestGPSPermission} className="text-sm">
                Attiva GPS
              </NeumorphicButton>
            </div>
          </NeumorphicCard>
        )}

        {gpsPermissionStatus === 'denied' && config?.abilita_timbratura_gps && (
          <NeumorphicCard className="p-4 bg-red-50 border border-red-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800">Accesso GPS negato. Abilita la geolocalizzazione nelle impostazioni del browser per poter timbrare.</span>
            </div>
          </NeumorphicCard>
        )}

        {/* VISTA: PROSSIMO TURNO */}
        {activeView === 'prossimo' && prossimoTurno && (
          <NeumorphicCard className={`p-6 border ${prossimoTurnoStatus.inCorso ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' : 'bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold flex items-center gap-2 ${prossimoTurnoStatus.inCorso ? 'text-green-800' : 'text-indigo-800'}`}>
                {prossimoTurnoStatus.inCorso ? <Timer className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                {prossimoTurnoStatus.inCorso ? 'Turno in Corso' : 'Prossimo Turno'}
              </h2>
              {/* Countdown */}
              {!prossimoTurnoStatus.inCorso && (() => {
                const turnoStart = moment(`${prossimoTurno.data} ${prossimoTurno.ora_inizio}`);
                const diffMs = turnoStart.diff(now);
                if (diffMs <= 0) return null;
                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                return (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-indigo-700 font-mono">
                      {hours < 2 ? `${hours}h ${minutes}m` : `${hours}h`}
                    </div>
                    <div className="text-xs text-indigo-500">al turno</div>
                  </div>
                );
              })()}
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <div className="font-bold text-lg text-slate-800">
                    {moment(prossimoTurno.data).format('dddd DD MMMM')}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-4 h-4" />
                    <span>{prossimoTurno.ora_inizio} - {prossimoTurno.ora_fine}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                    <MapPin className="w-4 h-4" />
                    <span>{getStoreName(prossimoTurno.store_id)}</span>
                    <span>•</span>
                    <span>{prossimoTurno.ruolo}</span>
                  </div>
                  {prossimoTurno.tipo_turno && prossimoTurno.tipo_turno !== 'Normale' && (
                    <div className="mt-2">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        {prossimoTurno.tipo_turno}
                      </span>
                    </div>
                  )}
                  {prossimoTurno.is_prova && (
                    <div className="mt-2 p-2 bg-purple-100 border border-purple-300 rounded-lg">
                      <p className="text-xs font-bold text-purple-800">🧪 TURNO DI PROVA</p>
                      <p className="text-xs text-purple-700 mt-1">
                        Oggi hai un candidato in prova. Valuta le sue performance durante il turno.
                      </p>
                    </div>
                  )}
                </div>
                {!prossimoTurnoStatus.inCorso && !prossimoTurno.timbrata_entrata && !prossimoTurno.timbrata_uscita && (() => {
                  // Verifica che il turno non sia già iniziato
                  const turnoStart = moment(`${prossimoTurno.data} ${prossimoTurno.ora_inizio}`);
                  const turnoNonIniziato = turnoStart.isAfter(moment());
                  
                  if (!turnoNonIniziato) return null;
                  
                  return (
                    <div>
                      {prossimoTurno.richiesta_scambio?.stato === 'pending' ? (
                        <span className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-xs font-medium">
                          Scambio richiesto
                        </span>
                      ) : (
                        <NeumorphicButton
                          onClick={() => openScambioModal(prossimoTurno)}
                          className="text-sm px-3 py-2 flex items-center gap-1"
                        >
                          <Users className="w-4 h-4" />
                          Scambia
                        </NeumorphicButton>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Timer turno in corso */}
              {prossimoTurnoStatus.inCorso && prossimoTurnoStatus.durataLavorata && (
                <div className="mb-4 p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-green-700 font-medium">Durata turno</span>
                    <span className="text-2xl font-bold text-green-800 font-mono">
                      {String(Math.floor(prossimoTurnoStatus.durataLavorata.asHours())).padStart(2, '0')}:
                      {String(prossimoTurnoStatus.durataLavorata.minutes()).padStart(2, '0')}:
                      {String(prossimoTurnoStatus.durataLavorata.seconds()).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-700">Entrata: {moment(prossimoTurno.timbrata_entrata).format('HH:mm')}</span>
                    {prossimoTurnoStatus.minutesToEnd > 0 ? (
                      <span className="text-sm text-orange-600 font-medium">
                        ⏱️ Mancano {prossimoTurnoStatus.minutesToEnd} min alla fine
                      </span>
                    ) : (
                      <span className="text-sm text-green-600 font-medium">
                        ✅ Puoi timbrare l'uscita
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Bottone Timbra - SEMPRE VISIBILE IN ALTO */}
              {!prossimoTurnoStatus.inCorso && (() => {
                const tipoTurno = prossimoTurno.tipo_turno || 'Normale';
                const tipoConfig = tipoTurnoConfigs.find(tc => tc.tipo_turno === tipoTurno);
                const richiedeTimbratura = !tipoConfig || tipoConfig.richiede_timbratura !== false;
                
                if (!richiedeTimbratura) return null;
                
                return (
                  <div className="mb-4">
                    <NeumorphicButton
                      onClick={() => handleTimbra(prossimoTurno, 'entrata')}
                      variant="primary"
                      className={`w-full flex items-center justify-center gap-2 py-4 text-lg ${
                        !prossimoTurnoStatus.canTimbra ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      disabled={!prossimoTurnoStatus.canTimbra || loadingGPS || timbraMutation.isPending}
                    >
                      {loadingGPS ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <LogIn className="w-6 h-6" />
                      )}
                      Timbra Entrata
                    </NeumorphicButton>
                    {!prossimoTurnoStatus.canTimbra && prossimoTurnoStatus.reason && (
                      <p className="text-sm text-center mt-2 text-slate-500">
                        ⚠️ {prossimoTurnoStatus.reason}
                      </p>
                    )}
                    {prossimoTurnoStatus.needsGPS && (
                      <button
                        onClick={requestGPSPermission}
                        className="w-full mt-2 text-sm text-blue-600 hover:underline"
                      >
                        Clicca qui per attivare il GPS
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Form e Attività da completare - SOLO PER PROSSIMO TURNO */}
              {(() => {
                // PRIMA controlla se esistono schemi StrutturaTurno applicabili
                const attivita = getAttivitaTurno(prossimoTurno);
                
                // Se non ci sono schemi StrutturaTurno applicabili, NON mostrare nessuna attività
                // (anche se ci sono form nel FormTrackerConfig)
                if (attivita.length === 0) return null;
                
                const formDovuti = getFormDovutiPerTurno(prossimoTurno);
                
                // Calcola se tutte le attività sono completate
                const allAttivitaComplete = attivita.every(att => {
                  const isFormActivity = att.form_page || att.richiede_form;
                  const isCorsoActivity = att.corsi_ids?.length > 0;
                  if (isFormActivity) {
                    return formDovuti.some(f => f.page === att.form_page && f.completato);
                  }
                  if (isCorsoActivity) return true; // Corsi sono opzionali
                  return isAttivitaCompletata(prossimoTurno.id, att.nome);
                });
                const formNonAssociatiComplete = formDovuti
                  .filter(form => !attivita.some(a => a.form_page === form.page))
                  .every(f => f.completato);
                const tuttoCompleto = allAttivitaComplete && formNonAssociatiComplete;
                
                return (
                  <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-blue-800 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" />
                        {prossimoTurno.timbrata_entrata ? 'Da completare:' : 'Attività previste:'}
                      </h3>
                      {prossimoTurno.timbrata_entrata && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${tuttoCompleto ? 'bg-green-200 text-green-800' : 'bg-orange-200 text-orange-800'}`}>
                          {tuttoCompleto ? '✓ Tutto completato' : `${attivita.filter(a => {
                            const isFormActivity = a.form_page || a.richiede_form;
                            if (isFormActivity) return formDovuti.some(f => f.page === a.form_page && f.completato);
                            return isAttivitaCompletata(prossimoTurno.id, a.nome);
                          }).length}/${attivita.length} completate`}
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {/* Unifica form e attività - mostra solo attività con relativi bottoni */}
                      {attivita.map((att, idx) => {
                        const isFormActivity = att.form_page || att.richiede_form;
                        const isCorsoActivity = att.corsi_ids?.length > 0;
                        const isCompleted = isFormActivity 
                          ? formDovuti.some(f => f.page === att.form_page && f.completato)
                          : isAttivitaCompletata(prossimoTurno.id, att.nome);
                        
                        return (
                          <div key={`att-${idx}-${att.nome}`} className={`p-3 rounded-xl ${isCompleted ? 'bg-green-100 border-2 border-green-300' : 'bg-white border-2 border-blue-200'} shadow-sm`}>
                            <div className="flex flex-col gap-2">
                              {/* Top: checkbox + info */}
                              <div className="flex items-start gap-3">
                                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-500' : 'bg-slate-200'}`}>
                                  {isCompleted ? (
                                    <Check className="w-4 h-4 text-white" />
                                  ) : (
                                    <span className="w-3 h-3 rounded-full bg-slate-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-medium text-sm ${isCompleted ? 'text-green-800 line-through' : 'text-slate-800'}`}>
                                    {att.nome}
                                  </p>
                                  {(att.ora_inizio || att.ora_fine) && (
                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {att.ora_inizio}{att.ora_fine ? ` - ${att.ora_fine}` : ''}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Bottom: action buttons in full width */}
                              {!isCompleted && prossimoTurno.timbrata_entrata && (
                               <div className="flex gap-2">
                                 {isCorsoActivity && (
                                   <Link 
                                     to={createPageUrl('Academy')}
                                     className="flex-1 px-4 py-2.5 bg-purple-500 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-purple-600 shadow-sm"
                                   >
                                     <GraduationCap className="w-4 h-4" /> Corso
                                   </Link>
                                 )}
                                 {isFormActivity && (
                                   <Link 
                                     to={createPageUrl(att.form_page) + '?redirect=TurniDipendente&turno_id=' + prossimoTurno.id + '&attivita=' + encodeURIComponent(att.nome)}
                                     className="flex-1 px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600 shadow-sm"
                                   >
                                     <FileText className="w-4 h-4" /> Compila Form
                                   </Link>
                                 )}
                                 {!isFormActivity && !isCorsoActivity && (
                                   <button
                                     onClick={() => completaAttivitaMutation.mutate({ turno: prossimoTurno, attivitaNome: att.nome })}
                                     disabled={completaAttivitaMutation.isPending}
                                     className="flex-1 px-4 py-2.5 bg-green-500 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 shadow-sm"
                                   >
                                     <Check className="w-4 h-4" /> Segna Fatto
                                   </button>
                                 )}
                               </div>
                              )}
                              {!isCompleted && !prossimoTurno.timbrata_entrata && (
                               <div className="p-2 bg-yellow-50 rounded-lg text-xs text-yellow-700 flex items-center gap-2">
                                 <AlertCircle className="w-3 h-3" />
                                 Timbra entrata per sbloccare le attività
                               </div>
                              )}
                              {isCompleted && (
                                <span className="px-3 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-xl flex items-center justify-center gap-1">
                                  <CheckCircle className="w-4 h-4" /> Completato
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {/* Form non associati a slot */}
                      {formDovuti.filter(form => !attivita.some(a => a.form_page === form.page)).map((form, idx) => (
                        <div key={`form-extra-${idx}`} className={`p-3 rounded-xl ${form.completato ? 'bg-green-100 border-2 border-green-300' : 'bg-white border-2 border-blue-200'} shadow-sm`}>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-start gap-3">
                              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${form.completato ? 'bg-green-500' : 'bg-slate-200'}`}>
                                {form.completato ? (
                                  <Check className="w-4 h-4 text-white" />
                                ) : (
                                  <span className="w-3 h-3 rounded-full bg-slate-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium text-sm ${form.completato ? 'text-green-800 line-through' : 'text-slate-800'}`}>
                                  {form.nome}
                                </p>
                              </div>
                            </div>
                            {form.completato ? (
                              <span className="px-3 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-xl flex items-center justify-center gap-1">
                                <CheckCircle className="w-4 h-4" /> Completato
                              </span>
                            ) : prossimoTurno.timbrata_entrata ? (
                              <Link 
                                to={createPageUrl(form.page) + '?redirect=TurniDipendente&turno_id=' + prossimoTurno.id + '&attivita=' + encodeURIComponent(form.nome)}
                                className="px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600 shadow-sm"
                              >
                                <FileText className="w-4 h-4" /> Compila Form
                              </Link>
                            ) : (
                              <div className="p-2 bg-yellow-50 rounded-lg text-xs text-yellow-700 flex items-center gap-2">
                                <AlertCircle className="w-3 h-3" />
                                Timbra entrata per sbloccare
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Warning se non tutto completato e turno in corso */}
                    {prossimoTurno.timbrata_entrata && !tuttoCompleto && (
                      <div className="mt-4 p-3 bg-orange-100 rounded-xl border border-orange-300">
                        <p className="text-sm text-orange-800 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Completa tutte le attività prima di timbrare l'uscita
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Bottone Timbra Uscita - solo se turno in corso */}
              {prossimoTurnoStatus.inCorso && (() => {
                // Verifica se tutte le attività sono completate
                const formDovuti = getFormDovutiPerTurno(prossimoTurno);
                const attivita = getAttivitaTurno(prossimoTurno);
                
                // Se non ci sono attività da fare, permetti sempre timbratura
                const haAttivita = attivita.length > 0;
                
                const allAttivitaComplete = attivita.every(att => {
                  const isFormActivity = att.form_page || att.richiede_form;
                  const isCorsoActivity = att.corsi_ids?.length > 0;
                  if (isFormActivity) {
                    return formDovuti.some(f => f.page === att.form_page && f.completato);
                  }
                  if (isCorsoActivity) return true;
                  return isAttivitaCompletata(prossimoTurno.id, att.nome);
                });
                const formNonAssociatiComplete = formDovuti
                  .filter(form => !attivita.some(a => a.form_page === form.page))
                  .every(f => f.completato);
                const tuttoCompleto = !haAttivita || (allAttivitaComplete && formNonAssociatiComplete);
                const canTimbraUscita = prossimoTurnoStatus.canTimbra && tuttoCompleto;
                
                return (
                  <>
                    <NeumorphicButton
                      onClick={() => handleTimbra(prossimoTurno, 'uscita')}
                      variant="primary"
                      className={`w-full flex items-center justify-center gap-2 py-4 text-lg ${
                        !canTimbraUscita ? 'opacity-50 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-green-600'
                      }`}
                      disabled={!canTimbraUscita || loadingGPS || timbraMutation.isPending}
                    >
                      {loadingGPS ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <LogOut className="w-6 h-6" />
                      )}
                      Timbra Uscita
                    </NeumorphicButton>
                    {!canTimbraUscita && (
                      <p className="text-sm text-center mt-2 text-orange-600 font-medium">
                        {haAttivita && !tuttoCompleto 
                          ? '⚠️ Completa tutte le attività prima di timbrare l\'uscita'
                          : prossimoTurnoStatus.reason}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Colleghi in turno */}
            {colleghiProssimoTurno.filter(c => c.dipendente_id !== currentUser?.id).length > 0 && (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Colleghi in turno con te
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {colleghiProssimoTurno
                    .filter(c => c.dipendente_id !== currentUser?.id)
                    .map(collega => (
                      <div key={collega.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          collega.ruolo === 'Pizzaiolo' ? 'bg-orange-500' :
                          collega.ruolo === 'Cassiere' ? 'bg-blue-500' : 'bg-purple-500'
                        }`}>
                          {(collega.dipendente_nome || '?').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{collega.dipendente_nome}</p>
                          <p className="text-xs text-slate-500">{collega.ruolo} • {collega.ora_inizio}-{collega.ora_fine}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </NeumorphicCard>
        )}

        {/* Nessun prossimo turno */}
        {activeView === 'prossimo' && !prossimoTurno && (
          <NeumorphicCard className="p-8 text-center">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Nessun turno programmato</p>
            <p className="text-slate-400 text-sm mt-2">Non hai turni futuri assegnati</p>
          </NeumorphicCard>
        )}

        {/* VISTA: TUTTI I TURNI */}
        {activeView === 'tutti' && (
          <>
        {/* Navigazione settimana */}
        <NeumorphicCard className="p-4">
          <div className="flex items-center justify-between">
            <NeumorphicButton onClick={() => setWeekStart(weekStart.clone().subtract(1, 'week'))}>
              <ChevronLeft className="w-4 h-4" />
            </NeumorphicButton>
            <span className="font-medium text-slate-700">
              {weekStart.format('DD MMM')} - {weekStart.clone().add(6, 'days').format('DD MMM YYYY')}
            </span>
            <NeumorphicButton onClick={() => setWeekStart(weekStart.clone().add(1, 'week'))}>
              <ChevronRight className="w-4 h-4" />
            </NeumorphicButton>
          </div>
        </NeumorphicCard>

        {/* Vista settimanale */}
        <div className="space-y-3">
          {isLoading ? (
            <NeumorphicCard className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
            </NeumorphicCard>
          ) : (
            weekDays.map(day => {
              const dayKey = day.format('YYYY-MM-DD');
              const dayTurni = turniByDay[dayKey] || [];
              const isToday = day.isSame(moment(), 'day');

              return (
                <NeumorphicCard key={dayKey} className={`p-4 ${isToday ? 'border-2 border-blue-400' : ''}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                      isToday ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {day.format('DD')}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">{day.format('dddd')}</div>
                      <div className="text-sm text-slate-500">{day.format('MMMM YYYY')}</div>
                    </div>
                  </div>

                  {dayTurni.length === 0 ? (
                    <p className="text-slate-500 text-sm italic ml-13">Nessun turno</p>
                  ) : (
                    <div className="space-y-2 ml-13">
                      {dayTurni.map(turno => {
                        const hasTimbrato = turno.timbrata_entrata || turno.timbrata_uscita;
                        const turnoStart = moment(`${turno.data} ${turno.ora_inizio}`);
                        const turnoNonIniziato = turnoStart.isAfter(moment());
                        const canScambio = turnoNonIniziato && !turno.timbrata_entrata && 
                          (!turno.richiesta_scambio || !['pending', 'accepted_by_colleague'].includes(turno.richiesta_scambio?.stato));
                        
                        return (
                        <div key={turno.id} className={`p-3 rounded-lg border ${COLORI_RUOLO[turno.ruolo]} ${turno.is_prova ? 'ring-2 ring-purple-500' : ''}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">{turno.ora_inizio} - {turno.ora_fine}</span>
                              {turno.is_prova && (
                                <span className="px-2 py-0.5 bg-purple-500 text-white rounded-full text-[10px] font-bold">
                                  🧪 PROVA
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{turno.ruolo}</span>
                              {canScambio && (
                                <button
                                  onClick={() => openScambioModal(turno)}
                                  className="p-1 bg-white bg-opacity-50 rounded hover:bg-opacity-80"
                                  title="Richiedi scambio"
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                </button>
                              )}
                              {turno.richiesta_scambio?.stato === 'pending' && (
                                <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full text-xs font-medium flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {turno.richiesta_scambio?.richiesto_da === currentUser?.id ? 'Richiesto' : 'Da rispondere'}
                                </span>
                              )}
                              {turno.richiesta_scambio?.stato === 'accepted_by_colleague' && (
                                <span className="px-2 py-0.5 bg-blue-200 text-blue-800 rounded-full text-xs">
                                  Da approvare
                                </span>
                              )}
                              {turno.richiesta_scambio?.stato === 'approved_by_manager' && (
                                <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded-full text-xs">
                                  Approvato
                                </span>
                              )}
                              {turno.richiesta_scambio?.stato === 'rejected_by_colleague' && (
                                <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded-full text-xs">
                                  Rifiutato
                                </span>
                              )}
                              {turno.richiesta_scambio?.stato === 'rejected_by_manager' && (
                                <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded-full text-xs">
                                  Negato
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-sm opacity-80 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {getStoreName(turno.store_id)}
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  )}
                </NeumorphicCard>
              );
            })
          )}
        </div>
          </>
        )}

        {/* VISTA: FERIE */}
        {activeView === 'ferie' && (
          <div className="space-y-4">
            {/* Form nuova richiesta */}
            <NeumorphicCard className="p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Palmtree className="w-5 h-5 text-blue-500" />
                Richiedi Nuove Ferie
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data Inizio</label>
                  <input
                    type="date"
                    value={ferieForm.data_inizio}
                    onChange={(e) => setFerieForm({ ...ferieForm, data_inizio: e.target.value })}
                    min={moment().format('YYYY-MM-DD')}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data Fine</label>
                  <input
                    type="date"
                    value={ferieForm.data_fine}
                    onChange={(e) => setFerieForm({ ...ferieForm, data_fine: e.target.value })}
                    min={ferieForm.data_inizio || moment().format('YYYY-MM-DD')}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Motivo (opz.)</label>
                  <input
                    type="text"
                    value={ferieForm.motivo}
                    onChange={(e) => setFerieForm({ ...ferieForm, motivo: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                    placeholder="Vacanza, motivi personali..."
                  />
                </div>
              </div>
              {ferieForm.data_inizio && ferieForm.data_fine && (
                <p className="text-sm text-blue-600 mt-2">
                  Turni coinvolti: {turniFuturi.filter(t => t.data >= ferieForm.data_inizio && t.data <= ferieForm.data_fine).length}
                </p>
              )}
              <NeumorphicButton
                onClick={() => richiestaFerieMutation.mutate(ferieForm)}
                variant="primary"
                className="mt-4"
                disabled={!ferieForm.data_inizio || !ferieForm.data_fine || richiestaFerieMutation.isPending}
              >
                {richiestaFerieMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invia Richiesta Ferie'}
              </NeumorphicButton>
            </NeumorphicCard>

            {/* Storico richieste */}
            <NeumorphicCard className="p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Le Mie Richieste Ferie</h2>
              {mieFerie.length === 0 ? (
                <p className="text-slate-500 text-center py-4">Nessuna richiesta di ferie</p>
              ) : (
                <div className="space-y-3">
                  {mieFerie.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(ferie => (
                    <div key={ferie.id} className="neumorphic-pressed p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-800">
                            {moment(ferie.data_inizio).format('DD/MM/YYYY')} - {moment(ferie.data_fine).format('DD/MM/YYYY')}
                          </p>
                          {ferie.motivo && <p className="text-sm text-slate-500">{ferie.motivo}</p>}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatoColor(ferie.stato)}`}>
                          {getStatoLabel(ferie.stato)}
                        </span>
                      </div>
                      {ferie.note_admin && (
                        <p className="text-xs text-slate-500 mt-2 italic">Note: {ferie.note_admin}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </NeumorphicCard>
          </div>
        )}

        {/* VISTA: MALATTIA */}
        {activeView === 'malattia' && (
          <div className="space-y-4">
            {/* Form nuova richiesta */}
            <NeumorphicCard className="p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-red-500" />
                Segnala Malattia
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={malattiaForm.data_inizio}
                    onChange={(e) => setMalattiaForm({ ...malattiaForm, data_inizio: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrizione (opz.)</label>
                  <input
                    type="text"
                    value={malattiaForm.descrizione}
                    onChange={(e) => setMalattiaForm({ ...malattiaForm, descrizione: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                    placeholder="Descrivi brevemente..."
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Certificato Medico (opzionale)</label>
                <div className="neumorphic-pressed p-4 rounded-xl">
                  {malattiaForm.certificato_url ? (
                    <div className="flex items-center gap-2 text-green-700">
                      <FileText className="w-5 h-5" />
                      <span className="text-sm">Certificato caricato</span>
                      <button onClick={() => setMalattiaForm({ ...malattiaForm, certificato_url: null })} className="text-red-500 ml-auto">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-3 cursor-pointer">
                      {uploadingCertificato ? (
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                      ) : (
                        <Upload className="w-6 h-6 text-slate-400" />
                      )}
                      <span className="text-sm text-slate-500">Clicca per caricare</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleUploadCertificato(e.target.files[0])}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl mt-4 space-y-2">
                <p className="text-sm text-orange-700">
                  ⚠️ I tuoi turni verranno segnati come "Malattia (Non Certificata)" fino all'approvazione del certificato.
                </p>
                <p className="text-sm text-red-600 font-medium">
                  📋 Hai 5 giorni dall'ultimo giorno di malattia per caricare il certificato medico. Dopo tale data l'assenza verrà considerata non giustificata.
                </p>
              </div>
              <NeumorphicButton
                onClick={() => richiestaMalattiaMutation.mutate(malattiaForm)}
                variant="primary"
                className="mt-4"
                disabled={!malattiaForm.data_inizio || richiestaMalattiaMutation.isPending}
              >
                {richiestaMalattiaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invia Segnalazione'}
              </NeumorphicButton>
            </NeumorphicCard>

            {/* Storico malattie */}
            <NeumorphicCard className="p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Le Mie Malattie</h2>
              {mieMalattie.length === 0 ? (
                <p className="text-slate-500 text-center py-4">Nessuna malattia registrata</p>
              ) : (
                <div className="space-y-3">
                  {mieMalattie.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(malattia => {
                    // Calcola scadenza certificato (5 giorni dall'ultimo giorno di malattia)
                    const dataFine = malattia.data_fine || malattia.data_inizio;
                    const scadenzaCertificato = moment(dataFine).add(5, 'days');
                    const giorniRimanenti = scadenzaCertificato.diff(moment(), 'days');
                    const isScaduto = giorniRimanenti < 0;
                    const needsCertificato = !malattia.certificato_url && (malattia.stato === 'non_certificata' || malattia.stato === 'in_attesa_verifica');
                    
                    return (
                    <div key={malattia.id} className={`neumorphic-pressed p-4 rounded-xl ${isScaduto && needsCertificato ? 'border-2 border-red-300 bg-red-50' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">
                            {moment(malattia.data_inizio).format('DD/MM/YYYY')}
                            {malattia.data_fine && ` - ${moment(malattia.data_fine).format('DD/MM/YYYY')}`}
                          </p>
                          {malattia.descrizione && <p className="text-sm text-slate-500">{malattia.descrizione}</p>}
                          {malattia.certificato_url ? (
                            <a href={malattia.certificato_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs flex items-center gap-1 mt-1">
                              <FileText className="w-3 h-3" /> Vedi Certificato
                            </a>
                          ) : needsCertificato && (
                            <div className="mt-2">
                              {/* Scadenza certificato */}
                              {isScaduto ? (
                                <div className="p-2 bg-red-100 rounded-lg mb-2">
                                  <p className="text-xs text-red-700 font-medium flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Scadenza superata - Assenza non giustificata
                                  </p>
                                </div>
                              ) : giorniRimanenti <= 5 && (
                                <div className="p-2 bg-orange-100 rounded-lg mb-2">
                                  <p className="text-xs text-orange-700 font-medium flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    {giorniRimanenti === 0 
                                      ? 'Scade oggi!' 
                                      : `Scade tra ${giorniRimanenti} giorn${giorniRimanenti === 1 ? 'o' : 'i'}`}
                                  </p>
                                  <p className="text-xs text-orange-600 mt-1">
                                    Carica il certificato entro il {scadenzaCertificato.format('DD/MM/YYYY')}
                                  </p>
                                </div>
                              )}
                              
                              {uploadingCertificatoForId === malattia.id ? (
                                <div className="flex items-center gap-2 text-blue-600">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span className="text-xs">Caricamento...</span>
                                </div>
                              ) : (
                                <label className={`flex items-center gap-2 cursor-pointer text-xs px-3 py-2 rounded-lg ${isScaduto ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                                  <Upload className="w-4 h-4" />
                                  <span>Carica certificato</span>
                                  <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files[0]) {
                                        setUploadingCertificatoForId(malattia.id);
                                        uploadCertificatoMutation.mutate({ malattiaId: malattia.id, file: e.target.files[0] });
                                      }
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${isScaduto && needsCertificato ? 'bg-red-200 text-red-800' : getStatoColor(malattia.stato)}`}>
                          {isScaduto && needsCertificato ? 'Non Giustificata' : getStatoLabel(malattia.stato)}
                        </span>
                      </div>
                      {malattia.note_admin && (
                        <p className="text-xs text-slate-500 mt-2 italic">Note: {malattia.note_admin}</p>
                      )}
                    </div>
                  );
                  })}
                  </div>
                  )}
                  </NeumorphicCard>
                  </div>
                  )}

        {/* VISTA: SCAMBI */}
        {activeView === 'scambi' && (
          <>
          <div className="space-y-4">
            {/* Sezione 1: Scambi richiesti DA ME */}
            <NeumorphicCard className="p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-500" />
                Scambi Richiesti da Me
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Richieste di scambio che hai inviato ai tuoi colleghi
              </p>

              {scambiDaMePending.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Nessuna richiesta in corso</p>
              ) : (
                <div className="space-y-3">
                  {scambiDaMePending.map(mioTurno => {
                    const scambio = mioTurno.richiesta_scambio;
                    const suoTurnoId = scambio?.suo_turno_id;
                    const statoScambio = scambio?.stato;

                    // Trova il turno del collega
                    const suoTurno = turniFuturi.find(t => t.id === suoTurnoId);

                    return (
                      <div key={mioTurno.id} className="neumorphic-pressed p-4 rounded-xl">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <ArrowRightLeft className="w-5 h-5 text-purple-500" />
                              <span className="font-bold text-slate-800">{scambio.richiesto_da_nome}</span>
                              <span className="text-slate-500">↔</span>
                              <span className="font-bold text-slate-800">{scambio.richiesto_a_nome}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Turno CEDUTO */}
                              <div className="p-3 bg-red-50 rounded-lg border-2 border-red-200">
                                <p className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1">
                                  <X className="w-3 h-3" />
                                  Cedi questo:
                                </p>
                                <p className="font-medium text-slate-700 text-sm">
                                  {moment(mioTurno.data).format('ddd DD/MM')}
                                </p>
                                <div className="text-xs text-slate-600 mt-1">
                                  🕐 {mioTurno.ora_inizio} - {mioTurno.ora_fine}
                                </div>
                                <div className="text-xs text-slate-600">
                                  👤 {mioTurno.ruolo}
                                </div>
                                <div className="text-xs text-slate-500">
                                  📍 {getStoreName(mioTurno.store_id)}
                                </div>
                              </div>

                              {/* Turno RICHIESTO */}
                              {suoTurno && (
                                <div className="p-3 bg-green-50 rounded-lg border-2 border-green-200">
                                  <p className="text-xs font-bold text-green-600 mb-2 flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    Prendi questo:
                                  </p>
                                  <p className="font-medium text-slate-700 text-sm">
                                    {moment(suoTurno.data).format('ddd DD/MM')}
                                  </p>
                                  <div className="text-xs text-slate-600 mt-1">
                                    🕐 {suoTurno.ora_inizio} - {suoTurno.ora_fine}
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    👤 {suoTurno.ruolo}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    📍 {getStoreName(suoTurno.store_id)}
                                  </div>
                                </div>
                              )}
                            </div>

                            <p className="text-xs text-slate-400 mt-2">
                              Richiesto il {moment(scambio.data_richiesta).format('DD/MM/YYYY HH:mm')}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 ml-3">
                            {statoScambio === 'pending' ? (
                              <>
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium text-center">
                                  In attesa collega
                                </span>
                                <button
                                  onClick={() => cancellaScambioMutation.mutate({
                                    mioTurnoId: mioTurno.id,
                                    suoTurnoId: suoTurnoId
                                  })}
                                  disabled={cancellaScambioMutation.isPending}
                                  className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" /> Cancella
                                </button>
                              </>
                            ) : (
                              <div className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium text-center">
                                <CheckCircle className="w-4 h-4 mx-auto mb-1" />
                                Accettato<br/>
                                <span className="text-[10px]">In attesa manager</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </NeumorphicCard>

            {/* Sezione 2: Scambi richiesti A ME */}
            <NeumorphicCard className="p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                Richieste Ricevute
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Colleghi che vogliono scambiare il loro turno con te
              </p>

              {scambiPerMe.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Nessuna richiesta ricevuta</p>
              ) : (
                <div className="space-y-3">
                {scambiPerMe.map(turno => {
                  const scambio = turno.richiesta_scambio;
                  const mioTurnoId = scambio?.mio_turno_id;
                  const mioTurno = turniFuturi.find(t => t.id === mioTurnoId);
                  const statoScambio = scambio?.stato;

                  return (
                  <div key={turno.id} className="neumorphic-pressed p-4 rounded-xl">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <ArrowRightLeft className="w-5 h-5 text-purple-500" />
                          <span className="font-bold text-slate-800">{scambio.richiesto_da_nome}</span>
                          <span className="text-slate-500">↔</span>
                          <span className="font-bold text-slate-800">Tu</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Turno che il RICHIEDENTE cede (e tu prenderesti) */}
                          {mioTurno && (
                            <div className="p-3 bg-green-50 rounded-lg border-2 border-green-200">
                              <p className="text-xs font-bold text-green-600 mb-2 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Prendi questo:
                              </p>
                              <p className="font-medium text-slate-700 text-sm">
                                {moment(mioTurno.data).format('ddd DD/MM')}
                              </p>
                              <div className="text-xs text-slate-600 mt-1">
                                🕐 {mioTurno.ora_inizio} - {mioTurno.ora_fine}
                              </div>
                              <div className="text-xs text-slate-600">
                                👤 {mioTurno.ruolo}
                              </div>
                              <div className="text-xs text-slate-500">
                                📍 {getStoreName(mioTurno.store_id)}
                              </div>
                            </div>
                          )}

                          {/* Il TUO turno che cedi */}
                          <div className="p-3 bg-red-50 rounded-lg border-2 border-red-200">
                            <p className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1">
                              <X className="w-3 h-3" />
                              Cedi questo:
                            </p>
                            <p className="font-medium text-slate-700 text-sm">
                              {moment(turno.data).format('ddd DD/MM')}
                            </p>
                            <div className="text-xs text-slate-600 mt-1">
                              🕐 {turno.ora_inizio} - {turno.ora_fine}
                            </div>
                            <div className="text-xs text-slate-600">
                              👤 {turno.ruolo}
                            </div>
                            <div className="text-xs text-slate-500">
                              📍 {getStoreName(turno.store_id)}
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 mt-2">
                          Richiesto il {moment(scambio.data_richiesta).format('DD/MM/YYYY HH:mm')}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 ml-3">
                        {statoScambio === 'pending' ? (
                          <>
                            <button
                              onClick={() => rispondiScambioMutation.mutate({ suoTurnoId: turno.id, accetta: true })}
                              disabled={rispondiScambioMutation.isPending}
                              className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Accetta
                            </button>
                            <button
                              onClick={() => rispondiScambioMutation.mutate({ suoTurnoId: turno.id, accetta: false })}
                              disabled={rispondiScambioMutation.isPending}
                              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 flex items-center gap-1"
                            >
                              <X className="w-3 h-3" /> Rifiuta
                            </button>
                          </>
                        ) : (
                          <div className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium text-center">
                            <CheckCircle className="w-4 h-4 mx-auto mb-1" />
                            Accettato<br/>
                            <span className="text-[10px]">In attesa approvazione Store Manager</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            )}
          </NeumorphicCard>
          </div>
          </>
        )}

        {/* VISTA: TURNI LIBERI */}
        {activeView === 'liberi' && (
          <NeumorphicCard className="p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              Turni Liberi Disponibili
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Questi turni corrispondono ai tuoi ruoli ({currentUser?.ruoli_dipendente?.join(', ')}) e sono disponibili.
            </p>
            
            {turniLiberi.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Nessun turno libero disponibile per i tuoi ruoli</p>
            ) : (
              <div className="space-y-3">
                {turniLiberi.sort((a, b) => a.data.localeCompare(b.data)).map(turno => {
                  const giaRichiesto = mieRichiesteTurni.some(r => r.turno_id === turno.id && r.stato === 'in_attesa');
                  return (
                    <div key={turno.id} className="neumorphic-pressed p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-800">
                            {moment(turno.data).format('dddd DD MMMM')}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock className="w-4 h-4" />
                            <span>{turno.ora_inizio} - {turno.ora_fine}</span>
                            <span>•</span>
                            <span>{turno.ruolo}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                            <MapPin className="w-3 h-3" />
                            {getStoreName(turno.store_id)}
                            {turno.tipo_turno && turno.tipo_turno !== 'Normale' && (
                              <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                {turno.tipo_turno}
                              </span>
                            )}
                          </div>
                        </div>
                        {giaRichiesto ? (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            Richiesto
                          </span>
                        ) : (
                          <NeumorphicButton
                            onClick={() => richiediTurnoLiberoMutation.mutate(turno)}
                            variant="primary"
                            className="text-sm"
                            disabled={richiediTurnoLiberoMutation.isPending}
                          >
                            Richiedi
                          </NeumorphicButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Richieste in corso */}
            {mieRichiesteTurni.filter(r => r.stato === 'in_attesa').length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h3 className="font-bold text-slate-700 mb-3">Le tue richieste in attesa</h3>
                <div className="space-y-2">
                  {mieRichiesteTurni.filter(r => r.stato === 'in_attesa').map(richiesta => (
                    <div key={richiesta.id} className="p-3 bg-yellow-50 rounded-xl text-sm">
                      <span className="font-medium">{moment(richiesta.data_turno).format('DD/MM/YYYY')}</span>
                      <span className="text-slate-500"> • {richiesta.ora_inizio}-{richiesta.ora_fine}</span>
                      <span className="text-slate-500"> • {richiesta.store_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </NeumorphicCard>
        )}

        {/* Modal Scambio Turno */}
        {showScambioModal && selectedTurnoScambio && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Richiedi Scambio Turno</h2>
                <button onClick={() => { setShowScambioModal(false); setSelectedTurnoScambio(null); }} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-blue-50 rounded-xl">
                <div className="font-medium text-blue-800">
                  {moment(selectedTurnoScambio.data).format('dddd DD MMMM YYYY')}
                </div>
                <div className="text-sm text-blue-700">
                  {selectedTurnoScambio.ora_inizio} - {selectedTurnoScambio.ora_fine} • {selectedTurnoScambio.ruolo}
                </div>
                <div className="text-sm text-blue-600">
                  {getStoreName(selectedTurnoScambio.store_id)}
                </div>
              </div>

              <h3 className="font-medium text-slate-700 mb-3">Seleziona un collega:</h3>

              {colleghiPerScambio.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-slate-500 mb-2">
                    Nessun collega disponibile con il ruolo {selectedTurnoScambio.ruolo}
                  </p>
                  <p className="text-xs text-slate-400">
                    Totale dipendenti: {allEmployees.length} | Apri console (F12) per debug
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {colleghiPerScambio.map(collega => {
                    const isSelected = selectedCollegaScambio?.id === collega.id;
                    return (
                    <div 
                      key={collega.id}
                      className={`p-4 rounded-xl border transition-all ${
                        collega.haConflitti ? 'border-red-300 bg-red-50 cursor-not-allowed opacity-60' :
                        isSelected ? 'border-blue-500 bg-blue-100' :
                        'border-green-300 bg-green-50 cursor-pointer hover:bg-green-100'
                      }`}
                      onClick={() => {
                        if (!collega.haConflitti) {
                          setSelectedCollegaScambio(collega);
                          setSelectedTurnoCollegaScambio(null);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                            {(collega.nome_cognome || collega.full_name || '?').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{collega.nome_cognome || collega.full_name}</div>
                            <div className="text-xs text-slate-500">{(collega.ruoli_dipendente || []).join(', ')}</div>
                            {!collega.isAssegnatoStore && (
                              <div className="text-xs text-orange-600 flex items-center gap-1 mt-0.5">
                                <AlertTriangle className="w-3 h-3" />
                                Non assegnato a questo store
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {collega.haConflitti ? (
                            <span className="flex items-center gap-1 text-xs text-red-700 bg-red-200 px-2 py-1 rounded-full font-medium">
                              <X className="w-3 h-3" />
                              Conflitto orario
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-green-700 bg-green-200 px-2 py-1 rounded-full font-medium">
                              <Check className="w-3 h-3" />
                              Disponibile
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Mostra turni del collega in quel giorno */}
                      {collega.tuttiTurniGiorno.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <p className="text-xs font-medium text-slate-600 mb-1">Turni del collega in questo giorno:</p>
                          <div className="space-y-1">
                            {collega.tuttiTurniGiorno.map(turno => {
                              const isSovrapposto = collega.turniSovrapposti.some(t => t.id === turno.id);
                              return (
                                <div 
                                  key={turno.id}
                                  className={`text-xs p-2 rounded-lg flex items-center justify-between ${
                                    isSovrapposto ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-3 h-3" />
                                    <span>{turno.ora_inizio} - {turno.ora_fine}</span>
                                    <span>•</span>
                                    <span>{getStoreName(turno.store_id)}</span>
                                  </div>
                                  {isSovrapposto && (
                                    <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                                      <AlertTriangle className="w-3 h-3" />
                                      Sovrapposto
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {collega.tuttiTurniGiorno.length === 0 && !collega.haConflitti && (
                        <div className="mt-2 pt-2 border-t border-green-200">
                          <p className="text-xs text-green-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Nessun altro turno in questo giorno - completamente libero
                          </p>
                        </div>
                        )}
                        </div>
                        );
                        })}
                </div>
              )}

              {/* Selezione turno del collega */}
              {selectedCollegaScambio && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <h3 className="font-medium text-blue-800 mb-3">
                    Seleziona il turno di {selectedCollegaScambio.nome_cognome || selectedCollegaScambio.full_name} da scambiare:
                  </h3>
                  {turniFuturiCollega.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">
                      Nessun turno futuro disponibile per questo collega
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {turniFuturiCollega.map(turnoC => {
                        const isSelectedTurno = selectedTurnoCollegaScambio?.id === turnoC.id;
                        return (
                          <div
                            key={turnoC.id}
                            className={`p-3 rounded-lg border transition-all cursor-pointer ${
                              isSelectedTurno 
                                ? 'border-blue-500 bg-blue-100' 
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                            onClick={() => setSelectedTurnoCollegaScambio(turnoC)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-slate-800">
                                  {moment(turnoC.data).format('dddd DD MMMM YYYY')}
                                </p>
                                <div className="text-sm text-slate-600 flex items-center gap-2">
                                  <Clock className="w-3 h-3" />
                                  <span>{turnoC.ora_inizio} - {turnoC.ora_fine}</span>
                                  <span>•</span>
                                  <span>{turnoC.ruolo}</span>
                                </div>
                                <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3" />
                                  {getStoreName(turnoC.store_id)}
                                </div>
                              </div>
                              {isSelectedTurno && (
                                <Check className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <NeumorphicButton 
                  onClick={() => { 
                    setShowScambioModal(false); 
                    setSelectedTurnoScambio(null);
                    setSelectedCollegaScambio(null);
                    setSelectedTurnoCollegaScambio(null);
                  }} 
                  className="flex-1"
                >
                  Annulla
                </NeumorphicButton>
                {selectedCollegaScambio && selectedTurnoCollegaScambio && (
                  <NeumorphicButton
                    onClick={() => {
                      richiestaScambioMutation.mutate({
                        mioTurnoId: selectedTurnoScambio.id,
                        suoTurnoId: selectedTurnoCollegaScambio.id,
                        richiestoA: selectedCollegaScambio.id
                      });
                    }}
                    disabled={richiestaScambioMutation.isPending}
                    variant="primary"
                    className="flex-1"
                  >
                    {richiestaScambioMutation.isPending ? 'Invio...' : 'Conferma Scambio'}
                  </NeumorphicButton>
                )}
              </div>
            </NeumorphicCard>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}