
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Truck,
  Package,
  TrendingUp,
  Calendar,
  Euro,
  X
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function UploadFattureXML() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: fornitori = [] } = useQuery({
    queryKey: ['fornitori'],
    queryFn: () => base44.entities.Fornitore.list(),
  });

  const { data: prodotti = [] } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list(),
  });

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
    setResult(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Seleziona almeno un file XML');
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const results = [];

      for (const file of selectedFiles) {
        // Read file content
        const fileContent = await file.text();

        // Upload to get file URL
        const formData = new FormData();
        formData.append('file', file);
        
        const uploadResponse = await base44.integrations.Core.UploadFile({ file });
        const fileUrl = uploadResponse.file_url;

        // Call import function
        const response = await base44.functions.invoke('importFattureXML', {
          xml_content: fileContent,
          file_url: fileUrl,
          file_name: file.name
        });

        results.push({
          fileName: file.name,
          success: true,
          data: response.data
        });
      }

      setResult({
        success: true,
        results
      });

    } catch (error) {
      console.error('Upload error:', error);
      setResult({
        success: false,
        error: error.message,
        details: error.response?.data
      });
    }

    setUploading(false);
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    setResult(null);
  };

  const getTotalStats = () => {
    if (!result?.results) return null;

    let totals = {
      fornitori_creati: 0,
      fornitori_aggiornati: 0,
      prodotti_creati: 0,
      prodotti_aggiornati: 0,
      storico_creati: 0,
      errori: 0
    };

    result.results.forEach(r => {
      if (r.data?.summary) {
        const s = r.data.summary;
        totals.fornitori_creati += s.fornitori_creati || 0;
        totals.fornitori_aggiornati += s.fornitori_aggiornati || 0;
        totals.prodotti_creati += s.prodotti_creati || 0;
        totals.prodotti_aggiornati += s.prodotti_aggiornati || 0;
        totals.storico_creati += s.storico_creati || 0;
        totals.errori += s.errori || 0;
      }
    });

    return totals;
  };

  const stats = getTotalStats();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <FileText className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Upload Fatture XML</h1>
        </div>
        <p className="text-[#9b9b9b]">
          Importa fornitori e prodotti dalle fatture elettroniche dell'Agenzia delle Entrate
        </p>
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Truck className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{fornitori.length}</h3>
          <p className="text-sm text-[#9b9b9b]">Fornitori Esistenti</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Package className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-blue-600 mb-1">{prodotti.length}</h3>
          <p className="text-sm text-[#9b9b9b]">Prodotti in Inventario</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">
            {prodotti.filter(p => p.prezzo_unitario).length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Con Prezzi</p>
        </NeumorphicCard>
      </div>

      {/* Upload Section */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Upload className="w-6 h-6 text-[#8b7355]" />
          <h2 className="text-xl font-bold text-[#6b6b6b]">Carica File XML</h2>
        </div>

        <div className="space-y-4">
          {selectedFiles.length === 0 ? (
            <label className="block">
              <div className="neumorphic-pressed p-12 rounded-xl border-2 border-dashed border-[#8b7355] cursor-pointer hover:bg-[#d5dae3] transition-all">
                <div className="text-center">
                  <Upload className="w-16 h-16 text-[#8b7355] mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-[#6b6b6b] mb-2">
                    Clicca per selezionare file XML
                  </h3>
                  <p className="text-sm text-[#9b9b9b] mb-2">
                    Supporta file multipli (fatture elettroniche formato FatturaPA)
                  </p>
                  <p className="text-xs text-[#9b9b9b]">
                    Formati supportati: .xml, .p7m, .xml.p7m
                  </p>
                </div>
              </div>
              <input
                type="file"
                accept=".xml,.p7m,.xml.p7m"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          ) : (
            <>
              <div className="neumorphic-flat p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-[#6b6b6b]">
                    File Selezionati ({selectedFiles.length})
                  </h3>
                  <button
                    onClick={clearFiles}
                    className="neumorphic-flat px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Rimuovi tutto
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="neumorphic-pressed p-3 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-[#8b7355]" />
                        <div>
                          <p className="font-medium text-[#6b6b6b]">{file.name}</p>
                          <p className="text-xs text-[#9b9b9b]">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
                        }}
                        className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <NeumorphicButton
                onClick={handleUpload}
                disabled={uploading}
                variant="primary"
                className="w-full flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#8b7355]" />
                    Importazione in corso...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Importa {selectedFiles.length} File
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
          <div className="flex items-start gap-3 mb-6">
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
            )}
            <div className="flex-1">
              <h3 className={`text-xl font-bold mb-2 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.success ? '✅ Importazione Completata!' : '❌ Errore Importazione'}
              </h3>
              
              {result.success && stats && (
                <>
                  {/* Total Summary */}
                  <div className="neumorphic-pressed p-6 rounded-xl mb-6">
                    <h4 className="font-bold text-[#6b6b6b] mb-4 text-lg">Riepilogo Totale</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Truck className="w-5 h-5 text-green-600" />
                          <span className="text-2xl font-bold text-green-600">{stats.fornitori_creati}</span>
                        </div>
                        <div className="text-sm text-[#9b9b9b]">Fornitori Creati</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Truck className="w-5 h-5 text-blue-600" />
                          <span className="text-2xl font-bold text-blue-600">{stats.fornitori_aggiornati}</span>
                        </div>
                        <div className="text-sm text-[#9b9b9b]">Fornitori Aggiornati</div>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Package className="w-5 h-5 text-green-600" />
                          <span className="text-2xl font-bold text-green-600">{stats.prodotti_creati}</span>
                        </div>
                        <div className="text-sm text-[#9b9b9b]">Prodotti Creati</div>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Package className="w-5 h-5 text-blue-600" />
                          <span className="text-2xl font-bold text-blue-600">{stats.prodotti_aggiornati}</span>
                        </div>
                        <div className="text-sm text-[#9b9b9b]">Prodotti Aggiornati</div>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <TrendingUp className="w-5 h-5 text-purple-600" />
                          <span className="text-2xl font-bold text-purple-600">{stats.storico_creati}</span>
                        </div>
                        <div className="text-sm text-[#9b9b9b]">Prezzi Storico</div>
                      </div>

                      {stats.errori > 0 && (
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            <span className="text-2xl font-bold text-red-600">{stats.errori}</span>
                          </div>
                          <div className="text-sm text-[#9b9b9b]">Errori</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Per-File Details */}
                  <div className="space-y-4">
                    {result.results.map((fileResult, idx) => (
                      <details key={idx} className="neumorphic-pressed p-4 rounded-xl">
                        <summary className="font-bold text-[#6b6b6b] cursor-pointer flex items-center gap-2">
                          <FileText className="w-5 h-5 text-[#8b7355]" />
                          {fileResult.fileName}
                          {fileResult.data?.summary && (
                            <span className="text-sm font-normal text-[#9b9b9b] ml-2">
                              ({fileResult.data.summary.fornitori_creati + fileResult.data.summary.fornitori_aggiornati} fornitori, 
                              {fileResult.data.summary.prodotti_creati + fileResult.data.summary.prodotti_aggiornati} prodotti)
                            </span>
                          )}
                        </summary>
                        
                        {fileResult.data && (
                          <div className="mt-4 space-y-4">
                            {/* Fattura Info */}
                            {fileResult.data.fattura && (
                              <div className="neumorphic-flat p-4 rounded-lg">
                                <h5 className="font-bold text-[#6b6b6b] mb-2">Dettagli Fattura</h5>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-[#9b9b9b]">Numero:</span>
                                    <span className="ml-2 text-[#6b6b6b] font-medium">{fileResult.data.fattura.numero}</span>
                                  </div>
                                  <div>
                                    <span className="text-[#9b9b9b]">Data:</span>
                                    <span className="ml-2 text-[#6b6b6b] font-medium">{fileResult.data.fattura.data}</span>
                                  </div>
                                  <div>
                                    <span className="text-[#9b9b9b]">Totale:</span>
                                    <span className="ml-2 text-[#6b6b6b] font-medium">€{fileResult.data.fattura.importo_totale}</span>
                                  </div>
                                  <div>
                                    <span className="text-[#9b9b9b]">Fornitore:</span>
                                    <span className="ml-2 text-[#6b6b6b] font-medium">{fileResult.data.fattura.fornitore_nome}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Prodotti Details */}
                            {fileResult.data.prodotti && fileResult.data.prodotti.length > 0 && (
                              <div className="neumorphic-flat p-4 rounded-lg max-h-60 overflow-y-auto">
                                <h5 className="font-bold text-[#6b6b6b] mb-3">
                                  Prodotti ({fileResult.data.prodotti.length})
                                </h5>
                                <div className="space-y-2">
                                  {fileResult.data.prodotti.map((prod, pidx) => (
                                    <div key={pidx} className="bg-white p-2 rounded text-sm">
                                      <div className="font-medium text-[#6b6b6b]">
                                        {prod.descrizione}
                                        {prod.status === 'created' && (
                                          <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                                            NUOVO
                                          </span>
                                        )}
                                        {prod.status === 'updated' && (
                                          <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                                            AGGIORNATO
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-[#9b9b9b] mt-1">
                                        €{prod.prezzo_unitario} × {prod.quantita} {prod.unita_misura}
                                        {prod.codice && ` • Codice: ${prod.codice}`}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Errors */}
                            {fileResult.data.errors && fileResult.data.errors.length > 0 && (
                              <div className="neumorphic-pressed p-4 rounded-lg bg-red-50">
                                <h5 className="font-bold text-red-700 mb-2">Errori</h5>
                                <div className="space-y-1">
                                  {fileResult.data.errors.map((err, eidx) => (
                                    <div key={eidx} className="text-sm text-red-600">• {err}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </details>
                    ))}
                  </div>
                </>
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
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">ℹ️ Come Funziona</h2>
        
        <div className="space-y-4">
          <div className="neumorphic-pressed p-4 rounded-xl">
            <h3 className="font-bold text-[#6b6b6b] mb-2 flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#8b7355]" />
              1. Importazione Fornitori
            </h3>
            <ul className="text-sm text-[#6b6b6b] space-y-1 ml-7">
              <li>• Estrae i dati da <code className="bg-white px-1 rounded">&lt;CedentePrestatore&gt;</code></li>
              <li>• Verifica se il fornitore esiste già (tramite P.IVA)</li>
              <li>• Se esiste: aggiorna le informazioni</li>
              <li>• Se non esiste: crea un nuovo fornitore</li>
              <li>• Salva: Ragione Sociale, P.IVA, Sede Legale</li>
            </ul>
          </div>

          <div className="neumorphic-pressed p-4 rounded-xl">
            <h3 className="font-bold text-[#6b6b6b] mb-2 flex items-center gap-2">
              <Package className="w-5 h-5 text-[#8b7355]" />
              2. Importazione Prodotti
            </h3>
            <ul className="text-sm text-[#6b6b6b] space-y-1 ml-7">
              <li>• Estrae i prodotti da <code className="bg-white px-1 rounded">&lt;DettaglioLinee&gt;</code></li>
              <li>• Verifica se il prodotto esiste già (tramite nome o codice articolo)</li>
              <li>• Se esiste: aggiorna il prezzo_unitario con l'ultimo</li>
              <li>• Se non esiste: crea un nuovo prodotto</li>
              <li>• Collega automaticamente al fornitore della fattura</li>
            </ul>
          </div>

          <div className="neumorphic-pressed p-4 rounded-xl">
            <h3 className="font-bold text-[#6b6b6b] mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#8b7355]" />
              3. Storico Prezzi
            </h3>
            <ul className="text-sm text-[#6b6b6b] space-y-1 ml-7">
              <li>• Per ogni prodotto in ogni fattura, crea un record storico</li>
              <li>• Salva: data fattura, prezzo, quantità, fornitore</li>
              <li>• Permette di tracciare l'evoluzione dei prezzi nel tempo</li>
              <li>• Utile per analisi di costo e variazioni prezzi</li>
            </ul>
          </div>

          <div className="neumorphic-flat p-4 rounded-xl bg-blue-50">
            <h3 className="font-bold text-blue-700 mb-2">📝 Note Importanti</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Supporta solo file XML formato FatturaPA (Fattura Elettronica Italiana)</li>
              <li>• Puoi caricare più file contemporaneamente</li>
              <li>• I prezzi sono estratti al netto IVA</li>
              <li>• Il matching prodotti avviene per nome (case-insensitive) o codice articolo</li>
              <li>• I prodotti nuovi vengono creati in categoria "altro" - modifica successivamente se necessario</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}
