import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DollarSign,
  Save,
  CheckCircle,
  Store,
  User,
  FileText,
  MinusCircle
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";

export default function FormPrelievi() {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const redirectTo = urlParams.get('redirect');
  const turnoId = urlParams.get('turno_id');
  const attivitaNome = urlParams.get('attivita');
  const preselectedStoreId = urlParams.get('store_id');
  
  const [selectedStore, setSelectedStore] = useState('');
  const [importo, setImporto] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        // Preselezione store da URL parameter
        if (preselectedStoreId) {
          setSelectedStore(preselectedStoreId);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, [preselectedStoreId]);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedStore) {
      alert('Seleziona un locale');
      return;
    }

    if (!importo || parseFloat(importo) <= 0) {
      alert('Inserisci un importo valido');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      const store = stores.find(s => s.id === selectedStore);
      const now = new Date().toISOString();
      const prelievoImporto = parseFloat(importo);

      // Registra prelievo
      await base44.entities.Prelievo.create({
        store_name: store.name,
        store_id: store.id,
        data_prelievo: now,
        rilevato_da: currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email || 'N/A',
        importo: prelievoImporto,
        note: note || ''
      });

      // Aggiorna ultimo conteggio cassa (sottraendo il prelievo)
      const conteggios = await base44.entities.ConteggioCassa.filter({ store_id: store.id });
      const sortedConteggi = conteggios.sort((a, b) => 
        new Date(b.data_conteggio) - new Date(a.data_conteggio)
      );
      
      if (sortedConteggi.length > 0) {
        const lastConteggio = sortedConteggi[0];
        const newValue = Math.max(0, lastConteggio.valore_conteggio - prelievoImporto);
        
        await base44.entities.ConteggioCassa.create({
          store_name: store.name,
          store_id: store.id,
          data_conteggio: now,
          rilevato_da: `Sistema (Prelievo)`,
          valore_conteggio: newValue
        });
      }

      setSaveSuccess(true);
      
      queryClient.invalidateQueries({ queryKey: ['conteggi-cassa'] });
      queryClient.invalidateQueries({ queryKey: ['prelievi'] });

      // Segna attività come completata se viene da un turno
      if (turnoId && attivitaNome) {
        try {
          await base44.entities.AttivitaCompletata.create({
            dipendente_id: currentUser.id,
            dipendente_nome: currentUser.nome_cognome || currentUser.full_name,
            turno_id: turnoId,
            turno_data: new Date().toISOString().split('T')[0],
            store_id: store.id,
            attivita_nome: decodeURIComponent(attivitaNome),
            completato_at: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error marking activity as completed:', error);
        }
      }

      // Redirect dopo un breve delay
      setTimeout(() => {
        if (redirectTo) {
          navigate(createPageUrl(redirectTo));
        } else {
          setSaveSuccess(false);
          setImporto('');
          setNote('');
          setSelectedStore('');
        }
      }, 1500);
    } catch (error) {
      console.error('Error saving prelievo:', error);
      alert('Errore durante il salvataggio: ' + error.message);
    }

    setSaving(false);
  };

  return (
    <ProtectedPage pageName="FormPrelievi">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <MinusCircle className="w-10 h-10 text-red-600" />
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              Form Prelievi
            </h1>
          </div>
          <p className="text-sm text-slate-500">Registra prelievi di contante dalla cassa</p>
        </div>

        {saveSuccess && (
          <NeumorphicCard className="p-4 bg-green-50 border-2 border-green-400">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800 font-medium">
                Prelievo registrato con successo! ✅
              </p>
            </div>
          </NeumorphicCard>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Nuovo Prelievo</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  Locale <span className="text-red-600">*</span>
                </label>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  required
                  disabled={saving}
                >
                  <option value="">Seleziona locale...</option>
                  {stores
                    .filter(store => !currentUser?.assigned_stores || currentUser.assigned_stores.length === 0 || currentUser.assigned_stores.includes(store.id))
                    .map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Importo Prelievo (€) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={importo}
                  onChange={(e) => setImporto(e.target.value)}
                  placeholder="es. 500.00"
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-2xl font-bold"
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Note
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note aggiuntive (opzionale)"
                  rows={3}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none resize-none"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Rilevato da
                </label>
                <div className="neumorphic-pressed px-4 py-3 rounded-xl">
                  <p className="text-slate-700">
                    {currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email || 'Caricamento...'}
                  </p>
                </div>
              </div>

              <div className="neumorphic-pressed p-3 rounded-xl bg-blue-50">
                <p className="text-xs text-blue-800">
                  ℹ️ Il prelievo verrà sottratto dall'ultimo conteggio cassa del locale selezionato
                </p>
              </div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <NeumorphicButton
              type="submit"
              variant="primary"
              className="w-full py-4 text-lg font-bold flex items-center justify-center gap-3"
              disabled={saving || !selectedStore || !importo}
            >
              {saving ? (
                <>
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvataggio in corso...
                </>
              ) : (
                <>
                  <Save className="w-6 h-6" />
                  Registra Prelievo
                </>
              )}
            </NeumorphicButton>
          </NeumorphicCard>
        </form>
      </div>
    </ProtectedPage>
  );
}