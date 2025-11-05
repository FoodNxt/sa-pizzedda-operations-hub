import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Calendar, DollarSign, TrendingUp, Play, RefreshCw, Database, CheckCircle, AlertCircle } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { format, subDays } from 'date-fns';
import { it } from 'date-fns/locale';

export default function DailyRevenueAggregation() {
  const [selectedDate, setSelectedDate] = useState(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
  const [isAggregating, setIsAggregating] = useState(false);
  const [aggregationResult, setAggregationResult] = useState(null);

  const { data: dailyRevenues = [], refetch: refetchRevenues } = useQuery({
    queryKey: ['dailyRevenues'],
    queryFn: () => base44.entities.DailyStoreRevenue.list('-date', 100),
  });

  const handleAggregate = async () => {
    setIsAggregating(true);
    setAggregationResult(null);

    try {
      const response = await base44.functions.invoke('aggregateDailyStoreRevenue', {
        date: selectedDate
      });

      setAggregationResult(response.data);
      await refetchRevenues();
    } catch (error) {
      console.error('Error aggregating:', error);
      setAggregationResult({
        success: false,
        error: error.message || 'Errore durante aggregazione'
      });
    }

    setIsAggregating(false);
  };

  const getBreakdownTotal = (breakdown, field) => {
    if (!breakdown) return 0;
    return Object.values(breakdown).reduce((sum, item) => sum + (item[field] || 0), 0);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Database className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Aggregazione Revenue Giornaliera</h1>
        </div>
        <p className="text-[#9b9b9b]">Aggrega i dati di OrderItem per store e per giorno</p>
      </div>

      {/* Aggregation Control */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Play className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-lg font-bold text-[#6b6b6b]">Esegui Aggregazione</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[#9b9b9b] mb-2 block">Data da Aggregare</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            />
            <p className="text-xs text-[#9b9b9b] mt-2">
              💡 Suggerimento: aggregare i dati del giorno precedente
            </p>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleAggregate}
              disabled={isAggregating || !selectedDate}
              className={`w-full neumorphic-flat px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                !isAggregating && selectedDate
                  ? 'text-[#8b7355] hover:shadow-lg'
                  : 'text-[#9b9b9b] opacity-50 cursor-not-allowed'
              }`}
            >
              {isAggregating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Aggregazione in corso...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Avvia Aggregazione
                </>
              )}
            </button>
          </div>
        </div>

        {/* Aggregation Result */}
        {aggregationResult && (
          <div className={`mt-6 p-4 rounded-xl ${
            aggregationResult.success 
              ? 'neumorphic-pressed bg-green-50 border-2 border-green-200' 
              : 'neumorphic-pressed bg-red-50 border-2 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {aggregationResult.success ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              )}
              <div className="flex-1">
                <h3 className={`font-bold mb-2 ${
                  aggregationResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {aggregationResult.success ? '✅ Aggregazione completata!' : '❌ Errore aggregazione'}
                </h3>
                
                {aggregationResult.success ? (
                  <div className="text-sm text-green-800 space-y-1">
                    <p>📅 Data: <strong>{aggregationResult.date}</strong></p>
                    <p>🏪 Store processati: <strong>{aggregationResult.stores_processed}</strong></p>
                    <p>📦 Item processati: <strong>{aggregationResult.total_items_processed}</strong></p>
                    
                    {aggregationResult.results && aggregationResult.results.length > 0 && (
                      <div className="mt-3">
                        <p className="font-medium mb-2">Dettagli per store:</p>
                        <div className="space-y-2">
                          {aggregationResult.results.map((result, index) => (
                            <div key={index} className="neumorphic-flat p-3 rounded-lg bg-white">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-[#6b6b6b]">{result.store_name}</span>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  result.action === 'created' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {result.action === 'created' ? 'Creato' : 'Aggiornato'}
                                </span>
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#6b6b6b]">
                                <div>
                                  <span className="text-[#9b9b9b]">Revenue: </span>
                                  <strong>€{result.total_finalPriceWithSessionDiscountsAndSurcharges?.toFixed(2)}</strong>
                                </div>
                                <div>
                                  <span className="text-[#9b9b9b]">Ordini: </span>
                                  <strong>{result.total_orders}</strong>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-red-800">
                    {aggregationResult.error || 'Errore sconosciuto'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </NeumorphicCard>

      {/* Recent Aggregations */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-6 h-6 text-[#8b7355]" />
          <h2 className="text-xl font-bold text-[#6b6b6b]">Dati Aggregati Recenti</h2>
        </div>

        {dailyRevenues.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#8b7355]">
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Data</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Store</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Revenue Totale</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Ordini</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Items</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Scontrino Medio</th>
                </tr>
              </thead>
              <tbody>
                {dailyRevenues.map((revenue, index) => {
                  const avgOrderValue = revenue.total_orders > 0 
                    ? revenue.total_finalPriceWithSessionDiscountsAndSurcharges / revenue.total_orders 
                    : 0;
                  
                  return (
                    <tr key={index} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                      <td className="p-3 text-[#6b6b6b]">
                        {format(new Date(revenue.date), 'dd MMM yyyy', { locale: it })}
                      </td>
                      <td className="p-3 text-[#6b6b6b] font-medium">{revenue.store_name}</td>
                      <td className="p-3 text-right text-[#6b6b6b] font-bold">
                        €{revenue.total_finalPriceWithSessionDiscountsAndSurcharges?.toFixed(2)}
                      </td>
                      <td className="p-3 text-right text-[#6b6b6b]">
                        {revenue.total_orders}
                      </td>
                      <td className="p-3 text-right text-[#6b6b6b]">
                        {revenue.total_items}
                      </td>
                      <td className="p-3 text-right text-[#6b6b6b]">
                        €{avgOrderValue.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-[#9b9b9b]">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nessun dato aggregato ancora</p>
            <p className="text-sm mt-2">Esegui la prima aggregazione per vedere i risultati</p>
          </div>
        )}
      </NeumorphicCard>

      {/* Sample Breakdown */}
      {dailyRevenues.length > 0 && dailyRevenues[0].breakdown_by_sourceApp && (
        <NeumorphicCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="w-6 h-6 text-[#8b7355]" />
            <h2 className="text-xl font-bold text-[#6b6b6b]">
              Esempio Breakdown - {dailyRevenues[0].store_name} ({format(new Date(dailyRevenues[0].date), 'dd MMM yyyy', { locale: it })})
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Source App Breakdown */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-[#6b6b6b] mb-3">Per App di Provenienza</h3>
              <div className="space-y-2">
                {Object.entries(dailyRevenues[0].breakdown_by_sourceApp || {}).map(([app, data]) => (
                  <div key={app} className="flex justify-between items-center text-sm">
                    <span className="text-[#6b6b6b] font-medium">{app}</span>
                    <span className="text-[#8b7355] font-bold">
                      €{data.finalPriceWithSessionDiscountsAndSurcharges?.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sale Type Breakdown */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-[#6b6b6b] mb-3">Per Tipo Vendita</h3>
              <div className="space-y-2">
                {Object.entries(dailyRevenues[0].breakdown_by_saleTypeName || {}).map(([type, data]) => (
                  <div key={type} className="flex justify-between items-center text-sm">
                    <span className="text-[#6b6b6b] font-medium">{type}</span>
                    <span className="text-[#8b7355] font-bold">
                      €{data.finalPriceWithSessionDiscountsAndSurcharges?.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Money Type Breakdown */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-[#6b6b6b] mb-3">Per Tipo Pagamento</h3>
              <div className="space-y-2">
                {Object.entries(dailyRevenues[0].breakdown_by_moneyTypeName || {}).map(([type, data]) => (
                  <div key={type} className="flex justify-between items-center text-sm">
                    <span className="text-[#6b6b6b] font-medium">{type}</span>
                    <span className="text-[#8b7355] font-bold">
                      €{data.finalPriceWithSessionDiscountsAndSurcharges?.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Source Type Breakdown */}
            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-[#6b6b6b] mb-3">Per Source Type</h3>
              <div className="space-y-2">
                {Object.entries(dailyRevenues[0].breakdown_by_sourceType || {}).map(([type, data]) => (
                  <div key={type} className="flex justify-between items-center text-sm">
                    <span className="text-[#6b6b6b] font-medium">{type}</span>
                    <span className="text-[#8b7355] font-bold">
                      €{data.finalPriceWithSessionDiscountsAndSurcharges?.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </NeumorphicCard>
      )}

      {/* Info */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-[#8b7355]" />
          <h3 className="text-lg font-bold text-[#6b6b6b]">Come Funziona</h3>
        </div>
        <div className="neumorphic-pressed p-4 rounded-xl space-y-2 text-sm text-[#6b6b6b]">
          <p>📊 Questa funzione aggrega tutti i dati di <strong>OrderItem</strong> per giorno e per store</p>
          <p>🔄 Se un record esiste già per quella data e store, viene <strong>aggiornato</strong></p>
          <p>📈 Calcola automaticamente i breakdown per:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li><strong>sourceApp</strong> - App di provenienza ordine</li>
            <li><strong>sourceType</strong> - Tipo di sorgente</li>
            <li><strong>moneyTypeName</strong> - Metodo di pagamento</li>
            <li><strong>saleTypeName</strong> - Tipo di vendita (asporto, delivery, etc)</li>
          </ul>
          <p>💡 <strong>Suggerimento:</strong> Esegui l'aggregazione ogni giorno per il giorno precedente per mantenere i dati aggiornati</p>
          <p>⚡ Puoi anche automatizzare questo processo tramite Zapier o uno scheduler</p>
        </div>
      </NeumorphicCard>
    </div>
  );
}