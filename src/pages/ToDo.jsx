import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package, Calendar, ExternalLink, UserX, Users, FileText, Clock, TrendingUp } from "lucide-react";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import moment from 'moment';
import { formatEuro } from "../components/utils/formatCurrency";
import { isBefore, isAfter, parseISO } from 'date-fns';

export default function ToDo() {
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: wrongOrders = [] } = useQuery({
    queryKey: ['wrong-orders'],
    queryFn: () => base44.entities.WrongOrder.list('-order_date', 1000)
  });

  const { data: wrongOrderMatches = [] } = useQuery({
    queryKey: ['wrong-order-matches'],
    queryFn: () => base44.entities.WrongOrderMatch.list()
  });

  const { data: materiePrime = [] } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: inventario = [] } = useQuery({
    queryKey: ['inventario'],
    queryFn: () => base44.entities.RilevazioneInventario.list('-data_rilevazione', 100)
  });

  const { data: inventarioCantina = [] } = useQuery({
    queryKey: ['inventario-cantina'],
    queryFn: () => base44.entities.RilevazioneInventarioCantina.list('-data_rilevazione', 100)
  });

  const { data: ordiniInviati = [] } = useQuery({
    queryKey: ['ordini-inviati'],
    queryFn: () => base44.entities.OrdineFornitore.filter({ status: 'inviato' })
  });

  const { data: ordiniCompletati = [] } = useQuery({
    queryKey: ['ordini-completati'],
    queryFn: () => base44.entities.OrdineFornitore.filter({ status: 'completato' })
  });

  const { data: richiesteAssenzeRaw } = useQuery({
    queryKey: ['richieste-assenze'],
    queryFn: async () => {
      const [ferie, malattie, turniLiberi, scambi] = await Promise.all([
        base44.entities.RichiestaFerie.filter({ stato: 'in_attesa' }),
        base44.entities.RichiestaMalattia.list(),
        base44.entities.RichiestaTurnoLibero.filter({ stato: 'in_attesa' }),
        base44.entities.TurnoPlanday.list()
      ]);
      const malattieInAttesa = malattie.filter((m) =>
        (m.stato === 'non_certificata' || m.stato === 'in_attesa_verifica') &&
        Array.isArray(m.turni_coinvolti) &&
        m.turni_coinvolti.length > 0
      );
      const scambiInAttesa = scambi.filter((t) =>
        t.richiesta_scambio?.stato === 'accepted_by_colleague' &&
        t.id === t.richiesta_scambio.mio_turno_id
      );
      return { ferie, malattie: malattieInAttesa, turniLiberi, scambi: scambiInAttesa };
    }
  });

  const richiesteAssenze = richiesteAssenzeRaw && typeof richiesteAssenzeRaw === 'object' && !Array.isArray(richiesteAssenzeRaw)
    ? richiesteAssenzeRaw
    : { ferie: [], malattie: [], turniLiberi: [], scambi: [] };

  const { data: contratti = [] } = useQuery({
    queryKey: ['contratti'],
    queryFn: () => base44.entities.Contratto.list()
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: uscite = [] } = useQuery({
    queryKey: ['uscite'],
    queryFn: () => base44.entities.Uscita.list()
  });

  const { data: turni = [] } = useQuery({
    queryKey: ['turni-planday'],
    queryFn: () => base44.entities.TurnoPlanday.list()
  });

  const { data: periodoProvaConfig = [] } = useQuery({
    queryKey: ['periodo-prova-config'],
    queryFn: () => base44.entities.PeriodoProvaConfig.list()
  });

  const { data: turniRitardi = [] } = useQuery({
    queryKey: ['turni-ritardi'],
    queryFn: () => base44.entities.TurnoPlanday.list('-data', 2000)
  });

  const { data: timbraturaConfig } = useQuery({
    queryKey: ['timbratura-config'],
    queryFn: async () => {
      const configs = await base44.entities.TimbraturaConfig.filter({ is_active: true });
      return configs[0] || { tolleranza_ritardo_minuti: 0, arrotonda_ritardo: true, arrotondamento_minuti: 15 };
    }
  });

  const safeParseDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      return date;
    } catch (e) {
      return null;
    }
  };

  // Alert operativi - Ordini suggeriti aggregati per fornitore/store
  const ordiniDaFare = useMemo(() => {
    if (!inventario || !inventarioCantina || !materiePrime || !stores) return [];
    const ordiniDettagliati = [];
    const allInventory = [...inventario, ...inventarioCantina];
    const latestByProduct = {};

    allInventory.forEach((item) => {
      const key = `${item.store_id}-${item.prodotto_id}`;
      if (!latestByProduct[key] || new Date(item.data_rilevazione) > new Date(latestByProduct[key].data_rilevazione)) {
        latestByProduct[key] = item;
      }
    });

    Object.values(latestByProduct).forEach((reading) => {
      const product = materiePrime.find((p) => p.id === reading.prodotto_id);
      if (!product) return;

      const store = stores.find((s) => s.id === reading.store_id);
      if (!store) return;

      const isAssignedToStore = !product.assigned_stores ||
        product.assigned_stores.length === 0 ||
        product.assigned_stores.includes(reading.store_id);
      if (!isAssignedToStore) return;

      const isInUsoForStore = product.in_uso_per_store?.[reading.store_id] === true ||
        !product.in_uso_per_store?.[reading.store_id] && product.in_uso === true;
      if (!isInUsoForStore) return;

      const quantitaCritica = product.store_specific_quantita_critica?.[reading.store_id] || product.quantita_critica || product.quantita_minima || 0;
      const quantitaOrdine = product.store_specific_quantita_ordine?.[reading.store_id] || product.quantita_ordine || 0;

      if (reading.quantita_rilevata <= quantitaCritica && quantitaOrdine > 0) {
        const hasPendingOrder = ordiniInviati.some((o) =>
          o.store_id === reading.store_id &&
          o.prodotti.some((p) => p.prodotto_id === product.id)
        );

        const hasArrivedToday = ordiniCompletati.some((o) => {
          const completedToday = o.data_completamento &&
            new Date(o.data_completamento).toDateString() === new Date().toDateString();
          return completedToday &&
            o.store_id === reading.store_id &&
            o.prodotti.some((p) => p.prodotto_id === product.id);
        });

        if (hasPendingOrder || hasArrivedToday) return;

        const prezzoUnitario = product.prezzo_unitario || 0;
        const ivaPerc = product.iva_percentuale ?? 22;
        const prezzoConIva = prezzoUnitario * (1 + ivaPerc / 100);
        const costoTotale = prezzoConIva * quantitaOrdine;

        ordiniDettagliati.push({
          store: store.name,
          storeId: store.id,
          fornitore: product.fornitore || 'Non specificato',
          prodotto: reading.nome_prodotto,
          quantitaOrdine,
          unitaMisura: reading.unita_misura,
          costoRiga: costoTotale
        });
      }
    });

    const ordiniAggregati = {};
    ordiniDettagliati.forEach((ord) => {
      const key = `${ord.fornitore}|${ord.storeId}`;
      if (!ordiniAggregati[key]) {
        ordiniAggregati[key] = {
          fornitore: ord.fornitore,
          store: ord.store,
          storeId: ord.storeId,
          costoTotale: 0,
          numeroArticoli: 0
        };
      }
      ordiniAggregati[key].costoTotale += ord.costoRiga;
      ordiniAggregati[key].numeroArticoli += 1;
    });

    return Object.values(ordiniAggregati);
  }, [stores, inventario, inventarioCantina, materiePrime, ordiniInviati, ordiniCompletati]);

  const contrattiInScadenza = useMemo(() => {
    if (!allUsers || !contratti) return [];
    const oggi = moment();
    const tra30Giorni = moment().add(30, 'days');

    return allUsers
      .filter((user) => {
        if (uscite.some((u) => u.dipendente_id === user.id)) return false;
        if (user.user_type !== 'dipendente' && user.user_type !== 'user') return false;
        if (!user.data_inizio_contratto) return false;
        return user.data_fine_contratto || user.durata_contratto_mesi && user.durata_contratto_mesi > 0;
      })
      .map((user) => {
        let dataFine;

        if (user.data_fine_contratto) {
          dataFine = moment(user.data_fine_contratto);
        } else if (user.durata_contratto_mesi && user.durata_contratto_mesi > 0) {
          dataFine = moment(user.data_inizio_contratto).add(parseInt(user.durata_contratto_mesi), 'months');
        }

        if (!dataFine) return null;

        const giorniRimanenti = dataFine.diff(oggi, 'days');
        
        const hasFutureContract = contratti.some((c) => 
          c.user_id === user.id && 
          c.status === 'firmato' && 
          c.data_inizio_contratto && 
          moment(c.data_inizio_contratto).isAfter(dataFine)
        );

        if (hasFutureContract) return null;

        if (dataFine.isBetween(oggi, tra30Giorni, 'day', '[]')) {
          return {
            dipendente: user.nome_cognome || user.full_name || 'N/A',
            dataScadenza: dataFine.format('YYYY-MM-DD'),
            giorniRimanenti
          };
        }
        return null;
      })
      .filter((c) => c !== null)
      .sort((a, b) => a.giorniRimanenti - b.giorniRimanenti);
  }, [allUsers, uscite, contratti]);

  const turniLiberi = useMemo(() => {
    if (!turni) return [];
    const oggi = moment().format('YYYY-MM-DD');
    const tra14Giorni = moment().add(14, 'days').format('YYYY-MM-DD');

    return turni.filter((t) =>
      !t.dipendente_id &&
      t.data >= oggi &&
      t.data <= tra14Giorni &&
      t.stato === 'programmato'
    ).sort((a, b) => a.data.localeCompare(b.data));
  }, [turni]);

  const dipendentiInUscita = useMemo(() => {
    if (!uscite || !allUsers) return [];
    const oggi = moment();

    return uscite
      .filter((u) => {
        const dataUscita = moment(u.data_uscita);
        return dataUscita.isAfter(oggi);
      })
      .map((u) => {
        const user = allUsers.find((usr) => usr.id === u.dipendente_id);
        return {
          dipendente: user?.nome_cognome || user?.full_name || 'N/A',
          dataUscita: u.data_uscita,
          giorniRimanenti: moment(u.data_uscita).diff(oggi, 'days'),
          motivazione: u.motivazione
        };
      })
      .sort((a, b) => a.giorniRimanenti - b.giorniRimanenti);
  }, [uscite, allUsers]);

  const dipendentiInEntrata = useMemo(() => {
    if (!allUsers && !contratti) return [];
    const oggi = moment();
    const dipendentiMap = new Map();

    contratti.forEach((c) => {
      if (c.status === 'firmato' && c.data_inizio_contratto) {
        const dataInizio = moment(c.data_inizio_contratto);
        if (dataInizio.isAfter(oggi)) {
          const user = allUsers.find((u) => u.id === c.user_id);
          const nome = c.user_nome_cognome || user?.nome_cognome || user?.full_name || 'N/A';
          const key = `${c.user_id}_${c.data_inizio_contratto}`;
          
          if (!dipendentiMap.has(key)) {
            dipendentiMap.set(key, {
              dipendente: nome,
              dataInizio: c.data_inizio_contratto,
              giorniRimanenti: dataInizio.diff(oggi, 'days'),
              ruoli: c.ruoli_dipendente?.join(', ') || 'N/A'
            });
          }
        }
      }
    });

    allUsers.forEach((user) => {
      if ((user.user_type === 'dipendente' || user.user_type === 'user') && user.data_inizio_contratto) {
        const dataInizio = moment(user.data_inizio_contratto);
        if (dataInizio.isAfter(oggi)) {
          const key = `${user.id}_${user.data_inizio_contratto}`;
          
          if (!dipendentiMap.has(key)) {
            dipendentiMap.set(key, {
              dipendente: user.nome_cognome || user.full_name || 'N/A',
              dataInizio: user.data_inizio_contratto,
              giorniRimanenti: dataInizio.diff(oggi, 'days'),
              ruoli: user.ruoli_dipendente?.join(', ') || 'N/A'
            });
          }
        }
      }
    });

    return Array.from(dipendentiMap.values()).sort((a, b) => a.giorniRimanenti - b.giorniRimanenti);
  }, [allUsers, contratti]);

  const dipendentiInPeriodoProva = useMemo(() => {
    if (!allUsers || !turni || !periodoProvaConfig) return [];
    const activeConfig = periodoProvaConfig.find((c) => c.is_active);
    const turniRichiesti = activeConfig?.turni_richiesti || 5;
    const oggi = moment();

    return allUsers
      .filter((user) => {
        if (user.user_type !== 'dipendente' && user.user_type !== 'user') return false;
        if (!user.data_inizio_contratto) return false;
        if (uscite.some((u) => u.dipendente_id === user.id && moment(u.data_uscita).isSameOrBefore(oggi))) return false;

        const inizioContratto = moment(user.data_inizio_contratto);
        if (inizioContratto.isAfter(oggi)) return false;

        const turniEffettuati = turni.filter((t) =>
          t.dipendente_id === user.id &&
          t.data >= user.data_inizio_contratto &&
          t.stato === 'completato'
        ).length;

        return turniEffettuati < turniRichiesti;
      })
      .map((user) => {
        const turniEffettuati = turni.filter((t) =>
          t.dipendente_id === user.id &&
          t.data >= user.data_inizio_contratto &&
          t.stato === 'completato'
        ).length;

        return {
          dipendente: user.nome_cognome || user.full_name || 'N/A',
          turniEffettuati,
          turniMancanti: turniRichiesti - turniEffettuati,
          dataInizio: user.data_inizio_contratto
        };
      })
      .sort((a, b) => b.turniMancanti - a.turniMancanti);
  }, [allUsers, turni, periodoProvaConfig, uscite]);

  const dipendentiUscitiRecenti = useMemo(() => {
    if (!uscite || !allUsers) return [];
    const oggi = moment();
    const trentaGiorniFa = moment().subtract(30, 'days');

    return uscite
      .filter((u) => {
        const dataUscita = moment(u.data_uscita);
        return dataUscita.isBetween(trentaGiorniFa, oggi, 'day', '[]');
      })
      .map((u) => {
        const user = allUsers.find((usr) => usr.id === u.dipendente_id);
        return {
          dipendente: user?.nome_cognome || user?.full_name || 'N/A',
          dataUscita: u.data_uscita,
          giorniPassati: oggi.diff(moment(u.data_uscita), 'days'),
          motivazione: u.motivazione,
          tipo: u.tipo
        };
      })
      .sort((a, b) => b.giorniPassati - a.giorniPassati);
  }, [uscite, allUsers]);

  const topDipendentiRitardi = useMemo(() => {
    if (!turniRitardi || !allUsers || !timbraturaConfig) return [];
    const oggi = moment();
    const trentaGiorniFa = moment().subtract(30, 'days');
    const stats = {};

    turniRitardi
      .filter((t) => {
        if (!t.timbratura_entrata) return false;
        const turnoDate = moment(t.data);
        return turnoDate.isBetween(trentaGiorniFa, oggi, 'day', '[]');
      })
      .forEach((turno) => {
        let minutiRitardoReale = turno.minuti_ritardo_reale || 0;
        
        if (minutiRitardoReale === 0 && turno.timbratura_entrata && turno.ora_inizio) {
          try {
            const clockInTime = new Date(turno.timbratura_entrata);
            const [oraInizioHH, oraInizioMM] = turno.ora_inizio.split(':').map(Number);
            const scheduledStart = new Date(clockInTime);
            scheduledStart.setHours(oraInizioHH, oraInizioMM, 0, 0);
            const delayMs = clockInTime - scheduledStart;
            minutiRitardoReale = Math.max(0, Math.floor(delayMs / 60000));
          } catch (e) {
            minutiRitardoReale = 0;
          }
        }

        if (minutiRitardoReale > 0) {
          if (!stats[turno.dipendente_id]) {
            const user = allUsers.find((u) => u.id === turno.dipendente_id);
            stats[turno.dipendente_id] = {
              dipendenteId: turno.dipendente_id,
              dipendenteNome: turno.dipendente_nome || user?.nome_cognome || user?.full_name || 'Sconosciuto',
              minutiReali: 0
            };
          }
          stats[turno.dipendente_id].minutiReali += minutiRitardoReale;
        }
      });

    return Object.values(stats)
      .sort((a, b) => b.minutiReali - a.minutiReali)
      .slice(0, 5);
  }, [turniRitardi, allUsers, timbraturaConfig]);

  const ordiniSbagliatiSenzaLettera = useMemo(() => {
    if (!wrongOrders || !wrongOrderMatches) return [];
    
    const trentaGiorniFa = moment().subtract(30, 'days');
    const oggi = moment();

    // Get matched orders without letter
    const ordersWithoutLetter = wrongOrderMatches.filter((match) => {
      const order = wrongOrders.find((o) => o.id === match.wrong_order_id);
      if (!order) return false;
      
      const orderDate = moment(order.order_date);
      if (!orderDate.isBetween(trentaGiorniFa, oggi, 'day', '[]')) return false;
      
      return !order.lettera_richiamo_inviata;
    });

    // Group by employee
    const byEmployee = {};
    ordersWithoutLetter.forEach((match) => {
      if (!match.matched_employee_name) return;
      
      const order = wrongOrders.find((o) => o.id === match.wrong_order_id);
      if (!order) return;

      const employeeKey = match.matched_employee_name;
      if (!byEmployee[employeeKey]) {
        byEmployee[employeeKey] = {
          dipendente: match.matched_employee_name,
          count: 0,
          totalRefunds: 0
        };
      }
      
      byEmployee[employeeKey].count++;
      byEmployee[employeeKey].totalRefunds += order.refund_value || 0;
    });

    return Object.values(byEmployee).sort((a, b) => b.count - a.count);
  }, [wrongOrders, wrongOrderMatches]);

  return (
    <ProtectedPage pageName="ToDo">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold" style={{ color: '#000000' }}>✅ To Do</h1>
          <p style={{ color: '#000000' }}>Alert operativi e azioni urgenti</p>
        </div>

        {/* Alert Operativi */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Ordini da fare */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <Link to={createPageUrl('OrdiniAdmin')} className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2 hover:text-blue-600 transition-colors">
                <Package className="w-4 h-4 text-orange-600" />
                Ordini da Fare
                {ordiniDaFare.length > 0 &&
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{ordiniDaFare.length}</span>
                }
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {ordiniDaFare.length > 0 ? ordiniDaFare.map((ord, idx) =>
                  <div key={idx} className="p-2 rounded-lg bg-orange-50 border border-orange-200">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{ord.fornitore}</p>
                        <p className="text-[10px] text-slate-600">{ord.store}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-orange-700">{formatEuro(ord.costoTotale)}</p>
                        <p className="text-[10px] text-slate-500">{ord.numeroArticoli} articoli</p>
                      </div>
                    </div>
                  </div>
                ) :
                  <p className="text-xs text-slate-400 text-center py-4">Nessun ordine urgente</p>
                }
              </div>
            </div>

            {/* Richieste Ferie/Malattia */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <Link to={createPageUrl('Assenze')} className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2 hover:text-blue-600 transition-colors">
                <Calendar className="w-4 h-4 text-blue-600" />
                Richieste in Attesa
                {richiesteAssenze && ((richiesteAssenze.ferie?.length || 0) + (richiesteAssenze.malattie?.length || 0) + (richiesteAssenze.turniLiberi?.length || 0) + (richiesteAssenze.scambi?.length || 0)) > 0 &&
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {(richiesteAssenze.ferie?.length || 0) + (richiesteAssenze.malattie?.length || 0) + (richiesteAssenze.turniLiberi?.length || 0) + (richiesteAssenze.scambi?.length || 0)}
                  </span>
                }
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {richiesteAssenze?.ferie?.map((f) => {
                  const user = allUsers.find((u) => u.id === f.dipendente_id);
                  return (
                    <div key={f.id} className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-xs font-medium text-slate-700">{user?.nome_cognome || user?.full_name}</p>
                      <p className="text-[10px] text-blue-600">🏖️ Ferie: {f.data_inizio && moment(f.data_inizio).isValid() ? moment(f.data_inizio).format('DD/MM') : 'N/A'} - {f.data_fine && moment(f.data_fine).isValid() ? moment(f.data_fine).format('DD/MM') : 'N/A'}</p>
                    </div>
                  );
                })}
                {richiesteAssenze?.malattie?.map((m) => {
                  const user = allUsers.find((u) => u.id === m.dipendente_id);
                  return (
                    <div key={m.id} className="p-2 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-xs font-medium text-slate-700">{user?.nome_cognome || user?.full_name}</p>
                      <p className="text-[10px] text-red-600">🤒 Malattia: {m.data_inizio && moment(m.data_inizio).isValid() ? moment(m.data_inizio).format('DD/MM') : 'N/A'} - {m.data_fine && moment(m.data_fine).isValid() ? moment(m.data_fine).format('DD/MM') : 'N/A'}</p>
                    </div>
                  );
                })}
                {richiesteAssenze?.turniLiberi?.map((t) => {
                  const user = allUsers.find((u) => u.id === t.dipendente_id);
                  return (
                    <div key={t.id} className="p-2 rounded-lg bg-purple-50 border border-purple-200">
                      <p className="text-xs font-medium text-slate-700">{user?.nome_cognome || user?.full_name}</p>
                      <p className="text-[10px] text-purple-600">📅 Turno libero: {t.data_turno && moment(t.data_turno).isValid() ? moment(t.data_turno).format('DD/MM/YYYY') : 'N/A'}</p>
                    </div>
                  );
                })}
                {richiesteAssenze?.scambi?.map((t) => {
                  return (
                    <div key={t.id} className="p-2 rounded-lg bg-indigo-50 border border-indigo-200">
                      <p className="text-xs font-medium text-slate-700">{t.richiesta_scambio.richiesto_da_nome} ↔ {t.richiesta_scambio.richiesto_a_nome}</p>
                      <p className="text-[10px] text-indigo-600">🔄 Scambio: {t.data && moment(t.data).isValid() ? moment(t.data).format('DD/MM/YYYY') : 'N/A'}</p>
                    </div>
                  );
                })}
                {(!richiesteAssenze || (richiesteAssenze.ferie?.length || 0) + (richiesteAssenze.malattie?.length || 0) + (richiesteAssenze.turniLiberi?.length || 0) + (richiesteAssenze.scambi?.length || 0) === 0) &&
                  <p className="text-xs text-slate-400 text-center py-4">Nessuna richiesta in attesa</p>
                }
              </div>
            </div>

            {/* Contratti in Scadenza */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <Link to={createPageUrl('Alerts')} className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2 hover:text-blue-600 transition-colors">
                <FileText className="w-4 h-4 text-purple-600" />
                Contratti in Scadenza (30gg)
                {contrattiInScadenza.length > 0 &&
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{contrattiInScadenza.length}</span>
                }
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {contrattiInScadenza.length > 0 ? contrattiInScadenza.map((c, idx) =>
                  <div key={idx} className="p-2 rounded-lg bg-purple-50 border border-purple-200">
                    <p className="text-xs font-medium text-slate-700">{c.dipendente}</p>
                    <p className="text-[10px] text-purple-600">
                      Scade il {c.dataScadenza && moment(c.dataScadenza).isValid() ? moment(c.dataScadenza).format('DD/MM/YYYY') : 'N/A'} ({c.giorniRimanenti} giorni)
                    </p>
                  </div>
                ) :
                  <p className="text-xs text-slate-400 text-center py-4">Nessun contratto in scadenza</p>
                }
              </div>
            </div>

            {/* Turni Liberi */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <Link to={createPageUrl('Planday')} className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2 hover:text-blue-600 transition-colors">
                <UserX className="w-4 h-4 text-red-600" />
                Turni Liberi (Prossimi 14 giorni)
                {turniLiberi.length > 0 &&
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{turniLiberi.length}</span>
                }
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {turniLiberi.length > 0 ? turniLiberi.map((t) => {
                  const store = stores.find((s) => s.id === t.store_id);
                  return (
                    <div key={t.id} className="p-2 rounded-lg bg-red-50 border border-red-200 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-medium text-slate-700">{store?.name || 'N/A'}</p>
                        <p className="text-[10px] text-slate-600">{t.data && moment(t.data).isValid() ? moment(t.data).format('DD/MM/YYYY') : 'N/A'} • {t.ora_inizio}-{t.ora_fine} • {t.ruolo}</p>
                      </div>
                      <span className="text-xs text-red-600 font-bold whitespace-nowrap ml-2">NON ASSEGNATO</span>
                    </div>
                  );
                }) :
                  <p className="text-xs text-slate-400 text-center py-4">Tutti i turni sono assegnati</p>
                }
              </div>
            </div>

            {/* Dipendenti in Uscita */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <Link to={createPageUrl('Uscite')} className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2 hover:text-blue-600 transition-colors">
                <UserX className="w-4 h-4 text-orange-600" />
                Dipendenti in Uscita
                {dipendentiInUscita.length > 0 &&
                  <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{dipendentiInUscita.length}</span>
                }
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {dipendentiInUscita.length > 0 ? dipendentiInUscita.map((d, idx) =>
                  <div key={idx} className="p-2 rounded-lg bg-orange-50 border border-orange-200">
                    <p className="text-xs font-medium text-slate-700">{d.dipendente}</p>
                    <p className="text-[10px] text-orange-600">
                      Uscita: {d.dataUscita && moment(d.dataUscita).isValid() ? moment(d.dataUscita).format('DD/MM/YYYY') : 'N/A'} ({d.giorniRimanenti} giorni)
                    </p>
                    {d.motivazione && <p className="text-[10px] text-slate-500 mt-1">{d.motivazione}</p>}
                  </div>
                ) :
                  <p className="text-xs text-slate-400 text-center py-4">Nessuna uscita programmata</p>
                }
              </div>
            </div>

            {/* Dipendenti in Entrata */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <Link to={createPageUrl('OverviewContratti')} className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2 hover:text-blue-600 transition-colors">
                <Users className="w-4 h-4 text-green-600" />
                Dipendenti in Entrata
                {dipendentiInEntrata.length > 0 &&
                  <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">{dipendentiInEntrata.length}</span>
                }
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {dipendentiInEntrata.length > 0 ? dipendentiInEntrata.map((d, idx) =>
                  <div key={idx} className="p-2 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-xs font-medium text-slate-700">{d.dipendente}</p>
                    <p className="text-[10px] text-green-600">
                      Inizio: {d.dataInizio && moment(d.dataInizio).isValid() ? moment(d.dataInizio).format('DD/MM/YYYY') : 'N/A'} ({d.giorniRimanenti} giorni)
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">{d.ruoli}</p>
                  </div>
                ) :
                  <p className="text-xs text-slate-400 text-center py-4">Nessun ingresso programmato</p>
                }
              </div>
            </div>

            {/* Dipendenti in Periodo di Prova */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <Link to={createPageUrl('Alerts')} className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2 hover:text-blue-600 transition-colors">
                <Clock className="w-4 h-4 text-blue-600" />
                Dipendenti in Periodo di Prova
                {dipendentiInPeriodoProva.length > 0 &&
                  <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">{dipendentiInPeriodoProva.length}</span>
                }
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {dipendentiInPeriodoProva.length > 0 ? dipendentiInPeriodoProva.map((d, idx) =>
                  <div key={idx} className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-medium text-slate-700">{d.dipendente}</p>
                        <p className="text-[10px] text-blue-600">
                          Inizio: {d.dataInizio && moment(d.dataInizio).isValid() ? moment(d.dataInizio).format('DD/MM/YYYY') : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-orange-700">{d.turniMancanti}</p>
                        <p className="text-[10px] text-slate-500">turni mancanti</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Turni completati: {d.turniEffettuati}</p>
                  </div>
                ) :
                  <p className="text-xs text-slate-400 text-center py-4">Nessun dipendente in periodo di prova</p>
                }
              </div>
            </div>

            {/* Dipendenti Usciti di Recente */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <Link to={createPageUrl('Uscite')} className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2 hover:text-blue-600 transition-colors">
                <UserX className="w-4 h-4 text-slate-600" />
                Dipendenti Usciti di Recente (30gg)
                {dipendentiUscitiRecenti.length > 0 &&
                  <span className="bg-slate-500 text-white text-xs px-2 py-0.5 rounded-full">{dipendentiUscitiRecenti.length}</span>
                }
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {dipendentiUscitiRecenti.length > 0 ? dipendentiUscitiRecenti.map((d, idx) =>
                  <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-xs font-medium text-slate-700">{d.dipendente}</p>
                    <p className="text-[10px] text-slate-600">
                      Uscita: {d.dataUscita && moment(d.dataUscita).isValid() ? moment(d.dataUscita).format('DD/MM/YYYY') : 'N/A'} ({d.giorniPassati} giorni fa)
                    </p>
                    {d.tipo && <p className="text-[10px] text-slate-500 mt-1">{d.tipo === 'dimissioni' ? '📤 Dimissioni' : '❌ Licenziamento'}</p>}
                    {d.motivazione && <p className="text-[10px] text-slate-400 mt-1">{d.motivazione}</p>}
                  </div>
                ) :
                  <p className="text-xs text-slate-400 text-center py-4">Nessuna uscita recente</p>
                }
              </div>
            </div>

            {/* Top Dipendenti per Ritardi (Ultimi 30 giorni) */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <Link to={createPageUrl('Ritardi')} className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2 hover:text-blue-600 transition-colors">
                <TrendingUp className="w-4 h-4 text-red-600" />
                Top Dipendenti per Ritardi (30gg)
                {topDipendentiRitardi.length > 0 &&
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{topDipendentiRitardi.length}</span>
                }
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {topDipendentiRitardi.length > 0 ? topDipendentiRitardi.map((d, idx) =>
                  <div key={idx} className="p-2 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-medium text-slate-700">#{idx + 1} {d.dipendenteNome}</p>
                        <p className="text-[10px] text-red-600 mt-1">Minuti reali: {d.minutiReali}m ({(d.minutiReali / 60).toFixed(1)}h)</p>
                      </div>
                    </div>
                  </div>
                ) :
                  <p className="text-xs text-slate-400 text-center py-4">Nessun ritardo registrato</p>
                }
              </div>
            </div>

            {/* Ordini Sbagliati Senza Lettera */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <Link to={createPageUrl('OrdiniSbagliati')} className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2 hover:text-blue-600 transition-colors">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                Ordini Sbagliati Senza Lettera (30gg)
                {ordiniSbagliatiSenzaLettera.length > 0 &&
                  <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{ordiniSbagliatiSenzaLettera.length}</span>
                }
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {ordiniSbagliatiSenzaLettera.length > 0 ? ordiniSbagliatiSenzaLettera.map((d, idx) =>
                  <div key={idx} className="p-2 rounded-lg bg-orange-50 border border-orange-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-medium text-slate-700">{d.dipendente}</p>
                        <p className="text-[10px] text-orange-600 mt-1">{d.count} ordini • {formatEuro(d.totalRefunds)} rimborsi</p>
                      </div>
                    </div>
                  </div>
                ) :
                  <p className="text-xs text-slate-400 text-center py-4">Nessun ordine senza lettera</p>
                }
              </div>
            </div>
          </div>
      </div>
    </ProtectedPage>
  );
}