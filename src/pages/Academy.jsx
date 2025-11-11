
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
  const [activeCourse, setActiveCourse] = useState(null); // Renamed from selectedCorso
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

  const { data: courses = [], isLoading: isLoadingCourses } = useQuery({ // Renamed from corsi
    queryKey: ['corsi-attivi'],
    queryFn: () => base44.entities.Corso.filter({ attivo: true }),
  });

  const { data: userProgress = [], isLoading: isLoadingProgress } = useQuery({ // Renamed from progressi
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
    if (!timerStarted || !activeCourse) return; // Renamed from selectedCorso

    const interval = setInterval(() => {
      setTimeElapsed(prev => {
        const newTime = prev + 1;
        if (newTime >= activeCourse.durata_lezione) { // Renamed from selectedCorso
          setVideoWatched(true);
          return newTime;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStarted, activeCourse]); // Renamed from selectedCorso

  const handleStartCourse = async (course) => { // Renamed from handleStartCorso, corso
    setActiveCourse(course); // Renamed from setSelectedCorso
    setVideoWatched(false);
    setTimerStarted(false);
    setTimeElapsed(0);
    setShowQuiz(false);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizResults(null);

    // Create or update progress
    const existing = userProgress.find(p => p.corso_id === course.id); // Renamed from progressi
    if (!existing) {
      await createProgressoMutation.mutateAsync({
        corso_id: course.id,
        corso_nome: course.nome_corso,
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
    const domande = activeCourse.domande || []; // Renamed from selectedCorso
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
    const progresso = userProgress.find(p => p.corso_id === activeCourse.id); // Renamed from progressi, selectedCorso
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
          tempo_video_guardato: activeCourse.durata_lezione, // Renamed from selectedCorso
          video_completato: true,
          risposte_date,
          punteggio
        }
      });
    }

    if (!allCorrect) {
      setTimeout(() => {
        alert('Alcune risposte sono errate. Dovrai rivedere la lezione.');
        setActiveCourse(null); // Renamed from setSelectedCorso
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
  const availableCourses = courses.filter(course => { // Renamed from corsi to courses, availableCorsi to availableCourses
    const courseRuoli = course.ruoli || [];
    // Check if there's any overlap between user roles and course roles
    return courseRuoli.some(ruolo => userRoles.includes(ruolo));
  });

  // These were not used in the new UI, but kept for consistency if needed elsewhere.
  // const corsiCompletati = userProgress.filter(p => p.stato === 'completato').length;
  // const corsiInCorso = userProgress.filter(p => p.stato === 'in_corso').length;

  const isLoading = isLoadingCourses || isLoadingProgress || !currentUser; // Combined loading state

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4 text-center">
        <NeumorphicCard className="p-8">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Caricamento...</p>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
          Academy
        </h1>
        <p className="text-sm text-slate-500">Corsi di formazione</p>
      </div>

      {!activeCourse ? (
        <>
          {/* Progress Stats */}
          <div className="grid grid-cols-2 gap-3">
            <NeumorphicCard className="p-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mx-auto mb-2 flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-green-600">
                  {userProgress.filter(p => p.stato === 'completato').length}
                </h3>
                <p className="text-xs text-slate-500">Completati</p>
              </div>
            </NeumorphicCard>

            <NeumorphicCard className="p-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-2 flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-blue-600">
                  {availableCourses.length}
                </h3>
                <p className="text-xs text-slate-500">Disponibili</p>
              </div>
            </NeumorphicCard>
          </div>

          {/* Course List */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-3">Corsi Disponibili</h2>
            {availableCourses.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-500">Nessun corso disponibile per i tuoi ruoli</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableCourses.map((course) => {
                  const progress = userProgress.find(p => p.corso_id === course.id);
                  const isCompleted = progress?.stato === 'completato';
                  const isInProgress = progress?.stato === 'in_corso';

                  return (
                    <NeumorphicCard key={course.id} className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-slate-800 text-sm lg:text-base mb-1">
                            {course.nome_corso}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {formatDuration(course.durata_lezione)}
                          </p>
                        </div>
                        {isCompleted && (
                          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                        )}
                        {isInProgress && (
                          <Clock className="w-6 h-6 text-blue-600 flex-shrink-0" />
                        )}
                      </div>

                      {isCompleted && progress && (
                        <div className="neumorphic-pressed p-3 rounded-lg mb-3 bg-green-50">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-green-700">Completato</span>
                            <span className="text-sm font-bold text-green-600">
                              {progress.punteggio}%
                            </span>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => handleStartCourse(course)}
                        className={`w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 text-sm ${
                          isCompleted
                            ? 'nav-button text-slate-700'
                            : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                        }`}
                      >
                        <Play className="w-4 h-4" />
                        {isCompleted ? 'Rivedi' : isInProgress ? 'Continua' : 'Inizia'} Corso
                      </button>
                    </NeumorphicCard>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <NeumorphicCard className="p-4 lg:p-6">
          <div className="space-y-4">
            {/* Back Button */}
            <button
              onClick={() => setActiveCourse(null)}
              className="flex items-center gap-2 text-[#6b6b6b] hover:text-[#8b7355]"
            >
              <ArrowLeft className="w-5 h-5" />
              Torna ai corsi
            </button>

            {/* Course Header */}
            <NeumorphicCard className="p-6">
              <h1 className="text-2xl font-bold text-[#6b6b6b] mb-2">{activeCourse.nome_corso}</h1>
              <div className="flex items-center gap-4 text-sm text-[#9b9b9b]">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDuration(activeCourse.durata_lezione)}
                </span>
                <span className="flex items-center gap-1">
                  Ruoli: {(activeCourse.ruoli || []).join(', ')}
                </span>
              </div>
            </NeumorphicCard>

            {/* Video Section */}
            {!showQuiz && (
              <NeumorphicCard className="p-6">
                <div className="aspect-video bg-black rounded-xl overflow-hidden mb-4">
                  {timerStarted ? (
                    <iframe
                      src={getYouTubeEmbedUrl(activeCourse.link_video)}
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
                        {formatTime(timeElapsed)} / {formatTime(activeCourse.durata_lezione)}
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-[#8b7355] h-3 rounded-full transition-all"
                        style={{ width: `${Math.min((timeElapsed / activeCourse.durata_lezione) * 100, 100)}%` }}
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
                          Devi guardare il video per almeno {formatDuration(activeCourse.durata_lezione)} prima di accedere al quiz
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
                  {(activeCourse.domande || []).map((domanda, dIndex) => (
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
                    disabled={Object.keys(selectedAnswers).length !== (activeCourse.domande || []).length}
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
        </NeumorphicCard>
      )}
    </div>
  );
}
