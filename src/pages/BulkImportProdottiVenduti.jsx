import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  ShoppingCart,
  Download
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProgressBar from "../components/neumorphic/ProgressBar";

export default function BulkImportProdottiVenduti() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedStore, setSelectedStore] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Seleziona un file CSV');
      return;
    }

    if (!selectedStore) {
      alert('Seleziona un negozio');
      return;
    }

    setUploading(true);
    setResult(null);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 8;
      });
    }, 400);

    try {
      setUploadProgress(10);
      
      // Read file content
      const fileContent = await selectedFile.text();
      setUploadProgress(25);

      // Get store details
      const store = stores.find(s => s.id === selectedStore);
      if (!store) {
        clearInterval(progressInterval);
        throw new Error('Negozio non trovato');
      }

      setUploadProgress(35);

      // Call import function
      const response = await base44.functions.invoke('bulkImportProdottiVenduti', {
        csv_content: fileContent,
        store_name: store.name,
        store_id: store.id
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      setResult({
        success: true,
        data: response.data
      });

      setTimeout(() => setUploadProgress(0), 1000);

    } catch (error) {
      clearInterval(progressInterval);
      console.error('Upload error:', error);
      setResult({
        success: false,
        error: error.message,
        details: error.response?.data
      });
      setUploadProgress(0);
    }

    setUploading(false);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setResult(null);
  };

  const downloadTemplate = () => {
    const csvContent = `date,category,flavor,total_pizzas_sold
2025-01-03,pizza,Margherita,90
2025-01-03,bibita,Coca Cola 33cl,8
2025-01-03,pizza,Salsiccia Sarda e Pecorino,72
2025-01-03,bibita,Acqua Frizzante,5
2025-01-03,bibita,Coca Cola Zero 33cl,4
2025-01-03,pizza,Capperi olive e acciughe,6`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_prodotti_venduti.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <ShoppingCart className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Caricamento Bulk Prodotti Venduti</h1>
        </div>
        <p className="text-[#9b9b9b]">
          Importa dati storici delle vendite da file CSV
        </p>
      </div>

      {/* Store Selection */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">1️⃣ Seleziona Negozio</h2>
        <select
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
          className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
        >
          <option value="">Seleziona un negozio...</option>
          {stores.map(store => (
            <option key={store.id} value={store.id}>
              {store.name} - {store.address}
            </option>
          ))}
        </select>
      </NeumorphicCard>

      {/* Download Template */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">2️⃣ Scarica Template CSV</h2>
        <p className="text-[#9b9b9b] mb-4">
          Scarica il template CSV con la struttura corretta, poi compilalo con i tuoi dati:
        </p>
        <NeumorphicButton
          onClick={downloadTemplate}
          className="flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Scarica Template CSV
        </NeumorphicButton>
      </NeumorphicCard>

      {/* Upload Section */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">3️⃣ Carica File CSV</h2>

        <div className="space-y-4">
          {!selectedFile ? (
            <label className="block">
              <div className="neumorphic-pressed p-12 rounded-xl border-2 border-dashed border-[#8b7355] cursor-pointer hover:bg-[#d5dae3] transition-all">
                <div className="text-center">
                  <Upload className="w-16 h-16 text-[#8b7355] mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-[#6b6b6b] mb-2">
                    Clicca per selezionare file CSV
                  </h3>
                  <p className="text-sm text-[#9b9b9b] mb-2">
                    Assicurati che il CSV segua la struttura del template
                  </p>
                  <p className="text-xs text-[#9b9b9b]">
                    Formato supportato: .csv
                  </p>
                </div>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          ) : (
            <>
              <div className="neumorphic-flat p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-[#6b6b6b]">File Selezionato</h3>
                  <button
                    onClick={clearFile}
                    className="neumorphic-flat px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Rimuovi
                  </button>
                </div>
                <div className="neumorphic-pressed p-3 rounded-lg flex items-center gap-3">
                  <FileText className="w-5 h-5 text-[#8b7355]" />
                  <div>
                    <p className="font-medium text-[#6b6b6b]">{selectedFile.name}</p>
                    <p className="text-xs text-[#9b9b9b]">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              </div>

              {uploading && uploadProgress > 0 && (
                <ProgressBar 
                  progress={uploadProgress} 
                  label="Importazione in corso..." 
                />
              )}

              <NeumorphicButton
                onClick={handleUpload}
                disabled={uploading || !selectedStore}
                variant="primary"
                className="w-full flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Importazione in corso...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Importa Dati
                  </>
                )}
              </NeumorphicButton>
            </>
          )}
        </div>
      </NeumorphicCard>

      {/* Result */}
      {result && (
        <NeumorphicCard className={`p-6 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
            )}
            <div className="flex-1">
              <h3 className={`text-xl font-bold mb-2 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.success ? '✅ Importazione Completata!' : '❌ Errore Importazione'}
              </h3>
              
              {result.success && result.data && (
                <div className="space-y-4">
                  <div className="neumorphic-pressed p-4 rounded-xl">
                    <h4 className="font-bold text-[#6b6b6b] mb-3">Riepilogo</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-[#8b7355]">{result.data.total_rows}</div>
                        <div className="text-sm text-[#9b9b9b]">Righe Totali</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{result.data.created}</div>
                        <div className="text-sm text-[#9b9b9b]">Creati</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{result.data.updated}</div>
                        <div className="text-sm text-[#9b9b9b]">Aggiornati</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{result.data.errors}</div>
                        <div className="text-sm text-[#9b9b9b]">Errori</div>
                      </div>
                    </div>
                  </div>

                  {result.data.error_details && result.data.error_details.length > 0 && (
                    <div className="neumorphic-pressed p-4 rounded-xl bg-red-50">
                      <h4 className="font-bold text-red-700 mb-2">Errori</h4>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {result.data.error_details.map((err, idx) => (
                          <div key={idx} className="text-sm text-red-600">• {err}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!result.success && (
                <div className="neumorphic-pressed p-4 rounded-xl bg-white mt-4">
                  <pre className="text-xs text-red-700 overflow-auto whitespace-pre-wrap">
                    {result.error}
                    {result.details && JSON.stringify(result.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </NeumorphicCard>
      )}

      {/* Instructions */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">ℹ️ Istruzioni</h2>
        
        <div className="space-y-4">
          <div className="neumorphic-flat p-4 rounded-xl bg-blue-50">
            <h3 className="font-bold text-blue-700 mb-2">📝 Formato CSV</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <code className="bg-blue-200 px-1 rounded">date</code>: Data vendita (formato <strong>YYYY-MM-DD</strong>, es. 2025-01-03)</li>
              <li>• <code className="bg-blue-200 px-1 rounded">category</code>: Categoria prodotto (es. pizza, bibita)</li>
              <li>• <code className="bg-blue-200 px-1 rounded">flavor</code>: Nome prodotto venduto</li>
              <li>• <code className="bg-blue-200 px-1 rounded">total_pizzas_sold</code>: Quantità venduta</li>
              <li>• Ogni riga rappresenta un prodotto venduto in una data specifica</li>
            </ul>
          </div>

          <div className="neumorphic-flat p-4 rounded-xl bg-yellow-50">
            <h3 className="font-bold text-yellow-700 mb-2">⚠️ Note Importanti</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• La data deve essere nel formato <strong>YYYY-MM-DD</strong> (es. 2025-01-03)</li>
              <li>• Ogni riga del CSV rappresenta un singolo prodotto venduto</li>
              <li>• Puoi avere più righe per la stessa data (un prodotto per riga)</li>
              <li>• Seleziona sempre il negozio prima di caricare il file</li>
              <li>• Se esiste già un record per lo stesso prodotto, data e negozio, verrà aggiornato</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}