import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Calendar, DollarSign, TrendingUp, Play, RefreshCw, Database, CheckCircle, AlertCircle, CalendarRange } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { format, subDays, eachDayOfInterval, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

export default function DailyRevenueAggregation() {
  const [selectedDate, setSelectedDate] = useState(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [aggregationMode, setAggregationMode] = useState('single'); // 'single' or 'range'
  const [isAggregating, setIsAggregating] = useState(false);
  const [aggregationResult, setAggregationResult] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const { data: dailyRevenues = [], refetch: refetchRevenues } = useQuery({
    queryKey: ['dailyRevenues'],
    queryFn: () => base44.entities.DailyStoreRevenue.list('-date', 100),
  });

  const handleAggregateSingle = async () => {
    setIsAggregating(true);
    setAggregationResult(null);
    setProgress({ current: 0, total: 1 });

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

  const handleAggregateRange = async () => {
    if (!startDate || !endDate) {
      setAggregationResult({
        success: false,
        error: 'Seleziona sia data inizio che data fine'
      });
      return;
    }

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    if (start > end) {
      setAggregationResult({
        success: false,
        error: 'La data di inizio deve essere precedente alla data di fine'
      });
      return;
    }

    setIsAggregating(true);
    setAggregationResult(null);

    // Get all days in range
    const daysToAggregate = eachDayOfInterval({ start, end });
    setProgress({ current: 0, total: daysToAggregate.length });

    const allResults = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < daysToAggregate.length; i++) {
        const day = daysToAggregate[i];
        const dateStr = format(day, 'yyyy-MM-dd');
        
        setProgress({ current: i + 1, total: daysToAggregate.length });

        try {
          const response = await base44.functions.invoke('aggregateDailyStoreRevenue', {
            date: dateStr
          });

          if (response.data.success) {
            successCount++;
            allResults.push({
              date: dateStr,
              success: true,
              stores: response.data.stores_processed
            });
          } else {
            errorCount++;
            allResults.push({
              date: dateStr,
              success: false,
              error: response.data.error
            });
          }
        } catch (error) {
          errorCount++;
          allResults.push({
            date: dateStr,
            success: false,
            error: error.message
          });
        }
      }

      setAggregationResult({
        success: true,
        isRange: true,
        totalDays: daysToAggregate.length,
        successCount,
        errorCount,
        results: allResults
      });

      await refetchRevenues();
    } catch (error) {
      setAggregationResult({
        success: false,
        error: 'Errore durante aggregazione range: ' + error.message
      });
    }

    setIsAggregating(false);
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

      {/* Mode Selector */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <CalendarRange className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-lg font-bold text-[#6b6b6b]">Modalità Aggregazione</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setAggregationMode('single')}
            className={`p-6 rounded-xl transition-all ${
              aggregationMode === 'single'
                ? 'neumorphic-pressed border-2 border-[#8b7355]'
                : 'neumorphic-flat hover:shadow-lg'
            }`}
          >
            <Calendar className={`w-8 h-8 mb-3 mx-auto ${
              aggregationMode === 'single' ? 'text-[#8b7355]' : 'text-[#9b9b9b]'
            }`} />
            <h3 className={`font-bold text-lg mb-2 ${
              aggregationMode === 'single' ? 'text-[#6b6b6b]' : 'text-[#9b9b9b]'
            }`}>
              Singola Data
            </h3>
            <p className="text-sm text-[#9b9b9b]">
              Aggrega i dati di un singolo giorno
            </p>
          </button>

          <button
            onClick={() => setAggregationMode('range')}
            className={`p-6 rounded-xl transition-all ${
              aggregationMode === 'range'
                ? 'neumorphic-pressed border-2 border-[#8b7355]'
                : 'neumorphic-flat hover:shadow-lg'
            }`}
          >
            <CalendarRange className={`w-8 h-8 mb-3 mx-auto ${
              aggregationMode === 'range' ? 'text-[#8b7355]' : 'text-[#9b9b9b]'
            }`} />
            <h3 className={`font-bold text-lg mb-2 ${
              aggregationMode === 'range' ? 'text-[#6b6b6b]' : 'text-[#9b9b9b]'
            }`}>
              Range di Date
            </h3>
            <p className="text-sm text-[#9b9b9b]">
              Aggrega più giorni consecutivi
            </p>
          </button>
        </div>
      </NeumorphicCard>

      {/* Aggregation Control - Single Date */}
      {aggregationMode === 'single' && (
        <NeumorphicCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Play className="w-5 h-5 text-[#8b7355]" />
            <h2 className="text-lg font-bold text-[#6b6b6b]">Aggregazione Singola Data</h2>
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
                onClick={handleAggregateSingle}
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
        </NeumorphicCard>
      )}

      {/* Aggregation Control - Date Range */}
      {aggregationMode === 'range' && (
        <NeumorphicCard className="p-6 border-2 border-[#8b7355]">
          <div className="flex items-center gap-3 mb-4">
            <CalendarRange className="w-5 h-5 text-[#8b7355]" />
            <h2 className="text-lg font-bold text-[#6b6b6b]">Aggregazione Range Date</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-[#9b9b9b] mb-2 block">Data Inizio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-[#9b9b9b] mb-2 block">Data Fine</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleAggregateRange}
                disabled={isAggregating || !startDate || !endDate}
                className={`w-full neumorphic-flat px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  !isAggregating && startDate && endDate
                    ? 'text-[#8b7355] hover:shadow-lg'
                    : 'text-[#9b9b9b] opacity-50 cursor-not-allowed'
                }`}
              >
                {isAggregating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    {progress.current}/{progress.total} giorni
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Avvia Aggregazione Range
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="neumorphic-pressed p-4 rounded-xl mt-4 bg-blue-50">
            <p className="text-sm text-blue-800">
              ⚡ <strong>Attenzione:</strong> L'aggregazione di un range può richiedere diversi minuti.
              Ogni giorno viene elaborato separatamente per garantire accuratezza.
            </p>
          </div>
        </NeumorphicCard>
      )}

      {/* Progress Bar */}
      {isAggregating && aggregationMode === 'range' && progress.total > 0 && (
        <NeumorphicCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <RefreshCw className="w-5 h-5 text-[#8b7355] animate-spin" />
            <h2 className="text-lg font-bold text-[#6b6b6b]">
              Progresso: {progress.current} di {progress.total} giorni
            </h2>
          </div>
          
          <div className="w-full bg-white rounded-full h-4 neumorphic-pressed overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#8b7355] to-[#c1a07f] rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          
          <p className="text-center text-sm text-[#9b9b9b] mt-3">
            {Math.round((progress.current / progress.total) * 100)}% completato
          </p>
        </NeumorphicCard>
      )}

      {/* Aggregation Result */}
      {aggregationResult && (
        <div className={`p-4 rounded-xl ${
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
                  {aggregationResult.isRange ? (
                    <>
                      <p>📅 Range: <strong>{startDate}</strong> → <strong>{endDate}</strong></p>
                      <p>📊 Giorni totali: <strong>{aggregationResult.totalDays}</strong></p>
                      <p>✅ Successi: <strong>{aggregationResult.successCount}</strong></p>
                      {aggregationResult.errorCount > 0 && (
                        <p className="text-red-600">❌ Errori: <strong>{aggregationResult.errorCount}</strong></p>
                      )}
                      
                      {aggregationResult.results && aggregationResult.results.length > 0 && (
                        <div className="mt-3 max-h-60 overflow-y-auto">
                          <p className="font-medium mb-2">Dettagli per giorno:</p>
                          <div className="space-y-2">
                            {aggregationResult.results.map((result, index) => (
                              <div key={index} className={`neumorphic-flat p-3 rounded-lg ${
                                result.success ? 'bg-white' : 'bg-red-50'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-[#6b6b6b]">
                                    {format(parseISO(result.date), 'dd MMM yyyy', { locale: it })}
                                  </span>
                                  {result.success ? (
                                    <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                                      {result.stores} store processati
                                    </span>
                                  ) : (
                                    <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                                      Errore
                                    </span>
                                  )}
                                </div>
                                {!result.success && result.error && (
                                  <p className="text-xs text-red-600 mt-1">{result.error}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
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
                    </>
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
          <div className="border-t border-[#c1c1c1] pt-3 mt-3">
            <p className="font-bold text-[#8b7355] mb-2">✨ Novità: Aggregazione Range</p>
            <p>Ora puoi aggregare più giorni in una volta sola! Utile per:</p>
            <ul className="ml-6 list-disc space-y-1 mt-2">
              <li>Popolare dati storici</li>
              <li>Recuperare periodi mancanti</li>
              <li>Aggiornare settimane o mesi interi</li>
            </ul>
          </div>
          <p className="pt-3 mt-3 border-t border-[#c1c1c1]">💡 <strong>Suggerimento:</strong> Esegui l'aggregazione ogni giorno per il giorno precedente per mantenere i dati aggiornati</p>
          <p>⚡ Puoi anche automatizzare questo processo tramite Zapier o uno scheduler</p>
        </div>
      </NeumorphicCard>
    </div>
  );
}