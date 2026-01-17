import React, { useState, useMemo } from "react";
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

  const [selectedStore, setSelectedStore] = useState(storeId || '');
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

  const { data: materiePrime = [] } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list(),
  });

  const activeConfig = sprechiConfig.find(c => c.is_active);
  const prodottiAbilitati = activeConfig?.prodotti_abilitati || [];
  const motiviDisponibili = activeConfig?.motivi_disponibili || [];

  const prodottiFiltrati = useMemo(() => {
    const grouped = {};
    
    if (prodottiAbilitati.length > 0) {
      // Se ci sono prodotti abilitati specifici, usali
      prodottiAbilitati.forEach(p => {
        let item = null;
        if (p.tipo === 'materia_prima') {
          item = materiePrime.find(m => m.id === p.prodotto_id);
        } else {
          item = ricette.find(r => r.id === p.prodotto_id);
        }
        if (item && item.attivo) {
          if (!grouped[p.tipo]) grouped[p.tipo] = [];
          grouped[p.tipo].push(item);
        }
      });
    } else {
      // Altrimenti, usa tutte le materie prime e ricette attive (come admin)
      const activeMateriePrime = materiePrime.filter(m => m.attivo);
      if (activeMateriePrime.length > 0) {
        grouped.materia_prima = activeMateriePrime;
      }

      const activeRicette = ricette.filter(r => r.attivo && !r.is_semilavorato);
      if (activeRicette.length > 0) {
        grouped.ricetta = activeRicette;
      }

      const activeSemilavorati = ricette.filter(r => r.attivo && r.is_semilavorato);
      if (activeSemilavorati.length > 0) {
        grouped.semilavorato = activeSemilavorati;
      }
    }
    
    return grouped;
  }, [prodottiAbilitati, materiePrime, ricette]);

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
      // Trova il prodotto in tutte le categorie
      let prodotto = null;
      let tipo_prodotto = '';
      let costo_unitario = 0;

      for (const tipo in prodottiFiltrati) {
        const found = prodottiFiltrati[tipo].find(p => p.id === selectedProdotto);
        if (found) {
          prodotto = found;
          tipo_prodotto = tipo;
          break;
        }
      }

      if (!prodotto) {
        throw new Error('Prodotto non trovato');
      }

      // Calcola quantita_grammi in base al tipo di prodotto
      let calculatedQuantitaGrammi = 0;
      if (tipo_prodotto === 'ricetta' || tipo_prodotto === 'semilavorato') {
        // Per ricette e semilavorati: quantita * peso unitario
        calculatedQuantitaGrammi = parseFloat(quantita) * (prodotto.peso_gr_unitario || 0);
      } else if (tipo_prodotto === 'materia_prima') {
        // Per materie prime: quantita * peso_dimensione_unita (convertito a grammi)
        let baseGramsPerUnit = prodotto.peso_dimensione_unita || 0;
        if (prodotto.unita_misura_peso === 'kg') {
          baseGramsPerUnit *= 1000;
        } else if (prodotto.unita_misura_peso === 'litri') {
          baseGramsPerUnit *= 1000;
        }
        calculatedQuantitaGrammi = parseFloat(quantita) * baseGramsPerUnit;
      }

      // Determina il costo unitario
      if (tipo_prodotto === 'materia_prima') {
        costo_unitario = prodotto.prezzo_unitario || 0;
      } else {
        costo_unitario = prodotto.costo_unitario || 0;
      }

      if (!selectedStore) {
        throw new Error('Seleziona un locale');
      }
      
      const store = stores.find(s => s.id === selectedStore);

      const data = {
        store_id: selectedStore,
        store_name: store?.name || 'Store sconosciuto',
        data_rilevazione: new Date().toISOString(),
        rilevato_da: currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email || 'Operatore',
        prodotto_id: selectedProdotto,
        prodotto_nome: prodotto.nome_prodotto || 'Prodotto sconosciuto',
        tipo_prodotto,
        quantita_grammi: calculatedQuantitaGrammi,
        motivo: motivoSpreco,
        costo_unitario
      };

      createSprecoMutation.mutate(data);
    } catch (error) {
      console.error('=== ERRORE PREPARAZIONE DATI SPRECHI ===', error);
      alert(`Errore: ${error.message || 'Errore sconosciuto'}`);
      setSaving(false);
    }
  };

  const userStore = stores.find(s => s.id === selectedStore);

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
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Locale *
              </label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                required
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              >
                <option value="">Seleziona locale...</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>

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
                {Object.entries(prodottiFiltrati).map(([tipo, prodotti]) => (
                  <optgroup key={tipo} label={
                    tipo === 'materia_prima' ? 'Materie Prime' :
                    tipo === 'ricetta' ? 'Ricette' :
                    tipo === 'semilavorato' ? 'Semilavorati' :
                    tipo
                  }>
                    {prodotti.map(prod => (
                      <option key={prod.id} value={prod.id}>
                        {prod.nome_prodotto} 
                        {tipo === 'ricetta' || tipo === 'semilavorato' ? 
                          ` (${prod.peso_gr_unitario || 0}g)` :
                          ` (${prod.peso_dimensione_unita || 0}${prod.unita_misura_peso || 'g'})`
                        }
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Quantità (grammi) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={quantita}
                onChange={(e) => setQuantita(e.target.value)}
                required
                placeholder="Es. 250"
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                Inserisci la quantità in grammi
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