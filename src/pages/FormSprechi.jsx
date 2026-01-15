import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Save, Loader2, CheckCircle, Trash2 } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function FormSprechi() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const redirectPage = queryParams.get('redirect');
  const turnoId = queryParams.get('turno_id');
  const storeId = queryParams.get('store_id');
  const attivitaNome = queryParams.get('attivita');

  const [selectedProdotto, setSelectedProdotto] = useState('');
  const [quantita, setQuantita] = useState('');
  const [motivoSpreco, setMotivoSpreco] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: sprechiConfig = [] } = useQuery({
    queryKey: ['sprechi-config'],
    queryFn: () => base44.entities.SprechiConfig.list(),
  });

  const { data: ricette = [] } = useQuery({
    queryKey: ['ricette'],
    queryFn: () => base44.entities.Ricetta.list(),
  });

  const activeConfig = sprechiConfig.find(c => c.is_active);
  const prodottiAbilitati = activeConfig?.prodotti_abilitati || [];
  const motiviDisponibili = activeConfig?.motivi_disponibili || [];

  const prodottiFiltrati = prodottiAbilitati
    .filter(p => p.tipo === 'ricetta')
    .map(p => ricette.find(r => r.id === p.prodotto_id))
    .filter(r => r && r.attivo !== false);

  const createSprecoMutation = useMutation({
    mutationFn: async (data) => {
      console.log('=== INIZIO SUBMIT SPRECHI ===');
      console.log('Dati spreco:', data);
      
      const spreco = await base44.entities.Spreco.create(data);
      console.log('Spreco salvato:', spreco.id);
      
      // Se viene da un turno, registra l'attività
      if (turnoId && attivitaNome && currentUser) {
        const attivitaData = {
          dipendente_id: currentUser.id,
          dipendente_nome: currentUser.nome_cognome || currentUser.full_name || 'Dipendente',
          turno_id: turnoId,
          turno_data: new Date().toISOString().split('T')[0],
          store_id: data.store_id,
          attivita_nome: decodeURIComponent(attivitaNome),
          form_page: 'FormSprechi',
          completato_at: new Date().toISOString()
        };
        
        console.log('Salvataggio attività completata');
        await base44.entities.AttivitaCompletata.create(attivitaData);
      }
      
      console.log('=== SUBMIT SPRECHI COMPLETATO ===');
      return spreco;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprechi'] });
      queryClient.invalidateQueries({ queryKey: ['attivita-completate'] });
      setSaved(true);
      setTimeout(() => {
        navigate(createPageUrl(redirectPage || 'TurniDipendente'));
      }, 1500);
    },
    onError: (error) => {
      console.error('=== ERRORE SUBMIT SPRECHI ===', error);
      alert(`Errore: ${error.message || 'Errore sconosciuto'}`);
      setSaving(false);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const prodotto = ricette.find(r => r.id === selectedProdotto);
      const userStoreId = storeId || currentUser?.store_assegnato || currentUser?.stores_assegnati?.[0];
      const store = stores.find(s => s.id === userStoreId);

      const data = {
        store_id: userStoreId,
        store_name: store?.name || 'Store sconosciuto',
        data_rilevazione: new Date().toISOString(),
        rilevato_da: currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email || 'Operatore',
        prodotto_id: selectedProdotto,
        prodotto_nome: prodotto?.nome_prodotto || 'Prodotto sconosciuto',
        tipo_prodotto: 'ricetta',
        quantita_grammi: parseFloat(quantita) * 1000,
        motivo: motivoSpreco,
        costo_unitario: prodotto?.costo_unitario || 0
      };

      createSprecoMutation.mutate(data);
    } catch (error) {
      console.error('=== ERRORE PREPARAZIONE DATI SPRECHI ===', error);
      alert(`Errore: ${error.message || 'Errore sconosciuto'}`);
      setSaving(false);
    }
  };

  const userStoreId = storeId || currentUser?.store_assegnato || currentUser?.stores_assegnati?.[0];
  const userStore = stores.find(s => s.id === userStoreId);

  if (!activeConfig) {
    return (
      <ProtectedPage pageName="FormSprechi">
        <div className="max-w-2xl mx-auto">
          <NeumorphicCard className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Configurazione Mancante</h2>
            <p className="text-slate-600">
              Nessuna configurazione sprechi attiva. Contatta un amministratore.
            </p>
          </NeumorphicCard>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage pageName="FormSprechi">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-2">
            📋 Segnalazione Sprechi
          </h1>
          <p className="text-slate-500">Registra prodotti sprecati</p>
        </div>

        {saved && (
          <div className="p-4 rounded-xl bg-green-100 border border-green-300 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">Spreco registrato con successo!</span>
          </div>
        )}

        <NeumorphicCard className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {userStore && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Locale:</strong> {userStore.name}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Prodotto Sprecato *
              </label>
              <select
                value={selectedProdotto}
                onChange={(e) => setSelectedProdotto(e.target.value)}
                required
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              >
                <option value="">Seleziona prodotto...</option>
                {prodottiFiltrati.map(prod => (
                  <option key={prod.id} value={prod.id}>
                    {prod.nome_prodotto} {prod.tipo_teglia !== 'nessuna' && `(${prod.tipo_teglia})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Quantità (pezzi/teglie) *
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={quantita}
                onChange={(e) => setQuantita(e.target.value)}
                required
                placeholder="Es. 2 (per 2 teglie o 2 prodotti)"
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                Inserisci il numero di pezzi/teglie sprecate
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Motivo Spreco *
              </label>
              <select
                value={motivoSpreco}
                onChange={(e) => setMotivoSpreco(e.target.value)}
                required
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              >
                <option value="">Seleziona motivo...</option>
                {motiviDisponibili.map((motivo, idx) => (
                  <option key={idx} value={motivo}>
                    {motivo}
                  </option>
                ))}
              </select>
            </div>



            <div className="flex gap-3 pt-4">
              {redirectPage && (
                <NeumorphicButton
                  type="button"
                  onClick={() => navigate(createPageUrl(redirectPage))}
                  className="flex-1"
                >
                  Annulla
                </NeumorphicButton>
              )}
              <NeumorphicButton
                type="submit"
                variant="primary"
                disabled={saving || saved}
                className="flex-1 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Salvataggio...
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Salvato!
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Salva Spreco
                  </>
                )}
              </NeumorphicButton>
            </div>
          </form>
        </NeumorphicCard>

        {/* Info card */}
        <NeumorphicCard className="p-4 bg-orange-50 border border-orange-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <div className="text-sm text-orange-700">
              <p className="font-bold mb-1">ℹ️ Registrazione Sprechi</p>
              <p>
                Registra tutti i prodotti che devono essere buttati. Questo aiuta a monitorare 
                e ridurre gli sprechi nel locale.
              </p>
            </div>
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}