import { useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Download, Copy } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function IPraticoBulkImport() {
  const [jsonInput, setJsonInput] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">📦 Bulk Import iPratico</h1>
        <p className="text-[#9b9b9b]">Importa velocemente dati storici per più locali</p>
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

      {/* JSON Input */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[#8b7355]" />
            <h2 className="text-xl font-bold text-[#6b6b6b]">📝 Step 2: Dati da Importare</h2>
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
                <span className="text-sm">Scarica Esempio</span>
              </div>
            </button>
          </div>
        </div>

        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder="Incolla qui il JSON con i dati..."
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