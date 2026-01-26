import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import {
  Home,
  Zap,
  Users,
  Package,
  CreditCard,
  TrendingUp,
  Plus,
  Trash2,
  Edit,
  X,
  Save,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { formatEuro } from "../components/utils/formatCurrency";
import moment from 'moment';

export default function Costi() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("budget");
  const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));
  const [expandedDetails, setExpandedDetails] = useState({});
  const [expandedStores, setExpandedStores] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({});

  // Queries
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: affitti = [] } = useQuery({
    queryKey: ['costi-affitto'],
    queryFn: () => base44.entities.CostoAffitto.list(),
  });

  const { data: utenze = [] } = useQuery({
    queryKey: ['costi-utenze'],
    queryFn: () => base44.entities.CostoUtenze.list(),
  });

  const { data: nomiUtenze = [] } = useQuery({
    queryKey: ['nomi-utenze'],
    queryFn: () => base44.entities.NomeUtenza.list(),
  });

  const { data: dipendenti = [] } = useQuery({
    queryKey: ['costi-dipendente'],
    queryFn: () => base44.entities.CostoDipendente.list(),
  });

  const { data: ordini = [] } = useQuery({
    queryKey: ['ordini-fornitori'],
    queryFn: async () => {
      const allOrdini = await base44.entities.OrdineFornitore.list();
      return allOrdini.filter(o => o.status === 'completato');
    },
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => base44.entities.Subscription.list(),
  });

  const { data: commissioni = [] } = useQuery({
    queryKey: ['commissioni-pagamento'],
    queryFn: () => base44.entities.CommissionePagamento.list(),
  });

  const { data: budgetAds = [] } = useQuery({
    queryKey: ['budget-marketing'],
    queryFn: () => base44.entities.BudgetMarketing.list(),
  });

  const { data: pianiAds = [] } = useQuery({
    queryKey: ['piani-ads-quarterly'],
    queryFn: () => base44.entities.PianoAdsQuarterly.list(),
  });

  const { data: iPraticoData = [] } = useQuery({
    queryKey: ['ipratico'],
    queryFn: () => base44.entities.iPratico.list('-order_date', 1000),
  });

  const { data: turni = [] } = useQuery({
    queryKey: ['turni-planday'],
    queryFn: () => base44.entities.TurnoPlanday.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: ({ entity, data }) => base44.entities[entity].create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [getQueryKey(variables.entity)] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ entity, id, data }) => base44.entities[entity].update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [getQueryKey(variables.entity)] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ entity, id }) => base44.entities[entity].delete(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [getQueryKey(variables.entity)] });
    },
  });

  const getQueryKey = (entity) => {
    const map = {
      'CostoAffitto': 'costi-affitto',
      'CostoUtenze': 'costi-utenze',
      'CostoDipendente': 'costi-dipendente',
      'Subscription': 'subscriptions',
      'CommissionePagamento': 'commissioni-pagamento',
      'BudgetMarketing': 'budget-marketing'
    };
    return map[entity] || entity.toLowerCase();
  };

  const resetForm = () => {
    setFormData({});
    setEditingItem(null);
    setShowAddForm(false);
  };

  const handleSave = async () => {
    // Validazione base
    if (activeTab === 'affitto' && (!formData.store_id || !formData.affitto_mensile)) {
      alert('Compila tutti i campi obbligatori (Store e Affitto Mensile)');
      return;
    }
    if (activeTab === 'utenze' && !formData.costo_mensile_stimato) {
      alert('Compila il campo Costo Mensile');
      return;
    }
    if (activeTab === 'utenze' && formData.assegnazione === 'singolo' && !formData.store_id) {
      alert('Seleziona un locale');
      return;
    }
    if (activeTab === 'utenze' && formData.assegnazione === 'multipli' && (!formData.stores_ids || formData.stores_ids.length === 0)) {
      alert('Seleziona almeno un locale');
      return;
    }
    
    // Per le utenze, salva il nome se è nuovo
    if (activeTab === 'utenze' && formData.nome_utenza) {
      const nomeEsiste = nomiUtenze.find(n => n.nome === formData.nome_utenza);
      if (!nomeEsiste) {
        try {
          await base44.entities.NomeUtenza.create({ nome: formData.nome_utenza, utilizzi: 1 });
          queryClient.invalidateQueries({ queryKey: ['nomi-utenze'] });
        } catch (error) {
          console.error('Error saving nome utenza:', error);
        }
      } else {
        try {
          await base44.entities.NomeUtenza.update(nomeEsiste.id, { utilizzi: (nomeEsiste.utilizzi || 0) + 1 });
          queryClient.invalidateQueries({ queryKey: ['nomi-utenze'] });
        } catch (error) {
          console.error('Error updating utilizzi:', error);
        }
      }
    }
    if (activeTab === 'dipendenti' && (!formData.livello || !formData.costo_orario)) {
      alert('Compila tutti i campi obbligatori (Livello e Costo Orario)');
      return;
    }
    if (activeTab === 'subscriptions' && (!formData.nome || !formData.costo || !formData.periodo)) {
      alert('Compila tutti i campi obbligatori (Nome, Costo e Periodo)');
      return;
    }
    if (activeTab === 'subscriptions' && formData.assegnazione === 'singolo' && !formData.store_id) {
      alert('Seleziona un locale per la subscription');
      return;
    }
    if (activeTab === 'subscriptions' && formData.assegnazione === 'multipli' && (!formData.stores_ids || formData.stores_ids.length === 0)) {
      alert('Seleziona almeno un locale per la subscription');
      return;
    }
    if (activeTab === 'commissioni' && (!formData.app_delivery || !formData.percentuale)) {
      alert('Compila tutti i campi obbligatori (App Delivery e Percentuale)');
      return;
    }
    if (activeTab === 'ads' && (!formData.piattaforma || !formData.budget_mensile)) {
      alert('Compila tutti i campi obbligatori (Piattaforma e Budget)');
      return;
    }
    if (activeTab === 'ads' && formData.assegnazione === 'singolo' && !formData.store_id) {
      alert('Seleziona un locale per gli Ads');
      return;
    }

    const entityMap = {
      'affitto': 'CostoAffitto',
      'utenze': 'CostoUtenze',
      'dipendenti': 'CostoDipendente',
      'subscriptions': 'Subscription',
      'commissioni': 'CommissionePagamento',
      'ads': 'BudgetMarketing'
    };

    const entity = entityMap[activeTab];

    if (editingItem) {
      updateMutation.mutate({ entity, id: editingItem.id, data: formData });
    } else {
      createMutation.mutate({ entity, data: formData });
    }
  };

  const handleDelete = (entity, id) => {
    if (confirm('Sei sicuro di voler eliminare questo elemento?')) {
      deleteMutation.mutate({ entity, id });
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData(item);
    setShowAddForm(true);
  };

  // Calculate COGS
  const totalCOGS = ordini.reduce((sum, ordine) => {
    return sum + (ordine.totale_ordine || 0);
  }, 0);

  const tabs = [
    { id: 'budget', label: 'Budget', icon: TrendingUp },
    { id: 'affitto', label: 'Affitto', icon: Home },
    { id: 'utenze', label: 'Utenze', icon: Zap },
    { id: 'dipendenti', label: 'Dipendenti', icon: Users },
    { id: 'cogs', label: 'COGS', icon: Package },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'commissioni', label: 'Commissioni', icon: CreditCard },
    { id: 'ads', label: 'Ads', icon: TrendingUp }
  ];

  return (
    <ProtectedPage pageName="Costi">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
            Gestione Costi
          </h1>
          <p className="text-slate-500 mt-1">Gestisci tutti i costi aziendali</p>
        </div>

        {/* Budget Tab */}
        {activeTab === 'budget' && (
          <div className="space-y-6">
            {/* Summary Complessivo */}
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Riepilogo Complessivo</h2>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
                />
              </div>

              {(() => {
                const dataOggi = new Date();
                const meseSelezionato = moment(selectedMonth);
                const ultimoGiornoMese = meseSelezionato.daysInMonth();
                const giornoCorrente = meseSelezionato.isSame(dataOggi, 'month') ? dataOggi.getDate() : ultimoGiornoMese;
                const proRata = giornoCorrente / ultimoGiornoMese;
                const numStores = stores.length;

                let totalRicavi = 0;
                let totalAffitto = 0;
                let totalUtenze = 0;
                let totalCOGS = 0;
                let totalPersonale = 0;
                let totalSubscriptions = 0;
                let totalCommissioni = 0;
                let totalAds = 0;

                stores.forEach(store => {
                  const storeId = store.id;
                  const ricaviMese = iPraticoData
                    .filter(r => r.store_id === storeId && r.order_date?.startsWith(selectedMonth))
                    .reduce((sum, r) => sum + (r.total_revenue || 0), 0);
                  
                  const affitto = affitti.find(a => a.store_id === storeId);
                  const costoAffitto = (affitto?.affitto_mensile || 0) * proRata;
                  
                  const utenzeStore = utenze.filter(u => {
                    if (u.assegnazione === 'singolo') return u.store_id === storeId;
                    else if (u.assegnazione === 'multipli') return u.stores_ids?.includes(storeId);
                    return false;
                  });
                  const costoUtenze = utenzeStore.reduce((sum, u) => sum + (u.costo_mensile_stimato || 0), 0) * proRata;
                  
                  const costoMateriePrime = ordini
                    .filter(o => o.store_id === storeId && o.data_completamento?.startsWith(selectedMonth))
                    .reduce((sum, o) => sum + (o.totale_ordine || 0), 0);
                  
                  const turniMese = turni.filter(t => 
                    t.store_id === storeId && 
                    t.data?.startsWith(selectedMonth) &&
                    t.timbratura_entrata &&
                    t.timbratura_uscita
                  );
                  
                  const costoPersonale = turniMese.reduce((sum, turno) => {
                    const dipendente = allUsers.find(u => u.id === turno.dipendente_id);
                    if (!dipendente?.livello) return sum;
                    const costoLivello = dipendenti.find(d => d.livello === dipendente.livello);
                    if (!costoLivello) return sum;
                    const entrata = new Date(turno.timbratura_entrata);
                    const uscita = new Date(turno.timbratura_uscita);
                    const oreLavorate = (uscita - entrata) / (1000 * 60 * 60);
                    return sum + (oreLavorate * costoLivello.costo_orario);
                  }, 0);
                  
                  const costoSubscriptions = subscriptions
                    .filter(s => s.periodo === 'mensile')
                    .reduce((sum, s) => {
                      if (s.assegnazione === 'singolo' && s.store_id === storeId) return sum + (s.costo || 0);
                      else if (s.assegnazione === 'multipli' && s.stores_ids?.includes(storeId)) return sum + (s.costo || 0);
                      else if (s.assegnazione === 'tutti') return sum + ((s.costo || 0) / numStores);
                      return sum;
                    }, 0) * proRata;
                  
                  const costoSubscriptionsAnnuali = subscriptions
                    .filter(s => s.periodo === 'annuale')
                    .reduce((sum, s) => {
                      if (s.assegnazione === 'singolo' && s.store_id === storeId) return sum + ((s.costo || 0) / 12);
                      else if (s.assegnazione === 'multipli' && s.stores_ids?.includes(storeId)) return sum + ((s.costo || 0) / 12);
                      else if (s.assegnazione === 'tutti') return sum + ((s.costo || 0) / 12 / numStores);
                      return sum;
                    }, 0) * proRata;
                  
                  const totaleSubscriptions = costoSubscriptions + costoSubscriptionsAnnuali;
                  
                  const datiPagamenti = iPraticoData.filter(r => r.store_id === storeId && r.order_date?.startsWith(selectedMonth));
                  const costoCommissioni = datiPagamenti.reduce((sum, record) => {
                    let totCommissioni = 0;
                    Object.keys(record).forEach(appKey => {
                      if (appKey.startsWith('sourceApp_') && !appKey.endsWith('_orders')) {
                        const importo = record[appKey] || 0;
                        if (importo === 0) return;
                        const app = appKey.replace('sourceApp_', '');
                        const appFormatted = app.charAt(0).toUpperCase() + app.slice(1);
                        const commissioneApplicabile = commissioni.find(c => c.app_delivery === appFormatted);
                        if (commissioneApplicabile) {
                          totCommissioni += importo * (commissioneApplicabile.percentuale / 100);
                        }
                      }
                    });
                    return sum + totCommissioni;
                  }, 0);
                  
                  const costoAds = budgetAds.reduce((sum, b) => {
                    if (b.assegnazione === 'singolo' && b.store_id === storeId) return sum + (b.budget_mensile || 0);
                    else if (b.assegnazione === 'tutti') return sum + ((b.budget_mensile || 0) / numStores);
                    return sum;
                  }, 0) * proRata;

                  totalRicavi += ricaviMese;
                  totalAffitto += costoAffitto;
                  totalUtenze += costoUtenze;
                  totalCOGS += costoMateriePrime;
                  totalPersonale += costoPersonale;
                  totalSubscriptions += totaleSubscriptions;
                  totalCommissioni += costoCommissioni;
                  totalAds += costoAds;
                });

                const totalCosti = totalAffitto + totalUtenze + totalCOGS + totalPersonale + totalSubscriptions + totalCommissioni + totalAds;
                const totalMargine = totalRicavi - totalCosti;
                const totalMarginePerc = totalRicavi > 0 ? ((totalMargine / totalRicavi) * 100) : 0;

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="neumorphic-pressed p-4 rounded-xl">
                        <p className="text-xs text-slate-500 mb-1">Ricavi Totali</p>
                        <p className="text-2xl font-bold text-green-600">{formatEuro(totalRicavi)}</p>
                      </div>
                      <div className="neumorphic-pressed p-4 rounded-xl">
                        <p className="text-xs text-slate-500 mb-1">Costi Totali</p>
                        <p className="text-2xl font-bold text-red-600">{formatEuro(totalCosti)}</p>
                      </div>
                      <div className={`neumorphic-pressed p-4 rounded-xl ${totalMargine >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                        <p className="text-xs text-slate-500 mb-1">Margine Totale</p>
                        <p className={`text-2xl font-bold ${totalMargine >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {formatEuro(totalMargine)} ({totalMarginePerc.toFixed(1)}%)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div className="neumorphic-flat p-3 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Affitto</p>
                        <p className="font-bold text-slate-800">{formatEuro(totalAffitto)}</p>
                        <p className="text-xs text-slate-400">{((totalAffitto / totalCosti) * 100).toFixed(1)}%</p>
                      </div>
                      <div className="neumorphic-flat p-3 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Utenze</p>
                        <p className="font-bold text-slate-800">{formatEuro(totalUtenze)}</p>
                        <p className="text-xs text-slate-400">{((totalUtenze / totalCosti) * 100).toFixed(1)}%</p>
                      </div>
                      <div className="neumorphic-flat p-3 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">COGS</p>
                        <p className="font-bold text-slate-800">{formatEuro(totalCOGS)}</p>
                        <p className="text-xs text-slate-400">{((totalCOGS / totalCosti) * 100).toFixed(1)}%</p>
                      </div>
                      <div className="neumorphic-flat p-3 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Personale</p>
                        <p className="font-bold text-slate-800">{formatEuro(totalPersonale)}</p>
                        <p className="text-xs text-slate-400">{((totalPersonale / totalCosti) * 100).toFixed(1)}%</p>
                      </div>
                      <div className="neumorphic-flat p-3 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Subscriptions</p>
                        <p className="font-bold text-slate-800">{formatEuro(totalSubscriptions)}</p>
                        <p className="text-xs text-slate-400">{((totalSubscriptions / totalCosti) * 100).toFixed(1)}%</p>
                      </div>
                      <div className="neumorphic-flat p-3 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Commissioni</p>
                        <p className="font-bold text-slate-800">{formatEuro(totalCommissioni)}</p>
                        <p className="text-xs text-slate-400">{((totalCommissioni / totalCosti) * 100).toFixed(1)}%</p>
                      </div>
                      <div className="neumorphic-flat p-3 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Ads</p>
                        <p className="font-bold text-slate-800">{formatEuro(totalAds)}</p>
                        <p className="text-xs text-slate-400">{((totalAds / totalCosti) * 100).toFixed(1)}%</p>
                      </div>
                      <div className="neumorphic-flat p-3 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Num. Locali</p>
                        <p className="font-bold text-slate-800">{numStores}</p>
                        <p className="text-xs text-slate-400">Media</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </NeumorphicCard>

            {/* Per Locale */}
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Budget per Locale</h2>
              </div>

              {stores.map(store => {
              const storeId = store.id;
              const storeName = store.name;

              // Calcolo pro rata
              const dataOggi = new Date();
              const meseSelezionato = moment(selectedMonth);
              const ultimoGiornoMese = meseSelezionato.daysInMonth();
              const giornoCorrente = meseSelezionato.isSame(dataOggi, 'month') ? dataOggi.getDate() : ultimoGiornoMese;
              const proRata = giornoCorrente / ultimoGiornoMese;

              // Ricavi da iPratico
              const ricaviMese = iPraticoData
                .filter(r => r.store_id === storeId && r.order_date?.startsWith(selectedMonth))
                .reduce((sum, r) => sum + (r.total_revenue || 0), 0);

              // Affitto (pro rata)
              const affitto = affitti.find(a => a.store_id === storeId);
              const costoAffitto = (affitto?.affitto_mensile || 0) * proRata;

              // Utenze (pro rata)
              const utenzeStore = utenze.filter(u => {
                if (u.assegnazione === 'singolo') {
                  return u.store_id === storeId;
                } else if (u.assegnazione === 'multipli') {
                  return u.stores_ids?.includes(storeId);
                }
                return false;
              });
              const costoUtenze = utenzeStore.reduce((sum, u) => sum + (u.costo_mensile_stimato || 0), 0) * proRata;

              // COGS (ordini completati del mese per questo store)
              const costoMateriePrime = ordini
                .filter(o => o.store_id === storeId && o.data_completamento?.startsWith(selectedMonth))
                .reduce((sum, o) => sum + (o.totale_ordine || 0), 0);

              // Personale (ore da Planday * costo orario per livello)
              const turniMese = turni.filter(t => 
                t.store_id === storeId && 
                t.data?.startsWith(selectedMonth) &&
                t.timbratura_entrata &&
                t.timbratura_uscita
              );

              const costoPersonale = turniMese.reduce((sum, turno) => {
                const dipendente = allUsers.find(u => u.id === turno.dipendente_id);
                if (!dipendente?.livello) return sum;

                const costoLivello = dipendenti.find(d => d.livello === dipendente.livello);
                if (!costoLivello) return sum;

                const entrata = new Date(turno.timbratura_entrata);
                const uscita = new Date(turno.timbratura_uscita);
                const oreLavorate = (uscita - entrata) / (1000 * 60 * 60);

                return sum + (oreLavorate * costoLivello.costo_orario);
              }, 0);

              // Subscriptions (calcolate mensilmente con pro rata)
              const numStores = stores.length;
              const costoSubscriptions = subscriptions
                .filter(s => s.periodo === 'mensile')
                .reduce((sum, s) => {
                  if (s.assegnazione === 'singolo' && s.store_id === storeId) {
                    return sum + (s.costo || 0);
                  } else if (s.assegnazione === 'multipli' && s.stores_ids?.includes(storeId)) {
                    return sum + (s.costo || 0);
                  } else if (s.assegnazione === 'tutti') {
                    return sum + ((s.costo || 0) / numStores);
                  }
                  return sum;
                }, 0) * proRata;
              const costoSubscriptionsAnnuali = subscriptions
                .filter(s => s.periodo === 'annuale')
                .reduce((sum, s) => {
                  if (s.assegnazione === 'singolo' && s.store_id === storeId) {
                    return sum + ((s.costo || 0) / 12);
                  } else if (s.assegnazione === 'multipli' && s.stores_ids?.includes(storeId)) {
                    return sum + ((s.costo || 0) / 12);
                  } else if (s.assegnazione === 'tutti') {
                    return sum + ((s.costo || 0) / 12 / numStores);
                  }
                  return sum;
                }, 0) * proRata;
              const totaleSubscriptions = costoSubscriptions + costoSubscriptionsAnnuali;

              // Commissioni (calcolate sui pagamenti iPratico)
              const datiPagamenti = iPraticoData.filter(r => r.store_id === storeId && r.order_date?.startsWith(selectedMonth));
              const costoCommissioni = datiPagamenti.reduce((sum, record) => {
                let totCommissioni = 0;
                
                // Trova le app presenti nel record e i loro importi
                Object.keys(record).forEach(appKey => {
                  if (appKey.startsWith('sourceApp_') && !appKey.endsWith('_orders')) {
                    const importo = record[appKey] || 0;
                    if (importo === 0) return;
                    
                    const app = appKey.replace('sourceApp_', '');
                    const appFormatted = app.charAt(0).toUpperCase() + app.slice(1);
                    
                    // Cerca commissione per questa app
                    const commissioneApplicabile = commissioni.find(c => c.app_delivery === appFormatted);
                    
                    if (commissioneApplicabile) {
                      totCommissioni += importo * (commissioneApplicabile.percentuale / 100);
                    }
                  }
                });

                return sum + totCommissioni;
              }, 0);

              // Ads (budget mensile con pro rata)
              const costoAds = budgetAds.reduce((sum, b) => {
                if (b.assegnazione === 'singolo' && b.store_id === storeId) {
                  return sum + (b.budget_mensile || 0);
                } else if (b.assegnazione === 'tutti') {
                  return sum + ((b.budget_mensile || 0) / numStores);
                }
                return sum;
              }, 0) * proRata;

              // Ads piattaforme delivery (da Piano Quarter)
              const costoAdsPiattaforme = pianiAds.reduce((sum, piano) => {
                // Verifica se il piano è nel mese selezionato
                const dataInizio = moment(piano.data_inizio);
                const dataFine = moment(piano.data_fine);
                const meseInizio = moment(selectedMonth).startOf('month');
                const meseFine = moment(selectedMonth).endOf('month');
                
                // Se il piano non interseca il mese selezionato, skip
                if (dataFine.isBefore(meseInizio) || dataInizio.isAfter(meseFine)) {
                  return sum;
                }
                
                // Verifica se questo store è assegnato al piano
                if (!piano.stores_ids || !piano.stores_ids.includes(storeId)) {
                  return sum;
                }
                
                // Calcola numero di mesi del piano
                const durataInMesi = dataFine.diff(dataInizio, 'months', true);
                
                // Calcola budget mensile per locale
                const numStoresAssegnati = piano.stores_ids.length;
                const budgetPerLocale = piano.budget / numStoresAssegnati;
                const budgetMensilePerLocale = budgetPerLocale / durataInMesi;
                
                // Calcola costo effettivo considerando il cofinanziamento
                const percentualeCofinanziamento = piano.percentuale_cofinanziamento || 0;
                const costoEffettivo = budgetMensilePerLocale * (1 - percentualeCofinanziamento / 100);
                
                // Applica pro rata del mese corrente
                const costoMeseConProrata = costoEffettivo * proRata;
                
                return sum + costoMeseConProrata;
              }, 0);

              // Totali
              const totCosti = costoAffitto + costoUtenze + costoMateriePrime + costoPersonale + totaleSubscriptions + costoCommissioni + costoAds + costoAdsPiattaforme;
              const margine = ricaviMese - totCosti;
              const marginePerc = ricaviMese > 0 ? ((margine / ricaviMese) * 100) : 0;

              return (
                <div key={storeId} className="neumorphic-flat p-6 rounded-xl mb-4">
                  <button
                    onClick={() => setExpandedStores({...expandedStores, [storeId]: !expandedStores[storeId]})}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-800">{storeName}</h3>
                      {expandedStores[storeId] ? <ChevronDown className="w-5 h-5 text-slate-600" /> : <ChevronRight className="w-5 h-5 text-slate-600" />}
                    </div>
                  </button>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="neumorphic-pressed p-4 rounded-xl">
                      <p className="text-xs text-slate-500 mb-1">Ricavi</p>
                      <p className="text-2xl font-bold text-green-600">{formatEuro(ricaviMese)}</p>
                    </div>
                    <div className="neumorphic-pressed p-4 rounded-xl">
                      <p className="text-xs text-slate-500 mb-1">Costi Totali</p>
                      <p className="text-2xl font-bold text-red-600">{formatEuro(totCosti)}</p>
                      <p className="text-xs text-slate-400 mt-1">Pro rata: {giornoCorrente}/{ultimoGiornoMese} giorni</p>
                    </div>
                  </div>

                  <div className={`neumorphic-pressed p-4 rounded-xl mb-4 ${margine >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="text-xs text-slate-500 mb-1">Margine</p>
                    <p className={`text-2xl font-bold ${margine >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatEuro(margine)} ({marginePerc.toFixed(1)}%)
                    </p>
                  </div>

                  {expandedStores[storeId] && (
                  <div className="space-y-2 text-sm">
                    {/* Affitto */}
                    <div className="border-b border-slate-200">
                      <button
                        onClick={() => setExpandedDetails({...expandedDetails, [`${storeId}-affitto`]: !expandedDetails[`${storeId}-affitto`]})}
                        className="w-full flex justify-between items-center py-2 hover:bg-slate-50 rounded transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {expandedDetails[`${storeId}-affitto`] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span className="text-slate-600">Affitto</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{((costoAffitto / totCosti) * 100).toFixed(1)}%</span>
                          <span className="font-medium text-slate-800">{formatEuro(costoAffitto)}</span>
                        </div>
                      </button>
                      {expandedDetails[`${storeId}-affitto`] && affitto && (
                        <div className="pl-6 pb-2 text-xs text-slate-500">
                          <p>Affitto mensile: {formatEuro(affitto.affitto_mensile)}</p>
                          {affitto.note && <p className="mt-1">Note: {affitto.note}</p>}
                        </div>
                      )}
                    </div>

                    {/* Utenze */}
                    <div className="border-b border-slate-200">
                      <button
                        onClick={() => setExpandedDetails({...expandedDetails, [`${storeId}-utenze`]: !expandedDetails[`${storeId}-utenze`]})}
                        className="w-full flex justify-between items-center py-2 hover:bg-slate-50 rounded transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {expandedDetails[`${storeId}-utenze`] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span className="text-slate-600">Utenze</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{((costoUtenze / totCosti) * 100).toFixed(1)}%</span>
                          <span className="font-medium text-slate-800">{formatEuro(costoUtenze)}</span>
                        </div>
                      </button>
                      {expandedDetails[`${storeId}-utenze`] && utenzeStore.length > 0 && (
                       <div className="pl-6 pb-2 space-y-1">
                         {utenzeStore.map(u => (
                           <div key={u.id} className="text-xs text-slate-500 flex justify-between">
                             <span>
                               {u.nome_utenza || 'Utenza'}
                               {u.assegnazione === 'multipli' && <span className="ml-1 text-orange-600">×{u.stores_ids?.length || 0}</span>}
                             </span>
                             <span>{formatEuro(u.costo_mensile_stimato)}</span>
                           </div>
                         ))}
                       </div>
                      )}
                    </div>

                    {/* COGS */}
                    <div className="border-b border-slate-200">
                      <button
                        onClick={() => setExpandedDetails({...expandedDetails, [`${storeId}-cogs`]: !expandedDetails[`${storeId}-cogs`]})}
                        className="w-full flex justify-between items-center py-2 hover:bg-slate-50 rounded transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {expandedDetails[`${storeId}-cogs`] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span className="text-slate-600">Materie Prime (COGS)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{((costoMateriePrime / totCosti) * 100).toFixed(1)}%</span>
                          <span className="font-medium text-slate-800">{formatEuro(costoMateriePrime)}</span>
                        </div>
                      </button>
                      {expandedDetails[`${storeId}-cogs`] && (
                        <div className="pl-6 pb-2 space-y-1">
                          {ordini.filter(o => o.store_id === storeId && o.data_completamento?.startsWith(selectedMonth)).map(ord => (
                            <div key={ord.id} className="text-xs text-slate-500 flex justify-between">
                              <span>{ord.fornitore || 'Ordine'} - {ord.data_completamento?.split('T')[0]}</span>
                              <span>{formatEuro(ord.totale_ordine)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Personale */}
                    <div className="border-b border-slate-200">
                      <button
                        onClick={() => setExpandedDetails({...expandedDetails, [`${storeId}-personale`]: !expandedDetails[`${storeId}-personale`]})}
                        className="w-full flex justify-between items-center py-2 hover:bg-slate-50 rounded transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {expandedDetails[`${storeId}-personale`] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span className="text-slate-600">Personale</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{((costoPersonale / totCosti) * 100).toFixed(1)}%</span>
                          <span className="font-medium text-slate-800">{formatEuro(costoPersonale)}</span>
                        </div>
                      </button>
                      {expandedDetails[`${storeId}-personale`] && (
                        <div className="pl-6 pb-2 text-xs text-slate-500">
                          <p>Ore lavorate totali: {turniMese.reduce((sum, t) => {
                            if (!t.timbratura_entrata || !t.timbratura_uscita) return sum;
                            const ore = (new Date(t.timbratura_uscita) - new Date(t.timbratura_entrata)) / (1000 * 60 * 60);
                            return sum + ore;
                          }, 0).toFixed(1)} ore</p>
                          <p className="mt-1">Turni completati: {turniMese.length}</p>
                        </div>
                      )}
                    </div>

                    {/* Subscriptions */}
                    <div className="border-b border-slate-200">
                      <button
                        onClick={() => setExpandedDetails({...expandedDetails, [`${storeId}-subscriptions`]: !expandedDetails[`${storeId}-subscriptions`]})}
                        className="w-full flex justify-between items-center py-2 hover:bg-slate-50 rounded transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {expandedDetails[`${storeId}-subscriptions`] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span className="text-slate-600">Subscriptions</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{((totaleSubscriptions / totCosti) * 100).toFixed(1)}%</span>
                          <span className="font-medium text-slate-800">{formatEuro(totaleSubscriptions)}</span>
                        </div>
                      </button>
                      {expandedDetails[`${storeId}-subscriptions`] && subscriptions.length > 0 && (
                      <div className="pl-6 pb-2 space-y-1">
                        {subscriptions
                          .filter(s => s.assegnazione === 'tutti' || (s.assegnazione === 'singolo' && s.store_id === storeId) || (s.assegnazione === 'multipli' && s.stores_ids?.includes(storeId)))
                          .map(s => {
                            const costoBase = s.periodo === 'annuale' ? s.costo / 12 : s.costo;
                            const costoFinale = s.assegnazione === 'tutti' ? costoBase / numStores : costoBase;
                            return (
                              <div key={s.id} className="text-xs text-slate-500 flex justify-between">
                                <span>
                                  {s.nome} ({s.periodo})
                                  {s.assegnazione === 'tutti' && <span className="ml-1 text-blue-600">÷{numStores}</span>}
                                  {s.assegnazione === 'multipli' && <span className="ml-1 text-orange-600">×{s.stores_ids?.length || 0}</span>}
                                </span>
                                <span>{formatEuro(costoFinale)}</span>
                              </div>
                            );
                          })}
                      </div>
                      )}
                    </div>

                    {/* Commissioni */}
                    <div className="border-b border-slate-200">
                      <button
                        onClick={() => setExpandedDetails({...expandedDetails, [`${storeId}-commissioni`]: !expandedDetails[`${storeId}-commissioni`]})}
                        className="w-full flex justify-between items-center py-2 hover:bg-slate-50 rounded transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {expandedDetails[`${storeId}-commissioni`] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span className="text-slate-600">Commissioni Pagamento</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{((costoCommissioni / totCosti) * 100).toFixed(1)}%</span>
                          <span className="font-medium text-slate-800">{formatEuro(costoCommissioni)}</span>
                        </div>
                      </button>
                      {expandedDetails[`${storeId}-commissioni`] && (
                       <div className="pl-6 pb-2 space-y-1">
                         {commissioni.map(c => {
                           // Calcola importo per questa commissione specifica
                           const importoCommissione = datiPagamenti.reduce((sum, record) => {
                             let totCommissione = 0;

                             Object.keys(record).forEach(appKey => {
                               if (appKey.startsWith('sourceApp_') && !appKey.endsWith('_orders')) {
                                 const importo = record[appKey] || 0;
                                 if (importo === 0) return;

                                 const app = appKey.replace('sourceApp_', '');
                                 const appFormatted = app.charAt(0).toUpperCase() + app.slice(1);

                                 // Verifica match app
                                 if (c.app_delivery === appFormatted) {
                                   totCommissione += importo * (c.percentuale / 100);
                                 }
                               }
                             });

                             return sum + totCommissione;
                           }, 0);

                           return (
                             <div key={c.id} className="text-xs text-slate-500 flex justify-between">
                               <span>
                                 {c.app_delivery} - {c.percentuale}%
                               </span>
                               <span>{formatEuro(importoCommissione)}</span>
                             </div>
                           );
                         })}
                       </div>
                      )}
                    </div>

                    {/* Ads */}
                    <div className="border-b border-slate-200">
                      <button
                        onClick={() => setExpandedDetails({...expandedDetails, [`${storeId}-ads`]: !expandedDetails[`${storeId}-ads`]})}
                        className="w-full flex justify-between items-center py-2 hover:bg-slate-50 rounded transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {expandedDetails[`${storeId}-ads`] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span className="text-slate-600">Marketing Ads</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{((costoAds / totCosti) * 100).toFixed(1)}%</span>
                          <span className="font-medium text-slate-800">{formatEuro(costoAds)}</span>
                        </div>
                      </button>
                      {expandedDetails[`${storeId}-ads`] && budgetAds.length > 0 && (
                       <div className="pl-6 pb-2 space-y-1">
                         {budgetAds
                           .filter(b => b.assegnazione === 'tutti' || (b.assegnazione === 'singolo' && b.store_id === storeId))
                           .map(b => {
                             const costoFinale = b.assegnazione === 'tutti' ? b.budget_mensile / numStores : b.budget_mensile;
                             return (
                               <div key={b.id} className="text-xs text-slate-500 flex justify-between">
                                 <span>
                                   {b.piattaforma}
                                   {b.assegnazione === 'tutti' && <span className="ml-1 text-blue-600">÷{numStores}</span>}
                                 </span>
                                 <span>{formatEuro(costoFinale)}</span>
                               </div>
                             );
                           })}
                       </div>
                      )}
                    </div>

                    {/* Ads Piattaforme (da Piano Quarter) */}
                    <div className="border-b border-slate-200">
                      <button
                        onClick={() => setExpandedDetails({...expandedDetails, [`${storeId}-ads-piattaforme`]: !expandedDetails[`${storeId}-ads-piattaforme`]})}
                        className="w-full flex justify-between items-center py-2 hover:bg-slate-50 rounded transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {expandedDetails[`${storeId}-ads-piattaforme`] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span className="text-slate-600">Ads Piattaforme</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{((costoAdsPiattaforme / totCosti) * 100).toFixed(1)}%</span>
                          <span className="font-medium text-slate-800">{formatEuro(costoAdsPiattaforme)}</span>
                        </div>
                      </button>
                      {expandedDetails[`${storeId}-ads-piattaforme`] && (
                      <div className="pl-6 pb-2 space-y-1">
                        {pianiAds
                          .filter(piano => {
                            const dataInizio = moment(piano.data_inizio);
                            const dataFine = moment(piano.data_fine);
                            const meseInizio = moment(selectedMonth).startOf('month');
                            const meseFine = moment(selectedMonth).endOf('month');
                            return !(dataFine.isBefore(meseInizio) || dataInizio.isAfter(meseFine)) && 
                                   piano.stores_ids?.includes(storeId);
                          })
                          .map(piano => {
                            const dataInizio = moment(piano.data_inizio);
                            const dataFine = moment(piano.data_fine);

                            // Calcola numero di mesi del piano
                            const durataInMesi = dataFine.diff(dataInizio, 'months', true);

                            // Calcola budget mensile per locale
                            const numStoresAssegnati = piano.stores_ids.length;
                            const budgetPerLocale = piano.budget / numStoresAssegnati;
                            const budgetMensilePerLocale = budgetPerLocale / durataInMesi;

                            // Calcola costo effettivo considerando il cofinanziamento
                            const percentualeCofinanziamento = piano.percentuale_cofinanziamento || 0;
                            const costoEffettivo = budgetMensilePerLocale * (1 - percentualeCofinanziamento / 100);

                            // Applica pro rata del mese corrente
                            const costoMeseConProrata = costoEffettivo * proRata;

                            return (
                              <div key={piano.id} className="text-xs text-slate-500 flex justify-between">
                                <span>
                                  {piano.nome} ({piano.piattaforma})
                                  {numStoresAssegnati > 1 && <span className="ml-1 text-blue-600">÷{numStoresAssegnati}</span>}
                                  {percentualeCofinanziamento > 0 && <span className="ml-1 text-green-600">-{percentualeCofinanziamento}%</span>}
                                  <span className="ml-1 text-orange-600">({giornoCorrente}/{ultimoGiornoMese}gg)</span>
                                </span>
                                <span>{formatEuro(costoMeseConProrata)}</span>
                              </div>
                            );
                          })}
                         {pianiAds.filter(piano => {
                           const dataInizio = moment(piano.data_inizio);
                           const dataFine = moment(piano.data_fine);
                           const meseInizio = moment(selectedMonth).startOf('month');
                           const meseFine = moment(selectedMonth).endOf('month');
                           return !(dataFine.isBefore(meseInizio) || dataInizio.isAfter(meseFine)) && 
                                  piano.stores_ids?.includes(storeId);
                         }).length === 0 && (
                           <div className="text-xs text-slate-400">Nessun piano ads nel periodo</div>
                         )}
                       </div>
                      )}
                    </div>
                  </div>
                  )}
                </div>
              );
            })}
          </NeumorphicCard>
        )}

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  resetForm();
                }}
                className={`px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                    : 'neumorphic-flat text-slate-700 hover:shadow-md'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Affitto */}
        {activeTab === 'affitto' && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Affitti Locali</h2>
              <NeumorphicButton
                onClick={() => setShowAddForm(!showAddForm)}
                variant="primary"
                className="flex items-center gap-2"
              >
                {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddForm ? 'Annulla' : 'Aggiungi'}
              </NeumorphicButton>
            </div>

            {showAddForm && (
              <div className="neumorphic-pressed p-4 rounded-xl mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Store</label>
                  <select
                    value={formData.store_id || ''}
                    onChange={(e) => {
                      const store = stores.find(s => s.id === e.target.value);
                      setFormData({ ...formData, store_id: e.target.value, store_name: store?.name });
                    }}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="">Seleziona store</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Affitto Mensile (€)</label>
                  <input
                    type="number"
                    value={formData.affitto_mensile || ''}
                    onChange={(e) => setFormData({ ...formData, affitto_mensile: parseFloat(e.target.value) })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
                  <textarea
                    value={formData.note || ''}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    rows={2}
                  />
                </div>
                <NeumorphicButton onClick={handleSave} variant="primary" className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Salva
                </NeumorphicButton>
              </div>
            )}

            <div className="space-y-3">
              {affitti.map(item => (
                <div key={item.id} className="neumorphic-flat p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{item.store_name}</p>
                    <p className="text-sm text-slate-600">{formatEuro(item.affitto_mensile)}/mese</p>
                    {item.note && <p className="text-xs text-slate-500 mt-1">{item.note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete('CostoAffitto', item.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </NeumorphicCard>
        )}

        {/* Utenze */}
        {activeTab === 'utenze' && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Utenze Locali</h2>
              <NeumorphicButton
                onClick={() => setShowAddForm(!showAddForm)}
                variant="primary"
                className="flex items-center gap-2"
              >
                {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddForm ? 'Annulla' : 'Aggiungi'}
              </NeumorphicButton>
            </div>

            {showAddForm && (
              <div className="neumorphic-pressed p-4 rounded-xl mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Assegnazione</label>
                  <select
                    value={formData.assegnazione || 'singolo'}
                    onChange={(e) => setFormData({ ...formData, assegnazione: e.target.value, store_id: '', store_name: '', stores_ids: [], stores_names: [] })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="singolo">Singolo locale</option>
                    <option value="multipli">Più locali</option>
                  </select>
                </div>
                {formData.assegnazione === 'singolo' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Store</label>
                    <select
                      value={formData.store_id || ''}
                      onChange={(e) => {
                        const store = stores.find(s => s.id === e.target.value);
                        setFormData({ ...formData, store_id: e.target.value, store_name: store?.name });
                      }}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    >
                      <option value="">Seleziona store</option>
                      {stores.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Stores</label>
                    <div className="neumorphic-pressed p-4 rounded-xl space-y-2 max-h-48 overflow-y-auto">
                      {stores.map(store => (
                        <label key={store.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={(formData.stores_ids || []).includes(store.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  stores_ids: [...(formData.stores_ids || []), store.id],
                                  stores_names: [...(formData.stores_names || []), store.name]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  stores_ids: (formData.stores_ids || []).filter(id => id !== store.id),
                                  stores_names: (formData.stores_names || []).filter(n => n !== store.name)
                                });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-slate-700">{store.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nome Utenza</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.nome_utenza || ''}
                      onChange={(e) => setFormData({ ...formData, nome_utenza: e.target.value })}
                      className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    >
                      <option value="">Seleziona o crea nuovo...</option>
                      {nomiUtenze.map(nome => (
                        <option key={nome.id} value={nome.nome}>{nome.nome}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={formData.nome_utenza_custom || ''}
                      onChange={(e) => setFormData({ ...formData, nome_utenza: e.target.value, nome_utenza_custom: e.target.value })}
                      placeholder="o scrivi nuovo nome"
                      className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Costo Mensile Stimato (€)</label>
                  <input
                    type="number"
                    value={formData.costo_mensile_stimato || ''}
                    onChange={(e) => setFormData({ ...formData, costo_mensile_stimato: parseFloat(e.target.value) })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
                  <textarea
                    value={formData.note || ''}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    rows={2}
                  />
                </div>
                <NeumorphicButton onClick={handleSave} variant="primary" className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Salva
                </NeumorphicButton>
              </div>
            )}

            <div className="space-y-3">
              {utenze.map(item => (
                <div key={item.id} className="neumorphic-flat p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800 mb-1">
                      {item.nome_utenza || 'Utenza'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.assegnazione === 'singolo' ? item.store_name : (item.stores_names?.join(', ') || 'Multipli')}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">{formatEuro(item.costo_mensile_stimato)}/mese</p>
                    {item.note && <p className="text-xs text-slate-500 mt-1">{item.note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete('CostoUtenze', item.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </NeumorphicCard>
        )}

        {/* Dipendenti */}
        {activeTab === 'dipendenti' && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Costi Orari Dipendenti</h2>
              <NeumorphicButton
                onClick={() => setShowAddForm(!showAddForm)}
                variant="primary"
                className="flex items-center gap-2"
              >
                {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddForm ? 'Annulla' : 'Aggiungi'}
              </NeumorphicButton>
            </div>

            {showAddForm && (
              <div className="neumorphic-pressed p-4 rounded-xl mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Livello (1-7)</label>
                  <select
                    value={formData.livello || ''}
                    onChange={(e) => setFormData({ ...formData, livello: parseInt(e.target.value) })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="">Seleziona livello</option>
                    {[1, 2, 3, 4, 5, 6, 7].map(level => (
                      <option key={level} value={level}>Livello {level}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Costo Orario (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costo_orario || ''}
                    onChange={(e) => setFormData({ ...formData, costo_orario: parseFloat(e.target.value) })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
                  <textarea
                    value={formData.note || ''}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    rows={2}
                  />
                </div>
                <NeumorphicButton onClick={handleSave} variant="primary" className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Salva
                </NeumorphicButton>
              </div>
            )}

            <div className="space-y-3">
              {dipendenti.map(item => (
                <div key={item.id} className="neumorphic-flat p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">Livello {item.livello}</p>
                    <p className="text-sm text-slate-600">{formatEuro(item.costo_orario)}/ora</p>
                    {item.note && <p className="text-xs text-slate-500 mt-1">{item.note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete('CostoDipendente', item.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </NeumorphicCard>
        )}

        {/* COGS */}
        {activeTab === 'cogs' && (
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Costo Materie Prime (COGS)</h2>
            <div className="neumorphic-flat p-6 rounded-xl text-center">
              <p className="text-sm text-slate-600 mb-2">Totale ordini arrivati</p>
              <p className="text-4xl font-bold text-slate-800">{formatEuro(totalCOGS)}</p>
              <p className="text-xs text-slate-500 mt-2">Calcolato automaticamente da "Ordini Arrivati"</p>
            </div>
          </NeumorphicCard>
        )}

        {/* Subscriptions */}
        {activeTab === 'subscriptions' && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Subscriptions</h2>
              <NeumorphicButton
                onClick={() => setShowAddForm(!showAddForm)}
                variant="primary"
                className="flex items-center gap-2"
              >
                {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddForm ? 'Annulla' : 'Aggiungi'}
              </NeumorphicButton>
            </div>

            {showAddForm && (
              <div className="neumorphic-pressed p-4 rounded-xl mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nome Subscription</label>
                  <input
                    type="text"
                    value={formData.nome || ''}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Costo (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costo || ''}
                    onChange={(e) => setFormData({ ...formData, costo: parseFloat(e.target.value) })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Periodo</label>
                  <select
                    value={formData.periodo || ''}
                    onChange={(e) => setFormData({ ...formData, periodo: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="">Seleziona periodo</option>
                    <option value="mensile">Mensile</option>
                    <option value="annuale">Annuale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Assegnazione</label>
                  <select
                    value={formData.assegnazione || 'tutti'}
                    onChange={(e) => setFormData({ ...formData, assegnazione: e.target.value, store_id: '', store_name: '', stores_ids: [], stores_names: [] })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="tutti">Tutti i locali (costo diviso)</option>
                    <option value="singolo">Singolo locale</option>
                    <option value="multipli">Più locali (costo per ognuno)</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {formData.assegnazione === 'tutti' ? 'Il costo verrà diviso equamente tra tutti i locali' : 
                     formData.assegnazione === 'singolo' ? 'Il costo verrà assegnato solo al locale selezionato' :
                     'Ogni locale selezionato pagherà il costo completo'}
                  </p>
                </div>
                {formData.assegnazione === 'singolo' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Locale</label>
                    <select
                      value={formData.store_id || ''}
                      onChange={(e) => {
                        const store = stores.find(s => s.id === e.target.value);
                        setFormData({ ...formData, store_id: e.target.value, store_name: store?.name });
                      }}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    >
                      <option value="">Seleziona locale</option>
                      {stores.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {formData.assegnazione === 'multipli' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Locali</label>
                    <div className="neumorphic-pressed p-4 rounded-xl space-y-2 max-h-48 overflow-y-auto">
                      {stores.map(store => (
                        <label key={store.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={(formData.stores_ids || []).includes(store.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  stores_ids: [...(formData.stores_ids || []), store.id],
                                  stores_names: [...(formData.stores_names || []), store.name]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  stores_ids: (formData.stores_ids || []).filter(id => id !== store.id),
                                  stores_names: (formData.stores_names || []).filter(n => n !== store.name)
                                });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-slate-700">{store.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
                  <textarea
                    value={formData.note || ''}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    rows={2}
                  />
                </div>
                <NeumorphicButton onClick={handleSave} variant="primary" className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Salva
                </NeumorphicButton>
              </div>
            )}

            <div className="space-y-3">
              {subscriptions.map(item => (
                <div key={item.id} className="neumorphic-flat p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-slate-800">{item.nome}</p>
                      {item.assegnazione === 'tutti' ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Tutti i locali
                        </span>
                      ) : item.assegnazione === 'singolo' ? (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          {item.store_name}
                        </span>
                      ) : (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                          {item.stores_ids?.length || 0} locali
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      {formatEuro(item.costo)}/{item.periodo}
                      {item.assegnazione === 'tutti' && <span className="text-blue-600 ml-1">(÷{stores.length} locali)</span>}
                      {item.assegnazione === 'multipli' && <span className="text-orange-600 ml-1">({item.stores_names?.join(', ')})</span>}
                    </p>
                    {item.note && <p className="text-xs text-slate-500 mt-1">{item.note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete('Subscription', item.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </NeumorphicCard>
        )}

        {/* Commissioni */}
        {activeTab === 'commissioni' && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Commissioni Pagamento</h2>
              <NeumorphicButton
                onClick={() => setShowAddForm(!showAddForm)}
                variant="primary"
                className="flex items-center gap-2"
              >
                {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddForm ? 'Annulla' : 'Aggiungi'}
              </NeumorphicButton>
            </div>

            {showAddForm && (
              <div className="neumorphic-pressed p-4 rounded-xl mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">App Delivery</label>
                  <select
                    value={formData.app_delivery || ''}
                    onChange={(e) => setFormData({ ...formData, app_delivery: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="">Seleziona app</option>
                    {(() => {
                      const apps = new Set();
                      iPraticoData.forEach(record => {
                        Object.keys(record).forEach(key => {
                          if (key.startsWith('sourceApp_') && !key.endsWith('_orders')) {
                            const app = key.replace('sourceApp_', '');
                            apps.add(app.charAt(0).toUpperCase() + app.slice(1));
                          }
                        });
                      });
                      return Array.from(apps).sort().map(app => (
                        <option key={app} value={app}>{app}</option>
                      ));
                    })()}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Es: Deliveroo, Glovo, ecc.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Percentuale Commissione (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.percentuale || ''}
                    onChange={(e) => setFormData({ ...formData, percentuale: parseFloat(e.target.value) })}
                    placeholder="es: 2.5"
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
                  <textarea
                    value={formData.note || ''}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    rows={2}
                  />
                </div>
                <NeumorphicButton onClick={handleSave} variant="primary" className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Salva
                </NeumorphicButton>
              </div>
            )}

            <div className="space-y-3">
              {commissioni.map(item => (
                <div key={item.id} className="neumorphic-flat p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-slate-800">
                        {item.app_delivery}
                      </p>
                    </div>
                    <p className="text-sm text-slate-600">{item.percentuale}%</p>
                    {item.note && <p className="text-xs text-slate-500 mt-1">{item.note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete('CommissionePagamento', item.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </NeumorphicCard>
        )}

        {/* Ads */}
        {activeTab === 'ads' && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Budget Marketing</h2>
              <NeumorphicButton
                onClick={() => setShowAddForm(!showAddForm)}
                variant="primary"
                className="flex items-center gap-2"
              >
                {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddForm ? 'Annulla' : 'Aggiungi'}
              </NeumorphicButton>
            </div>

            {showAddForm && (
              <div className="neumorphic-pressed p-4 rounded-xl mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Piattaforma</label>
                  <input
                    type="text"
                    value={formData.piattaforma || ''}
                    onChange={(e) => setFormData({ ...formData, piattaforma: e.target.value })}
                    placeholder="es: Google Ads, Meta, TikTok"
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Budget Mensile (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.budget_mensile || ''}
                    onChange={(e) => setFormData({ ...formData, budget_mensile: parseFloat(e.target.value) })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Assegnazione</label>
                  <select
                    value={formData.assegnazione || 'tutti'}
                    onChange={(e) => setFormData({ ...formData, assegnazione: e.target.value, store_id: '', store_name: '', stores_ids: [], stores_names: [] })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="tutti">Tutti i locali (costo diviso)</option>
                    <option value="singolo">Singolo locale</option>
                    <option value="multipli">Più locali (costo per ognuno)</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {formData.assegnazione === 'tutti' ? 'Il costo verrà diviso equamente tra tutti i locali' : 
                     formData.assegnazione === 'singolo' ? 'Il costo verrà assegnato solo al locale selezionato' :
                     'Ogni locale selezionato pagherà il costo completo'}
                  </p>
                </div>
                {formData.assegnazione === 'singolo' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Locale</label>
                    <select
                      value={formData.store_id || ''}
                      onChange={(e) => {
                        const store = stores.find(s => s.id === e.target.value);
                        setFormData({ ...formData, store_id: e.target.value, store_name: store?.name });
                      }}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    >
                      <option value="">Seleziona locale</option>
                      {stores.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {formData.assegnazione === 'multipli' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Locali</label>
                    <div className="neumorphic-pressed p-4 rounded-xl space-y-2 max-h-48 overflow-y-auto">
                      {stores.map(store => (
                        <label key={store.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={(formData.stores_ids || []).includes(store.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  stores_ids: [...(formData.stores_ids || []), store.id],
                                  stores_names: [...(formData.stores_names || []), store.name]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  stores_ids: (formData.stores_ids || []).filter(id => id !== store.id),
                                  stores_names: (formData.stores_names || []).filter(n => n !== store.name)
                                });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-slate-700">{store.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
                  <textarea
                    value={formData.note || ''}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    rows={2}
                  />
                </div>
                <NeumorphicButton onClick={handleSave} variant="primary" className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Salva
                </NeumorphicButton>
              </div>
            )}

            <div className="space-y-3">
              {budgetAds.map(item => (
                <div key={item.id} className="neumorphic-flat p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-slate-800">{item.piattaforma}</p>
                      {item.assegnazione === 'tutti' ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Tutti i locali
                        </span>
                      ) : (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          {item.store_name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      {formatEuro(item.budget_mensile)}/mese
                      {item.assegnazione === 'tutti' && <span className="text-blue-600 ml-1">(÷{stores.length} locali)</span>}
                    </p>
                    {item.note && <p className="text-xs text-slate-500 mt-1">{item.note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete('BudgetMarketing', item.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </NeumorphicCard>
        )}
      </div>
    </ProtectedPage>
  );
}