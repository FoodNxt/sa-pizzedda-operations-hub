import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  TrendingUp,
  DollarSign,
  Package,
  Link as LinkIcon,
  X,
  BarChart3,
  Calendar
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function OrdiniSbagliati() {
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [unmappedStores, setUnmappedStores] = useState([]);
  const [storeMapping, setStoreMapping] = useState({});
  const [showAllOrders, setShowAllOrders] = useState(false); // NEW: state for showing all orders

  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: wrongOrders = [] } = useQuery({
    queryKey: ['wrong-orders'],
    queryFn: () => base44.entities.WrongOrder.list('-order_date', 100),
  });

  const { data: storeMappings = [] } = useQuery({
    queryKey: ['store-mappings'],
    queryFn: () => base44.entities.StoreMapping.list(),
  });

  const createMappingMutation = useMutation({
    mutationFn: (data) => base44.entities.StoreMapping.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-mappings'] });
    },
  });

  // NEW: Parse Deliveroo date format "2 Aug 2025 at 19:55"
  const parseDeliverooDate = (dateString) => {
    try {
      // Format: "2 Aug 2025 at 19:55"
      const parts = dateString.split(' at ');
      if (parts.length === 2) {
        const datePart = parts[0]; // "2 Aug 2025"
        const timePart = parts[1]; // "19:55"
        
        // Parse date
        const dateComponents = datePart.split(' '); // ["2", "Aug", "2025"]
        const day = dateComponents[0];
        const month = dateComponents[1];
        const year = dateComponents[2];
        
        // Convert month name to number
        const months = {
          'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
          'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
          'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        
        const monthNum = months[month];
        if (!monthNum) return null;
        
        // Build ISO string: YYYY-MM-DDTHH:MM:SS
        const isoString = `${year}-${monthNum}-${day.padStart(2, '0')}T${timePart}:00`;
        const date = new Date(isoString);
        
        if (isNaN(date.getTime())) return null;
        return date.toISOString();
      }
      
      // Fallback to standard parsing
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return null;
    }
  };

  const parseCsvLine = (line) => {
    const values = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentValue += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());
    return values;
  };

  const findBestMatch = (platformStoreName, stores) => {
    const normalize = (str) => str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const normalizedPlatform = normalize(platformStoreName);
    
    let bestMatch = null;
    let bestScore = 0;
    
    stores.forEach(store => {
      const normalizedStore = normalize(store.name);
      
      // Exact match
      if (normalizedPlatform === normalizedStore) {
        bestMatch = store;
        bestScore = 100;
        return;
      }
      
      // Contains match
      if (normalizedPlatform.includes(normalizedStore) || normalizedStore.includes(normalizedPlatform)) {
        const score = 80;
        if (score > bestScore) {
          bestMatch = store;
          bestScore = score;
        }
      }
      
      // Fuzzy match (simple Levenshtein-like)
      const minLength = Math.min(normalizedPlatform.length, normalizedStore.length);
      let matchingChars = 0;
      for (let i = 0; i < minLength; i++) {
        if (normalizedPlatform[i] === normalizedStore[i]) matchingChars++;
      }
      const score = (matchingChars / Math.max(normalizedPlatform.length, normalizedStore.length)) * 60;
      if (score > bestScore && score > 30) {
        bestMatch = store;
        bestScore = score;
      }
    });
    
    return bestMatch ? { store: bestMatch, confidence: Math.round(bestScore) } : null;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedPlatform) {
      alert('Seleziona prima una piattaforma');
      event.target.value = '';
      return;
    }

    setUploading(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV deve contenere almeno una riga di intestazione e una di dati');
      }

      const headers = parseCsvLine(lines[0]);
      const records = [];
      const unmapped = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        if (values.length !== headers.length) continue;

        const record = {};
        headers.forEach((header, idx) => {
          record[header] = values[idx];
        });

        let storeNameField, orderIdField, orderDateField, orderTotalField, refundField, statusField;

        if (selectedPlatform === 'glovo') {
          storeNameField = 'Restaurant name';
          orderIdField = 'Order ID';
          orderDateField = 'Order received at';
          orderTotalField = 'Subtotal';
          refundField = 'Vendor Refunds';
          statusField = 'Order status';
        } else if (selectedPlatform === 'deliveroo') {
          storeNameField = 'Site';
          orderIdField = 'Order';
          orderDateField = 'Time and date';
          orderTotalField = 'Order total';
          refundField = 'Partner refund value';
          statusField = 'Customer refund status';
        }

        const platformStoreName = record[storeNameField];
        if (!platformStoreName) continue;

        // Check existing mapping
        let storeMatch = storeMappings.find(
          m => m.platform === selectedPlatform && m.platform_store_name === platformStoreName
        );

        if (!storeMatch) {
          // Try auto-match
          const autoMatch = findBestMatch(platformStoreName, stores);
          if (autoMatch && autoMatch.confidence >= 70) {
            // Auto-create mapping
            const mappingData = {
              platform: selectedPlatform,
              platform_store_name: platformStoreName,
              store_id: autoMatch.store.id,
              store_name: autoMatch.store.name,
              auto_matched: true,
              confidence_score: autoMatch.confidence
            };
            await createMappingMutation.mutateAsync(mappingData);
            storeMatch = mappingData;
          } else {
            // Add to unmapped
            if (!unmapped.find(u => u.platformStoreName === platformStoreName)) {
              unmapped.push({
                platformStoreName,
                suggestedMatch: autoMatch
              });
            }
            continue;
          }
        }

        // UPDATED: Handle date parsing based on platform
        let parsedDate;
        if (selectedPlatform === 'deliveroo') {
          parsedDate = parseDeliverooDate(record[orderDateField]);
        } else {
          parsedDate = record[orderDateField] ? new Date(record[orderDateField]).toISOString() : new Date().toISOString();
        }

        if (!parsedDate) {
          console.error('Failed to parse date:', record[orderDateField]);
          continue; // Skip this record if date parsing fails
        }

        const wrongOrder = {
          platform: selectedPlatform,
          order_id: record[orderIdField],
          order_date: parsedDate,
          store_name: platformStoreName,
          store_id: storeMatch ? storeMatch.store_id : null,
          store_matched: !!storeMatch,
          order_total: parseFloat(record[orderTotalField]?.replace(/[^0-9.-]/g, '') || '0'),
          refund_value: parseFloat(record[refundField]?.replace(/[^0-9.-]/g, '') || '0'),
          customer_refund_status: record[statusField] || '',
          complaint_reason: selectedPlatform === 'glovo' ? record['Complaint Reason'] : null,
          cancellation_reason: selectedPlatform === 'glovo' ? record['Cancellation reason'] : null,
          order_status: selectedPlatform === 'glovo' ? record[statusField] : null,
          raw_data: record,
          import_date: new Date().toISOString(),
          imported_by: (await base44.auth.me()).email
        };

        records.push(wrongOrder);
      }

      if (unmapped.length > 0) {
        setUnmappedStores(unmapped);
        setShowMappingModal(true);
        setUploading(false);
        event.target.value = '';
        return;
      }

      // Import all records
      let successCount = 0;
      let errorCount = 0;

      for (const record of records) {
        try {
          await base44.entities.WrongOrder.create(record);
          successCount++;
        } catch (error) {
          console.error('Error creating order:', error);
          errorCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['wrong-orders'] });

      setImportResult({
        success: true,
        total: records.length,
        successCount,
        errorCount,
        unmappedCount: 0
      });

    } catch (error) {
      console.error('Error processing CSV:', error);
      setImportResult({
        success: false,
        error: error.message
      });
    }

    setUploading(false);
    event.target.value = '';
  };

  const handleManualMapping = async () => {
    // Save manual mappings
    for (const [platformStoreName, storeId] of Object.entries(storeMapping)) {
      if (!storeId) continue;

      const store = stores.find(s => s.id === storeId);
      if (!store) continue;

      const mappingData = {
        platform: selectedPlatform,
        platform_store_name: platformStoreName,
        store_id: storeId,
        store_name: store.name,
        auto_matched: false,
        confidence_score: 100
      };

      await createMappingMutation.mutateAsync(mappingData);
    }

    setShowMappingModal(false);
    setUnmappedStores([]);
    setStoreMapping({});
    queryClient.invalidateQueries({ queryKey: ['store-mappings'] });
    
    alert('Mapping salvati! Riprova il caricamento del CSV.');
  };

  const stats = {
    total: wrongOrders.length,
    glovo: wrongOrders.filter(o => o.platform === 'glovo').length,
    deliveroo: wrongOrders.filter(o => o.platform === 'deliveroo').length,
    totalRefunds: wrongOrders.reduce((sum, o) => sum + (o.refund_value || 0), 0),
    // NEW: Last order dates
    lastGlovoOrder: wrongOrders.filter(o => o.platform === 'glovo').sort((a, b) => 
      new Date(b.order_date) - new Date(a.order_date)
    )[0],
    lastDeliverooOrder: wrongOrders.filter(o => o.platform === 'deliveroo').sort((a, b) => 
      new Date(b.order_date) - new Date(a.order_date)
    )[0]
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">📦 Ordini Sbagliati</h1>
        <p className="text-[#9b9b9b]">Importa e gestisci ordini con problemi da Glovo e Deliveroo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Package className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{stats.total}</h3>
          <p className="text-sm text-[#9b9b9b]">Ordini Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-3xl font-bold text-orange-600 mb-1">{stats.glovo}</h3>
          <p className="text-sm text-[#9b9b9b]">Glovo</p>
          {stats.lastGlovoOrder && (
            <p className="text-xs text-[#9b9b9b] mt-2">
              Ultimo: {new Date(stats.lastGlovoOrder.order_date).toLocaleDateString('it-IT')}
            </p>
          )}
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-teal-600" />
          </div>
          <h3 className="text-3xl font-bold text-teal-600 mb-1">{stats.deliveroo}</h3>
          <p className="text-sm text-[#9b9b9b]">Deliveroo</p>
          {stats.lastDeliverooOrder && (
            <p className="text-xs text-[#9b9b9b] mt-2">
              Ultimo: {new Date(stats.lastDeliverooOrder.order_date).toLocaleDateString('it-IT')}
            </p>
          )}
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <DollarSign className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-3xl font-bold text-red-600 mb-1">€{stats.totalRefunds.toFixed(2)}</h3>
          <p className="text-sm text-[#9b9b9b]">Rimborsi Totali</p>
        </NeumorphicCard>
      </div>

      {/* Upload Section */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Importa CSV
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
              Piattaforma <span className="text-red-600">*</span>
            </label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            >
              <option value="">-- Seleziona piattaforma --</option>
              <option value="glovo">Glovo</option>
              <option value="deliveroo">Deliveroo</option>
            </select>
          </div>

          <div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
              disabled={!selectedPlatform || uploading}
            />
            <label
              htmlFor="csv-upload"
              className={`block text-center neumorphic-flat px-6 py-4 rounded-xl cursor-pointer transition-all ${
                !selectedPlatform || uploading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
              }`}
            >
              <FileText className="w-8 h-8 text-[#8b7355] mx-auto mb-2" />
              <p className="text-[#6b6b6b] font-medium">
                {uploading ? 'Caricamento in corso...' : selectedPlatform ? 'Clicca per caricare CSV' : 'Seleziona prima una piattaforma'}
              </p>
            </label>
          </div>
        </div>
      </NeumorphicCard>

      {/* Import Result */}
      {importResult && (
        <NeumorphicCard className={`p-6 ${importResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-start gap-3">
            {importResult.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
            )}
            <div className="flex-1">
              <h3 className={`text-xl font-bold mb-2 ${importResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {importResult.success ? '✅ Importazione Completata!' : '❌ Errore Importazione'}
              </h3>
              
              {importResult.success ? (
                <div className="space-y-2">
                  <p className="text-green-700">
                    Importati <strong>{importResult.successCount}</strong> ordini su <strong>{importResult.total}</strong>
                  </p>
                  {importResult.errorCount > 0 && (
                    <p className="text-orange-600">
                      {importResult.errorCount} ordini non sono stati importati per errori
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-red-700">{importResult.error}</p>
              )}
            </div>
          </div>
        </NeumorphicCard>
      )}

      {/* Mapping Modal */}
      {showMappingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#6b6b6b] flex items-center gap-2">
                  <LinkIcon className="w-6 h-6 text-[#8b7355]" />
                  Abbina Negozi
                </h2>
                <button
                  onClick={() => setShowMappingModal(false)}
                  className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <X className="w-5 h-5 text-[#9b9b9b]" />
                </button>
              </div>

              <p className="text-[#9b9b9b] mb-6">
                I seguenti negozi dal CSV non sono stati abbinati automaticamente. Seleziona il negozio corrispondente:
              </p>

              <div className="space-y-4 mb-6">
                {unmappedStores.map((unmapped, idx) => (
                  <div key={idx} className="neumorphic-pressed p-4 rounded-xl">
                    <p className="font-medium text-[#6b6b6b] mb-3">
                      Nome dal CSV: <span className="text-[#8b7355]">{unmapped.platformStoreName}</span>
                    </p>
                    
                    {unmapped.suggestedMatch && (
                      <p className="text-sm text-blue-600 mb-2">
                        Suggerimento: {unmapped.suggestedMatch.store.name} ({unmapped.suggestedMatch.confidence}% match)
                      </p>
                    )}
                    
                    <select
                      value={storeMapping[unmapped.platformStoreName] || ''}
                      onChange={(e) => setStoreMapping(prev => ({
                        ...prev,
                        [unmapped.platformStoreName]: e.target.value
                      }))}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                    >
                      <option value="">-- Seleziona negozio --</option>
                      {stores.map(store => (
                        <option key={store.id} value={store.id}>
                          {store.name} - {store.address}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <NeumorphicButton
                  onClick={() => setShowMappingModal(false)}
                  className="flex-1"
                >
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton
                  onClick={handleManualMapping}
                  variant="primary"
                  className="flex-1"
                  disabled={Object.keys(storeMapping).length === 0}
                >
                  Salva Abbinamenti
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          </div>
        </div>
      )}

      {/* Orders List */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#6b6b6b]">Ultimi Ordini Importati</h2>
          
          {/* NEW: Toggle button to show all orders */}
          {wrongOrders.length > 20 && (
            <button
              onClick={() => setShowAllOrders(!showAllOrders)}
              className="neumorphic-flat px-4 py-2 rounded-lg text-sm text-[#8b7355] hover:text-[#6b6b6b] transition-colors"
            >
              {showAllOrders ? `Mostra ultimi 20` : `Mostra tutti (${wrongOrders.length})`}
            </button>
          )}
        </div>

        {wrongOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
            <p className="text-[#6b6b6b] font-medium">Nessun ordine importato</p>
            <p className="text-sm text-[#9b9b9b] mt-1">Carica un CSV per iniziare</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#8b7355]">
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Piattaforma</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Order ID</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Data</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Negozio</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Totale</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Rimborso</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Stato</th>
                </tr>
              </thead>
              <tbody>
                {wrongOrders.slice(0, showAllOrders ? undefined : 20).map((order) => (
                  <tr key={order.id} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        order.platform === 'glovo' 
                          ? 'bg-orange-100 text-orange-700' 
                          : 'bg-teal-100 text-teal-700'
                      }`}>
                        {order.platform}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-sm text-[#6b6b6b]">{order.order_id}</span>
                    </td>
                    <td className="p-3 text-sm text-[#6b6b6b]">
                      {new Date(order.order_date).toLocaleDateString('it-IT')}
                    </td>
                    <td className="p-3">
                      <div>
                        <p className="text-sm text-[#6b6b6b]">{order.store_name}</p>
                        {order.store_matched && (
                          <span className="text-xs text-green-600">✓ Abbinato</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right font-medium text-[#6b6b6b]">
                      €{order.order_total?.toFixed(2) || '0.00'}
                    </td>
                    <td className="p-3 text-right font-bold text-red-600">
                      €{order.refund_value?.toFixed(2) || '0.00'}
                    </td>
                    <td className="p-3 text-sm text-[#6b6b6b]">
                      {order.customer_refund_status || order.order_status || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </NeumorphicCard>

      {/* Info Box */}
      <NeumorphicCard className="p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">💡 Come funziona</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>Seleziona la piattaforma (Glovo o Deliveroo)</li>
              <li>Carica il CSV con gli ordini problematici</li>
              <li>Il sistema abbinerà automaticamente i negozi quando possibile</li>
              <li>Se necessario, ti verrà chiesto di abbinare manualmente i negozi non riconosciuti</li>
              <li>Gli abbinamenti vengono salvati per futuri import</li>
              <li>Puoi visualizzare statistiche e dettagli di tutti gli ordini importati</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}