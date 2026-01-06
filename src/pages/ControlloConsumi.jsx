import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import { Package, TrendingUp, TrendingDown, Truck, AlertTriangle } from "lucide-react";
import { format, parseISO, startOfDay } from "date-fns";

export default function ControlloConsumi() {
  const [selectedStore, setSelectedStore] = useState("all");
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

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

  const filteredOrdini = ordini.filter(o => {
    const matchStore = selectedStore === "all" || o.store_id === selectedStore;
    if (!o.data_completamento) return false;
    const dataCompl = o.data_completamento.split('T')[0];
    const matchDate = dataCompl >= startDate && dataCompl <= endDate;
    return matchStore && matchDate;
  });

  // Calcola consumi teorici giornalieri
  const consumiTeoriciPerGiorno = {};
  
  filteredVendite.forEach(vendita => {
    const ricetta = ricette.find(r => r.nome_prodotto === vendita.flavor);
    if (!ricetta || !ricetta.ingredienti) return;

    const qty = vendita.total_pizzas_sold || 0;
    const date = vendita.data_vendita;

    if (!consumiTeoriciPerGiorno[date]) {
      consumiTeoriciPerGiorno[date] = {};
    }

    ricetta.ingredienti.forEach(ing => {
      const key = ing.materia_prima_id || ing.nome_prodotto;
      if (!consumiTeoriciPerGiorno[date][key]) {
        consumiTeoriciPerGiorno[date][key] = {
          nome: ing.nome_prodotto,
          quantita: 0,
          unita_misura: ing.unita_misura
        };
      }
      consumiTeoriciPerGiorno[date][key].quantita += (ing.quantita * qty);
    });
  });

  // Calcola consumi effettivi giornalieri (differenza tra inventari consecutivi)
  const consumiEffettiviPerGiorno = {};
  
  const inventariPerProdotto = {};
  filteredInventari.forEach(inv => {
    const key = inv.prodotto_id;
    if (!inventariPerProdotto[key]) {
      inventariPerProdotto[key] = [];
    }
    inventariPerProdotto[key].push(inv);
  });

  Object.keys(inventariPerProdotto).forEach(prodottoId => {
    const invs = inventariPerProdotto[prodottoId].sort((a, b) => 
      new Date(a.data_rilevazione) - new Date(b.data_rilevazione)
    );

    for (let i = 1; i < invs.length; i++) {
      const prev = invs[i - 1];
      const curr = invs[i];
      const date = curr.data_rilevazione.split('T')[0];
      
      const consumo = prev.quantita_rilevata - curr.quantita_rilevata;
      
      if (!consumiEffettiviPerGiorno[date]) {
        consumiEffettiviPerGiorno[date] = {};
      }

      if (!consumiEffettiviPerGiorno[date][prodottoId]) {
        consumiEffettiviPerGiorno[date][prodottoId] = {
          nome: curr.nome_prodotto,
          quantita: 0,
          unita_misura: curr.unita_misura
        };
      }

      consumiEffettiviPerGiorno[date][prodottoId].quantita += consumo;
    }
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

  // Combina tutte le date
  const allDates = new Set([
    ...Object.keys(consumiTeoriciPerGiorno),
    ...Object.keys(consumiEffettiviPerGiorno),
    ...Object.keys(ordiniPerGiorno)
  ]);

  const datesSorted = Array.from(allDates).sort().reverse();

  // Calcola statistiche aggregate
  const stats = {
    giorniAnalizzati: datesSorted.length,
    consumoTeoricoTotale: 0,
    consumoEffettivoTotale: 0,
    ordiniTotali: 0,
    deltaTotale: 0
  };

  datesSorted.forEach(date => {
    const teorici = consumiTeoriciPerGiorno[date] || {};
    const effettivi = consumiEffettiviPerGiorno[date] || {};
    const ordini = ordiniPerGiorno[date] || {};

    Object.keys(teorici).forEach(key => {
      stats.consumoTeoricoTotale += teorici[key]?.quantita || 0;
    });

    Object.keys(effettivi).forEach(key => {
      stats.consumoEffettivoTotale += effettivi[key]?.quantita || 0;
    });

    Object.keys(ordini).forEach(key => {
      stats.ordiniTotali += ordini[key]?.quantita || 0;
    });
  });

  stats.deltaTotale = stats.consumoTeoricoTotale - stats.consumoEffettivoTotale;

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="neumorphic-flat p-3 rounded-xl bg-green-100">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Consumo Teorico</p>
                <p className="text-2xl font-bold text-slate-700">{stats.consumoTeoricoTotale.toFixed(1)}</p>
              </div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="neumorphic-flat p-3 rounded-xl bg-orange-100">
                <TrendingDown className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Consumo Effettivo</p>
                <p className="text-2xl font-bold text-slate-700">{stats.consumoEffettivoTotale.toFixed(1)}</p>
              </div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3">
              <div className={`neumorphic-flat p-3 rounded-xl ${stats.deltaTotale > 0 ? 'bg-red-100' : 'bg-blue-100'}`}>
                <AlertTriangle className={`w-6 h-6 ${stats.deltaTotale > 0 ? 'text-red-600' : 'text-blue-600'}`} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Delta</p>
                <p className={`text-2xl font-bold ${stats.deltaTotale > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                  {stats.deltaTotale > 0 ? '+' : ''}{stats.deltaTotale.toFixed(1)}
                </p>
              </div>
            </div>
          </NeumorphicCard>
        </div>

        {/* Tabella dati giornalieri */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-700 mb-4">Dettaglio Giornaliero</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Data</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Tipo</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Prodotto</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Quantità</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">UM</th>
                </tr>
              </thead>
              <tbody>
                {datesSorted.map(date => {
                  const teorici = consumiTeoriciPerGiorno[date] || {};
                  const effettivi = consumiEffettiviPerGiorno[date] || {};
                  const ordiniData = ordiniPerGiorno[date] || {};

                  // Ottieni tutti i prodotti per questa data
                  const allProducts = new Set([
                    ...Object.keys(teorici),
                    ...Object.keys(effettivi),
                    ...Object.keys(ordiniData)
                  ]);

                  return Array.from(allProducts).map((prodKey, idx) => {
                    const prodTeorico = teorici[prodKey];
                    const prodEffettivo = effettivi[prodKey];
                    const prodOrdini = ordiniData[prodKey];

                    const qtyTeorico = prodTeorico?.quantita || 0;
                    const qtyEffettivo = prodEffettivo?.quantita || 0;
                    const qtyOrdini = prodOrdini?.quantita || 0;
                    const delta = qtyTeorico - qtyEffettivo;

                    const nome = prodTeorico?.nome || prodEffettivo?.nome || prodOrdini?.nome || 'N/A';
                    const um = prodTeorico?.unita_misura || prodEffettivo?.unita_misura || prodOrdini?.unita_misura || '';

                    return (
                      <React.Fragment key={`${date}-${prodKey}`}>
                        {/* Riga Consumo Teorico */}
                        {qtyTeorico > 0 && (
                          <tr className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-2 px-4 text-sm text-slate-600">{format(parseISO(date), 'dd/MM/yyyy')}</td>
                            <td className="py-2 px-4">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                <TrendingUp className="w-3 h-3" />
                                Teorico
                              </span>
                            </td>
                            <td className="py-2 px-4 text-sm text-slate-700 font-medium">{nome}</td>
                            <td className="py-2 px-4 text-sm text-slate-700 text-right">{qtyTeorico.toFixed(2)}</td>
                            <td className="py-2 px-4 text-sm text-slate-500">{um}</td>
                          </tr>
                        )}

                        {/* Riga Consumo Effettivo */}
                        {qtyEffettivo > 0 && (
                          <tr className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-2 px-4 text-sm text-slate-600"></td>
                            <td className="py-2 px-4">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
                                <TrendingDown className="w-3 h-3" />
                                Effettivo
                              </span>
                            </td>
                            <td className="py-2 px-4 text-sm text-slate-700">{nome}</td>
                            <td className="py-2 px-4 text-sm text-slate-700 text-right">{qtyEffettivo.toFixed(2)}</td>
                            <td className="py-2 px-4 text-sm text-slate-500">{um}</td>
                          </tr>
                        )}

                        {/* Riga Ordini */}
                        {qtyOrdini > 0 && (
                          <tr className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-2 px-4 text-sm text-slate-600"></td>
                            <td className="py-2 px-4">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                                <Truck className="w-3 h-3" />
                                Ordini
                              </span>
                            </td>
                            <td className="py-2 px-4 text-sm text-slate-700">{nome}</td>
                            <td className="py-2 px-4 text-sm text-slate-700 text-right">{qtyOrdini.toFixed(2)}</td>
                            <td className="py-2 px-4 text-sm text-slate-500">{um}</td>
                          </tr>
                        )}

                        {/* Riga Delta */}
                        {(qtyTeorico > 0 || qtyEffettivo > 0) && (
                          <tr className="border-b-2 border-slate-300 hover:bg-slate-50">
                            <td className="py-2 px-4 text-sm text-slate-600"></td>
                            <td className="py-2 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                                delta > 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                <AlertTriangle className="w-3 h-3" />
                                Delta
                              </span>
                            </td>
                            <td className="py-2 px-4 text-sm text-slate-700 font-medium">{nome}</td>
                            <td className={`py-2 px-4 text-sm text-right font-bold ${
                              delta > 0 ? 'text-red-600' : 'text-blue-600'
                            }`}>
                              {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                            </td>
                            <td className="py-2 px-4 text-sm text-slate-500">{um}</td>
                          </tr>
                        )}
                      </React.Fragment>
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
      </div>
    </ProtectedPage>
  );
}