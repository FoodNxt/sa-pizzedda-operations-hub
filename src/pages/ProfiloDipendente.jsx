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
  ShoppingBag,
  Upload,
  FileText,
  X,
  CreditCard,
  Trash2 } from
'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";

export default function ProfiloDipendente() {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    nome_cognome: '',
    ruoli_dipendente: [],
    phone: '',
    data_nascita: '',
    citta_nascita: '',
    codice_fiscale: '',
    indirizzo_residenza: '',
    citta_residenza: '',
    iban: '',
    taglia_maglietta: '',
    cittadinanza_italiana: true
  });

  const [documentFiles, setDocumentFiles] = useState({
    documento_identita: null,
    codice_fiscale_documento: null,
    permesso_soggiorno: null
  });
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const u = await base44.auth.me();
      setFormData({
        nome_cognome: u.nome_cognome || u.full_name || '',
        ruoli_dipendente: u.ruoli_dipendente || [],
        phone: u.phone || '',
        data_nascita: u.data_nascita || '',
        citta_nascita: u.citta_nascita || '',
        codice_fiscale: u.codice_fiscale || '',
        indirizzo_residenza: u.indirizzo_residenza || '',
        citta_residenza: u.citta_residenza || '',
        iban: u.iban || '',
        taglia_maglietta: u.taglia_maglietta || '',
        cittadinanza_italiana: u.cittadinanza_italiana !== false
      });
      return u;
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.auth.updateMe(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setSuccess('Profilo aggiornato! ✅');
      setError('');
      setEditing(false);

      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError('Errore durante l\'aggiornamento');
      setSuccess('');
    }
  });

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!formData.nome_cognome?.trim()) {
      setError('Il Nome Cognome è obbligatorio');
      return;
    }

    if (formData.nome_cognome.trim().length < 3) {
      setError('Il Nome Cognome deve avere almeno 3 caratteri');
      return;
    }

    await updateProfileMutation.mutateAsync({
      ...formData,
      profile_manually_completed: true
    });
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        nome_cognome: user.nome_cognome || user.full_name || '',
        ruoli_dipendente: user.ruoli_dipendente || [],
        phone: user.phone || '',
        data_nascita: user.data_nascita || '',
        citta_nascita: user.citta_nascita || '',
        codice_fiscale: user.codice_fiscale || '',
        indirizzo_residenza: user.indirizzo_residenza || '',
        citta_residenza: user.citta_residenza || '',
        iban: user.iban || '',
        taglia_maglietta: user.taglia_maglietta || '',
        cittadinanza_italiana: user.cittadinanza_italiana !== false
      });
    }
    setEditing(false);
    setError('');
    setSuccess('');
  };

  const handleDocumentChange = (docType, file) => {
    if (file) {
      setDocumentFiles((prev) => ({ ...prev, [docType]: file }));
    }
  };

  const handleDocumentUpload = async (docType) => {
    const file = documentFiles[docType];
    if (!file) {
      setError('Seleziona un file da caricare');
      return;
    }

    try {
      setUploadingDocs(true);
      setError('');

      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const fieldName = `${docType}_url`;
      await base44.auth.updateMe({ [fieldName]: file_url });

      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setDocumentFiles((prev) => ({ ...prev, [docType]: null }));
      setSuccess(`Documento caricato! ✅`);
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      console.error('Error uploading document:', error);
      setError('Errore durante il caricamento');
    } finally {
      setUploadingDocs(false);
    }
  };

  const handleDocumentDelete = async (docType) => {
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) return;

    try {
      const fieldName = `${docType}_url`;
      await base44.auth.updateMe({ [fieldName]: null });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setSuccess('Documento eliminato');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Errore durante l\'eliminazione');
    }
  };

  const handleAccountDeletion = async () => {
    if (deleteConfirmText !== 'ELIMINA IL MIO ACCOUNT') {
      setError('Testo di conferma non corretto');
      return;
    }

    try {
      setIsDeleting(true);
      await base44.auth.updateMe({ account_deletion_requested: true, account_deletion_date: new Date().toISOString() });
      setSuccess('Richiesta di eliminazione inviata. Verrai contattato a breve.');
      setShowDeleteModal(false);
      setTimeout(() => {
        base44.auth.logout();
      }, 2000);
    } catch (error) {
      console.error('Error requesting account deletion:', error);
      setError('Errore durante la richiesta di eliminazione');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4 text-center">
        <NeumorphicCard className="p-8">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Caricamento...</p>
        </NeumorphicCard>
      </div>);

  }

  // Check if profile is complete
  const isProfileComplete = user?.nome_cognome && user?.phone && user?.data_nascita &&
  user?.citta_nascita && user?.codice_fiscale && user?.indirizzo_residenza && user?.citta_residenza && user?.iban &&
  user?.documento_identita_url && user?.codice_fiscale_documento_url && (
  user?.cittadinanza_italiana !== false || user?.permesso_soggiorno_url);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Banner after complete profile */}
      {isProfileComplete && (!user?.ruoli_dipendente || user.ruoli_dipendente.length === 0) &&
      <NeumorphicCard className="p-4 bg-blue-50 border-2 border-blue-300">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-bold text-blue-900 mb-1">✅ Dati Ricevuti</h3>
              <p className="text-sm text-blue-800">
                Stiamo rivedendo i tuoi dati - riceverai maggiori informazioni a breve
              </p>
            </div>
          </div>
        </NeumorphicCard>
      }

      {/* Header */}
      <div className="mb-4">
        <h1 className="bg-clip-text text-slate-50 mb-1 text-2xl font-bold lg:text-3xl from-slate-700 to-slate-900">Il Mio Profilo

        </h1>
        <p className="text-slate-50 text-sm">Gestisci le tue informazioni</p>
      </div>

      {/* Success Message */}
      {success &&
      <NeumorphicCard className="p-3 bg-green-50 border-2 border-green-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800 font-medium">{success}</p>
          </div>
        </NeumorphicCard>
      }

      {/* Profile Header */}
      <NeumorphicCard className="p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-2xl font-bold text-white">
                {(user?.nome_cognome || user?.full_name || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg lg:text-xl font-bold text-slate-800 truncate">
                {user?.nome_cognome || user?.full_name || 'Nome non impostato'}
              </h2>
              <p className="text-sm text-slate-500 truncate">
                {user?.ruoli_dipendente && user.ruoli_dipendente.length > 0 ?
                user.ruoli_dipendente.join(', ') :
                'Dipendente'}
              </p>
            </div>
          </div>

          {!editing &&
          <button
            onClick={() => setEditing(true)}
            className="nav-button px-4 py-2 rounded-xl text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap">

              <Edit className="w-4 h-4" />
              <span className="text-sm font-medium">Modifica</span>
            </button>
          }
        </div>

        {/* Email (Read-only) */}
        <div className="neumorphic-pressed p-3 rounded-xl bg-slate-50">
          <label className="text-xs font-medium text-slate-500 mb-1 block flex items-center gap-2">
            <Mail className="w-3 h-3" />
            Email
          </label>
          <p className="text-sm text-slate-700 font-medium break-all">{user?.email}</p>
        </div>
      </NeumorphicCard>

      {/* Dati Anagrafici */}
      <NeumorphicCard className="p-4 lg:p-6">
        <h3 className="text-base lg:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          Dati Anagrafici
        </h3>

        {editing ?
        <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Nome Cognome <span className="text-red-600">*</span>
              </label>
              <input
              type="text"
              value={formData.nome_cognome}
              onChange={(e) => setFormData({ ...formData, nome_cognome: e.target.value })}
              placeholder="Mario Rossi"
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

            </div>

            {user?.user_type === 'dipendente' &&
          <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Ruoli
                </label>
                <div className="w-full neumorphic-pressed px-4 py-3 rounded-xl bg-slate-50">
                  <div className="flex flex-wrap gap-2">
                    {user.ruoli_dipendente && user.ruoli_dipendente.length > 0 ?
                user.ruoli_dipendente.map((role, idx) =>
                <span key={idx} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                          {role}
                        </span>
                ) :

                <span className="text-sm text-slate-500">Nessun ruolo</span>
                }
                  </div>
                </div>
              </div>
          }

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data di Nascita
                </label>
                <input
                type="date"
                value={formData.data_nascita}
                onChange={(e) => setFormData({ ...formData, data_nascita: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Città di Nascita
                </label>
                <input
                type="text"
                value={formData.citta_nascita}
                onChange={(e) => setFormData({ ...formData, citta_nascita: e.target.value })}
                placeholder="Milano"
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Codice Fiscale
                </label>
                <input
                type="text"
                value={formData.codice_fiscale}
                onChange={(e) => setFormData({ ...formData, codice_fiscale: e.target.value.toUpperCase() })}
                placeholder="RSSMRA80A01H501Z"
                maxLength={16}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none uppercase text-sm" />

              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Cellulare
                </label>
                <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+39 333 1234567"
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Indirizzo di Residenza
              </label>
              <input
              type="text"
              value={formData.indirizzo_residenza}
              onChange={(e) => setFormData({ ...formData, indirizzo_residenza: e.target.value })}
              placeholder="Via Roma 123"
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Città di Residenza
              </label>
              <input
              type="text"
              value={formData.citta_residenza}
              onChange={(e) => setFormData({ ...formData, citta_residenza: e.target.value })}
              placeholder="Milano"
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                IBAN
              </label>
              <input
              type="text"
              value={formData.iban}
              onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
              placeholder="IT60 X054 2811 1010 0000 0123 456"
              maxLength={34}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none uppercase text-sm" />

            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Taglia Maglietta
              </label>
              <select
              value={formData.taglia_maglietta}
              onChange={(e) => setFormData({ ...formData, taglia_maglietta: e.target.value })}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm">

                <option value="">-- Seleziona --</option>
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Hai la cittadinanza italiana?
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                  type="radio"
                  checked={formData.cittadinanza_italiana === true}
                  onChange={() => setFormData({ ...formData, cittadinanza_italiana: true })}
                  className="w-4 h-4" />

                  <span className="text-sm text-slate-700">Sì</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                  type="radio"
                  checked={formData.cittadinanza_italiana === false}
                  onChange={() => setFormData({ ...formData, cittadinanza_italiana: false })}
                  className="w-4 h-4" />

                  <span className="text-sm text-slate-700">No</span>
                </label>
              </div>
            </div>

            {error &&
          <div className="neumorphic-pressed p-3 rounded-lg bg-red-50">
                <div className="flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              </div>
          }

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
              onClick={handleCancel}
              className="flex-1 nav-button px-6 py-3 rounded-xl text-slate-700 hover:text-slate-900 transition-colors font-medium text-sm">

                Annulla
              </button>
              <button
              onClick={handleSave}
              disabled={updateProfileMutation.isPending}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg text-sm">

                {updateProfileMutation.isPending ?
              <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvataggio...
                  </> :

              <>
                    <Save className="w-5 h-5" />
                    Salva
                  </>
              }
              </button>
            </div>
          </div> :

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {user?.user_type === 'dipendente' &&
          <div className="neumorphic-pressed p-3 rounded-xl sm:col-span-2">
                <p className="text-xs text-slate-500 mb-2">Ruoli</p>
                <div className="flex flex-wrap gap-2">
                  {user?.ruoli_dipendente && user.ruoli_dipendente.length > 0 ?
              user.ruoli_dipendente.map((role, idx) =>
              <span key={idx} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                        {role}
                      </span>
              ) :

              <span className="text-sm text-slate-600">Nessun ruolo</span>
              }
                </div>
              </div>
          }

            <div className="neumorphic-pressed p-3 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Data di Nascita</p>
              <p className="text-sm text-slate-700 font-medium">
                {user?.data_nascita ? new Date(user.data_nascita).toLocaleDateString('it-IT') : '-'}
              </p>
            </div>

            <div className="neumorphic-pressed p-3 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Città di Nascita</p>
              <p className="text-sm text-slate-700 font-medium">{user?.citta_nascita || '-'}</p>
            </div>

            <div className="neumorphic-pressed p-3 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Codice Fiscale</p>
              <p className="text-sm text-slate-700 font-medium uppercase break-all">{user?.codice_fiscale || '-'}</p>
            </div>

            <div className="neumorphic-pressed p-3 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Cellulare</p>
              <p className="text-sm text-slate-700 font-medium">{user?.phone || '-'}</p>
            </div>

            <div className="neumorphic-pressed p-3 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Indirizzo di Residenza</p>
              <p className="text-sm text-slate-700 font-medium break-words">{user?.indirizzo_residenza || '-'}</p>
            </div>

            <div className="neumorphic-pressed p-3 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Città di Residenza</p>
              <p className="text-sm text-slate-700 font-medium">{user?.citta_residenza || '-'}</p>
            </div>

            <div className="neumorphic-pressed p-3 rounded-xl sm:col-span-2">
              <p className="text-xs text-slate-500 mb-1">IBAN</p>
              <p className="text-sm text-slate-700 font-medium uppercase break-all">{user?.iban || '-'}</p>
            </div>

            <div className="neumorphic-pressed p-3 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Taglia Maglietta</p>
              <p className="text-sm text-slate-700 font-medium">{user?.taglia_maglietta || '-'}</p>
            </div>
          </div>
        }
      </NeumorphicCard>

      {/* Documenti Section */}
      <NeumorphicCard className="p-4 lg:p-6">
        <h3 className="text-base lg:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Documenti
        </h3>

        {/* Check if anagrafica is complete */}
        {!user?.nome_cognome || !user?.phone || !user?.data_nascita || !user?.citta_nascita || !user?.codice_fiscale || !user?.indirizzo_residenza || !user?.citta_residenza || !user?.iban ?
        <div className="neumorphic-pressed p-4 rounded-xl bg-yellow-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 mb-1">
                  Completa i Dati Anagrafici
                </p>
                <p className="text-xs text-yellow-700">
                  Per caricare i documenti, devi prima completare tutti i campi nella sezione "Dati Anagrafici"
                </p>
              </div>
            </div>
          </div> :

        <div className="space-y-4">
          {/* Documento d'Identità */}
          <div className="neumorphic-pressed p-4 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-700">Documento d'Identità</h4>
              {user?.documento_identita_url &&
              <button
                onClick={() => handleDocumentDelete('documento_identita')}
                className="nav-button p-2 rounded-lg hover:bg-red-50 transition-colors"
                title="Elimina">

                  <X className="w-4 h-4 text-red-600" />
                </button>
              }
            </div>
            
            {user?.documento_identita_url ?
            <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-green-700 font-medium">Caricato</p>
                  <a
                  href={user.documento_identita_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline truncate block">

                    Visualizza
                  </a>
                </div>
              </div> :

            <div>
                <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => handleDocumentChange('documento_identita', e.target.files[0])}
                className="hidden"
                id="doc-identita" />

                <label
                htmlFor="doc-identita"
                className="nav-button px-4 py-3 rounded-lg cursor-pointer flex items-center gap-2 hover:shadow-lg transition-all w-full">

                  <Upload className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="text-sm text-slate-700 truncate">
                    {documentFiles.documento_identita ? documentFiles.documento_identita.name : 'Seleziona file'}
                  </span>
                </label>
                {documentFiles.documento_identita &&
              <button
                onClick={() => handleDocumentUpload('documento_identita')}
                disabled={uploadingDocs}
                className="mt-2 w-full bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50">

                    {uploadingDocs ? 'Caricamento...' : 'Carica'}
                  </button>
              }
              </div>
            }
          </div>

          {/* Codice Fiscale Documento */}
          <div className="neumorphic-pressed p-4 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-700">Codice Fiscale</h4>
              {user?.codice_fiscale_documento_url &&
              <button
                onClick={() => handleDocumentDelete('codice_fiscale_documento')}
                className="nav-button p-2 rounded-lg hover:bg-red-50 transition-colors"
                title="Elimina">

                  <X className="w-4 h-4 text-red-600" />
                </button>
              }
            </div>
            
            {user?.codice_fiscale_documento_url ?
            <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-green-700 font-medium">Caricato</p>
                  <a
                  href={user.codice_fiscale_documento_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline truncate block">

                    Visualizza
                  </a>
                </div>
              </div> :

            <div>
                <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => handleDocumentChange('codice_fiscale_documento', e.target.files[0])}
                className="hidden"
                id="doc-cf" />

                <label
                htmlFor="doc-cf"
                className="nav-button px-4 py-3 rounded-lg cursor-pointer flex items-center gap-2 hover:shadow-lg transition-all w-full">

                  <Upload className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="text-sm text-slate-700 truncate">
                    {documentFiles.codice_fiscale_documento ? documentFiles.codice_fiscale_documento.name : 'Seleziona file'}
                  </span>
                </label>
                {documentFiles.codice_fiscale_documento &&
              <button
                onClick={() => handleDocumentUpload('codice_fiscale_documento')}
                disabled={uploadingDocs}
                className="mt-2 w-full bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50">

                    {uploadingDocs ? 'Caricamento...' : 'Carica'}
                  </button>
              }
              </div>
            }
          </div>

          {/* Permesso di Soggiorno - Only if NOT Italian citizen */}
          {user?.cittadinanza_italiana === false &&
          <div className="neumorphic-pressed p-4 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-slate-700">Permesso di Soggiorno</h4>
                {user?.permesso_soggiorno_url &&
              <button
                onClick={() => handleDocumentDelete('permesso_soggiorno')}
                className="nav-button p-2 rounded-lg hover:bg-red-50 transition-colors"
                title="Elimina">

                    <X className="w-4 h-4 text-red-600" />
                  </button>
              }
              </div>
              
              {user?.permesso_soggiorno_url ?
            <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-green-700 font-medium">Caricato</p>
                    <a
                  href={user.permesso_soggiorno_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline truncate block">

                      Visualizza
                    </a>
                  </div>
                </div> :

            <div>
                  <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => handleDocumentChange('permesso_soggiorno', e.target.files[0])}
                className="hidden"
                id="doc-permesso" />

                  <label
                htmlFor="doc-permesso"
                className="nav-button px-4 py-3 rounded-lg cursor-pointer flex items-center gap-2 hover:shadow-lg transition-all w-full">

                    <Upload className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-slate-700 truncate">
                      {documentFiles.permesso_soggiorno ? documentFiles.permesso_soggiorno.name : 'Seleziona file'}
                    </span>
                  </label>
                  {documentFiles.permesso_soggiorno &&
              <button
                onClick={() => handleDocumentUpload('permesso_soggiorno')}
                disabled={uploadingDocs}
                className="mt-2 w-full bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50">

                      {uploadingDocs ? 'Caricamento...' : 'Carica'}
                    </button>
              }
                </div>
            }
            </div>
          }
        </div>
        }
      </NeumorphicCard>

      {/* Info Box */}
      <NeumorphicCard className="p-4 bg-blue-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs lg:text-sm text-blue-800">
            <p className="font-medium mb-2">📝 Informazioni Importanti</p>
            <ul className="space-y-1 list-disc list-inside text-xs">
              <li>Il tuo Nome Cognome viene usato per associare turni e recensioni</li>
              <li>I documenti sono richiesti per conformità legale</li>
              <li>Tutti i dati sono archiviati in modo sicuro</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>

      {/* Account Deletion */}
      <NeumorphicCard className="p-4 lg:p-6 bg-red-50 border-2 border-red-200">
        <h3 className="text-base lg:text-lg font-bold text-red-800 mb-2 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-600" />
          Zona Pericolosa
        </h3>
        <p className="text-sm text-red-700 mb-4">
          L'eliminazione dell'account è permanente e non può essere annullata.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 transition-colors"
        >
          Richiedi Eliminazione Account
        </button>
      </NeumorphicCard>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Elimina Account</h2>
                <p className="text-sm text-slate-600 mt-1">Questa azione è irreversibile</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 font-medium mb-2">⚠️ Attenzione:</p>
              <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                <li>Tutti i tuoi dati verranno eliminati</li>
                <li>Non potrai più accedere all'account</li>
                <li>Questa azione è permanente</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Scrivi <span className="font-bold text-red-600">ELIMINA IL MIO ACCOUNT</span> per confermare:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="ELIMINA IL MIO ACCOUNT"
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setError('');
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleAccountDeletion}
                disabled={isDeleting || deleteConfirmText !== 'ELIMINA IL MIO ACCOUNT'}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Elaborazione...' : 'Conferma Eliminazione'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>);

}