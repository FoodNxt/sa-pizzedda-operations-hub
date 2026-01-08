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
  const motiviDisponibili = activeConfig?.motivi_spreco || [];

  const prodottiFiltrati = ricette.filter(r => 
    prodottiAbilitati.includes(r.id) && r.attivo !== false
  );

  const createSprecoMutation = useMutation({
    mutationFn: async (data) => {
      const spreco = await base44.entities.Spreco.create(data);
      
      // Se viene da un turno, registra l'attività
      if (turnoId && attivitaNome) {
        await base44.entities.AttivitaCompletata.create({
          dipendente_id: currentUser.id,
          dipendente_nome: currentUser.nome_cognome || currentUser.full_name,
          turno_id: turnoId,
          turno_data: new Date().toISOString().split('T')[0],
          store_id: storeId,
          attivita_nome: attivitaNome,
          form_page: 'FormSprechi',
          completato_at: new Date().toISOString()
        });
      }
      
      return spreco;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprechi'] });
      queryClient.invalidateQueries({ queryKey: ['attivita-completate'] });
      setSaved(true);
      setTimeout(() => {
        if (redirectPage) {
          navigate(createPageUrl(redirectPage));
        } else {
          setSelectedProdotto('');
          setQuantita('');
          setMotivoSpreco('');
          setNote('');
          setSaved(false);
        }
      }, 1500);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const prodotto = ricette.find(r => r.id === selectedProdotto);
    const store = stores.find(s => s.id === (storeId || currentUser?.store_assegnato || currentUser?.stores_assegnati?.[0]));

    const data = {
      store_id: store?.id || storeId,
      store_name: store?.name || '',
      data_spreco: new Date().toISOString(),
      rilevato_da: currentUser.nome_cognome || currentUser.full_name,
      dipendente_id: currentUser.id,
      prodotto_id: selectedProdotto,
      nome_prodotto: prodotto?.nome_prodotto || '',
      tipo_teglia: prodotto?.tipo_teglia || 'nessuna',
      quantita: parseFloat(quantita),
      motivo_spreco: motivoSpreco,
      note: note || undefined
    };

    createSprecoMutation.mutate(data);
    setSaving(false);
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
                Quantità *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={quantita}
                onChange={(e) => setQuantita(e.target.value)}
                required
                placeholder="Es. 2 (per 2 teglie o 2 prodotti)"
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              />
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

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Note (opzionale)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Aggiungi dettagli se necessario..."
                rows={3}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none resize-none"
              />
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