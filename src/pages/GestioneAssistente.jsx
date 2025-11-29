import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { 
  Bot, Plus, Edit, Trash2, Save, X, Search, AlertTriangle, 
  MessageSquare, Book, Tag, Store, CheckCircle, XCircle, Loader2,
  ChevronDown, ChevronRight, Eye, Folder, RefreshCw
} from "lucide-react";
import moment from "moment";

const DEFAULT_CATEGORIE = [
  "Procedure Operative",
  "Ricette e Preparazioni", 
  "Pulizia e Igiene",
  "Gestione Cassa",
  "Gestione Magazzino",
  "Sicurezza sul Lavoro",
  "Orari e Turni",
  "Contatti e Emergenze",
  "Regolamenti Interni",
  "FAQ Generali"
];

export default function GestioneAssistente() {
  const [activeTab, setActiveTab] = useState('knowledge');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [checkingInconsistencies, setCheckingInconsistencies] = useState(false);
  const [inconsistencies, setInconsistencies] = useState(null);
  const [expandedConversation, setExpandedConversation] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ nome: '', ordine: 0 });
  
  const [formData, setFormData] = useState({
    categoria: 'Procedure Operative',
    titolo: '',
    contenuto: '',
    notion_url: '',
    tags: [],
    store_specifico: '',
    priorita: 0,
    attivo: true
  });
  const [newTag, setNewTag] = useState('');
  const [loadingNotion, setLoadingNotion] = useState(false);
  const [refreshingAllNotion, setRefreshingAllNotion] = useState(false);

  const queryClient = useQueryClient();

  const { data: knowledge = [] } = useQuery({
    queryKey: ['assistente-knowledge'],
    queryFn: () => base44.entities.AssistenteKnowledge.list('-priorita'),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: categorieDB = [] } = useQuery({
    queryKey: ['assistente-categorie'],
    queryFn: () => base44.entities.AssistenteCategoria.list('ordine'),
  });

  // Recupera tracking conversazioni dal database
  const { data: conversazioniTracking = [] } = useQuery({
    queryKey: ['conversazioni-tracking'],
    queryFn: () => base44.entities.ConversazioneAssistente.list('-last_message_date'),
    enabled: activeTab === 'conversazioni',
    refetchInterval: activeTab === 'conversazioni' ? 5000 : false,
  });

  const { data: conversations = [], isLoading: loadingConversations, error: conversationsError, refetch: refetchConversations } = useQuery({
    queryKey: ['assistente-conversations', conversazioniTracking],
    queryFn: async () => {
      // Usa direttamente i messaggi salvati nel tracking entity
      return conversazioniTracking.map(track => ({
        id: track.conversation_id,
        user_name: track.user_name,
        user_email: track.user_email,
        tracking: track,
        messages: track.messages || [],
        created_date: track.created_date
      }));
    },
    enabled: activeTab === 'conversazioni' && conversazioniTracking.length > 0,
    refetchInterval: activeTab === 'conversazioni' ? 5000 : false,
  });

  // Sottoscrizione real-time per le conversazioni espanse
  const [liveMessages, setLiveMessages] = useState({});

  useEffect(() => {
    if (!expandedConversation) return;
    
    const unsubscribe = base44.agents.subscribeToConversation(expandedConversation, (data) => {
      setLiveMessages(prev => ({
        ...prev,
        [expandedConversation]: data.messages
      }));
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [expandedConversation]);

  // Merge categorie dal DB con quelle di default
  const CATEGORIE = categorieDB.length > 0 
    ? categorieDB.filter(c => c.attivo !== false).map(c => c.nome)
    : DEFAULT_CATEGORIE;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AssistenteKnowledge.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistente-knowledge'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AssistenteKnowledge.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistente-knowledge'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AssistenteKnowledge.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistente-knowledge'] });
    },
  });

  // Categorie mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.AssistenteCategoria.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistente-categorie'] });
      resetCategoryForm();
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AssistenteCategoria.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistente-categorie'] });
      resetCategoryForm();
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.AssistenteCategoria.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistente-categorie'] });
    },
  });

  const resetCategoryForm = () => {
    setCategoryForm({ nome: '', ordine: 0 });
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const handleSaveCategory = () => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: categoryForm });
    } else {
      createCategoryMutation.mutate({ ...categoryForm, attivo: true });
    }
  };

  const handleEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({ nome: cat.nome, ordine: cat.ordine || 0 });
    setShowCategoryForm(true);
  };

  const initDefaultCategories = async () => {
    for (const cat of DEFAULT_CATEGORIE) {
      await base44.entities.AssistenteCategoria.create({ nome: cat, ordine: DEFAULT_CATEGORIE.indexOf(cat), attivo: true });
    }
    queryClient.invalidateQueries({ queryKey: ['assistente-categorie'] });
  };

  const resetForm = () => {
    setFormData({
      categoria: 'Procedure Operative',
      titolo: '',
      contenuto: '',
      notion_url: '',
      tags: [],
      store_specifico: '',
      priorita: 0,
      attivo: true
    });
    setEditingItem(null);
    setShowForm(false);
    setNewTag('');
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      categoria: item.categoria,
      titolo: item.titolo,
      contenuto: item.contenuto,
      notion_url: item.notion_url || '',
      tags: item.tags || [],
      store_specifico: item.store_specifico || '',
      priorita: item.priorita || 0,
      attivo: item.attivo !== false
    });
    setShowForm(true);
  };

  const fetchNotionContent = async () => {
    if (!formData.notion_url) return;
    setLoadingNotion(true);
    try {
      const response = await base44.functions.invoke('fetchNotionContent', { 
        notion_url: formData.notion_url 
      });
      const result = response.data;
      
      if (result.error) {
        alert(result.error);
      } else if (result.contenuto) {
        setFormData(prev => ({
          ...prev,
          contenuto: result.contenuto,
          titolo: prev.titolo || result.titolo || ''
        }));
      }
    } catch (error) {
      console.error('Errore caricamento Notion:', error);
      alert('Errore nel caricamento del contenuto da Notion. Assicurati che la pagina sia condivisa con l\'integrazione.');
    }
    setLoadingNotion(false);
  };

  const refreshAllNotionPages = async () => {
    const notionItems = knowledge.filter(k => k.notion_url);
    if (notionItems.length === 0) {
      alert('Nessuna pagina Notion collegata nella knowledge base');
      return;
    }
    
    setRefreshingAllNotion(true);
    let updated = 0;
    let errors = 0;
    
    for (const item of notionItems) {
      try {
        const response = await base44.functions.invoke('fetchNotionContent', { 
          notion_url: item.notion_url 
        });
        const result = response.data;
        
        if (result.contenuto && !result.error) {
          await base44.entities.AssistenteKnowledge.update(item.id, {
            contenuto: result.contenuto,
            titolo: result.titolo || item.titolo
          });
          updated++;
        } else {
          errors++;
        }
      } catch (error) {
        console.error('Errore refresh:', item.titolo, error);
        errors++;
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ['assistente-knowledge'] });
    setRefreshingAllNotion(false);
    alert(`Aggiornamento completato: ${updated} pagine aggiornate, ${errors} errori`);
  };

  const handleSave = () => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const checkInconsistencies = async () => {
    setCheckingInconsistencies(true);
    try {
      const allContent = knowledge.map(k => 
        `[${k.categoria}] ${k.titolo}: ${k.contenuto}`
      ).join('\n\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analizza le seguenti informazioni della knowledge base di un'azienda di pizzerie e identifica eventuali incongruenze, contraddizioni o informazioni duplicate/conflittuali. Se trovi problemi, elencali in modo chiaro. Se non trovi problemi, conferma che la knowledge base è coerente.\n\nKnowledge Base:\n${allContent}`,
        response_json_schema: {
          type: "object",
          properties: {
            has_issues: { type: "boolean" },
            issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tipo: { type: "string" },
                  descrizione: { type: "string" },
                  elementi_coinvolti: { type: "array", items: { type: "string" } }
                }
              }
            },
            summary: { type: "string" }
          }
        }
      });
      setInconsistencies(result);
    } catch (error) {
      console.error('Error checking inconsistencies:', error);
    }
    setCheckingInconsistencies(false);
  };

  const filteredKnowledge = knowledge.filter(k => {
    if (filterCategoria && k.categoria !== filterCategoria) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return k.titolo.toLowerCase().includes(query) || 
             k.contenuto.toLowerCase().includes(query) ||
             (k.tags || []).some(t => t.toLowerCase().includes(query));
    }
    return true;
  });

  const getStoreName = (storeId) => {
    return stores.find(s => s.id === storeId)?.name || storeId;
  };

  const groupedByCategory = CATEGORIE.reduce((acc, cat) => {
    acc[cat] = filteredKnowledge.filter(k => k.categoria === cat);
    return acc;
  }, {});

  return (
    <ProtectedPage pageName="GestioneAssistente">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              Gestione Assistente AI
            </h1>
            <p className="text-slate-500 mt-1">Configura la knowledge base e monitora le conversazioni</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'knowledge'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'neumorphic-flat text-slate-700'
            }`}
          >
            <Book className="w-4 h-4" />
            Knowledge Base ({knowledge.length})
          </button>
          <button
            onClick={() => setActiveTab('categorie')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'categorie'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'neumorphic-flat text-slate-700'
            }`}
          >
            <Folder className="w-4 h-4" />
            Categorie ({CATEGORIE.length})
          </button>
          <button
            onClick={() => setActiveTab('conversazioni')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'conversazioni'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'neumorphic-flat text-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Conversazioni
          </button>
          <button
            onClick={() => setActiveTab('verifica')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'verifica'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'neumorphic-flat text-slate-700'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Verifica Coerenza
          </button>
        </div>

        {/* Knowledge Base Tab */}
        {activeTab === 'knowledge' && (
          <>
            <NeumorphicCard className="p-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Cerca</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cerca per titolo, contenuto o tag..."
                      className="w-full neumorphic-pressed pl-10 pr-4 py-3 rounded-xl text-slate-700 outline-none"
                    />
                  </div>
                </div>
                <div className="min-w-[200px]">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Categoria</label>
                  <select
                    value={filterCategoria}
                    onChange={(e) => setFilterCategoria(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="">Tutte le categorie</option>
                    {CATEGORIE.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <NeumorphicButton
                  onClick={() => setShowForm(true)}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Aggiungi
                </NeumorphicButton>
              </div>
            </NeumorphicCard>

            {/* Form */}
            {showForm && (
              <NeumorphicCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingItem ? 'Modifica Informazione' : 'Nuova Informazione'}
                  </h2>
                  <button onClick={resetForm} className="nav-button p-2 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Categoria *</label>
                    <select
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    >
                      {CATEGORIE.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Titolo *</label>
                    <input
                      type="text"
                      value={formData.titolo}
                      onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      placeholder="Titolo breve"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Link Notion (opzionale)</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formData.notion_url}
                      onChange={(e) => setFormData({ ...formData, notion_url: e.target.value })}
                      className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      placeholder="https://notion.so/pagina-pubblica..."
                    />
                    <NeumorphicButton
                      onClick={fetchNotionContent}
                      disabled={!formData.notion_url || loadingNotion}
                      className="flex items-center gap-2"
                    >
                      {loadingNotion ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Importa
                    </NeumorphicButton>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Inserisci un link pubblico di Notion per importare automaticamente il contenuto</p>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Contenuto *</label>
                  <textarea
                    value={formData.contenuto}
                    onChange={(e) => setFormData({ ...formData, contenuto: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none min-h-[150px]"
                    placeholder="Descrizione dettagliata dell'informazione..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Store Specifico</label>
                    <select
                      value={formData.store_specifico}
                      onChange={(e) => setFormData({ ...formData, store_specifico: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    >
                      <option value="">Tutti i locali</option>
                      {stores.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Priorità</label>
                    <input
                      type="number"
                      value={formData.priorita}
                      onChange={(e) => setFormData({ ...formData, priorita: parseInt(e.target.value) || 0 })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.attivo}
                        onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
                        className="w-5 h-5"
                      />
                      <span className="text-sm font-medium text-slate-700">Attivo</span>
                    </label>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Tags</label>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {formData.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm flex items-center gap-1">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-blue-900">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
                      placeholder="Aggiungi tag..."
                    />
                    <NeumorphicButton onClick={addTag}>
                      <Tag className="w-4 h-4" />
                    </NeumorphicButton>
                  </div>
                </div>

                <div className="flex gap-3">
                  <NeumorphicButton onClick={resetForm} className="flex-1">Annulla</NeumorphicButton>
                  <NeumorphicButton 
                    onClick={handleSave} 
                    variant="primary" 
                    className="flex-1 flex items-center justify-center gap-2"
                    disabled={!formData.titolo || !formData.contenuto}
                  >
                    <Save className="w-4 h-4" />
                    Salva
                  </NeumorphicButton>
                </div>
              </NeumorphicCard>
            )}

            {/* Knowledge List */}
            <div className="space-y-4">
              {CATEGORIE.filter(cat => groupedByCategory[cat].length > 0 || !filterCategoria).map(categoria => {
                const items = groupedByCategory[categoria];
                if (items.length === 0 && filterCategoria) return null;
                
                return (
                  <NeumorphicCard key={categoria} className="p-4">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Book className="w-4 h-4 text-blue-600" />
                      {categoria}
                      <span className="text-sm font-normal text-slate-500">({items.length})</span>
                    </h3>
                    {items.length === 0 ? (
                      <p className="text-slate-500 text-sm italic">Nessuna informazione in questa categoria</p>
                    ) : (
                      <div className="space-y-2">
                        {items.map(item => (
                          <div 
                            key={item.id} 
                            className={`neumorphic-pressed p-4 rounded-xl ${!item.attivo ? 'opacity-50' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h4 className="font-medium text-slate-800">{item.titolo}</h4>
                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{item.contenuto}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {(item.tags || []).map(tag => (
                                    <span key={tag} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">
                                      {tag}
                                    </span>
                                  ))}
                                  {item.store_specifico && (
                                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center gap-1">
                                      <Store className="w-3 h-3" />
                                      {getStoreName(item.store_specifico)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="nav-button p-2 rounded-lg hover:bg-blue-50"
                                >
                                  <Edit className="w-4 h-4 text-blue-600" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Eliminare questa informazione?')) {
                                      deleteMutation.mutate(item.id);
                                    }
                                  }}
                                  className="nav-button p-2 rounded-lg hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </NeumorphicCard>
                );
              })}
            </div>
          </>
        )}

        {/* Categorie Tab */}
        {activeTab === 'categorie' && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Gestione Categorie</h2>
              <div className="flex gap-2">
                {categorieDB.length === 0 && (
                  <NeumorphicButton onClick={initDefaultCategories} className="flex items-center gap-2">
                    Inizializza Default
                  </NeumorphicButton>
                )}
                <NeumorphicButton
                  onClick={() => setShowCategoryForm(true)}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nuova Categoria
                </NeumorphicButton>
              </div>
            </div>

            {showCategoryForm && (
              <div className="neumorphic-pressed p-4 rounded-xl mb-4">
                <h3 className="font-bold text-slate-700 mb-3">
                  {editingCategory ? 'Modifica Categoria' : 'Nuova Categoria'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Nome</label>
                    <input
                      type="text"
                      value={categoryForm.nome}
                      onChange={(e) => setCategoryForm({ ...categoryForm, nome: e.target.value })}
                      className="w-full neumorphic-flat px-3 py-2 rounded-lg outline-none"
                      placeholder="Nome categoria"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Ordine</label>
                    <input
                      type="number"
                      value={categoryForm.ordine}
                      onChange={(e) => setCategoryForm({ ...categoryForm, ordine: parseInt(e.target.value) || 0 })}
                      className="w-full neumorphic-flat px-3 py-2 rounded-lg outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <NeumorphicButton onClick={resetCategoryForm}>Annulla</NeumorphicButton>
                  <NeumorphicButton 
                    onClick={handleSaveCategory} 
                    variant="primary"
                    disabled={!categoryForm.nome}
                  >
                    <Save className="w-4 h-4 inline mr-1" /> Salva
                  </NeumorphicButton>
                </div>
              </div>
            )}

            {categorieDB.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                Nessuna categoria configurata. Clicca "Inizializza Default" per creare le categorie predefinite.
              </p>
            ) : (
              <div className="space-y-2">
                {categorieDB.map(cat => (
                  <div 
                    key={cat.id} 
                    className={`neumorphic-pressed p-4 rounded-xl flex items-center justify-between ${cat.attivo === false ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-slate-800">{cat.nome}</p>
                        <p className="text-xs text-slate-500">
                          Ordine: {cat.ordine || 0} • 
                          {knowledge.filter(k => k.categoria === cat.nome).length} elementi
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditCategory(cat)}
                        className="nav-button p-2 rounded-lg hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Eliminare questa categoria? Le informazioni associate rimarranno ma senza categoria.')) {
                            deleteCategoryMutation.mutate(cat.id);
                          }
                        }}
                        className="nav-button p-2 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </NeumorphicCard>
        )}

        {/* Conversazioni Tab */}
        {activeTab === 'conversazioni' && (
          <>
            {/* Suggerimenti informazioni mancanti */}
            <NeumorphicCard className="p-6 bg-yellow-50 border border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-bold text-yellow-800 mb-2">💡 Suggerimenti per migliorare la Knowledge Base</h3>
                  <p className="text-sm text-yellow-700 mb-3">
                    Analizzando le conversazioni, potrebbero essere utili informazioni su:
                  </p>
                  <ul className="text-sm text-yellow-700 space-y-1 list-disc ml-4">
                    <li>Procedure specifiche per la gestione degli imprevisti</li>
                    <li>FAQ sulle domande più frequenti dei dipendenti</li>
                    <li>Orari e contatti di emergenza aggiornati</li>
                    <li>Procedure per apertura/chiusura locale</li>
                    <li>Istruzioni per l'utilizzo delle attrezzature</li>
                  </ul>
                </div>
              </div>
            </NeumorphicCard>

            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Conversazioni Dipendenti</h2>
                <NeumorphicButton
                  onClick={() => refetchConversations()}
                  className="flex items-center gap-2"
                  disabled={loadingConversations}
                >
                  <RefreshCw className={`w-4 h-4 ${loadingConversations ? 'animate-spin' : ''}`} />
                  Aggiorna
                </NeumorphicButton>
              </div>
              
              {loadingConversations ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
                  <p className="text-slate-500">Caricamento conversazioni...</p>
                </div>
              ) : conversationsError ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-8 h-8 mx-auto text-red-500 mb-2" />
                  <p className="text-red-600">Errore nel caricamento: {conversationsError.message}</p>
                  <p className="text-xs text-slate-400 mt-2">Dettagli: {JSON.stringify(conversationsError)}</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nessuna conversazione trovata</p>
                  <p className="text-xs text-slate-400 mt-2">Le conversazioni appariranno qui quando i dipendenti useranno l'assistente via WhatsApp o chat</p>
                  <div className="mt-4 p-4 bg-blue-50 rounded-xl max-w-md mx-auto">
                    <p className="text-sm text-blue-700 font-medium mb-2">💡 Come far usare l'assistente ai dipendenti:</p>
                    <p className="text-xs text-blue-600">
                      I dipendenti possono chattare con l'assistente collegandosi via WhatsApp dalla pagina "Assistente Dipendente" oppure dalla loro area personale.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversations.map(conv => (
                    <div key={conv.id} className="neumorphic-pressed p-4 rounded-xl">
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedConversation(expandedConversation === conv.id ? null : conv.id)}
                      >
                        <div className="flex items-center gap-3">
                                  {expandedConversation === conv.id ? (
                                    <ChevronDown className="w-4 h-4 text-slate-500" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-500" />
                                  )}
                                  <div>
                                    <p className="font-medium text-slate-800">
                                      {conv.user_name || conv.metadata?.name || 'Conversazione'}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {conv.user_email && <span className="mr-2">{conv.user_email}</span>}
                                      {moment(conv.tracking?.last_message_date || conv.created_date).format('DD/MM/YYYY HH:mm')} • 
                                      {conv.messages?.length || conv.tracking?.message_count || 0} messaggi
                                    </p>
                                  </div>
                                </div>
                        <Eye className="w-4 h-4 text-slate-400" />
                      </div>
                      
                      {expandedConversation === conv.id && (
                          <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto border-t border-slate-200 pt-4">
                            {(conv.messages || []).length === 0 ? (
                              <div className="text-center py-6">
                                <MessageSquare className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                <p className="text-sm text-slate-500">Nessun messaggio trovato per questa conversazione</p>
                                <p className="text-xs text-slate-400 mt-1">ID: {conv.id}</p>
                              </div>
                            ) : (
                              (conv.messages || []).map((msg, idx) => (
                                <div 
                                  key={idx}
                                  className={`p-4 rounded-xl ${
                                    msg.role === 'user' 
                                      ? 'bg-blue-50 ml-8 border-l-4 border-blue-400' 
                                      : 'bg-slate-100 mr-8 border-l-4 border-slate-400'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-slate-600 uppercase">
                                      {msg.role === 'user' ? '👤 Dipendente' : '🤖 Assistente'}
                                    </p>
                                  </div>
                                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{msg.content}</p>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </NeumorphicCard>
          </>
        )}

        {/* Verifica Coerenza Tab */}
        {activeTab === 'verifica' && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Verifica Coerenza Knowledge Base</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Analizza la knowledge base per trovare incongruenze o contraddizioni
                </p>
              </div>
              <NeumorphicButton
                onClick={checkInconsistencies}
                variant="primary"
                disabled={checkingInconsistencies || knowledge.length === 0}
                className="flex items-center gap-2"
              >
                {checkingInconsistencies ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                Verifica
              </NeumorphicButton>
            </div>

            {inconsistencies && (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl flex items-center gap-3 ${
                  inconsistencies.has_issues 
                    ? 'bg-red-50 border border-red-200' 
                    : 'bg-green-50 border border-green-200'
                }`}>
                  {inconsistencies.has_issues ? (
                    <XCircle className="w-6 h-6 text-red-600" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  )}
                  <div>
                    <p className={`font-medium ${inconsistencies.has_issues ? 'text-red-800' : 'text-green-800'}`}>
                      {inconsistencies.has_issues ? 'Problemi Rilevati' : 'Nessun Problema'}
                    </p>
                    <p className={`text-sm ${inconsistencies.has_issues ? 'text-red-600' : 'text-green-600'}`}>
                      {inconsistencies.summary}
                    </p>
                  </div>
                </div>

                {inconsistencies.has_issues && inconsistencies.issues?.length > 0 && (
                  <div className="space-y-3">
                    {inconsistencies.issues.map((issue, idx) => (
                      <div key={idx} className="neumorphic-pressed p-4 rounded-xl">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                          <div>
                            <p className="font-medium text-slate-800">{issue.tipo}</p>
                            <p className="text-sm text-slate-600 mt-1">{issue.descrizione}</p>
                            {issue.elementi_coinvolti?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {issue.elementi_coinvolti.map((el, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                                    {el}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!inconsistencies && !checkingInconsistencies && (
              <div className="text-center py-12 text-slate-500">
                <Bot className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>Clicca su "Verifica" per analizzare la knowledge base</p>
              </div>
            )}
          </NeumorphicCard>
        )}
      </div>
    </ProtectedPage>
  );
}