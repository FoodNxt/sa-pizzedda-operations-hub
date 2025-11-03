import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, AlertCircle, CheckCircle, FileSpreadsheet, Store, MapPin, Download } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function ImportReviews() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [selectedStore, setSelectedStore] = useState('');
  
  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileType = selectedFile.name.split('.').pop().toLowerCase();
      if (['csv', 'xlsx', 'xls'].includes(fileType)) {
        setFile(selectedFile);
        setError(null);
        setSuccess(null);
        setExtractedData(null);
      } else {
        setError('Per favore carica un file CSV o Excel (.xlsx, .xls)');
        setFile(null);
      }
    }
  };

  const handleUploadAndExtract = async () => {
    if (!file) {
      setError('Seleziona un file prima di caricare');
      return;
    }

    if (!selectedStore) {
      setError('Seleziona il locale per queste recensioni');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setUploading(false);
      setProcessing(true);

      // Extract data with schema matching Google Sheets columns
      const schema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            nome: { type: "string" },
            data_recensione: { type: "string" },
            voto: { type: "number" },
            commento: { type: "string" }
          }
        }
      };

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: schema
      });

      setProcessing(false);

      if (result.status === "success" && result.output) {
        setExtractedData(result.output);
        setSuccess(`Trovate ${result.output.length} recensioni nel file!`);
      } else {
        setError(result.details || 'Errore durante l\'estrazione dei dati');
      }
    } catch (err) {
      setUploading(false);
      setProcessing(false);
      setError('Errore durante il caricamento: ' + err.message);
    }
  };

  const handleImport = async () => {
    if (!extractedData || extractedData.length === 0) {
      setError('Nessun dato da importare');
      return;
    }

    if (!selectedStore) {
      setError('Seleziona il locale per queste recensioni');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Transform data to match Review entity
      const reviewsToCreate = extractedData.map(row => ({
        store_id: selectedStore,
        customer_name: row.nome || 'Anonimo',
        review_date: parseDate(row.data_recensione),
        rating: parseRating(row.voto),
        comment: row.commento || '',
        source: 'google'
      }));

      // Bulk create reviews
      await base44.entities.Review.bulkCreate(reviewsToCreate);

      setSuccess(`✅ Importate ${reviewsToCreate.length} recensioni con successo!`);
      setExtractedData(null);
      setFile(null);
      
      // Refresh reviews list
      queryClient.invalidateQueries({ queryKey: ['reviews'] });

      // Reset file input
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';

    } catch (err) {
      setError('Errore durante l\'importazione: ' + err.message);
    }

    setProcessing(false);
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Try different date formats
    // Format: DD/MM/YYYY or DD-MM-YYYY
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    
    return new Date().toISOString().split('T')[0];
  };

  const parseRating = (rating) => {
    const num = typeof rating === 'number' ? rating : parseFloat(rating);
    if (isNaN(num)) return 3;
    return Math.max(1, Math.min(5, Math.round(num)));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Importa Recensioni</h1>
        <p className="text-[#9b9b9b]">Carica le recensioni da Google Sheets</p>
      </div>

      {/* Instructions */}
      <NeumorphicCard className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <FileSpreadsheet className="w-6 h-6 text-[#8b7355] mt-1" />
          <div>
            <h2 className="text-xl font-bold text-[#6b6b6b] mb-3">Come importare le recensioni</h2>
            <ol className="space-y-2 text-[#6b6b6b]">
              <li className="flex items-start gap-2">
                <span className="neumorphic-flat px-2 py-1 rounded text-sm font-bold text-[#8b7355] min-w-[24px] text-center">1</span>
                <span>Apri il tuo Google Sheet con le recensioni</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="neumorphic-flat px-2 py-1 rounded text-sm font-bold text-[#8b7355] min-w-[24px] text-center">2</span>
                <span>Seleziona il tab del locale che vuoi importare</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="neumorphic-flat px-2 py-1 rounded text-sm font-bold text-[#8b7355] min-w-[24px] text-center">3</span>
                <span>Vai su <strong>File → Scarica → Valori separati da virgola (.csv)</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="neumorphic-flat px-2 py-1 rounded text-sm font-bold text-[#8b7355] min-w-[24px] text-center">4</span>
                <span>Carica il file CSV qui sotto</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="neumorphic-flat px-2 py-1 rounded text-sm font-bold text-[#8b7355] min-w-[24px] text-center">5</span>
                <span>Seleziona il locale corrispondente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="neumorphic-flat px-2 py-1 rounded text-sm font-bold text-[#8b7355] min-w-[24px] text-center">6</span>
                <span>Clicca "Importa Recensioni"</span>
              </li>
            </ol>
          </div>
        </div>

        <div className="neumorphic-pressed p-4 rounded-xl mt-4">
          <p className="text-sm text-[#6b6b6b]">
            <strong>Nota:</strong> Il file CSV deve contenere le colonne: <strong>Nome</strong>, <strong>Data Recensione</strong>, <strong>Voto</strong>, <strong>Commento</strong>
          </p>
        </div>
      </NeumorphicCard>

      {/* Store Selection */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Store className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-lg font-bold text-[#6b6b6b]">Seleziona il Locale</h2>
        </div>
        
        {stores.length > 0 ? (
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
          >
            <option value="">-- Seleziona un locale --</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>
                {store.name} - {store.address}
              </option>
            ))}
          </select>
        ) : (
          <div className="neumorphic-pressed p-4 rounded-xl text-center">
            <p className="text-[#9b9b9b] mb-3">Nessun locale disponibile</p>
            <p className="text-sm text-[#6b6b6b]">
              Aggiungi prima i tuoi locali nella sezione Store Reviews
            </p>
          </div>
        )}
      </NeumorphicCard>

      {/* File Upload */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-lg font-bold text-[#6b6b6b]">Carica File CSV</h2>
        </div>

        <div className="neumorphic-pressed p-8 rounded-xl text-center">
          <input
            id="file-input"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <label
            htmlFor="file-input"
            className="cursor-pointer block"
          >
            <div className="neumorphic-flat w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center">
              <FileSpreadsheet className="w-10 h-10 text-[#8b7355]" />
            </div>
            <p className="text-[#6b6b6b] font-medium mb-2">
              {file ? file.name : 'Clicca per selezionare un file'}
            </p>
            <p className="text-sm text-[#9b9b9b]">
              Formati supportati: CSV, Excel (.xlsx, .xls)
            </p>
          </label>
        </div>

        {file && !extractedData && (
          <div className="mt-6 flex justify-center">
            <NeumorphicButton
              onClick={handleUploadAndExtract}
              disabled={uploading || processing || !selectedStore}
              variant="primary"
              className="px-8"
            >
              {uploading ? 'Caricamento...' : processing ? 'Elaborazione...' : 'Estrai Dati'}
            </NeumorphicButton>
          </div>
        )}
      </NeumorphicCard>

      {/* Preview Data */}
      {extractedData && extractedData.length > 0 && (
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#6b6b6b]">
              Anteprima Dati ({extractedData.length} recensioni)
            </h2>
            <NeumorphicButton
              onClick={handleImport}
              disabled={processing}
              variant="primary"
            >
              {processing ? 'Importazione...' : 'Importa Recensioni'}
            </NeumorphicButton>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#c1c1c1]">
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Nome</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Data</th>
                  <th className="text-center p-3 text-[#9b9b9b] font-medium">Voto</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Commento</th>
                </tr>
              </thead>
              <tbody>
                {extractedData.slice(0, 10).map((row, index) => (
                  <tr key={index} className="border-b border-[#d1d1d1]">
                    <td className="p-3 text-[#6b6b6b]">{row.nome || 'Anonimo'}</td>
                    <td className="p-3 text-[#6b6b6b]">{row.data_recensione || '-'}</td>
                    <td className="p-3 text-center">
                      <span className="neumorphic-flat px-3 py-1 rounded-lg font-bold text-[#8b7355]">
                        {parseRating(row.voto)} ⭐
                      </span>
                    </td>
                    <td className="p-3 text-[#6b6b6b] text-sm">
                      {row.commento ? 
                        (row.commento.length > 50 ? row.commento.substring(0, 50) + '...' : row.commento)
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {extractedData.length > 10 && (
              <p className="text-center text-[#9b9b9b] text-sm mt-4">
                ... e altre {extractedData.length - 10} recensioni
              </p>
            )}
          </div>
        </NeumorphicCard>
      )}

      {/* Messages */}
      {error && (
        <NeumorphicCard className="p-4 bg-red-50">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </NeumorphicCard>
      )}

      {success && (
        <NeumorphicCard className="p-4 bg-green-50">
          <div className="flex items-center gap-3 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <p>{success}</p>
          </div>
        </NeumorphicCard>
      )}

      {/* Template Download */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Download className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-lg font-bold text-[#6b6b6b]">Template Google Sheets</h2>
        </div>
        
        <div className="neumorphic-pressed p-4 rounded-xl">
          <p className="text-[#6b6b6b] mb-3">
            Usa questo formato per il tuo Google Sheet:
          </p>
          <div className="bg-white rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <div className="flex gap-8 text-[#8b7355] font-bold mb-2">
              <span>Nome</span>
              <span>Data Recensione</span>
              <span>Voto</span>
              <span>Commento</span>
            </div>
            <div className="flex gap-8 text-[#6b6b6b]">
              <span>Mario Rossi</span>
              <span>15/01/2024</span>
              <span>5</span>
              <span>Ottima pizza!</span>
            </div>
            <div className="flex gap-8 text-[#6b6b6b] mt-1">
              <span>Laura Bianchi</span>
              <span>16/01/2024</span>
              <span>4</span>
              <span>Buon servizio</span>
            </div>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}