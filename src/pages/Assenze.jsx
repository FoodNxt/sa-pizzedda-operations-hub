import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { Calendar, Thermometer, Check, X, Clock, FileText, User, AlertCircle, Copy, Loader2, Users, ArrowRightLeft, CheckCircle, MapPin, Edit, ChevronDown, ChevronRight } from "lucide-react";
import moment from "moment";

// Componente per mostrare il turno dell'altro dipendente
function TurnoAltroDisplay({ turnoId, richiestoANome, getStoreName }) {
  const { data: turnoAltro, isLoading } = useQuery({
    queryKey: ['turno-altro', turnoId],
    queryFn: async () => {
      const turni = await base44.entities.TurnoPlanday.filter({ id: turnoId });
      return turni[0] || null;
    },
    enabled: !!turnoId
  });

  if (isLoading) {
    return (
      <div className="p-3 bg-green-50 rounded-lg border-2 border-green-200">
        <Loader2 className="w-4 h-4 animate-spin text-green-600" />
      </div>);

  }

  if (!turnoAltro) return null;

  return (
    <div className="p-3 bg-green-50 rounded-lg border-2 border-green-200">
      <p className="text-xs font-bold text-green-600 mb-2 flex items-center gap-1">
        <Check className="w-3 h-3" />
        {richiestoANome} RICEVE:
      </p>
      <p className="font-medium text-slate-700 text-sm">
        {turnoAltro.data && moment(turnoAltro.data).isValid() ? moment(turnoAltro.data).format('ddd DD/MM') : 'N/A'}
      </p>
      <div className="text-xs text-slate-600 mt-1">
        🕐 {turnoAltro.ora_inizio} - {turnoAltro.ora_fine}
      </div>
      <div className="text-xs text-slate-600">
        👤 {turnoAltro.ruolo}
      </div>
      <div className="text-xs text-slate-500">
        📍 {getStoreName(turnoAltro.store_id)}
      </div>
      <div className="text-xs text-slate-400 mt-1 pt-1 border-t border-green-200">
        Originale: {turnoAltro.dipendente_nome}
      </div>
    </div>);

}

// Componente per contare turni coinvolti - usa dati già caricati
function TurniCoinvoltiCountDisplay({ turniIds, dipendenteId, allTurni }) {
  const turniEffettivi = allTurni.filter((t) =>
  turniIds?.includes(t.id) && t.dipendente_id === dipendenteId
  );

  return (
    <p className="text-xs text-slate-400">Turni coinvolti: {turniEffettivi.length}</p>);

}

// Componente per mostrare turni coinvolti - usa dati già caricati
function TurniCoinvoltiDisplay({ turniIds, dipendenteId, getStoreName, allTurni }) {
  const turni = allTurni.filter((t) =>
  turniIds?.includes(t.id) && t.dipendente_id === dipendenteId
  );

  if (turni.length === 0) return <p className="text-xs text-slate-500">Nessun turno assegnato trovato</p>;

  return (
    <div className="space-y-2">
      {turni.map((turno) =>
      <div key={turno.id} className="text-xs bg-white rounded p-2 border border-blue-100">
          <div className="font-medium text-slate-700">
            {turno.data && moment(turno.data).isValid() ? moment(turno.data).format('ddd DD/MM/YYYY') : 'N/A'}
          </div>
          <div className="text-slate-600 mt-1">
            🕐 {turno.ora_inizio} - {turno.ora_fine} • {turno.ruolo}
          </div>
          <div className="text-slate-500">
            📍 {getStoreName(turno.store_id)}
          </div>
        </div>
      )}
    </div>);

}

