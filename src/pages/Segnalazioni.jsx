import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { Camera, AlertTriangle, CheckCircle, Clock, User, Upload, Loader2, X, Save, Trash2, FileText, Plus, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

import ProtectedPage from "../components/ProtectedPage";

export default function Segnalazioni() {
  const [showForm, setShowForm] = useState(false);
  const [selectedSegnalazione, setSelectedSegnalazione] = useState(null);
  const [formData, setFormData] = useState({
    store_id: '',
    descrizione: '',
    foto_url: ''
  });
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [showLetteraModal, setShowLetteraModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedDipendenteLettera, setSelectedDipendenteLettera] = useState('');
  const [testoLettera, setTestoLettera] = useState('');
  const [loadingLettera, setLoadingLettera] = useState(false);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: segnalazioni = [] } = useQuery({
    queryKey: ['segnalazioni'],
    queryFn: () => base44.entities.Segnalazione.list('-data_segnalazione'),
  });

  const { data: dipendenti = [] } = useQuery({
    queryKey: ['dipendenti-segnalazioni'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.user_type === 'dipendente' || u.user_type === 'user');
    },
  });

  const { data: lettereTemplates = [] } = useQuery({
    queryKey: ['lettere-templates'],
    queryFn: () => base44.entities.LetteraRichiamoTemplate.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Segnalazione.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segnalazioni'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Segnalazione.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segnalazioni'] });
      setSelectedSegnalazione(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Segnalazione.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segnalazioni'] });
    },
  });

  const isStoreManager = user?.ruoli_dipendente?.includes('Store Manager');
  const isAdmin = user?.user_type === 'admin' || user?.user_type === 'manager';

  const resetForm = () => {
    setFormData({ store_id: '', descrizione: '', foto_url: '' });
    setPhotoPreview(null);
    setShowForm(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, foto_url: file_url }));
      setPhotoPreview(file_url);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Errore nel caricamento della foto');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.store_id || !formData.descrizione) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    const store = stores.find(s => s.id === formData.store_id);

    const data = {
      ...formData,
      store_name: store?.name || '',
      dipendente_id: user.id,
      dipendente_nome: user.nome_cognome || user.full_name || user.email,
      data_segnalazione: new Date().toISOString(),
      stato: 'aperta'
    };

    createMutation.mutate(data);
  };

  const handleAssignResponsabile = (segnalazione, responsabileId) => {
    const responsabile = dipendenti.find(d => d.id === responsabileId);
    updateMutation.mutate({
      id: segnalazione.id,
      data: {
        responsabile_id: responsabileId,
        responsabile_nome: responsabile?.nome_cognome || responsabile?.full_name || responsabile?.email,
        stato: 'in_gestione'
      }
    });
  };

  const handleUpdateStato = (segnalazioneId, nuovoStato) => {
    const data = { stato: nuovoStato };
    if (nuovoStato === 'risolta') {
      data.data_risoluzione = new Date().toISOString();
    }
    updateMutation.mutate({ id: segnalazioneId, data });
  };

  const getStatoColor = (stato) => {
    switch(stato) {
      case 'aperta': return 'bg-red-100 text-red-700 border-red-200';
      case 'in_gestione': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'risolta': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatoIcon = (stato) => {
    switch(stato) {
      case 'aperta': return <AlertTriangle className="w-5 h-5" />;
      case 'in_gestione': return <Clock className="w-5 h-5" />;
      case 'risolta': return <CheckCircle className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const handleCaricaTemplate = () => {
    if (!selectedTemplate || !selectedDipendenteLettera) {
      alert('Seleziona un template e un dipendente');
      return;
    }

    const template = lettereTemplates.find(t => t.id === selectedTemplate);
    if (!template) return;

    const dipendente = dipendenti.find(d => d.id === selectedDipendenteLettera);
    const dipendenteNome = dipendente?.nome_cognome || dipendente?.full_name || dipendente?.email || '';

    // Sostituisci placeholders nel template
    let testo = template.contenuto || '';
    testo = testo.replace(/\[NOME_DIPENDENTE\]/g, dipendenteNome);
    testo = testo.replace(/\[DATA\]/g, new Date().toLocaleDateString('it-IT'));
    testo = testo.replace(/\[MOTIVO\]/g, selectedSegnalazione.descrizione);
    testo = testo.replace(/\[STORE\]/g, selectedSegnalazione.store_name);
    testo = testo.replace(/\[DATA_SEGNALAZIONE\]/g, new Date(selectedSegnalazione.data_segnalazione).toLocaleDateString('it-IT'));

    setTestoLettera(testo);
  };

  const handleInviaLettera = async () => {
    if (!selectedDipendenteLettera || !testoLettera) {
      alert('Compila tutti i campi');
      return;
    }

    try {
      const dipendente = dipendenti.find(d => d.id === selectedDipendenteLettera);

      await base44.entities.LetteraRichiamo.create({
        dipendente_id: selectedDipendenteLettera,
        dipendente_nome: dipendente?.nome_cognome || dipendente?.full_name || dipendente?.email || '',
        motivo: `Segnalazione: ${selectedSegnalazione.descrizione}`,
        contenuto: testoLettera,
        gravita: 'media',
        data_emissione: new Date().toISOString(),
        emessa_da: user.nome_cognome || user.full_name || user.email,
        stato: 'emessa'
      });

      alert('✅ Lettera di richiamo inviata');
      setShowLetteraModal(false);
      setSelectedSegnalazione(null);
      setSelectedDipendenteLettera('');
      setTestoLettera('');
      setSelectedTemplate('');
    } catch (error) {
      console.error('Errore invio lettera:', error);
      alert('❌ Errore nell\'invio della lettera');
    }
  };

  return (
    <ProtectedPage pageName="Segnalazioni">
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Segnalazioni</h1>
          <p className="text-[#9b9b9b]">{isAdmin ? 'Gestisci le segnalazioni dei dipendenti' : 'Segnala problemi e anomalie negli store'}</p>
        </div>
        {!isAdmin && (
          <NeumorphicButton
            onClick={() => setShowForm(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Camera className="w-5 h-5" />
            Nuova Segnalazione
          </NeumorphicButton>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NeumorphicCard className="p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-red-600">
            {segnalazioni.filter(s => s.stato === 'aperta').length}
          </p>
          <p className="text-sm text-[#9b9b9b]">Aperte</p>
        </NeumorphicCard>
        <NeumorphicCard className="p-6 text-center">
          <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-yellow-600">
            {segnalazioni.filter(s => s.stato === 'in_gestione').length}
          </p>
          <p className="text-sm text-[#9b9b9b]">In Gestione</p>
        </NeumorphicCard>
        <NeumorphicCard className="p-6 text-center">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-green-600">
            {segnalazioni.filter(s => s.stato === 'risolta').length}
          </p>
          <p className="text-sm text-[#9b9b9b]">Risolte</p>
        </NeumorphicCard>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full">
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#6b6b6b]">Nuova Segnalazione</h2>
                <button onClick={resetForm} className="text-[#9b9b9b] hover:text-[#6b6b6b]">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                    Store <span className="text-red-600">*</span>
                  </label>
                  <select
                    required
                    value={formData.store_id}
                    onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  >
                    <option value="">Seleziona uno store...</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                    Foto <span className="text-red-600">*</span>
                  </label>
                  {photoPreview ? (
                    <div className="relative">
                      <img src={photoPreview} alt="Preview" className="w-full h-64 object-cover rounded-xl" />
                      <button
                        type="button"
                        onClick={() => { setPhotoPreview(null); setFormData({ ...formData, foto_url: '' }); }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="neumorphic-pressed flex flex-col items-center justify-center h-48 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      {uploading ? (
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-2" />
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-[#8b7355] mb-2" />
                          <span className="text-[#6b6b6b] font-medium">Carica Foto</span>
                          <span className="text-sm text-[#9b9b9b] mt-1">Clicca o trascina un'immagine</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        required
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                    Descrizione Problema <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.descrizione}
                    onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none h-32 resize-none"
                    placeholder="Descrivi il problema riscontrato..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <NeumorphicButton type="button" onClick={resetForm}>
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton 
                    type="submit" 
                    variant="primary"
                    disabled={createMutation.isPending || uploading || !formData.foto_url}
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Invia Segnalazione'
                    )}
                  </NeumorphicButton>
                </div>
              </form>
            </NeumorphicCard>
          </div>
        </div>
      )}

      {/* Segnalazioni List */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Tutte le Segnalazioni</h2>
        
        {segnalazioni.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-[#9b9b9b] opacity-50 mx-auto mb-4" />
            <p className="text-[#9b9b9b]">Nessuna segnalazione presente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {segnalazioni.map((segnalazione) => (
              <div key={segnalazione.id} className="neumorphic-flat p-5 rounded-xl">
                <div className="flex items-start gap-4">
                  {/* Photo */}
                  {segnalazione.foto_url && (
                    <img 
                      src={segnalazione.foto_url} 
                      alt="Segnalazione" 
                      className="w-32 h-32 object-cover rounded-lg cursor-pointer hover:opacity-80"
                      onClick={() => window.open(segnalazione.foto_url, '_blank')}
                    />
                  )}

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-[#6b6b6b]">{segnalazione.store_name}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border-2 flex items-center gap-1 ${getStatoColor(segnalazione.stato)}`}>
                            {getStatoIcon(segnalazione.stato)}
                            {segnalazione.stato.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-[#9b9b9b]">
                          Segnalato da: {segnalazione.dipendente_nome} • {format(new Date(segnalazione.data_segnalazione), 'dd MMM yyyy HH:mm', { locale: it })}
                        </p>
                      </div>
                    </div>

                    <p className="text-[#6b6b6b] mb-3">{segnalazione.descrizione}</p>

                    {segnalazione.responsabile_nome && (
                      <div className="neumorphic-pressed p-3 rounded-lg bg-blue-50 mb-3">
                        <p className="text-sm text-blue-700">
                          <User className="w-4 h-4 inline mr-1" />
                          Responsabile: <strong>{segnalazione.responsabile_nome}</strong>
                        </p>
                      </div>
                    )}

                    {/* Admin Actions */}
                    {isAdmin && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <NeumorphicButton
                          onClick={() => handleUpdateStato(segnalazione.id, segnalazione.stato === 'risolta' ? 'aperta' : 'risolta')}
                          variant={segnalazione.stato === 'risolta' ? 'default' : 'primary'}
                          className="text-sm flex items-center gap-1"
                        >
                          {segnalazione.stato === 'risolta' ? (
                            <>
                              <XCircle className="w-4 h-4" />
                              Riapri
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Risolvi
                            </>
                          )}
                        </NeumorphicButton>
                        
                        <NeumorphicButton
                          onClick={() => {
                            setSelectedSegnalazione(segnalazione);
                            setShowLetteraModal(true);
                          }}
                          className="text-sm flex items-center gap-1 text-orange-600"
                        >
                          <FileText className="w-4 h-4" />
                          Lettera Richiamo
                        </NeumorphicButton>

                        <NeumorphicButton
                          onClick={() => {
                            if (confirm('Eliminare questa segnalazione?')) {
                              deleteMutation.mutate(segnalazione.id);
                            }
                          }}
                          className="text-sm flex items-center gap-1 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                          Elimina
                        </NeumorphicButton>
                      </div>
                    )}

                    {/* Dipendente Actions - can only resolve if not their own */}
                    {!isAdmin && !isStoreManager && segnalazione.stato !== 'risolta' && segnalazione.dipendente_id !== user?.id && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <NeumorphicButton
                          onClick={() => handleUpdateStato(segnalazione.id, 'risolta')}
                          className="text-sm flex items-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Segna come Risolta
                        </NeumorphicButton>
                      </div>
                    )}

                    {/* Store Manager Actions */}
                    {isStoreManager && !isAdmin && segnalazione.stato !== 'risolta' && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {!segnalazione.responsabile_id && (
                          <div className="flex items-center gap-2">
                            <select
                              onChange={(e) => handleAssignResponsabile(segnalazione, e.target.value)}
                              className="neumorphic-pressed px-3 py-2 rounded-lg text-sm outline-none"
                              defaultValue=""
                            >
                              <option value="">Assegna Responsabile...</option>
                              {dipendenti.map(dip => (
                                <option key={dip.id} value={dip.id}>
                                  {dip.nome_cognome || dip.full_name || dip.email}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        
                        <NeumorphicButton
                          onClick={() => handleUpdateStato(segnalazione.id, 'risolta')}
                          className="text-sm flex items-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Segna come Risolta
                        </NeumorphicButton>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </NeumorphicCard>

      {/* Lettera Richiamo Modal */}
      {showLetteraModal && selectedSegnalazione && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#6b6b6b]">Lettera di Richiamo</h2>
                <button 
                  onClick={() => { 
                    setShowLetteraModal(false); 
                    setSelectedSegnalazione(null);
                    setSelectedDipendenteLettera('');
                    setTestoLettera('');
                    setSelectedTemplate('');
                  }} 
                  className="text-[#9b9b9b]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Info Segnalazione */}
              <div className="mb-4 p-4 bg-red-50 rounded-xl border border-red-200">
                <p className="text-sm text-red-800 font-medium mb-1">Segnalazione:</p>
                <p className="text-sm text-red-700">{selectedSegnalazione.descrizione}</p>
                <p className="text-xs text-red-600 mt-2">
                  {selectedSegnalazione.store_name} • {format(new Date(selectedSegnalazione.data_segnalazione), 'dd/MM/yyyy HH:mm', { locale: it })}
                </p>
              </div>

              {/* Selezione Dipendente */}
              <div className="mb-4">
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                  Dipendente Destinatario *
                </label>
                <select
                  value={selectedDipendenteLettera}
                  onChange={(e) => setSelectedDipendenteLettera(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                >
                  <option value="">Seleziona dipendente...</option>
                  {dipendenti.map(dip => (
                    <option key={dip.id} value={dip.id}>
                      {dip.nome_cognome || dip.full_name || dip.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selezione Template */}
              {selectedDipendenteLettera && !testoLettera && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                    Template Lettera *
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                  >
                    <option value="">Seleziona template...</option>
                    {lettereTemplates.filter(t => t.attivo !== false).map(t => (
                      <option key={t.id} value={t.id}>{t.nome_template}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Carica template */}
              {selectedDipendenteLettera && selectedTemplate && !testoLettera && (
                <NeumorphicButton
                  onClick={handleCaricaTemplate}
                  variant="primary"
                  className="w-full mb-4 flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Carica e Modifica Template
                </NeumorphicButton>
              )}

              {/* Editor Testo */}
              {testoLettera && (
                <>
                  <div className="mb-4">
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Testo Lettera</label>
                    <textarea
                      value={testoLettera}
                      onChange={(e) => setTestoLettera(e.target.value)}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none min-h-[300px] font-serif text-sm"
                      placeholder="Modifica il testo della lettera..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <NeumorphicButton
                      onClick={() => {
                        setTestoLettera('');
                        setSelectedTemplate('');
                      }}
                      className="flex-1"
                    >
                      Indietro
                    </NeumorphicButton>
                    <NeumorphicButton
                      onClick={handleInviaLettera}
                      variant="primary"
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Invia Lettera
                    </NeumorphicButton>
                  </div>
                </>
              )}
            </NeumorphicCard>
          </div>
        </div>
      )}
    </div>
    </ProtectedPage>
  );
}