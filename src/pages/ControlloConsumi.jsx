import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { Package, TrendingUp, TrendingDown, Truck, AlertTriangle, Settings, X } from "lucide-react";
import { format, parseISO, startOfDay, subDays } from "date-fns";

export default function ControlloConsumi() {
  const queryClient = useQueryClient();
  const [selectedStore, setSelectedStore] = useState("all");
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showSettings, setShowSettings] = useState(false);
  const [selectedProductTypes, setSelectedProductTypes] = useState({
    materie_prime: true,
    semilavorati: true,
    prodotti_finiti: true
  });

  // Fetch data
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: prodottiVenduti = [] } = useQuery({
    queryKey: ['prodotti-venduti'],
    queryFn: () => base44.entities.ProdottiVenduti.list()
  });

  const { data: ricette = [] } = useQuery({
    queryKey: ['ricette'],
    queryFn: () => base44.entities.Ricetta.list()
  });

  const { data: inventari = [] } = useQuery({
    queryKey: ['inventari'],
    queryFn: () => base44.entities.RilevazioneInventario.list()
  });

  const { data: ordini = [] } = useQuery({
    queryKey: ['ordini'],
    queryFn: () => base44.entities.OrdineFornitore.list()
  });

  const { data: materiePrime = [] } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list()
  });

  // Helper: determina il tipo di prodotto
  const getProductType = (prodottoId, nomeProdotto) => {
    // Cerca in materie prime
    const mp = materiePrime.find(m => m.id === prodottoId || m.nome_prodotto === nomeProdotto);
    if (mp) return 'materie_prime';

    // Cerca in ricette
    const ricetta = ricette.find(r => r.id === prodottoId || r.nome_prodotto === nomeProdotto);
    if (ricetta) {
      if (ricetta.is_semilavorato) return 'semilavorati';
      return 'prodotti_finiti';
    }

    // Default: materie prime
    return 'materie_prime';
  };

  // Filtra per store e date
  const filteredVendite = prodottiVenduti.filter(v => {
    const matchStore = selectedStore === "all" || v.store_id === selectedStore;
    const matchDate = v.data_vendita >= startDate && v.data_vendita <= endDate;
    return matchStore && matchDate;
  });

  const filteredInventari = inventari.filter(i => {
    const matchStore = selectedStore === "all" || i.store_id === selectedStore;
    const dataRil = i.data_rilevazione.split('T')[0];
    const matchDate = dataRil >= startDate && dataRil <= endDate;
    return matchStore && matchDate;
  });

  // Includi anche inventari del giorno precedente al periodo (per quantità iniziale)
  const allInventari = inventari.filter(i => {
    const matchStore = selectedStore === "all" || i.store_id === selectedStore;
    const dataRil = i.data_rilevazione.split('T')[0];
    const dayBeforeStart = format(subDays(parseISO(startDate), 1), 'yyyy-MM-dd');
    const matchDate = dataRil >= dayBeforeStart && dataRil <= endDate;
    return matchStore && matchDate;
  });

  const filteredOrdini = ordini.filter(o => {
    const matchStore = selectedStore === "all" || o.store_id === selectedStore;
    if (!o.data_completamento) return false;
    const dataCompl = o.data_completamento.split('T')[0];
    const matchDate = dataCompl >= startDate && dataCompl <= endDate;
    return matchStore && matchDate;
  });

  // Organizza inventari per prodotto e data
  const inventariPerProdotto = {};
  allInventari.forEach(inv => {
    const key = inv.prodotto_id;
    if (!inventariPerProdotto[key]) {
      inventariPerProdotto[key] = [];
    }
    inventariPerProdotto[key].push(inv);
  });

  // Ordina per data
  Object.keys(inventariPerProdotto).forEach(prodottoId => {
    inventariPerProdotto[prodottoId].sort((a, b) => 
      new Date(a.data_rilevazione) - new Date(b.data_rilevazione)
    );
  });

  // Calcola quantità vendute per giorno e prodotto (da prodotti venduti)
  const quantitaVendutePerGiorno = {};
  filteredVendite.forEach(vendita => {
    const ricetta = ricette.find(r => r.nome_prodotto === vendita.flavor);
    if (!ricetta || !ricetta.ingredienti) return;

    const qty = vendita.total_pizzas_sold || 0;
    const date = vendita.data_vendita;

    if (!quantitaVendutePerGiorno[date]) {
      quantitaVendutePerGiorno[date] = {};
    }

    ricetta.ingredienti.forEach(ing => {
      const key = ing.materia_prima_id || ing.nome_prodotto;
      if (!quantitaVendutePerGiorno[date][key]) {
        quantitaVendutePerGiorno[date][key] = {
          nome: ing.nome_prodotto,
          quantita: 0,
          unita_misura: ing.unita_misura
        };
      }
      quantitaVendutePerGiorno[date][key].quantita += (ing.quantita * qty);
    });
  });

  // Calcola ordini ricevuti per giorno
  const ordiniPerGiorno = {};
  filteredOrdini.forEach(ordine => {
    if (ordine.status !== 'completato' || !ordine.data_completamento) return;
    const date = ordine.data_completamento.split('T')[0];

    if (!ordiniPerGiorno[date]) {
      ordiniPerGiorno[date] = {};
    }

    ordine.prodotti.forEach(prod => {
      const key = prod.prodotto_id;
      if (!ordiniPerGiorno[date][key]) {
        ordiniPerGiorno[date][key] = {
          nome: prod.nome_prodotto,
          quantita: 0,
          unita_misura: prod.unita_misura
        };
      }
      ordiniPerGiorno[date][key].quantita += prod.quantita_ricevuta || 0;
    });
  });

  // Costruisci dati giornalieri per ogni prodotto
  const datiGiornalieriPerProdotto = {};

  // Itera su tutti gli inventari
  Object.keys(inventariPerProdotto).forEach(prodottoId => {
    const invs = inventariPerProdotto[prodottoId];
    
    invs.forEach((inv, idx) => {
      const date = inv.data_rilevazione.split('T')[0];
      
      // Salta se la data non è nel range selezionato
      if (date < startDate || date > endDate) return;

      // Applica filtro tipo prodotto
      const productType = getProductType(prodottoId, inv.nome_prodotto);
      if (!selectedProductTypes[productType]) return;

      if (!datiGiornalieriPerProdotto[date]) {
        datiGiornalieriPerProdotto[date] = {};
      }

      // Quantità iniziale: dall'inventario del giorno precedente
      const prevInv = idx > 0 ? invs[idx - 1] : null;
      const qtyIniziale = prevInv ? prevInv.quantita_rilevata : 0;

      // Quantità venduta
      const qtyVenduta = quantitaVendutePerGiorno[date]?.[prodottoId]?.quantita || 0;

      // Quantità arrivata con ordini
      const qtyArrivata = ordiniPerGiorno[date]?.[prodottoId]?.quantita || 0;

      // Quantità finale: dall'inventario del giorno stesso
      const qtyFinale = inv.quantita_rilevata;

      // Delta: Quantità finale - (Quantità iniziale - Quantità venduta + Quantità arrivata)
      const attesa = qtyIniziale - qtyVenduta + qtyArrivata;
      const delta = qtyFinale - attesa;

      datiGiornalieriPerProdotto[date][prodottoId] = {
        nome: inv.nome_prodotto,
        unita_misura: inv.unita_misura,
        qtyIniziale,
        qtyVenduta,
        qtyArrivata,
        qtyFinale,
        delta,
        productType
      };
    });
  });

  const datesSorted = Object.keys(datiGiornalieriPerProdotto).sort().reverse();

  // Calcola statistiche aggregate
  const stats = {
    giorniAnalizzati: datesSorted.length,
    prodottiMonitorati: 0,
    deltaPositivoTotale: 0,
    deltaNegativoTotale: 0
  };

  let prodottiSet = new Set();
  datesSorted.forEach(date => {
    const prodotti = datiGiornalieriPerProdotto[date] || {};
    Object.keys(prodotti).forEach(prodId => {
      prodottiSet.add(prodId);
      const delta = prodotti[prodId].delta;
      if (delta > 0) stats.deltaPositivoTotale += delta;
      if (delta < 0) stats.deltaNegativoTotale += Math.abs(delta);
    });
  });
  stats.prodottiMonitorati = prodottiSet.size;

  return (
    <ProtectedPage pageName="ControlloConsumi">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
            Controllo Consumi
          </h1>
          <p className="text-slate-500 mt-1">Confronto tra consumi teorici ed effettivi</p>
        </div>

        {/* Filtri */}
        <NeumorphicCard className="p-6">
          <div className="flex items-end gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Negozio
                </label>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-2 rounded-lg text-slate-700"
                >
                  <option value="all">Tutti i negozi</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Data Inizio
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-2 rounded-lg text-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Data Fine
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-2 rounded-lg text-slate-700"
                />
              </div>
            </div>
            <NeumorphicButton onClick={() => setShowSettings(true)} className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Impostazioni
            </NeumorphicButton>
          </div>
        </NeumorphicCard>

        {/* Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="neumorphic-flat p-3 rounded-xl">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Giorni Analizzati</p>
                <p className="text-2xl font-bold text-slate-700">{stats.giorniAnalizzati}</p>
              </div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="neumorphic-flat p-3 rounded-xl bg-blue-100">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Prodotti Monitorati</p>
                <p className="text-2xl font-bold text-slate-700">{stats.prodottiMonitorati}</p>
              </div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="neumorphic-flat p-3 rounded-xl bg-green-100">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Delta Positivo</p>
                <p className="text-2xl font-bold text-green-600">+{stats.deltaPositivoTotale.toFixed(1)}</p>
              </div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="neumorphic-flat p-3 rounded-xl bg-red-100">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Delta Negativo</p>
                <p className="text-2xl font-bold text-red-600">-{stats.deltaNegativoTotale.toFixed(1)}</p>
              </div>
            </div>
          </NeumorphicCard>
        </div>

        {/* Tabella dati giornalieri */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-700 mb-4">Dettaglio Giornaliero per Prodotto</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Data</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Prodotto</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Qty Iniziale</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Qty Venduta</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Qty Arrivata</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Qty Finale</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Delta</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">UM</th>
                </tr>
              </thead>
              <tbody>
                {datesSorted.map(date => {
                  const prodotti = datiGiornalieriPerProdotto[date] || {};
                  
                  return Object.keys(prodotti).map(prodId => {
                    const prod = prodotti[prodId];
                    const isDeltaPositive = prod.delta > 0;
                    const isDeltaNegative = prod.delta < 0;

                    return (
                      <tr key={`${date}-${prodId}`} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm text-slate-600">{format(parseISO(date), 'dd/MM/yyyy')}</td>
                        <td className="py-3 px-4 text-sm text-slate-700 font-medium">{prod.nome}</td>
                        <td className="py-3 px-4 text-sm text-slate-700 text-right">{prod.qtyIniziale.toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm text-orange-600 text-right font-medium">-{prod.qtyVenduta.toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm text-blue-600 text-right font-medium">+{prod.qtyArrivata.toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm text-slate-700 text-right font-bold">{prod.qtyFinale.toFixed(2)}</td>
                        <td className={`py-3 px-4 text-sm text-right font-bold ${
                          isDeltaPositive ? 'text-green-600' : isDeltaNegative ? 'text-red-600' : 'text-slate-600'
                        }`}>
                          {prod.delta > 0 ? '+' : ''}{prod.delta.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500">{prod.unita_misura}</td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>

          {datesSorted.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              Nessun dato disponibile per il periodo selezionato
            </div>
          )}
        </NeumorphicCard>

        {/* Modal Impostazioni */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <NeumorphicCard className="max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-700">Impostazioni Controllo Consumi</h3>
                <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-slate-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-600 mb-4">Seleziona i tipi di prodotti da monitorare:</p>

                <label className="flex items-center gap-3 p-3 neumorphic-pressed rounded-lg cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selectedProductTypes.materie_prime}
                    onChange={(e) => setSelectedProductTypes(prev => ({ ...prev, materie_prime: e.target.checked }))}
                    className="w-5 h-5 rounded"
                  />
                  <div>
                    <p className="font-medium text-slate-700">Materie Prime</p>
                    <p className="text-xs text-slate-500">Ingredienti base (farina, pomodoro, mozzarella, ecc.)</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 neumorphic-pressed rounded-lg cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selectedProductTypes.semilavorati}
                    onChange={(e) => setSelectedProductTypes(prev => ({ ...prev, semilavorati: e.target.checked }))}
                    className="w-5 h-5 rounded"
                  />
                  <div>
                    <p className="font-medium text-slate-700">Semilavorati</p>
                    <p className="text-xs text-slate-500">Prodotti intermedi (impasti, salse preparate, ecc.)</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 neumorphic-pressed rounded-lg cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selectedProductTypes.prodotti_finiti}
                    onChange={(e) => setSelectedProductTypes(prev => ({ ...prev, prodotti_finiti: e.target.checked }))}
                    className="w-5 h-5 rounded"
                  />
                  <div>
                    <p className="font-medium text-slate-700">Prodotti Finiti</p>
                    <p className="text-xs text-slate-500">Pizze e altri prodotti finali</p>
                  </div>
                </label>
              </div>

              <div className="mt-6 flex justify-end">
                <NeumorphicButton onClick={() => setShowSettings(false)} variant="primary">
                  Applica Filtri
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}