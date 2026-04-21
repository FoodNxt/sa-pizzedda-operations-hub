import React, { useState } from "react";
import { Upload, CheckCircle, AlertTriangle, Loader2, FileSpreadsheet } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";

export default function BulkImportRevenueByHour() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            rows: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  store: { type: "string" },
                  order_date: { type: "string" },
                  order_hour: { type: "string" },
                  total_revenue: { type: "string" },
                  total_orders: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (extracted.status === 'error') {
        setResult({ success: false, error: extracted.details });
        setLoading(false);
        return;
      }

      const rows = extracted.output?.rows || extracted.output || [];

      if (!Array.isArray(rows) || rows.length === 0) {
        setResult({ success: false, error: 'Nessuna riga trovata nel file' });
        setLoading(false);
        return;
      }

      // Send to backend function
      const response = await base44.functions.invoke('bulkImportRevenueByHour', { rows });

      setResult({
        success: true,
        created: response.data?.results?.created || 0,
        updated: response.data?.results?.updated || 0,
        errors: response.data?.results?.errors || []
      });
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedPage pageName="BulkImportRevenueByHour" requiredUserTypes={['admin']}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2 flex items-center gap-3">
            <Upload className="w-8 h-8 text-blue-500" />
            Bulk Import - Revenue Oraria
          </h1>
          <p className="text-slate-500">Importa dati di revenue oraria da file CSV o Excel</p>
        </div>

        {/* Format */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-700 mb-4">📋 Formato Richiesto</h2>
          <p className="text-sm text-slate-500 mb-4">Il file deve avere le seguenti colonne:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-bold text-slate-700">Colonna</th>
                  <th className="text-left py-2 px-3 font-bold text-slate-700">Formato</th>
                  <th className="text-left py-2 px-3 font-bold text-slate-700">Esempio</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b"><td className="py-2 px-3">store</td><td className="py-2 px-3">Testo</td><td className="py-2 px-3">Ticinese</td></tr>
                <tr className="border-b"><td className="py-2 px-3">order_date</td><td className="py-2 px-3">YYYY-MM-DD</td><td className="py-2 px-3">2025-06-15</td></tr>
                <tr className="border-b"><td className="py-2 px-3">order_hour</td><td className="py-2 px-3">0-23</td><td className="py-2 px-3">12</td></tr>
                <tr className="border-b"><td className="py-2 px-3">total_revenue</td><td className="py-2 px-3">Numero</td><td className="py-2 px-3">245.50</td></tr>
                <tr><td className="py-2 px-3">total_orders</td><td className="py-2 px-3">Numero intero</td><td className="py-2 px-3">18</td></tr>
              </tbody>
            </table>
          </div>
        </NeumorphicCard>

        {/* Upload */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-700 mb-4">📤 Carica File</h2>
          <div className="space-y-4">
            <label className="block">
              <div className="neumorphic-pressed p-8 rounded-xl text-center cursor-pointer hover:bg-slate-50 transition-colors">
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                <p className="text-sm text-slate-500">{file ? file.name : 'Clicca per selezionare un file CSV o Excel'}</p>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
              </div>
            </label>
            <NeumorphicButton
              onClick={handleImport}
              disabled={!file || loading}
              variant="primary"
              className="w-full"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Importazione in corso...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" /> Importa
                </span>
              )}
            </NeumorphicButton>
          </div>
        </NeumorphicCard>

        {/* Results */}
        {result && (
          <NeumorphicCard className={`p-6 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <h2 className={`text-xl font-bold mb-4 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.success ? '✅ Importazione Completata' : '❌ Errore'}
            </h2>
            {result.success ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>{result.created} record creati</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>{result.updated} record aggiornati</span>
                </div>
                {result.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-bold text-red-700 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> {result.errors.length} errori:
                    </p>
                    <div className="mt-2 max-h-40 overflow-y-auto">
                      {result.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-600">{err.error} - {JSON.stringify(err.row)}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-red-700">{result.error}</p>
            )}
          </NeumorphicCard>
        )}
      </div>
    </ProtectedPage>
  );
}