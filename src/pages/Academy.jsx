import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GraduationCap,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Award,
  AlertCircle
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function Academy() {
  const [selectedCorso, setSelectedCorso] = useState(null);
  const [videoWatched, setVideoWatched] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: corsi = [] } = useQuery({
    queryKey: ['corsi-attivi'],
    queryFn: () => base44.entities.Corso.filter({ attivo: true }),
  });

  const { data: progressi = [] } = useQuery({
    queryKey: ['miei-progressi', currentUser?.id],
    queryFn: () => currentUser ? base44.entities.CorsoProgresso.filter({ user_id: currentUser.id }) : [],
    enabled: !!currentUser,
  });

  const createProgressoMutation = useMutation({
    mutationFn: (data) => base44.entities.CorsoProgresso.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miei-progressi'] });
    },
  });

  const updateProgressoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CorsoProgresso.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miei-progressi'] });
    },
  });

  // Timer effect
  useEffect(() => {
    if (!timerStarted || !selectedCorso) return;

    const interval = setInterval(() => {
      setTimeElapsed(prev => {
        const newTime = prev + 1;
        if (newTime >= selectedCorso.durata_lezione) {
          setVideoWatched(true);
          return newTime;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStarted, selectedCorso]);

  const handleStartCorso = async (corso) => {
    setSelectedCorso(corso);
    setVideoWatched(false);
    setTimerStarted(false);
    setTimeElapsed(0);
    setShowQuiz(false);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizResults(null);

    // Create or update progress
    const existing = progressi.find(p => p.corso_id === corso.id);
    if (!existing) {
      await createProgressoMutation.mutateAsync({
        corso_id: corso.id,
        corso_nome: corso.nome_corso,
        user_id: currentUser.id,
        user_email: currentUser.email,
        user_name: currentUser.full_name || currentUser.email,
        stato: 'in_corso',
        data_inizio: new Date().toISOString(),
        tempo_video_guardato: 0,
        video_completato: false,
        risposte_date: [],
        tentativi: 0
      });
    } else if (existing.stato === 'fallito') {
      // Reset if previously failed
      await updateProgressoMutation.mutateAsync({
        id: existing.id,
        data: {
          ...existing,
          stato: 'in_corso',
          data_inizio: new Date().toISOString(),
          tempo_video_guardato: 0,
          video_completato: false,
          risposte_date: [],
          tentativi: (existing.tentativi || 0) + 1
        }
      });
    }
  };

  const handleStartVideo = () => {
    setTimerStarted(true);
  };

  const handleStartQuiz = () => {
    setShowQuiz(true);
  };

  const handleAnswerSelect = (domandaIndex, rispostaIndex) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [domandaIndex]: rispostaIndex
    });
  };

  const handleSubmitQuiz = async () => {
    const domande = selectedCorso.domande || [];
    let correctCount = 0;
    const results = {};

    domande.forEach((domanda, dIndex) => {
      const selectedRispostaIndex = selectedAnswers[dIndex];
      const corretta = domanda.risposte[selectedRispostaIndex]?.corretta || false;
      results[dIndex] = corretta;
      if (corretta) correctCount++;
    });

    const allCorrect = correctCount === domande.length;
    const punteggio = Math.round((correctCount / domande.length) * 100);

    setQuizResults(results);
    setQuizSubmitted(true);

    // Update progress
    const progresso = progressi.find(p => p.corso_id === selectedCorso.id);
    if (progresso) {
      const risposte_date = Object.keys(selectedAnswers).map(dIndex => ({
        domanda_index: parseInt(dIndex),
        risposta_index: selectedAnswers[dIndex],
        corretta: results[dIndex]
      }));

      await updateProgressoMutation.mutateAsync({
        id: progresso.id,
        data: {
          ...progresso,
          stato: allCorrect ? 'completato' : 'fallito',
          data_completamento: allCorrect ? new Date().toISOString() : undefined,
          tempo_video_guardato: selectedCorso.durata_lezione,
          video_completato: true,
          risposte_date,
          punteggio
        }
      });
    }

    if (!allCorrect) {
      setTimeout(() => {
        alert('Alcune risposte sono errate. Dovrai rivedere la lezione.');
        setSelectedCorso(null);
      }, 3000);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const getYouTubeEmbedUrl = (url) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  // Filter courses by user role - check if ANY of the user's roles match ANY of the course's roles
  const userRoles = currentUser?.ruoli_dipendente || [];
  const availableCorsi = corsi.filter(corso => {
    const corsoRuoli = corso.ruoli || [];
    // Check if there's any overlap between user roles and course roles
    return corsoRuoli.some(ruolo => userRoles.includes(ruolo));
  });

  const corsiCompletati = progressi.filter(p => p.stato === 'completato').length;
  const corsiInCorso = progressi.filter(p => p.stato === 'in_corso').length;

  if (selectedCorso) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={() => setSelectedCorso(null)}
          className="flex items-center gap-2 text-[#6b6b6b] hover:text-[#8b7355]"
        >
          <ArrowLeft className="w-5 h-5" />
          Torna ai corsi
        </button>

        {/* Course Header */}
        <NeumorphicCard className="p-6">
          <h1 className="text-2xl font-bold text-[#6b6b6b] mb-2">{selectedCorso.nome_corso}</h1>
          <div className="flex items-center gap-4 text-sm text-[#9b9b9b]">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDuration(selectedCorso.durata_lezione)}
            </span>
            <span className="flex items-center gap-1">
              Ruoli: {(selectedCorso.ruoli || []).join(', ')}
            </span>
          </div>
        </NeumorphicCard>

        {/* Video Section */}
        {!showQuiz && (
          <NeumorphicCard className="p-6">
            <div className="aspect-video bg-black rounded-xl overflow-hidden mb-4">
              {timerStarted ? (
                <iframe
                  src={getYouTubeEmbedUrl(selectedCorso.link_video)}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                  <NeumorphicButton onClick={handleStartVideo} variant="primary" className="flex items-center gap-2">
                    <Play className="w-6 h-6" />
                    Inizia Video
                  </NeumorphicButton>
                </div>
              )}
            </div>

            {timerStarted && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[#6b6b6b]">Tempo trascorso:</span>
                  <span className="text-lg font-bold text-[#8b7355]">
                    {formatTime(timeElapsed)} / {formatTime(selectedCorso.durata_lezione)}
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-[#8b7355] h-3 rounded-full transition-all"
                    style={{ width: `${Math.min((timeElapsed / selectedCorso.durata_lezione) * 100, 100)}%` }}
                  />
                </div>

                {videoWatched ? (
                  <NeumorphicButton
                    onClick={handleStartQuiz}
                    variant="primary"
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Vai al Quiz
                  </NeumorphicButton>
                ) : (
                  <div className="neumorphic-pressed p-4 rounded-xl text-center">
                    <AlertCircle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                    <p className="text-sm text-[#6b6b6b]">
                      Devi guardare il video per almeno {formatDuration(selectedCorso.durata_lezione)} prima di accedere al quiz
                    </p>
                  </div>
                )}
              </div>
            )}
          </NeumorphicCard>
        )}

        {/* Quiz Section */}
        {showQuiz && (
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Quiz di Verifica</h2>

            <div className="space-y-6">
              {(selectedCorso.domande || []).map((domanda, dIndex) => (
                <div key={dIndex} className="neumorphic-pressed p-4 rounded-xl">
                  <h3 className="font-bold text-[#6b6b6b] mb-4">
                    Domanda {dIndex + 1}: {domanda.testo_domanda}
                  </h3>

                  <div className="space-y-2">
                    {domanda.risposte.map((risposta, rIndex) => {
                      const isSelected = selectedAnswers[dIndex] === rIndex;
                      const isCorrect = risposta.corretta;
                      const showResult = quizSubmitted;

                      let bgClass = '';
                      if (showResult) {
                        if (isSelected && isCorrect) bgClass = 'bg-green-100 border-green-500';
                        else if (isSelected && !isCorrect) bgClass = 'bg-red-100 border-red-500';
                        else if (isCorrect) bgClass = 'bg-green-50 border-green-300';
                      } else if (isSelected) {
                        bgClass = 'bg-blue-50 border-blue-500';
                      }

                      return (
                        <button
                          key={rIndex}
                          onClick={() => !quizSubmitted && handleAnswerSelect(dIndex, rIndex)}
                          disabled={quizSubmitted}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${bgClass} ${
                            !quizSubmitted ? 'hover:border-blue-300 cursor-pointer' : 'cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <span className="text-[#6b6b6b]">{risposta.testo_risposta}</span>
                            {showResult && isCorrect && (
                              <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                            )}
                            {showResult && isSelected && !isCorrect && (
                              <XCircle className="w-5 h-5 text-red-600 ml-auto" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {!quizSubmitted && (
              <NeumorphicButton
                onClick={handleSubmitQuiz}
                disabled={Object.keys(selectedAnswers).length !== (selectedCorso.domande || []).length}
                variant="primary"
                className="w-full mt-6"
              >
                Invia Risposte
              </NeumorphicButton>
            )}

            {quizSubmitted && quizResults && (
              <div className="mt-6">
                {Object.values(quizResults).every(r => r) ? (
                  <NeumorphicCard className="p-6 bg-green-50 text-center">
                    <Award className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-green-700 mb-2">Complimenti!</h3>
                    <p className="text-green-600">Hai completato con successo il corso!</p>
                  </NeumorphicCard>
                ) : (
                  <NeumorphicCard className="p-6 bg-red-50 text-center">
                    <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-red-700 mb-2">Riprova</h3>
                    <p className="text-red-600">Alcune risposte sono errate. Dovrai rivedere la lezione.</p>
                  </NeumorphicCard>
                )}
              </div>
            )}
          </NeumorphicCard>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Academy</h1>
        </div>
        <p className="text-[#9b9b9b]">Completa i corsi di formazione per il tuo ruolo</p>
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{availableCorsi.length}</h3>
          <p className="text-sm text-[#9b9b9b]">Corsi Disponibili</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Play className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-blue-600 mb-1">{corsiInCorso}</h3>
          <p className="text-sm text-[#9b9b9b]">In Corso</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Award className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">{corsiCompletati}</h3>
          <p className="text-sm text-[#9b9b9b]">Completati</p>
        </NeumorphicCard>
      </div>

      {/* Available Courses */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">I Tuoi Corsi</h2>

        {availableCorsi.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4" />
            <p className="text-[#9b9b9b]">Nessun corso disponibile per i tuoi ruoli</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableCorsi.map((corso) => {
              const progresso = progressi.find(p => p.corso_id === corso.id);
              const isCompletato = progresso?.stato === 'completato';
              const isInCorso = progresso?.stato === 'in_corso';

              return (
                <div key={corso.id} className="neumorphic-pressed p-4 rounded-xl">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-[#6b6b6b]">{corso.nome_corso}</h3>
                    {isCompletato && (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-[#9b9b9b] mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDuration(corso.durata_lezione)}
                    </span>
                    <span>{corso.domande?.length || 0} domande</span>
                  </div>

                  <NeumorphicButton
                    onClick={() => handleStartCorso(corso)}
                    variant={isCompletato ? "default" : "primary"}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {isCompletato ? 'Rivedi' : isInCorso ? 'Continua' : 'Inizia'} Corso
                  </NeumorphicButton>
                </div>
              );
            })}
          </div>
        )}
      </NeumorphicCard>
    </div>
  );
}