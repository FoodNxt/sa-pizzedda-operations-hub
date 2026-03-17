import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Download, Trash2, Loader2 } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";

export default function UnilavSection() {
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [dataDocumento, setDataDocumento] = useState('');
  const queryClient = useQueryClient();

  const { data: unilavDocs = [], isLoading } = useQuery({
    queryKey: ['unilav-docs-admin'],
    queryFn: () => base44.entities.Unilav.list('-created_date')
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-dipendenti-unilav'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter((u) => u.user_type === 'dipendente' || u.user_type === 'user');
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, userId, descrizione, dataDocumento }) => {
      setUploadingFile(true);
      const user = users.find((u) => u.id === userId);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return base44.entities.Unilav.create({ user_id: userId, user_name: user?.nome_cognome || user?.full_name || user?.email, user_email: user?.email, pdf_url: file_url, descrizione: descrizione || 'Documento Unilav', data_documento: dataDocumento || new Date().toISOString().split('T')[0] });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['unilav-docs-admin'] }); setSelectedFile(null); setSelectedUserId(''); setDescrizione(''); setDataDocumento(''); setUploadingFile(false); alert('Documento Unilav caricato!'); },
    onError: (error) => { setUploadingFile(false); alert('Errore: ' + error.message); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Unilav.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['unilav-docs-admin'] })
  });

  return (
    <>
      <NeumorphicCard className="p-6 mb-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Upload className="w-5 h-5 text-purple-600" /> Carica Documento Unilav</h2>
        <div className="space-y-4">
          <div><label className="text-sm font-medium text-slate-700 mb-2 block">Dipendente *</label><select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"><option value="">Seleziona dipendente...</option>{users.map((u) => <option key={u.id} value={u.id}>{u.nome_cognome || u.full_name || u.email}</option>)}</select></div>
          <div><label className="text-sm font-medium text-slate-700 mb-2 block">Descrizione</label><input type="text" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder="Es: Unilav Assunzione" className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" /></div>
          <div><label className="text-sm font-medium text-slate-700 mb-2 block">Data Documento</label><input type="date" value={dataDocumento} onChange={(e) => setDataDocumento(e.target.value)} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" /></div>
          <div><label className="text-sm font-medium text-slate-700 mb-2 block">File PDF *</label><input type="file" accept="application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f?.type === 'application/pdf') setSelectedFile(f); else alert('Seleziona un file PDF'); }} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />{selectedFile && <p className="text-xs text-green-600 mt-2">✓ {selectedFile.name}</p>}</div>
          <NeumorphicButton onClick={() => { if (!selectedFile || !selectedUserId) { alert('Seleziona file e dipendente'); return; } uploadMutation.mutate({ file: selectedFile, userId: selectedUserId, descrizione, dataDocumento }); }} variant="primary" disabled={!selectedFile || !selectedUserId || uploadingFile} className="w-full flex items-center justify-center gap-2">{uploadingFile ? <><Loader2 className="w-5 h-5 animate-spin" /> Caricamento...</> : <><Upload className="w-5 h-5" /> Carica Documento</>}</NeumorphicButton>
        </div>
      </NeumorphicCard>

      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Documenti Unilav Caricati</h2>
        {isLoading ? <div className="text-center py-8"><Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" /></div> :
        unilavDocs.length === 0 ? <p className="text-center text-slate-500 py-8">Nessun documento caricato</p> :
        <div className="space-y-3">
          {unilavDocs.map((doc) => (
            <NeumorphicCard key={doc.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1"><h3 className="font-bold text-slate-800">{doc.user_name}</h3><p className="text-sm text-slate-600">{doc.descrizione || 'Documento Unilav'}</p><p className="text-xs text-slate-500 mt-1">Data: {doc.data_documento ? new Date(doc.data_documento).toLocaleDateString('it-IT') : new Date(doc.created_date).toLocaleDateString('it-IT')}</p></div>
                <div className="flex gap-2">
                  <a href={doc.pdf_url} target="_blank" rel="noopener noreferrer" className="nav-button p-2 rounded-lg"><Download className="w-4 h-4 text-blue-600" /></a>
                  <button onClick={() => { if (confirm('Eliminare?')) deleteMutation.mutate(doc.id); }} className="nav-button p-2 rounded-lg"><Trash2 className="w-4 h-4 text-red-600" /></button>
                </div>
              </div>
            </NeumorphicCard>
          ))}
        </div>}
      </NeumorphicCard>
    </>
  );
}