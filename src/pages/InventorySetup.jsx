
import { useState, useEffect } from "react";
import { useQuery } from '@tanstack/react-query';
import { Package, Copy, CheckCircle, AlertCircle, FileSpreadsheet, Key, Store } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { base44 } from "@/api/base44Client";

export default function InventorySetup() {
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
    setWebhookUrl(`${baseUrl}/api/functions/importInventoryFromZapier`);
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
      const response = await base44.functions.invoke('importInventoryFromZapier', {
        secret: webhookSecret,
        store_name: stores[0].name,
        data: '01/01/2025',
        farina_semola_sacchi: 10,
        lievito_pacchi: 5,
        mozzarella_confezioni: 20,
        coca_cola: 3,
        ichnusa_classica: 2
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
          message: `Webhook testato con successo! Record di inventario test creato per ${stores[0].name}`,
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
          <Package className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Configurazione Zapier - Inventario</h1>
        </div>
        <p className="text-[#9b9b9b]">Importa automaticamente i dati di inventario da Google Sheets</p>
      </div>

      {/* Setup Options */}
      <NeumorphicCard className="p-6 border-2 border-blue-500">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-bold text-blue-700 mb-2">📋 Hai Google Sheet Separati per Locale?</h3>
            <p className="text-blue-600 mb-3">
              Perfetto! La configurazione funziona benissimo con entrambi gli scenari:
            </p>
            <div className="space-y-3">
              <div className="neumorphic-pressed p-4 rounded-lg bg-blue-50">
                <p className="font-bold text-blue-700 mb-2">Scenario 1: Google Sheet separati (il tuo caso)</p>
                <ul className="text-sm text-blue-700 space-y-1 ml-4">
                  <li>• <strong>File 1:</strong> Inventario Ticinese.xlsx</li>
                  <li>• <strong>File 2:</strong> Inventario Lanino.xlsx</li>
                  <li>• <strong>Zap necessari:</strong> 2 (uno per file)</li>
                </ul>
              </div>
              <div className="neumorphic-pressed p-4 rounded-lg bg-green-50">
                <p className="font-bold text-green-700 mb-2">Scenario 2: Un file con più tab</p>
                <ul className="text-sm text-green-700 space-y-1 ml-4">
                  <li>• <strong>File unico:</strong> Inventario.xlsx</li>
                  <li>• <strong>Tab 1:</strong> Ticinese</li>
                  <li>• <strong>Tab 2:</strong> Lanino</li>
                  <li>• <strong>Zap necessari:</strong> 2 (uno per tab)</li>
                </ul>
              </div>
            </div>
            <div className="neumorphic-flat p-3 rounded-lg mt-3 bg-blue-50">
              <p className="text-sm text-blue-800">
                💡 <strong>In entrambi i casi:</strong> Serve uno Zap per ogni locale, e in ogni Zap devi specificare manualmente il <code className="bg-white px-2 py-1 rounded">store_name</code>
              </p>
            </div>
          </div>
        </div>
      </NeumorphicCard>

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

      {/* Webhook Secret Setup */}
      <NeumorphicCard className="p-6 border-2 border-[#8b7355]">
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-6 h-6 text-[#8b7355]" />
          <h2 className="text-xl font-bold text-[#6b6b6b]">🔐 Step 1: Webhook Secret</h2>
        </div>
        
        <div className="neumorphic-pressed p-4 rounded-xl mb-4">
          <p className="text-[#6b6b6b] mb-4">
            <strong>IMPORTANTE:</strong> Configura un secret dedicato per l'inventario.
          </p>
          
          <p className="text-sm text-[#9b9b9b] mb-4">
            Vai su: Dashboard → Code → Secrets → Aggiungi <code className="bg-white px-2 py-1 rounded">ZAPIER_INVENTORY_WEBHOOK_SECRET</code>
          </p>

          <input
            type="password"
            placeholder="Incolla qui il tuo ZAPIER_INVENTORY_WEBHOOK_SECRET..."
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
          />
        </div>
      </NeumorphicCard>

      {/* Webhook URL */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Package className="w-5 h-5 text-[#8b7355]" />
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

        <div className="space-y-6">
          {/* Steps */}
          <div className="neumorphic-flat p-5 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="neumorphic-pressed w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-[#8b7355]">1</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#6b6b6b] mb-2">Crea nuovo Zap (uno per locale)</h3>
                <p className="text-[#6b6b6b] mb-2">Vai su Zapier.com e clicca "Create Zap"</p>
                <div className="neumorphic-pressed p-3 rounded-lg bg-yellow-50">
                  <p className="text-sm text-yellow-800">
                    ⚠️ <strong>IMPORTANTE:</strong> Devi creare uno Zap SEPARATO per ogni locale (ogni Google Sheet o ogni tab)
                  </p>
                </div>
              </div>
            </div>
          </div>

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
                </ul>
                
                <div className="neumorphic-pressed p-3 rounded-lg mt-3 bg-blue-50">
                  <p className="font-bold text-blue-700 mb-2">Se hai Google Sheet SEPARATI (uno per locale):</p>
                  <ul className="text-sm text-blue-700 space-y-1 ml-4">
                    <li>• <strong>Spreadsheet:</strong> Seleziona il file specifico del locale (es. "Inventario Ticinese")</li>
                    <li>• <strong>Worksheet:</strong> Seleziona il primo tab (di solito "Sheet1" o "Inventario")</li>
                  </ul>
                </div>

                <div className="neumorphic-pressed p-3 rounded-lg mt-3 bg-green-50">
                  <p className="font-bold text-green-700 mb-2">Se hai UN file con più TAB:</p>
                  <ul className="text-sm text-green-700 space-y-1 ml-4">
                    <li>• <strong>Spreadsheet:</strong> Seleziona il file "Inventario" unico</li>
                    <li>• <strong>Worksheet:</strong> Seleziona il tab specifico del locale (es. "Ticinese")</li>
                  </ul>
                </div>

                <div className="neumorphic-flat p-3 rounded-lg mt-3">
                  <p className="text-sm text-[#6b6b6b]">
                    ℹ️ In entrambi i casi, dovrai ripetere questa configurazione creando Zap separati per ogni locale
                  </p>
                </div>
              </div>
            </div>
          </div>

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

          {/* Field Mapping - Diviso in 3 sezioni */}
          <div className="neumorphic-flat p-5 rounded-xl border-2 border-[#8b7355]">
            <div className="flex items-start gap-4">
              <div className="neumorphic-pressed w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-[#8b7355]">4</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#6b6b6b] mb-3">🔐 Mappa i Campi (Data)</h3>
                
                {/* Campi Obbligatori */}
                <div className="neumorphic-pressed p-4 rounded-lg bg-red-50 mb-4">
                  <p className="font-bold text-red-700 mb-3">⚠️ Campi OBBLIGATORI:</p>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-red-700">• secret</span>
                      <span className="text-red-700">→ Il tuo ZAPIER_INVENTORY_WEBHOOK_SECRET (scrivi manualmente)</span>
                    </div>
                    <div className="border-t border-red-300 pt-3">
                      <span className="font-bold text-red-700">• store_name 🏪</span>
                      <span className="text-red-700 block mt-1">→ <strong>SCRIVI MANUALMENTE</strong> il nome esatto del locale</span>
                      <div className="mt-2 ml-4 space-y-1 text-xs">
                        <div>✓ Per il file/tab di Ticinese → scrivi: <code className="bg-white px-2 py-1 rounded">Ticinese</code></div>
                        <div>✓ Per il file/tab di Lanino → scrivi: <code className="bg-white px-2 py-1 rounded">Lanino</code></div>
                      </div>
                      <div className="mt-2 bg-red-100 p-2 rounded">
                        <p className="text-xs text-red-800">
                          🚨 <strong>NON mappare</strong> questo campo a una colonna del Google Sheet! Va scritto manualmente diverso per ogni Zap!
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-red-700">• data</span>
                      <span className="text-red-700">→ Colonna "Data" del Google Sheet</span>
                    </div>
                  </div>
                </div>

                {/* Sezione 1: Ingredienti Base */}
                <div className="neumorphic-pressed p-4 rounded-lg bg-blue-50 mb-3">
                  <p className="font-bold text-blue-700 mb-2">📦 Ingredienti Base:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-blue-700">
                    <div>• farina_semola_sacchi</div>
                    <div>• farina_verde</div>
                    <div>• lievito_pacchi</div>
                    <div>• sugo_latte</div>
                    <div>• mozzarella_confezioni</div>
                    <div>• sale_pacchi_1kg</div>
                  </div>
                </div>

                {/* Sezione 2: Condimenti */}
                <div className="neumorphic-pressed p-4 rounded-lg bg-green-50 mb-3">
                  <p className="font-bold text-green-700 mb-2">🍅 Condimenti e Salse:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-green-700">
                    <div>• origano_barattoli</div>
                    <div>• capperi_barattoli</div>
                    <div>• alici_barattoli</div>
                    <div>• olive_barattoli</div>
                    <div>• stracciatella_250g</div>
                    <div>• nduja_barattoli</div>
                    <div>• pistacchio_barattoli</div>
                    <div>• nutella_barattoli</div>
                    <div>• patate_grammi</div>
                    <div>• crema_gorgonzola_grammi</div>
                    <div>• salsiccia_grammi</div>
                    <div>• crema_pecorino_grammi</div>
                    <div>• friarielli_barattoli</div>
                    <div>• cipolle_barattoli</div>
                    <div>• radicchio_barattoli</div>
                    <div>• pomodorini_barattoli</div>
                    <div>• mascarpone_500g</div>
                    <div>• besciamella_500g</div>
                    <div>• sugo_linea_grammi</div>
                    <div>• mozzarella_linea_grammi</div>
                    <div>• pesca_gianduia</div>
                    <div>• pabassinos_anice</div>
                    <div>• pabassinos_noci</div>
                  </div>
                </div>

                {/* Sezione 3: Bevande e Pulizia */}
                <div className="neumorphic-pressed p-4 rounded-lg bg-yellow-50 mb-3">
                  <p className="font-bold text-yellow-700 mb-2">🥤 Bevande e Prodotti per Pulizia:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-yellow-700">
                    <div>• detersivo_piatti</div>
                    <div>• buste_spazzatura_gialle</div>
                    <div>• buste_spazzatura_umido</div>
                    <div>• rotoli_scottex</div>
                    <div>• coca_cola</div>
                    <div>• coca_cola_zero</div>
                    <div>• acqua_naturale_50cl</div>
                    <div>• acqua_frizzante_50cl</div>
                    <div>• fanta</div>
                    <div>• the_limone</div>
                    <div>• ichnusa_classica</div>
                    <div>• ichnusa_non_filtrata</div>
                  </div>
                </div>

                <div className="neumorphic-flat p-3 rounded-lg bg-blue-50">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Nota:</strong> Tutti i campi dei prodotti sono opzionali. Mappa solo quelli presenti nel tuo Google Sheet.
                  </p>
                </div>
              </div>
            </div>
          </div>

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
            Il Google Sheet deve avere le colonne esattamente come nell'esempio fornito. Ecco le prime colonne:
          </p>
          <div className="bg-white rounded-lg p-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-[#8b7355]">
                  <th className="text-left p-2 text-[#8b7355]">Data</th>
                  <th className="text-left p-2 text-[#8b7355]">Farina di Semola (Sacchi 25Kg)</th>
                  <th className="text-left p-2 text-[#8b7355]">Farina verde</th>
                  <th className="text-left p-2 text-[#8b7355]">Lievito (pacchi)</th>
                  <th className="text-left p-2 text-[#8b7355]">...</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="p-2 text-[#6b6b6b]">01/01/2025</td>
                  <td className="p-2 text-[#6b6b6b]">15</td>
                  <td className="p-2 text-[#6b6b6b]">3</td>
                  <td className="p-2 text-[#6b6b6b]">10</td>
                  <td className="p-2 text-[#6b6b6b]">...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="neumorphic-flat p-4 rounded-xl space-y-3">
          <p className="text-sm text-[#6b6b6b]">
            <strong>Setup con Google Sheet separati (il tuo caso):</strong>
          </p>
          <ul className="text-sm text-[#6b6b6b] ml-4 space-y-2">
            <li>
              📄 <strong>Inventario Ticinese.xlsx</strong>
              <div className="ml-4 mt-1 text-xs text-[#9b9b9b]">
                → Crea Zap #1, specifica <code className="bg-white px-2 py-1 rounded">store_name = "Ticinese"</code>
              </div>
            </li>
            <li>
              📄 <strong>Inventario Lanino.xlsx</strong>
              <div className="ml-4 mt-1 text-xs text-[#9b9b9b]">
                → Crea Zap #2, specifica <code className="bg-white px-2 py-1 rounded">store_name = "Lanino"</code>
              </div>
            </li>
          </ul>

          <div className="border-t border-[#c1c1c1] pt-3 mt-3">
            <p className="text-sm text-[#6b6b6b]">
              <strong>Setup alternativo con un file e più tab:</strong>
            </p>
            <ul className="text-sm text-[#6b6b6b] ml-4 space-y-2 mt-2">
              <li>
                📄 <strong>Inventario.xlsx</strong>
                <div className="ml-4 mt-1 text-xs text-[#9b9b9b]">
                  → Tab "Ticinese" → Crea Zap #1, specifica <code className="bg-white px-2 py-1 rounded">store_name = "Ticinese"</code>
                </div>
                <div className="ml-4 mt-1 text-xs text-[#9b9b9b]">
                  → Tab "Lanino" → Crea Zap #2, specifica <code className="bg-white px-2 py-1 rounded">store_name = "Lanino"</code>
                </div>
              </li>
            </ul>
          </div>

          <div className="neumorphic-pressed p-3 rounded-lg bg-blue-50 mt-3">
            <p className="text-sm text-blue-800">
              💡 <strong>Riepilogo:</strong>
            </p>
            <ul className="text-xs text-blue-700 ml-4 mt-2 space-y-1">
              <li>✓ Ogni Google Sheet (o tab) = un locale</li>
              <li>✓ Ogni locale = uno Zap separato</li>
              <li>✓ In ogni Zap: specifica manualmente il <code className="bg-white px-1 rounded">store_name</code> corretto</li>
              <li>✓ Il <code className="bg-white px-1 rounded">store_name</code> NON va nel Google Sheet, solo in Zapier!</li>
            </ul>
          </div>

          <p className="text-sm text-[#6b6b6b] mt-3">
            📅 <strong>Formato Data:</strong> DD/MM/YYYY (esempio: 15/01/2025)
          </p>
          <p className="text-sm text-[#6b6b6b]">
            🔢 <strong>Valori numerici:</strong> Inserisci solo numeri (es: 10, 5.5, 250)
          </p>
        </div>
      </NeumorphicCard>
    </div>
  );
}
