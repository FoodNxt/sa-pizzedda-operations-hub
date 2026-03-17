import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Download, Trash2, Eye, Loader2 } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";

export default function BustePagaSection() {
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const queryClient = useQueryClient();

  const { data: bustePaga = [], isLoading } = useQuery({
    queryKey: ['buste-paga'],
    queryFn: () => base44.entities.BustaPaga.list('-created_date')
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, mese }) => {
      setUploadingFile(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const busta = await base44.entities.BustaPaga.create({ mese, pdf_completo_url: file_url, status: 'processing' });
      return base44.functions.invoke('splitBustePagaPDF', { bustaId: busta.id, pdfUrl: file_url });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['buste-paga'] }); setSelectedFile(null); setUploadingFile(false); alert('Buste paga elaborate con successo!'); },
    onError: (error) => { setUploadingFile(false); alert('Errore: ' + (error.response?.data?.error || error.message)); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BustaPaga.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['buste-paga'] })
  });

  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }) });
  }

  return (
    <>
      <NeumorphicCard className="p-6 mb-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Upload className="w-5 h-5 text-green-600" /> Carica Buste Paga</h2>
        <div className="space-y-4">
          <div><label className="text-sm font-medium text-slate-700 mb-2 block">Mese di Riferimento</label><select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none">{monthOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
          <div><label className="text-sm font-medium text-slate-700 mb-2 block">File PDF</label><input type="file" accept="application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f?.type === 'application/pdf') setSelectedFile(f); else alert('Seleziona un file PDF'); }} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />{selectedFile && <p className="text-xs text-green-600 mt-2">✓ {selectedFile.name}</p>}</div>
          <NeumorphicButton onClick={() => { if (!selectedFile || !selectedMonth) { alert('Seleziona file e mese'); return; } uploadMutation.mutate({ file: selectedFile, mese: selectedMonth }); }} variant="primary" disabled={!selectedFile || uploadingFile} className="w-full flex items-center justify-center gap-2">{uploadingFile ? <><Loader2 className="w-5 h-5 animate-spin" /> Elaborazione...</> : <><Upload className="w-5 h-5" /> Carica e Splitta PDF</>}</NeumorphicButton>
          <div className="neumorphic-pressed p-4 rounded-xl bg-blue-50"><p className="text-xs text-blue-800"><strong>ℹ️</strong> Il PDF verrà analizzato automaticamente. Ogni pagina con un codice fiscale sarà assegnata al dipendente corrispondente.</p></div>
        </div>
      </NeumorphicCard>

      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Storico Buste Paga</h2>
        {isLoading ? <div className="text-center py-8"><Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" /></div> :
        bustePaga.length === 0 ? <p className="text-center text-slate-500 py-8">Nessuna busta paga caricata</p> :
        <div className="space-y-3">
          {bustePaga.map((busta) => (
            <NeumorphicCard key={busta.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">{new Date(busta.mese + '-01').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</h3>
                  <p className="text-xs text-slate-500 mt-1">Caricato: {new Date(busta.created_date).toLocaleDateString('it-IT')}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {busta.status === 'completed' && <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">✓ {busta.pdf_splits?.length || 0} dipendenti</span>}
                    {busta.status === 'processing' && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"><Loader2 className="w-3 h-3 inline animate-spin mr-1" />Elaborazione...</span>}
                    {busta.status === 'failed' && <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">✗ Errore</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={busta.pdf_completo_url} target="_blank" rel="noopener noreferrer" className="nav-button p-2 rounded-lg"><Download className="w-4 h-4 text-blue-600" /></a>
                  <button onClick={() => { if (confirm('Eliminare?')) deleteMutation.mutate(busta.id); }} className="nav-button p-2 rounded-lg"><Trash2 className="w-4 h-4 text-red-600" /></button>
                </div>
              </div>
              {busta.error_message && <div className="mt-3 p-3 bg-red-50 rounded-lg"><p className="text-xs text-red-700">{busta.error_message}</p></div>}
              {busta.status === 'completed' && busta.pdf_splits?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-bold text-slate-700 mb-3">File Splittati:</h4>
                  <div className="space-y-2">
                    {busta.pdf_splits.map((split, idx) => (
                      <div key={idx} className="neumorphic-pressed p-3 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center"><span className="text-xs font-bold text-white">{split.user_name?.charAt(0).toUpperCase()}</span></div>
                          <div><p className="text-sm font-medium text-slate-800">{split.user_name}</p><p className="text-xs text-slate-500">Pagina {split.page_number}</p></div>
                        </div>
                        <a href={split.pdf_url} target="_blank" rel="noopener noreferrer" className="nav-button p-2 rounded-lg"><Eye className="w-4 h-4 text-blue-600" /></a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </NeumorphicCard>
          ))}
        </div>}
      </NeumorphicCard>
    </>
  );
}