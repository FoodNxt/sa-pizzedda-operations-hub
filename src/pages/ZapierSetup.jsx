import { useState, useEffect } from "react";
import { Zap, Copy, CheckCircle, ExternalLink, AlertCircle, Store, FileSpreadsheet } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function ZapierSetup() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  useEffect(() => {
    // Get the webhook URL dynamically
    const baseUrl = window.location.origin;
    const appPath = window.location.pathname.split('/').slice(0, 2).join('/');
    setWebhookUrl(`${baseUrl}${appPath}/api/functions/importReviewFromZapier`);
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

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome_locale: stores[0].name,
          nome: 'Test Cliente',
          data_recensione: new Date().toLocaleDateString('it-IT'),
          voto: 5,
          commento: 'Test recensione da Zapier Setup'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          message: 'Webhook testato con successo! La recensione di test è stata creata.',
          data
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Errore durante il test',
          data
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Errore di connessione: ' + error.message
      });
    }

    setTesting(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Zap className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Configurazione Zapier</h1>
        </div>
        <p className="text-[#9b9b9b]">Importa automaticamente le recensioni da Google Sheets</p>
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
                Il webhook ha bisogno di associare le recensioni ai locali esistenti tramite il nome.
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
              ⚠️ <strong>Importante:</strong> Il nome del tab in Google Sheets deve corrispondere <strong>esattamente</strong> al nome del locale (maiuscole/minuscole incluse).
            </p>
          </div>
        </NeumorphicCard>
      )}

      {/* Webhook URL */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-xl font-bold text-[#6b6b6b]">URL Webhook</h2>
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
          disabled={testing || stores.length === 0}
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
          <h2 className="text-xl font-bold text-[#6b6b6b]">Guida Configurazione Zapier</h2>
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
                    <span><strong>Spreadsheet:</strong> Seleziona il tuo Google Sheet con le recensioni</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8b7355] mt-1">•</span>
                    <span><strong>Worksheet:</strong> Seleziona il tab del locale (es. "Locale Centro")</span>
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
                    <span><strong>URL:</strong> {webhookUrl ? 'Copia l\'URL qui sopra' : 'URL caricamento...'}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="neumorphic-flat p-5 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="neumorphic-pressed w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-[#8b7355]">4</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#6b6b6b] mb-3">Mappa i Campi (Data)</h3>
                <p className="text-[#6b6b6b] mb-3">
                  Nel campo <strong>Data</strong>, seleziona "Form" e aggiungi questi campi:
                </p>
                
                <div className="space-y-3">
                  <div className="neumorphic-pressed p-3 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="font-bold text-[#8b7355]">nome_locale</span>
                      <span className="text-[#6b6b6b]">→ Nome del tab/worksheet (es. "Locale Centro")</span>
                    </div>
                  </div>
                  
                  <div className="neumorphic-pressed p-3 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="font-bold text-[#8b7355]">nome</span>
                      <span className="text-[#6b6b6b]">→ Colonna "Nome" del Google Sheet</span>
                    </div>
                  </div>
                  
                  <div className="neumorphic-pressed p-3 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="font-bold text-[#8b7355]">data_recensione</span>
                      <span className="text-[#6b6b6b]">→ Colonna "Data Recensione"</span>
                    </div>
                  </div>
                  
                  <div className="neumorphic-pressed p-3 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="font-bold text-[#8b7355]">voto</span>
                      <span className="text-[#6b6b6b]">→ Colonna "Voto"</span>
                    </div>
                  </div>
                  
                  <div className="neumorphic-pressed p-3 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="font-bold text-[#8b7355]">commento</span>
                      <span className="text-[#6b6b6b]">→ Colonna "Commento"</span>
                    </div>
                  </div>
                </div>

                <div className="neumorphic-flat p-3 rounded-lg mt-3 bg-yellow-50">
                  <p className="text-sm text-[#6b6b6b]">
                    ⚠️ <strong>Importante:</strong> Il campo <strong>nome_locale</strong> deve essere il nome esatto del locale come configurato nell'app (vedi lista sopra)
                  </p>
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
                <p className="text-[#6b6b6b] mb-3">
                  Clicca su "Test & Continue" in Zapier per testare l'integrazione, poi "Publish" per attivare lo Zap.
                </p>
                <div className="neumorphic-pressed p-3 rounded-lg">
                  <p className="text-sm text-[#6b6b6b]">
                    ✅ Da questo momento, ogni nuova riga aggiunta al Google Sheet verrà automaticamente importata come recensione!
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
          <h2 className="text-xl font-bold text-[#6b6b6b]">Struttura Google Sheet</h2>
        </div>
        
        <div className="neumorphic-pressed p-4 rounded-xl mb-4">
          <p className="text-[#6b6b6b] mb-3">
            Il tuo Google Sheet deve avere questa struttura:
          </p>
          <div className="bg-white rounded-lg p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#8b7355]">
                  <th className="text-left p-2 text-[#8b7355] font-bold">Nome</th>
                  <th className="text-left p-2 text-[#8b7355] font-bold">Data Recensione</th>
                  <th className="text-left p-2 text-[#8b7355] font-bold">Voto</th>
                  <th className="text-left p-2 text-[#8b7355] font-bold">Commento</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="p-2 text-[#6b6b6b]">Mario Rossi</td>
                  <td className="p-2 text-[#6b6b6b]">15/01/2024</td>
                  <td className="p-2 text-[#6b6b6b]">5</td>
                  <td className="p-2 text-[#6b6b6b]">Ottima pizza, servizio eccellente!</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-2 text-[#6b6b6b]">Laura Bianchi</td>
                  <td className="p-2 text-[#6b6b6b]">16/01/2024</td>
                  <td className="p-2 text-[#6b6b6b]">4</td>
                  <td className="p-2 text-[#6b6b6b]">Molto buono, tornerò sicuramente</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="neumorphic-flat p-4 rounded-xl">
          <p className="text-sm text-[#6b6b6b]">
            📝 <strong>Ogni tab</strong> rappresenta un locale diverso e deve avere un nome che corrisponde esattamente al nome del locale nell'app.
          </p>
        </div>
      </NeumorphicCard>

      {/* Support */}
      <NeumorphicCard className="p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-[#8b7355] mt-1" />
          <div>
            <h3 className="font-bold text-[#6b6b6b] mb-2">Hai bisogno di aiuto?</h3>
            <p className="text-[#6b6b6b] mb-3">
              Se riscontri problemi durante la configurazione:
            </p>
            <ul className="space-y-2 text-[#6b6b6b]">
              <li className="flex items-start gap-2">
                <span className="text-[#8b7355]">1.</span>
                <span>Verifica che i nomi dei locali nell'app corrispondano esattamente ai nomi dei tab in Google Sheets</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#8b7355]">2.</span>
                <span>Usa il pulsante "Testa Webhook" sopra per verificare che il webhook funzioni</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#8b7355]">3.</span>
                <span>Controlla che le colonne del Google Sheet abbiano i nomi corretti</span>
              </li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}