import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Video,
  Plus,
  Trash2,
  Save,
  Upload,
  GripVertical,
  CheckCircle,
  ArrowLeft,
  Clock,
  HelpCircle,
  X
} from 'lucide-react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function CreaCorso() {
  const urlParams = new URLSearchParams(window.location.search);
  const templateId = urlParams.get('templateId');

  const [sessioni, setSessioni] = useState([]);
  const [quiz, setQuiz] = useState([]);
  const [uploading, setUploading] = useState({});
  const [saving, setSaving] = useState(false);

  const queryClient = useQueryClient();

  const { data: template, isLoading } = useQuery({
    queryKey: ['corso-template', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      const templates = await base44.entities.CorsoTemplate.filter({ id: templateId });
      return templates[0] || null;
    },
    enabled: !!templateId
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  useEffect(() => {
    if (template) {
      setSessioni(template.sessioni || []);
      setQuiz(template.quiz || []);
    }
  }, [template]);

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CorsoTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corso-template', templateId] });
    },
  });

  const createCorsoMutation = useMutation({
    mutationFn: (data) => base44.entities.Corso.create(data),
  });

  const handleVideoUpload = async (index, file) => {
    if (!file) return;

    setUploading(prev => ({ ...prev, [index]: true }));
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const newSessioni = [...sessioni];
      newSessioni[index] = {
        ...newSessioni[index],
        video_url: file_url
      };
      setSessioni(newSessioni);
    } catch (error) {
      console.error('Errore upload video:', error);
      alert('Errore durante il caricamento del video');
    } finally {
      setUploading(prev => ({ ...prev, [index]: false }));
    }
  };

  const addSessione = () => {
    setSessioni([...sessioni, {
      titolo: '',
      video_url: '',
      durata_minuti: 0,
      ordine: sessioni.length + 1
    }]);
  };

  const updateSessione = (index, field, value) => {
    const newSessioni = [...sessioni];
    newSessioni[index][field] = value;
    setSessioni(newSessioni);
  };

  const removeSessione = (index) => {
    setSessioni(sessioni.filter((_, i) => i !== index));
  };

  const addQuizQuestion = () => {
    setQuiz([...quiz, {
      domanda: '',
      opzioni: ['', '', '', ''],
      risposta_corretta: 0
    }]);
  };

  const updateQuizQuestion = (index, field, value) => {
    const newQuiz = [...quiz];
    newQuiz[index][field] = value;
    setQuiz(newQuiz);
  };

  const updateQuizOption = (qIndex, oIndex, value) => {
    const newQuiz = [...quiz];
    newQuiz[qIndex].opzioni[oIndex] = value;
    setQuiz(newQuiz);
  };

  const removeQuizQuestion = (index) => {
    setQuiz(quiz.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async () => {
    if (!templateId) return;
    
    setSaving(true);
    try {
      await updateTemplateMutation.mutateAsync({
        id: templateId,
        data: {
          sessioni,
          quiz,
          status: 'in_lavorazione'
        }
      });
      alert('Bozza salvata!');
    } catch (error) {
      console.error('Errore salvataggio:', error);
      alert('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!template) return;

    // Validazione
    if (sessioni.length === 0) {
      alert('Aggiungi almeno una sessione video');
      return;
    }

    const sessioniInvalide = sessioni.filter(s => !s.titolo || !s.video_url);
    if (sessioniInvalide.length > 0) {
      alert('Tutte le sessioni devono avere titolo e video');
      return;
    }

    if (quiz.length === 0) {
      alert('Aggiungi almeno una domanda al quiz');
      return;
    }

    const quizInvalido = quiz.filter(q => !q.domanda || q.opzioni.filter(o => o).length < 2);
    if (quizInvalido.length > 0) {
      alert('Tutte le domande devono avere testo e almeno 2 opzioni');
      return;
    }

    setSaving(true);
    try {
      // Calcola durata totale
      const durataTotale = sessioni.reduce((acc, s) => acc + (s.durata_minuti || 5) * 60, 0);

      // Crea il corso vero e proprio
      // Per ogni sessione, creiamo un corso separato (come funziona il sistema attuale)
      // oppure creiamo un corso unico con video concatenati
      // Per semplicità, creiamo corsi separati per ogni sessione

      for (let i = 0; i < sessioni.length; i++) {
        const sessione = sessioni[i];
        const isLastSession = i === sessioni.length - 1;
        
        await createCorsoMutation.mutateAsync({
          nome_corso: `${template.titolo} - ${sessione.titolo}`,
          ruoli: template.ruoli_target || ['Pizzaiolo', 'Cassiere', 'Store Manager'],
          link_video: sessione.video_url,
          durata_lezione: (sessione.durata_minuti || 5) * 60,
          domande: isLastSession ? quiz.map(q => ({
            testo_domanda: q.domanda,
            risposte: q.opzioni.filter(o => o).map((o, idx) => ({
              testo_risposta: o,
              corretta: idx === q.risposta_corretta
            }))
          })) : [],
          attivo: true,
          ordine: i
        });
      }

      // Aggiorna il template come completato
      await updateTemplateMutation.mutateAsync({
        id: templateId,
        data: {
          sessioni,
          quiz,
          status: 'completato'
        }
      });

      alert('Corso pubblicato con successo!');
      window.location.href = createPageUrl('AcademyAdmin');
    } catch (error) {
      console.error('Errore pubblicazione:', error);
      alert('Errore durante la pubblicazione');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <NeumorphicCard className="p-12 text-center">
          <p className="text-slate-500">Caricamento...</p>
        </NeumorphicCard>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <NeumorphicCard className="p-12 text-center">
          <p className="text-slate-500">Template non trovato</p>
          <Link to={createPageUrl('AcademyAdmin')} className="text-blue-600 hover:underline mt-4 inline-block">
            Torna all'Academy
          </Link>
        </NeumorphicCard>
      </div>
    );
  }

  const storeNames = template.stores_target?.map(storeId => {
    const store = stores.find(s => s.id === storeId);
    return store?.name || storeId;
  }).join(', ');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to={createPageUrl('AcademyAdmin')} className="nav-button p-2 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
            {template.titolo}
          </h1>
          <div className="flex flex-wrap gap-2 mt-2">
            {template.ruoli_target?.map(ruolo => (
              <span key={ruolo} className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {ruolo}
              </span>
            ))}
            {template.categoria && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                {template.categoria}
              </span>
            )}
            {storeNames && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                {storeNames}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sessioni Video */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Video className="w-6 h-6 text-blue-600" />
            Sessioni Video
          </h2>
          <NeumorphicButton onClick={addSessione} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Aggiungi Sessione
          </NeumorphicButton>
        </div>

        {sessioni.length === 0 ? (
          <div className="neumorphic-pressed p-8 rounded-xl text-center">
            <Video className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nessuna sessione video</p>
            <p className="text-sm text-slate-400 mt-1">Clicca "Aggiungi Sessione" per iniziare</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessioni.map((sessione, index) => (
              <div key={index} className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <GripVertical className="w-5 h-5" />
                    <span className="font-bold text-lg">{index + 1}</span>
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <input
                      type="text"
                      value={sessione.titolo}
                      onChange={(e) => updateSessione(index, 'titolo', e.target.value)}
                      placeholder="Titolo sessione (es. Introduzione, Tecniche base...)"
                      className="w-full neumorphic-flat px-4 py-3 rounded-xl text-slate-700 outline-none"
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-slate-600 mb-2 block">
                          Video
                        </label>
                        {sessione.video_url ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-green-600">Video caricato</span>
                            <button
                              onClick={() => updateSessione(index, 'video_url', '')}
                              className="text-red-600 hover:text-red-700 ml-2"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 neumorphic-flat px-4 py-3 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                            {uploading[index] ? (
                              <span className="text-sm text-slate-500">Caricamento...</span>
                            ) : (
                              <>
                                <Upload className="w-5 h-5 text-slate-500" />
                                <span className="text-sm text-slate-500">Carica video</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => handleVideoUpload(index, e.target.files[0])}
                              disabled={uploading[index]}
                            />
                          </label>
                        )}
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-slate-600 mb-2 block flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Durata (minuti)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={sessione.durata_minuti || ''}
                          onChange={(e) => updateSessione(index, 'durata_minuti', parseInt(e.target.value) || 0)}
                          placeholder="5"
                          className="w-full neumorphic-flat px-4 py-3 rounded-xl text-slate-700 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removeSessione(index)}
                    className="nav-button p-2 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </NeumorphicCard>

      {/* Quiz Finale */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-purple-600" />
            Quiz Finale
          </h2>
          <NeumorphicButton onClick={addQuizQuestion} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Aggiungi Domanda
          </NeumorphicButton>
        </div>

        {quiz.length === 0 ? (
          <div className="neumorphic-pressed p-8 rounded-xl text-center">
            <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nessuna domanda</p>
            <p className="text-sm text-slate-400 mt-1">Aggiungi domande per il quiz finale</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quiz.map((q, qIndex) => (
              <div key={qIndex} className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-start justify-between mb-3">
                  <span className="font-bold text-slate-600">Domanda {qIndex + 1}</span>
                  <button
                    onClick={() => removeQuizQuestion(qIndex)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <input
                  type="text"
                  value={q.domanda}
                  onChange={(e) => updateQuizQuestion(qIndex, 'domanda', e.target.value)}
                  placeholder="Testo della domanda"
                  className="w-full neumorphic-flat px-4 py-3 rounded-xl text-slate-700 outline-none mb-3"
                />
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">
                    Opzioni (seleziona la risposta corretta)
                  </label>
                  {q.opzioni.map((opzione, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`risposta-${qIndex}`}
                        checked={q.risposta_corretta === oIndex}
                        onChange={() => updateQuizQuestion(qIndex, 'risposta_corretta', oIndex)}
                        className="w-4 h-4"
                      />
                      <input
                        type="text"
                        value={opzione}
                        onChange={(e) => updateQuizOption(qIndex, oIndex, e.target.value)}
                        placeholder={`Opzione ${oIndex + 1}`}
                        className="flex-1 neumorphic-flat px-3 py-2 rounded-lg text-slate-700 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </NeumorphicCard>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <NeumorphicButton
          onClick={handleSaveDraft}
          disabled={saving}
          className="flex items-center gap-2"
        >
          <Save className="w-5 h-5" />
          Salva Bozza
        </NeumorphicButton>
        <NeumorphicButton
          onClick={handlePublish}
          disabled={saving || sessioni.length === 0 || quiz.length === 0}
          variant="primary"
          className="flex items-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          Pubblica Corso
        </NeumorphicButton>
      </div>
    </div>
  );
}