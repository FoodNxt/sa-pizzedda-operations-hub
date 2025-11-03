
import { useState, useEffect } from "react";
import { useQuery } from '@tanstack/react-query'; // Assuming @tanstack/react-query is installed and used
import { ShoppingCart, Copy, CheckCircle, AlertCircle, FileSpreadsheet, Key, Store } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { base44 } from "@/api/base44Client";

export default function OrderItemsSetup() {
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
    setWebhookUrl(`${baseUrl}/api/functions/importOrderItemFromZapier`);
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testWebhook = async () => {
    if (!webhookSecret) {
      setTestResult({
        success: false,
        message: 'Inserisci il Webhook Secret prima di testare'
      });
      return;
    }

    if (stores.length === 0) {
      setTestResult({
        success: false,
        message: 'Devi prima creare almeno un locale nella sezione Store Reviews'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await base44.functions.invoke('importOrderItemFromZapier', {
        secret: webhookSecret,
        store_name: stores[0].name, // Added store_name from the first available store for testing
        itemId: 'TEST-' + Date.now(),
        billNumber: 'BILL-TEST-001',
        orderItemName: 'Pizza Margherita',
        finalPrice: 8.50,
        quantity: 1,
        vatRate: 10,
        saleTypeName: 'Asporto',
        modifiedDate: '01/12/2025 14:30:00',
        variation0_name: 'Extra Mozzarella',
        variation0_price: 1.50,
        variation0_quantity: 1
      });

      if (response.data.error) {
        setTestResult({
          success: false,
          message: response.data.error,
          data: response.data
        });
      } else {
        setTestResult({
          success: true,
          message: 'Webhook testato con successo! L\'OrderItem di test è stato creato.',
          data: response.data
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Errore durante il test: ' + error.message,
        data: {
          error: error.message,
          hint: 'Verifica che la funzione sia deployata in Dashboard → Code → Functions'
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
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Configurazione Zapier - Order Items</h1>
        </div>
        <p className="text-[#9b9b9b]">Importa automaticamente gli ordini dal tuo sistema POS</p>
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
              <p className="text-sm text-red-600">
                Il webhook ha bisogno di associare gli ordini ai locali esistenti tramite il nome.
              </p>
            </div>
          </div>
        </NeumorphicCard>
      )}

      {/* Available Stores */}
      {stores.length > 0 && (
        <NeumorphicCard className="p-6 border-2 border-[#8b7355]">
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
          <div className="neumorphic-flat p-4 rounded-xl mt-4 bg-yellow-50">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Importante:</strong> Dovrai creare uno <strong>Zap separato per ogni locale</strong> (o per ogni file Google Sheets). 
              Il valore di <code className="bg-white px-2 py-1 rounded">store_name</code> deve corrispondere <strong>esattamente</strong> al nome del locale (maiuscole/minuscole incluse).
            </p>
          </div>
        </NeumorphicCard>
      )}

      {/* Webhook Secret Setup */}
      <NeumorphicCard className="p-6 border-2 border-[#8b7355]">
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-6 h-6 text-[#8b7355]" />
          <h2 className="text-xl font-bold text-[#6b6b6b]">🔐 Step 1: Webhook Secret</h2>
        </div>
        
        <div className="neumorphic-pressed p-4 rounded-xl mb-4">
          <p className="text-[#6b6b6b] mb-4">
            Usa lo stesso <strong>ZAPIER_WEBHOOK_SECRET</strong> configurato per le recensioni, oppure creane uno nuovo.
          </p>
          
          <p className="text-sm text-[#9b9b9b] mb-4">
            Se non l'hai già fatto: Dashboard → Code → Secrets → <code className="bg-white px-2 py-1 rounded">ZAPIER_WEBHOOK_SECRET</code>
          </p>

          <input
            type="password"
            placeholder="Incolla qui il tuo webhook secret..."
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
          />
        </div>
      </NeumorphicCard>

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
            <NeumorphicButton onClick={copyToClipboard} className="px-4 py-2">
              {copied ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
            </NeumorphicButton>
          </div>
        </div>

        <NeumorphicButton
          onClick={testWebhook}
          disabled={testing || !webhookSecret}
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
                  <pre className="mt-2 text-xs overflow-auto max-h-40">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </NeumorphicCard>

      {/* Configuration Guide */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileSpreadsheet className="w-6 h-6 text-[#8b7355]" />
          <h2 className="text-xl font-bold text-[#6b6b6b]">⚙️ Step 3: Configurazione Zapier</h2>
        </div>

        <div className="neumorphic-flat p-4 rounded-xl bg-blue-50 mb-6">
          <p className="text-sm text-blue-800">
            📁 <strong>Importante:</strong> Se hai <strong>un file Google Sheets per ogni locale</strong>, dovrai creare uno Zap separato per ogni file. 
            Se invece hai <strong>un file con tab diversi per ogni locale</strong>, dovrai creare uno Zap per ogni tab.
          </p>
        </div>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="neumorphic-flat p-5 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="neumorphic-pressed w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-[#8b7355]">1</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#6b6b6b] mb-2">Crea nuovo Zap</h3>
                <p className="text-[#6b6b6b]">
                  Vai su Zapier.com e clicca "Create Zap"
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
                <h3 className="font-bold text-[#6b6b6b] mb-2">Configura Trigger</h3>
                <ul className="space-y-1 text-[#6b6b6b]">
                  <li>• <strong>App:</strong> Google Sheets</li>
                  <li>• <strong>Trigger:</strong> New Spreadsheet Row</li>
                  <li>• <strong>Spreadsheet:</strong> Il file Google Sheet specifico per il locale (es. "Ordini_Ticinese")</li>
                  <li>• <strong>Worksheet:</strong> Seleziona il foglio corretto</li>
                </ul>
                <div className="neumorphic-pressed p-3 rounded-lg mt-3 bg-yellow-50">
                  <p className="text-sm text-yellow-800">
                    💡 <strong>Nota:</strong> Se hai più locali, dovrai ripetere questa configurazione creando uno Zap per ogni file/locale.
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
                <h3 className="font-bold text-[#6b6b6b] mb-2">Configura Action</h3>
                <ul className="space-y-1 text-[#6b6b6b]">
                  <li>• <strong>App:</strong> Webhooks by Zapier</li>
                  <li>• <strong>Action:</strong> POST</li>
                  <li>• <strong>URL:</strong> Copia l'URL qui sopra</li>
                  <li>• <strong>Payload Type:</strong> JSON</li>
                  <li>• <strong>Header:</strong> Content-Type = application/json</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Step 4 - Field Mapping UPDATED */}
          <div className="neumorphic-flat p-5 rounded-xl border-2 border-[#8b7355]">
            <div className="flex items-start gap-4">
              <div className="neumorphic-pressed w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-[#8b7355]">4</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#6b6b6b] mb-3">🔐 Mappa i Campi (Data)</h3>
                
                <div className="space-y-3">
                  <div className="neumorphic-pressed p-4 rounded-lg bg-red-50 mb-4">
                    <p className="font-bold text-red-700 mb-3">⚠️ Campi OBBLIGATORI:</p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-bold text-red-700">secret</span>
                        <span className="text-red-700"> → Il tuo ZAPIER_WEBHOOK_SECRET</span>
                      </div>
                      <div className="border-t border-red-300 pt-2">
                        <span className="font-bold text-red-700">store_name 🏪</span>
                        <span className="text-red-700"> → <strong>NUOVO!</strong> Scrivi manualmente il nome esatto del locale</span>
                        <p className="text-xs text-red-600 mt-1 ml-4">
                          Esempio: "Ticinese" oppure "Lanino" (vedi lista "Locali Disponibili" sopra)
                        </p>
                      </div>
                      <div>
                        <span className="font-bold text-red-700">itemId</span>
                        <span className="text-red-700"> → Colonna "itemId" del Google Sheet</span>
                      </div>
                      <div>
                        <span className="font-bold text-red-700">billNumber</span>
                        <span className="text-red-700"> → Colonna "billNumber"</span>
                      </div>
                      <div>
                        <span className="font-bold text-red-700">orderItemName</span>
                        <span className="text-red-700"> → Colonna "orderItemName"</span>
                      </div>
                    </div>
                  </div>

                  <div className="neumorphic-pressed p-4 rounded-lg bg-blue-50">
                    <p className="font-bold text-blue-700 mb-2">📋 Campi Opzionali Principali:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-700">
                      <div>• finalPrice</div>
                      <div>• finalPriceWithSessionDiscountsAndSurcharges</div>
                      <div>• modifiedBy</div>
                      <div>• modifiedDate</div>
                      <div>• order</div>
                      <div>• quantity</div>
                      <div>• vatRate</div>
                      <div>• deviceCode</div>
                      <div>• sourceApp</div>
                      <div>• sourceType</div>
                      <div>• moneyTypeName</div>
                      <div>• saleTypeName</div>
                      <div>• variation0_name, variation0_price...</div>
                      <div>• variation1_name, variation1_price...</div>
                      <div>• ... fino a variation8</div>
                    </div>
                  </div>

                  <div className="neumorphic-flat p-4 rounded-xl bg-yellow-50">
                    <p className="text-sm text-yellow-800">
                      🚨 <strong>CRUCIALE:</strong> Il campo <code className="bg-white px-2 py-1 rounded">store_name</code> è OBBLIGATORIO e deve contenere il nome esatto del locale come appare nella lista "Locali Disponibili"!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="neumorphic-flat p-5 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="neumorphic-pressed w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-[#8b7355]">5</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#6b6b6b] mb-2">Testa e Pubblica</h3>
                <p className="text-[#6b6b6b]">
                  Clicca "Test & Continue" in Zapier, poi "Publish". Ogni nuova riga nel Google Sheet sarà importata automaticamente!
                </p>
              </div>
            </div>
          </div>
        </div>
      </NeumorphicCard>

      {/* Google Sheet Structure */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-xl font-bold text-[#6b6b6b]">Struttura Google Sheet</h2>
        </div>
        
        <div className="neumorphic-pressed p-4 rounded-xl mb-4">
          <p className="text-[#6b6b6b] mb-3">
            Ogni file Google Sheet (uno per locale) deve avere le seguenti colonne minime:
          </p>
          <div className="bg-white rounded-lg p-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-[#8b7355]">
                  <th className="text-left p-2 text-[#8b7355]">itemId</th>
                  <th className="text-left p-2 text-[#8b7355]">billNumber</th>
                  <th className="text-left p-2 text-[#8b7355]">orderItemName</th>
                  <th className="text-left p-2 text-[#8b7355]">finalPrice</th>
                  <th className="text-left p-2 text-[#8b7355]">quantity</th>
                  <th className="text-left p-2 text-[#8b7355]">...</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="p-2 text-[#6b6b6b]">ITEM-001</td>
                  <td className="p-2 text-[#6b6b6b]">BILL-12345</td>
                  <td className="p-2 text-[#6b6b6b]">Pizza Margherita</td>
                  <td className="p-2 text-[#6b6b6b]">8.50</td>
                  <td className="p-2 text-[#6b6b6b]">2</td>
                  <td className="p-2 text-[#6b6b6b]">...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="neumorphic-flat p-4 rounded-xl space-y-2">
          <p className="text-sm text-[#6b6b6b]">
            💡 <strong>Setup consigliato:</strong>
          </p>
          <ul className="text-sm text-[#6b6b6b] ml-4 space-y-1">
            <li>• <strong>File separati:</strong> "Ordini_Ticinese.xlsx", "Ordini_Lanino.xlsx", ecc.</li>
            <li>• <strong>Oppure tab separati:</strong> Un file "Ordini.xlsx" con tab "Ticinese", "Lanino", ecc.</li>
            <li>• Uno Zap per ogni file/tab che specifica il <code className="bg-white px-2 py-1 rounded">store_name</code> corretto</li>
          </ul>
          <p className="text-sm text-[#6b6b6b] mt-3">
            📊 <strong>Nota:</strong> Il nome del locale NON va nel Google Sheet, ma va specificato manualmente in Zapier nel campo <code className="bg-white px-2 py-1 rounded">store_name</code>
          </p>
        </div>
      </NeumorphicCard>
    </div>
  );
}
