import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  Link as LinkIcon,
  Building,
  Euro,
  X,
  Search } from
'lucide-react';

export default function Contatti() {
  const [showForm, setShowForm] = useState(false);
  const [editingContatto, setEditingContatto] = useState(null);
  const [activeTab, setActiveTab] = useState('Food influencers');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByVisit, setSortByVisit] = useState(false);
  const [filterMaiVisitato, setFilterMaiVisitato] = useState(false);
  const [filterNegozio, setFilterNegozio] = useState('');
  const [formData, setFormData] = useState({
    categoria: 'Food influencers',
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    link: '',
    societa: '',
    followers: '',
    visite_negozio: [],
    proposte_commerciali: [],
    note: ''
  });
  const [nuovaProposta, setNuovaProposta] = useState({
    descrizione: '',
    prezzo: ''
  });
  const [nuovaVisita, setNuovaVisita] = useState({
    data: '',
    negozio: ''
  });
  const [editingVisitaIndex, setEditingVisitaIndex] = useState(null);

  const queryClient = useQueryClient();

  const { data: contatti = [] } = useQuery({
    queryKey: ['contatti-marketing'],
    queryFn: () => base44.entities.ContattoMarketing.list()
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ContattoMarketing.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contatti-marketing'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ContattoMarketing.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contatti-marketing'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ContattoMarketing.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contatti-marketing'] });
    }
  });

  const resetForm = () => {
    setFormData({
      categoria: activeTab,
      nome: '',
      cognome: '',
      email: '',
      telefono: '',
      link: '',
      societa: '',
      followers: '',
      visite_negozio: [],
      proposte_commerciali: [],
      note: ''
    });
    setNuovaProposta({ descrizione: '', prezzo: '' });
    setNuovaVisita({ data: '', negozio: '' });
    setEditingVisitaIndex(null);
    setEditingContatto(null);
    setShowForm(false);
  };

  const handleEdit = (contatto) => {
    setEditingContatto(contatto);
    
    // Migrate old single visit to new array format if needed
    let visite = contatto.visite_negozio || [];
    if (contatto.data_visita_negozio && !contatto.mai_visitato && visite.length === 0) {
      visite = [{
        data: contatto.data_visita_negozio,
        negozio: contatto.negozio_visitato || ''
      }];
    }
    
    setFormData({
      categoria: contatto.categoria,
      nome: contatto.nome,
      cognome: contatto.cognome,
      email: contatto.email || '',
      telefono: contatto.telefono || '',
      link: contatto.link || '',
      societa: contatto.societa || '',
      followers: contatto.followers || '',
      visite_negozio: visite,
      proposte_commerciali: contatto.proposte_commerciali || [],
      note: contatto.note || ''
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      followers: formData.followers ? parseFloat(formData.followers) : null
    };

    if (editingContatto) {
      updateMutation.mutate({ id: editingContatto.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleAggiungiProposta = () => {
    if (!nuovaProposta.descrizione.trim()) return;

    setFormData({
      ...formData,
      proposte_commerciali: [
      ...formData.proposte_commerciali,
      {
        descrizione: nuovaProposta.descrizione,
        prezzo: nuovaProposta.prezzo ? parseFloat(nuovaProposta.prezzo) : 0
      }]

    });
    setNuovaProposta({ descrizione: '', prezzo: '' });
  };

  const handleRimuoviProposta = (index) => {
    setFormData({
      ...formData,
      proposte_commerciali: formData.proposte_commerciali.filter((_, i) => i !== index)
    });
  };

  const handleAggiungiVisita = () => {
    if (!nuovaVisita.data) return;

    if (editingVisitaIndex !== null) {
      // Update existing visit
      const updatedVisite = [...formData.visite_negozio];
      updatedVisite[editingVisitaIndex] = {
        data: nuovaVisita.data,
        negozio: nuovaVisita.negozio
      };
      setFormData({
        ...formData,
        visite_negozio: updatedVisite
      });
      setEditingVisitaIndex(null);
    } else {
      // Add new visit
      setFormData({
        ...formData,
        visite_negozio: [
          ...formData.visite_negozio,
          {
            data: nuovaVisita.data,
            negozio: nuovaVisita.negozio
          }
        ]
      });
    }
    setNuovaVisita({ data: '', negozio: '' });
  };

  const handleEditVisita = (index) => {
    const visita = formData.visite_negozio[index];
    setNuovaVisita({
      data: visita.data,
      negozio: visita.negozio
    });
    setEditingVisitaIndex(index);
  };

  const handleCancelEditVisita = () => {
    setNuovaVisita({ data: '', negozio: '' });
    setEditingVisitaIndex(null);
  };

  const handleRimuoviVisita = (index) => {
    setFormData({
      ...formData,
      visite_negozio: formData.visite_negozio.filter((_, i) => i !== index)
    });
  };

  const categorieStats = {
    'Food influencers': contatti.filter((c) => c.categoria === 'Food influencers').length,
    'PR': contatti.filter((c) => c.categoria === 'PR').length,
    'Adv': contatti.filter((c) => c.categoria === 'Adv').length,
    'Partners': contatti.filter((c) => c.categoria === 'Partners').length
  };

  let contattiByCategoria = contatti.filter((c) => c.categoria === activeTab);

  // Apply search filter
  if (searchQuery.trim()) {
    contattiByCategoria = contattiByCategoria.filter((c) => {
      const fullName = `${c.nome} ${c.cognome}`.toLowerCase();
      return fullName.includes(searchQuery.toLowerCase());
    });
  }

  // Apply "mai visitato" filter for Food Influencers
  if (activeTab === 'Food influencers' && filterMaiVisitato) {
    contattiByCategoria = contattiByCategoria.filter((c) => {
      // Consider "mai visitato" if no visits recorded
      return (!c.visite_negozio || c.visite_negozio.length === 0) && !c.data_visita_negozio;
    });
  }

  // Apply negozio filter for Food Influencers
  if (activeTab === 'Food influencers' && filterNegozio) {
    contattiByCategoria = contattiByCategoria.filter((c) => {
      if (c.visite_negozio && c.visite_negozio.length > 0) {
        return c.visite_negozio.some(v => v.negozio === filterNegozio);
      }
      // Fallback to old field
      return c.negozio_visitato === filterNegozio;
    });
  }

  // Get list of unique negozi for filter dropdown
  const negoziList = activeTab === 'Food influencers' ? [...new Set(
    contatti
      .filter(c => c.categoria === 'Food influencers')
      .flatMap(c => {
        if (c.visite_negozio && c.visite_negozio.length > 0) {
          return c.visite_negozio.map(v => v.negozio).filter(Boolean);
        }
        return c.negozio_visitato ? [c.negozio_visitato] : [];
      })
  )].sort() : [];

  // Apply sorting for Food Influencers
  if (activeTab === 'Food influencers' && sortByVisit) {
    contattiByCategoria = [...contattiByCategoria].sort((a, b) => {
      // Put "mai_visitato" at the end
      if (a.mai_visitato && !b.mai_visitato) return 1;
      if (!a.mai_visitato && b.mai_visitato) return -1;
      
      // Get most recent visit date for each contact
      const getLastVisit = (contatto) => {
        if (contatto.visite_negozio && contatto.visite_negozio.length > 0) {
          return Math.max(...contatto.visite_negozio.map(v => new Date(v.data).getTime()));
        }
        // Fallback to old single visit field
        if (contatto.data_visita_negozio) {
          return new Date(contatto.data_visita_negozio).getTime();
        }
        return 0;
      };
      
      const aLastVisit = getLastVisit(a);
      const bLastVisit = getLastVisit(b);
      
      if (aLastVisit === 0 && bLastVisit === 0) return 0;
      if (aLastVisit === 0) return 1;
      if (bLastVisit === 0) return -1;
      
      // Sort by date (oldest first)
      return aLastVisit - bLastVisit;
    });
  }

  const getCategoriaColor = (categoria) => {
    switch (categoria) {
      case 'Food influencers':return 'bg-purple-100 text-purple-700';
      case 'PR':return 'bg-blue-100 text-blue-700';
      case 'Adv':return 'bg-green-100 text-green-700';
      case 'Partners':return 'bg-orange-100 text-orange-700';
      default:return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoriaIcon = (categoria) => {
    switch (categoria) {
      case 'Food influencers':return '👨‍🍳';
      case 'PR':return '📢';
      case 'Adv':return '📺';
      case 'Partners':return '🤝';
      default:return '📋';
    }
  };

  return (
    <ProtectedPage pageName="Contatti">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold" style={{ color: '#000000' }}>Contatti Marketing</h1>
            <p style={{ color: '#000000' }}>Gestisci i tuoi contatti per influencer, PR e advertising</p>
          </div>
          <NeumorphicButton
            onClick={() => {
              setFormData({ ...formData, categoria: activeTab });
              setShowForm(true);
            }}
            variant="primary"
            className="flex items-center gap-2">

            <Plus className="w-5 h-5" />
            Nuovo Contatto
          </NeumorphicButton>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <NeumorphicCard className="p-6 text-center">
            <div className="text-4xl mb-2">👨‍🍳</div>
            <h3 className="text-3xl font-bold text-purple-600 mb-1">{categorieStats['Food influencers']}</h3>
            <p className="text-sm text-slate-500">Food Influencers</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <div className="text-4xl mb-2">📢</div>
            <h3 className="text-3xl font-bold text-blue-600 mb-1">{categorieStats['PR']}</h3>
            <p className="text-sm text-slate-500">PR</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <div className="text-4xl mb-2">📺</div>
            <h3 className="text-3xl font-bold text-green-600 mb-1">{categorieStats['Adv']}</h3>
            <p className="text-sm text-slate-500">Advertising</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <div className="text-4xl mb-2">🤝</div>
            <h3 className="text-3xl font-bold text-orange-600 mb-1">{categorieStats['Partners']}</h3>
            <p className="text-sm text-slate-500">Partners</p>
          </NeumorphicCard>
        </div>

        {/* Category Tabs */}
        <NeumorphicCard className="p-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['Food influencers', 'PR', 'Adv', 'Partners'].map((categoria) =>
            <NeumorphicButton
              key={categoria}
              onClick={() => setActiveTab(categoria)}
              variant={activeTab === categoria ? 'primary' : 'default'}
              className="flex items-center gap-2">

                <span>{getCategoriaIcon(categoria)}</span>
                {categoria}
                <span className="text-xs opacity-75">({categorieStats[categoria]})</span>
              </NeumorphicButton>
            )}
          </div>
        </NeumorphicCard>

        {/* Contacts List */}
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span>{getCategoriaIcon(activeTab)}</span>
              {activeTab}
            </h2>
            
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search Bar */}
              <input
                type="text"
                placeholder="Cerca nome o cognome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none w-64"
              />
              
              {/* Food Influencers Filters */}
              {activeTab === 'Food influencers' && (
                <>
                  {/* Mai Visitato Filter */}
                  <NeumorphicButton
                    onClick={() => setFilterMaiVisitato(!filterMaiVisitato)}
                    variant={filterMaiVisitato ? 'primary' : 'default'}
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    {filterMaiVisitato ? '✓ ' : ''}Mai visitato
                  </NeumorphicButton>

                  {/* Negozio Filter */}
                  {negoziList.length > 0 && (
                    <select
                      value={filterNegozio}
                      onChange={(e) => setFilterNegozio(e.target.value)}
                      className="neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
                    >
                      <option value="">Tutti i negozi</option>
                      {negoziList.map((negozio) => (
                        <option key={negozio} value={negozio}>
                          {negozio}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Sort Toggle */}
                  <NeumorphicButton
                    onClick={() => setSortByVisit(!sortByVisit)}
                    variant={sortByVisit ? 'primary' : 'default'}
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    {sortByVisit ? '✓ ' : ''}Ordina per data visita
                  </NeumorphicButton>
                </>
              )}
            </div>
          </div>

          {contattiByCategoria.length === 0 ?
          <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nessun contatto in questa categoria</p>
            </div> :

          <div className="space-y-3">
              {contattiByCategoria.map((contatto) =>
            <div key={contatto.id} className="neumorphic-pressed p-4 rounded-xl">
                  <div className="flex items-center justify-between gap-4">
                    {/* Nome e Info Base */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <h3 className="text-lg font-bold text-slate-800">
                          {contatto.nome} {contatto.cognome}
                        </h3>
                        {contatto.societa &&
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Building className="w-4 h-4" />
                            {contatto.societa}
                          </div>
                        }
                      </div>

                      {/* Contatti */}
                      <div className="flex items-center gap-4 text-sm">
                        {contatto.email &&
                          <a href={`mailto:${contatto.email}`} className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors">
                            <Mail className="w-4 h-4" />
                            <span className="hidden lg:inline">{contatto.email}</span>
                          </a>
                        }
                        {contatto.telefono &&
                          <a href={`tel:${contatto.telefono}`} className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors">
                            <Phone className="w-4 h-4" />
                            <span className="hidden lg:inline">{contatto.telefono}</span>
                          </a>
                        }
                        {contatto.link &&
                          <a href={contatto.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors">
                            <LinkIcon className="w-4 h-4" />
                          </a>
                        }
                      </div>

                      {/* Food Influencer Info */}
                      {contatto.categoria === 'Food influencers' &&
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          {contatto.followers &&
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Followers:</span>
                              <span className="font-bold text-purple-600">
                                {contatto.followers.toLocaleString()}
                              </span>
                            </div>
                          }
                          {(!contatto.visite_negozio || contatto.visite_negozio.length === 0) && !contatto.data_visita_negozio ? (
                            <span className="text-xs text-slate-500">❌ Mai visitato</span>
                          ) : (contatto.visite_negozio && contatto.visite_negozio.length > 0) ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-slate-500">Negozi:</span>
                              {(() => {
                                const negozioCount = {};
                                contatto.visite_negozio.filter(v => v.negozio).forEach(v => {
                                  negozioCount[v.negozio] = (negozioCount[v.negozio] || 0) + 1;
                                });
                                return Object.entries(negozioCount).map(([negozio, count], idx) => (
                                  <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                                    x{count} {negozio}
                                  </span>
                                ));
                              })()}
                              <span className="text-xs text-slate-500">
                                • Ultima: {new Date(Math.max(...contatto.visite_negozio.map(v => new Date(v.data)))).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                          ) : contatto.data_visita_negozio && (
                            <span className="text-xs text-slate-500">
                              ✓ {new Date(contatto.data_visita_negozio).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                      }

                      {/* Proposte */}
                      {contatto.proposte_commerciali && contatto.proposte_commerciali.length > 0 &&
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Proposte:</span>
                          <span className="font-bold text-green-600">{contatto.proposte_commerciali.length}</span>
                        </div>
                      }
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(contatto)}
                        className="p-2 rounded-lg hover:bg-blue-50 transition-colors">
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Eliminare ${contatto.nome} ${contatto.cognome}?`)) {
                            deleteMutation.mutate(contatto.id);
                          }
                        }}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
            )}
            </div>
          }
        </NeumorphicCard>

        {/* Form Modal */}
        {showForm &&
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <NeumorphicCard className="p-6 my-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">
                    {editingContatto ? 'Modifica Contatto' : 'Nuovo Contatto'}
                  </h2>
                  <button
                  onClick={resetForm}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors">

                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Categoria *
                    </label>
                    <select
                    required
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none">

                      <option value="Food influencers">👨‍🍳 Food influencers</option>
                      <option value="PR">📢 PR</option>
                      <option value="Adv">📺 Adv</option>
                      <option value="Partners">🤝 Partners</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Nome *
                      </label>
                      <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      placeholder="Mario" />

                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Cognome *
                      </label>
                      <input
                      type="text"
                      required
                      value={formData.cognome}
                      onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      placeholder="Rossi" />

                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Email
                    </label>
                    <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    placeholder="mario.rossi@example.com" />

                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Telefono
                    </label>
                    <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    placeholder="+39 333 1234567" />

                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Link (Social/Sito)
                    </label>
                    <input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    placeholder="https://instagram.com/username" />

                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Società
                    </label>
                    <input
                    type="text"
                    value={formData.societa}
                    onChange={(e) => setFormData({ ...formData, societa: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    placeholder="Nome società" />

                  </div>

                  {formData.categoria === 'Food influencers' &&
                <>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Numero Followers
                        </label>
                        <input
                      type="number"
                      value={formData.followers}
                      onChange={(e) => setFormData({ ...formData, followers: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      placeholder="es. 50000" />

                      </div>

                      <div className="border-t pt-4 mt-4">
                        <h3 className="text-sm font-bold text-slate-700 mb-4">Visite in Negozio</h3>

                        {/* Lista visite esistenti */}
                            {formData.visite_negozio.length > 0 &&
                          <div className="space-y-2 mb-4">
                                <p className="text-xs font-bold text-slate-700">Storico Visite ({formData.visite_negozio.length})</p>
                                {formData.visite_negozio
                                  .sort((a, b) => new Date(b.data) - new Date(a.data))
                                  .map((visita, idx) =>
                              <div key={idx} className="neumorphic-pressed p-3 rounded-xl flex items-center justify-between">
                                    <div>
                                      <p className="text-sm text-slate-700 font-medium">
                                        {new Date(visita.data).toLocaleDateString('it-IT', { 
                                          weekday: 'short', 
                                          day: '2-digit', 
                                          month: 'short', 
                                          year: 'numeric' 
                                        })}
                                      </p>
                                      {visita.negozio && (
                                        <p className="text-xs text-slate-500">{visita.negozio}</p>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleEditVisita(idx)}
                                        className="p-2 rounded-lg hover:bg-blue-50 transition-colors">
                                        <Edit className="w-4 h-4 text-blue-600" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRimuoviVisita(idx)}
                                        className="p-2 rounded-lg hover:bg-red-50 transition-colors">
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                      </button>
                                    </div>
                                  </div>
                              )}
                              </div>
                          }

                            {/* Form per nuova/modifica visita */}
                            <div className="space-y-3 neumorphic-pressed p-4 rounded-xl">
                              {editingVisitaIndex !== null && (
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-sm font-bold text-blue-600">Modifica Visita</p>
                                  <button
                                    type="button"
                                    onClick={handleCancelEditVisita}
                                    className="text-xs text-slate-500 hover:text-slate-700"
                                  >
                                    Annulla
                                  </button>
                                </div>
                              )}
                              <div>
                                <label className="text-sm font-medium text-slate-700 mb-2 block">
                                  Data Visita *
                                </label>
                                <input
                              type="date"
                              value={nuovaVisita.data}
                              onChange={(e) => setNuovaVisita({ ...nuovaVisita, data: e.target.value })}
                              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none" />

                              </div>

                              <div>
                                <label className="text-sm font-medium text-slate-700 mb-2 block">
                                  Negozio Visitato
                                </label>
                                <select
                                  value={nuovaVisita.negozio}
                                  onChange={(e) => setNuovaVisita({ ...nuovaVisita, negozio: e.target.value })}
                                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                                >
                                  <option value="">Seleziona negozio</option>
                                  {stores.map((store) => (
                                    <option key={store.id} value={store.name}>
                                      {store.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <NeumorphicButton
                              type="button"
                              onClick={handleAggiungiVisita}
                              className="w-full flex items-center justify-center gap-2"
                              disabled={!nuovaVisita.data}>

                                {editingVisitaIndex !== null ? (
                                  <>
                                    <Edit className="w-4 h-4" />
                                    Salva Modifica
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4" />
                                    Aggiungi Visita
                                  </>
                                )}
                              </NeumorphicButton>
                            </div>
                      </div>
                    </>
                }

                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">Proposte Commerciali</h3>
                    
                    {/* Lista proposte esistenti */}
                    {formData.proposte_commerciali.length > 0 &&
                  <div className="space-y-2 mb-4">
                        {formData.proposte_commerciali.map((proposta, idx) =>
                    <div key={idx} className="neumorphic-pressed p-3 rounded-xl flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-slate-700 font-medium mb-1">{proposta.descrizione}</p>
                              <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
                                <Euro className="w-3 h-3" />
                                {proposta.prezzo.toFixed(2)}
                              </div>
                            </div>
                            <button
                        type="button"
                        onClick={() => handleRimuoviProposta(idx)}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors">

                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                    )}
                      </div>
                  }

                    {/* Form per nuova proposta */}
                    <div className="space-y-3 neumorphic-pressed p-4 rounded-xl">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Descrizione
                        </label>
                        <textarea
                        value={nuovaProposta.descrizione}
                        onChange={(e) => setNuovaProposta({ ...nuovaProposta, descrizione: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none resize-none h-20"
                        placeholder="Descrizione della proposta..." />

                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Prezzo (€)
                        </label>
                        <input
                        type="number"
                        step="0.01"
                        value={nuovaProposta.prezzo}
                        onChange={(e) => setNuovaProposta({ ...nuovaProposta, prezzo: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                        placeholder="0.00" />

                      </div>

                      <NeumorphicButton
                      type="button"
                      onClick={handleAggiungiProposta}
                      className="w-full flex items-center justify-center gap-2"
                      disabled={!nuovaProposta.descrizione.trim()}>

                        <Plus className="w-4 h-4" />
                        Aggiungi Proposta
                      </NeumorphicButton>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Note
                    </label>
                    <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none resize-none h-20"
                    placeholder="Note aggiuntive..." />

                  </div>

                  <div className="flex gap-3 pt-4">
                    <NeumorphicButton type="button" onClick={resetForm} className="flex-1">
                      Annulla
                    </NeumorphicButton>
                    <NeumorphicButton
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    disabled={createMutation.isPending || updateMutation.isPending}>

                      {editingContatto ? 'Aggiorna' : 'Crea'}
                    </NeumorphicButton>
                  </div>
                </form>
              </NeumorphicCard>
            </div>
          </div>
        }
      </div>
    </ProtectedPage>);

}