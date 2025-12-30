import React, { useState } from "react";
import { Zap, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";

export default function ZapierProduttivita() {
  const [copied, setCopied] = useState(false);

  const functionUrl = `${window.location.origin}/api/functions/importRevenueSlotFromZapier`;

  const handleCopy = () => {
    navigator.clipboard.writeText(functionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const examplePayload = {
    date: "2025-01-15",
    store: "Ticinese",
    "00:00-00:30": "0",
    "00:30-01:00": "0",
    "01:00-01:30": "0",
    "01:30-02:00": "0",
    "02:00-02:30": "0",
    "02:30-03:00": "0",
    "03:00-03:30": "0",
    "03:30-04:00": "0",
    "04:00-04:30": "0",
    "04:30-05:00": "0",
    "05:00-05:30": "0",
    "05:30-06:00": "0",
    "06:00-06:30": "0",
    "06:30-07:00": "0",
    "07:00-07:30": "0",
    "07:30-08:00": "0",
    "08:00-08:30": "0",
    "08:30-09:00": "0",
    "09:00-09:30": "0",
    "09:30-10:00": "0",
    "10:00-10:30": "0",
    "10:30-11:00": "5.50",
    "11:00-11:30": "12.30",
    "11:30-12:00": "25.80",
    "12:00-12:30": "45.20",
    "12:30-13:00": "38.90",
    "13:00-13:30": "22.40",
    "13:30-14:00": "15.60",
    "14:00-14:30": "8.20",
    "14:30-15:00": "4.50",
    "15:00-15:30": "3.20",
    "15:30-16:00": "2.80",
    "16:00-16:30": "1.50",
    "16:30-17:00": "2.30",
    "17:00-17:30": "4.60",
    "17:30-18:00": "8.90",
    "18:00-18:30": "15.40",
    "18:30-19:00": "28.70",
    "19:00-19:30": "42.30",
    "19:30-20:00": "51.20",
    "20:00-20:30": "48.90",
    "20:30-21:00": "35.60",
    "21:00-21:30": "24.80",
    "21:30-22:00": "18.30",
    "22:00-22:30": "12.40",
    "22:30-23:00": "8.50",
    "23:00-23:30": "4.20",
    "23:30-24:00": "2.10",
    "total_sum_all_slots": "494.20"
  };

  return (
    <ProtectedPage pageName="ZapierProduttivita" requiredUserTypes={['admin']}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2 flex items-center gap-3">
            <Zap className="w-8 h-8 text-orange-500" />
            Zapier - Revenue per Slot Orari
          </h1>
          <p className="text-[#9b9b9b]">Guida per configurare l'integrazione automatica con Zapier</p>
        </div>

        {/* URL Endpoint */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">1️⃣ URL Endpoint</h2>
          <p className="text-sm text-[#9b9b9b] mb-4">
            Usa questo URL come webhook destination in Zapier:
          </p>
          <div className="neumorphic-pressed p-4 rounded-xl bg-slate-50 flex items-center justify-between gap-3">
            <code className="text-sm text-[#6b6b6b] break-all">{functionUrl}</code>
            <NeumorphicButton onClick={handleCopy} className="flex-shrink-0">
              {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </NeumorphicButton>
          </div>
        </NeumorphicCard>

        {/* Configuration Steps */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">2️⃣ Configurazione Zapier</h2>
          <div className="space-y-4">
            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-[#6b6b6b] mb-2">Step 1: Trigger</h3>
              <p className="text-sm text-[#9b9b9b]">
                Configura il trigger in base alla tua fonte dati (Google Sheets, CSV, ecc.)
              </p>
            </div>

            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-[#6b6b6b] mb-2">Step 2: Action - Webhooks by Zapier</h3>
              <ul className="text-sm text-[#9b9b9b] space-y-2 list-disc list-inside">
                <li>Scegli "POST" come metodo</li>
                <li>Incolla l'URL endpoint sopra</li>
                <li>Seleziona "JSON" come formato payload</li>
              </ul>
            </div>

            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-[#6b6b6b] mb-2">Step 3: Mappa i Campi</h3>
              <p className="text-sm text-[#9b9b9b] mb-3">
                Mappa le colonne del tuo file ai seguenti campi JSON:
              </p>
              <div className="bg-white p-3 rounded-lg space-y-1 text-xs font-mono">
                <p><strong>date:</strong> Data nel formato YYYY-MM-DD</p>
                <p><strong>store:</strong> Nome del negozio (deve corrispondere esattamente)</p>
                <p><strong>00:00-00:30:</strong> Revenue per slot (e così via per tutti i 48 slot)</p>
                <p><strong>total_sum_all_slots:</strong> Totale giornaliero</p>
              </div>
            </div>
          </div>
        </NeumorphicCard>

        {/* Example Payload */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">3️⃣ Esempio Payload</h2>
          <p className="text-sm text-[#9b9b9b] mb-4">
            Questo è un esempio del JSON che Zapier deve inviare:
          </p>
          <div className="neumorphic-pressed p-4 rounded-xl bg-slate-50 overflow-x-auto">
            <pre className="text-xs text-[#6b6b6b]">
              {JSON.stringify(examplePayload, null, 2)}
            </pre>
          </div>
        </NeumorphicCard>

        {/* Important Notes */}
        <NeumorphicCard className="p-6 bg-blue-50">
          <h2 className="text-xl font-bold text-blue-800 mb-4">📝 Note Importanti</h2>
          <ul className="space-y-2 text-sm text-blue-700">
            <li>✅ Il nome del negozio deve corrispondere ESATTAMENTE a quello configurato nel sistema</li>
            <li>✅ La data deve essere nel formato YYYY-MM-DD (es. 2025-01-15)</li>
            <li>✅ I valori di revenue possono essere decimali (usa il punto, non la virgola)</li>
            <li>✅ Se un record per quella data/negozio esiste già, verrà aggiornato</li>
            <li>✅ Gli slot con valore 0 o mancanti saranno considerati come 0</li>
          </ul>
        </NeumorphicCard>

        {/* Links */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">🔗 Link Utili</h2>
          <div className="space-y-3">
            <a
              href="https://zapier.com/apps/webhook/integrations"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Documentazione Zapier Webhooks
            </a>
            <a
              href="/api/functions/importRevenueSlotFromZapier"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Test Endpoint (apre in nuova tab)
            </a>
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}