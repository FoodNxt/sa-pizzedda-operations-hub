import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Zap, Copy, CheckCircle, AlertTriangle, ShoppingCart } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function ZapierProdottiVenduti() {
  const [webhookUrl] = useState(`${window.location.origin}/api/functions/importProdottiVendutiFromZapier`);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('URL copiato negli appunti!');
  };

  const testWebhook = async () => {
    if (stores.length === 0) {
      alert('Nessun negozio configurato! Crea almeno un negozio prima di testare.');
      return;
    }

    const secret = prompt('Inserisci il secret configurato (ZAPIER_PRODOTTI_VENDUTI_WEBHOOK_SECRET):');
    if (!secret) return;

    setTesting(true);
    setTestResult(null);

    try {
      const testData = {
        store_name: stores[0].name,
        data_vendita: new Date().toISOString().split('T')[0],
        'Margherita': '5',
        'Coca Cola 33cl': '3',
        'Acqua Naturale': '2'
      };

      const response = await base44.functions.invoke('importProdottiVendutiFromZapier', testData);

      setTestResult({
        success: true,
        message: 'Test completato con successo!',
        data: response.data
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error.message,
        details: error.response?.data
      });
    }

    setTesting(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <ShoppingCart className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Configurazione Zapier - Prodotti Venduti</h1>
        </div>
        <p className="text-[#9b9b9b]">
          Importa automaticamente i dati delle vendite giornaliere per prodotto da Google Sheets
        </p>
      </div>

      {/* Warning if no stores */}
      {stores.length === 0 && (
        <NeumorphicCard className="p-6 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 mt-1" />
            <div>
              <h3 className="font-bold text-red-700 mb-2">⚠️ Nessun negozio configurato</h3>
              <p className="text-sm text-red-600">
                Prima di configurare Zapier, devi creare almeno un negozio nel sistema.
                Il campo <code className="bg-red-200 px-1 rounded">store_name</code> deve corrispondere esattamente al nome del negozio.
              </p>
            </div>
          </div>
        </NeumorphicCard>
      )}

      {/* Stores Available */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">📍 Negozi Disponibili</h2>
        {stores.length > 0 ? (
          <div className="space-y-2">
            {stores.map(store => (
              <div key={store.id} className="neumorphic-pressed p-3 rounded-lg">
                <p className="font-medium text-[#6b6b6b]">{store.name}</p>
                <p className="text-sm text-[#9b9b9b]">ID: {store.id}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[#9b9b9b]">Nessun negozio trovato. Creane uno prima di procedere.</p>
        )}
      </NeumorphicCard>

      {/* Step 1: Secret */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">🔐 Step 1: Configura il Secret</h2>
        <p className="text-[#9b9b9b] mb-4">
          Vai su Dashboard → Settings → Environment Variables e aggiungi:
        </p>
        <div className="neumorphic-pressed p-4 rounded-xl">
          <code className="text-sm text-[#6b6b6b]">
            <strong>Nome:</strong> ZAPIER_PRODOTTI_VENDUTI_WEBHOOK_SECRET<br />
            <strong>Valore:</strong> [genera una stringa casuale sicura]
          </code>
        </div>
      </NeumorphicCard>

      {/* Step 2: Webhook URL */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">🔗 Step 2: URL Webhook</h2>
        <p className="text-[#9b9b9b] mb-4">
          Usa questo URL in Zapier come endpoint del webhook:
        </p>
        <div className="neumorphic-pressed p-4 rounded-xl flex items-center justify-between gap-4">
          <code className="text-sm text-[#6b6b6b] break-all flex-1">{webhookUrl}</code>
          <NeumorphicButton onClick={() => copyToClipboard(webhookUrl)}>
            <Copy className="w-4 h-4" />
          </NeumorphicButton>
        </div>
      </NeumorphicCard>

      {/* Step 3: Test */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">🧪 Step 3: Testa il Webhook</h2>
        <p className="text-[#9b9b9b] mb-4">
          Verifica che tutto funzioni prima di configurare Zapier:
        </p>
        <NeumorphicButton
          onClick={testWebhook}
          disabled={testing || stores.length === 0}
          variant="primary"
          className="w-full"
        >
          {testing ? 'Test in corso...' : 'Testa Webhook'}
        </NeumorphicButton>

        {testResult && (
          <div className={`mt-4 neumorphic-flat p-4 rounded-xl ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-start gap-3">
              {testResult.success ? (
                <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-600 mt-1" />
              )}
              <div className="flex-1">
                <p className={`font-bold ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {testResult.message}
                </p>
                {testResult.data && (
                  <pre className="text-xs mt-2 bg-white p-2 rounded overflow-auto">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                )}
                {testResult.details && (
                  <pre className="text-xs mt-2 bg-white p-2 rounded overflow-auto text-red-600">
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </NeumorphicCard>

      {/* Step 4: Configure Zapier */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">⚡ Step 4: Configura Zapier</h2>
        
        <div className="space-y-6">
          <div className="neumorphic-flat p-4 rounded-xl">
            <h3 className="font-bold text-[#8b7355] mb-3">1️⃣ Trigger: Google Sheets</h3>
            <ul className="text-sm text-[#6b6b6b] space-y-2 ml-4">
              <li>• App: <strong>Google Sheets</strong></li>
              <li>• Event: <strong>New or Updated Spreadsheet Row</strong></li>
              <li>• Seleziona il foglio di calcolo e il worksheet</li>
            </ul>
          </div>

          <div className="neumorphic-flat p-4 rounded-xl">
            <h3 className="font-bold text-[#8b7355] mb-3">2️⃣ Action: Webhooks by Zapier</h3>
            <ul className="text-sm text-[#6b6b6b] space-y-2 ml-4">
              <li>• App: <strong>Webhooks by Zapier</strong></li>
              <li>• Event: <strong>POST</strong></li>
              <li>• URL: <code className="bg-gray-100 px-1 rounded">{webhookUrl}</code></li>
              <li>• Payload Type: <strong>JSON</strong></li>
            </ul>
          </div>

          <div className="neumorphic-flat p-4 rounded-xl">
            <h3 className="font-bold text-[#8b7355] mb-3">3️⃣ Headers</h3>
            <div className="neumorphic-pressed p-3 rounded-lg">
              <code className="text-xs text-[#6b6b6b]">
                x-webhook-secret: [il tuo secret]
              </code>
            </div>
          </div>

          <div className="neumorphic-flat p-4 rounded-xl">
            <h3 className="font-bold text-[#8b7355] mb-3">4️⃣ Data (Mapping Campi)</h3>
            <div className="neumorphic-pressed p-3 rounded-lg space-y-2">
              <p className="text-xs text-[#6b6b6b] font-bold mb-2">Campi Obbligatori:</p>
              <code className="text-xs text-[#6b6b6b] block">store_name → [Colonna Nome Negozio]</code>
              <code className="text-xs text-[#6b6b6b] block">data_vendita → [Colonna Data]</code>
              
              <p className="text-xs text-[#6b6b6b] font-bold mt-4 mb-2">Prodotti (usa i nomi esatti!):</p>
              <div className="grid grid-cols-2 gap-2">
                <code className="text-xs text-[#6b6b6b]">Acqua Frizzante</code>
                <code className="text-xs text-[#6b6b6b]">Acqua Naturale</code>
                <code className="text-xs text-[#6b6b6b]">Baione Cannonau</code>
                <code className="text-xs text-[#6b6b6b]">Bottarga</code>
                <code className="text-xs text-[#6b6b6b]">Capperi, olive e acciughe</code>
                <code className="text-xs text-[#6b6b6b]">Cipolle caramellate e Gorgonzola</code>
                <code className="text-xs text-[#6b6b6b]">Coca Cola 33cl</code>
                <code className="text-xs text-[#6b6b6b]">Coca Cola Zero 33cl</code>
                <code className="text-xs text-[#6b6b6b]">Contissa Vermentino</code>
                <code className="text-xs text-[#6b6b6b]">Estathe 33cl</code>
                <code className="text-xs text-[#6b6b6b]">Fanta 33cl</code>
                <code className="text-xs text-[#6b6b6b]">Fregola</code>
                <code className="text-xs text-[#6b6b6b]">Friarielli e Olive</code>
                <code className="text-xs text-[#6b6b6b]">Gorgonzola e Radicchio</code>
                <code className="text-xs text-[#6b6b6b]">Guttiau 70gr</code>
                <code className="text-xs text-[#6b6b6b]">Guttiau Snack</code>
                <code className="text-xs text-[#6b6b6b]">Ichnusa Ambra Limpida</code>
                <code className="text-xs text-[#6b6b6b]">Ichnusa Classica</code>
                <code className="text-xs text-[#6b6b6b]">Ichnusa Non Filtrata</code>
                <code className="text-xs text-[#6b6b6b]">Malloreddus</code>
                <code className="text-xs text-[#6b6b6b]">Malloreddus 4 sapori</code>
                <code className="text-xs text-[#6b6b6b]">Margherita</code>
                <code className="text-xs text-[#6b6b6b]">Nduja e stracciatella</code>
                <code className="text-xs text-[#6b6b6b]">Nutella</code>
                <code className="text-xs text-[#6b6b6b]">Pabassinos Anice</code>
                <code className="text-xs text-[#6b6b6b]">Pabassinos Noci</code>
                <code className="text-xs text-[#6b6b6b]">Pane Carasau</code>
                <code className="text-xs text-[#6b6b6b]">Pesca Gianduia</code>
                <code className="text-xs text-[#6b6b6b]">Pistacchio</code>
                <code className="text-xs text-[#6b6b6b]">Pomodori e stracciatella</code>
                <code className="text-xs text-[#6b6b6b]">Salsiccia e Patate</code>
                <code className="text-xs text-[#6b6b6b]">Salsiccia Sarda e Pecorino</code>
              </div>
            </div>
          </div>
        </div>
      </NeumorphicCard>

      {/* Google Sheet Structure */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">📊 Struttura Google Sheet Richiesta</h2>
        <p className="text-[#9b9b9b] mb-4">
          Il foglio Google Sheets deve avere le seguenti colonne (i nomi devono corrispondere esattamente):
        </p>
        <div className="neumorphic-pressed p-4 rounded-xl overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#c1c1c1]">
                <th className="text-left p-2 text-[#8b7355]">store_name</th>
                <th className="text-left p-2 text-[#8b7355]">data_vendita</th>
                <th className="text-left p-2 text-[#8b7355]">Margherita</th>
                <th className="text-left p-2 text-[#8b7355]">Coca Cola 33cl</th>
                <th className="text-left p-2 text-[#8b7355]">...</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#d1d1d1]">
                <td className="p-2 text-[#6b6b6b]">Ticinese</td>
                <td className="p-2 text-[#6b6b6b]">2025-01-15</td>
                <td className="p-2 text-[#6b6b6b]">45</td>
                <td className="p-2 text-[#6b6b6b]">23</td>
                <td className="p-2 text-[#6b6b6b]">...</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 neumorphic-flat p-4 rounded-xl bg-blue-50">
          <p className="text-sm text-blue-700">
            💡 <strong>Tip:</strong> Il nome del negozio deve corrispondere ESATTAMENTE al nome configurato nel sistema.
            La data deve essere in formato YYYY-MM-DD (es. 2025-01-15).
          </p>
        </div>
      </NeumorphicCard>
    </div>
  );
}