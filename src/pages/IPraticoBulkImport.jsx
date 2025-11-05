
import { useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Download, Copy, FileSpreadsheet } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function IPraticoBulkImport() {
  const [jsonInput, setJsonInput] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedStore, setSelectedStore] = useState('');

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const exampleData = {
    secret: "your_ZAPIER_IPRATICO_WEBHOOK_SECRET",
    records: [
      {
        store_name: "Ticinese",
        order_date: "2024-01-01",
        total_orders: 120,
        total_revenue: 2450.50,
        sourceApp_glovo: 850.00,
        sourceApp_glovo_orders: 30,
        sourceApp_deliveroo: 620.00,
        sourceApp_deliveroo_orders: 25,
        sourceType_delivery: 1470.00,
        sourceType_delivery_orders: 55,
        moneyType_online: 1400.00,
        moneyType_online_orders: 50
      },
      {
        store_name: "Lanino",
        order_date: "2024-01-01",
        total_orders: 95,
        total_revenue: 1890.00,
        sourceApp_tabesto: 1200.00,
        sourceApp_tabesto_orders: 70,
        sourceType_store: 690.00,
        sourceType_store_orders: 25,
        moneyType_cash: 500.00,
        moneyType_cash_orders: 20
      }
    ]
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          setJsonInput(JSON.stringify(json, null, 2));
        } catch (error) {
          alert('Errore nel leggere il file JSON: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!selectedStore) {
        alert('Seleziona prima il locale di riferimento per questo import');
        event.target.value = ''; // Reset file input
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvText = e.target.result;
          const records = parseCsvToRecords(csvText, selectedStore);
          
          if (records.length === 0) {
            alert('Nessun record valido trovato nel CSV');
            return;
          }

          const jsonData = {
            secret: webhookSecret || "your_ZAPIER_IPRATICO_WEBHOOK_SECRET",
            records: records
          };
          
          setJsonInput(JSON.stringify(jsonData, null, 2));
          alert(`✅ CSV caricato con successo! ${records.length} record pronti per l'importazione`);
        } catch (error) {
          alert('Errore nel leggere il file CSV: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const parseCsvToRecords = (csvText, storeName) => {
    // Handle both Windows (\r\n) and Unix (\n) line endings, and filter out empty lines
    const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV deve contenere almeno una riga di intestazione e una di dati');
    }

    console.log(`📊 CSV ha ${lines.length} righe totali (inclusa intestazione)`);

    // Parse header - trim each value
    const headers = lines[0].split(/[,;]/).map(h => h.trim());
    
    console.log(`📋 Colonne trovate: ${headers.join(', ')}`);
    
    // Find required columns
    const requiredFields = ['order_date', 'total_orders', 'total_revenue'];
    const missingFields = requiredFields.filter(field => !headers.includes(field));
    
    if (missingFields.length > 0) {
      throw new Error(`Colonne obbligatorie mancanti nel CSV: ${missingFields.join(', ')}`);
    }

    // Parse data rows
    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) { // This check might be redundant if filter(line => line.trim()) is used, but kept for robustness as per outline
        console.log(`⏭️ Riga ${i + 1} vuota, saltata`);
        continue;
      }

      const values = line.split(/[,;]/).map(v => v.trim());
      
      if (values.length !== headers.length) {
        console.warn(`⚠️ Riga ${i + 1} ha ${values.length} colonne invece di ${headers.length}, saltata`);
        console.warn(`   Contenuto: ${line.substring(0, 100)}...`);
        continue;
      }

      const record = { store_name: storeName };
      
      headers.forEach((header, idx) => {
        const value = values[idx];
        
        // Convert numeric fields
        if (header.includes('orders') || header.includes('revenue') || 
            header.startsWith('sourceApp_') || header.startsWith('sourceType_') || 
            header.startsWith('moneyType_')) { // Preserving startsWith for precision
          record[header] = value && value !== '' ? parseFloat(value) : 0;
        } else {
          record[header] = value;
        }
      });

      records.push(record);
      console.log(`✅ Riga ${i + 1} parsata con successo: ${record.order_date}, Revenue: ${record.total_revenue}`);
    }

    console.log(`🎉 Totale record parsati: ${records.length}`);
    return records;
  };

  const handleImport = async () => {
    if (!webhookSecret) {
      alert('Inserisci il Webhook Secret');
      return;
    }

    if (!jsonInput.trim()) {
      alert('Inserisci i dati JSON');
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      // Parse JSON input
      let data;
      try {
        data = JSON.parse(jsonInput);
      } catch (e) {
        throw new Error('JSON non valido: ' + e.message);
      }

      // Add secret if not present
      if (!data.secret) {
        data.secret = webhookSecret;
      }

      // Call bulk import function
      const response = await base44.functions.invoke('bulkImportIPratico', data);

      setResult({
        success: true,
        data: response.data
      });

    } catch (error) {
      setResult({
        success: false,
        error: error.message,
        data: error.response?.data
      });
    }

    setImporting(false);
  };

  const copyExample = () => {
    setJsonInput(JSON.stringify(exampleData, null, 2));
  };

  const downloadExample = () => {
    const blob = new Blob([JSON.stringify(exampleData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ipratico-example.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsvExample = () => {
    const csvContent = `order_date,total_orders,total_revenue,sourceApp_glovo,sourceApp_glovo_orders,sourceApp_deliveroo,sourceApp_deliveroo_orders,sourceApp_justeat,sourceApp_justeat_orders,sourceApp_store,sourceApp_store_orders
2024-01-01,120,2450.50,850.00,30,620.00,25,430.00,18,550.50,47
2024-01-02,135,2680.00,920.00,32,680.00,28,450.00,20,630.00,55`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ipratico-example.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">📦 Bulk Import iPratico</h1>
        <p className="text-[#9b9b9b]">Importa velocemente dati storici per più locali (JSON o CSV)</p>
      </div>

      {/* Stores Available */}
      {stores.length > 0 && (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Locali Disponibili</h2>
          <div className="flex flex-wrap gap-2">
            {stores.map(store => (
              <div key={store.id} className="neumorphic-pressed px-4 py-2 rounded-lg">
                <span className="font-medium text-[#6b6b6b]">{store.name}</span>
              </div>
            ))}
          </div>
        </NeumorphicCard>
      )}

      {/* Secret Input */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-xl font-bold text-[#6b6b6b]">🔐 Step 1: Webhook Secret</h2>
        </div>
        <input
          type="password"
          placeholder="Inserisci ZAPIER_IPRATICO_WEBHOOK_SECRET..."
          value={webhookSecret}
          onChange={(e) => setWebhookSecret(e.target.value)}
          className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
        />
      </NeumorphicCard>

      {/* CSV Import Section - NEW */}
      <NeumorphicCard className="p-6 border-2 border-[#8b7355]">
        <div className="flex items-center gap-3 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-xl font-bold text-[#6b6b6b]">📊 Step 2a: Import da CSV</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-[#9b9b9b] mb-2 block font-medium">
              Seleziona Locale (obbligatorio per CSV)
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            >
              <option value="">-- Seleziona un locale --</option>
              {stores.map(store => (
                <option key={store.id} value={store.name}>{store.name}</option>
              ))}
            </select>
            <p className="text-xs text-[#9b9b9b] mt-2">
              ⚠️ Il locale selezionato verrà applicato a tutti i record del CSV
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex-1 neumorphic-flat px-4 py-3 rounded-lg cursor-pointer text-[#6b6b6b] hover:text-[#8b7355] transition-colors text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
                disabled={!selectedStore}
              />
              <div className="flex items-center justify-center gap-2">
                <Upload className="w-5 h-5" />
                <span className="font-medium">
                  {selectedStore ? 'Carica CSV' : 'Seleziona prima il locale'}
                </span>
              </div>
            </label>

            <button
              onClick={downloadCsvExample}
              className="neumorphic-flat px-4 py-3 rounded-lg text-[#6b6b6b] hover:text-[#8b7355] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                <span className="text-sm">CSV Esempio</span>
              </div>
            </button>
          </div>

          <div className="neumorphic-pressed p-4 rounded-xl bg-blue-50">
            <p className="text-sm text-blue-800 mb-2">
              <strong>📋 Formato CSV:</strong>
            </p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Prima riga: intestazioni colonne</li>
              <li>• Colonne obbligatorie: order_date, total_orders, total_revenue</li>
              <li>• Separatori supportati: virgola (,) o punto e virgola (;)</li>
              <li>• Formato data: YYYY-MM-DD (es: 2024-01-15)</li>
              <li>• Decimali con punto (es: 2450.50)</li>
              <li>• Colonne opzionali verranno impostate a 0 se mancanti</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>

      {/* JSON Input */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[#8b7355]" />
            <h2 className="text-xl font-bold text-[#6b6b6b]">📝 Step 2b: Dati da Importare (JSON)</h2>
          </div>
          <div className="flex gap-2">
            <label className="neumorphic-flat px-4 py-2 rounded-lg cursor-pointer text-[#6b6b6b] hover:text-[#8b7355] transition-colors">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span className="text-sm">Carica JSON</span>
              </div>
            </label>
            <button
              onClick={copyExample}
              className="neumorphic-flat px-4 py-2 rounded-lg text-[#6b6b6b] hover:text-[#8b7355] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4" />
                <span className="text-sm">Copia Esempio</span>
              </div>
            </button>
            <button
              onClick={downloadExample}
              className="neumorphic-flat px-4 py-2 rounded-lg text-[#6b6b6b] hover:text-[#8b7355] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                <span className="text-sm">Scarica JSON</span>
              </div>
            </button>
          </div>
        </div>

        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder="Incolla qui il JSON con i dati o carica un file CSV sopra..."
          className="w-full h-96 neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none font-mono text-sm"
        />

        <NeumorphicButton
          onClick={handleImport}
          disabled={importing || !webhookSecret || !jsonInput.trim()}
          variant="primary"
          className="w-full mt-4"
        >
          {importing ? '⏳ Importazione in corso...' : '🚀 Importa Dati'}
        </NeumorphicButton>
      </NeumorphicCard>

      {/* Result */}
      {result && (
        <NeumorphicCard className={`p-6 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
            )}
            <div className="flex-1">
              <h3 className={`text-xl font-bold mb-2 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.success ? '✅ Importazione Completata!' : '❌ Errore Importazione'}
              </h3>
              
              {result.data && (
                <>
                  {result.data.message && (
                    <p className={`mb-4 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                      {result.data.message}
                    </p>
                  )}

                  {result.data.stats && (
                    <div className="neumorphic-pressed p-4 rounded-xl mb-4">
                      <h4 className="font-bold text-[#6b6b6b] mb-3">Statistiche:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-[#6b6b6b]">{result.data.stats.total}</div>
                          <div className="text-sm text-[#9b9b9b]">Totali</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{result.data.stats.created}</div>
                          <div className="text-sm text-[#9b9b9b]">Creati</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{result.data.stats.updated}</div>
                          <div className="text-sm text-[#9b9b9b]">Aggiornati</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{result.data.stats.failed}</div>
                          <div className="text-sm text-[#9b9b9b]">Falliti</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {result.data.details?.errors && result.data.details.errors.length > 0 && (
                    <div className="neumorphic-pressed p-4 rounded-xl bg-red-50">
                      <h4 className="font-bold text-red-700 mb-3">Errori ({result.data.details.errors.length}):</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {result.data.details.errors.map((err, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-lg text-sm">
                            <div className="font-medium text-red-700">
                              Record #{err.index}: {err.store_name} - {err.order_date}
                            </div>
                            <div className="text-red-600 text-xs mt-1">{err.error}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.data.details?.success && result.data.details.success.length > 0 && (
                    <details className="neumorphic-pressed p-4 rounded-xl">
                      <summary className="font-bold text-green-700 cursor-pointer">
                        ✅ Record importati con successo ({result.data.details.success.length})
                      </summary>
                      <div className="mt-3 space-y-1 max-h-60 overflow-y-auto">
                        {result.data.details.success.map((s, idx) => (
                          <div key={idx} className="text-sm text-green-700">
                            #{s.index}: {s.store_name} - {s.order_date} ({s.action})
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )}

              {result.error && (
                <div className="neumorphic-pressed p-4 rounded-xl bg-white mt-4">
                  <pre className="text-xs text-red-700 overflow-auto">
                    {result.error}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </NeumorphicCard>
      )}

      {/* Instructions */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">📋 Formato Dati</h2>
        
        <div className="space-y-4">
          <div className="neumorphic-pressed p-4 rounded-xl">
            <h3 className="font-bold text-[#6b6b6b] mb-2">Struttura JSON:</h3>
            <pre className="text-xs text-[#6b6b6b] overflow-auto bg-white p-3 rounded">
{`{
  "secret": "your_ZAPIER_IPRATICO_WEBHOOK_SECRET",
  "records": [
    {
      "store_name": "Nome Locale",
      "order_date": "YYYY-MM-DD",
      "total_orders": 120,
      "total_revenue": 2450.50,
      "sourceApp_glovo": 850.00,
      "sourceApp_glovo_orders": 30,
      ... (tutti gli altri campi)
    }
  ]
}`}
            </pre>
          </div>

          <div className="neumorphic-flat p-4 rounded-xl space-y-2">
            <p className="text-sm text-[#6b6b6b]">
              <strong>✅ Campi Obbligatori:</strong> store_name, order_date, total_orders, total_revenue
            </p>
            <p className="text-sm text-[#6b6b6b]">
              <strong>📝 Campi Opzionali:</strong> Tutti gli altri campi sono opzionali. Se non li specifichi, verranno impostati a 0
            </p>
            <p className="text-sm text-[#6b6b6b]">
              <strong>🔄 Update Automatico:</strong> Se esiste già un record per lo stesso locale e data, verrà aggiornato
            </p>
            <p className="text-sm text-[#6b6b6b]">
              <strong>🏪 Store Name:</strong> Deve corrispondere esattamente al nome del locale (vedi "Locali Disponibili" sopra)
            </p>
            <p className="text-sm text-[#6b6b6b]">
              <strong>📅 Date Format:</strong> YYYY-MM-DD (es: 2024-01-15) o DD/MM/YYYY
            </p>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}
