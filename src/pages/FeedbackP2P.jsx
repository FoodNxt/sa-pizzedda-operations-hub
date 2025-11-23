import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Edit, Trash2, Save, X, Send, CheckCircle, Star } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { startOfWeek, endOfWeek, subWeeks, parseISO } from 'date-fns';

export default function FeedbackP2P() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('admin');
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showSendNowModal, setShowSendNowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    metric_name: '',
    metric_description: '',
    question_order: 1
  });
  const [configForm, setConfigForm] = useState({
    frequency_type: 'weekly',
    custom_days_interval: 7,
    is_active: true
  });

  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      const normalizedUserType = user.user_type === 'user' ? 'dipendente' : user.user_type;
      if (normalizedUserType === 'dipendente') {
        setActiveTab('dipendente');
      }
    });
  }, []);

  const { data: questions = [] } = useQuery({
    queryKey: ['p2p-questions'],
    queryFn: () => base44.entities.P2PFeedbackQuestion.list('question_order'),
  });

  const { data: responses = [] } = useQuery({
    queryKey: ['p2p-responses'],
    queryFn: () => base44.entities.P2PFeedbackResponse.list('-submitted_date'),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['dipendenti-users'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.user_type === 'dipendente' || u.user_type === 'user');
    },
  });

  const { data: feedbackConfig = [] } = useQuery({
    queryKey: ['p2p-feedback-config'],
    queryFn: () => base44.entities.P2PFeedbackConfig.list(),
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (data) => {
      const existing = feedbackConfig[0];
      if (existing) {
        return base44.entities.P2PFeedbackConfig.update(existing.id, data);
      }
      return base44.entities.P2PFeedbackConfig.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2p-feedback-config'] });
      setShowConfigModal(false);
      alert('Configurazione salvata!');
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: (data) => base44.entities.P2PFeedbackQuestion.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2p-questions'] });
      resetQuestionForm();
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.P2PFeedbackQuestion.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2p-questions'] });
      resetQuestionForm();
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (id) => base44.entities.P2PFeedbackQuestion.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2p-questions'] });
    },
  });

  const submitResponseMutation = useMutation({
    mutationFn: (data) => base44.entities.P2PFeedbackResponse.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2p-responses'] });
    },
    onError: (error) => {
      console.error('Errore invio feedback:', error);
      alert('Errore durante l\'invio del feedback. Riprova.');
    }
  });

  const resetQuestionForm = () => {
    setQuestionForm({
      metric_name: '',
      metric_description: '',
      question_order: questions.length + 1
    });
    setEditingQuestion(null);
    setShowQuestionForm(false);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setQuestionForm({
      metric_name: question.metric_name,
      metric_description: question.metric_description || '',
      question_order: question.question_order
    });
    setShowQuestionForm(true);
  };

  const handleSubmitQuestion = (e) => {
    e.preventDefault();
    if (editingQuestion) {
      updateQuestionMutation.mutate({ id: editingQuestion.id, data: questionForm });
    } else {
      createQuestionMutation.mutate(questionForm);
    }
  };

  // Get colleagues from last 7 days before form was sent
  const getLastWeekColleagues = useMemo(() => {
    if (!currentUser) return [];

    const employeeName = currentUser.nome_cognome || currentUser.full_name || currentUser.email;
    
    // Use last_sent_date from config, or default to 7 days ago
    const lastSentDate = feedbackConfig[0]?.last_sent_date;
    const referenceDate = lastSentDate ? parseISO(lastSentDate) : new Date();
    
    // Get shifts from 7 days before the form was sent
    const sevenDaysBeforeForm = new Date(referenceDate);
    sevenDaysBeforeForm.setDate(sevenDaysBeforeForm.getDate() - 7);

    const myShifts = shifts.filter(s => {
      if (s.employee_name !== employeeName || !s.shift_date) return false;
      try {
        const shiftDate = parseISO(s.shift_date);
        if (isNaN(shiftDate.getTime())) return false;
        return shiftDate >= sevenDaysBeforeForm && shiftDate <= referenceDate;
      } catch (e) {
        return false;
      }
    });

    const colleaguesSet = new Set();
    myShifts.forEach(myShift => {
      shifts.forEach(otherShift => {
        if (otherShift.employee_name !== employeeName &&
            otherShift.shift_date === myShift.shift_date &&
            otherShift.store_id === myShift.store_id) {
          colleaguesSet.add(otherShift.employee_name);
        }
      });
    });

    // Filter out colleagues already reviewed for this cycle (based on last_sent_date)
    const alreadyReviewed = responses
      .filter(r => {
        if (r.reviewer_id !== currentUser.id) return false;
        // If form was sent, only count reviews after that date
        if (lastSentDate && r.submitted_date) {
          try {
            const submittedDate = new Date(r.submitted_date);
            const sentDate = new Date(lastSentDate);
            return submittedDate >= sentDate;
          } catch (e) {
            return false;
          }
        }
        return true;
      })
      .map(r => r.reviewed_name);

    return Array.from(colleaguesSet).filter(name => !alreadyReviewed.includes(name));
  }, [currentUser, shifts, responses, feedbackConfig]);

  const normalizedUserType = currentUser ? (currentUser.user_type === 'user' ? 'dipendente' : currentUser.user_type) : null;
  const isAdmin = normalizedUserType === 'admin' || normalizedUserType === 'manager';

  if (!currentUser) {
    return (
      <ProtectedPage pageName="FeedbackP2P">
        <div className="max-w-7xl mx-auto space-y-6">
          <p>Caricamento...</p>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage pageName="FeedbackP2P">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
            Feedback P2P
          </h1>
          <p className="text-sm text-slate-500">Valutazione tra colleghi</p>
        </div>

        {isAdmin && (
          <NeumorphicCard className="p-6">
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  activeTab === 'admin' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                    : 'nav-button text-slate-700'
                }`}
              >
                Gestione Form
              </button>
              <button
                onClick={() => setActiveTab('responses')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  activeTab === 'responses' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                    : 'nav-button text-slate-700'
                }`}
              >
                Risposte
              </button>
              <button
                onClick={() => setActiveTab('config')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  activeTab === 'config' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                    : 'nav-button text-slate-700'
                }`}
              >
                Configurazione
              </button>
            </div>

            {activeTab === 'admin' && (
              <>
                <div className="mb-6 flex gap-3">
                  <NeumorphicButton
                    onClick={() => setShowQuestionForm(true)}
                    variant="primary"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Aggiungi Metrica
                  </NeumorphicButton>
                  <NeumorphicButton
                    onClick={() => setShowSendNowModal(true)}
                    className="flex items-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    Invia Ora
                  </NeumorphicButton>
                </div>

                <div className="space-y-3">
                  {questions.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">Nessuna domanda creata</p>
                    </div>
                  ) : (
                    questions.map(q => (
                      <NeumorphicCard key={q.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-slate-500">#{q.question_order}</span>
                              <h3 className="font-bold text-slate-800">{q.metric_name}</h3>
                            </div>
                            {q.metric_description && (
                              <p className="text-sm text-slate-600">{q.metric_description}</p>
                            )}
                            <p className="text-xs text-purple-600 mt-2">Punteggio: 1-5</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditQuestion(q)}
                              className="nav-button p-2 rounded-lg"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Eliminare questa metrica?')) {
                                  deleteQuestionMutation.mutate(q.id);
                                }
                              }}
                              className="nav-button p-2 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      </NeumorphicCard>
                    ))
                  )}
                </div>
              </>
            )}

            {activeTab === 'responses' && (
              <div className="space-y-3">
                {responses.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nessuna risposta ricevuta</p>
                  </div>
                ) : (
                  responses.map(r => (
                    <NeumorphicCard key={r.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold text-slate-800">{r.reviewer_name}</p>
                          <p className="text-xs text-slate-500">ha valutato {r.reviewed_name}</p>
                        </div>
                        <span className="text-xs text-slate-500">
                          {(() => {
                            try {
                              return new Date(r.submitted_date).toLocaleDateString('it-IT');
                            } catch (e) {
                              return 'N/A';
                            }
                          })()}
                        </span>
                      </div>
                      <div className="space-y-1">
                       {r.responses?.map((resp, idx) => (
                         <div key={idx} className="flex items-center justify-between">
                           <span className="text-xs text-slate-600">{resp.metric_name || resp.question_text}:</span>
                           <div className="flex items-center gap-1">
                             {[...Array(5)].map((_, i) => (
                               <Star
                                 key={i}
                                 className={`w-3 h-3 ${
                                   i < (resp.score || 0)
                                     ? 'text-yellow-500 fill-yellow-500'
                                     : 'text-gray-300'
                                 }`}
                               />
                             ))}
                             <span className="text-xs font-bold text-slate-800 ml-1">
                               {resp.score || resp.answer}
                             </span>
                           </div>
                         </div>
                       ))}
                      </div>
                    </NeumorphicCard>
                  ))
                )}
              </div>
            )}

            {activeTab === 'config' && (
              <div className="space-y-4">
                <NeumorphicCard className="p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Frequenza Invio Feedback</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Frequenza
                      </label>
                      <select
                        value={feedbackConfig[0]?.frequency_type || 'weekly'}
                        onChange={(e) => setConfigForm({ ...configForm, frequency_type: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      >
                        <option value="weekly">Settimanale</option>
                        <option value="monthly">Mensile</option>
                        <option value="custom_days">Personalizzato</option>
                      </select>
                    </div>
                    {(feedbackConfig[0]?.frequency_type === 'custom_days' || configForm.frequency_type === 'custom_days') && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Intervallo (giorni)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={configForm.custom_days_interval}
                          onChange={(e) => setConfigForm({ ...configForm, custom_days_interval: parseInt(e.target.value) || 7 })}
                          className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                        />
                      </div>
                    )}
                    <NeumorphicButton onClick={() => saveConfigMutation.mutate(configForm)} variant="primary" className="w-full">
                      <Save className="w-5 h-5 mr-2" />
                      Salva Configurazione
                    </NeumorphicButton>
                  </div>
                </NeumorphicCard>
              </div>
            )}
          </NeumorphicCard>
        )}

        {normalizedUserType === 'dipendente' && (
          <DipendenteView
            currentUser={currentUser}
            questions={questions.filter(q => q.is_active)}
            colleagues={getLastWeekColleagues}
            users={users}
            shifts={shifts}
            responses={responses}
            feedbackConfig={feedbackConfig}
            onSubmit={(data) => submitResponseMutation.mutate(data)}
          />
        )}

        {showSendNowModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-md w-full p-6">
              <div className="flex justify-between mb-4">
                <h2 className="text-xl font-bold">Invia Feedback Ora</h2>
                <button onClick={() => setShowSendNowModal(false)}><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Inviando il feedback ora, tutti i dipendenti riceveranno una notifica per valutare i colleghi.
              </p>
              <NeumorphicButton
                onClick={async () => {
                  const config = feedbackConfig[0];
                  if (config) {
                    await base44.entities.P2PFeedbackConfig.update(config.id, {
                      last_sent_date: new Date().toISOString().split('T')[0]
                    });
                  }
                  setShowSendNowModal(false);
                  alert('Promemoria inviato ai dipendenti!');
                  queryClient.invalidateQueries({ queryKey: ['p2p-feedback-config'] });
                }}
                variant="primary"
                className="w-full"
              >
                <Send className="w-5 h-5 mr-2" />
                Invia Promemoria
              </NeumorphicButton>
            </NeumorphicCard>
          </div>
        )}

        {showQuestionForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <NeumorphicCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">
                    {editingQuestion ? 'Modifica Metrica' : 'Nuova Metrica'}
                  </h2>
                  <button onClick={resetQuestionForm} className="nav-button p-2 rounded-lg">
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                <form onSubmit={handleSubmitQuestion} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Nome Metrica
                    </label>
                    <input
                      type="text"
                      value={questionForm.metric_name}
                      onChange={(e) => setQuestionForm({ ...questionForm, metric_name: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      placeholder="es. Puntualità, Lavoro di squadra"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Descrizione (opzionale)
                    </label>
                    <input
                      type="text"
                      value={questionForm.metric_description}
                      onChange={(e) => setQuestionForm({ ...questionForm, metric_description: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      placeholder="es. Arriva sempre in orario"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Ordine
                    </label>
                    <input
                      type="number"
                      value={questionForm.question_order}
                      onChange={(e) => setQuestionForm({ ...questionForm, question_order: parseInt(e.target.value) || 1 })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      required
                    />
                  </div>

                  <div className="neumorphic-flat p-4 rounded-xl bg-purple-50">
                    <p className="text-xs text-purple-800">
                      <strong>ℹ️ Scala di valutazione:</strong> I dipendenti valuteranno questa metrica con un punteggio da 1 (molto basso) a 5 (eccellente)
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <NeumorphicButton type="button" onClick={resetQuestionForm} className="flex-1">
                      Annulla
                    </NeumorphicButton>
                    <NeumorphicButton type="submit" variant="primary" className="flex-1">
                      <Save className="w-5 h-5 mr-2" />
                      {editingQuestion ? 'Aggiorna' : 'Crea'}
                    </NeumorphicButton>
                  </div>
                </form>
              </NeumorphicCard>
            </div>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}

function DipendenteView({ currentUser, questions, colleagues, users, onSubmit, shifts, responses, feedbackConfig }) {
  const [selectedColleague, setSelectedColleague] = useState(null);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get shared shifts with selected colleague
  const getSharedShifts = useMemo(() => {
    if (!selectedColleague || !currentUser) return [];
    
    const employeeName = currentUser.nome_cognome || currentUser.full_name || currentUser.email;
    
    // Use last_sent_date from config, or default to now
    const lastSentDate = feedbackConfig[0]?.last_sent_date;
    const referenceDate = lastSentDate ? parseISO(lastSentDate) : new Date();
    
    // Get shifts from 7 days before the form was sent
    const sevenDaysBeforeForm = new Date(referenceDate);
    sevenDaysBeforeForm.setDate(sevenDaysBeforeForm.getDate() - 7);
    
    const myShifts = shifts.filter(s => {
      if (s.employee_name !== employeeName || !s.shift_date) return false;
      try {
        const shiftDate = parseISO(s.shift_date);
        if (isNaN(shiftDate.getTime())) return false;
        return shiftDate >= sevenDaysBeforeForm && shiftDate <= referenceDate;
      } catch (e) {
        return false;
      }
    });
    
    const sharedShifts = [];
    myShifts.forEach(myShift => {
      const colleagueShift = shifts.find(s => 
        s.employee_name === selectedColleague &&
        s.shift_date === myShift.shift_date &&
        s.store_id === myShift.store_id
      );
      if (colleagueShift) {
        sharedShifts.push({
          date: myShift.shift_date,
          store: myShift.store_name,
          myStart: myShift.scheduled_start,
          myEnd: myShift.scheduled_end,
          colleagueStart: colleagueShift.scheduled_start,
          colleagueEnd: colleagueShift.scheduled_end
        });
      }
    });
    
    return sharedShifts.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [selectedColleague, currentUser, shifts, feedbackConfig]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check all questions are answered
    const allAnswered = questions.every(q => answers[q.id]);
    if (!allAnswered) {
      alert('Per favore, rispondi a tutte le domande prima di inviare.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const colleague = users.find(u => (u.nome_cognome || u.full_name || u.email) === selectedColleague);
      
      const responseData = questions.map(q => ({
        metric_id: q.id,
        metric_name: q.metric_name,
        score: parseInt(answers[q.id])
      }));

      const lastSentDate = feedbackConfig[0]?.last_sent_date;
      const referenceDate = lastSentDate ? parseISO(lastSentDate) : new Date();
      const sevenDaysBeforeForm = new Date(referenceDate);
      sevenDaysBeforeForm.setDate(sevenDaysBeforeForm.getDate() - 7);

      await onSubmit({
        reviewer_id: currentUser.id,
        reviewer_name: currentUser.nome_cognome || currentUser.full_name || currentUser.email,
        reviewed_id: colleague?.id,
        reviewed_name: selectedColleague,
        week_start_date: sevenDaysBeforeForm.toISOString().split('T')[0],
        responses: responseData,
        submitted_date: new Date().toISOString()
      });

      alert('✅ Feedback inviato con successo!');
      setSelectedColleague(null);
      setAnswers({});
    } catch (error) {
      console.error('Errore invio feedback:', error);
      alert('❌ Errore durante l\'invio del feedback. Riprova.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (questions.length === 0) {
    return (
      <NeumorphicCard className="p-12 text-center">
        <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Nessun form disponibile al momento</p>
      </NeumorphicCard>
    );
  }

  if (colleagues.length === 0) {
    return (
      <NeumorphicCard className="p-12 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">Tutto completo! 🎉</h3>
        <p className="text-slate-500">Hai già valutato tutti i colleghi con cui hai lavorato la settimana scorsa</p>
      </NeumorphicCard>
    );
  }

  return (
    <NeumorphicCard className="p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Valuta i tuoi Colleghi</h2>
      <p className="text-sm text-slate-500 mb-6">
        Seleziona un collega con cui hai lavorato la settimana scorsa e completa il questionario
      </p>

      {!selectedColleague ? (
        <div className="space-y-6">
          {(() => {
            const lastSentDate = feedbackConfig[0]?.last_sent_date;
            
            const completedThisCycle = responses.filter(r => {
              if (r.reviewer_id !== currentUser.id) return false;
              // If form was sent, only count reviews after that date
              if (lastSentDate && r.submitted_date) {
                try {
                  const submittedDate = new Date(r.submitted_date);
                  const sentDate = new Date(lastSentDate);
                  return submittedDate >= sentDate;
                } catch (e) {
                  return false;
                }
              }
              return true;
            });

            return (
              <>
                {lastSentDate && (
                  <div className="neumorphic-flat p-4 rounded-xl bg-blue-50">
                    <p className="text-sm text-blue-800">
                      <strong>📅 Form inviato il:</strong> {new Date(lastSentDate).toLocaleDateString('it-IT', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Valuta i colleghi con cui hai lavorato nei 7 giorni precedenti
                    </p>
                  </div>
                )}
                
                {completedThisCycle.length > 0 && (
                  <div className="neumorphic-flat p-4 rounded-xl bg-green-50">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h3 className="font-bold text-green-800">Valutazioni Completate ({completedThisCycle.length})</h3>
                    </div>
                    <div className="space-y-1">
                      {completedThisCycle.map(resp => (
                        <div key={resp.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-800 font-medium">{resp.reviewed_name}</span>
                          </div>
                          <span className="text-xs text-green-600">
                            {(() => {
                              try {
                                return new Date(resp.submitted_date).toLocaleString('it-IT', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                });
                              } catch (e) {
                                return 'N/A';
                              }
                            })()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {colleagues.map(colleague => (
              <button
                key={colleague}
                onClick={() => setSelectedColleague(colleague)}
                className="nav-button p-4 rounded-xl text-left hover:shadow-lg transition-all"
              >
                <p className="font-bold text-slate-800">{colleague}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="neumorphic-pressed p-4 rounded-xl mb-6">
            <p className="text-sm text-slate-500">Stai valutando</p>
            <p className="text-lg font-bold text-slate-800 mb-3">{selectedColleague}</p>
            
            {getSharedShifts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-300">
                <p className="text-xs text-slate-500 mb-2 font-medium">Turni condivisi la settimana scorsa:</p>
                <div className="space-y-2">
                  {getSharedShifts.map((shift, idx) => (
                    <div key={idx} className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-700">
                          {(() => {
                            try {
                              return new Date(shift.date).toLocaleDateString('it-IT', { 
                                weekday: 'short', 
                                day: 'numeric', 
                                month: 'short' 
                              });
                            } catch (e) {
                              return shift.date;
                            }
                          })()}
                        </span>
                        <span className="text-blue-600">• {shift.store}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {shift.myStart && shift.myEnd && (
                          <span>
                            {new Date(shift.myStart).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.myEnd).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {questions.map(q => (
            <div key={q.id}>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                {q.metric_name}
                {q.metric_description && (
                  <span className="text-xs text-slate-500 block mt-1">{q.metric_description}</span>
                )}
              </label>
              <div className="flex gap-2 justify-between">
                {[1, 2, 3, 4, 5].map(score => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setAnswers({ ...answers, [q.id]: score })}
                    className={`flex-1 py-3 px-2 rounded-xl text-center font-bold transition-all ${
                      answers[q.id] === score
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                        : 'nav-button text-slate-700'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-1 px-1">
                <span className="text-xs text-slate-500">Basso</span>
                <span className="text-xs text-slate-500">Eccellente</span>
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-4">
            <NeumorphicButton 
              type="button" 
              onClick={() => { setSelectedColleague(null); setAnswers({}); }}
              className="flex-1"
              disabled={isSubmitting}
            >
              Annulla
            </NeumorphicButton>
            <NeumorphicButton 
              type="submit" 
              variant="primary" 
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>Invio in corso...</>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Invia Feedback
                </>
              )}
            </NeumorphicButton>
          </div>
        </form>
      )}
    </NeumorphicCard>
  );
}