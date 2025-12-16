import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  GraduationCap,
  Plus,
  Video,
  Clock,
  HelpCircle,
  CheckCircle,
  X,
  Edit,
  Trash2,
  Users,
  TrendingUp,
  Award,
  Store,
  ChevronDown,
  ChevronUp,
  FileVideo,
  PlayCircle,
  Settings,
  Tag,
  Upload
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function AcademyAdmin() {
  const [activeView, setActiveView] = useState('corsi'); // 'corsi', 'dipendenti', 'stores', 'da_creare'
  const [selectedStore, setSelectedStore] = useState('');
  const [expandedStores, setExpandedStores] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingCorso, setEditingCorso] = useState(null);
  const [formData, setFormData] = useState({
    nome_corso: '',
    ruoli: ['Pizzaiolo'],
    link_video: '',
    durata_lezione: 600,
    domande: [],
    attivo: true,
    ordine: 0
  });
  
  // Stati per "Corsi da creare"
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateFormData, setTemplateFormData] = useState({
    titolo: '',
    descrizione: '',
    categoria: '',
    ruoli_target: [],
    stores_target: []
  });
  
  // Stati per impostazioni categorie
  const [showSettings, setShowSettings] = useState(false);
  const [newCategoria, setNewCategoria] = useState({ nome: '', colore: 'blue' });
  const [editingCategoria, setEditingCategoria] = useState(null);
  
  // Stati per upload video in template
  const [uploadingTemplateVideo, setUploadingTemplateVideo] = useState(false);

  const queryClient = useQueryClient();

  const { data: corsi = [], isLoading } = useQuery({
    queryKey: ['corsi'],
    queryFn: () => base44.entities.Corso.list('-ordine'),
  });

  const { data: progressi = [] } = useQuery({
    queryKey: ['corsi-progressi'],
    queryFn: () => base44.entities.CorsoProgresso.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: corsiTemplates = [] } = useQuery({
    queryKey: ['corsi-templates'],
    queryFn: () => base44.entities.CorsoTemplate.list('-created_date'),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.CorsoTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corsi-templates'] });
      setShowTemplateForm(false);
      setEditingTemplate(null);
      setTemplateFormData({
        titolo: '',
        descrizione: '',
        categoria: '',
        ruoli_target: [],
        stores_target: []
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CorsoTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corsi-templates'] });
      setShowTemplateForm(false);
      setEditingTemplate(null);
      setTemplateFormData({
        titolo: '',
        descrizione: '',
        categoria: '',
        ruoli_target: [],
        stores_target: []
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.CorsoTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corsi-templates'] });
    },
  });

  // Query e mutations per categorie
  const { data: categorie = [] } = useQuery({
    queryKey: ['categorie-corsi'],
    queryFn: () => base44.entities.CategoriaCorso.list('ordine'),
  });

  const createCategoriaMutation = useMutation({
    mutationFn: (data) => base44.entities.CategoriaCorso.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorie-corsi'] });
      setNewCategoria({ nome: '', colore: 'blue' });
    },
  });

  const updateCategoriaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CategoriaCorso.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorie-corsi'] });
      setEditingCategoria(null);
    },
  });

  const deleteCategoriaMutation = useMutation({
    mutationFn: (id) => base44.entities.CategoriaCorso.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorie-corsi'] });
    },
  });

  const handleTemplateVideoUpload = async (file) => {
    if (!file) return;
    setUploadingTemplateVideo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setTemplateFormData(prev => ({
        ...prev,
        sessioni: [...(prev.sessioni || []), {
          titolo: file.name.replace(/\.[^/.]+$/, ''),
          video_url: file_url,
          durata_minuti: 5,
          ordine: (prev.sessioni?.length || 0) + 1
        }]
      }));
    } catch (error) {
      console.error('Errore upload:', error);
      alert('Errore durante il caricamento del video');
    } finally {
      setUploadingTemplateVideo(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Corso.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corsi'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Corso.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corsi'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Corso.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corsi'] });
    },
  });

  const resetForm = () => {
    setFormData({
      nome_corso: '',
      ruoli: ['Pizzaiolo'],
      link_video: '',
      durata_lezione: 600,
      domande: [],
      attivo: true,
      ordine: 0
    });
    setEditingCorso(null);
    setShowForm(false);
  };

  const handleEdit = (corso) => {
    setEditingCorso(corso);
    setFormData({
      nome_corso: corso.nome_corso,
      ruoli: corso.ruoli || [],
      link_video: corso.link_video,
      durata_lezione: corso.durata_lezione,
      domande: corso.domande || [],
      attivo: corso.attivo ?? true,
      ordine: corso.ordine || 0
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate that each question has a correct answer
    for (let i = 0; i < formData.domande.length; i++) {
      const domanda = formData.domande[i];
      const hasCorrectAnswer = domanda.risposte.some(r => r.corretta);
      if (!hasCorrectAnswer) {
        alert(`La domanda ${i + 1} deve avere almeno una risposta corretta selezionata.`);
        return;
      }
    }
    
    if (editingCorso) {
      updateMutation.mutate({ id: editingCorso.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Sei sicuro di voler eliminare questo corso?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleRuoloToggle = (ruolo) => {
    const currentRuoli = formData.ruoli || [];
    if (currentRuoli.includes(ruolo)) {
      // Remove if already present
      setFormData({ ...formData, ruoli: currentRuoli.filter(r => r !== ruolo) });
    } else {
      // Add if not present
      setFormData({ ...formData, ruoli: [...currentRuoli, ruolo] });
    }
  };

  const addDomanda = () => {
    setFormData({
      ...formData,
      domande: [
        ...formData.domande,
        {
          testo_domanda: '',
          risposte: [
            { testo_risposta: '', corretta: false },
            { testo_risposta: '', corretta: false }
          ]
        }
      ]
    });
  };

  const removeDomanda = (index) => {
    const newDomande = formData.domande.filter((_, i) => i !== index);
    setFormData({ ...formData, domande: newDomande });
  };

  const updateDomanda = (index, field, value) => {
    const newDomande = [...formData.domande];
    newDomande[index][field] = value;
    setFormData({ ...formData, domande: newDomande });
  };

  const addRisposta = (domandaIndex) => {
    const newDomande = [...formData.domande];
    newDomande[domandaIndex].risposte.push({ testo_risposta: '', corretta: false });
    setFormData({ ...formData, domande: newDomande });
  };

  const removeRisposta = (domandaIndex, rispostaIndex) => {
    const newDomande = [...formData.domande];
    newDomande[domandaIndex].risposte = newDomande[domandaIndex].risposte.filter((_, i) => i !== rispostaIndex);
    setFormData({ ...formData, domande: newDomande });
  };

  const updateRisposta = (domandaIndex, rispostaIndex, field, value) => {
    const newDomande = [...formData.domande];
    if (field === 'corretta' && value) {
      // Se stiamo settando questa risposta come corretta, deseleziona le altre
      newDomande[domandaIndex].risposte.forEach((r, i) => {
        r.corretta = i === rispostaIndex;
      });
    } else {
      newDomande[domandaIndex].risposte[rispostaIndex][field] = value;
    }
    setFormData({ ...formData, domande: newDomande });
  };

  // Format seconds to readable time
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  };

  // Statistics
  const stats = {
    totaleCorsi: corsi.length,
    corsiAttivi: corsi.filter(c => c.attivo).length,
    totaleCompletamenti: progressi.filter(p => p.stato === 'completato').length,
    mediaCompletamento: corsi.length > 0 
      ? Math.round((progressi.filter(p => p.stato === 'completato').length / (users.length * corsi.length)) * 100)
      : 0
  };

  // Progress by store
  const progressiPerStore = useMemo(() => {
    return stores.map(store => {
      // Find employees assigned to this store
      const storeEmployees = users.filter(u => {
        const assignedStores = u.assigned_stores || [];
        return assignedStores.includes(store.id) || assignedStores.includes(store.name);
      });
      
      let totalCompletati = 0;
      let totalCorsi = 0;
      
      const employeesWithProgress = storeEmployees.map(user => {
        const userRuoli = user.ruoli_dipendente || [];
        const userProgressi = progressi.filter(p => p.user_id === user.id);
        
        const corsiPerUtente = corsi.filter(c => {
          if (!c.attivo) return false;
          if (!c.ruoli || c.ruoli.length === 0) return true;
          return c.ruoli.some(r => userRuoli.includes(r));
        });
        
        const completati = userProgressi.filter(p => p.stato === 'completato').length;
        const totale = corsiPerUtente.length;
        
        totalCompletati += completati;
        totalCorsi += totale;
        
        return {
          user,
          ruoli: userRuoli,
          completati,
          totale,
          percentuale: totale > 0 ? Math.round((completati / totale) * 100) : 0
        };
      });
      
      return {
        store,
        employees: employeesWithProgress,
        totalEmployees: storeEmployees.length,
        totalCompletati,
        totalCorsi,
        percentuale: totalCorsi > 0 ? Math.round((totalCompletati / totalCorsi) * 100) : 0
      };
    }).sort((a, b) => b.percentuale - a.percentuale);
  }, [stores, users, corsi, progressi]);

  // Progress by employee
  const progressiPerDipendente = users.map(user => {
    const userRuoli = user.ruoli_dipendente || [];
    const userProgressi = progressi.filter(p => p.user_id === user.id);
    
    // Filter courses based on user roles
    const corsiPerUtente = corsi.filter(c => {
      if (!c.attivo) return false;
      if (!c.ruoli || c.ruoli.length === 0) return true;
      return c.ruoli.some(r => userRuoli.includes(r));
    });
    
    const completati = userProgressi.filter(p => p.stato === 'completato').length;
    const inCorso = userProgressi.filter(p => p.stato === 'in_corso').length;
    const totale = corsiPerUtente.length;
    
    return {
      user,
      ruoli: userRuoli,
      completati,
      inCorso,
      totale,
      percentuale: totale > 0 ? Math.round((completati / totale) * 100) : 0
    };
  }).sort((a, b) => b.percentuale - a.percentuale);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="w-10 h-10 text-[#8b7355]" />
            <h1 className="text-3xl font-bold text-[#6b6b6b]">Academy Admin</h1>
          </div>
          <p className="text-[#9b9b9b]">Gestisci corsi di formazione e monitora i progressi dei dipendenti</p>
        </div>
        <div className="flex gap-2">
          <NeumorphicButton
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2"
          >
            <Settings className="w-5 h-5" />
            <span className="hidden sm:inline">Impostazioni</span>
          </NeumorphicButton>
          <NeumorphicButton
            onClick={() => setShowForm(!showForm)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuovo Corso
          </NeumorphicButton>
        </div>
      </div>

      {/* Modal Impostazioni Categorie */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="w-full max-w-lg max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Tag className="w-6 h-6 text-purple-600" />
                Gestione Categorie
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form nuova categoria */}
            <div className="neumorphic-pressed p-4 rounded-xl mb-4">
              <h3 className="font-medium text-slate-700 mb-3">Nuova Categoria</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoria.nome}
                  onChange={(e) => setNewCategoria({ ...newCategoria, nome: e.target.value })}
                  placeholder="Nome categoria"
                  className="flex-1 neumorphic-flat px-3 py-2 rounded-lg text-slate-700 outline-none"
                />
                <select
                  value={newCategoria.colore}
                  onChange={(e) => setNewCategoria({ ...newCategoria, colore: e.target.value })}
                  className="neumorphic-flat px-3 py-2 rounded-lg text-slate-700 outline-none"
                >
                  <option value="blue">Blu</option>
                  <option value="green">Verde</option>
                  <option value="purple">Viola</option>
                  <option value="orange">Arancione</option>
                  <option value="red">Rosso</option>
                  <option value="yellow">Giallo</option>
                </select>
                <NeumorphicButton
                  onClick={() => {
                    if (newCategoria.nome) {
                      createCategoriaMutation.mutate(newCategoria);
                    }
                  }}
                  disabled={!newCategoria.nome}
                >
                  <Plus className="w-4 h-4" />
                </NeumorphicButton>
              </div>
            </div>

            {/* Lista categorie */}
            <div className="space-y-2">
              {categorie.length === 0 ? (
                <p className="text-center text-slate-500 py-4">Nessuna categoria</p>
              ) : (
                categorie.map(cat => (
                  <div key={cat.id} className="neumorphic-flat p-3 rounded-lg flex items-center justify-between">
                    {editingCategoria?.id === cat.id ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={editingCategoria.nome}
                          onChange={(e) => setEditingCategoria({ ...editingCategoria, nome: e.target.value })}
                          className="flex-1 neumorphic-pressed px-3 py-1 rounded-lg text-slate-700 outline-none"
                        />
                        <select
                          value={editingCategoria.colore || 'blue'}
                          onChange={(e) => setEditingCategoria({ ...editingCategoria, colore: e.target.value })}
                          className="neumorphic-pressed px-2 py-1 rounded-lg text-slate-700 outline-none"
                        >
                          <option value="blue">Blu</option>
                          <option value="green">Verde</option>
                          <option value="purple">Viola</option>
                          <option value="orange">Arancione</option>
                          <option value="red">Rosso</option>
                          <option value="yellow">Giallo</option>
                        </select>
                        <button
                          onClick={() => updateCategoriaMutation.mutate({ id: cat.id, data: editingCategoria })}
                          className="text-green-600"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button onClick={() => setEditingCategoria(null)} className="text-slate-500">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full bg-${cat.colore || 'blue'}-500`}></span>
                          <span className="font-medium text-slate-700">{cat.nome}</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingCategoria(cat)}
                            className="p-1 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Eliminare questa categoria?')) {
                                deleteCategoriaMutation.mutate(cat.id);
                              }
                            }}
                            className="p-1 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </NeumorphicCard>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{stats.totaleCorsi}</h3>
          <p className="text-sm text-[#9b9b9b]">Corsi Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">{stats.corsiAttivi}</h3>
          <p className="text-sm text-[#9b9b9b]">Corsi Attivi</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Award className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-blue-600 mb-1">{stats.totaleCompletamenti}</h3>
          <p className="text-sm text-[#9b9b9b]">Completamenti Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-3xl font-bold text-purple-600 mb-1">{stats.mediaCompletamento}%</h3>
          <p className="text-sm text-[#9b9b9b]">Media Completamento</p>
        </NeumorphicCard>
      </div>

      {/* Form Modal */}
      {showForm && (
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#6b6b6b]">
              {editingCorso ? 'Modifica Corso' : 'Nuovo Corso'}
            </h2>
            <button onClick={resetForm} className="text-[#9b9b9b] hover:text-[#6b6b6b]">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#6b6b6b] mb-2">
                  Nome Corso *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome_corso}
                  onChange={(e) => setFormData({ ...formData, nome_corso: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  placeholder="Es: Tecniche di Impasto Avanzate"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6b6b6b] mb-2">
                  Ruoli * (seleziona uno o più)
                </label>
                <div className="neumorphic-pressed px-4 py-3 rounded-xl space-y-2">
                  {['Pizzaiolo', 'Cassiere', 'Store Manager'].map(ruolo => (
                    <label key={ruolo} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(formData.ruoli || []).includes(ruolo)}
                        onChange={() => handleRuoloToggle(ruolo)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-[#6b6b6b]">{ruolo}</span>
                    </label>
                  ))}
                </div>
                {formData.ruoli.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">Seleziona almeno un ruolo</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6b6b6b] mb-2">
                  Link Video YouTube *
                </label>
                <input
                  type="url"
                  required
                  value={formData.link_video}
                  onChange={(e) => setFormData({ ...formData, link_video: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6b6b6b] mb-2">
                  Durata Lezione (secondi) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.durata_lezione}
                  onChange={(e) => setFormData({ ...formData, durata_lezione: parseInt(e.target.value) })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  placeholder="Es: 600 (10 minuti)"
                />
                <p className="text-xs text-[#9b9b9b] mt-1">
                  {formatDuration(formData.durata_lezione || 0)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6b6b6b] mb-2">
                  Categoria
                </label>
                <select
                  value={formData.categoria || ''}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                >
                  <option value="">-- Nessuna --</option>
                  {[...categorie].sort((a, b) => a.nome.localeCompare(b.nome)).map(cat => (
                    <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6b6b6b] mb-2">
                  Ordine
                </label>
                <input
                  type="number"
                  value={formData.ordine}
                  onChange={(e) => setFormData({ ...formData, ordine: parseInt(e.target.value) || 0 })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="attivo"
                  checked={formData.attivo}
                  onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
                  className="w-5 h-5"
                />
                <label htmlFor="attivo" className="text-sm font-medium text-[#6b6b6b]">
                  Corso Attivo
                </label>
              </div>
            </div>

            {/* Questions */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#6b6b6b]">Domande</h3>
                <NeumorphicButton
                  type="button"
                  onClick={addDomanda}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Aggiungi Domanda
                </NeumorphicButton>
              </div>

              <div className="space-y-6">
                {formData.domande.map((domanda, dIndex) => (
                  <div key={dIndex} className="neumorphic-pressed p-4 rounded-xl">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-bold text-[#6b6b6b]">Domanda {dIndex + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeDomanda(dIndex)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <input
                      type="text"
                      required
                      value={domanda.testo_domanda}
                      onChange={(e) => updateDomanda(dIndex, 'testo_domanda', e.target.value)}
                      className="w-full neumorphic-flat px-4 py-3 rounded-xl text-[#6b6b6b] outline-none mb-4"
                      placeholder="Testo della domanda"
                    />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-[#6b6b6b]">Risposte</label>
                        <button
                          type="button"
                          onClick={() => addRisposta(dIndex)}
                          className="text-sm text-[#8b7355] hover:underline"
                        >
                          + Aggiungi Risposta
                        </button>
                      </div>

                      {domanda.risposte.map((risposta, rIndex) => (
                        <div key={rIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`corretta-${dIndex}`}
                            checked={risposta.corretta}
                            onChange={(e) => updateRisposta(dIndex, rIndex, 'corretta', e.target.checked)}
                            className="w-4 h-4"
                          />
                          <input
                            type="text"
                            required
                            value={risposta.testo_risposta}
                            onChange={(e) => updateRisposta(dIndex, rIndex, 'testo_risposta', e.target.value)}
                            className="flex-1 neumorphic-flat px-3 py-2 rounded-lg text-[#6b6b6b] outline-none"
                            placeholder="Testo risposta"
                          />
                          {domanda.risposte.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeRisposta(dIndex, rIndex)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <NeumorphicButton type="button" onClick={resetForm}>
                Annulla
              </NeumorphicButton>
              <NeumorphicButton 
                type="submit" 
                variant="primary"
                disabled={formData.ruoli.length === 0}
              >
                {editingCorso ? 'Aggiorna' : 'Crea'} Corso
              </NeumorphicButton>
            </div>
          </form>
        </NeumorphicCard>
      )}

      {/* Courses List */}
      {activeView === 'corsi' && (
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Corsi Creati</h2>
        
        {isLoading ? (
          <p className="text-center text-[#9b9b9b] py-8">Caricamento...</p>
        ) : corsi.length === 0 ? (
          <p className="text-center text-[#9b9b9b] py-8">Nessun corso creato</p>
        ) : (() => {
          // Raggruppa corsi per categoria
          const corsiPerCategoria = {};
          const corsiSenzaCategoria = [];
          
          corsi.forEach(corso => {
            if (corso.categoria) {
              if (!corsiPerCategoria[corso.categoria]) {
                corsiPerCategoria[corso.categoria] = [];
              }
              corsiPerCategoria[corso.categoria].push(corso);
            } else {
              corsiSenzaCategoria.push(corso);
            }
          });
          
          return (
            <div className="space-y-6">
              {/* Corsi senza categoria */}
              {corsiSenzaCategoria.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-slate-400" />
                    Senza Categoria
                  </h3>
                  <div className="space-y-3">
                    {corsiSenzaCategoria.map((corso) => (
                      <div key={corso.id} className="neumorphic-pressed p-4 rounded-xl flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-[#6b6b6b]">{corso.nome_corso}</h3>
                            {!corso.attivo && (
                              <span className="px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-600">
                                Non attivo
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-[#9b9b9b]">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {(corso.ruoli || []).join(', ') || 'Nessun ruolo'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDuration(corso.durata_lezione)}
                            </span>
                            <span className="flex items-center gap-1">
                              <HelpCircle className="w-4 h-4" />
                              {corso.domande?.length || 0} domande
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(corso)}
                            className="neumorphic-flat p-2 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(corso.id)}
                            className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Corsi per categoria */}
              {Object.keys(corsiPerCategoria).sort().map(categoria => {
                const corsiCategoria = corsiPerCategoria[categoria];
                const catConfig = categorie.find(c => c.nome === categoria);
                const colore = catConfig?.colore || 'blue';
                
                return (
                  <div key={categoria}>
                    <h3 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full bg-${colore}-500`}></span>
                      {categoria}
                      <span className="text-sm text-slate-500 font-normal">({corsiCategoria.length})</span>
                    </h3>
                    <div className="space-y-3">
                      {corsiCategoria.map((corso) => (
                        <div key={corso.id} className="neumorphic-pressed p-4 rounded-xl flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-[#6b6b6b]">{corso.nome_corso}</h3>
                              {!corso.attivo && (
                                <span className="px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-600">
                                  Non attivo
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-[#9b9b9b]">
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {(corso.ruoli || []).join(', ') || 'Nessun ruolo'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {formatDuration(corso.durata_lezione)}
                              </span>
                              <span className="flex items-center gap-1">
                                <HelpCircle className="w-4 h-4" />
                                {corso.domande?.length || 0} domande
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(corso)}
                              className="neumorphic-flat p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDelete(corso.id)}
                              className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </NeumorphicCard>
      )}

      {/* View Toggle */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveView('da_creare')}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            activeView === 'da_creare' 
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' 
              : 'nav-button text-slate-700'
          }`}
        >
          <FileVideo className="w-4 h-4 inline mr-1" /> Corsi da Creare
        </button>
        <button
          onClick={() => setActiveView('corsi')}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            activeView === 'corsi' 
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
              : 'nav-button text-slate-700'
          }`}
        >
          📚 Corsi Pubblicati
        </button>
        <button
          onClick={() => setActiveView('dipendenti')}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            activeView === 'dipendenti' 
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
              : 'nav-button text-slate-700'
          }`}
        >
          <Users className="w-4 h-4 inline mr-1" /> Per Dipendente
        </button>
        <button
          onClick={() => setActiveView('stores')}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            activeView === 'stores' 
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
              : 'nav-button text-slate-700'
          }`}
        >
          <Store className="w-4 h-4 inline mr-1" /> Per Store
        </button>
      </div>

      {/* Corsi da Creare */}
      {activeView === 'da_creare' && (
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#6b6b6b] flex items-center gap-2">
              <FileVideo className="w-6 h-6 text-orange-600" />
              Corsi da Creare
            </h2>
            <NeumorphicButton
              onClick={() => setShowTemplateForm(true)}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nuovo Corso
            </NeumorphicButton>
          </div>

          {/* Form nuovo template */}
          {showTemplateForm && (
            <div className="neumorphic-pressed p-4 rounded-xl mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700">
                  {editingTemplate ? 'Modifica Corso da Creare' : 'Nuovo Corso da Creare'}
                </h3>
                <button onClick={() => {
                  setShowTemplateForm(false);
                  setEditingTemplate(null);
                  setTemplateFormData({
                    titolo: '',
                    descrizione: '',
                    categoria: '',
                    ruoli_target: [],
                    stores_target: [],
                    sessioni: []
                  });
                }} className="text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Titolo del Corso <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={templateFormData.titolo}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, titolo: e.target.value })}
                    placeholder="es. Tecniche di Impasto Avanzate"
                    className="w-full neumorphic-flat px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Descrizione
                  </label>
                  <textarea
                    value={templateFormData.descrizione}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, descrizione: e.target.value })}
                    placeholder="Descrizione del corso..."
                    rows={2}
                    className="w-full neumorphic-flat px-4 py-3 rounded-xl text-slate-700 outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Categoria
                    </label>
                    <select
                      value={templateFormData.categoria}
                      onChange={(e) => setTemplateFormData({ ...templateFormData, categoria: e.target.value })}
                      className="w-full neumorphic-flat px-4 py-3 rounded-xl text-slate-700 outline-none"
                    >
                      <option value="">-- Seleziona --</option>
                      {[...categorie].sort((a, b) => a.nome.localeCompare(b.nome)).map(cat => (
                        <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Ruoli Target
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Pizzaiolo', 'Cassiere', 'Store Manager'].map(ruolo => (
                        <button
                          key={ruolo}
                          type="button"
                          onClick={() => {
                            const current = templateFormData.ruoli_target || [];
                            setTemplateFormData({
                              ...templateFormData,
                              ruoli_target: current.includes(ruolo)
                                ? current.filter(r => r !== ruolo)
                                : [...current, ruolo]
                            });
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            (templateFormData.ruoli_target || []).includes(ruolo)
                              ? 'bg-blue-600 text-white'
                              : 'neumorphic-flat text-slate-600'
                          }`}
                        >
                          {ruolo}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Negozi Target
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {stores.map(store => (
                        <button
                          key={store.id}
                          type="button"
                          onClick={() => {
                            const current = templateFormData.stores_target || [];
                            setTemplateFormData({
                              ...templateFormData,
                              stores_target: current.includes(store.id)
                                ? current.filter(s => s !== store.id)
                                : [...current, store.id]
                            });
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            (templateFormData.stores_target || []).includes(store.id)
                              ? 'bg-green-600 text-white'
                              : 'neumorphic-flat text-slate-600'
                          }`}
                        >
                          {store.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Upload video diretto */}
                <div className="border-t pt-4 mt-4">
                  <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Carica Video (opzionale)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">Puoi caricare video direttamente qui o farlo dopo nella pagina di creazione corso</p>
                  
                  <label className="flex items-center justify-center gap-2 neumorphic-flat px-4 py-3 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    {uploadingTemplateVideo ? (
                      <span className="text-sm text-slate-500">Caricamento...</span>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-slate-500" />
                        <span className="text-sm text-slate-500">Carica video sessione</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => handleTemplateVideoUpload(e.target.files[0])}
                      disabled={uploadingTemplateVideo}
                    />
                  </label>

                  {templateFormData.sessioni?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {templateFormData.sessioni.map((s, idx) => (
                        <div key={idx} className="neumorphic-pressed p-2 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-slate-700">{s.titolo}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTemplateFormData(prev => ({
                              ...prev,
                              sessioni: prev.sessioni.filter((_, i) => i !== idx)
                            }))}
                            className="text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <NeumorphicButton onClick={() => {
                    setShowTemplateForm(false);
                    setEditingTemplate(null);
                    setTemplateFormData({
                      titolo: '',
                      descrizione: '',
                      categoria: '',
                      ruoli_target: [],
                      stores_target: [],
                      sessioni: []
                    });
                  }}>
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton
                    variant="primary"
                    onClick={() => {
                      if (!templateFormData.titolo) {
                        alert('Inserisci il titolo del corso');
                        return;
                      }
                      const dataToSave = {
                        ...templateFormData,
                        status: templateFormData.sessioni?.length > 0 ? 'in_lavorazione' : 'da_creare'
                      };
                      if (editingTemplate) {
                        updateTemplateMutation.mutate({ id: editingTemplate.id, data: dataToSave });
                      } else {
                        createTemplateMutation.mutate(dataToSave);
                      }
                    }}
                    disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                  >
                    {editingTemplate ? 'Aggiorna' : 'Crea'}
                  </NeumorphicButton>
                </div>
              </div>
            </div>
          )}

          {/* Lista corsi da creare */}
          {corsiTemplates.length === 0 ? (
            <div className="text-center py-8">
              <FileVideo className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nessun corso da creare</p>
              <p className="text-sm text-slate-400 mt-1">Clicca "Nuovo Corso" per aggiungerne uno</p>
            </div>
          ) : (() => {
            // Raggruppa template per categoria
            const templatesPerCategoria = {};
            const templatesSenzaCategoria = [];
            
            corsiTemplates.forEach(template => {
              if (template.categoria) {
                if (!templatesPerCategoria[template.categoria]) {
                  templatesPerCategoria[template.categoria] = [];
                }
                templatesPerCategoria[template.categoria].push(template);
              } else {
                templatesSenzaCategoria.push(template);
              }
            });
            
            return (
              <div className="space-y-6">
                {/* Templates senza categoria */}
                {templatesSenzaCategoria.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <Tag className="w-5 h-5 text-slate-400" />
                      Senza Categoria
                    </h3>
                    <div className="space-y-3">
                      {templatesSenzaCategoria.map((template) => {
                        const storeNames = template.stores_target?.map(storeId => {
                          const store = stores.find(s => s.id === storeId);
                          return store?.name || storeId;
                        }).join(', ');

                        return (
                          <div key={template.id} className="neumorphic-pressed p-4 rounded-xl">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-bold text-slate-800">{template.titolo}</h3>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    template.status === 'completato' 
                                      ? 'bg-green-100 text-green-700'
                                      : template.status === 'in_lavorazione'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-orange-100 text-orange-700'
                                  }`}>
                                    {template.status === 'completato' ? 'Completato' 
                                      : template.status === 'in_lavorazione' ? 'In lavorazione' 
                                      : 'Da creare'}
                                  </span>
                                </div>
                                
                                {template.descrizione && (
                                  <p className="text-sm text-slate-600 mb-2">{template.descrizione}</p>
                                )}
                                
                                <div className="flex flex-wrap gap-2">
                                  {template.ruoli_target?.map(ruolo => (
                                    <span key={ruolo} className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                                      {ruolo}
                                    </span>
                                  ))}
                                  {storeNames && (
                                    <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                                      {storeNames}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingTemplate(template);
                                    setTemplateFormData({
                                      titolo: template.titolo,
                                      descrizione: template.descrizione || '',
                                      categoria: template.categoria || '',
                                      ruoli_target: template.ruoli_target || [],
                                      stores_target: template.stores_target || [],
                                      sessioni: template.sessioni || []
                                    });
                                    setShowTemplateForm(true);
                                  }}
                                  className="nav-button px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                  <Edit className="w-4 h-4 text-slate-600" />
                                </button>
                                {template.status !== 'completato' && (
                                  <Link
                                    to={createPageUrl('CreaCorso') + `?templateId=${template.id}`}
                                    className="nav-button px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-50 transition-colors"
                                  >
                                    <PlayCircle className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-600">Crea Corso</span>
                                  </Link>
                                )}
                                <button
                                  onClick={() => {
                                    if (confirm('Eliminare questo corso da creare?')) {
                                      deleteTemplateMutation.mutate(template.id);
                                    }
                                  }}
                                  className="nav-button p-2 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Templates per categoria */}
                {Object.keys(templatesPerCategoria).sort().map(categoria => {
                  const templatesCategoria = templatesPerCategoria[categoria];
                  const catConfig = categorie.find(c => c.nome === categoria);
                  const colore = catConfig?.colore || 'blue';
                  
                  return (
                    <div key={categoria}>
                      <h3 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full bg-${colore}-500`}></span>
                        {categoria}
                        <span className="text-sm text-slate-500 font-normal">({templatesCategoria.length})</span>
                      </h3>
                      <div className="space-y-3">
                        {templatesCategoria.map((template) => {
                          const storeNames = template.stores_target?.map(storeId => {
                            const store = stores.find(s => s.id === storeId);
                            return store?.name || storeId;
                          }).join(', ');

                          return (
                            <div key={template.id} className="neumorphic-pressed p-4 rounded-xl">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-bold text-slate-800">{template.titolo}</h3>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      template.status === 'completato' 
                                        ? 'bg-green-100 text-green-700'
                                        : template.status === 'in_lavorazione'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-orange-100 text-orange-700'
                                    }`}>
                                      {template.status === 'completato' ? 'Completato' 
                                        : template.status === 'in_lavorazione' ? 'In lavorazione' 
                                        : 'Da creare'}
                                    </span>
                                  </div>
                                  
                                  {template.descrizione && (
                                    <p className="text-sm text-slate-600 mb-2">{template.descrizione}</p>
                                  )}
                                  
                                  <div className="flex flex-wrap gap-2">
                                    {template.ruoli_target?.map(ruolo => (
                                      <span key={ruolo} className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                                        {ruolo}
                                      </span>
                                    ))}
                                    {storeNames && (
                                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                                        {storeNames}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingTemplate(template);
                                      setTemplateFormData({
                                        titolo: template.titolo,
                                        descrizione: template.descrizione || '',
                                        categoria: template.categoria || '',
                                        ruoli_target: template.ruoli_target || [],
                                        stores_target: template.stores_target || [],
                                        sessioni: template.sessioni || []
                                      });
                                      setShowTemplateForm(true);
                                    }}
                                    className="nav-button px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                                  >
                                    <Edit className="w-4 h-4 text-slate-600" />
                                  </button>
                                  {template.status !== 'completato' && (
                                    <Link
                                      to={createPageUrl('CreaCorso') + `?templateId=${template.id}`}
                                      className="nav-button px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-50 transition-colors"
                                    >
                                      <PlayCircle className="w-4 h-4 text-blue-600" />
                                      <span className="text-sm font-medium text-blue-600">Crea Corso</span>
                                    </Link>
                                  )}
                                  <button
                                    onClick={() => {
                                      if (confirm('Eliminare questo corso da creare?')) {
                                        deleteTemplateMutation.mutate(template.id);
                                      }
                                    }}
                                    className="nav-button p-2 rounded-lg hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      );
                      })}
                      </div>
                      );
                      })()}
                      </NeumorphicCard>
                      )}

                      {/* Store Progress View */}
      {activeView === 'stores' && (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
            <Store className="w-6 h-6" />
            Progressi per Store
          </h2>
          
          <div className="space-y-4">
            {progressiPerStore.map(({ store, employees, totalEmployees, totalCompletati, totalCorsi, percentuale }) => (
              <div key={store.id} className="neumorphic-pressed rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedStores(prev => ({ ...prev, [store.id]: !prev[store.id] }))}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      percentuale >= 80 ? 'bg-green-100' : percentuale >= 50 ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      <span className={`text-lg font-bold ${
                        percentuale >= 80 ? 'text-green-600' : percentuale >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>{percentuale}%</span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-[#6b6b6b]">{store.name}</h3>
                      <p className="text-sm text-[#9b9b9b]">{totalEmployees} dipendenti • {totalCompletati}/{totalCorsi} corsi completati</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          percentuale >= 80 ? 'bg-green-500' : percentuale >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${percentuale}%` }}
                      />
                    </div>
                    {expandedStores[store.id] ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                  </div>
                </button>
                
                {expandedStores[store.id] && (
                  <div className="border-t border-slate-200 p-4 bg-slate-50">
                    {employees.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">Nessun dipendente assegnato a questo store</p>
                    ) : (
                      <div className="space-y-2">
                        {employees.map(({ user, ruoli, completati, totale, percentuale: empPerc }) => (
                          <div key={user.id} className="neumorphic-flat p-3 rounded-lg flex items-center justify-between">
                            <div>
                              <p className="font-medium text-[#6b6b6b]">{user.nome_cognome || user.full_name || user.email}</p>
                              <div className="flex gap-1 mt-1">
                                {ruoli.map(r => (
                                  <span key={r} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{r}</span>
                                ))}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`font-bold ${empPerc >= 80 ? 'text-green-600' : empPerc >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {empPerc}%
                              </span>
                              <p className="text-xs text-slate-500">{completati}/{totale}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </NeumorphicCard>
      )}

      {/* Employee Progress */}
      {activeView === 'dipendenti' && (
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
          <Users className="w-6 h-6" />
          Progressi Dipendenti
        </h2>
        
        <div className="space-y-3">
          {progressiPerDipendente.map(({ user, ruoli, completati, inCorso, totale, percentuale }) => (
            <div key={user.id} className="neumorphic-pressed p-4 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-[#6b6b6b]">{user.full_name || user.email}</h3>
                  <p className="text-sm text-[#9b9b9b]">{user.email}</p>
                  {ruoli.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {ruoli.map(ruolo => (
                        <span key={ruolo} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {ruolo}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#8b7355]">{percentuale}%</div>
                  <div className="text-xs text-[#9b9b9b]">{completati}/{totale} completati</div>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#8b7355] h-2 rounded-full transition-all"
                  style={{ width: `${percentuale}%` }}
                />
              </div>
              
              {inCorso > 0 && (
                <p className="text-xs text-blue-600 mt-2">{inCorso} corso{inCorso > 1 ? 'i' : ''} in corso</p>
              )}
            </div>
          ))}
        </div>
      </NeumorphicCard>
      )}
    </div>
  );
}