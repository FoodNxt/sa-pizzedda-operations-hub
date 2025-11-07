import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Shield,
  Save,
  CheckCircle,
  X,
  AlertCircle
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function GestioneAccessoPagine() {
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [accessData, setAccessData] = useState({});
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users-dipendenti'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.user_type === 'dipendente');
    },
  });

  const { data: pageAccesses = [] } = useQuery({
    queryKey: ['page-accesses'],
    queryFn: () => base44.entities.PageAccess.list(),
  });

  const createAccessMutation = useMutation({
    mutationFn: (data) => base44.entities.PageAccess.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-accesses'] });
      setSuccess('Accessi salvati con successo!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError('Errore nel salvataggio: ' + err.message);
      setTimeout(() => setError(''), 5000);
    }
  });

  const updateAccessMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PageAccess.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-accesses'] });
      setSuccess('Accessi aggiornati con successo!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError('Errore nell\'aggiornamento: ' + err.message);
      setTimeout(() => setError(''), 5000);
    }
  });

  const pages = [
    { key: 'page_valutazione', label: 'La Tua Valutazione' },
    { key: 'page_profilo', label: 'Il Mio Profilo' },
    { key: 'page_pulizia_cassiere', label: 'Controllo Pulizia Cassiere' },
    { key: 'page_pulizia_pizzaiolo', label: 'Controllo Pulizia Pizzaiolo' },
    { key: 'page_pulizia_store_manager', label: 'Controllo Pulizia Store Manager' },
    { key: 'page_form_inventario', label: 'Form Inventario' },
    { key: 'page_conteggio_cassa', label: 'Conteggio Cassa' },
    { key: 'page_teglie_buttate', label: 'Teglie Buttate' },
    { key: 'page_preparazioni', label: 'Preparazioni' }
  ];

  const handleUserSelect = (user) => {
    setSelectedUserId(user.id);
    
    // Find existing access record for this user
    const existingAccess = pageAccesses.find(pa => pa.user_id === user.id);
    
    if (existingAccess) {
      setAccessData(existingAccess);
    } else {
      // Default: all pages enabled
      const defaultAccess = {
        user_id: user.id,
        user_email: user.email,
        user_name: user.nome_cognome || user.full_name
      };
      pages.forEach(page => {
        defaultAccess[page.key] = true;
      });
      setAccessData(defaultAccess);
    }
  };

  const toggleAccess = (pageKey) => {
    setAccessData(prev => ({
      ...prev,
      [pageKey]: !prev[pageKey]
    }));
  };

  const handleSave = async () => {
    if (!selectedUserId) {
      alert('Seleziona un utente');
      return;
    }

    const existingAccess = pageAccesses.find(pa => pa.user_id === selectedUserId);

    if (existingAccess) {
      // Update
      await updateAccessMutation.mutateAsync({ id: existingAccess.id, data: accessData });
    } else {
      // Create
      await createAccessMutation.mutateAsync(accessData);
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Shield className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Gestione Accesso Pagine</h1>
        </div>
        <p className="text-[#9b9b9b]">Controlla quali pagine i dipendenti possono visualizzare</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <NeumorphicCard className="p-4 bg-green-50 border-2 border-green-400">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800 font-medium">{success}</p>
          </div>
        </NeumorphicCard>
      )}

      {error && (
        <NeumorphicCard className="p-4 bg-red-50 border-2 border-red-400">
          <div className="flex items-center gap-3">
            <X className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        </NeumorphicCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <NeumorphicCard className="p-6 lg:col-span-1">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Dipendenti
          </h2>

          {usersLoading ? (
            <div className="text-center py-8">
              <p className="text-[#9b9b9b]">Caricamento...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#9b9b9b]">Nessun dipendente trovato</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    selectedUserId === user.id
                      ? 'neumorphic-pressed border-2 border-[#8b7355]'
                      : 'neumorphic-flat hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full neumorphic-flat flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-[#8b7355]">
                        {(user.nome_cognome || user.full_name || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#6b6b6b] truncate">
                        {user.nome_cognome || user.full_name}
                      </p>
                      <p className="text-xs text-[#9b9b9b] truncate">{user.email}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </NeumorphicCard>

        {/* Access Control */}
        <NeumorphicCard className="p-6 lg:col-span-2">
          {!selectedUser ? (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">Seleziona un Dipendente</h3>
              <p className="text-[#9b9b9b]">Scegli un dipendente dalla lista per gestire i suoi accessi</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-[#6b6b6b] mb-2">
                  Accessi per: {selectedUser.nome_cognome || selectedUser.full_name}
                </h2>
                <p className="text-sm text-[#9b9b9b]">{selectedUser.email}</p>
              </div>

              <div className="space-y-3 mb-6">
                {pages.map(page => (
                  <div key={page.key} className="neumorphic-pressed p-4 rounded-xl">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={accessData[page.key] !== false}
                        onChange={() => toggleAccess(page.key)}
                        className="w-5 h-5 rounded"
                      />
                      <span className="flex-1 font-medium text-[#6b6b6b]">{page.label}</span>
                      {accessData[page.key] !== false ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <X className="w-5 h-5 text-red-600" />
                      )}
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <NeumorphicButton
                  onClick={() => {
                    setSelectedUserId(null);
                    setAccessData({});
                  }}
                  className="flex-1"
                >
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton
                  onClick={handleSave}
                  variant="primary"
                  className="flex-1 flex items-center justify-center gap-2"
                  disabled={createAccessMutation.isPending || updateAccessMutation.isPending}
                >
                  {createAccessMutation.isPending || updateAccessMutation.isPending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Salva Accessi
                    </>
                  )}
                </NeumorphicButton>
              </div>
            </>
          )}
        </NeumorphicCard>
      </div>

      {/* Info Box */}
      <NeumorphicCard className="p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">ℹ️ Come funziona</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>Per default, tutti i dipendenti hanno accesso a tutte le pagine</li>
              <li>Disabilita le checkbox per rimuovere l'accesso a specifiche pagine</li>
              <li>Le restrizioni si applicano solo alla navigazione - i dipendenti non vedranno le pagine nel menu</li>
              <li>Gli <strong>admin</strong> e i <strong>manager</strong> non sono soggetti a queste restrizioni</li>
              <li>Le modifiche sono immediate dopo il salvataggio</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}