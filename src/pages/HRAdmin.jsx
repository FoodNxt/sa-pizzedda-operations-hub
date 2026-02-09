import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  User,
  Store,
  Save,
  Loader2,
  Check,
  X,
  Crown,
  Navigation,
  Settings,
  Clock,
  Map,
  TrendingUp } from
'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function HRAdmin() {
  const [editingUserId, setEditingUserId] = useState(null);
  const [selectedStores, setSelectedStores] = useState([]);
  const [primaryStores, setPrimaryStores] = useState([]);
  const [saveSuccess, setSaveSuccess] = useState(null);

  // Store Manager per locale
  const [storeManagers, setStoreManagers] = useState({});

  // GPS Config
  const [geocodingStore, setGeocodingStore] = useState(null);
  const [gpsLocations, setGpsLocations] = useState({});
  const [editingGps, setEditingGps] = useState(null);
  const [showMapModal, setShowMapModal] = useState(null);
  const [tempMapPosition, setTempMapPosition] = useState(null);

  const queryClient = useQueryClient();

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users-dipendenti'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter((u) => u.user_type === 'user' || u.user_type === 'dipendente');
    }
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: timbraturaConfigs = [] } = useQuery({
    queryKey: ['timbratura-config'],
    queryFn: () => base44.entities.TimbraturaConfig.list()
  });

  const { data: targets = [] } = useQuery({
    queryKey: ['targets'],
    queryFn: () => base44.entities.Target.list()
  });

  // Inizializza storeManagers e GPS quando i dati sono caricati
  React.useEffect(() => {
    if (stores.length > 0) {
      const managers = {};
      const gps = {};
      stores.forEach((store) => {
        managers[store.id] = store.store_manager_id || '';
        if (store.latitude && store.longitude) {
          gps[store.id] = {
            latitude: store.latitude,
            longitude: store.longitude
          };
        }
      });
      setStoreManagers(managers);
      setGpsLocations(gps);
    }
  }, [stores]);

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, assignedStores, primaryStoresIds }) => {
      await base44.entities.User.update(userId, {
        assigned_stores: assignedStores,
        primary_stores: primaryStoresIds
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users-dipendenti'] });
      setSaveSuccess(variables.userId);
      setEditingUserId(null);
      setPrimaryStores([]);
      setTimeout(() => setSaveSuccess(null), 2000);
    }
  });

  const updateStoreMutation = useMutation({
    mutationFn: async ({ storeId, storeManagerId }) => {
      await base44.entities.Store.update(storeId, {
        store_manager_id: storeManagerId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    }
  });

  const handleEditUser = (user) => {
    setEditingUserId(user.id);
    setSelectedStores(user.assigned_stores || []);
    setPrimaryStores(user.primary_stores || []);
  };

  const handleToggleStore = (storeId) => {
    setSelectedStores((prev) =>
    prev.includes(storeId) ?
    prev.filter((id) => id !== storeId) :
    [...prev, storeId]
    );
  };

  const handleSave = (userId) => {
    updateUserMutation.mutate({ userId, assignedStores: selectedStores, primaryStoresIds: primaryStores });
  };

  const handleCancel = () => {
    setEditingUserId(null);
    setSelectedStores([]);
    setPrimaryStores([]);
  };

  const handleTogglePrimaryStore = (storeId) => {
    setPrimaryStores((prev) =>
    prev.includes(storeId) ?
    prev.filter((id) => id !== storeId) :
    [...prev, storeId]
    );
  };

  const handleStoreManagerChange = (storeId, userId) => {
    setStoreManagers((prev) => ({ ...prev, [storeId]: userId }));
    updateStoreMutation.mutate({ storeId, storeManagerId: userId || null });
  };

  const geocodeAddress = async (storeId) => {
    const store = stores.find((s) => s.id === storeId);
    if (!store?.address) {
      alert('⚠️ Indirizzo non disponibile per questo store');
      return;
    }

    setGeocodingStore(storeId);
    try {
      const address = `${store.address}${store.city ? ', ' + store.city : ''}`;
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
      const data = await response.json();

      if (data.length > 0) {
        const { lat, lon } = data[0];
        await saveGpsLocationMutation.mutateAsync({
          storeId,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon)
        });
        alert(`✅ GPS calcolato da indirizzo: ${lat}, ${lon}`);
      } else {
        alert('❌ Impossibile trovare coordinate per questo indirizzo');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('❌ Errore nel calcolo GPS');
    } finally {
      setGeocodingStore(null);
    }
  };

  const saveGpsLocationMutation = useMutation({
    mutationFn: async ({ storeId, latitude, longitude }) => {
      return await base44.entities.Store.update(storeId, {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      });
    },
    onSuccess: async (data, variables) => {
      // Aggiorna stato locale
      setGpsLocations((prev) => ({
        ...prev,
        [variables.storeId]: {
          latitude: parseFloat(variables.latitude),
          longitude: parseFloat(variables.longitude)
        }
      }));

      // Ricarica stores
      await queryClient.invalidateQueries({ queryKey: ['stores'] });
    }
  });

  // Filtra utenti che sono Store Manager
  const storeManagerUsers = users.filter((u) =>
  u.ruoli_dipendente?.includes('Store Manager')
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <MapPin className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold" style={{ color: '#000000' }}>Assegnazione Locali</h1>
        </div>
        <p style={{ color: '#000000' }}>Gestisci l'assegnazione dei dipendenti ai locali</p>
      </div>

      {/* Posizione GPS Locali */}
      <NeumorphicCard className="p-6 bg-blue-50">
        <div className="flex items-start gap-3 mb-4">
          <MapPin className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-blue-800 mb-2">📍 Posizione GPS Locali</h3>
            <p className="text-sm text-blue-700">
              Configura le coordinate GPS per la verifica timbratura. Clicca su <Navigation className="w-3 h-3 inline" /> per calcolare automaticamente da indirizzo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stores.map((store) => {
            const gps = gpsLocations[store.id];
            const isEditing = editingGps === store.id;
            const isGeocoding = geocodingStore === store.id;

            return (
              <div key={store.id} className="neumorphic-flat p-4 rounded-xl bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 mb-1">{store.name}</h3>
                    {store.address &&
                    <p className="text-xs text-slate-500 mb-2">{store.address}{store.city ? `, ${store.city}` : ''}</p>
                    }
                    {isEditing ?
                    <div className="space-y-2">
                        <input
                        type="number"
                        step="any"
                        placeholder="Latitudine"
                        defaultValue={gps?.latitude || ''}
                        id={`lat-${store.id}`}
                        className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-sm" />

                        <input
                        type="number"
                        step="any"
                        placeholder="Longitudine"
                        defaultValue={gps?.longitude || ''}
                        id={`lon-${store.id}`}
                        className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-sm" />

                        <div className="flex gap-2">
                          <button
                          onClick={() => {
                            const lat = parseFloat(document.getElementById(`lat-${store.id}`).value);
                            const lon = parseFloat(document.getElementById(`lon-${store.id}`).value);
                            saveGpsLocationMutation.mutate({ storeId: store.id, latitude: lat, longitude: lon });
                          }}
                          className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs">

                            Salva
                          </button>
                          <button
                          onClick={() => setEditingGps(null)}
                          className="px-3 py-1 bg-slate-300 text-slate-700 rounded-lg text-xs">

                            Annulla
                          </button>
                        </div>
                      </div> :

                    <>
                        {gps ?
                      <p className="text-sm text-slate-600">
                            📍 {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}
                          </p> :

                      <p className="text-sm text-red-600">⚠️ GPS non configurato</p>
                      }
                      </>
                    }
                  </div>
                  <div className="flex gap-2">
                    {!isEditing &&
                    <>
                       <button
                        onClick={() => {
                          const currentGps = gpsLocations[store.id];
                          setTempMapPosition(currentGps || null);
                          setShowMapModal(store);
                        }}
                        className="text-green-600 hover:text-green-800"
                        title="Apri mappa">

                         <Map className="w-4 h-4" />
                       </button>
                        <button
                        onClick={() => geocodeAddress(store.id)}
                        disabled={isGeocoding}
                        className="text-purple-600 hover:text-purple-800 disabled:opacity-50"
                        title="Calcola GPS da indirizzo">

                          {isGeocoding ?
                        <Loader2 className="w-4 h-4 animate-spin" /> :

                        <Navigation className="w-4 h-4" />
                        }
                        </button>
                        <button
                        onClick={() => setEditingGps(store.id)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Modifica manualmente">

                          <Settings className="w-4 h-4" />
                        </button>
                      </>
                    }
                  </div>
                </div>
              </div>);

          })}
        </div>
      </NeumorphicCard>

      {/* Target Store Manager */}
      {storeManagerUsers.length > 0 && (
        <NeumorphicCard className="p-6 bg-amber-50">
          <div className="flex items-start gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-amber-800 mb-2">📊 Target Store Manager</h3>
              <p className="text-sm text-amber-700">
                Visualizza i target assegnati a ciascun Store Manager.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {storeManagerUsers.map((manager) => {
              const managerStores = stores.filter((s) => s.store_manager_id === manager.id);
              const managerTargets = targets.filter((t) => 
                t.store_id === 'all' || managerStores.some(s => s.id === t.store_id)
              );

              return (
                <div key={manager.id} className="neumorphic-flat p-4 rounded-xl bg-white">
                  <h4 className="font-bold text-slate-800 mb-2">
                    {manager.nome_cognome || manager.full_name}
                  </h4>
                  
                  {managerStores.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-slate-600 mb-1">Locali assegnati:</p>
                      <div className="flex flex-wrap gap-1">
                        {managerStores.map((store) => (
                          <span key={store.id} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {store.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {managerTargets.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-2">Target attivi:</p>
                      <div className="space-y-1">
                        {managerTargets.slice(0, 3).map((target) => (
                          <div key={target.id} className="text-xs bg-amber-50 border border-amber-200 p-2 rounded">
                            <p className="font-medium text-amber-900">{target.name}</p>
                            <p className="text-amber-700">€{(target.target_revenue || 0).toLocaleString('it-IT')}</p>
                          </div>
                        ))}
                        {managerTargets.length > 3 && (
                          <p className="text-xs text-slate-500 italic">+{managerTargets.length - 3} altri...</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Nessun target assegnato</p>
                  )}
                </div>
              );
            })}
          </div>
        </NeumorphicCard>
      )}

      {/* Store Manager per Locale */}
      <NeumorphicCard className="p-6 bg-purple-50">
        <div className="flex items-start gap-3 mb-4">
          <Crown className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-purple-800 mb-2">👑 Store Manager per Locale</h3>
            <p className="text-sm text-purple-700">
              Assegna uno Store Manager a ciascun locale. Ogni locale può avere un solo Store Manager.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) =>
          <div key={store.id} className="neumorphic-flat p-4 rounded-xl bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Store className="w-5 h-5 text-[#8b7355]" />
                <span className="font-bold text-[#6b6b6b]">{store.name}</span>
              </div>
              <select
              value={storeManagers[store.id] || ''}
              onChange={(e) => handleStoreManagerChange(store.id, e.target.value)}
              className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-sm outline-none">

                <option value="">-- Nessuno --</option>
                {storeManagerUsers.map((user) =>
              <option key={user.id} value={user.id}>
                    {user.nome_cognome || user.full_name || user.email}
                  </option>
              )}
              </select>
              {storeManagers[store.id] &&
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Store Manager assegnato
                </p>
            }
            </div>
          )}
        </div>
      </NeumorphicCard>

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
            <strong>Locali Principali (⭐):</strong> I locali principali vengono usati come default nei form e nella pianificazione. Un dipendente può avere più locali principali.
            </p>
          </div>
        </div>
      </NeumorphicCard>

      {/* Stores Legend */}
      <NeumorphicCard className="p-4">
        <h3 className="text-sm font-bold text-[#6b6b6b] mb-3">Locali Disponibili:</h3>
        <div className="flex flex-wrap gap-2">
          {stores.map((store) =>
          <div key={store.id} className="neumorphic-flat px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Store className="w-4 h-4 text-[#8b7355]" />
              <span className="text-sm text-[#6b6b6b]">{store.name}</span>
            </div>
          )}
        </div>
      </NeumorphicCard>

      {/* Users List */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">👥 Dipendenti</h2>

        {usersLoading ?
        <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-[#8b7355] animate-spin mx-auto mb-4" />
            <p className="text-[#9b9b9b]">Caricamento dipendenti...</p>
          </div> :
        users.length === 0 ?
        <div className="text-center py-12">
            <User className="w-16 h-16 text-[#9b9b9b] opacity-50 mx-auto mb-4" />
            <p className="text-[#9b9b9b]">Nessun dipendente trovato</p>
          </div> :

        <div className="space-y-4">
            {users.map((user) =>
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
                      {user.ruoli_dipendente && user.ruoli_dipendente.length > 0 &&
                  <div className="flex gap-1 mt-1">
                          {user.ruoli_dipendente.map((ruolo) =>
                    <span key={ruolo} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                              {ruolo}
                            </span>
                    )}
                        </div>
                  }
                    </div>
                  </div>

                  {editingUserId === user.id ?
              <div className="flex-1 lg:max-w-xl">
                      <p className="text-sm font-medium text-[#6b6b6b] mb-2">Seleziona locali:</p>
                      <div className="mb-3">
                            <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Locali Principali (⭐):</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {stores.map((store) =>
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => handleTogglePrimaryStore(store.id)}
                      className={`px-3 py-2 rounded-lg font-medium transition-all text-sm flex items-center gap-1 ${
                      primaryStores.includes(store.id) ?
                      'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md' :
                      'neumorphic-pressed text-[#6b6b6b] hover:shadow-md'}`
                      }>

                                  {primaryStores.includes(store.id) && <span>⭐</span>}
                                  {store.name}
                                </button>
                    )}
                            </div>
                            <p className="text-xs text-slate-500">
                              I locali principali vengono usati come default nei form
                            </p>
                          </div>
                          <div className="mb-3">
                            <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Locali Abilitati:</label>
                            <div className="flex flex-wrap gap-2">
                              {stores.map((store) =>
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => handleToggleStore(store.id)}
                      className={`px-3 py-2 rounded-lg font-medium transition-all text-sm flex items-center gap-1 ${
                      selectedStores.includes(store.id) ?
                      'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md' :
                      'neumorphic-pressed text-[#6b6b6b] hover:shadow-md'}`
                      }>

                                  {selectedStores.includes(store.id) && <Check className="w-3 h-3" />}
                                  {store.name}
                                </button>
                    )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Locali in cui il dipendente può lavorare
                            </p>
                          </div>
                      <div className="flex gap-2">
                        <button
                    onClick={() => handleSave(user.id)}
                    disabled={updateUserMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium flex items-center gap-2 hover:shadow-lg transition-all">

                          {updateUserMutation.isPending ?
                    <Loader2 className="w-4 h-4 animate-spin" /> :

                    <Save className="w-4 h-4" />
                    }
                          Salva
                        </button>
                        <button
                    onClick={handleCancel}
                    className="px-4 py-2 rounded-lg neumorphic-flat text-[#6b6b6b] font-medium flex items-center gap-2 hover:shadow-md transition-all">

                          <X className="w-4 h-4" />
                          Annulla
                        </button>
                      </div>
                    </div> :

              <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-1">
                          {user.assigned_stores && user.assigned_stores.length > 0 ?
                    user.assigned_stores.map((storeId) => {
                      const store = stores.find((s) => s.id === storeId);
                      const isPrincipale = (user.primary_stores || []).includes(storeId);
                      return store ?
                      <span key={storeId} className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                      isPrincipale ?
                      'bg-blue-200 text-blue-800 font-bold border-2 border-blue-400' :
                      'bg-green-100 text-green-700'}`
                      }>
                                  <Store className="w-3 h-3" />
                                  {store.name}
                                  {isPrincipale && ' ⭐'}
                                </span> :
                      null;
                    }) :

                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                              ⚠️ Nessun locale assegnato
                            </span>
                    }
                        </div>
                        {user.primary_stores && user.primary_stores.length > 0 &&
                  <p className="text-xs text-slate-500">
                            Principali: {user.primary_stores.map((id) => stores.find((s) => s.id === id)?.name).filter(Boolean).join(', ')}
                          </p>
                  }
                      </div>
                      
                      {saveSuccess === user.id ?
                <span className="text-green-600 flex items-center gap-1 text-sm">
                          <Check className="w-4 h-4" /> Salvato!
                        </span> :

                <button
                  onClick={() => handleEditUser(user)}
                  className="px-3 py-2 rounded-lg neumorphic-flat text-[#8b7355] font-medium text-sm hover:shadow-md transition-all">

                          Modifica
                        </button>
                }
                    </div>
              }
                </div>
              </div>
          )}
          </div>
        }
      </NeumorphicCard>

      {/* Map Modal */}
      {showMapModal &&
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="p-6 max-w-4xl w-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{showMapModal.name}</h2>
                <p className="text-sm text-slate-500">Clicca sulla mappa per posizionare il marker</p>
              </div>
              <button onClick={() => setShowMapModal(null)} className="nav-button p-2 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="h-[500px] rounded-xl overflow-hidden mb-4">
              <MapSelector
              initialPosition={
              gpsLocations[showMapModal.id] ?
              [gpsLocations[showMapModal.id].latitude, gpsLocations[showMapModal.id].longitude] :
              [45.4642, 9.1900]
              }
              onPositionChange={(lat, lng) => {
                const newPosition = { latitude: lat, longitude: lng };
                console.log('🗺️ POSITION CHANGED:', newPosition);
                setTempMapPosition(newPosition);
              }} />

            </div>
            
            {tempMapPosition &&
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  📍 Nuova posizione: {tempMapPosition.latitude.toFixed(6)}, {tempMapPosition.longitude.toFixed(6)}
                </p>
              </div>
          }

            <div className="flex gap-3">
              <NeumorphicButton
              onClick={() => {
                setShowMapModal(null);
                setTempMapPosition(null);
              }}
              className="flex-1">

                Annulla
              </NeumorphicButton>
              <NeumorphicButton
              onClick={async () => {
                if (!tempMapPosition) {
                  alert('⚠️ Clicca sulla mappa per selezionare una posizione');
                  return;
                }

                try {
                  await saveGpsLocationMutation.mutateAsync({
                    storeId: showMapModal.id,
                    latitude: tempMapPosition.latitude,
                    longitude: tempMapPosition.longitude
                  });

                  // Chiudi modal DOPO il salvataggio
                  setShowMapModal(null);
                  setTempMapPosition(null);
                  alert('✅ Posizione salvata!');
                } catch (error) {
                  alert('❌ Errore: ' + error.message);
                }
              }}
              variant="primary"
              className="flex-1 flex items-center justify-center gap-2"
              disabled={saveGpsLocationMutation.isPending || !tempMapPosition}>

                {saveGpsLocationMutation.isPending ?
              <Loader2 className="w-4 h-4 animate-spin" /> :

              <Save className="w-4 h-4" />
              }
                Salva Posizione
              </NeumorphicButton>
            </div>
          </NeumorphicCard>
        </div>
      }
    </div>);

}

function MapSelector({ initialPosition, onPositionChange }) {
  const [position, setPosition] = useState(initialPosition);
  const isInitialMount = React.useRef(true);

  useEffect(() => {
    // Solo al primo mount, non quando initialPosition cambia
    if (isInitialMount.current) {
      console.log('🎯 MapSelector INITIAL MOUNT - setting position:', initialPosition);
      setPosition(initialPosition);
      isInitialMount.current = false;
    }
  }, []);

  function DraggableMarker() {
    const markerRef = React.useRef(null);

    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        const newPos = [lat, lng];
        console.log('🖱️ Map clicked at:', lat, lng);
        console.log('📍 Setting position to:', newPos);
        setPosition(newPos);
        onPositionChange(lat, lng);

        // Force marker update
        if (markerRef.current) {
          markerRef.current.setLatLng(newPos);
        }
      }
    });

    useEffect(() => {
      console.log('📌 Marker rendering at:', position);
      if (markerRef.current && position) {
        markerRef.current.setLatLng(position);
      }
    }, [position]);

    return position ?
    <Marker
      ref={markerRef}
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const newPos = marker.getLatLng();
          const newPosArray = [newPos.lat, newPos.lng];
          console.log('🎯 Marker dragged to:', newPosArray);
          setPosition(newPosArray);
          onPositionChange(newPos.lat, newPos.lng);
        }
      }} /> :

    null;
  }

  return (
    <MapContainer
      center={initialPosition}
      zoom={15}
      style={{ height: '100%', width: '100%' }}>

      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <DraggableMarker />
    </MapContainer>);

}