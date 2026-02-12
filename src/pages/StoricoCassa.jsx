import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  Store,
  User,
  Calendar,
  TrendingUp,
  Filter,
  X,
  Bell,
  AlertTriangle,
  Settings,
  Plus,
  CheckCircle,
  XCircle,
  Edit } from
'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import RollingTableRow from "../components/storico-cassa/RollingTableRow";
import CassaInizialeModal from "../components/storico-cassa/CassaInizialeModal";
import { format, subDays, isAfter, isBefore, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function StoricoCassa() {
  const [activeTab, setActiveTab] = useState('storico');
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStoresForTrend, setSelectedStoresForTrend] = useState([]);
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [editingSaldo, setEditingSaldo] = useState(null);
  const [showSaldoConfig, setShowSaldoConfig] = useState(false);
  const [newManualSaldo, setNewManualSaldo] = useState({ dipendente: '', importo: 0 });
  const [expandedDipendente, setExpandedDipendente] = useState(null);
  const [selectedStoresRolling, setSelectedStoresRolling] = useState([]);
  const [editingCassaEntry, setEditingCassaEntry] = useState(null);
  const [showCassaInizialeModal, setShowCassaInizialeModal] = useState(false);

  const queryClient = useQueryClient();



  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: conteggi = [] } = useQuery({
    queryKey: ['conteggi-cassa'],
    queryFn: () => base44.entities.ConteggioCassa.list('-data_conteggio', 500)
  });

  const { data: alertConfigs = [] } = useQuery({
    queryKey: ['alert-cassa-config'],
    queryFn: () => base44.entities.AlertCassaConfig.list()
  });

  const { data: iPraticoData = [] } = useQuery({
    queryKey: ['ipratico-data'],
    queryFn: () => base44.entities.iPratico.list('-order_date', 500)
  });

  const { data: prelievi = [] } = useQuery({
    queryKey: ['prelievi'],
    queryFn: () => base44.entities.Prelievo.list('-data_prelievo', 500)
  });

  const { data: depositi = [] } = useQuery({
    queryKey: ['depositi'],
    queryFn: () => base44.entities.Deposito.list('-data_deposito', 500)
  });

  const { data: attivitaCompletate = [] } = useQuery({
    queryKey: ['attivita-completate'],
    queryFn: () => base44.entities.AttivitaCompletata.list('-completato_at', 500)
  });

  const { data: pagamentiContanti = [] } = useQuery({
    queryKey: ['pagamenti-contanti'],
    queryFn: () => base44.entities.PagamentoContanti.list('-data_pagamento', 500)
  });

  const { data: saldiManuali = [] } = useQuery({
    queryKey: ['saldi-manuali'],
    queryFn: () => base44.entities.SaldoManualeCassa.list('-data', 100)
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: pagamentiStraordinari = [] } = useQuery({
    queryKey: ['pagamenti-straordinari'],
    queryFn: () => base44.entities.PagamentoStraordinario.list('-data_pagamento', 500)
  });

  const saveSaldoMutation = useMutation({
    mutationFn: (data) => base44.entities.SaldoManualeCassa.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saldi-manuali'] });
      setEditingSaldo(null);
    }
  });

  const saveCassaTeoricaMutation = useMutation({
    mutationFn: (data) => {
      const store = stores.find(s => s.id === data.store_id);
      return base44.entities.SaldoManualeCassa.create({
        store_id: data.store_id,
        store_name: store?.name || '',
        data: data.date,
        saldo_iniziale: parseFloat(data.valore) || 0,
        impostato_da: currentUser?.email || '',
        impostato_il: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saldi-manuali'] });
      setShowCassaInizialeModal(false);
    }
  });

  const deleteCassaTeoricaMutation = useMutation({
    mutationFn: (saldoId) => base44.entities.SaldoManualeCassa.delete(saldoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saldi-manuali'] });
    }
  });

  const updateSaldoPersonaleMutation = useMutation({
    mutationFn: ({ dipendente, importo }) => {
      return base44.entities.Deposito.create({
        store_id: 'manual_adjustment',
        store_name: 'Aggiustamento Manuale',
        rilevato_da: dipendente,
        importo: importo,
        data_deposito: new Date().toISOString(),
        note: 'Aggiustamento saldo manuale',
        impostato_da: currentUser?.email || ''
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depositi'] });
      setNewManualSaldo({ dipendente: '', importo: 0 });
      alert('✅ Saldo aggiornato con successo!');
    }
  });

  const saveAlertMutation = useMutation({
    mutationFn: (data) => {
      if (data.id) {
        return base44.entities.AlertCassaConfig.update(data.id, data);
      }
      return base44.entities.AlertCassaConfig.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-cassa-config'] });
      setShowAlertConfig(false);
      setEditingAlert(null);
    }
  });

  const deleteAlertMutation = useMutation({
    mutationFn: (id) => base44.entities.AlertCassaConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-cassa-config'] });
    }
  });

  const filteredConteggi = useMemo(() => {
    let cutoffDate;
    let endFilterDate;

    if (startDate || endDate) {
      cutoffDate = startDate ? parseISO(startDate) : new Date(0);
      endFilterDate = endDate ? parseISO(endDate) : new Date();
    } else {
      const days = parseInt(dateRange);
      cutoffDate = subDays(new Date(), days);
      endFilterDate = new Date();
    }

    return conteggi.filter((c) => {
      if (c.data_conteggio) {
        try {
          const itemDate = parseISO(c.data_conteggio);
          if (isNaN(itemDate.getTime())) return false;
          if (isBefore(itemDate, cutoffDate) || isAfter(itemDate, endFilterDate)) return false;
        } catch (e) {
          return false;
        }
      }
      if (selectedStore !== 'all' && c.store_id !== selectedStore) return false;
      return true;
    });
  }, [conteggi, selectedStore, dateRange, startDate, endDate]);

  const stats = useMemo(() => {
    const totale = filteredConteggi.reduce((sum, c) => sum + (c.valore_conteggio || 0), 0);
    const media = filteredConteggi.length > 0 ? totale / filteredConteggi.length : 0;

    // Trend Giornaliero - mostra tutte le rilevazioni per ogni giorno, per singolo negozio
    const conteggiForTrend = selectedStoresForTrend.length > 0 ?
    filteredConteggi.filter((c) => selectedStoresForTrend.includes(c.store_id)) :
    filteredConteggi;

    const dailyData = conteggiForTrend.
    map((c) => {
      if (!c.data_conteggio) return null;
      try {
        const dateTime = parseISO(c.data_conteggio);
        return {
          date: format(dateTime, 'dd/MM HH:mm'),
          valore: parseFloat((c.valore_conteggio || 0).toFixed(2)),
          store: c.store_name,
          timestamp: dateTime.getTime()
        };
      } catch (e) {
        return null;
      }
    }).
    filter(Boolean).
    sort((a, b) => a.timestamp - b.timestamp);

    // Per Locale - mostra la media per locale nel periodo
    const byStore = {};
    filteredConteggi.forEach((c) => {
      if (!byStore[c.store_name]) byStore[c.store_name] = { name: c.store_name, value: 0, count: 0 };
      byStore[c.store_name].value += c.valore_conteggio || 0;
      byStore[c.store_name].count += 1;
    });

    const storeData = Object.values(byStore).
    sort((a, b) => b.value / b.count - a.value / a.count).
    map((s) => ({
      name: s.name,
      valore: parseFloat((s.value / s.count).toFixed(2)),
      conteggi: s.count
    }));

    return { totale, media, dailyData, storeData, count: filteredConteggi.length };
  }, [filteredConteggi, selectedStoresForTrend]);

  const handleToggleStoreForTrend = (storeId) => {
    setSelectedStoresForTrend((prev) => {
      if (prev.includes(storeId)) {
        return prev.filter((id) => id !== storeId);
      }
      return [...prev, storeId];
    });
  };

  const handleSaveAlert = (e) => {
    e.preventDefault();
    saveAlertMutation.mutate(editingAlert);
  };

  const activeAlerts = useMemo(() => {
    const alerts = [];
    stores.forEach((store) => {
      const config = alertConfigs.find((c) => c.store_id === store.id && c.attivo);
      if (!config) return;

      const lastConteggio = conteggi.
      filter((c) => c.store_id === store.id && c.data_conteggio).
      sort((a, b) => new Date(b.data_conteggio) - new Date(a.data_conteggio))[0];

      if (lastConteggio && lastConteggio.valore_conteggio > config.soglia_alert) {
        alerts.push({
          store: store.name,
          valore: lastConteggio.valore_conteggio,
          soglia: config.soglia_alert,
          data: lastConteggio.data_conteggio
        });
      }
    });
    return alerts;
  }, [stores, alertConfigs, conteggi]);

  const rollingData = useMemo(() => {
    const data = [];
    const cutoffDate = startDate ? parseISO(startDate) : subDays(new Date(), parseInt(dateRange));
    const endFilterDate = endDate ? parseISO(endDate) : new Date();
    const applicableStores = selectedStoresRolling.length > 0 ? selectedStoresRolling : stores.map(s => s.id);

    const allDatesSet = new Set();
    const conteggiByStoreDate = {};

    applicableStores.forEach(storeId => {
      conteggi
          .filter(c => c.store_id === storeId && c.data_conteggio)
          .forEach(c => {
            const dateOnly = c.data_conteggio.split('T')[0];
            try {
              const d = parseISO(dateOnly);
              if (!isBefore(d, cutoffDate) && !isAfter(d, endFilterDate)) {
                allDatesSet.add(dateOnly);
                if (!conteggiByStoreDate[storeId]) conteggiByStoreDate[storeId] = {};
                if (!conteggiByStoreDate[storeId][dateOnly]) {
                  conteggiByStoreDate[storeId][dateOnly] = c;
                }
              }
            } catch (e) {
              // ignore
            }
          });
    });

    const sortedDates = Array.from(allDatesSet).sort();

    sortedDates.forEach((dateStr, dateIdx) => {
      const dayData = {
        date: dateStr,
        entries: []
      };

      applicableStores.forEach(storeId => {
        const store = stores.find(s => s.id === storeId);
        const prevDayEntry = dateIdx > 0 ? data[dateIdx - 1]?.entries.find(e => e.store_id === storeId) : null;

        let cassaTeoricaInitial = 0;
        let cassaTeoricaInitialManual = false;

        const manualSaldoForDate = saldiManuali.find(s => s.store_id === storeId && s.data === dateStr);

        if (manualSaldoForDate) {
          cassaTeoricaInitial = manualSaldoForDate.saldo_iniziale;
          cassaTeoricaInitialManual = true;
        } else if (prevDayEntry) {
          cassaTeoricaInitial = prevDayEntry.cassaTeoricaFinale;
        } else if (conteggiByStoreDate[storeId]?.[dateStr]) {
          cassaTeoricaInitial = conteggiByStoreDate[storeId][dateStr].valore_conteggio;
        }

        const iPraticoGiorno = iPraticoData.filter(i => i.store_id === storeId && i.order_date === dateStr);
        const pagamentiContantiIpratico = iPraticoGiorno.reduce((sum, record) => {
          return sum + (parseFloat(record.moneyType_cash) || 0);
        }, 0);

        const prelieviGiorno = prelievi
          .filter(p => p.store_id === storeId && p.data_prelievo && p.data_prelievo.split('T')[0] === dateStr)
          .reduce((sum, p) => sum + (p.importo || 0), 0);

        const cassaTeoricaFinale = cassaTeoricaInitial + pagamentiContantiIpratico - prelieviGiorno;

        const conteggiGiorno = conteggi
          .filter(c => c.store_id === storeId && c.data_conteggio && c.data_conteggio.split('T')[0] === dateStr)
          .sort((a, b) => new Date(a.data_conteggio) - new Date(b.data_conteggio));

        const conteggiInizio = conteggiGiorno[0];
        const conteggiFinale = conteggiGiorno[conteggiGiorno.length - 1];

        dayData.entries.push({
          store_id: storeId,
          store_name: store?.name || '',
          cassaTeoricaInitial,
          cassaTeoricaInitialManual,
          pagamentiContanti: pagamentiContantiIpratico,
          prelievi: prelieviGiorno,
          cassaTeoricaFinale,
          conteggiInizio: conteggiInizio?.valore_conteggio || null,
          conteggiInizioOra: conteggiInizio?.data_conteggio,
          conteggiInizioRilevatoDa: conteggiInizio?.rilevato_da,
          conteggiFinale: conteggiFinale?.valore_conteggio || null,
          conteggiFinaleOra: conteggiFinale?.data_conteggio,
          conteggiFinaleRilevatoDa: conteggiFinale?.rilevato_da,
          differenciaInizio: conteggiInizio ? Math.abs((conteggiInizio.valore_conteggio || 0) - cassaTeoricaInitial) : null,
          differenciaFinale: conteggiFinale ? Math.abs((conteggiFinale.valore_conteggio || 0) - cassaTeoricaFinale) : null
        });
      });

      data.push(dayData);
    });

    return data.reverse();
  }, [conteggi, iPraticoData, prelievi, saldiManuali, stores, selectedStoresRolling, startDate, endDate, dateRange]);

  const saldoDipendenti = useMemo(() => {
    const saldi = {};

    // Get all unique dipendenti from prelievi and depositi
    prelievi.forEach((p) => {
      const dipendente = p.rilevato_da;
      if (!saldi[dipendente]) {
        saldi[dipendente] = { 
          nome: dipendente, 
          prelievi: 0, 
          depositi: 0,
          pagamentiStraordinari: 0,
          saldo: 0,
          movimenti: []
        };
      }
      saldi[dipendente].prelievi += p.importo || 0;
      saldi[dipendente].movimenti.push({
        tipo: 'prelievo',
        data: p.data_prelievo,
        importo: -(p.importo || 0),
        store: p.store_name,
        note: p.note || ''
      });
    });

    depositi.forEach((d) => {
      const dipendente = d.rilevato_da;
      if (!saldi[dipendente]) {
        saldi[dipendente] = { 
          nome: dipendente, 
          prelievi: 0, 
          depositi: 0,
          pagamentiStraordinari: 0,
          saldo: 0,
          movimenti: []
        };
      }
      
      // Non contare i pagamenti straordinari qui, vengono gestiti separatamente
      if (d.store_id !== 'pagamento_straordinario') {
        saldi[dipendente].depositi += d.importo || 0;
      }
      
      saldi[dipendente].movimenti.push({
        tipo: d.store_id === 'manual_adjustment' ? 'aggiustamento' : 
              d.store_id === 'pagamento_straordinario' ? 'pagamento_straordinario' : 'deposito',
        data: d.data_deposito,
        importo: d.importo || 0,
        store: d.store_name,
        note: d.note || ''
      });
    });

    // Aggiungi i pagamenti straordinari effettuati (chi ha pagato)
    // I pagamenti vengono registrati come Depositi con store_id='pagamento_straordinario'
    // Quindi sono già inclusi nei depositi sopra
    // Ma dobbiamo assicurarci che vengano contati nella colonna corretta
    
    // Aggiorniamo: quando un deposito ha store_id='pagamento_straordinario',
    // significa che chi l'ha creato (rilevato_da) ha pagato uno straordinario
    depositi.filter(d => d.store_id === 'pagamento_straordinario').forEach((deposito) => {
      const dipendenteChePaga = deposito.rilevato_da;
      if (dipendenteChePaga && saldi[dipendenteChePaga]) {
        // Rimuovi dai depositi e aggiungi ai pagamenti straordinari
        saldi[dipendenteChePaga].depositi -= deposito.importo || 0;
        saldi[dipendenteChePaga].pagamentiStraordinari += deposito.importo || 0;
      }
    });

    // Calculate saldo: prelievi - depositi - pagamentiStraordinari
    Object.keys(saldi).forEach((dipendente) => {
      saldi[dipendente].saldo = saldi[dipendente].prelievi - saldi[dipendente].depositi - saldi[dipendente].pagamentiStraordinari;
      // Sort movimenti by date (most recent first)
      saldi[dipendente].movimenti.sort((a, b) => {
        try {
          return new Date(b.data) - new Date(a.data);
        } catch (e) {
          return 0;
        }
      });
    });

    // Return as array sorted by saldo (highest first)
    return Object.values(saldi).sort((a, b) => b.saldo - a.saldo);
  }, [prelievi, depositi, pagamentiStraordinari]);

  return (
    <ProtectedPage pageName="StoricoCassa">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        <div className="mb-4 lg:mb-6">
          <h1 className="mb-1 text-2xl font-bold lg:text-3xl" style={{ color: '#000000' }}>Storico Conteggi Cassa
          </h1>
          <p className="text-sm" style={{ color: '#000000' }}>Analisi storica dei conteggi cassa</p>
        </div>

        {/* Tabs */}
         <div className="flex gap-2 overflow-x-auto pb-2">
           <button
             onClick={() => setActiveTab('storico')}
             className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
             activeTab === 'storico' ?
             'neumorphic-pressed bg-blue-50 text-blue-700' :
             'neumorphic-flat text-slate-600 hover:text-slate-800'}`
             }>

             <Calendar className="w-4 h-4" />
             Storico
           </button>
           <button
             onClick={() => setActiveTab('rolling')}
             className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
             activeTab === 'rolling' ?
             'neumorphic-pressed bg-blue-50 text-blue-700' :
             'neumorphic-flat text-slate-600 hover:text-slate-800'}`
             }>

             <TrendingUp className="w-4 h-4" />
             Rolling
           </button>
          <button
            onClick={() => setActiveTab('saldo')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
            activeTab === 'saldo' ?
            'neumorphic-pressed bg-blue-50 text-blue-700' :
            'neumorphic-flat text-slate-600 hover:text-slate-800'}`
            }>

            <User className="w-4 h-4" />
            Saldo Personale
          </button>
          <button
            onClick={() => setActiveTab('prelievi')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
            activeTab === 'prelievi' ?
            'neumorphic-pressed bg-blue-50 text-blue-700' :
            'neumorphic-flat text-slate-600 hover:text-slate-800'}`
            }>

            <DollarSign className="w-4 h-4" />
            Prelievi
          </button>
          <button
            onClick={() => setActiveTab('depositi')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
            activeTab === 'depositi' ?
            'neumorphic-pressed bg-blue-50 text-blue-700' :
            'neumorphic-flat text-slate-600 hover:text-slate-800'}`
            }>

            <DollarSign className="w-4 h-4" />
            Depositi
          </button>
          <button
            onClick={() => setActiveTab('pagamenti')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
            activeTab === 'pagamenti' ?
            'neumorphic-pressed bg-blue-50 text-blue-700' :
            'neumorphic-flat text-slate-600 hover:text-slate-800'}`
            }>

            <DollarSign className="w-4 h-4" />
            Pagamenti Contanti
          </button>
        </div>

        {/* Rolling Tab */}
        {activeTab === 'rolling' &&
        <>
          <NeumorphicCard className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" />
                <h2 className="text-base lg:text-lg font-bold text-slate-800">Selezione Locali</h2>
              </div>
              <button
                onClick={() => setShowCassaInizialeModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium hover:shadow-lg">
                <Plus className="w-4 h-4" />
                Imposta Cassa Manuale
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedStoresRolling(stores.map(s => s.id))}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedStoresRolling.length === stores.length
                    ? 'bg-blue-500 text-white'
                    : 'neumorphic-flat text-slate-600'
                }`}
              >
                Tutti
              </button>
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => {
                    if (selectedStoresRolling.includes(store.id)) {
                      setSelectedStoresRolling(selectedStoresRolling.filter(id => id !== store.id));
                    } else {
                      setSelectedStoresRolling([...selectedStoresRolling, store.id]);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedStoresRolling.includes(store.id)
                      ? 'bg-blue-500 text-white'
                      : 'neumorphic-flat text-slate-600'
                  }`}
                >
                  {store.name}
                </button>
              ))}
            </div>
          </NeumorphicCard>

          {rollingData.map((dayData) => {
            const totals = {
              cassaTeoricaInitial: 0,
              pagamentiContanti: 0,
              prelievi: 0,
              cassaTeoricaFinale: 0,
              conteggiInizio: 0,
              conteggiFinale: 0
            };

            dayData.entries.forEach(entry => {
              totals.cassaTeoricaInitial += entry.cassaTeoricaInitial;
              totals.pagamentiContanti += entry.pagamentiContanti;
              totals.prelievi += entry.prelievi;
              totals.cassaTeoricaFinale += entry.cassaTeoricaFinale;
              if (entry.conteggiInizio) totals.conteggiInizio += entry.conteggiInizio;
              if (entry.conteggiFinale) totals.conteggiFinale += entry.conteggiFinale;
            });

            return (
            <NeumorphicCard key={dayData.date} className="p-4 lg:p-6 mb-4">
              <h3 className="text-lg font-bold text-slate-800 mb-4">{format(parseISO(dayData.date), 'dd/MM/yyyy', { locale: it })}</h3>

              <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b-2 border-blue-600">
                      <th className="text-left p-3 text-slate-600 font-medium text-xs">Locale</th>
                      <th className="text-right p-3 text-slate-600 font-medium text-xs">Cassa Teorica Inizio</th>
                      <th className="text-right p-3 text-slate-600 font-medium text-xs">+ Contanti</th>
                      <th className="text-right p-3 text-slate-600 font-medium text-xs">- Prelievi</th>
                      <th className="text-right p-3 text-slate-600 font-medium text-xs">= Cassa Teorica Fine</th>
                      <th className="text-left p-3 text-slate-600 font-medium text-xs">Conteggi Form</th>
                      <th className="text-center p-3 text-slate-600 font-medium text-xs">Differenza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayData.entries.map((entry, entryIdx) => (
                      <RollingTableRow
                        key={`${dayData.date}-${entry.store_id}`}
                        entry={entry}
                        dayDate={dayData.date}
                        saldiManuali={saldiManuali}
                        onDeleteClick={() => {
                          const saldoRecord = saldiManuali.find(s => s.store_id === entry.store_id && s.data === dayData.date);
                          if (saldoRecord && confirm('Rimuovere il saldo manuale?')) {
                            deleteCassaTeoricaMutation.mutate(saldoRecord.id);
                          }
                        }}
                      />
                    ))}

                    {dayData.entries.length > 1 && (
                      <tr className="border-t-2 border-blue-600 bg-blue-50 font-bold">
                        <td className="p-3 text-slate-800">TOTALE</td>
                        <td className="p-3 text-right text-blue-700">€{totals.cassaTeoricaInitial.toFixed(2)}</td>
                        <td className="p-3 text-right text-green-600">+€{totals.pagamentiContanti.toFixed(2)}</td>
                        <td className="p-3 text-right text-red-600">-€{totals.prelievi.toFixed(2)}</td>
                        <td className="p-3 text-right text-blue-700 bg-blue-100 px-3 py-2 rounded">€{totals.cassaTeoricaFinale.toFixed(2)}</td>
                        <td className="p-3 text-xs">
                          <div className="space-y-1">
                            <div className="text-slate-600">Inizio: €{totals.conteggiInizio.toFixed(2)}</div>
                            <div className="text-slate-600">Fine: €{totals.conteggiFinale.toFixed(2)}</div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="space-y-1">
                            <div className={`text-xs font-bold px-2 py-1 rounded ${(totals.conteggiInizio - totals.cassaTeoricaInitial) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {(totals.conteggiInizio - totals.cassaTeoricaInitial) >= 0 ? '+' : ''}€{(totals.conteggiInizio - totals.cassaTeoricaInitial).toFixed(2)}
                            </div>
                            <div className={`text-xs font-bold px-2 py-1 rounded ${(totals.conteggiFinale - totals.cassaTeoricaFinale) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {(totals.conteggiFinale - totals.cassaTeoricaFinale) >= 0 ? '+' : ''}€{(totals.conteggiFinale - totals.cassaTeoricaFinale).toFixed(2)}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </NeumorphicCard>
            );
          })}
        </>
        }

        {activeTab === 'storico' &&
        <>
        <NeumorphicCard className="p-4 lg:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-base lg:text-lg font-bold text-slate-800">Filtri</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600 mb-2 block">Locale</label>
              <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm">

                <option value="all">Tutti</option>
                {stores.map((store) =>
                  <option key={store.id} value={store.id}>{store.name}</option>
                  )}
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-600 mb-2 block">Periodo</label>
              <select
                  value={dateRange}
                  onChange={(e) => {
                    setDateRange(e.target.value);
                    if (e.target.value !== 'custom') {
                      setStartDate('');
                      setEndDate('');
                    }
                  }}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm">

                <option value="7">Ultimi 7 giorni</option>
                <option value="30">Ultimi 30 giorni</option>
                <option value="90">Ultimi 90 giorni</option>
                <option value="365">Ultimo anno</option>
                <option value="custom">Personalizzato</option>
              </select>
            </div>

            {dateRange === 'custom' &&
              <>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="neumorphic-pressed px-3 py-2.5 rounded-xl text-slate-700 outline-none text-sm" />

                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="neumorphic-pressed px-3 py-2.5 rounded-xl text-slate-700 outline-none text-sm" />

              </>
              }
          </div>
        </NeumorphicCard>



        {activeAlerts.length > 0 &&
          <NeumorphicCard className="p-4 lg:p-6 border-2 border-red-500 bg-red-50">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h2 className="text-base lg:text-lg font-bold text-red-800">Alert Soglia Cassa Superata</h2>
            </div>
            <div className="space-y-2">
              {activeAlerts.map((alert, idx) =>
              <div key={idx} className="neumorphic-pressed p-3 rounded-xl bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{alert.store}</p>
                      <p className="text-xs text-slate-500">
                        {format(parseISO(alert.data), 'dd/MM/yyyy HH:mm', { locale: it })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">€{alert.valore.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">Soglia: €{alert.soglia.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </NeumorphicCard>
          }

        <NeumorphicCard className="p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base lg:text-lg font-bold text-slate-800">Configurazione Alert</h2>
            <button
                onClick={() => {
                  setEditingAlert({ soglia_alert: 0, attivo: true });
                  setShowAlertConfig(true);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm hover:from-blue-600 hover:to-blue-700">

              <Plus className="w-4 h-4" />
              Nuovo Alert
            </button>
          </div>
          
          <div className="space-y-2">
            {alertConfigs.map((config) =>
              <div key={config.id} className="neumorphic-pressed p-3 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">{config.store_name}</p>
                  <p className="text-sm text-slate-600">Soglia: €{config.soglia_alert.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">{config.attivo ? 'Attivo' : 'Disattivo'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingAlert(config);
                      setShowAlertConfig(true);
                    }}
                    className="p-2 rounded-lg hover:bg-blue-50">

                    <Settings className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    onClick={() => deleteAlertMutation.mutate(config.id)}
                    className="p-2 rounded-lg hover:bg-red-50">

                    <X className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
              )}
          </div>
        </NeumorphicCard>



        <NeumorphicCard className="p-4 lg:p-6">
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Ultimo Conteggio per Locale</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stores.map((store) => {
                const storeConteggi = conteggi.
                filter((c) => c.store_id === store.id && c.data_conteggio).
                sort((a, b) => {
                  try {
                    return new Date(b.data_conteggio) - new Date(a.data_conteggio);
                  } catch (e) {
                    return 0;
                  }
                });

                const lastConteggio = storeConteggi[0];

                return (
                  <div key={store.id} className="neumorphic-pressed p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Store className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-slate-800 text-sm">{store.name}</h3>
                  </div>
                  
                  {lastConteggio ?
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Ultimo:</span>
                        <span className="text-lg font-bold text-blue-600">
                          €{lastConteggio.valore_conteggio.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-600">
                          {(() => {
                            try {
                              return format(parseISO(lastConteggio.data_conteggio), 'dd/MM HH:mm', { locale: it });
                            } catch (e) {
                              return 'Data non valida';
                            }
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-600">{lastConteggio.rilevato_da}</span>
                      </div>
                    </div> :

                    <p className="text-xs text-slate-400">Nessun conteggio</p>
                    }
                </div>);

              })}
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-4 lg:p-6">
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Dettaglio</h2>
          
          {filteredConteggi.length > 0 ?
            <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b-2 border-blue-600">
                    <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Data</th>
                    <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Locale</th>
                    <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Rilevato da</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Importo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConteggi.map((conteggio) =>
                  <tr key={conteggio.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="p-2 lg:p-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700 text-sm">
                            {(() => {
                            try {
                              return format(parseISO(conteggio.data_conteggio), 'dd/MM/yyyy HH:mm', { locale: it });
                            } catch (e) {
                              return 'Data non valida';
                            }
                          })()}
                          </span>
                        </div>
                      </td>
                      <td className="p-2 lg:p-3">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700 text-sm">{conteggio.store_name}</span>
                        </div>
                      </td>
                      <td className="p-2 lg:p-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700 text-sm">{conteggio.rilevato_da}</span>
                        </div>
                      </td>
                      <td className="p-2 lg:p-3 text-right">
                        <span className="text-blue-600 font-bold text-sm lg:text-base">
                          €{conteggio.valore_conteggio.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div> :

            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-slate-300 opacity-50 mx-auto mb-4" />
              <p className="text-slate-500">Nessun conteggio</p>
            </div>
            }
        </NeumorphicCard>

        {showSaldoConfig &&
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
             <NeumorphicCard className="max-w-md w-full p-6">
               <div className="flex items-center justify-between mb-4">
                 <h2 className="text-lg font-bold text-slate-800">Imposta Saldo Manuale</h2>
                 <button onClick={() => {
                  setShowSaldoConfig(false);
                  setEditingSaldo(null);
                }} className="p-2 rounded-lg hover:bg-slate-100">
                   <X className="w-5 h-5" />
                 </button>
               </div>

               <form onSubmit={(e) => {
                e.preventDefault();
                if (editingSaldo && editingSaldo.store_id && selectedStore !== 'all') {
                  const store = stores.find((s) => s.id === selectedStore);
                  saveSaldoMutation.mutate({
                    ...editingSaldo,
                    store_id: selectedStore,
                    store_name: store?.name || '',
                    impostato_da: currentUser?.email || '',
                    impostato_il: new Date().toISOString()
                  });
                }
              }} className="space-y-4">
                 <div>
                   <label className="text-sm text-slate-600 mb-2 block">Locale</label>
                   <select
                    value={selectedStore}
                    onChange={(e) => setEditingSaldo({ ...editingSaldo, store_id: e.target.value })}
                    disabled
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm opacity-60">

                     {stores.find((s) => s.id === selectedStore) &&
                    <option value={selectedStore}>{stores.find((s) => s.id === selectedStore)?.name}</option>
                    }
                   </select>
                 </div>

                 <div>
                   <label className="text-sm text-slate-600 mb-2 block">Data</label>
                   <input
                    type="date"
                    value={editingSaldo?.data || ''}
                    onChange={(e) => setEditingSaldo({ ...editingSaldo, data: e.target.value })}
                    required
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

                 </div>

                 <div>
                   <label className="text-sm text-slate-600 mb-2 block">Saldo Iniziale (€)</label>
                   <input
                    type="number"
                    step="0.01"
                    value={editingSaldo?.saldo_iniziale || 0}
                    onChange={(e) => setEditingSaldo({ ...editingSaldo, saldo_iniziale: parseFloat(e.target.value) || 0 })}
                    required
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

                 </div>

                 <div>
                   <label className="text-sm text-slate-600 mb-2 block">Note (opzionale)</label>
                   <input
                    type="text"
                    value={editingSaldo?.note || ''}
                    onChange={(e) => setEditingSaldo({ ...editingSaldo, note: e.target.value })}
                    placeholder="Es. Reset saldo, cambio cassa..."
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

                 </div>

                 <div className="flex gap-3 pt-4">
                   <button
                    type="button"
                    onClick={() => {
                      setShowSaldoConfig(false);
                      setEditingSaldo(null);
                    }}
                    className="flex-1 px-4 py-3 rounded-xl neumorphic-flat text-slate-700 font-medium">

                     Annulla
                   </button>
                   <button
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium">

                     Salva
                   </button>
                 </div>
               </form>
             </NeumorphicCard>
           </div>
          }

        <CassaInizialeModal
          isOpen={showCassaInizialeModal}
          onClose={() => setShowCassaInizialeModal(false)}
          stores={stores}
          onSave={(data) => saveCassaTeoricaMutation.mutate(data)}
          initialData={{ store_id: '', date: '', valore: 0 }}
        />

        {showAlertConfig &&
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
             <NeumorphicCard className="max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800">
                  {editingAlert?.id ? 'Modifica Alert' : 'Nuovo Alert'}
                </h2>
                <button onClick={() => {
                  setShowAlertConfig(false);
                  setEditingAlert(null);
                }} className="p-2 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAlert} className="space-y-4">
                <div>
                  <label className="text-sm text-slate-600 mb-2 block">Locale</label>
                  <select
                    value={editingAlert?.store_id || ''}
                    onChange={(e) => {
                      const store = stores.find((s) => s.id === e.target.value);
                      setEditingAlert({
                        ...editingAlert,
                        store_id: e.target.value,
                        store_name: store?.name || ''
                      });
                    }}
                    required
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm">

                    <option value="">Seleziona...</option>
                    {stores.map((store) =>
                    <option key={store.id} value={store.id}>{store.name}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-2 block">Soglia Alert (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingAlert?.soglia_alert || 0}
                    onChange={(e) => setEditingAlert({
                      ...editingAlert,
                      soglia_alert: parseFloat(e.target.value) || 0
                    })}
                    required
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingAlert?.attivo || false}
                    onChange={(e) => setEditingAlert({
                      ...editingAlert,
                      attivo: e.target.checked
                    })}
                    className="w-4 h-4" />

                  <label className="text-sm text-slate-600">Attivo</label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAlertConfig(false);
                      setEditingAlert(null);
                    }}
                    className="flex-1 px-4 py-3 rounded-xl neumorphic-flat text-slate-700 font-medium">

                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium">

                    Salva
                  </button>
                </div>
              </form>
            </NeumorphicCard>
          </div>
          }
        </>
        }



        {/* Saldo Personale Tab */}
        {activeTab === 'saldo' &&
        <>
            <NeumorphicCard className="p-4 lg:p-6 bg-blue-50">
              <h3 className="text-base font-bold text-slate-800 mb-4">Imposta Saldo Manuale</h3>
              <p className="text-sm text-slate-600 mb-4">
                Aggiungi un deposito manuale per correggere il saldo di un dipendente
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-slate-600 mb-2 block">Dipendente</label>
                  <select
                  value={newManualSaldo.dipendente}
                  onChange={(e) => setNewManualSaldo({ ...newManualSaldo, dipendente: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm">

                    <option value="">Seleziona...</option>
                    {saldoDipendenti.map((dip, idx) =>
                  <option key={idx} value={dip.nome}>{dip.nome}</option>
                  )}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-600 mb-2 block">Importo (€)</label>
                  <input
                  type="number"
                  step="0.01"
                  value={newManualSaldo.importo}
                  onChange={(e) => setNewManualSaldo({ ...newManualSaldo, importo: parseFloat(e.target.value) || 0 })}
                  placeholder="Positivo per azzerare saldo"
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

                </div>
                <div className="flex items-end">
                  <button
                  onClick={() => {
                    if (newManualSaldo.dipendente && newManualSaldo.importo !== 0) {
                      updateSaldoPersonaleMutation.mutate({
                        dipendente: newManualSaldo.dipendente,
                        importo: newManualSaldo.importo
                      });
                    }
                  }}
                  disabled={!newManualSaldo.dipendente || newManualSaldo.importo === 0}
                  className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed">

                    Salva
                  </button>
                </div>
              </div>
            </NeumorphicCard>

            {/* Log Aggiustamenti Manuali */}
            <NeumorphicCard className="p-4 lg:p-6 bg-purple-50">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-purple-600" />
                <h2 className="text-base lg:text-lg font-bold text-slate-800">Log Aggiustamenti Manuali</h2>
              </div>
              {(() => {
              const aggiustamentiManuali = depositi.
              filter((d) => d.store_id === 'manual_adjustment').
              sort((a, b) => new Date(b.data_deposito) - new Date(a.data_deposito));

              if (aggiustamentiManuali.length === 0) {
                return (
                  <p className="text-sm text-purple-700 text-center py-4">
                      Nessun aggiustamento manuale registrato
                    </p>);

              }

              return (
                <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
                    <table className="w-full min-w-[600px]">
                      <thead>
                        <tr className="border-b-2 border-purple-600">
                          <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Data</th>
                          <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Dipendente</th>
                          <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Importo</th>
                          <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Impostato da</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aggiustamentiManuali.map((deposito) =>
                      <tr key={deposito.id} className="border-b border-purple-200 hover:bg-purple-50 transition-colors">
                            <td className="p-2 lg:p-3">
                              <span className="text-slate-700 text-sm">
                                {format(parseISO(deposito.data_deposito), 'dd/MM/yyyy HH:mm', { locale: it })}
                              </span>
                            </td>
                            <td className="p-2 lg:p-3">
                              <span className="text-slate-700 text-sm font-medium">{deposito.rilevato_da}</span>
                            </td>
                            <td className="p-2 lg:p-3 text-right">
                              <span className="text-purple-600 font-bold text-sm lg:text-base">
                                €{deposito.importo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="p-2 lg:p-3">
                              <span className="text-slate-600 text-xs">{deposito.impostato_da || '-'}</span>
                            </td>
                          </tr>
                      )}
                      </tbody>
                    </table>
                  </div>);

            })()}
            </NeumorphicCard>

            <NeumorphicCard className="p-4 lg:p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-blue-600" />
                <h2 className="text-base lg:text-lg font-bold text-slate-800">Saldo Contanti per Dipendente</h2>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Saldo calcolato come: Prelievi - Depositi
              </p>

              {saldoDipendenti.length === 0 ?
            <div className="text-center py-12">
                  <User className="w-16 h-16 text-slate-300 opacity-50 mx-auto mb-4" />
                  <p className="text-slate-500">Nessun prelievo o deposito registrato</p>
                </div> :

            <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b-2 border-blue-600">
                        <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Dipendente</th>
                        <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Prelievi</th>
                        <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Depositi</th>
                        <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Pag. Straord.</th>
                        <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saldoDipendenti.map((dipendente, idx) => (
                        <React.Fragment key={idx}>
                          <tr 
                            className="border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                            onClick={() => setExpandedDipendente(expandedDipendente === dipendente.nome ? null : dipendente.nome)}>
                            <td className="p-2 lg:p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                  <span className="text-xs font-bold text-white">
                                    {dipendente.nome.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="text-slate-700 text-sm font-medium">{dipendente.nome}</span>
                              </div>
                            </td>
                            <td className="p-2 lg:p-3 text-right">
                              <span className="text-red-600 font-bold text-sm">
                                €{dipendente.prelievi.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="p-2 lg:p-3 text-right">
                              <span className="text-green-600 font-bold text-sm">
                                €{dipendente.depositi.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="p-2 lg:p-3 text-right">
                              <span className="text-orange-600 font-bold text-sm">
                                -€{dipendente.pagamentiStraordinari.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="p-2 lg:p-3 text-right">
                              <span className={`font-bold text-base lg:text-lg ${
                                dipendente.saldo > 0 ? 'text-orange-600' :
                                dipendente.saldo < 0 ? 'text-green-600' :
                                'text-slate-600'}`
                              }>
                                {dipendente.saldo >= 0 ? '+' : ''}€{dipendente.saldo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                          </tr>
                          
                          {expandedDipendente === dipendente.nome && (
                          <tr>
                          <td colSpan="5" className="p-0">
                                <div className="bg-slate-50 p-4 border-l-4 border-blue-500">
                                  <h4 className="text-sm font-bold text-slate-800 mb-3">Storico Movimenti</h4>
                                  {dipendente.movimenti.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-4">Nessun movimento</p>
                                  ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                      {dipendente.movimenti.map((movimento, mIdx) => (
                                        <div key={mIdx} className="neumorphic-pressed p-3 rounded-lg bg-white">
                                          <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                              {movimento.tipo === 'prelievo' && (
                                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">Prelievo</span>
                                              )}
                                              {movimento.tipo === 'deposito' && (
                                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">Deposito</span>
                                              )}
                                              {movimento.tipo === 'aggiustamento' && (
                                                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">Aggiustamento</span>
                                              )}
                                              {movimento.tipo === 'pagamento_straordinario' && (
                                                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">Pag. Straordinario Ricevuto</span>
                                              )}
                                              {movimento.tipo === 'pagamento_straordinario_effettuato' && (
                                                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">Pag. Straordinario</span>
                                              )}
                                              <span className="text-xs text-slate-500">
                                                {format(parseISO(movimento.data), 'dd/MM/yyyy HH:mm', { locale: it })}
                                              </span>
                                            </div>
                                            <span className={`font-bold text-sm ${
                                              movimento.importo >= 0 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                              {movimento.importo >= 0 ? '+' : ''}€{Math.abs(movimento.importo).toFixed(2)}
                                            </span>
                                          </div>
                                          <div className="text-xs text-slate-500">
                                            <p><strong>Locale:</strong> {movimento.store}</p>
                                            {movimento.note && <p><strong>Note:</strong> {movimento.note}</p>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
            }

              <div className="mt-6 neumorphic-pressed p-4 rounded-xl bg-blue-50">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Legenda:</strong> Saldo calcolato come: Prelievi - Depositi - Pagamenti Straordinari. Saldo positivo = il dipendente ha prelevato più di quanto depositato. Saldo negativo = ha depositato più di quanto prelevato.
                </p>
              </div>
            </NeumorphicCard>
          </>
        }

        {/* Prelievi Tab */}
        {activeTab === 'prelievi' &&
        <>
           <NeumorphicCard className="p-4 lg:p-6">
             <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Storico Prelievi</h2>

             {prelievi.length === 0 ?
            <div className="text-center py-12">
                 <DollarSign className="w-16 h-16 text-slate-300 opacity-50 mx-auto mb-4" />
                 <p className="text-slate-500">Nessun prelievo registrato</p>
               </div> :

            <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
                 <table className="w-full min-w-[600px]">
                   <thead>
                     <tr className="border-b-2 border-blue-600">
                       <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Data</th>
                       <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Locale</th>
                       <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Rilevato da</th>
                       <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Importo</th>
                     </tr>
                   </thead>
                   <tbody>
                     {prelievi.map((prelievo) =>
                  <tr key={prelievo.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                         <td className="p-2 lg:p-3">
                           <div className="flex items-center gap-2">
                             <Calendar className="w-4 h-4 text-slate-400" />
                             <span className="text-slate-700 text-sm">
                               {(() => {
                            try {
                              return format(parseISO(prelievo.data_prelievo), 'dd/MM/yyyy HH:mm', { locale: it });
                            } catch (e) {
                              return 'Data non valida';
                            }
                          })()}
                             </span>
                           </div>
                         </td>
                         <td className="p-2 lg:p-3">
                           <div className="flex items-center gap-2">
                             <Store className="w-4 h-4 text-slate-400" />
                             <span className="text-slate-700 text-sm">{prelievo.store_name}</span>
                           </div>
                         </td>
                         <td className="p-2 lg:p-3">
                           <div className="flex items-center gap-2">
                             <User className="w-4 h-4 text-slate-400" />
                             <span className="text-slate-700 text-sm">{prelievo.rilevato_da}</span>
                           </div>
                         </td>
                         <td className="p-2 lg:p-3 text-right">
                           <span className="text-red-600 font-bold text-sm lg:text-base">
                             -€{prelievo.importo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                           </span>
                         </td>
                       </tr>
                  )}
                   </tbody>
                 </table>
               </div>
            }
           </NeumorphicCard>
         </>
        }

        {/* Depositi Tab */}
        {activeTab === 'depositi' &&
        <>
           <NeumorphicCard className="p-4 lg:p-6">
             <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Storico Depositi</h2>

             {depositi.length === 0 ?
            <div className="text-center py-12">
                 <DollarSign className="w-16 h-16 text-slate-300 opacity-50 mx-auto mb-4" />
                 <p className="text-slate-500">Nessun deposito registrato</p>
               </div> :

            <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
                 <table className="w-full min-w-[600px]">
                   <thead>
                     <tr className="border-b-2 border-blue-600">
                       <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Data</th>
                       <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Locale</th>
                       <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Rilevato da</th>
                       <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Importo</th>
                     </tr>
                   </thead>
                   <tbody>
                     {depositi.map((deposito) =>
                  <tr key={deposito.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                         <td className="p-2 lg:p-3">
                           <div className="flex items-center gap-2">
                             <Calendar className="w-4 h-4 text-slate-400" />
                             <span className="text-slate-700 text-sm">
                               {(() => {
                            try {
                              return format(parseISO(deposito.data_deposito), 'dd/MM/yyyy HH:mm', { locale: it });
                            } catch (e) {
                              return 'Data non valida';
                            }
                          })()}
                             </span>
                           </div>
                         </td>
                         <td className="p-2 lg:p-3">
                           <div className="flex items-center gap-2">
                             <Store className="w-4 h-4 text-slate-400" />
                             <span className="text-slate-700 text-sm">{deposito.store_name}</span>
                           </div>
                         </td>
                         <td className="p-2 lg:p-3">
                           <div className="flex items-center gap-2">
                             <User className="w-4 h-4 text-slate-400" />
                             <span className="text-slate-700 text-sm">{deposito.rilevato_da}</span>
                           </div>
                         </td>
                         <td className="p-2 lg:p-3 text-right">
                           <span className="text-green-600 font-bold text-sm lg:text-base">
                             +€{deposito.importo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                           </span>
                         </td>
                       </tr>
                  )}
                   </tbody>
                 </table>
               </div>
            }
           </NeumorphicCard>
         </>
        }

        {/* Pagamenti Contanti Tab */}
        {activeTab === 'pagamenti' &&
        <>
           <NeumorphicCard className="p-4 lg:p-6">
             <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Storico Pagamenti Contanti</h2>

             {pagamentiContanti.length === 0 ?
            <div className="text-center py-12">
                 <DollarSign className="w-16 h-16 text-slate-300 opacity-50 mx-auto mb-4" />
                 <p className="text-slate-500">Nessun pagamento contanti registrato</p>
               </div> :

            <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
                 <table className="w-full min-w-[600px]">
                   <thead>
                     <tr className="border-b-2 border-blue-600">
                       <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Data</th>
                       <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Locale</th>
                       <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Registrato da</th>
                       <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Importo</th>
                     </tr>
                   </thead>
                   <tbody>
                     {pagamentiContanti.map((pagamento) =>
                  <tr key={pagamento.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                         <td className="p-2 lg:p-3">
                           <div className="flex items-center gap-2">
                             <Calendar className="w-4 h-4 text-slate-400" />
                             <span className="text-slate-700 text-sm">
                               {(() => {
                            try {
                              return format(parseISO(pagamento.data_pagamento), 'dd/MM/yyyy HH:mm', { locale: it });
                            } catch (e) {
                              return 'Data non valida';
                            }
                          })()}
                             </span>
                           </div>
                         </td>
                         <td className="p-2 lg:p-3">
                           <div className="flex items-center gap-2">
                             <Store className="w-4 h-4 text-slate-400" />
                             <span className="text-slate-700 text-sm">{pagamento.store_name}</span>
                           </div>
                         </td>
                         <td className="p-2 lg:p-3">
                           <div className="flex items-center gap-2">
                             <User className="w-4 h-4 text-slate-400" />
                             <span className="text-slate-700 text-sm">{pagamento.registrato_da || '-'}</span>
                           </div>
                         </td>
                         <td className="p-2 lg:p-3 text-right">
                           <span className="text-blue-600 font-bold text-sm lg:text-base">
                             €{pagamento.importo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                           </span>
                         </td>
                       </tr>
                  )}
                   </tbody>
                 </table>
               </div>
            }
           </NeumorphicCard>
         </>
        }
        </div>
        </ProtectedPage>);

}