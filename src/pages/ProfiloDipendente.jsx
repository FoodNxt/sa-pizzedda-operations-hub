import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Mail,
  Save,
  AlertCircle,
  CheckCircle,
  Edit
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";

export default function ProfiloDipendente() {
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const queryClient = useQueryClient();

  // Fetch current user
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const u = await base44.auth.me();
      // Pre-populate form
      if (u.full_name && u.full_name.includes(' ')) {
        const parts = u.full_name.split(' ');
        setFirstName(parts[0]);
        setLastName(parts.slice(1).join(' '));
      }
      return u;
    },
  });

  // Update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.auth.updateMe(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setSuccess('Profilo aggiornato con successo! ✅');
      setError('');
      setEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError('Errore durante l\'aggiornamento. Riprova.');
      setSuccess('');
    }
  });

  const handleSave = async () => {
    setError('');
    setSuccess('');

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setError('Nome e cognome sono obbligatori');
      return;
    }

    if (firstName.trim().length < 2) {
      setError('Il nome deve avere almeno 2 caratteri');
      return;
    }

    if (lastName.trim().length < 2) {
      setError('Il cognome deve avere almeno 2 caratteri');
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    await updateProfileMutation.mutateAsync({
      full_name: fullName,
      profile_manually_completed: true
    });
  };

  const handleCancel = () => {
    // Reset to current values
    if (user?.full_name && user.full_name.includes(' ')) {
      const parts = user.full_name.split(' ');
      setFirstName(parts[0]);
      setLastName(parts.slice(1).join(' '));
    }
    setEditing(false);
    setError('');
    setSuccess('');
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center">
        <NeumorphicCard className="p-8">
          <p className="text-[#9b9b9b]">Caricamento...</p>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Il Mio Profilo</h1>
        <p className="text-[#9b9b9b]">Gestisci le tue informazioni personali</p>
      </div>

      {/* Success Message */}
      {success && (
        <NeumorphicCard className="p-4 bg-green-50 border-2 border-green-400">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800 font-medium">{success}</p>
          </div>
        </NeumorphicCard>
      )}

      {/* Profile Card */}
      <NeumorphicCard className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full neumorphic-flat flex items-center justify-center">
              <User className="w-10 h-10 text-[#8b7355]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#6b6b6b]">{user?.full_name || 'N/A'}</h2>
              <p className="text-[#9b9b9b]">{user?.user_type === 'admin' ? 'Amministratore' : user?.user_type === 'manager' ? 'Manager' : 'Dipendente'}</p>
            </div>
          </div>

          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="neumorphic-flat px-4 py-2 rounded-xl text-[#8b7355] hover:text-[#6b6b6b] transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Modifica
            </button>
          )}
        </div>

        {/* Email (Read-only) */}
        <div className="mb-6">
          <label className="text-sm font-medium text-[#9b9b9b] mb-2 block flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </label>
          <div className="neumorphic-pressed px-4 py-3 rounded-xl">
            <p className="text-[#6b6b6b]">{user?.email}</p>
          </div>
          <p className="text-xs text-[#9b9b9b] mt-1">
            L'email non può essere modificata
          </p>
        </div>

        {/* Nome e Cognome */}
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                Nome <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="es. Mario"
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                Cognome <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="es. Rossi"
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="neumorphic-pressed p-3 rounded-lg bg-red-50">
                <div className="flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCancel}
                className="flex-1 neumorphic-flat px-6 py-3 rounded-xl text-[#9b9b9b] hover:text-[#6b6b6b] transition-colors font-medium"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
                className="flex-1 neumorphic-flat px-6 py-3 rounded-xl text-[#8b7355] hover:shadow-lg transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[#8b7355] border-t-transparent rounded-full animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Salva Modifiche
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#9b9b9b] mb-2 block">
                Nome Completo
              </label>
              <div className="neumorphic-pressed px-4 py-3 rounded-xl">
                <p className="text-[#6b6b6b] font-medium">{user?.full_name || 'Non impostato'}</p>
              </div>
            </div>
          </div>
        )}
      </NeumorphicCard>

      {/* Info Box */}
      <NeumorphicCard className="p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">📝 Perché il nome è importante?</p>
            <p className="text-xs">
              Il tuo nome e cognome vengono utilizzati per associare i tuoi turni, ritardi e recensioni.
              Assicurati che corrispondano esattamente al nome nel sistema aziendale per visualizzare
              correttamente i tuoi dati nella pagina "Valutazione".
            </p>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}