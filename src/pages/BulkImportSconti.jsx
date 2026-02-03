import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, TrendingDown } from 'lucide-react';

export default function BulkImportSconti() {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [storeMapping, setStoreMapping] = useState({});

  const { data: stores = [], isLoading: isLoadingStores } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  // Debug stores
  React.useEffect(() => {
    console.log('Stores caricati:', stores);
    if (stores.length > 0) {
      console.log('Primo store:', stores[0]);
      console.log('Nomi stores:', stores.map(s => s.name));
    }
  }, [stores]);

  // Debug: log stores
  React.useEffect(() => {
    console.log('Stores loaded:', stores);
  }, [stores]);

  const parseMutation = useMutation({
    mutationFn: async (file) => {
      setUploadStatus('parsing');
      
      // Parse CSV rispettando le virgolette
      const text = await file.text();
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length < 2) {
        throw new Error('Il file CSV è vuoto o non contiene dati');
      }
      
      // Funzione per parsare una riga CSV rispettando le virgolette
      const parseCSVLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };
      
      const headers = parseCSVLine(lines[0]);
      console.log('Headers trovati:', headers);
      
      // Verifica che le colonne principali esistano (total_discount_price non è più richiesta)
      const requiredColumns = ['order_date', 'channel'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      if (missingColumns.length > 0) {
        throw new Error(`Colonne mancanti: ${missingColumns.join(', ')}. Headers trovati: ${headers.join(', ')}`);
      }
      
      const scontiData = lines.slice(1).map((line, idx) => {
        const values = parseCSVLine(line);
        const row = {};
        
        headers.forEach((header, index) => {
          let value = values[index] || '';
          
          if (header === 'order_date' || header === 'channel') {
            row[header] = value;
          } else {
            // Converti numeri con formato italiano (virgola decimale) in formato inglese
            value = value.replace(',', '.');
            row[header] = parseFloat(value) || 0;
          }
        });
        
        // Debug prime 3 righe
        if (idx < 3) {
          console.log(`Riga ${idx + 1} parsata:`, row);
        }
        
        return row;
      });
      
      // Match stores and calculate total_discount_price
      const scontiWithStores = scontiData.map(sconto => {
        const matchedStore = stores.find(s => 
          s.name?.toLowerCase().trim() === sconto.channel?.toLowerCase().trim()
        );

        const sourceApp_glovo = parseFloat(sconto.sourceApp_glovo) || 0;
        const sourceApp_deliveroo = parseFloat(sconto.sourceApp_deliveroo) || 0;
        const sourceApp_justeat = parseFloat(sconto.sourceApp_justeat) || 0;
        const sourceApp_onlineordering = parseFloat(sconto.sourceApp_onlineordering) || 0;
        const sourceApp_ordertable = parseFloat(sconto.sourceApp_ordertable) || 0;
        const sourceApp_tabesto = parseFloat(sconto.sourceApp_tabesto) || 0;
        const sourceApp_deliverect = parseFloat(sconto.sourceApp_deliverect) || 0;
        const sourceApp_store = parseFloat(sconto.sourceApp_store) || 0;
        const sourceType_delivery = parseFloat(sconto.sourceType_delivery) || 0;
        const sourceType_takeaway = parseFloat(sconto.sourceType_takeaway) || 0;
        const sourceType_takeawayOnSite = parseFloat(sconto.sourceType_takeawayOnSite) || 0;
        const sourceType_store = parseFloat(sconto.sourceType_store) || 0;
        const moneyType_bancomat = parseFloat(sconto.moneyType_bancomat) || 0;
        const moneyType_cash = parseFloat(sconto.moneyType_cash) || 0;
        const moneyType_online = parseFloat(sconto.moneyType_online) || 0;
        const moneyType_satispay = parseFloat(sconto.moneyType_satispay) || 0;
        const moneyType_credit_card = parseFloat(sconto.moneyType_credit_card) || 0;
        const moneyType_fidelity_card_points = parseFloat(sconto.moneyType_fidelity_card_points) || 0;

        // Calculate total as sum of sourceApp only (sourceType and moneyType are alternative aggregations of the same total)
        const total_discount_price = sourceApp_glovo + sourceApp_deliveroo + sourceApp_justeat + 
                                      sourceApp_onlineordering + sourceApp_ordertable + sourceApp_tabesto + 
                                      sourceApp_deliverect + sourceApp_store;

        return {
          ...sconto,
          store_id: matchedStore?.id || null,
          store_name: matchedStore?.name || null,
          total_discount_price,
          sourceApp_glovo,
          sourceApp_deliveroo,
          sourceApp_justeat,
          sourceApp_onlineordering,
          sourceApp_ordertable,
          sourceApp_tabesto,
          sourceApp_deliverect,
          sourceApp_store,
          sourceType_delivery,
          sourceType_takeaway,
          sourceType_takeawayOnSite,
          sourceType_store,
          moneyType_bancomat,
          moneyType_cash,
          moneyType_online,
          moneyType_satispay,
          moneyType_credit_card,
          moneyType_fidelity_card_points
        };
      });
      
      return scontiWithStores;
    },
    onSuccess: (data) => {
      console.log('Dati parsati:', data);
      console.log('Primi 3 canali:', data.slice(0, 3).map(d => d.channel));
      
      setParsedData(data);
      setUploadStatus(null);
      
      // Initialize mapping
      const mapping = {};
      const uniqueChannels = [...new Set(data.map(s => s.channel))];
      console.log('Canali unici trovati:', uniqueChannels);
      
      uniqueChannels.forEach(channel => {
        const matched = data.find(s => s.channel === channel && s.store_id);
        mapping[channel] = matched?.store_id || '';
      });
      setStoreMapping(mapping);
    },
    onError: (error) => {
      setUploadStatus('error');
      setImportResults({ error: error.message });
      console.error('Parse error:', error);
    }
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      setUploadStatus('importing');

      // Apply manual mapping
      const finalData = parsedData.map(sconto => {
        const mappedStoreId = storeMapping[sconto.channel];
        const mappedStore = stores.find(s => s.id === mappedStoreId);

        return {
          ...sconto,
          store_id: mappedStoreId || null,
          store_name: mappedStore?.name || null
        };
      });
      
      await base44.entities.Sconto.bulkCreate(finalData);
      
      return {
        total: finalData.length,
        matched: finalData.filter(s => s.store_id).length,
        unmatched: finalData.filter(s => !s.store_id).length
      };
    },
    onSuccess: (results) => {
      setUploadStatus('success');
      setImportResults(results);
      setParsedData(null);
      setFile(null);
    },
    onError: (error) => {
      setUploadStatus('error');
      setImportResults({ error: error.message });
      console.error('Import error:', error);
    }
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadStatus(null);
      setImportResults(null);
      setParsedData(null);
    }
  };

  const handleParse = () => {
    if (file) {
      parseMutation.mutate(file);
    }
  };

  const handleImport = () => {
    importMutation.mutate();
  };

  const updateStoreMapping = (channel, storeId) => {
    setStoreMapping(prev => ({
      ...prev,
      [channel]: storeId
    }));
  };

  const getStatusMessage = () => {
    switch (uploadStatus) {
      case 'parsing': return 'Elaborazione CSV...';
      case 'importing': return 'Importazione dati...';
      case 'success': return 'Importazione completata!';
      case 'error': return 'Errore durante importazione';
      default: return null;
    }
  };

  const uniqueChannels = parsedData ? [...new Set(parsedData.map(s => s.channel))] : [];
  const unmatchedChannels = uniqueChannels.filter(channel => !storeMapping[channel]);

  return (
    <ProtectedPage pageName="BulkImportSconti">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Bulk Import Sconti</h1>
          <p className="text-slate-500">Carica dati storici degli sconti da file CSV</p>
        </div>

        <NeumorphicCard className="p-6">
          <div className="flex items-start gap-4 mb-6 bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500">
            <FileText className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-blue-900 mb-1">Formato File CSV</h3>
              <p className="text-sm text-blue-800 mb-2">
                Il file CSV deve contenere le seguenti colonne (header richiesto):
              </p>
              <div className="bg-white p-3 rounded-lg text-xs font-mono space-y-1">
                <p>order_date, channel, sourceApp_glovo, sourceApp_deliveroo,</p>
                <p>sourceApp_justeat, sourceApp_onlineordering, sourceApp_ordertable, sourceApp_tabesto,</p>
                <p>sourceApp_deliverect, sourceApp_store, sourceType_delivery, sourceType_takeaway,</p>
                <p>sourceType_takeawayOnSite, sourceType_store, moneyType_bancomat, moneyType_cash,</p>
                <p>moneyType_online, moneyType_satispay, moneyType_credit_card, moneyType_fidelity_card_points</p>
              </div>
              <div className="mt-3 text-xs text-blue-800">
                <p className="font-bold mb-1">Note:</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li><code>order_date</code>: formato YYYY-MM-DD</li>
                  <li><code>channel</code>: nome dello store (es. "Roma Centro")</li>
                  <li><code>sourceApp_*</code>: sconti in euro per app (la somma di tutti i sourceApp rappresenta il totale sconti del giorno)</li>
                  <li><code>sourceType_*</code>: sconti in euro per tipo (aggregazione alternativa dello stesso totale)</li>
                  <li><code>moneyType_*</code>: sconti in euro per metodo pagamento (aggregazione alternativa dello stesso totale)</li>
                  <li>Il <code>total_discount_price</code> viene calcolato automaticamente come somma dei soli sourceApp_*</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Seleziona File CSV
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-xl file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  cursor-pointer"
              />
            </div>

            {file && (
              <div className="neumorphic-pressed p-4 rounded-xl bg-slate-50">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
              </div>
            )}

            {uploadStatus && (
              <div className={`p-4 rounded-xl border-l-4 ${
                uploadStatus === 'success' ? 'bg-green-50 border-green-500' :
                uploadStatus === 'error' ? 'bg-red-50 border-red-500' :
                'bg-blue-50 border-blue-500'
              }`}>
                <div className="flex items-start gap-3">
                  {uploadStatus === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : uploadStatus === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      uploadStatus === 'success' ? 'text-green-800' :
                      uploadStatus === 'error' ? 'text-red-800' :
                      'text-blue-800'
                    }`}>
                      {getStatusMessage()}
                    </p>
                    {uploadStatus === 'error' && importResults?.error && (
                      <p className="text-xs text-red-700 mt-1">{importResults.error}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {importResults && (
              <div className="neumorphic-pressed p-4 rounded-xl bg-green-50">
                <h3 className="font-bold text-green-900 mb-3">Risultati Importazione</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{importResults.total}</p>
                    <p className="text-xs text-green-700">Totale Importati</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{importResults.matched}</p>
                    <p className="text-xs text-blue-700">Store Trovati</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{importResults.unmatched}</p>
                    <p className="text-xs text-orange-700">Store Non Trovati</p>
                  </div>
                </div>
              </div>
            )}

            {!parsedData ? (
              <NeumorphicButton
                onClick={handleParse}
                disabled={!file || parseMutation.isPending}
                variant="primary"
                className="w-full flex items-center justify-center gap-2"
              >
                {parseMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Elaborazione...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Analizza CSV
                  </>
                )}
              </NeumorphicButton>
            ) : (
              <NeumorphicButton
                onClick={handleImport}
                disabled={importMutation.isPending}
                variant="primary"
                className="w-full flex items-center justify-center gap-2"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Importazione in corso...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Conferma Importazione
                  </>
                )}
              </NeumorphicButton>
            )}
          </div>
        </NeumorphicCard>

        {parsedData && (
          <NeumorphicCard className="p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Verifica Matching Store</h2>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm font-medium text-blue-900 mb-3">
                📊 Trovati {uniqueChannels.length} canali unici nel CSV
              </p>
              <div className="text-xs text-blue-800 space-y-1 bg-white p-3 rounded-lg">
                <p className="font-bold">Canali nel CSV:</p>
                <p className="ml-3">{uniqueChannels.join(', ')}</p>
                <p className="font-bold mt-2">Store nel database ({stores.length}):</p>
                <p className="ml-3">{stores.length > 0 ? stores.map(s => s.name).join(', ') : 'NESSUNO STORE TROVATO'}</p>
              </div>
              {stores.length === 0 && (
                <p className="text-xs text-red-600 mt-2 font-bold">⚠️ ATTENZIONE: Nessuno store trovato nel database! Verifica che esistano store nell'entità Store.</p>
              )}
            </div>

            {unmatchedChannels.length > 0 && (
              <div className="mb-4 p-4 bg-orange-50 rounded-xl border-l-4 border-orange-500">
                <p className="text-sm font-medium text-orange-900 mb-3">
                  {unmatchedChannels.length} canali da mappare - seleziona lo store corrispondente:
                </p>
                <div className="space-y-3">
                  {unmatchedChannels.map(channel => (
                    <div key={channel} className="bg-white p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">Canale CSV: "{channel}"</p>
                          <p className="text-xs text-slate-500">
                            {parsedData.filter(s => s.channel === channel).length} righe nel file
                          </p>
                        </div>
                        <div className="w-64">
                          <select
                            value={storeMapping[channel] || ''}
                            onChange={(e) => updateStoreMapping(channel, e.target.value)}
                            className="w-full px-3 py-2 rounded-lg text-sm text-slate-700 bg-white border-2 border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">-- Seleziona store --</option>
                            {stores.map(store => (
                              <option key={store.id} value={store.id}>
                                {store.name}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-slate-600 mt-1">
                            {stores.length} store disponibili
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-700">{parsedData.length}</p>
                <p className="text-xs text-slate-500">Totale Righe</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {uniqueChannels.filter(ch => storeMapping[ch]).length}
                </p>
                <p className="text-xs text-green-700">Store Mappati</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{unmatchedChannels.length}</p>
                <p className="text-xs text-orange-700">Da Mappare</p>
              </div>
            </div>
          </NeumorphicCard>
        )}

        {!parsedData && (
          <NeumorphicCard className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500">
            <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Importante
            </h3>
            <ul className="space-y-2 text-sm text-orange-800">
              <li>✅ Il file CSV deve avere l'header con i nomi esatti delle colonne</li>
              <li>✅ Il campo "channel" deve corrispondere al nome dello store</li>
              <li>✅ Tutti i campi sourceApp_*, sourceType_* e moneyType_* devono essere valori numerici in euro</li>
              <li>✅ Potrai mappare manualmente gli store prima dell'importazione</li>
            </ul>
          </NeumorphicCard>
        )}
      </div>
    </ProtectedPage>
  );
}