import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import NeumorphicCard from "@/components/neumorphic/NeumorphicCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Database, Send, Code } from "lucide-react";

export default function BigQueryAI() {
  const [question, setQuestion] = useState("");
  const [projectId, setProjectId] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await base44.functions.invoke('queryBigQueryWithAI', {
        question,
        projectId,
        datasetId: datasetId || null
      });

      if (response.data.error) {
        setError(response.data);
      } else {
        setResult(response.data);
      }
    } catch (err) {
      setError({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold">BigQuery AI Assistant</h1>
      </div>

      <NeumorphicCard className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Project ID
            </label>
            <Input
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="your-project-id"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Dataset ID (opzionale)
            </label>
            <Input
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              placeholder="your-dataset-id"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Fai una domanda sui tuoi dati
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Es: Mostrami le vendite totali per negozio nell'ultimo mese"
              className="w-full min-h-[100px] px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Elaborazione...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Invia domanda
              </>
            )}
          </Button>
        </form>
      </NeumorphicCard>

      {error && (
        <NeumorphicCard className="p-6 border-2 border-red-200">
          <h3 className="text-lg font-bold text-red-600 mb-2">Errore</h3>
          <p className="text-sm text-red-700">{error.error}</p>
          {error.details && (
            <p className="text-sm text-red-600 mt-2">{error.details}</p>
          )}
          {error.sqlQuery && (
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-600 mb-2">Query generata:</p>
              <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
                {error.sqlQuery}
              </pre>
            </div>
          )}
        </NeumorphicCard>
      )}

      {result && (
        <div className="space-y-4">
          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Code className="w-5 h-5 text-slate-600" />
              <h3 className="text-lg font-bold">Query SQL generata</h3>
            </div>
            <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
              {result.sqlQuery}
            </pre>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Risultati</h3>
              <span className="text-sm text-slate-500">
                {result.totalRows} righe totali
              </span>
            </div>

            {result.data.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Nessun risultato trovato</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {Object.keys(result.data[0]).map((key) => (
                        <th key={key} className="text-left py-3 px-4 font-medium text-slate-700">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        {Object.values(row).map((value, colIdx) => (
                          <td key={colIdx} className="py-3 px-4 text-slate-600">
                            {value !== null ? String(value) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </NeumorphicCard>
        </div>
      )}
    </div>
  );
}