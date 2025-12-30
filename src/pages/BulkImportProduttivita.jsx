import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";

export default function BulkImportProduttivita() {
  const [selectedStore, setSelectedStore] = useState('');
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedStore) {
      alert('Seleziona prima un negozio');
      event.target.value = '';
      return;
    }

    setUploading(true);
    setImportResult(null);

    try {
      const store = stores.find(s => s.id === selectedStore);
      if (!store) throw new Error('Negozio non trovato');

      const text = await file.text();
      const lines = text.trim().split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV deve contenere almeno una riga di intestazione e una di dati');
      }

      const headers = parseCsvLine(lines[0]);
      
      // Validate headers
      const requiredColumns = ['date', 'store'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      if (missingColumns.length > 0) {
        throw new Error(`Colonne mancanti: ${missingColumns.join(', ')}`);
      }

      let successCount = 0;
      let errorCount = 0;
      let updateCount = 0;

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = parseCsvLine(lines[i]);
          const record = {};
          headers.forEach((header, idx) => {
            record[header] = values[idx] || '';
          });

          const date = record['date'];
          if (!date) {
            errorCount++;
            continue;
          }

          // Extract time slots
          const slots = {};
          let totalRevenue = 0;

          headers.forEach(header => {
            if (header.includes(':') && header.includes('-')) {
              const value = parseFloat(record[header]) || 0;
              slots[header] = value;
              totalRevenue += value;
            }
          });

          // Override with total_sum_all_slots if present
          if (record['total_sum_all_slots']) {
            totalRevenue = parseFloat(record['total_sum_all_slots']) || totalRevenue;
          }

          // Check if exists
          const existing = await base44.entities.RevenueByTimeSlot.filter({
            date,
            store_id: store.id
          });

          if (existing.length > 0) {
            await base44.entities.RevenueByTimeSlot.update(existing[0].id, {
              slots,
              total_revenue: totalRevenue
            });
            updateCount++;
          } else {
            await base44.entities.RevenueByTimeSlot.create({
              date,
              store_id: store.id,
              store_name: store.name,
              slots,
              total_revenue: totalRevenue
            });
            successCount++;
          }

        } catch (error) {
          console.error(`Error processing line ${i + 1}:`, error);
          errorCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['revenue-by-time-slot'] });

      setImportResult({
        success: true,
        total: lines.length - 1,
        successCount,
        updateCount,
        errorCount,
        storeName: store.name
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

  return (
    <ProtectedPage pageName="BulkImportProduttivita" requiredUserTypes={['admin']}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">📤 Bulk Import - Produttività</h1>
          <p className="text-[#9b9b9b]">Importa dati storici di revenue per slot orari da CSV</p>
        </div>

        {/* Instructions */}
        <NeumorphicCard className="p-6 bg-blue-50">
          <h2 className="text-lg font-bold text-blue-800 mb-3">📋 Formato File CSV</h2>
          <p className="text-sm text-blue-700 mb-3">
            Il file CSV deve avere le seguenti colonne (in qualsiasi ordine):
          </p>
          <div className="bg-white p-4 rounded-lg space-y-2 text-sm">
            <p className="font-mono text-blue-800">
              <strong>date</strong> - Data nel formato YYYY-MM-DD (es. 2025-01-15)
            </p>
            <p className="font-mono text-blue-800">
              <strong>store</strong> - Nome del negozio (verrà ignorato, usa il selettore sotto)
            </p>
            <p className="font-mono text-blue-800">
              <strong>00:00-00:30, 00:30-01:00, ...</strong> - Tutti i 48 slot di 30 minuti
            </p>
            <p className="font-mono text-blue-800">
              <strong>total_sum_all_slots</strong> - (opzionale) Totale giornaliero
            </p>
          </div>
        </NeumorphicCard>

        {/* Store Selection */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">
            1. Seleziona Negozio <span className="text-red-600">*</span>
          </h2>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
          >
            <option value="">-- Seleziona negozio --</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>
                {store.name} - {store.address}
              </option>
            ))}
          </select>
          <p className="text-sm text-[#9b9b9b] mt-2">
            ⚠️ Tutti i record nel CSV verranno assegnati a questo negozio
          </p>
        </NeumorphicCard>

        {/* Upload */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">2. Carica File CSV</h2>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-upload"
            disabled={!selectedStore || uploading}
          />
          <label
            htmlFor="csv-upload"
            className={`block text-center neumorphic-flat px-6 py-8 rounded-xl cursor-pointer transition-all ${
              !selectedStore || uploading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-3 animate-spin" />
                <p className="text-[#6b6b6b] font-medium">Import in corso...</p>
              </>
            ) : (
              <>
                <FileText className="w-12 h-12 text-[#8b7355] mx-auto mb-3" />
                <p className="text-[#6b6b6b] font-medium text-lg mb-1">
                  {selectedStore ? 'Clicca per caricare CSV' : 'Seleziona prima un negozio'}
                </p>
                <p className="text-sm text-[#9b9b9b]">Formato: CSV con header</p>
              </>
            )}
          </label>
        </NeumorphicCard>

        {/* Import Result */}
        {importResult && (
          <NeumorphicCard className={`p-6 ${importResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-start gap-3">
              {importResult.success ? (
                <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3 className={`text-xl font-bold mb-2 ${importResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {importResult.success ? '✅ Import Completato!' : '❌ Errore Import'}
                </h3>
                
                {importResult.success ? (
                  <div className="space-y-2">
                    <p className="text-green-700">
                      <strong>Negozio:</strong> {importResult.storeName}
                    </p>
                    <p className="text-green-700">
                      <strong>Righe processate:</strong> {importResult.total}
                    </p>
                    <p className="text-green-700">
                      ✅ Nuovi record: <strong>{importResult.successCount}</strong>
                    </p>
                    <p className="text-blue-600">
                      🔄 Record aggiornati: <strong>{importResult.updateCount}</strong>
                    </p>
                    {importResult.errorCount > 0 && (
                      <p className="text-orange-600">
                        ⚠️ Errori: <strong>{importResult.errorCount}</strong>
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

        {/* Tips */}
        <NeumorphicCard className="p-6 bg-yellow-50">
          <h2 className="text-lg font-bold text-yellow-800 mb-3">💡 Suggerimenti</h2>
          <ul className="space-y-2 text-sm text-yellow-700">
            <li>✅ Assicurati che le date siano nel formato YYYY-MM-DD</li>
            <li>✅ Usa il punto (.) per i decimali, non la virgola</li>
            <li>✅ Se un record per quella data esiste già, verrà aggiornato</li>
            <li>✅ I valori mancanti o non numerici saranno considerati come 0</li>
            <li>✅ Puoi importare più volte lo stesso file per correggere eventuali errori</li>
          </ul>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}