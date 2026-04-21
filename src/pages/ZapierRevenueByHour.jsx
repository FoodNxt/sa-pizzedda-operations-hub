import React, { useState } from "react";
import { Zap, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";

export default function ZapierRevenueByHour() {
  const [copied, setCopied] = useState(false);

  const functionUrl = `${window.location.origin}/api/functions/importRevenueByHourFromZapier`;

  const handleCopy = () => {
    navigator.clipboard.writeText(functionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const examplePayload = {
    secret: "IL_TUO_SECRET_QUI",
    store: "Ticinese",
    order_date: "2025-06-15",
    order_hour: "12",
    total_revenue: "245.50",
    total_orders: "18"
  };

  return (
    <ProtectedPage pageName="ZapierRevenueByHour" requiredUserTypes={['admin']}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2 flex items-center gap-3">
            <Zap className="w-8 h-8 text-orange-500" />
            Zapier - Revenue Oraria
          </h1>
          <p className="text-slate-500">Importa dati di fatturato e ordini per ora e per negozio</p>
        </div>

        {/* URL Endpoint */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-700 mb-4">1️⃣ URL Endpoint</h2>
          <p className="text-sm text-slate-500 mb-4">
            Usa questo URL come webhook destination in Zapier:
          </p>
          <div className="neumorphic-pressed p-4 rounded-xl bg-slate-50 flex items-center justify-between gap-3">
            <code className="text-sm text-slate-600 break-all">{functionUrl}</code>
            <NeumorphicButton onClick={handleCopy} className="flex-shrink-0">
              {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </NeumorphicButton>
          </div>
        </NeumorphicCard>

        {/* Configuration Steps */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-700 mb-4">2️⃣ Configurazione Zapier</h2>
          <div className="space-y-4">
            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-slate-700 mb-2">Step 1: Trigger</h3>
              <p className="text-sm text-slate-500">
                Configura il trigger (Google Sheets, CSV, ecc.) con le colonne: <strong>store, order_date, order_hour, total_revenue, total_orders</strong>
              </p>
            </div>

            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-slate-700 mb-2">Step 2: Action - Webhooks by Zapier</h3>
              <ul className="text-sm text-slate-500 space-y-2 list-disc list-inside">
                <li>Scegli "POST" come metodo</li>
                <li>Incolla l'URL endpoint sopra</li>
                <li>Seleziona "JSON" come formato payload</li>
              </ul>
            </div>

            <div className="neumorphic-pressed p-4 rounded-xl">
              <h3 className="font-bold text-slate-700 mb-2">Step 3: Mappa i Campi</h3>
              <div className="bg-white p-3 rounded-lg space-y-1 text-xs font-mono">
                <p><strong>secret:</strong> Il webhook secret (ZAPIER_REVENUE_BY_HOUR_WEBHOOK_SECRET)</p>
                <p><strong>store:</strong> Nome del negozio (deve corrispondere esattamente)</p>
                <p><strong>order_date:</strong> Data nel formato YYYY-MM-DD</p>
                <p><strong>order_hour:</strong> Ora del giorno (0-23, es. 12 per le 12:00)</p>
                <p><strong>total_revenue:</strong> Fatturato totale per quell'ora</p>
                <p><strong>total_orders:</strong> Numero scontrini per quell'ora</p>
              </div>
            </div>
          </div>
        </NeumorphicCard>

        {/* Example Payload */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-700 mb-4">3️⃣ Esempio Payload</h2>
          <div className="neumorphic-pressed p-4 rounded-xl bg-slate-50 overflow-x-auto">
            <pre className="text-xs text-slate-600">
              {JSON.stringify(examplePayload, null, 2)}
            </pre>
          </div>
        </NeumorphicCard>

        {/* Notes */}
        <NeumorphicCard className="p-6 bg-blue-50">
          <h2 className="text-xl font-bold text-blue-800 mb-4">📝 Note Importanti</h2>
          <ul className="space-y-2 text-sm text-blue-700">
            <li>🔒 <strong>IMPORTANTE:</strong> Aggiungi il campo "secret" con il valore ZAPIER_REVENUE_BY_HOUR_WEBHOOK_SECRET</li>
            <li>✅ Il nome del negozio deve corrispondere ESATTAMENTE a quello nel sistema</li>
            <li>✅ La data deve essere nel formato YYYY-MM-DD</li>
            <li>✅ L'ora deve essere un numero intero 0-23</li>
            <li>✅ Il sistema abbina automaticamente i cassieri in turno per quell'ora</li>
            <li>✅ Se 2+ cassieri coprono la stessa ora, vengono assegnati entrambi</li>
            <li>✅ Se un record per data/negozio/ora esiste già, verrà aggiornato</li>
          </ul>
        </NeumorphicCard>

        {/* Links */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-700 mb-4">🔗 Link Utili</h2>
          <div className="space-y-3">
            <a href="https://zapier.com/apps/webhook/integrations" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
              <ExternalLink className="w-4 h-4" /> Documentazione Zapier Webhooks
            </a>
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}