
import { useState, useEffect } from "react";
import { ShoppingCart, Copy, CheckCircle, AlertCircle, Store, FileSpreadsheet, Key } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function ZapierProdottiVenduti() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState('');

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  useEffect(() => {
    const baseUrl = window.location.origin;
    setWebhookUrl(`${baseUrl}/api/functions/importProdottiVendutiFromZapier`);
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testWebhook = async () => {
    if (stores.length === 0) {
      setTestResult({
        success: false,
        message: 'Devi prima creare almeno un locale nella sezione Store Reviews'
      });
      return;
    }

    if (!webhookSecret) {
      setTestResult({
        success: false,
        message: 'Inserisci il Webhook Secret prima di testare'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const testData = {
        store_name: stores[0].name,
        data_vendita: '2025-01-15',
        'Margherita': '5',
        'Coca Cola 33cl': '3',
        'Acqua Naturale': '2',
        'Fregola': '1',
        'Ichnusa Classica': '4'
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': webhookSecret
        },
        body: JSON.stringify(testData)
      });

      const data = await response.json();

      if (!response.ok) {
        setTestResult({
          success: false,
          message: data.error || data.message || `HTTP ${response.status}`,
          data: data
        });
      } else {
        setTestResult({
          success: true,
          message: 'Webhook testato con successo! Il record di test è stato creato.',
          data: data
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Errore durante il test: ' + error.message,
        data: {
          error: error.message,
          hint: 'Verifica che la funzione sia deployata correttamente in Dashboard → Code → Functions → importProdottiVendutiFromZapier'
        }
      });
    }

    setTesting(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <ShoppingCart className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Configurazione Prodotti Venduti Import</h1>
        </div>
        <p className="text-[#9b9b9b]">Importa automaticamente i dati delle vendite giornaliere per prodotto da Google Sheets</p>
      </div>

      {/* Store Check */}
      {stores.length === 0 && (
        <NeumorphicCard className="p-6 border-2 border-red-300">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
            <div>
              <h3 className="font-bold text-red-700 mb-2">Attenzione: Nessun locale configurato</h3>
              <p className="text-red-600 mb-3">
                Prima di configurare Zapier, devi creare i tuoi locali nella sezione <strong>Store Reviews</strong>.
              </p>
            </div>
          </div>
        </NeumorphicCard>
      )}

      {/* Webhook Secret Setup */}
      <NeumorphicCard className="p-6 border-2 border-[#8b7355]">
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-6 h-6 text-[#8b7355]" />
          <h2 className="text-xl font-bold text-[#6b6b6b]">🔐 Step 1: Configura Webhook Secret</h2>
        </div>
        
        <div className="neumorphic-pressed p-4 rounded-xl mb-4">
          <p className="text-[#6b6b6b] mb-4">
            <strong>IMPORTANTE:</strong> Imposta un <strong>Webhook Secret</strong> dedicato per Prodotti Venduti.
          </p>
          
          <ol className="space-y-3 text-[#6b6b6b] mb-4">
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#8b7355]">1.</span>
              <span>Vai su <strong>Dashboard → Code → Secrets</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#8b7355]">2.</span>
              <span>Aggiungi un nuovo secret con nome: <code className="bg-white px-2 py-1 rounded">ZAPIER_PRODOTTI_VENDUTI_WEBHOOK_SECRET</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#8b7355]">3.</span>
              <span>Imposta un valore sicuro (es: <code className="bg-white px-2 py-1 rounded">prodotti_2025_secret_xyz123</code>)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#8b7355]">4.</span>
              <span>Copia lo stesso valore qui sotto per testare:</span>
            </li>
          </ol>

          <input
            type="password"
            placeholder="Incolla qui il tuo webhook secret..."
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
          />
        </div>
      </NeumorphicCard>

      {/* Available Stores */}
      {stores.length > 0 && (
        <NeumorphicCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Store className="w-5 h-5 text-[#8b7355]" />
            <h2 className="text-xl font-bold text-[#6b6b6b]">Locali Disponibili</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stores.map(store => (
              <div key={store.id} className="neumorphic-pressed p-4 rounded-xl">
                <p className="font-bold text-[#6b6b6b]">{store.name}</p>
                <p className="text-sm text-[#9b9b9b]">{store.address}</p>
              </div>
            ))}
          </div>
          <div className="neumorphic-flat p-4 rounded-xl mt-4">
            <p className="text-sm text-[#6b6b6b]">
              ⚠️ <strong>Importante:</strong> Il valore di <code className="bg-white px-2 py-1 rounded">store_name</code> in Zapier deve corrispondere <strong>esattamente</strong> al nome del locale.
            </p>
          </div>
        </NeumorphicCard>
      )}

      {/* Webhook URL */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShoppingCart className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-xl font-bold text-[#6b6b6b]">🔗 Step 2: URL Webhook</h2>
        </div>
        
        <div className="neumorphic-pressed p-4 rounded-xl mb-4">
          <div className="flex items-center gap-3">
            <code className="flex-1 text-sm text-[#6b6b6b] break-all">
              {webhookUrl || 'Caricamento...'}
            </code>
            <NeumorphicButton
              onClick={copyToClipboard}
              className="px-4 py-2"
            >
              {copied ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
            </NeumorphicButton>
          </div>
        </div>

        <NeumorphicButton
          onClick={testWebhook}
          disabled={testing || stores.length === 0 || !webhookSecret}
          variant="primary"
          className="w-full"
        >
          {testing ? 'Test in corso...' : 'Testa Webhook'}
        </NeumorphicButton>

        {testResult && (
          <div className={`mt-4 p-4 rounded-xl ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-start gap-3">
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {testResult.message}
                </p>
                {testResult.data && (
                  <pre className="mt-2 text-xs overflow-auto">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </NeumorphicCard>

      {/* Step by Step Guide */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileSpreadsheet className="w-6 h-6 text-[#8b7355]" />
          <h2 className="text-xl font-bold text-[#6b6b6b]">⚙️ Step 3: Guida Configurazione Zapier</h2>
        </div>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="neumorphic-flat p-5 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="neumorphic-pressed w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-[#8b7355]">1</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#6b6b6b] mb-2">Crea un nuovo Zap</h3>
                <p className="text-[#6b6b6b] mb-3">
                  Vai su <a href="https://zapier.com" target="_blank" rel="noopener noreferrer" className="text-[#8b7355] hover:underline">Zapier.com</a> e clicca su "Create Zap"
                </p>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="neumorphic-flat p-5 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="neumorphic-pressed w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-[#8b7355]">2</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#6b6b6b] mb-2">Configura il Trigger</h3>
                <ul className="space-y-2 text-[#6b6b6b]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#8b7355] mt-1">•</span>
                    <span><strong>App:</strong> Google Sheets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8b7355] mt-1">•</span>
                    <span><strong>Trigger Event:</strong> New Spreadsheet Row</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8b7355] mt-1">•</span>
                    <span><strong>Spreadsheet:</strong> Seleziona il tuo Google Sheet con i dati vendite</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8b7355] mt-1">•</span>
                    <span><strong>Worksheet:</strong> Seleziona il tab del locale (es. "Ticinese", "Lanino")</span>
                  </li>
                </ul>
                <div className="neumorphic-pressed p-3 rounded-lg mt-3">
                  <p className="text-sm text-[#6b6b6b]">
                    ℹ️ <strong>Nota:</strong> Dovrai creare uno Zap separato per ogni locale (ogni tab del Google Sheet)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="neumorphic-flat p-5 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="neumorphic-pressed w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-[#8b7355]">3</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#6b6b6b] mb-2">Configura l'Action</h3>
                <ul className="space-y-2 text-[#6b6b6b]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#8b7355] mt-1">•</span>
                    <span><strong>App:</strong> Webhooks by Zapier</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8b7355] mt-1">•</span>
                    <span><strong>Action Event:</strong> POST</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8b7355] mt-1">•</span>
                    <span><strong>URL:</strong> Copia l'URL qui sopra ☝️</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Step 4 - Settings */}
          <div className="neumorphic-flat p-5 rounded-xl border-2 border-[#8b7355]">
            <div className="flex items-start gap-4">
              <div className="neumorphic-pressed w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-[#8b7355]">4</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#6b6b6b] mb-3">⚠️ Impostazioni Webhook (IMPORTANTE)</h3>
                
                <div className="space-y-4">
                  <div className="neumorphic-pressed p-4 rounded-lg bg-yellow-50">
                    <p className="font-bold text-[#6b6b6b] mb-2">📌 Payload Type:</p>
                    <p className="text-[#6b6b6b]">Seleziona: <strong className="text-[#8b7355]">JSON</strong></p>
                  </div>

                  <div className="neumorphic-pressed p-4 rounded-lg bg-blue-50">
                    <p className="font-bold text-[#6b6b6b] mb-2">📌 Headers:</p>
                    <div className="bg-white rounded p-3 font-mono text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[#8b7355] font-bold">Key:</span>
                          <code className="ml-2 bg-gray-100 px-2 py-1 rounded">Content-Type</code>
                        </div>
                        <div>
                          <span className="text-[#8b7355] font-bold">Value:</span>
                          <code className="ml-2 bg-gray-100 px-2 py-1 rounded">application/json</code>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="neumorphic-pressed p-4 rounded-lg">
                    <p className="font-bold text-[#6b6b6b] mb-2">📌 Altre Impostazioni:</p>
                    <ul className="space-y-1 text-sm text-[#6b6b6b]">
                      <li>• <strong>Wrap Request In Array:</strong> No</li>
                      <li>• <strong>Unflatten:</strong> No</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5 - Field Mapping */}
          <div className="neumorphic-flat p-5 rounded-xl border-2 border-red-500">
            <div className="flex items-start gap-4">
              <div className="neumorphic-pressed w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-[#8b7355]">5</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#6b6b6b] mb-3">🗺️ Mappa i Campi (Data)</h3>
                <p className="text-[#6b6b6b] mb-3">
                  Nel campo <strong>Data</strong>, aggiungi questi campi:
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="neumorphic-pressed p-3 rounded-lg bg-red-50 border-2 border-red-400">
                    <div className="text-sm">
                      <span className="font-bold text-red-700 block mb-1">secret 🔐</span>
                      <span className="text-red-700">→ Scrivi manualmente il tuo <code className="bg-white px-2 py-1 rounded">ZAPIER_PRODOTTI_VENDUTI_WEBHOOK_SECRET</code></span>
                    </div>
                  </div>

                  <div className="neumorphic-pressed p-3 rounded-lg bg-yellow-50">
                    <div className="text-sm">
                      <span className="font-bold text-[#8b7355] block mb-1">store_name</span>
                      <span className="text-[#6b6b6b]">→ Scrivi manualmente il nome esatto del locale (es. "Ticinese")</span>
                    </div>
                  </div>

                  <div className="neumorphic-pressed p-3 rounded-lg bg-blue-50">
                    <div className="text-sm">
                      <span className="font-bold text-[#8b7355] block mb-1">data_vendita</span>
                      <span className="text-[#6b6b6b]">→ Mappa alla colonna Data del Google Sheet</span>
                    </div>
                  </div>
                </div>

                <div className="neumorphic-pressed p-4 rounded-lg bg-purple-50 mb-4">
                  <p className="text-sm font-bold text-purple-800 mb-3">🍕 Prodotti (mappa alle colonne del Google Sheet):</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    <div>• Acqua Frizzante</div>
                    <div>• Acqua Naturale</div>
                    <div>• Baione Cannonau</div>
                    <div>• Bottarga</div>
                    <div>• Capperi, olive e acciughe</div>
                    <div>• Cipolle caramellate e Gorgonzola</div>
                    <div>• Coca Cola 33cl</div>
                    <div>• Coca Cola Zero 33cl</div>
                    <div>• Contissa Vermentino</div>
                    <div>• Estathe 33cl</div>
                    <div>• Fanta 33cl</div>
                    <div>• Fregola</div>
                    <div>• Friarielli e Olive</div>
                    <div>• Gorgonzola e Radicchio</div>
                    <div>• Guttiau 70gr</div>
                    <div>• Guttiau Snack</div>
                    <div>• Ichnusa Ambra Limpida</div>
                    <div>• Ichnusa Classica</div>
                    <div>• Ichnusa Non Filtrata</div>
                    <div>• Malloreddus</div>
                    <div>• Malloreddus 4 sapori</div>
                    <div>• Margherita</div>
                    <div>• Nduja e stracciatella</div>
                    <div>• Nutella</div>
                    <div>• Pabassinos Anice</div>
                    <div>• Pabassinos Noci</div>
                    <div>• Pane Carasau</div>
                    <div>• Pesca Gianduia</div>
                    <div>• Pistacchio</div>
                    <div>• Pomodori e stracciatella</div>
                    <div>• Salsiccia e Patate</div>
                    <div>• Salsiccia Sarda e Pecorino</div>
                  </div>
                </div>

                <div className="neumorphic-flat p-3 rounded-lg mt-4 bg-yellow-50">
                  <p className="text-sm text-yellow-800">
                    ⚠️ <strong>Importante:</strong> I nomi dei prodotti devono corrispondere ESATTAMENTE (maiuscole, spazi, accentazione)
                  </p>
                </div>

                <div className="neumorphic-flat p-3 rounded-lg mt-4 bg-blue-50">
                  <p className="text-sm text-blue-800">
                    💡 Se un prodotto non è stato venduto, lascia il valore vuoto o metti 0
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 6 */}
          <div className="neumorphic-flat p-5 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="neumorphic-pressed w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-[#8b7355]">6</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#6b6b6b] mb-2">Testa e Pubblica</h3>
                <p className="text-[#6b6b6b] mb-3">
                  Clicca su "Test & Continue" in Zapier per testare l'integrazione, poi "Publish" per attivare lo Zap.
                </p>
                <div className="neumorphic-pressed p-3 rounded-lg">
                  <p className="text-sm text-[#6b6b6b]">
                    ✅ Ogni nuova riga aggiunta al Google Sheet verrà automaticamente importata!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </NeumorphicCard>

      {/* Example Google Sheet Structure */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-xl font-bold text-[#6b6b6b]">Struttura Google Sheet Richiesta</h2>
        </div>
        
        <div className="neumorphic-pressed p-4 rounded-xl mb-4">
          <p className="text-[#6b6b6b] mb-3">
            Il tuo Google Sheet deve avere queste colonne (nell'ordine che preferisci):
          </p>
          <div className="bg-white rounded-lg p-4 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-[#8b7355]">
                  <th className="text-left p-2 text-[#8b7355] font-bold">data_vendita</th>
                  <th className="text-left p-2 text-[#8b7355] font-bold">Margherita</th>
                  <th className="text-left p-2 text-[#8b7355] font-bold">Coca Cola 33cl</th>
                  <th className="text-left p-2 text-[#8b7355] font-bold">Acqua Naturale</th>
                  <th className="text-left p-2 text-[#8b7355] font-bold">...</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="p-2 text-[#6b6b6b]">2025-01-15</td>
                  <td className="p-2 text-[#6b6b6b]">45</td>
                  <td className="p-2 text-[#6b6b6b]">23</td>
                  <td className="p-2 text-[#6b6b6b]">15</td>
                  <td className="p-2 text-[#6b6b6b]">...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="neumorphic-flat p-4 rounded-xl space-y-2">
          <p className="text-sm text-[#6b6b6b]">
            📅 <strong>Formato Data:</strong> YYYY-MM-DD (esempio: 2025-01-15)
          </p>
          <p className="text-sm text-[#6b6b6b]">
            🔢 <strong>Formato Quantità:</strong> Numeri interi (esempio: 45)
          </p>
          <p className="text-sm text-[#6b6b6b]">
            📊 <strong>Ogni Tab:</strong> Rappresenta un locale diverso
          </p>
          <p className="text-sm text-[#6b6b6b]">
            🔄 <strong>Aggiornamenti:</strong> Se importi la stessa data per lo stesso locale, il record verrà <strong>aggiornato</strong> (non duplicato)
          </p>
        </div>
      </NeumorphicCard>

      {/* Troubleshooting */}
      <NeumorphicCard className="p-6 bg-yellow-50">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-yellow-700" />
          <div>
            <h3 className="font-bold text-yellow-800 mb-2">Risoluzione Errori</h3>
            <ol className="space-y-2 text-yellow-700">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span><strong>Secret configurato:</strong> Hai impostato ZAPIER_PRODOTTI_VENDUTI_WEBHOOK_SECRET nei secrets?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span><strong>store_name esatto:</strong> Il nome del locale deve essere identico a quello configurato</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span><strong>Formato data:</strong> Usa YYYY-MM-DD (es. 2025-01-15)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">4.</span>
                <span><strong>Nomi prodotti:</strong> Devono corrispondere ESATTAMENTE (maiuscole, spazi, virgole)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">5.</span>
                <span>Usa il pulsante <strong>"Testa Webhook"</strong> prima di configurare Zapier</span>
              </li>
            </ol>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}
