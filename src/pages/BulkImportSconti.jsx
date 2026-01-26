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

  // Debug: log stores
  React.useEffect(() => {
    console.log('Stores loaded:', stores);
  }, [stores]);

  const parseMutation = useMutation({
    mutationFn: async (file) => {
      setUploadStatus('parsing');
      
      // Parse CSV manualmente
      const text = await file.text();
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length < 2) {
        throw new Error('Il file CSV è vuoto o non contiene dati');
      }
      
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Verifica che le colonne principali esistano
      const requiredColumns = ['order_date', 'total_discount_price', 'channel'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      if (missingColumns.length > 0) {
        throw new Error(`Colonne mancanti: ${missingColumns.join(', ')}`);
      }
      
      const scontiData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row = {};
        
        headers.forEach((header, index) => {
          const value = values[index] || '';
          
          if (header === 'order_date' || header === 'channel') {
            row[header] = value;
          } else {
            row[header] = parseFloat(value) || 0;
          }
        });
        
        return row;
      });
      
      // Match stores
      const scontiWithStores = scontiData.map(sconto => {
        const matchedStore = stores.find(s => 
          s.store_name?.toLowerCase().trim() === sconto.channel?.toLowerCase().trim()
        );
        
        return {
          ...sconto,
          store_id: matchedStore?.id || null,
          store_name: matchedStore?.store_name || null,
          total_discount_price: parseFloat(sconto.total_discount_price) || 0,
          sourceApp_glovo: parseFloat(sconto.sourceApp_glovo) || 0,
          sourceApp_deliveroo: parseFloat(sconto.sourceApp_deliveroo) || 0,
          sourceApp_justeat: parseFloat(sconto.sourceApp_justeat) || 0,
          sourceApp_onlineordering: parseFloat(sconto.sourceApp_onlineordering) || 0,
          sourceApp_ordertable: parseFloat(sconto.sourceApp_ordertable) || 0,
          sourceApp_tabesto: parseFloat(sconto.sourceApp_tabesto) || 0,
          sourceApp_deliverect: parseFloat(sconto.sourceApp_deliverect) || 0,
          sourceApp_store: parseFloat(sconto.sourceApp_store) || 0,
          sourceType_delivery: parseFloat(sconto.sourceType_delivery) || 0,
          sourceType_takeaway: parseFloat(sconto.sourceType_takeaway) || 0,
          sourceType_takeawayOnSite: parseFloat(sconto.sourceType_takeawayOnSite) || 0,
          sourceType_store: parseFloat(sconto.sourceType_store) || 0,
          moneyType_bancomat: parseFloat(sconto.moneyType_bancomat) || 0,
          moneyType_cash: parseFloat(sconto.moneyType_cash) || 0,
          moneyType_online: parseFloat(sconto.moneyType_online) || 0,
          moneyType_satispay: parseFloat(sconto.moneyType_satispay) || 0,
          moneyType_credit_card: parseFloat(sconto.moneyType_credit_card) || 0,
          moneyType_fidelity_card_points: parseFloat(sconto.moneyType_fidelity_card_points) || 0
        };
      });
      
      return scontiWithStores;
    },
    onSuccess: (data) => {
      setParsedData(data);
      setUploadStatus(null);
      
      // Initialize mapping
      const mapping = {};
      const uniqueChannels = [...new Set(data.map(s => s.channel))];
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
          store_name: mappedStore?.store_name || null
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
                <p>order_date, total_discount_price, channel, sourceApp_glovo, sourceApp_deliveroo,</p>
                <p>sourceApp_justeat, sourceApp_onlineordering, sourceApp_ordertable, sourceApp_tabesto,</p>
                <p>sourceApp_deliverect, sourceApp_store, sourceType_delivery, sourceType_takeaway,</p>
                <p>sourceType_takeawayOnSite, sourceType_store, moneyType_bancomat, moneyType_cash,</p>
                <p>moneyType_online, moneyType_satispay, moneyType_credit_card, moneyType_fidelity_card_points</p>
              </div>
              <div className="mt-3 text-xs text-blue-800">
                <p className="font-bold mb-1">Note:</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li><code>order_date</code>: formato YYYY-MM-DD</li>
                  <li><code>total_discount_price</code>: sconto totale in euro (numero)</li>
                  <li><code>channel</code>: nome dello store (es. "Roma Centro")</li>
                  <li><code>sourceApp_*</code>, <code>sourceType_*</code>, <code>moneyType_*</code>: valori in euro per ogni canale</li>
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
              {stores.length === 0 && (
                <p className="text-xs text-red-600">⚠️ Nessuno store trovato nel database!</p>
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
                            className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">-- Seleziona store --</option>
                            {isLoadingStores ? (
                              <option disabled>Caricamento...</option>
                            ) : stores.length === 0 ? (
                              <option disabled>Nessuno store trovato</option>
                            ) : (
                              stores.map(store => (
                                <option key={store.id} value={store.id}>
                                  {store.store_name}
                                </option>
                              ))
                            )}
                          </select>
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