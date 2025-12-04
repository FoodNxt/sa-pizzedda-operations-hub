import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  GraduationCap,
  Clock,
  AlertTriangle,
  ArrowRight,
  MapPin,
  User,
  Store,
  Save,
  Loader2,
  Check,
  X
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function HRAdmin() {
  const [activeTab, setActiveTab] = useState('tools');
  const [editingUserId, setEditingUserId] = useState(null);
  const [selectedStores, setSelectedStores] = useState([]);
  const [storePrincipale, setStorePrincipale] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(null);

  const queryClient = useQueryClient();

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users-dipendenti'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.user_type === 'user' || u.user_type === 'dipendente');
    },
    enabled: activeTab === 'stores'
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
    enabled: activeTab === 'stores'
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, assignedStores, storePrincipaleId }) => {
      await base44.entities.User.update(userId, { 
        assigned_stores: assignedStores,
        store_principale_id: storePrincipaleId 
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users-dipendenti'] });
      setSaveSuccess(variables.userId);
      setEditingUserId(null);
      setStorePrincipale('');
      setTimeout(() => setSaveSuccess(null), 2000);
    }
  });

  const handleEditUser = (user) => {
    setEditingUserId(user.id);
    setSelectedStores(user.assigned_stores || []);
    setStorePrincipale(user.store_principale_id || '');
  };

  const handleToggleStore = (storeId) => {
    setSelectedStores(prev => 
      prev.includes(storeId) 
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    );
  };

  const handleSave = (userId) => {
    updateUserMutation.mutate({ userId, assignedStores: selectedStores, storePrincipaleId: storePrincipale });
  };

  const handleCancel = () => {
    setEditingUserId(null);
    setSelectedStores([]);
    setStorePrincipale('');
  };

  const adminTools = [

    {
      title: "Ricalcola Ritardi Turni",
      description: "Ricalcola i ritardi e le timbrature mancanti per tutti i turni",
      url: createPageUrl("RecalculateShifts"),
      icon: Clock,
      color: "text-blue-600"
    },
    {
      title: "Elimina Turni Duplicati",
      description: "Pulisci il database eliminando turni duplicati",
      url: createPageUrl("CleanupDuplicateShifts"),
      icon: AlertTriangle,
      color: "text-orange-600"
    }
  ];

  const tabs = [
    { id: 'tools', label: 'Strumenti', icon: Settings },
    { id: 'stores', label: 'Assegnazione Locali', icon: MapPin }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Settings className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">HR Admin</h1>
        </div>
        <p className="text-[#9b9b9b]">Strumenti amministrativi per la gestione delle risorse umane</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'neumorphic-flat text-[#6b6b6b] hover:shadow-md'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'tools' && (
        <>
          {/* Info Card */}
          <NeumorphicCard className="p-6 bg-blue-50">
            <div className="flex items-start gap-3">
              <Settings className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-blue-800 mb-2">🛠️ Strumenti Amministrativi HR</h3>
                <p className="text-sm text-blue-700">
                  Questa sezione raccoglie tutti gli strumenti amministrativi per la gestione del personale, 
                  inclusi formazione, manutenzione dati turni e configurazioni avanzate.
                </p>
              </div>
            </div>
          </NeumorphicCard>

          {/* Admin Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminTools.map((tool, idx) => (
              <Link key={idx} to={tool.url}>
                <NeumorphicCard className="p-6 hover:shadow-xl transition-all duration-300 h-full cursor-pointer group">
                  <div className="flex flex-col h-full">
                    <div className="neumorphic-flat w-16 h-16 rounded-full mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <tool.icon className={`w-8 h-8 ${tool.color}`} />
                    </div>
                    <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">{tool.title}</h3>
                    <p className="text-sm text-[#9b9b9b] mb-4 flex-grow">{tool.description}</p>
                    <div className="flex items-center gap-2 text-[#8b7355] font-medium text-sm group-hover:gap-3 transition-all">
                      <span>Apri</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </NeumorphicCard>
              </Link>
            ))}
          </div>

          {/* Quick Stats */}
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">📊 Riepilogo Rapido</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-[#9b9b9b]">Academy</p>
                    <p className="text-lg font-bold text-[#6b6b6b]">Gestione Corsi</p>
                  </div>
                </div>
              </div>
              <div className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-[#9b9b9b]">Turni</p>
                    <p className="text-lg font-bold text-[#6b6b6b]">Manutenzione Dati</p>
                  </div>
                </div>
              </div>
              <div className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-[#9b9b9b]">Pulizia</p>
                    <p className="text-lg font-bold text-[#6b6b6b]">Database Turni</p>
                  </div>
                </div>
              </div>
            </div>
          </NeumorphicCard>
        </>
      )}

      {activeTab === 'stores' && (
        <>
          {/* Info Card */}
          <NeumorphicCard className="p-6 bg-green-50">
            <div className="flex items-start gap-3">
              <MapPin className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-green-800 mb-2">📍 Assegnazione Locali ai Dipendenti</h3>
                <p className="text-sm text-green-700 mb-2">
                  Assegna i locali a ciascun dipendente. I dipendenti vedranno solo i locali assegnati nei form di compilazione.
                </p>
                <p className="text-sm text-green-700">
                  <strong>Locale Principale (⭐):</strong> Il locale principale viene usato come default nei form e nella pianificazione.
                  Un dipendente può essere assegnato a più locali ma avere un solo locale principale.
                </p>
              </div>
            </div>
          </NeumorphicCard>

          {/* Stores Legend */}
          <NeumorphicCard className="p-4">
            <h3 className="text-sm font-bold text-[#6b6b6b] mb-3">Locali Disponibili:</h3>
            <div className="flex flex-wrap gap-2">
              {stores.map(store => (
                <div key={store.id} className="neumorphic-flat px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#8b7355]" />
                  <span className="text-sm text-[#6b6b6b]">{store.name}</span>
                </div>
              ))}
            </div>
          </NeumorphicCard>

          {/* Users List */}
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">👥 Dipendenti</h2>

            {usersLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-[#8b7355] animate-spin mx-auto mb-4" />
                <p className="text-[#9b9b9b]">Caricamento dipendenti...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-16 h-16 text-[#9b9b9b] opacity-50 mx-auto mb-4" />
                <p className="text-[#9b9b9b]">Nessun dipendente trovato</p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map(user => (
                  <div key={user.id} className="neumorphic-flat p-4 rounded-xl">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          <span className="text-white font-bold">
                            {(user.nome_cognome || user.full_name || user.email || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-bold text-[#6b6b6b]">
                            {user.nome_cognome || user.full_name || user.email}
                          </h3>
                          <p className="text-xs text-[#9b9b9b]">{user.email}</p>
                          {user.ruoli_dipendente && user.ruoli_dipendente.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {user.ruoli_dipendente.map(ruolo => (
                                <span key={ruolo} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                  {ruolo}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {editingUserId === user.id ? (
                        <div className="flex-1 lg:max-w-xl">
                          <p className="text-sm font-medium text-[#6b6b6b] mb-2">Seleziona locali:</p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {stores.map(store => (
                              <button
                                key={store.id}
                                type="button"
                                onClick={() => handleToggleStore(store.id)}
                                className={`px-3 py-2 rounded-lg font-medium transition-all text-sm flex items-center gap-1 ${
                                  selectedStores.includes(store.id)
                                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
                                    : 'neumorphic-pressed text-[#6b6b6b] hover:shadow-md'
                                }`}
                              >
                                {selectedStores.includes(store.id) && <Check className="w-3 h-3" />}
                                {store.name}
                              </button>
                            ))}
                          </div>
                          <div className="mb-3">
                            <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Locale Principale:</label>
                            <select
                              value={storePrincipale}
                              onChange={(e) => setStorePrincipale(e.target.value)}
                              className="w-full neumorphic-pressed px-4 py-2 rounded-xl text-sm outline-none"
                            >
                              <option value="">Nessun locale principale</option>
                              {stores
                                .filter(s => selectedStores.includes(s.id))
                                .map(store => (
                                  <option key={store.id} value={store.id}>{store.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-1">
                              Il locale principale viene usato come default nei form e nella pianificazione
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSave(user.id)}
                              disabled={updateUserMutation.isPending}
                              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium flex items-center gap-2 hover:shadow-lg transition-all"
                            >
                              {updateUserMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              Salva
                            </button>
                            <button
                              onClick={handleCancel}
                              className="px-4 py-2 rounded-lg neumorphic-flat text-[#6b6b6b] font-medium flex items-center gap-2 hover:shadow-md transition-all"
                            >
                              <X className="w-4 h-4" />
                              Annulla
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-1">
                              {user.assigned_stores && user.assigned_stores.length > 0 ? (
                                user.assigned_stores.map(storeId => {
                                  const store = stores.find(s => s.id === storeId);
                                  const isPrincipale = user.store_principale_id === storeId;
                                  return store ? (
                                    <span key={storeId} className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                                      isPrincipale 
                                        ? 'bg-blue-200 text-blue-800 font-bold border-2 border-blue-400'
                                        : 'bg-green-100 text-green-700'
                                    }`}>
                                      <Store className="w-3 h-3" />
                                      {store.name}
                                      {isPrincipale && ' ⭐'}
                                    </span>
                                  ) : null;
                                })
                              ) : (
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                                  ⚠️ Nessun locale assegnato
                                </span>
                              )}
                            </div>
                            {user.store_principale_id && (
                              <p className="text-xs text-slate-500">
                                Principale: {stores.find(s => s.id === user.store_principale_id)?.name}
                              </p>
                            )}
                          </div>
                          
                          {saveSuccess === user.id ? (
                            <span className="text-green-600 flex items-center gap-1 text-sm">
                              <Check className="w-4 h-4" /> Salvato!
                            </span>
                          ) : (
                            <button
                              onClick={() => handleEditUser(user)}
                              className="px-3 py-2 rounded-lg neumorphic-flat text-[#8b7355] font-medium text-sm hover:shadow-md transition-all"
                            >
                              Modifica
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </NeumorphicCard>
        </>
      )}
    </div>
  );
}