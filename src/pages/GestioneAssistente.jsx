import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { 
  Bot, Plus, Edit, Trash2, Save, X, Search, AlertTriangle, 
  MessageSquare, Book, Tag, Store, CheckCircle, XCircle, Loader2,
  ChevronDown, ChevronRight, Eye, Folder, RefreshCw, Key, EyeOff, HelpCircle, 
  Calendar, User, Sparkles, BarChart3, FileText
} from "lucide-react";
import moment from "moment";
import KnowledgeTree from "../components/assistente/KnowledgeTree";

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
  const [activeTab, setActiveTab] = useState('conversazioni');
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
  
  // Conversation filters
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [analyzingQuestions, setAnalyzingQuestions] = useState(false);
  const [commonQuestions, setCommonQuestions] = useState(null);
  
  // Accessi Store state
  const [showAccessoForm, setShowAccessoForm] = useState(false);
  const [editingAccesso, setEditingAccesso] = useState(null);
  const [accessoForm, setAccessoForm] = useState({
    store_id: '',
    nome_accesso: '',
    username: '',
    password: '',
    note: '',
    attivo: true
  });
  const [showPasswords, setShowPasswords] = useState({});
  const [filterAccessoStore, setFilterAccessoStore] = useState('');
  
  // FAQ state
  const [showFAQForm, setShowFAQForm] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState(null);
  const [faqForm, setFAQForm] = useState({
    domanda: '',
    risposta: '',
    categoria: 'Generale',
    store_id: '',
    ordine: 0,
    attivo: true
  });
  const [filterFAQCategoria, setFilterFAQCategoria] = useState('');
  const [filterFAQStore, setFilterFAQStore] = useState('');
  
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

  // Knowledge Pages state (Notion-like structure)
  const [showPageForm, setShowPageForm] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [parentPageId, setParentPageId] = useState(null);
  const [pageForm, setPageForm] = useState({
    titolo: '',
    contenuto: '',
    parent_page_id: null,
    ordine: 0,
    icona: '📄',
    notion_url: '',
    store_specifico: '',
    attivo: true
  });
  const [expandedPages, setExpandedPages] = useState({});

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

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts-for-conversations'],
    queryFn: () => base44.entities.Shift.list('-shift_date', 500),
    enabled: activeTab === 'conversazioni',
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-for-conversations'],
    queryFn: () => base44.entities.User.list(),
    enabled: activeTab === 'conversazioni',
  });

  const { data: accessi = [] } = useQuery({
    queryKey: ['accessi-store'],
    queryFn: () => base44.entities.AccessoStore.list(),
  });

  const { data: faqs = [] } = useQuery({
    queryKey: ['assistente-faq'],
    queryFn: () => base44.entities.AssistenteFAQ.list('ordine'),
  });

  const { data: knowledgePages = [] } = useQuery({
    queryKey: ['knowledge-pages'],
    queryFn: () => base44.entities.KnowledgePage.list('ordine'),
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



  // Accessi mutations
  const createAccessoMutation = useMutation({
    mutationFn: (data) => base44.entities.AccessoStore.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessi-store'] });
      resetAccessoForm();
    },
  });

  const updateAccessoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AccessoStore.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessi-store'] });
      resetAccessoForm();
    },
  });

  const deleteAccessoMutation = useMutation({
    mutationFn: (id) => base44.entities.AccessoStore.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessi-store'] });
    },
  });

  // FAQ mutations
  const createFAQMutation = useMutation({
    mutationFn: (data) => base44.entities.AssistenteFAQ.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistente-faq'] });
      resetFAQForm();
    },
  });

  const updateFAQMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AssistenteFAQ.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistente-faq'] });
      resetFAQForm();
    },
  });

  const deleteFAQMutation = useMutation({
    mutationFn: (id) => base44.entities.AssistenteFAQ.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistente-faq'] });
    },
  });

  // Knowledge Pages mutations
  const createPageMutation = useMutation({
    mutationFn: (data) => base44.entities.KnowledgePage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-pages'] });
      resetPageForm();
    },
  });

  const updatePageMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KnowledgePage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-pages'] });
      resetPageForm();
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: (id) => base44.entities.KnowledgePage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-pages'] });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (convId) => {
      // Delete conversation from ConversazioneAssistente entity
      await base44.entities.ConversazioneAssistente.delete(convId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistente-conversazioni'] });
    },
  });

  const resetCategoryForm = () => {
    setCategoryForm({ nome: '', ordine: 0 });
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  // Find store for conversation based on shift at message time
  const getStoreForConversation = (conv) => {
    if (!conv.user_email || !shifts.length) return null;
    
    const user = users.find(u => u.email === conv.user_email);
    if (!user) return null;
    
    const userName = user.nome_cognome || user.full_name;
    const convDate = conv.tracking?.last_message_date || conv.created_date;
    if (!convDate) return null;
    
    const convMoment = moment(convDate);
    const convDateStr = convMoment.format('YYYY-MM-DD');
    
    // Find shift on same day for this employee
    const shift = shifts.find(s => 
      s.employee_name === userName && 
      s.shift_date?.startsWith(convDateStr)
    );
    
    if (shift) {
      const store = stores.find(st => st.id === shift.store_id);
      return store ? { store, shiftType: shift.shift_type } : null;
    }
    
    return { store: null, noShift: true };
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // Filter by employee
      if (filterEmployee && conv.user_email !== filterEmployee) {
        return false;
      }
      
      // Filter by store
      if (filterStore) {
        const storeInfo = getStoreForConversation(conv);
        if (!storeInfo?.store || storeInfo.store.id !== filterStore) {
          return false;
        }
      }
      
      // Filter by date range
      const convDate = conv.tracking?.last_message_date || conv.created_date;
      if (dateRangeStart && moment(convDate).isBefore(dateRangeStart, 'day')) {
        return false;
      }
      if (dateRangeEnd && moment(convDate).isAfter(dateRangeEnd, 'day')) {
        return false;
      }
      
      return true;
    });
  }, [conversations, filterEmployee, filterStore, dateRangeStart, dateRangeEnd, shifts, stores, users]);

  // Get unique employees from conversations
  const conversationEmployees = useMemo(() => {
    const emails = new Set();
    conversations.forEach(conv => {
      if (conv.user_email) emails.add(conv.user_email);
    });
    return Array.from(emails).map(email => {
      const user = users.find(u => u.email === email);
      return { email, name: user?.nome_cognome || user?.full_name || email };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [conversations, users]);

  // Analyze common questions - ONLY from conversations, not from KB/FAQ/etc
  const analyzeCommonQuestions = async () => {
    setAnalyzingQuestions(true);
    try {
      // Extract only user messages from filtered conversations
      const allUserMessages = filteredConversations.flatMap(conv => 
        (conv.messages || [])
          .filter(m => m.role === 'user')
          .map(m => m.content)
      ).filter(Boolean);

      if (allUserMessages.length === 0) {
        setCommonQuestions({ topics: [], summary: 'Nessun messaggio da analizzare nelle conversazioni filtrate' });
        setAnalyzingQuestions(false);
        return;
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analizza SOLO le seguenti domande fatte dai dipendenti nelle conversazioni con l'assistente AI.
Identifica i temi/argomenti più comuni e raggruppa le domande per categoria.
NON usare altre fonti di informazione, analizza ESCLUSIVAMENTE questi messaggi.

Messaggi dei dipendenti (${allUserMessages.length} totali):
${allUserMessages.slice(0, 100).join('\n---\n')}`,
        response_json_schema: {
          type: "object",
          properties: {
            topics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  categoria: { type: "string" },
                  count: { type: "number" },
                  esempi: { type: "array", items: { type: "string" } },
                  suggerimento_kb: { type: "string" }
                }
              }
            },
            summary: { type: "string" }
          }
        }
      });
      setCommonQuestions(result);
    } catch (error) {
      console.error('Error analyzing questions:', error);
      setCommonQuestions({ topics: [], summary: 'Errore durante l\'analisi' });
    }
    setAnalyzingQuestions(false);
  };

  const resetAccessoForm = () => {
    setAccessoForm({
      store_id: '',
      nome_accesso: '',
      username: '',
      password: '',
      note: '',
      attivo: true
    });
    setEditingAccesso(null);
    setShowAccessoForm(false);
  };

  const handleEditAccesso = (accesso) => {
    setEditingAccesso(accesso);
    setAccessoForm({
      store_id: accesso.store_id,
      nome_accesso: accesso.nome_accesso,
      username: accesso.username || '',
      password: accesso.password,
      note: accesso.note || '',
      attivo: accesso.attivo !== false
    });
    setShowAccessoForm(true);
  };

  const handleSaveAccesso = () => {
    if (editingAccesso) {
      updateAccessoMutation.mutate({ id: editingAccesso.id, data: accessoForm });
    } else {
      createAccessoMutation.mutate(accessoForm);
    }
  };

  const togglePasswordVisibility = (id) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredAccessi = filterAccessoStore 
    ? accessi.filter(a => a.store_id === filterAccessoStore)
    : accessi;

  const resetFAQForm = () => {
    setFAQForm({
      domanda: '',
      risposta: '',
      categoria: 'Generale',
      store_id: '',
      ordine: 0,
      attivo: true
    });
    setEditingFAQ(null);
    setShowFAQForm(false);
  };

  const resetPageForm = () => {
    setPageForm({
      titolo: '',
      contenuto: '',
      parent_page_id: null,
      ordine: 0,
      icona: '📄',
      notion_url: '',
      store_specifico: '',
      attivo: true
    });
    setEditingPage(null);
    setParentPageId(null);
    setShowPageForm(false);
  };

  const handleEditPage = (page) => {
    setEditingPage(page);
    setPageForm({
      titolo: page.titolo,
      contenuto: page.contenuto || '',
      parent_page_id: page.parent_page_id || null,
      ordine: page.ordine || 0,
      icona: page.icona || '📄',
      notion_url: page.notion_url || '',
      store_specifico: page.store_specifico || '',
      attivo: page.attivo !== false
    });
    setShowPageForm(true);
  };

  const handleAddChildPage = (parentId) => {
    setParentPageId(parentId);
    setPageForm({ ...pageForm, parent_page_id: parentId });
    setShowPageForm(true);
  };

  const handleSavePage = () => {
    const dataToSave = {
      ...pageForm,
      parent_page_id: parentPageId || pageForm.parent_page_id || null
    };
    
    if (editingPage) {
      updatePageMutation.mutate({ id: editingPage.id, data: dataToSave });
    } else {
      createPageMutation.mutate(dataToSave);
    }
  };

  const handleDeletePage = (pageId) => {
    const hasChildren = knowledgePages.some(p => p.parent_page_id === pageId);
    if (hasChildren) {
      if (!confirm('Questa pagina ha sottopagine. Eliminandola verranno eliminate anche tutte le sottopagine. Continuare?')) {
        return;
      }
    } else if (!confirm('Eliminare questa pagina?')) {
      return;
    }
    deletePageMutation.mutate(pageId);
  };

  const togglePageExpand = (pageId) => {
    setExpandedPages(prev => ({
      ...prev,
      [pageId]: prev[pageId] === false ? true : false
    }));
  };

  const handleEditFAQ = (faq) => {
    setEditingFAQ(faq);
    setFAQForm({
      domanda: faq.domanda,
      risposta: faq.risposta,
      categoria: faq.categoria,
      store_id: faq.store_id || '',
      ordine: faq.ordine || 0,
      attivo: faq.attivo !== false
    });
    setShowFAQForm(true);
  };

  const handleSaveFAQ = () => {
    if (editingFAQ) {
      updateFAQMutation.mutate({ id: editingFAQ.id, data: faqForm });
    } else {
      createFAQMutation.mutate(faqForm);
    }
  };

  const FAQ_CATEGORIE = [
    "Generale",
    "Turni e Orari",
    "Permessi e Ferie",
    "Pagamenti",
    "Procedure",
    "Attrezzature",
    "Sicurezza",
    "Altro"
  ];

  const filteredFAQs = faqs.filter(f => {
    if (filterFAQCategoria && f.categoria !== filterFAQCategoria) return false;
    if (filterFAQStore && f.store_id !== filterFAQStore) return false;
    return true;
  });

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
      alert('Per importare da Notion: apri la pagina in Notion, clicca sui 3 puntini (...) in alto a destra, seleziona "Connessioni" e aggiungi "Base44". Poi riprova.');
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
            onClick={() => setActiveTab('knowledge-pages')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'knowledge-pages'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'neumorphic-flat text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Knowledge Base ({knowledgePages.length})
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'knowledge'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'neumorphic-flat text-slate-700'
            }`}
          >
            <Book className="w-4 h-4" />
            Vecchia KB ({knowledge.length})
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
            onClick={() => setActiveTab('accessi')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'accessi'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'neumorphic-flat text-slate-700'
            }`}
          >
            <Key className="w-4 h-4" />
            Accessi ({accessi.length})
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'faq'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'neumorphic-flat text-slate-700'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            FAQ ({faqs.length})
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
                                    onClick={refreshAllNotionPages}
                                    disabled={refreshingAllNotion}
                                    className="flex items-center gap-2"
                                  >
                                    {refreshingAllNotion ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <RefreshCw className="w-4 h-4" />
                                    )}
                                    Aggiorna Notion
                                  </NeumorphicButton>
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
                                  {item.notion_url && (
                                    <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs flex items-center gap-1">
                                      <RefreshCw className="w-3 h-3" />
                                      Notion
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
            {/* Filters */}
            <NeumorphicCard className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Search className="w-5 h-5 text-slate-500" />
                <h2 className="text-lg font-bold text-slate-800">Filtri</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Dipendente</label>
                  <select
                    value={filterEmployee}
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                  >
                    <option value="">Tutti i dipendenti</option>
                    {conversationEmployees.map(emp => (
                      <option key={emp.email} value={emp.email}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Negozio</label>
                  <select
                    value={filterStore}
                    onChange={(e) => setFilterStore(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                  >
                    <option value="">Tutti i negozi</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Data Inizio</label>
                  <input
                    type="date"
                    value={dateRangeStart}
                    onChange={(e) => setDateRangeStart(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Data Fine</label>
                  <input
                    type="date"
                    value={dateRangeEnd}
                    onChange={(e) => setDateRangeEnd(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                  />
                </div>
              </div>
              {(filterEmployee || filterStore || dateRangeStart || dateRangeEnd) && (
                <button
                  onClick={() => {
                    setFilterEmployee('');
                    setFilterStore('');
                    setDateRangeStart('');
                    setDateRangeEnd('');
                  }}
                  className="mt-3 text-sm text-blue-600 hover:underline"
                >
                  Rimuovi filtri
                </button>
              )}
            </NeumorphicCard>

            {/* AI Analysis */}
            <NeumorphicCard className="p-6 bg-purple-50 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-purple-800">Analisi Domande Frequenti (AI)</h3>
                </div>
                <NeumorphicButton
                  onClick={analyzeCommonQuestions}
                  disabled={analyzingQuestions || filteredConversations.length === 0}
                  className="flex items-center gap-2"
                >
                  {analyzingQuestions ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <BarChart3 className="w-4 h-4" />
                  )}
                  Analizza
                </NeumorphicButton>
              </div>
              
              {commonQuestions && (
                <div className="space-y-4">
                  <p className="text-sm text-purple-700">{commonQuestions.summary}</p>
                  {commonQuestions.topics?.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {commonQuestions.topics.map((topic, idx) => (
                        <div key={idx} className="neumorphic-flat p-4 rounded-xl bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-slate-800">{topic.categoria}</span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                              ~{topic.count} domande
                            </span>
                          </div>
                          {topic.esempi?.length > 0 && (
                            <ul className="text-xs text-slate-600 space-y-1 mb-2">
                              {topic.esempi.slice(0, 2).map((es, i) => (
                                <li key={i}>• {es}</li>
                              ))}
                            </ul>
                          )}
                          {topic.suggerimento_kb && (
                            <p className="text-xs text-green-600 mt-2">
                              💡 {topic.suggerimento_kb}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {!commonQuestions && !analyzingQuestions && (
                <p className="text-sm text-purple-600">
                  Clicca "Analizza" per estrarre gli argomenti più comuni dalle conversazioni filtrate.
                </p>
              )}
            </NeumorphicCard>

            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">
                  Conversazioni ({filteredConversations.length})
                </h2>
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
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">
                    {conversations.length === 0 
                      ? 'Nessuna conversazione trovata' 
                      : 'Nessuna conversazione corrisponde ai filtri'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredConversations.map(conv => {
                    const storeInfo = getStoreForConversation(conv);
                    return (
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
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs text-slate-500">
                                  {moment(conv.tracking?.last_message_date || conv.created_date).format('DD/MM/YYYY HH:mm')} • 
                                  {conv.messages?.length || 0} messaggi
                                </p>
                                {storeInfo?.store ? (
                                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                                    <Store className="w-3 h-3" />
                                    {storeInfo.store.name}
                                  </span>
                                ) : storeInfo?.noShift ? (
                                  <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                                    Non in turno
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-slate-400" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Eliminare questa conversazione?')) {
                                  deleteConversationMutation.mutate(conv.id);
                                }
                              }}
                              className="p-1 rounded hover:bg-red-100 text-red-500"
                              title="Elimina conversazione"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {expandedConversation === conv.id && (
                          <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto border-t border-slate-200 pt-4">
                            {(conv.messages || []).length === 0 ? (
                              <div className="text-center py-6">
                                <MessageSquare className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                <p className="text-sm text-slate-500">Nessun messaggio trovato</p>
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
                                  <p className="text-xs font-bold text-slate-600 uppercase mb-2">
                                    {msg.role === 'user' ? '👤 Dipendente' : '🤖 Assistente'}
                                  </p>
                                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{msg.content}</p>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </NeumorphicCard>
          </>
        )}



        {/* Accessi Store Tab */}
        {activeTab === 'accessi' && (
          <>
            <NeumorphicCard className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-slate-800">Accessi per Negozio</h2>
                  <select
                    value={filterAccessoStore}
                    onChange={(e) => setFilterAccessoStore(e.target.value)}
                    className="neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="">Tutti i negozi</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>
                <NeumorphicButton
                  onClick={() => setShowAccessoForm(true)}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nuovo Accesso
                </NeumorphicButton>
              </div>
            </NeumorphicCard>

            {showAccessoForm && (
              <NeumorphicCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingAccesso ? 'Modifica Accesso' : 'Nuovo Accesso'}
                  </h2>
                  <button onClick={resetAccessoForm} className="nav-button p-2 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Negozio *</label>
                    <select
                      value={accessoForm.store_id}
                      onChange={(e) => setAccessoForm({ ...accessoForm, store_id: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    >
                      <option value="">Seleziona negozio</option>
                      <option value="ALL">Tutti i locali</option>
                      {stores.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">A cosa dà accesso *</label>
                    <input
                      type="text"
                      value={accessoForm.nome_accesso}
                      onChange={(e) => setAccessoForm({ ...accessoForm, nome_accesso: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      placeholder="Es: WiFi, Allarme, Cassa, Cassaforte..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Nome Utente (opzionale)</label>
                    <input
                      type="text"
                      value={accessoForm.username}
                      onChange={(e) => setAccessoForm({ ...accessoForm, username: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      placeholder="Username"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Password / Codice *</label>
                    <input
                      type="text"
                      value={accessoForm.password}
                      onChange={(e) => setAccessoForm({ ...accessoForm, password: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      placeholder="Password o codice"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Note (opzionale)</label>
                  <textarea
                    value={accessoForm.note}
                    onChange={(e) => setAccessoForm({ ...accessoForm, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none min-h-[60px]"
                    placeholder="Note aggiuntive..."
                  />
                </div>

                <div className="flex items-center mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accessoForm.attivo}
                      onChange={(e) => setAccessoForm({ ...accessoForm, attivo: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-sm font-medium text-slate-700">Attivo</span>
                  </label>
                </div>

                <div className="flex gap-3">
                  <NeumorphicButton onClick={resetAccessoForm} className="flex-1">Annulla</NeumorphicButton>
                  <NeumorphicButton 
                    onClick={handleSaveAccesso} 
                    variant="primary" 
                    className="flex-1 flex items-center justify-center gap-2"
                    disabled={!accessoForm.store_id || !accessoForm.nome_accesso || !accessoForm.password}
                  >
                    <Save className="w-4 h-4" />
                    Salva
                  </NeumorphicButton>
                </div>
              </NeumorphicCard>
            )}

            {/* Lista Accessi per Store */}
            <div className="space-y-4">
              {/* Accessi generali (tutti i locali) */}
              {(() => {
                const generalAccessi = filteredAccessi.filter(a => a.store_id === 'ALL');
                if (generalAccessi.length === 0) return null;
                
                return (
                  <NeumorphicCard className="p-4 bg-gradient-to-br from-purple-50 to-blue-50">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Store className="w-4 h-4 text-purple-600" />
                      Tutti i Locali
                      <span className="text-sm font-normal text-slate-500">({generalAccessi.length} accessi)</span>
                    </h3>
                    <div className="space-y-2">
                      {generalAccessi.map(accesso => (
                        <div 
                          key={accesso.id} 
                          className={`neumorphic-pressed p-4 rounded-xl ${!accesso.attivo ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Key className="w-4 h-4 text-amber-600" />
                                <h4 className="font-medium text-slate-800">{accesso.nome_accesso}</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                {accesso.username && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500">Utente:</span>
                                    <span className="font-mono text-slate-700">{accesso.username}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500">Password:</span>
                                  <span className="font-mono text-slate-700">
                                    {showPasswords[accesso.id] ? accesso.password : '••••••••'}
                                  </span>
                                  <button
                                    onClick={() => togglePasswordVisibility(accesso.id)}
                                    className="text-slate-400 hover:text-slate-600"
                                  >
                                    {showPasswords[accesso.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>
                              {accesso.note && (
                                <p className="text-xs text-slate-500 mt-2">{accesso.note}</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEditAccesso(accesso)}
                                className="nav-button p-2 rounded-lg hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4 text-blue-600" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Eliminare questo accesso?')) {
                                    deleteAccessoMutation.mutate(accesso.id);
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
                  </NeumorphicCard>
                );
              })()}

              {stores.map(store => {
                const storeAccessi = filteredAccessi.filter(a => a.store_id === store.id);
                if (storeAccessi.length === 0 && filterAccessoStore) return null;
                if (storeAccessi.length === 0 && !filterAccessoStore) return null;
                
                return (
                  <NeumorphicCard key={store.id} className="p-4">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Store className="w-4 h-4 text-purple-600" />
                      {store.name}
                      <span className="text-sm font-normal text-slate-500">({storeAccessi.length} accessi)</span>
                    </h3>
                    <div className="space-y-2">
                      {storeAccessi.map(accesso => (
                        <div 
                          key={accesso.id} 
                          className={`neumorphic-pressed p-4 rounded-xl ${!accesso.attivo ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Key className="w-4 h-4 text-amber-600" />
                                <h4 className="font-medium text-slate-800">{accesso.nome_accesso}</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                {accesso.username && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500">Utente:</span>
                                    <span className="font-mono text-slate-700">{accesso.username}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500">Password:</span>
                                  <span className="font-mono text-slate-700">
                                    {showPasswords[accesso.id] ? accesso.password : '••••••••'}
                                  </span>
                                  <button
                                    onClick={() => togglePasswordVisibility(accesso.id)}
                                    className="text-slate-400 hover:text-slate-600"
                                  >
                                    {showPasswords[accesso.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>
                              {accesso.note && (
                                <p className="text-xs text-slate-500 mt-2">{accesso.note}</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEditAccesso(accesso)}
                                className="nav-button p-2 rounded-lg hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4 text-blue-600" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Eliminare questo accesso?')) {
                                    deleteAccessoMutation.mutate(accesso.id);
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
                  </NeumorphicCard>
                );
              })}

              {filteredAccessi.length === 0 && (
                <NeumorphicCard className="p-8 text-center">
                  <Key className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nessun accesso configurato</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Aggiungi credenziali di accesso per WiFi, allarmi, casseforti, ecc.
                  </p>
                </NeumorphicCard>
              )}
            </div>
          </>
        )}

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <>
            <NeumorphicCard className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-800">FAQ Dipendenti</h2>
                  <select
                    value={filterFAQCategoria}
                    onChange={(e) => setFilterFAQCategoria(e.target.value)}
                    className="neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="">Tutte le categorie</option>
                    {FAQ_CATEGORIE.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select
                    value={filterFAQStore}
                    onChange={(e) => setFilterFAQStore(e.target.value)}
                    className="neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="">Tutti i locali</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>
                <NeumorphicButton
                  onClick={() => setShowFAQForm(true)}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nuova FAQ
                </NeumorphicButton>
              </div>
            </NeumorphicCard>

            {showFAQForm && (
              <NeumorphicCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingFAQ ? 'Modifica FAQ' : 'Nuova FAQ'}
                  </h2>
                  <button onClick={resetFAQForm} className="nav-button p-2 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Categoria *</label>
                    <select
                      value={faqForm.categoria}
                      onChange={(e) => setFAQForm({ ...faqForm, categoria: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    >
                      {FAQ_CATEGORIE.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Locale Specifico</label>
                    <select
                      value={faqForm.store_id}
                      onChange={(e) => setFAQForm({ ...faqForm, store_id: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    >
                      <option value="">Tutti i locali</option>
                      {stores.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Ordine</label>
                    <input
                      type="number"
                      value={faqForm.ordine}
                      onChange={(e) => setFAQForm({ ...faqForm, ordine: parseInt(e.target.value) || 0 })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Domanda *</label>
                  <input
                    type="text"
                    value={faqForm.domanda}
                    onChange={(e) => setFAQForm({ ...faqForm, domanda: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    placeholder="Es: Come posso richiedere un giorno di ferie?"
                  />
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Risposta *</label>
                  <textarea
                    value={faqForm.risposta}
                    onChange={(e) => setFAQForm({ ...faqForm, risposta: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none min-h-[120px]"
                    placeholder="Scrivi la risposta dettagliata..."
                  />
                </div>

                <div className="flex items-center mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={faqForm.attivo}
                      onChange={(e) => setFAQForm({ ...faqForm, attivo: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-sm font-medium text-slate-700">Attiva</span>
                  </label>
                </div>

                <div className="flex gap-3">
                  <NeumorphicButton onClick={resetFAQForm} className="flex-1">Annulla</NeumorphicButton>
                  <NeumorphicButton 
                    onClick={handleSaveFAQ} 
                    variant="primary" 
                    className="flex-1 flex items-center justify-center gap-2"
                    disabled={!faqForm.domanda || !faqForm.risposta}
                  >
                    <Save className="w-4 h-4" />
                    Salva
                  </NeumorphicButton>
                </div>
              </NeumorphicCard>
            )}

            {/* Lista FAQ per Categoria */}
            <div className="space-y-4">
              {FAQ_CATEGORIE.map(categoria => {
                const categoryFAQs = filteredFAQs.filter(f => f.categoria === categoria);
                if (categoryFAQs.length === 0) return null;
                
                return (
                  <NeumorphicCard key={categoria} className="p-4">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-cyan-600" />
                      {categoria}
                      <span className="text-sm font-normal text-slate-500">({categoryFAQs.length})</span>
                    </h3>
                    <div className="space-y-2">
                      {categoryFAQs.map(faq => (
                        <div 
                          key={faq.id} 
                          className={`neumorphic-pressed p-4 rounded-xl ${!faq.attivo ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-800 flex items-center gap-2">
                                <span className="text-cyan-600">D:</span>
                                {faq.domanda}
                              </h4>
                              <p className="text-sm text-slate-600 mt-2 pl-6">
                                <span className="text-green-600 font-medium">R:</span> {faq.risposta}
                              </p>
                              {faq.store_id && (
                                <div className="mt-2 pl-6">
                                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center gap-1 inline-flex">
                                    <Store className="w-3 h-3" />
                                    {getStoreName(faq.store_id)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEditFAQ(faq)}
                                className="nav-button p-2 rounded-lg hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4 text-blue-600" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Eliminare questa FAQ?')) {
                                    deleteFAQMutation.mutate(faq.id);
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
                  </NeumorphicCard>
                );
              })}

              {filteredFAQs.length === 0 && (
                <NeumorphicCard className="p-8 text-center">
                  <HelpCircle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nessuna FAQ creata</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Aggiungi domande frequenti per aiutare i dipendenti
                  </p>
                </NeumorphicCard>
              )}
            </div>
          </>
        )}

        {/* Knowledge Pages Tab (Notion-like) */}
        {activeTab === 'knowledge-pages' && (
          <>
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Knowledge Base - Struttura Pagine</h2>
                <NeumorphicButton
                  onClick={() => setShowPageForm(true)}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nuova Pagina Root
                </NeumorphicButton>
              </div>

              {knowledgePages.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nessuna pagina creata</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Crea la prima pagina per iniziare a strutturare la knowledge base
                  </p>
                </div>
              ) : (
                <div className="neumorphic-flat p-4 rounded-xl">
                  <KnowledgeTree 
                    pages={knowledgePages}
                    onEdit={handleEditPage}
                    onDelete={handleDeletePage}
                    onAddChild={handleAddChildPage}
                    expandedPages={expandedPages}
                    onToggleExpand={togglePageExpand}
                  />
                </div>
              )}
            </NeumorphicCard>

            {/* Page Form Modal */}
            {showPageForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                  <NeumorphicCard className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-slate-800">
                        {editingPage ? 'Modifica Pagina' : parentPageId ? 'Nuova Sottopagina' : 'Nuova Pagina'}
                      </h2>
                      <button onClick={resetPageForm} className="nav-button p-2 rounded-lg">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-slate-700 mb-2 block">Titolo *</label>
                          <input
                            type="text"
                            value={pageForm.titolo}
                            onChange={(e) => setPageForm({ ...pageForm, titolo: e.target.value })}
                            className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                            placeholder="Titolo della pagina"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-2 block">Icona</label>
                          <input
                            type="text"
                            value={pageForm.icona}
                            onChange={(e) => setPageForm({ ...pageForm, icona: e.target.value })}
                            className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none text-center text-2xl"
                            placeholder="📄"
                            maxLength={2}
                          />
                        </div>
                      </div>

                      {!editingPage && !parentPageId && (
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-2 block">Pagina Parent (opzionale)</label>
                          <select
                            value={pageForm.parent_page_id || ''}
                            onChange={(e) => setPageForm({ ...pageForm, parent_page_id: e.target.value || null })}
                            className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                          >
                            <option value="">Pagina Root</option>
                            {knowledgePages.map(p => (
                              <option key={p.id} value={p.id}>{p.icona} {p.titolo}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Link Notion (opzionale)</label>
                        <input
                          type="url"
                          value={pageForm.notion_url}
                          onChange={(e) => setPageForm({ ...pageForm, notion_url: e.target.value })}
                          className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                          placeholder="https://notion.so/..."
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Contenuto (markdown supportato)</label>
                        <textarea
                          value={pageForm.contenuto}
                          onChange={(e) => setPageForm({ ...pageForm, contenuto: e.target.value })}
                          className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none min-h-[200px] font-mono text-sm"
                          placeholder="# Titolo&#10;&#10;Contenuto della pagina..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-2 block">Locale Specifico</label>
                          <select
                            value={pageForm.store_specifico}
                            onChange={(e) => setPageForm({ ...pageForm, store_specifico: e.target.value })}
                            className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                          >
                            <option value="">Tutti i locali</option>
                            {stores.map(store => (
                              <option key={store.id} value={store.id}>{store.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-2 block">Ordine</label>
                          <input
                            type="number"
                            value={pageForm.ordine}
                            onChange={(e) => setPageForm({ ...pageForm, ordine: parseInt(e.target.value) || 0 })}
                            className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pageForm.attivo}
                            onChange={(e) => setPageForm({ ...pageForm, attivo: e.target.checked })}
                            className="w-5 h-5"
                          />
                          <span className="text-sm font-medium text-slate-700">Attiva</span>
                        </label>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <NeumorphicButton onClick={resetPageForm} className="flex-1">
                          Annulla
                        </NeumorphicButton>
                        <NeumorphicButton 
                          onClick={handleSavePage}
                          variant="primary" 
                          className="flex-1 flex items-center justify-center gap-2"
                          disabled={!pageForm.titolo}
                        >
                          <Save className="w-4 h-4" />
                          Salva
                        </NeumorphicButton>
                      </div>
                    </div>
                  </NeumorphicCard>
                </div>
              </div>
            )}
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