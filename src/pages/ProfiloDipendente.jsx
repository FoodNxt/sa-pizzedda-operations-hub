
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Mail,
  Save,
  AlertCircle,
  CheckCircle,
  Edit,
  Phone,
  Calendar,
  MapPin,
  ShoppingBag
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";

export default function ProfiloDipendente() {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    initials: '',
    phone: '',
    data_nascita: '',
    codice_fiscale: '',
    indirizzo_domicilio: '',
    taglia_maglietta: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const queryClient = useQueryClient();

  // Fetch current user
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const u = await base44.auth.me();
      // Pre-populate form
      setFormData({
        full_name: u.full_name || '',
        initials: u.initials || '',
        phone: u.phone || '',
        data_nascita: u.data_nascita || '',
        codice_fiscale: u.codice_fiscale || '',
        indirizzo_domicilio: u.indirizzo_domicilio || '',
        taglia_maglietta: u.taglia_maglietta || ''
      });
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
    if (!formData.full_name?.trim()) {
      setError('Il nome completo è obbligatorio');
      return;
    }

    if (formData.full_name.trim().length < 3) {
      setError('Il nome completo deve avere almeno 3 caratteri');
      return;
    }

    await updateProfileMutation.mutateAsync({
      ...formData,
      profile_manually_completed: true
    });
  };

  const handleCancel = () => {
    // Reset to current values
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        initials: user.initials || '',
        phone: user.phone || '',
        data_nascita: user.data_nascita || '',
        codice_fiscale: user.codice_fiscale || '',
        indirizzo_domicilio: user.indirizzo_domicilio || '',
        taglia_maglietta: user.taglia_maglietta || ''
      });
    }
    setEditing(false);
    setError('');
    setSuccess('');
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <NeumorphicCard className="p-8">
          <p className="text-[#9b9b9b]">Caricamento...</p>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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

      {/* Profile Header */}
      <NeumorphicCard className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full neumorphic-flat flex items-center justify-center">
              <span className="text-3xl font-bold text-[#8b7355]">
                {user?.initials || (user?.full_name || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#6b6b6b]">
                {user?.full_name || 'Nome non impostato'}
              </h2>
              <p className="text-[#9b9b9b]">
                {user?.function_name || (user?.user_type === 'admin' ? 'Amministratore' : user?.user_type === 'manager' ? 'Manager' : 'Dipendente')}
              </p>
              {user?.employee_group && (
                <p className="text-sm text-[#9b9b9b]">Contratto: {user.employee_group}</p>
              )}
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
        <div className="neumorphic-pressed p-4 rounded-xl bg-gray-50">
          <label className="text-sm font-medium text-[#9b9b9b] mb-2 block flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email (non modificabile)
          </label>
          <p className="text-[#6b6b6b] font-medium">{user?.email}</p>
        </div>
      </NeumorphicCard>

      {/* Dati Anagrafici */}
      <NeumorphicCard className="p-6">
        <h3 className="text-lg font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-[#8b7355]" />
          Dati Anagrafici
        </h3>

        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                  Nome Completo <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Mario Rossi"
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                />
                <p className="text-xs text-[#9b9b9b] mt-1">
                  ⚠️ Deve corrispondere ESATTAMENTE a come appare nei turni per il matching automatico
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                  Iniziali
                </label>
                <input
                  type="text"
                  value={formData.initials}
                  onChange={(e) => setFormData({ ...formData, initials: e.target.value })}
                  placeholder="M.R."
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data di Nascita
                </label>
                <input
                  type="date"
                  value={formData.data_nascita}
                  onChange={(e) => setFormData({ ...formData, data_nascita: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                  Codice Fiscale
                </label>
                <input
                  type="text"
                  value={formData.codice_fiscale}
                  onChange={(e) => setFormData({ ...formData, codice_fiscale: e.target.value.toUpperCase() })}
                  placeholder="RSSMRA80A01H501Z"
                  maxLength={16}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none uppercase"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Numero di Cellulare
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+39 333 1234567"
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Indirizzo di Domicilio
                </label>
                <input
                  type="text"
                  value={formData.indirizzo_domicilio}
                  onChange={(e) => setFormData({ ...formData, indirizzo_domicilio: e.target.value })}
                  placeholder="Via Roma 123, 20100 Milano (MI)"
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Taglia Maglietta
                </label>
                <select
                  value={formData.taglia_maglietta}
                  onChange={(e) => setFormData({ ...formData, taglia_maglietta: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                >
                  <option value="">-- Seleziona --</option>
                  <option value="XS">XS</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                </select>
              </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="neumorphic-pressed p-4 rounded-xl md:col-span-2">
              <p className="text-sm text-[#9b9b9b] mb-1">Nome Completo</p>
              <p className="text-[#6b6b6b] font-medium">{user?.full_name || '-'}</p>
            </div>

            <div className="neumorphic-pressed p-4 rounded-xl">
              <p className="text-sm text-[#9b9b9b] mb-1">Iniziali</p>
              <p className="text-[#6b6b6b] font-medium">{user?.initials || '-'}</p>
            </div>

            <div className="neumorphic-pressed p-4 rounded-xl">
              <p className="text-sm text-[#9b9b9b] mb-1 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data di Nascita
              </p>
              <p className="text-[#6b6b6b] font-medium">
                {user?.data_nascita ? new Date(user.data_nascita).toLocaleDateString('it-IT') : '-'}
              </p>
            </div>

            <div className="neumorphic-pressed p-4 rounded-xl">
              <p className="text-sm text-[#9b9b9b] mb-1">Codice Fiscale</p>
              <p className="text-[#6b6b6b] font-medium uppercase">{user?.codice_fiscale || '-'}</p>
            </div>

            <div className="neumorphic-pressed p-4 rounded-xl">
              <p className="text-sm text-[#9b9b9b] mb-1 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Cellulare
              </p>
              <p className="text-[#6b6b6b] font-medium">{user?.phone || '-'}</p>
            </div>

            <div className="neumorphic-pressed p-4 rounded-xl md:col-span-2">
              <p className="text-sm text-[#9b9b9b] mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Indirizzo di Domicilio
              </p>
              <p className="text-[#6b6b6b] font-medium">{user?.indirizzo_domicilio || '-'}</p>
            </div>

            <div className="neumorphic-pressed p-4 rounded-xl">
              <p className="text-sm text-[#9b9b9b] mb-1 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Taglia Maglietta
              </p>
              <p className="text-[#6b6b6b] font-medium">{user?.taglia_maglietta || '-'}</p>
            </div>
          </div>
        )}
      </NeumorphicCard>

      {/* Info Box */}
      <NeumorphicCard className="p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">📝 Perché questi dati sono importanti?</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li><strong>Il tuo Nome Completo</strong> viene usato per associare turni e recensioni automaticamente</li>
              <li>Deve corrispondere ESATTAMENTE a come appare nel sistema turni (es. "Mario Rossi")</li>
              <li>Il matching viene fatto in modo intelligente (case-insensitive, ignora spazi multipli)</li>
              <li>I dati anagrafici sono necessari per la gestione amministrativa</li>
              <li>La taglia maglietta serve per fornirti la divisa corretta</li>
              <li>Assicurati che tutti i dati siano corretti e aggiornati</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}
