import React, { useState } from "react";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { Copy, Check, Zap, AlertCircle } from 'lucide-react';
import ProtectedPage from "../components/ProtectedPage";

export default function ZapierSconti() {
  const [copied, setCopied] = useState(false);
  
  const webhookUrl = `${window.location.origin}/api/functions/importScontiFromZapier`;
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ProtectedPage pageName="ZapierSconti">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Zapier Sconti - Guida Setup</h1>
          <p className="text-slate-500">Configura l'integrazione Zapier per importare automaticamente i dati degli sconti</p>
        </div>

        <NeumorphicCard className="p-6">
          <div className="flex items-start gap-4 mb-6 bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500">
            <Zap className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-blue-900 mb-1">Come Funziona</h3>
              <p className="text-sm text-blue-800">
                Questa integrazione permette di caricare automaticamente i dati degli sconti dal tuo foglio Google Sheets tramite Zapier.
                Zapier leggerà ogni nuova riga del foglio, processerà i dati e li invierà alla tua app.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Step 1 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                  1
                </div>
                <h2 className="text-xl font-bold text-slate-800">Verifica il Secret</h2>
              </div>
              <div className="ml-11 space-y-2">
                <p className="text-slate-600">
                  Assicurati che il secret <code className="bg-slate-100 px-2 py-1 rounded text-sm">ZAPIER_SCONTI_WEBHOOK_SECRET</code> sia configurato nelle impostazioni dell'app.
                  Questo secret viene usato per autenticare le richieste da Zapier.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                  2
                </div>
                <h2 className="text-xl font-bold text-slate-800">Crea un nuovo Zap su Zapier</h2>
              </div>
              <div className="ml-11 space-y-3">
                <p className="text-slate-600 mb-3">Vai su <a href="https://zapier.com" target="_blank" className="text-blue-600 underline">zapier.com</a> e crea un nuovo Zap.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                  3
                </div>
                <h2 className="text-xl font-bold text-slate-800">Configura il Trigger</h2>
              </div>
              <div className="ml-11 space-y-3">
                <div className="neumorphic-pressed p-4 rounded-xl bg-slate-50">
                  <p className="font-medium text-slate-800 mb-2">🔹 Trigger App: <span className="text-blue-600">Google Sheets</span></p>
                  <p className="font-medium text-slate-800 mb-2">🔹 Trigger Event: <span className="text-blue-600">New or Updated Spreadsheet Row</span></p>
                  <p className="text-sm text-slate-600 mt-2">Collega il tuo account Google Sheets e seleziona il foglio che contiene i dati degli sconti. Ogni nuova riga aggiunta verrà automaticamente importata.</p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                  5
                </div>
                <h2 className="text-xl font-bold text-slate-800">Configura l'Action - Webhooks</h2>
              </div>
              <div className="ml-11 space-y-3">
                <p className="text-slate-600 mb-3">Aggiungi un'azione per inviare i dati alla tua app:</p>
                <div className="neumorphic-pressed p-4 rounded-xl bg-slate-50 space-y-3">
                  <div>
                    <p className="font-medium text-slate-800 mb-2">🔹 Action App: <span className="text-blue-600">Webhooks by Zapier</span></p>
                    <p className="font-medium text-slate-800 mb-2">🔹 Action Event: <span className="text-blue-600">POST</span></p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-bold text-slate-700 mb-2">URL:</p>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-white px-3 py-2 rounded-lg text-sm text-slate-700 border border-slate-200 overflow-x-auto">
                        {webhookUrl}
                      </code>
                      <button
                        onClick={() => copyToClipboard(webhookUrl)}
                        className="nav-button px-3 py-2 rounded-lg hover:bg-blue-50 flex-shrink-0"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-blue-600" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-700 mb-2">Payload Type: <span className="text-blue-600">JSON</span></p>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-700 mb-2">Data (mappatura campi):</p>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs font-mono space-y-1">
                      <p>secret: <span className="text-orange-600">[Il tuo ZAPIER_SCONTI_WEBHOOK_SECRET]</span></p>
                      <p>order_date: <span className="text-blue-600">[Colonna DATA in formato YYYY-MM-DD]</span></p>
                      <p className="text-red-600 font-bold">⚠️ channel: <span className="text-red-600">[Colonna NOME STORE come testo - es. "Ticinese", "Lanino"]</span></p>
                      <p>sourceApp_glovo: <span className="text-blue-600">[Colonna numerica Glovo]</span></p>
                      <p>sourceApp_deliveroo: <span className="text-blue-600">[Colonna numerica Deliveroo]</span></p>
                      <p>sourceApp_justeat: <span className="text-blue-600">[Colonna numerica JustEat]</span></p>
                      <p>sourceApp_onlineordering: <span className="text-blue-600">[Colonna numerica OnlineOrdering]</span></p>
                      <p>sourceApp_ordertable: <span className="text-blue-600">[Colonna numerica OrderTable]</span></p>
                      <p>sourceApp_tabesto: <span className="text-blue-600">[Colonna numerica Tabesto]</span></p>
                      <p>sourceApp_deliverect: <span className="text-blue-600">[Colonna numerica Deliverect]</span></p>
                      <p>sourceApp_store: <span className="text-blue-600">[Colonna numerica Store]</span></p>
                      <p>sourceType_delivery: <span className="text-blue-600">[Colonna numerica Delivery]</span></p>
                      <p>sourceType_takeaway: <span className="text-blue-600">[Colonna numerica Takeaway]</span></p>
                      <p>sourceType_takeawayOnSite: <span className="text-blue-600">[Colonna numerica TakeawayOnSite]</span></p>
                      <p>sourceType_store: <span className="text-blue-600">[Colonna numerica Store (tipo)]</span></p>
                      <p>moneyType_bancomat: <span className="text-blue-600">[Colonna numerica Bancomat]</span></p>
                      <p>moneyType_cash: <span className="text-blue-600">[Colonna numerica Contanti]</span></p>
                      <p>moneyType_online: <span className="text-blue-600">[Colonna numerica Online]</span></p>
                      <p>moneyType_satispay: <span className="text-blue-600">[Colonna numerica Satispay]</span></p>
                      <p>moneyType_credit_card: <span className="text-blue-600">[Colonna numerica Carta]</span></p>
                      <p>moneyType_fidelity_card_points: <span className="text-blue-600">[Colonna numerica Punti Fidelity]</span></p>
                    </div>
                    <div className="mt-3 bg-red-50 p-3 rounded-lg border-l-4 border-red-500">
                      <p className="text-sm text-red-800 font-bold mb-2">
                        ⚠️ ERRORE COMUNE DA EVITARE:
                      </p>
                      <ul className="text-sm text-red-800 list-disc ml-5 space-y-1">
                        <li>Verifica che il campo <code className="bg-red-100 px-1 rounded">channel</code> sia mappato a una colonna TESTUALE con il nome dello store (es. "Ticinese")</li>
                        <li>Se ricevi numeri nel campo "Store" nella tabella finale, significa che hai mappato channel a una colonna numerica per errore</li>
                        <li>Controlla l'ordine delle colonne nel foglio Google Sheets e assicurati che ogni campo Zapier punti alla colonna corretta</li>
                      </ul>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 bg-yellow-50 p-2 rounded">
                      ⚠️ <strong>Nota:</strong> Il campo <code>total_discount_price</code> non è più richiesto e viene calcolato automaticamente come somma di tutti i campi source*, money*, e type*.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 6 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                  6
                </div>
                <h2 className="text-xl font-bold text-slate-800">Testa e Attiva lo Zap</h2>
              </div>
              <div className="ml-11 space-y-2">
                <p className="text-slate-600">
                  1. Clicca su "Test & Continue" per testare la connessione
                </p>
                <p className="text-slate-600">
                  2. Se il test ha successo, attiva lo Zap
                </p>
                <p className="text-slate-600">
                  3. Carica un file CSV nella cartella configurata e verifica che i dati vengano importati correttamente nella pagina <strong>Financials → Sconti</strong>
                </p>
              </div>
            </div>

            {/* Formato Google Sheets */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="w-6 h-6 text-orange-600" />
                <h2 className="text-xl font-bold text-slate-800">Formato Google Sheets Richiesto</h2>
              </div>
              <div className="ml-9">
                <p className="text-slate-600 mb-3">Il foglio Google Sheets deve avere le seguenti colonne (nell'ordine che preferisci):</p>
                <div className="neumorphic-pressed p-4 rounded-xl bg-slate-50">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="space-y-1">
                      <p className="font-mono text-slate-700">• order_date <span className="text-red-600">*</span></p>
                      <p className="font-mono text-slate-700">• channel <span className="text-red-600">*</span></p>
                      <p className="font-mono text-slate-700">• sourceApp_glovo</p>
                      <p className="font-mono text-slate-700">• sourceApp_deliveroo</p>
                      <p className="font-mono text-slate-700">• sourceApp_justeat</p>
                      <p className="font-mono text-slate-700">• sourceApp_onlineordering</p>
                      <p className="font-mono text-slate-700">• sourceApp_ordertable</p>
                      <p className="font-mono text-slate-700">• sourceApp_tabesto</p>
                      <p className="font-mono text-slate-700">• sourceApp_deliverect</p>
                      <p className="font-mono text-slate-700">• sourceApp_store</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-mono text-slate-700">• sourceType_delivery</p>
                      <p className="font-mono text-slate-700">• sourceType_takeaway</p>
                      <p className="font-mono text-slate-700">• sourceType_takeawayOnSite</p>
                      <p className="font-mono text-slate-700">• sourceType_store</p>
                      <p className="font-mono text-slate-700">• moneyType_bancomat</p>
                      <p className="font-mono text-slate-700">• moneyType_cash</p>
                      <p className="font-mono text-slate-700">• moneyType_online</p>
                      <p className="font-mono text-slate-700">• moneyType_satispay</p>
                      <p className="font-mono text-slate-700">• moneyType_credit_card</p>
                      <p className="font-mono text-slate-700">• moneyType_fidelity_card_points</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-500">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong>
                  </p>
                  <ul className="text-sm text-yellow-800 list-disc ml-5 mt-2 space-y-1">
                    <li>Il campo <code>order_date</code> deve essere in formato YYYY-MM-DD (es. 2026-01-15)</li>
                    <li><strong className="text-red-700">CRITICO:</strong> Il campo <code>channel</code> deve contenere il NOME TESTUALE dello store (es. "Ticinese", "Lanino"), NON un valore numerico!</li>
                    <li>Nel foglio Google Sheets, assicurati che la colonna con il nome dello store sia testuale e contenga valori come "Ticinese", "Lanino", etc.</li>
                    <li><code>sourceApp_*</code>: sconti in euro per app (es. sourceApp_glovo=13.87, sourceApp_deliveroo=21)</li>
                    <li><code>sourceType_*</code> e <code>moneyType_*</code>: sono aggregazioni alternative dello STESSO totale, per tipo e metodo pagamento</li>
                    <li><strong>IMPORTANTE:</strong> Il <code>total_discount_price</code> viene calcolato automaticamente come somma dei soli sourceApp_* (non sommare anche sourceType e moneyType perché sono lo stesso importo aggregato in modo diverso)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Esempio Google Sheets */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Check className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-bold text-slate-800">Esempio Righe Google Sheets</h2>
              </div>
              <div className="ml-9">
                <div className="neumorphic-pressed p-4 rounded-xl bg-slate-50 overflow-x-auto">
                  <pre className="text-xs font-mono text-slate-700">
{`order_date | channel    | sourceApp_glovo | sourceApp_deliveroo | sourceType_delivery | moneyType_online
2026-01-23 | Ticinese   | 13.87           | 21.00               | 34.87               | 34.87
2026-01-23 | Lanino     | 10.50           | 15.30               | 25.80               | 25.80`}
                  </pre>
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-bold">⚠️ Verifica nel tuo Google Sheets:</p>
                    <p className="text-xs text-red-700 mt-1">La colonna "channel" DEVE contenere testo (Ticinese, Lanino) e NON numeri (39.45, 21). Se vedi numeri nella colonna Store della tabella finale, hai mappato la colonna sbagliata in Zapier!</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mt-3">
                  <strong>Logica dei campi:</strong> I campi sourceApp_*, sourceType_* e moneyType_* rappresentano TUTTI lo stesso totale sconto, ma aggregato in modi diversi. 
                  Ad esempio: se uno sconto totale è 100€, sourceApp_glovo + sourceApp_deliveroo = 100€, sourceType_delivery + sourceType_takeaway = 100€, moneyType_cash + moneyType_online = 100€. 
                  Il <code>total_discount_price</code> viene calcolato come somma dei soli sourceApp_*.
                </p>
              </div>
            </div>

            {/* Webhook URL */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-bold text-slate-800">Webhook URL</h2>
              </div>
              <div className="ml-9">
                <p className="text-slate-600 mb-3">Usa questo URL nel webhook POST di Zapier:</p>
                <div className="flex gap-2">
                  <code className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-sm text-slate-700 overflow-x-auto">
                    {webhookUrl}
                  </code>
                  <NeumorphicButton
                    onClick={() => copyToClipboard(webhookUrl)}
                    className="flex items-center gap-2"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiato!' : 'Copia'}
                  </NeumorphicButton>
                </div>
              </div>
            </div>
          </div>
        </NeumorphicCard>

        {/* Tips */}
        <NeumorphicCard className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
          <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Consigli Utili
          </h3>
          <ul className="space-y-2 text-sm text-green-800">
            <li>✅ Testa sempre con poche righe prima di caricare dati in massa</li>
            <li>✅ Verifica che i nomi delle colonne nel foglio Google Sheets corrispondano esattamente a quelli richiesti</li>
            <li>✅ Usa il formato data YYYY-MM-DD per evitare errori</li>
            <li>✅ Il campo "channel" deve contenere il nome esatto dello store (es. "Roma Centro")</li>
            <li>✅ I campi sourceApp_*, sourceType_* e moneyType_* sono valori numerici in euro (es. 5.00, 0, 12.50)</li>
            <li>✅ Verifica che la somma degli sconti parziali corrisponda al total_discount_price</li>
            <li>✅ Controlla i dati importati nella pagina Sconti dopo ogni caricamento</li>
          </ul>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}