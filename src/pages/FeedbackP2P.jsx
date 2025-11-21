import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Edit, Trash2, Save, X, Send, CheckCircle } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { startOfWeek, endOfWeek, subWeeks, parseISO } from 'date-fns';

export default function FeedbackP2P() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('admin');
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    question_order: 1,
    options: ['', '', '']
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
      alert('Feedback inviato con successo!');
    },
  });

  const resetQuestionForm = () => {
    setQuestionForm({
      question_text: '',
      question_order: questions.length + 1,
      options: ['', '', '']
    });
    setEditingQuestion(null);
    setShowQuestionForm(false);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setQuestionForm({
      question_text: question.question_text,
      question_order: question.question_order,
      options: question.options || ['', '', '']
    });
    setShowQuestionForm(true);
  };

  const handleSubmitQuestion = (e) => {
    e.preventDefault();
    const filteredOptions = questionForm.options.filter(o => o.trim() !== '');
    if (filteredOptions.length < 2) {
      alert('Inserisci almeno 2 opzioni di risposta');
      return;
    }
    const data = { ...questionForm, options: filteredOptions };
    if (editingQuestion) {
      updateQuestionMutation.mutate({ id: editingQuestion.id, data });
    } else {
      createQuestionMutation.mutate(data);
    }
  };

  const addOption = () => {
    setQuestionForm({ ...questionForm, options: [...questionForm.options, ''] });
  };

  const removeOption = (index) => {
    const newOptions = questionForm.options.filter((_, i) => i !== index);
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  const updateOption = (index, value) => {
    const newOptions = [...questionForm.options];
    newOptions[index] = value;
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  // Get colleagues from last week
  const getLastWeekColleagues = useMemo(() => {
    if (!currentUser) return [];

    const employeeName = currentUser.nome_cognome || currentUser.full_name || currentUser.email;
    const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });

    const myShifts = shifts.filter(s => {
      if (s.employee_name !== employeeName) return false;
      const shiftDate = parseISO(s.shift_date);
      return shiftDate >= lastWeekStart && shiftDate <= lastWeekEnd;
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

    const alreadyReviewed = responses
      .filter(r => r.reviewer_id === currentUser.id)
      .map(r => r.reviewed_name);

    return Array.from(colleaguesSet).filter(name => !alreadyReviewed.includes(name));
  }, [currentUser, shifts, responses]);

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
            </div>

            {activeTab === 'admin' && (
              <>
                <div className="mb-6">
                  <NeumorphicButton
                    onClick={() => setShowQuestionForm(true)}
                    variant="primary"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Aggiungi Domanda
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
                              <h3 className="font-bold text-slate-800">{q.question_text}</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {q.options?.map((opt, idx) => (
                                <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  {opt}
                                </span>
                              ))}
                            </div>
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
                                if (confirm('Eliminare questa domanda?')) {
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
                          {new Date(r.submitted_date).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {r.responses?.map((resp, idx) => (
                          <div key={idx} className="neumorphic-pressed p-3 rounded-lg">
                            <p className="text-xs font-medium text-slate-700 mb-1">{resp.question_text}</p>
                            <p className="text-sm text-slate-800">{resp.answer}</p>
                          </div>
                        ))}
                      </div>
                    </NeumorphicCard>
                  ))
                )}
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
            onSubmit={(data) => submitResponseMutation.mutate(data)}
          />
        )}

        {showQuestionForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <NeumorphicCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">
                    {editingQuestion ? 'Modifica Domanda' : 'Nuova Domanda'}
                  </h2>
                  <button onClick={resetQuestionForm} className="nav-button p-2 rounded-lg">
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                <form onSubmit={handleSubmitQuestion} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Testo Domanda
                    </label>
                    <input
                      type="text"
                      value={questionForm.question_text}
                      onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      required
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

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Opzioni di Risposta
                    </label>
                    <div className="space-y-2">
                      {questionForm.options.map((opt, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateOption(idx, e.target.value)}
                            className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                            placeholder={`Opzione ${idx + 1}`}
                          />
                          {questionForm.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(idx)}
                              className="nav-button p-3 rounded-lg"
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </button>
                          )}
                        </div>
                      ))}
                      <NeumorphicButton
                        type="button"
                        onClick={addOption}
                        className="w-full"
                      >
                        + Aggiungi Opzione
                      </NeumorphicButton>
                    </div>
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

function DipendenteView({ currentUser, questions, colleagues, users, onSubmit }) {
  const [selectedColleague, setSelectedColleague] = useState(null);
  const [answers, setAnswers] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const colleague = users.find(u => (u.nome_cognome || u.full_name || u.email) === selectedColleague);
    
    const responses = questions.map(q => ({
      question_id: q.id,
      question_text: q.question_text,
      answer: answers[q.id] || ''
    }));

    const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });

    onSubmit({
      reviewer_id: currentUser.id,
      reviewer_name: currentUser.nome_cognome || currentUser.full_name || currentUser.email,
      reviewed_id: colleague?.id,
      reviewed_name: selectedColleague,
      week_start_date: lastWeekStart.toISOString().split('T')[0],
      responses,
      submitted_date: new Date().toISOString()
    });

    setSelectedColleague(null);
    setAnswers({});
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
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="neumorphic-pressed p-4 rounded-xl mb-6">
            <p className="text-sm text-slate-500">Stai valutando</p>
            <p className="text-lg font-bold text-slate-800">{selectedColleague}</p>
          </div>

          {questions.map(q => (
            <div key={q.id}>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                {q.question_text}
              </label>
              <select
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                required
              >
                <option value="">Seleziona una risposta...</option>
                {q.options?.map((opt, idx) => (
                  <option key={idx} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          ))}

          <div className="flex gap-3 pt-4">
            <NeumorphicButton 
              type="button" 
              onClick={() => { setSelectedColleague(null); setAnswers({}); }}
              className="flex-1"
            >
              Annulla
            </NeumorphicButton>
            <NeumorphicButton type="submit" variant="primary" className="flex-1">
              <Send className="w-5 h-5 mr-2" />
              Invia Feedback
            </NeumorphicButton>
          </div>
        </form>
      )}
    </NeumorphicCard>
  );
}