export default function Assenze() {
  const [activeTab, setActiveTab] = useState('ferie');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalMode, setApprovalMode] = useState(null); // 'ferie_only' o 'ferie_liberi'
  const [expandedSections, setExpandedSections] = useState({
    ferie_attesa: true,
    ferie_approvate: false,
    ferie_rifiutate: false,
    malattia_certificate: false,
    malattia_non_certificate: false,
    malattia_rifiutate: false
  });
  const [selectedDipendente, setSelectedDipendente] = useState('all');
  const queryClient = useQueryClient();

  // Richieste turni liberi
  const { data: richiesteTurniLiberi = [], isLoading: loadingTurniLiberi } = useQuery({
    queryKey: ['richieste-turni-liberi'],
    queryFn: () => base44.entities.RichiestaTurnoLibero.list('-created_date')
  });

  const approvaRichiestaTurnoMutation = useMutation({
    mutationFn: async ({ richiestaId, turnoId, dipendenteId, dipendenteNome }) => {
      await base44.entities.TurnoPlanday.update(turnoId, {
        dipendente_id: dipendenteId,
        dipendente_nome: dipendenteNome
      });
      return base44.entities.RichiestaTurnoLibero.update(richiestaId, {
        stato: 'approvata',
        data_approvazione: new Date().toISOString()
      });
    },
    onMutate: async ({ richiestaId }) => {
      await queryClient.cancelQueries({ queryKey: ['richieste-turni-liberi'] });
      const previous = queryClient.getQueryData(['richieste-turni-liberi']);
      
      queryClient.setQueryData(['richieste-turni-liberi'], old => 
        old?.map(r => r.id === richiestaId ? { ...r, stato: 'approvata' } : r)
      );
      
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['richieste-turni-liberi'], context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['richieste-turni-liberi'] });
      queryClient.invalidateQueries({ queryKey: ['turni-planday-assenze'] });
    }
  });

  const rifiutaRichiestaTurnoMutation = useMutation({
    mutationFn: ({ richiestaId }) => {
      return base44.entities.RichiestaTurnoLibero.update(richiestaId, {
        stato: 'rifiutata',
        data_approvazione: new Date().toISOString()
      });
    },
    onMutate: async ({ richiestaId }) => {
      await queryClient.cancelQueries({ queryKey: ['richieste-turni-liberi'] });
      const previous = queryClient.getQueryData(['richieste-turni-liberi']);
      
      queryClient.setQueryData(['richieste-turni-liberi'], old => 
        old?.map(r => r.id === richiestaId ? { ...r, stato: 'rifiutata' } : r)
      );
      
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['richieste-turni-liberi'], context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['richieste-turni-liberi'] });
    }
  });

  // Scambi turno
  const { data: turniConScambio = [], isLoading: loadingScambi } = useQuery({
    queryKey: ['turni-con-scambio'],
    queryFn: async () => {
      const allTurni = await base44.entities.TurnoPlanday.list('-data', 500);
      // Mostra solo il turno del richiedente (mio_turno_id) per evitare duplicati
      return allTurni.filter((t) =>
      t.richiesta_scambio &&
      t.richiesta_scambio.stato &&
      t.id === t.richiesta_scambio.mio_turno_id
      );
    }
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const getUserName = (userId) => {
    const user = allUsers.find((u) => u.id === userId);
    return user?.nome_cognome || user?.full_name || 'Utente';
  };

  const getStoreName = (storeId) => stores.find((s) => s.id === storeId)?.name || '';

  const { data: richiesteFerie = [], isLoading: loadingFerie } = useQuery({
    queryKey: ['richieste-ferie'],
    queryFn: () => base44.entities.RichiestaFerie.list('-created_date', 200)
  });

  const { data: richiesteMalattia = [], isLoading: loadingMalattia } = useQuery({
    queryKey: ['richieste-malattia'],
    queryFn: () => base44.entities.RichiestaMalattia.list('-created_date', 200)
  });

  const { data: turniPlanday = [] } = useQuery({
    queryKey: ['turni-planday-assenze'],
    queryFn: () => base44.entities.TurnoPlanday.list('-data', 500)
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const isStoreManager = user?.user_type === 'manager';

  const updateFerieMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RichiestaFerie.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['richieste-ferie'] });
      setSelectedRequest(null);
      setApprovalMode(null);
    }
  });

  const updateMalattiaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RichiestaMalattia.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['richieste-malattia'] });
      const previous = queryClient.getQueryData(['richieste-malattia']);
      
      queryClient.setQueryData(['richieste-malattia'], old => 
        old?.map(r => r.id === id ? { ...r, ...data } : r)
      );
      
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['richieste-malattia'], context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['richieste-malattia'] });
      setSelectedRequest(null);
    }
  });

  const updateTurnoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TurnoPlanday.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-planday-assenze'] });
      queryClient.invalidateQueries({ queryKey: ['richieste-malattia'] });
    }
  });

  const [changingTipoTurno, setChangingTipoTurno] = useState(null);
  const [newTipoTurno, setNewTipoTurno] = useState('');

  const { data: tipoTurnoConfigs = [] } = useQuery({
    queryKey: ['tipo-turno-configs'],
    queryFn: () => base44.entities.TipoTurnoConfig.list()
  });

  const tipiTurnoDisponibili = React.useMemo(() => {
    const defaultTipi = ["Normale", "Straordinario", "Formazione", "Affiancamento", "Apertura", "Chiusura", "Ferie", "Malattia (Certificata)", "Malattia (Non Certificata)", "Permesso"];
    const tipiFromConfigs = tipoTurnoConfigs.map((c) => c.tipo_turno);
    return [...new Set([...defaultTipi, ...tipiFromConfigs])];
  }, [tipoTurnoConfigs]);

  const createTurnoMutation = useMutation({
    mutationFn: (data) => base44.entities.TurnoPlanday.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-planday-assenze'] });
    }
  });

  const handleApproveFerie = async (request, mode) => {
    // Filtra solo i turni effettivamente assegnati al dipendente
    const turniAssegnati = turniPlanday.filter((t) =>
    (request.turni_coinvolti || []).includes(t.id) &&
    t.dipendente_id === request.dipendente_id
    );

    // Aggiorna i turni coinvolti
    for (const turno of turniAssegnati) {
      if (mode === 'ferie_liberi') {
        // Crea copia del turno come libero
        await createTurnoMutation.mutateAsync({
          ...turno,
          id: undefined,
          dipendente_id: '',
          dipendente_nome: '',
          tipo_turno: 'Normale',
          note: `Turno liberato per ferie di ${request.dipendente_nome}`
        });
      }
      // Aggiorna turno originale come Ferie
      await updateTurnoMutation.mutateAsync({
        id: turno.id,
        data: { tipo_turno: 'Ferie' }
      });
    }

    // Approva la richiesta
    await updateFerieMutation.mutateAsync({
      id: request.id,
      data: {
        stato: 'approvata',
        turni_resi_liberi: mode === 'ferie_liberi',
        data_approvazione: new Date().toISOString(),
        approvato_da: user?.email
      }
    });
  };

  const handleRejectFerie = async (request) => {
    await updateFerieMutation.mutateAsync({
      id: request.id,
      data: {
        stato: 'rifiutata',
        data_approvazione: new Date().toISOString(),
        approvato_da: user?.email
      }
    });
  };

  const handleVerifyMalattia = async (request, approved) => {
    // Filtra solo i turni effettivamente assegnati al dipendente
    const turniAssegnati = turniPlanday.filter((t) =>
    (request.turni_coinvolti || []).includes(t.id) &&
    t.dipendente_id === request.dipendente_id
    );

    // Aggiorna i turni coinvolti e crea turni liberi se approvato
    for (const turno of turniAssegnati) {
      if (approved) {
        // Crea turno libero per sostituzione
        await createTurnoMutation.mutateAsync({
          store_id: turno.store_id,
          data: turno.data,
          ora_inizio: turno.ora_inizio,
          ora_fine: turno.ora_fine,
          ruolo: turno.ruolo,
          dipendente_id: '',
          dipendente_nome: '',
          tipo_turno: 'Normale',
          momento_turno: turno.momento_turno,
          turno_sequence: turno.turno_sequence,
          note: `Turno liberato per malattia di ${request.dipendente_nome}`
        });
      }

      await updateTurnoMutation.mutateAsync({
        id: turno.id,
        data: {
          tipo_turno: approved ? 'Malattia (Certificata)' : 'Malattia (Non Certificata)'
        }
      });
    }

    await updateMalattiaMutation.mutateAsync({
      id: request.id,
      data: {
        stato: approved ? 'certificata' : 'rifiutata',
        data_verifica: new Date().toISOString(),
        verificato_da: user?.email
      }
    });
  };

  const getStatoColor = (stato) => {
    switch (stato) {
      case 'in_attesa':return 'bg-yellow-100 text-yellow-800';
      case 'approvata':case 'certificata':return 'bg-green-100 text-green-800';
      case 'rifiutata':return 'bg-red-100 text-red-800';
      case 'non_certificata':return 'bg-orange-100 text-orange-800';
      case 'in_attesa_verifica':return 'bg-blue-100 text-blue-800';
      default:return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatoLabel = (stato) => {
    switch (stato) {
      case 'in_attesa':return 'In Attesa';
      case 'approvata':return 'Approvata';
      case 'rifiutata':return 'Rifiutata';
      case 'non_certificata':return 'Non Certificata';
      case 'in_attesa_verifica':return 'In Verifica';
      case 'certificata':return 'Certificata';
      default:return stato;
    }
  };

  // Get unique dipendenti from all requests
  const allDipendenti = React.useMemo(() => {
    const dipendentiSet = new Set();
    richiesteFerie.forEach(r => dipendentiSet.add(JSON.stringify({ id: r.dipendente_id, nome: r.dipendente_nome })));
    richiesteMalattia.forEach(r => dipendentiSet.add(JSON.stringify({ id: r.dipendente_id, nome: r.dipendente_nome })));
    turniConScambio.forEach(t => {
      if (t.richiesta_scambio?.richiesto_da_id) {
        dipendentiSet.add(JSON.stringify({ id: t.richiesta_scambio.richiesto_da_id, nome: t.richiesta_scambio.richiesto_da_nome }));
      }
      if (t.richiesta_scambio?.richiesto_a_id) {
        dipendentiSet.add(JSON.stringify({ id: t.richiesta_scambio.richiesto_a_id, nome: t.richiesta_scambio.richiesto_a_nome }));
      }
    });
    return Array.from(dipendentiSet).map(s => JSON.parse(s)).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [richiesteFerie, richiesteMalattia, turniConScambio]);

  // Filtered requests based on selected dipendente
  const filteredFerie = selectedDipendente === 'all' 
    ? richiesteFerie 
    : richiesteFerie.filter(r => r.dipendente_id === selectedDipendente);
  
  const filteredMalattia = selectedDipendente === 'all'
    ? richiesteMalattia
    : richiesteMalattia.filter(r => r.dipendente_id === selectedDipendente);
  
  const filteredScambi = selectedDipendente === 'all'
    ? turniConScambio
    : turniConScambio.filter(t => 
        t.richiesta_scambio?.richiesto_da_id === selectedDipendente || 
        t.richiesta_scambio?.richiesto_a_id === selectedDipendente
      );

  const ferieInAttesa = filteredFerie.filter((r) => r.stato === 'in_attesa').length;
  const malattiaInAttesa = filteredMalattia.filter((r) =>
  (r.stato === 'non_certificata' || r.stato === 'in_attesa_verifica') &&
  Array.isArray(r.turni_coinvolti) &&
  r.turni_coinvolti.length > 0
  ).length;
  const scambiInAttesa = filteredScambi.filter((t) => t.richiesta_scambio?.stato === 'accepted').length;
  const scambiPending = filteredScambi.filter((t) => t.richiesta_scambio?.stato === 'pending').length;
  const turniLiberiInAttesa = richiesteTurniLiberi.filter((r) => r.stato === 'in_attesa').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#000000' }}>Richieste
        </h1>
          <p className="mt-1" style={{ color: '#000000' }}>Ferie, malattie e scambi turno</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NeumorphicCard className="p-4 text-center">
            <Calendar className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{richiesteFerie.length}</p>
            <p className="text-xs text-slate-500">Richieste Ferie</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-600">{ferieInAttesa}</p>
            <p className="text-xs text-slate-500">Ferie da Approvare</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <Thermometer className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{richiesteMalattia.length}</p>
            <p className="text-xs text-slate-500">Richieste Malattia</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <AlertCircle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-600">{malattiaInAttesa}</p>
            <p className="text-xs text-slate-500">Malattie da Verificare</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <ArrowRightLeft className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-600">{scambiInAttesa}</p>
            <p className="text-xs text-slate-500">Scambi da Approvare</p>
          </NeumorphicCard>
        </div>

        {/* Filtro Dipendente */}
        {allDipendenti.length > 0 && (
          <NeumorphicCard className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-slate-600" />
              <select
                value={selectedDipendente}
                onChange={(e) => setSelectedDipendente(e.target.value)}
                className="flex-1 bg-transparent text-slate-700 outline-none font-medium">
                <option value="all">Tutti i Dipendenti</option>
                {allDipendenti.map((dip) => (
                  <option key={dip.id} value={dip.id}>{dip.nome}</option>
                ))}
              </select>
            </div>
          </NeumorphicCard>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          <button
          onClick={() => setActiveTab('ferie')}
          className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
          activeTab === 'ferie' ?
          'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' :
          'neumorphic-flat text-slate-700'}`
          }>

            <Calendar className="w-4 h-4" />
            Ferie {ferieInAttesa > 0 && <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full">{ferieInAttesa}</span>}
          </button>
          <button
          onClick={() => setActiveTab('malattia')}
          className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
          activeTab === 'malattia' ?
          'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg' :
          'neumorphic-flat text-slate-700'}`
          }>

            <Thermometer className="w-4 h-4" />
            Malattia {malattiaInAttesa > 0 && <span className="bg-orange-400 text-orange-900 text-xs px-2 py-0.5 rounded-full">{malattiaInAttesa}</span>}
          </button>
          <button
          onClick={() => setActiveTab('scambi')}
          className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
          activeTab === 'scambi' ?
          'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg' :
          'neumorphic-flat text-slate-700'}`
          }>

            <ArrowRightLeft className="w-4 h-4" />
            Scambi {scambiInAttesa > 0 && <span className="bg-purple-400 text-purple-900 text-xs px-2 py-0.5 rounded-full">{scambiInAttesa}</span>}
          </button>
          <button
          onClick={() => setActiveTab('turni_liberi')}
          className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
          activeTab === 'turni_liberi' ?
          'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg' :
          'neumorphic-flat text-slate-700'}`
          }>

            <CheckCircle className="w-4 h-4" />
            Turni Liberi {turniLiberiInAttesa > 0 && <span className="bg-green-400 text-green-900 text-xs px-2 py-0.5 rounded-full">{turniLiberiInAttesa}</span>}
          </button>
        </div>

        {/* Tab Ferie */}
        {activeTab === 'ferie' &&
      <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Richieste Ferie</h2>

            {loadingFerie ?
        <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
              </div> :
        filteredFerie.length === 0 ?
        <p className="text-slate-500 text-center py-8">Nessuna richiesta di ferie</p> :

        <div className="space-y-4">
                {/* In Attesa */}
                {filteredFerie.filter((r) => r.stato === 'in_attesa').length > 0 &&
          <div>
                    <button
              onClick={() => setExpandedSections((prev) => ({ ...prev, ferie_attesa: !prev.ferie_attesa }))}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-yellow-50 border-2 border-yellow-200 hover:bg-yellow-100 transition-all mb-2">

                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-yellow-600" />
                        <span className="font-bold text-slate-800">In Attesa</span>
                        <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-medium">
                          {filteredFerie.filter((r) => r.stato === 'in_attesa').length}
                        </span>
                      </div>
                      {expandedSections.ferie_attesa ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    {expandedSections.ferie_attesa &&
            <div className="space-y-3 ml-4">
                        {filteredFerie.filter((r) => r.stato === 'in_attesa').map((request) =>
              <div key={request.id} className="neumorphic-pressed p-4 rounded-xl">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="w-4 h-4 text-slate-500" />
                                  <span className="font-bold text-slate-800">{request.dipendente_nome}</span>
                                </div>
                                <div className="text-sm text-slate-600 space-y-1">
                                  <p>📅 Dal {request.data_inizio && moment(request.data_inizio).isValid() ? moment(request.data_inizio).format('DD/MM/YYYY') : 'N/A'} al {request.data_fine && moment(request.data_fine).isValid() ? moment(request.data_fine).format('DD/MM/YYYY') : 'N/A'}</p>
                                  {request.motivo && <p>💬 {request.motivo}</p>}
                                  {request.turni_coinvolti && request.turni_coinvolti.length > 0 &&
                      <div className="mt-2">
                                      <TurniCoinvoltiCountDisplay turniIds={request.turni_coinvolti} dipendenteId={request.dipendente_id} allTurni={turniPlanday} />
                                    </div>
                      }
                                </div>
                              </div>

                              {!isStoreManager && (
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => {setSelectedRequest(request);setApprovalMode('select');}}
                                    className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Approva
                                  </button>
                                  <button
                                    onClick={() => handleRejectFerie(request)}
                                    className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 flex items-center gap-1">
                                    <X className="w-3 h-3" /> Rifiuta
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
              )}
                      </div>
            }
                  </div>
          }

                {/* Confermate */}
                {filteredFerie.filter((r) => r.stato === 'approvata').length > 0 &&
          <div>
                    <button
              onClick={() => setExpandedSections((prev) => ({ ...prev, ferie_approvate: !prev.ferie_approvate }))}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-green-50 border-2 border-green-200 hover:bg-green-100 transition-all mb-2">

                      <div className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-600" />
                        <span className="font-bold text-slate-800">Confermate</span>
                        <span className="bg-green-200 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">
                          {filteredFerie.filter((r) => r.stato === 'approvata').length}
                        </span>
                      </div>
                      {expandedSections.ferie_approvate ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    {expandedSections.ferie_approvate &&
            <div className="space-y-3 ml-4">
                        {filteredFerie.filter((r) => r.stato === 'approvata').map((request) =>
              <div key={request.id} className="neumorphic-pressed p-4 rounded-xl opacity-80">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="w-4 h-4 text-slate-500" />
                                  <span className="font-bold text-slate-800">{request.dipendente_nome}</span>
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approvata</span>
                                </div>
                                <div className="text-sm text-slate-600 space-y-1">
                                  <p>📅 Dal {request.data_inizio && moment(request.data_inizio).isValid() ? moment(request.data_inizio).format('DD/MM/YYYY') : 'N/A'} al {request.data_fine && moment(request.data_fine).isValid() ? moment(request.data_fine).format('DD/MM/YYYY') : 'N/A'}</p>
                                  {request.motivo && <p>💬 {request.motivo}</p>}
                                  {request.turni_coinvolti && request.turni_coinvolti.length > 0 &&
                      <div className="mt-2">
                                      <TurniCoinvoltiCountDisplay turniIds={request.turni_coinvolti} dipendenteId={request.dipendente_id} allTurni={turniPlanday} />
                                    </div>
                      }
                                  {request.turni_resi_liberi && <p className="text-xs text-green-600">✓ Turni resi disponibili</p>}
                                </div>
                              </div>
                            </div>
                          </div>
              )}
                      </div>
            }
                  </div>
          }

                {/* Rifiutate */}
                {filteredFerie.filter((r) => r.stato === 'rifiutata').length > 0 &&
          <div>
                    <button
              onClick={() => setExpandedSections((prev) => ({ ...prev, ferie_rifiutate: !prev.ferie_rifiutate }))}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-red-50 border-2 border-red-200 hover:bg-red-100 transition-all mb-2">

                      <div className="flex items-center gap-3">
                        <X className="w-5 h-5 text-red-600" />
                        <span className="font-bold text-slate-800">Rifiutate</span>
                        <span className="bg-red-200 text-red-800 text-xs px-2 py-0.5 rounded-full font-medium">
                          {filteredFerie.filter((r) => r.stato === 'rifiutata').length}
                        </span>
                      </div>
                      {expandedSections.ferie_rifiutate ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    {expandedSections.ferie_rifiutate &&
            <div className="space-y-3 ml-4">
                        {filteredFerie.filter((r) => r.stato === 'rifiutata').map((request) =>
              <div key={request.id} className="neumorphic-pressed p-4 rounded-xl opacity-70">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="w-4 h-4 text-slate-500" />
                                  <span className="font-bold text-slate-800">{request.dipendente_nome}</span>
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rifiutata</span>
                                </div>
                                <div className="text-sm text-slate-600 space-y-1">
                                  <p>📅 Dal {request.data_inizio && moment(request.data_inizio).isValid() ? moment(request.data_inizio).format('DD/MM/YYYY') : 'N/A'} al {request.data_fine && moment(request.data_fine).isValid() ? moment(request.data_fine).format('DD/MM/YYYY') : 'N/A'}</p>
                                  {request.motivo && <p>💬 {request.motivo}</p>}
                                  {request.turni_coinvolti && request.turni_coinvolti.length > 0 &&
                      <div className="mt-2">
                                      <TurniCoinvoltiCountDisplay turniIds={request.turni_coinvolti} dipendenteId={request.dipendente_id} allTurni={turniPlanday} />
                                    </div>
                      }
                                </div>
                              </div>
                            </div>
                          </div>
              )}
                      </div>
            }
                  </div>
          }
              </div>
        }
          </NeumorphicCard>
      }

        {/* Tab Malattia */}
        {activeTab === 'malattia' &&
      <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Richieste Malattia</h2>
            
            {loadingMalattia ?
        <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-red-500 mx-auto" />
              </div> :
        filteredMalattia.length === 0 ?
        <p className="text-slate-500 text-center py-8">Nessuna richiesta di malattia</p> :

        <div className="space-y-3">
                 {/* Sezione Certificate */}
                 {filteredMalattia.filter((r) => r.stato === 'certificata').length > 0 &&
          <div>
                     <button
                       onClick={() => setExpandedSections((prev) => ({ ...prev, malattia_certificate: !prev.malattia_certificate }))}
                       className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-green-50 border-2 border-green-200 hover:bg-green-100 transition-all mb-2">
                       <div className="flex items-center gap-3">
                         <CheckCircle className="w-5 h-5 text-green-600" />
                         <span className="font-bold text-slate-800">Certificate</span>
                         <span className="bg-green-200 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">
                           {filteredMalattia.filter((r) => r.stato === 'certificata').length}
                         </span>
                       </div>
                       {expandedSections.malattia_certificate ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                     </button>
                     
                     {expandedSections.malattia_certificate && (
                     <div className="space-y-3 ml-4">
                       {filteredMalattia.filter((r) => r.stato === 'certificata').map((request) =>
              <div key={request.id} className="neumorphic-pressed p-4 rounded-xl">
                           <div className="flex items-start justify-between">
                             <div className="flex-1">
                               <div className="flex items-center gap-2 mb-2">
                                 <User className="w-4 h-4 text-slate-500" />
                                 <span className="font-bold text-slate-800">{request.dipendente_nome}</span>
                                 <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatoColor(request.stato)}`}>
                                   {getStatoLabel(request.stato)}
                                 </span>
                               </div>
                               <div className="text-sm text-slate-600 space-y-1">
                                 <p>📅 Dal {request.data_inizio && moment(request.data_inizio).isValid() ? moment(request.data_inizio).format('DD/MM/YYYY') : 'N/A'} {request.data_fine && moment(request.data_fine).isValid() && `al ${moment(request.data_fine).format('DD/MM/YYYY')}`}</p>
                                 {request.descrizione && <p>💬 {request.descrizione}</p>}
                                 {request.turni_coinvolti && request.turni_coinvolti.length > 0 &&
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                     <p className="text-xs font-bold text-blue-700 mb-2">Turni coinvolti:</p>
                                     <TurniCoinvoltiDisplay turniIds={request.turni_coinvolti} dipendenteId={request.dipendente_id} getStoreName={getStoreName} allTurni={turniPlanday} />
                                   </div>
                      }
                                 {request.certificato_url &&
                      <a href={request.certificato_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs flex items-center gap-1">
                                     <FileText className="w-3 h-3" /> Vedi Certificato
                                   </a>
                      }
                               </div>
                             </div>
                             {!isStoreManager && (
                               <button
                                 onClick={() => {
                                   if (confirm('Eliminare questa richiesta di malattia?')) {
                                     updateMalattiaMutation.mutate({
                                       id: request.id,
                                       data: { stato: 'eliminata' }
                                     });
                                   }
                                 }}
                                 className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 flex items-center gap-1">
                                 <X className="w-3 h-3" /> Elimina
                               </button>
                             )}
                           </div>
                         </div>
              )}
                     </div>
                     )}
                   </div>
          }

                 {/* Sezione Non Certificate */}
                 {filteredMalattia.filter((r) => r.stato === 'non_certificata' || r.stato === 'in_attesa_verifica').length > 0 &&
          <div>
                     <button
                       onClick={() => setExpandedSections((prev) => ({ ...prev, malattia_non_certificate: !prev.malattia_non_certificate }))}
                       className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-orange-50 border-2 border-orange-200 hover:bg-orange-100 transition-all mb-2">
                       <div className="flex items-center gap-3">
                         <AlertCircle className="w-5 h-5 text-orange-600" />
                         <span className="font-bold text-slate-800">Non Certificate</span>
                         <span className="bg-orange-200 text-orange-800 text-xs px-2 py-0.5 rounded-full font-medium">
                           {filteredMalattia.filter((r) => r.stato === 'non_certificata' || r.stato === 'in_attesa_verifica').length}
                         </span>
                       </div>
                       {expandedSections.malattia_non_certificate ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                     </button>
                     
                     {expandedSections.malattia_non_certificate && (
                     <div className="space-y-3 ml-4">
                       {filteredMalattia.filter((r) => r.stato === 'non_certificata' || r.stato === 'in_attesa_verifica').map((request) =>
              <div key={request.id} className="neumorphic-pressed p-4 rounded-xl">
                           <div className="flex items-start justify-between">
                             <div className="flex-1">
                               <div className="flex items-center gap-2 mb-2">
                                 <User className="w-4 h-4 text-slate-500" />
                                 <span className="font-bold text-slate-800">{request.dipendente_nome}</span>
                                 <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatoColor(request.stato)}`}>
                                   {getStatoLabel(request.stato)}
                                 </span>
                               </div>
                               <div className="text-sm text-slate-600 space-y-1">
                                 <p>📅 Dal {request.data_inizio && moment(request.data_inizio).isValid() ? moment(request.data_inizio).format('DD/MM/YYYY') : 'N/A'} {request.data_fine && moment(request.data_fine).isValid() && `al ${moment(request.data_fine).format('DD/MM/YYYY')}`}</p>
                                 {request.descrizione && <p>💬 {request.descrizione}</p>}
                                 {request.turni_coinvolti && request.turni_coinvolti.length > 0 &&
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                     <p className="text-xs font-bold text-blue-700 mb-2">Turni coinvolti:</p>
                                     <TurniCoinvoltiDisplay turniIds={request.turni_coinvolti} dipendenteId={request.dipendente_id} getStoreName={getStoreName} allTurni={turniPlanday} />
                                   </div>
                      }
                                 {request.certificato_url &&
                      <a href={request.certificato_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs flex items-center gap-1">
                                     <FileText className="w-3 h-3" /> Vedi Certificato
                                   </a>
                      }
                               </div>
                             </div>

                             {!isStoreManager && (
                               <div className="flex flex-col gap-2">
                                 {request.turni_coinvolti && request.turni_coinvolti.length > 0 && (
                                   <button
                                     onClick={() => {
                                       setChangingTipoTurno(request);
                                       setNewTipoTurno('');
                                     }}
                                     className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center gap-1">
                                     <Edit className="w-3 h-3" /> Modifica Tipo
                                   </button>
                                 )}
                                 {(request.stato === 'non_certificata' || request.stato === 'in_attesa_verifica') && request.certificato_url && (
                                   <>
                                     <button
                                       onClick={() => handleVerifyMalattia(request, true)}
                                       className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-1">
                                       <Check className="w-3 h-3" /> Certifica
                                     </button>
                                     <button
                                       onClick={() => handleVerifyMalattia(request, false)}
                                       className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 flex items-center gap-1">
                                       <X className="w-3 h-3" /> Rifiuta
                                     </button>
                                   </>
                                 )}
                                 <button
                                   onClick={() => {
                                     if (confirm('Eliminare questa richiesta di malattia?')) {
                                       updateMalattiaMutation.mutate({
                                         id: request.id,
                                         data: { stato: 'eliminata' }
                                       });
                                     }
                                   }}
                                   className="px-3 py-1.5 bg-slate-500 text-white rounded-lg text-sm font-medium hover:bg-slate-600 flex items-center gap-1">
                                   <X className="w-3 h-3" /> Elimina
                                 </button>
                               </div>
                             )}
                           </div>
                         </div>
              )}
                     </div>
                     )}
                   </div>
          }

                 {/* Sezione Rifiutate/Eliminate */}
                 {filteredMalattia.filter((r) => r.stato === 'rifiutata' || r.stato === 'eliminata').length > 0 &&
          <div>
                     <button
                       onClick={() => setExpandedSections((prev) => ({ ...prev, malattia_rifiutate: !prev.malattia_rifiutate }))}
                       className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-red-50 border-2 border-red-200 hover:bg-red-100 transition-all mb-2">
                       <div className="flex items-center gap-3">
                         <X className="w-5 h-5 text-red-600" />
                         <span className="font-bold text-slate-800">Rifiutate/Eliminate</span>
                         <span className="bg-red-200 text-red-800 text-xs px-2 py-0.5 rounded-full font-medium">
                           {filteredMalattia.filter((r) => r.stato === 'rifiutata' || r.stato === 'eliminata').length}
                         </span>
                       </div>
                       {expandedSections.malattia_rifiutate ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                     </button>
                     
                     {expandedSections.malattia_rifiutate && (
                     <div className="space-y-3 ml-4">
                       {filteredMalattia.filter((r) => r.stato === 'rifiutata' || r.stato === 'eliminata').map((request) =>
              <div key={request.id} className="neumorphic-pressed p-4 rounded-xl opacity-70">
                           <div className="flex items-start justify-between">
                             <div className="flex-1">
                               <div className="flex items-center gap-2 mb-2">
                                 <User className="w-4 h-4 text-slate-500" />
                                 <span className="font-bold text-slate-800">{request.dipendente_nome}</span>
                                 <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatoColor(request.stato)}`}>
                                   {getStatoLabel(request.stato)}
                                 </span>
                               </div>
                               <div className="text-sm text-slate-600 space-y-1">
                                 <p>📅 Dal {request.data_inizio && moment(request.data_inizio).isValid() ? moment(request.data_inizio).format('DD/MM/YYYY') : 'N/A'} {request.data_fine && moment(request.data_fine).isValid() && `al ${moment(request.data_fine).format('DD/MM/YYYY')}`}</p>
                                 {request.descrizione && <p>💬 {request.descrizione}</p>}
                               </div>
                             </div>
                           </div>
                         </div>
              )}
                     </div>
                     )}
                   </div>
          }
               </div>

        }
               </NeumorphicCard>
      }

        {/* Tab Scambi */}
        {activeTab === 'scambi' &&
      <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Richieste Scambio Turno</h2>
            
            {loadingScambi ?
        <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
              </div> :
        filteredScambi.length === 0 ?
        <p className="text-slate-500 text-center py-8">Nessuna richiesta di scambio</p> :

        <>
                {/* Da Approvare */}
                {filteredScambi.filter((t) => t.richiesta_scambio?.stato === 'accepted_by_colleague').length > 0 &&
          <div className="mb-6">
                    <h3 className="text-lg font-bold text-orange-600 mb-3 flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Da Approvare ({filteredScambi.filter((t) => t.richiesta_scambio?.stato === 'accepted_by_colleague').length})
                    </h3>
                    <div className="space-y-3">
                      {filteredScambi.
              filter((t) => t.richiesta_scambio?.stato === 'accepted_by_colleague').
              sort((a, b) => new Date(b.richiesta_scambio?.data_richiesta) - new Date(a.richiesta_scambio?.data_richiesta)).
              map((turnoRichiedente) => {
                const scambio = turnoRichiedente.richiesta_scambio;

                return (
                  <div key={turnoRichiedente.id} className="neumorphic-pressed p-4 rounded-xl">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <ArrowRightLeft className="w-5 h-5 text-purple-500" />
                            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-lg">
                              <span className="text-xs text-blue-600 font-medium">CEDE:</span>
                              <span className="font-bold text-slate-800">{scambio.richiesto_da_nome || turnoRichiedente.dipendente_nome}</span>
                            </div>
                            <span className="text-slate-400">→</span>
                            <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-lg">
                              <span className="text-xs text-green-600 font-medium">RICEVE:</span>
                              <span className="font-bold text-slate-800">{scambio.richiesto_a_nome}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          scambio.stato === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          scambio.stato === 'accepted_by_colleague' ? 'bg-blue-100 text-blue-800' :
                          scambio.stato === 'rejected_by_colleague' ? 'bg-red-100 text-red-800' :
                          scambio.stato === 'approved_by_manager' ? 'bg-green-100 text-green-800' :
                          scambio.stato === 'rejected_by_manager' ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-800'}`
                          }>
                              {scambio.stato === 'pending' ? 'In attesa collega' :
                            scambio.stato === 'accepted_by_colleague' ? 'Da approvare' :
                            scambio.stato === 'rejected_by_colleague' ? 'Rifiutato' :
                            scambio.stato === 'approved_by_manager' ? 'Approvato' :
                            scambio.stato === 'rejected_by_manager' ? 'Rifiutato da manager' : scambio.stato}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Turno CEDUTO (del richiedente) */}
                            <div className="p-3 bg-red-50 rounded-lg border-2 border-red-200">
                              <p className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1">
                                <X className="w-3 h-3" />
                                {scambio.richiesto_da_nome} CEDE:
                              </p>
                              <p className="font-medium text-slate-700 text-sm">
                                {moment(turnoRichiedente.data).format('ddd DD/MM')}
                              </p>
                              <div className="text-xs text-slate-600 mt-1">
                                🕐 {turnoRichiedente.ora_inizio} - {turnoRichiedente.ora_fine}
                              </div>
                              <div className="text-xs text-slate-600">
                                👤 {turnoRichiedente.ruolo}
                              </div>
                              <div className="text-xs text-slate-500">
                                📍 {getStoreName(turnoRichiedente.store_id)}
                              </div>
                              <div className="text-xs text-slate-400 mt-1 pt-1 border-t border-red-200">
                                Originale: {turnoRichiedente.dipendente_nome}
                              </div>
                            </div>

                            {/* Turno RICHIESTO (dell'altro dipendente) */}
                            <TurnoAltroDisplay
                            turnoId={scambio.suo_turno_id}
                            richiestoANome={scambio.richiesto_a_nome}
                            getStoreName={getStoreName} />

                          </div>

                          <p className="text-xs text-slate-400 mt-2">
                            Richiesto il {moment(scambio.data_richiesta).format('DD/MM/YYYY HH:mm')}
                          </p>
                        </div>
                        
                        {scambio.stato === 'accepted_by_colleague' &&
                      <div className="flex flex-col gap-2 ml-3">
                            <button
                          onClick={async () => {
                            const [turno1List, turno2List] = await Promise.all([
                            base44.entities.TurnoPlanday.filter({ id: scambio.mio_turno_id }),
                            base44.entities.TurnoPlanday.filter({ id: scambio.suo_turno_id })]
                            );

                            const turno1 = turno1List[0];
                            const turno2 = turno2List[0];

                            if (!turno1 || !turno2) {
                              alert('Errore: turni non trovati');
                              return;
                            }

                            const updatedRichiesta = {
                              ...scambio,
                              stato: 'approved_by_manager',
                              data_approvazione_manager: new Date().toISOString(),
                              approvato_da: user?.id,
                              approvato_da_nome: user?.nome_cognome || user?.full_name
                            };

                            await Promise.all([
                            base44.entities.TurnoPlanday.update(turno1.id, {
                              dipendente_id: turno2.dipendente_id,
                              dipendente_nome: turno2.dipendente_nome,
                              richiesta_scambio: updatedRichiesta
                            }),
                            base44.entities.TurnoPlanday.update(turno2.id, {
                              dipendente_id: turno1.dipendente_id,
                              dipendente_nome: turno1.dipendente_nome,
                              richiesta_scambio: updatedRichiesta
                            })]
                            );

                            queryClient.invalidateQueries({ queryKey: ['turni-con-scambio'] });
                          }}
                          className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-1">

                              <Check className="w-3 h-3" /> Approva
                            </button>
                            <button
                          onClick={async () => {
                            const updatedRichiesta = {
                              ...scambio,
                              stato: 'rejected_by_manager',
                              data_approvazione_manager: new Date().toISOString(),
                              approvato_da: user?.id,
                              approvato_da_nome: user?.nome_cognome || user?.full_name
                            };

                            await Promise.all([
                            base44.entities.TurnoPlanday.update(scambio.mio_turno_id, {
                              richiesta_scambio: updatedRichiesta
                            }),
                            base44.entities.TurnoPlanday.update(scambio.suo_turno_id, {
                              richiesta_scambio: updatedRichiesta
                            })]
                            );

                            queryClient.invalidateQueries({ queryKey: ['turni-con-scambio'] });
                          }}
                          className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 flex items-center gap-1">

                              <X className="w-3 h-3" /> Rifiuta
                            </button>
                          </div>
                      }
                      </div>
                    </div>);

              })}
                    </div>
                  </div>
          }

                {/* Approvate */}
                {filteredScambi.filter((t) =>
          t.richiesta_scambio?.stato === 'approved_by_manager' ||
          t.richiesta_scambio?.stato === 'rejected_by_manager' ||
          t.richiesta_scambio?.stato === 'rejected_by_colleague'
          ).length > 0 &&
          <div>
                    <h3 className="text-lg font-bold text-green-600 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Archiviate ({filteredScambi.filter((t) =>
              t.richiesta_scambio?.stato === 'approved_by_manager' ||
              t.richiesta_scambio?.stato === 'rejected_by_manager' ||
              t.richiesta_scambio?.stato === 'rejected_by_colleague'
              ).length})
                    </h3>
                    <div className="space-y-3">
                      {filteredScambi.
              filter((t) =>
              t.richiesta_scambio?.stato === 'approved_by_manager' ||
              t.richiesta_scambio?.stato === 'rejected_by_manager' ||
              t.richiesta_scambio?.stato === 'rejected_by_colleague'
              ).
              sort((a, b) => new Date(b.richiesta_scambio?.data_richiesta) - new Date(a.richiesta_scambio?.data_richiesta)).
              map((turnoRichiedente) => {
                const scambio = turnoRichiedente.richiesta_scambio;

                return (
                  <div key={turnoRichiedente.id} className="neumorphic-pressed p-4 rounded-xl opacity-70">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <ArrowRightLeft className="w-5 h-5 text-purple-500" />
                            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-lg">
                              <span className="text-xs text-blue-600 font-medium">CEDE:</span>
                              <span className="font-bold text-slate-800">{scambio.richiesto_da_nome || turnoRichiedente.dipendente_nome}</span>
                            </div>
                            <span className="text-slate-400">→</span>
                            <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-lg">
                              <span className="text-xs text-green-600 font-medium">RICEVE:</span>
                              <span className="font-bold text-slate-800">{scambio.richiesto_a_nome}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          scambio.stato === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          scambio.stato === 'accepted_by_colleague' ? 'bg-blue-100 text-blue-800' :
                          scambio.stato === 'rejected_by_colleague' ? 'bg-red-100 text-red-800' :
                          scambio.stato === 'approved_by_manager' ? 'bg-green-100 text-green-800' :
                          scambio.stato === 'rejected_by_manager' ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-800'}`
                          }>
                              {scambio.stato === 'pending' ? 'In attesa collega' :
                            scambio.stato === 'accepted_by_colleague' ? 'Da approvare' :
                            scambio.stato === 'rejected_by_colleague' ? 'Rifiutato' :
                            scambio.stato === 'approved_by_manager' ? 'Approvato' :
                            scambio.stato === 'rejected_by_manager' ? 'Rifiutato da manager' : scambio.stato}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Turno CEDUTO (del richiedente) */}
                            <div className="p-3 bg-red-50 rounded-lg border-2 border-red-200">
                              <p className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1">
                                <X className="w-3 h-3" />
                                {scambio.richiesto_da_nome} CEDE:
                              </p>
                              <p className="font-medium text-slate-700 text-sm">
                                {moment(turnoRichiedente.data).format('ddd DD/MM')}
                              </p>
                              <div className="text-xs text-slate-600 mt-1">
                                🕐 {turnoRichiedente.ora_inizio} - {turnoRichiedente.ora_fine}
                              </div>
                              <div className="text-xs text-slate-600">
                                👤 {turnoRichiedente.ruolo}
                              </div>
                              <div className="text-xs text-slate-500">
                                📍 {getStoreName(turnoRichiedente.store_id)}
                              </div>
                              <div className="text-xs text-slate-400 mt-1 pt-1 border-t border-red-200">
                                Originale: {turnoRichiedente.dipendente_nome}
                              </div>
                            </div>

                            {/* Turno RICHIESTO (dell'altro dipendente) */}
                            <TurnoAltroDisplay
                            turnoId={scambio.suo_turno_id}
                            richiestoANome={scambio.richiesto_a_nome}
                            getStoreName={getStoreName} />

                            </div>

                            <p className="text-xs text-slate-400 mt-2">
                            Richiesto il {scambio.data_richiesta && moment(scambio.data_richiesta).isValid() ? moment(scambio.data_richiesta).format('DD/MM/YYYY HH:mm') : 'N/A'}
                            </p>
                            </div>
                            </div>
                            </div>);

              })}
                    </div>
                  </div>
          }
              </>
        }
          </NeumorphicCard>
      }

        {/* Tab Turni Liberi (Approvazione Turni) */}
        {activeTab === 'turni_liberi' &&
      <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Richieste Turni Liberi
            </h2>
            
            {loadingTurniLiberi ?
        <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-green-500 mx-auto" />
              </div> :
        richiesteTurniLiberi.length === 0 ?
        <p className="text-slate-500 text-center py-8">Nessuna richiesta di turno</p> :

        <div className="space-y-3">
                {richiesteTurniLiberi.map((richiesta) =>
          <div key={richiesta.id} className={`neumorphic-pressed p-4 rounded-xl ${
          richiesta.stato === 'in_attesa' ? 'border-2 border-yellow-300' : ''}`
          }>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-slate-500" />
                          <span className="font-bold text-slate-800">{richiesta.dipendente_nome}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  richiesta.stato === 'in_attesa' ? 'bg-yellow-100 text-yellow-800' :
                  richiesta.stato === 'approvata' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'}`
                  }>
                            {richiesta.stato === 'in_attesa' ? 'In Attesa' : richiesta.stato === 'approvata' ? 'Approvata' : 'Rifiutata'}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 space-y-1">
                          <p>📅 {richiesta.data_turno && moment(richiesta.data_turno).isValid() ? moment(richiesta.data_turno).format('dddd DD MMMM YYYY') : 'N/A'}</p>
                          <p>🕐 {richiesta.ora_inizio} - {richiesta.ora_fine}</p>
                          <p>👤 {richiesta.ruolo}</p>
                          <p>📍 {richiesta.store_name}</p>
                          {richiesta.note && <p className="text-xs italic">💬 {richiesta.note}</p>}
                        </div>
                      </div>
                      
                      {richiesta.stato === 'in_attesa' &&
              <div className="flex flex-col gap-2">
                          <button
                  onClick={() => approvaRichiestaTurnoMutation.mutate({
                    richiestaId: richiesta.id,
                    turnoId: richiesta.turno_id,
                    dipendenteId: richiesta.dipendente_id,
                    dipendenteNome: richiesta.dipendente_nome
                  })}
                  disabled={approvaRichiestaTurnoMutation.isPending}
                  className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-1">

                            <CheckCircle className="w-3 h-3" /> Approva
                          </button>
                          <button
                  onClick={() => rifiutaRichiestaTurnoMutation.mutate({ richiestaId: richiesta.id })}
                  disabled={rifiutaRichiestaTurnoMutation.isPending}
                  className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 flex items-center gap-1">

                            <X className="w-3 h-3" /> Rifiuta
                          </button>
                        </div>
              }
                    </div>
                  </div>
          )}
              </div>
        }
          </NeumorphicCard>
      }

        {/* Modal Approvazione Ferie */}
        {selectedRequest && approvalMode === 'select' &&
      <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => {setSelectedRequest(null);setApprovalMode(null);}} />
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
              <NeumorphicCard className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Approva Ferie</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Come vuoi gestire i turni di <strong>{selectedRequest.dipendente_nome}</strong>?
                </p>
                
                <div className="space-y-3">
                  <button
                onClick={() => handleApproveFerie(selectedRequest, 'ferie_only')}
                disabled={updateFerieMutation.isPending}
                className="w-full p-4 rounded-xl border-2 border-blue-200 hover:border-blue-400 bg-blue-50 text-left transition-all">

                    <div className="flex items-center gap-3">
                      <Calendar className="w-6 h-6 text-blue-600" />
                      <div>
                        <p className="font-medium text-slate-800">Solo Ferie</p>
                        <p className="text-xs text-slate-500">I turni verranno segnati come Ferie</p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                onClick={() => handleApproveFerie(selectedRequest, 'ferie_liberi')}
                disabled={updateFerieMutation.isPending}
                className="w-full p-4 rounded-xl border-2 border-green-200 hover:border-green-400 bg-green-50 text-left transition-all">

                    <div className="flex items-center gap-3">
                      <Copy className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium text-slate-800">Ferie + Turni Liberi</p>
                        <p className="text-xs text-slate-500">Crea copie dei turni come disponibili per altri</p>
                      </div>
                    </div>
                  </button>
                </div>
                
                <button
              onClick={() => {setSelectedRequest(null);setApprovalMode(null);}}
              className="w-full mt-4 py-2 text-slate-600 hover:text-slate-800">

                  Annulla
                </button>
              </NeumorphicCard>
            </div>
          </>
      }

        {/* Modal Cambio Tipo Turno */}
        {changingTipoTurno &&
      <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setChangingTipoTurno(null)} />
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
              <NeumorphicCard className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Modifica Tipo Turno</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Cambia il tipo turno per i turni coinvolti di <strong>{changingTipoTurno.dipendente_nome}</strong>
                </p>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Nuovo Tipo Turno</label>
                    <select
                  value={newTipoTurno}
                  onChange={(e) => setNewTipoTurno(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none">

                      <option value="">Seleziona...</option>
                      {tipiTurnoDisponibili.map((tipo) =>
                  <option key={tipo} value={tipo}>{tipo}</option>
                  )}
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <button
                  onClick={() => setChangingTipoTurno(null)}
                  className="flex-1 py-2 text-slate-600 hover:text-slate-800 neumorphic-flat rounded-xl">

                      Annulla
                    </button>
                    <button
                  onClick={async () => {
                    if (!newTipoTurno) {
                      alert('Seleziona un tipo turno');
                      return;
                    }

                    for (const turnoId of changingTipoTurno.turni_coinvolti || []) {
                      await updateTurnoMutation.mutateAsync({
                        id: turnoId,
                        data: { tipo_turno: newTipoTurno }
                      });
                    }

                    setChangingTipoTurno(null);
                    setNewTipoTurno('');
                    alert('Tipo turno aggiornato!');
                  }}
                  disabled={!newTipoTurno || updateTurnoMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-xl font-medium disabled:opacity-50">

                      Salva
                    </button>
                  </div>
                </div>
              </NeumorphicCard>
            </div>
          </>
      }
    </div>);

}