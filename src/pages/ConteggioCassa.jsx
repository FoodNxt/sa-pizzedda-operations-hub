import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  Save,
  CheckCircle,
  Store,
  User,
  Calendar,
  TrendingUp
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function ConteggioCassa() {
  const [selectedStore, setSelectedStore] = useState('');
  const [valoreConteggio, setValoreConteggio] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: conteggi = [] } = useQuery({
    queryKey: ['conteggi-cassa'],
    queryFn: () => base44.entities.ConteggioCassa.list('-data_conteggio', 50),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedStore) {
      alert('Seleziona un locale');
      return;
    }

    if (!valoreConteggio || parseFloat(valoreConteggio) < 0) {
      alert('Inserisci un valore valido');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      const store = stores.find(s => s.id === selectedStore);
      const now = new Date().toISOString();

      await base44.entities.ConteggioCassa.create({
        store_name: store.name,
        store_id: store.id,
        data_conteggio: now,
        rilevato_da: currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email || 'N/A',
        valore_conteggio: parseFloat(valoreConteggio)
      });

      setSaveSuccess(true);
      setValoreConteggio('');
      setSelectedStore('');
      
      queryClient.invalidateQueries({ queryKey: ['conteggi-cassa'] });

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving conteggio:', error);
      alert('Errore durante il salvataggio: ' + error.message);
    }

    setSaving(false);
  };

  // Calculate stats
  const conteggioOggi = conteggi.filter(c => {
    const conteggioDate = new Date(c.data_conteggio);
    const today = new Date();
    return conteggioDate.toDateString() === today.toDateString();
  }).length;

  const totaleOggi = conteggi
    .filter(c => {
      const conteggioDate = new Date(c.data_conteggio);
      const today = new Date();
      return conteggioDate.toDateString() === today.toDateString();
    })
    .reduce((sum, c) => sum + (c.valore_conteggio || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <DollarSign className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Conteggio Cassa</h1>
        </div>
        <p className="text-[#9b9b9b]">Registra il conteggio della cassa</p>
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <NeumorphicCard className="p-4 bg-green-50 border-2 border-green-400">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800 font-medium">
              Conteggio salvato con successo! ✅
            </p>
          </div>
        </NeumorphicCard>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">
            {conteggioOggi}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Conteggi Oggi</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">
            €{totaleOggi.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Totale Oggi</p>
        </NeumorphicCard>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Nuovo Conteggio</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                <Store className="w-4 h-4" />
                Locale <span className="text-red-600">*</span>
              </label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                required
                disabled={saving}
              >
                <option value="">Seleziona locale...</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Conteggio Cassa (€) <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valoreConteggio}
                onChange={(e) => setValoreConteggio(e.target.value)}
                placeholder="es. 1250.50"
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none text-2xl font-bold"
                required
                disabled={saving}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                <User className="w-4 h-4" />
                Rilevato da
              </label>
              <div className="neumorphic-pressed px-4 py-3 rounded-xl">
                <p className="text-[#6b6b6b]">
                  {currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email || 'Caricamento...'}
                </p>
              </div>
            </div>

            <div className="neumorphic-pressed p-3 rounded-xl bg-blue-50">
              <p className="text-xs text-blue-800">
                ℹ️ La data e l'ora verranno registrate automaticamente al momento del salvataggio
              </p>
            </div>
          </div>
        </NeumorphicCard>

        {/* Submit Button */}
        <NeumorphicCard className="p-6">
          <NeumorphicButton
            type="submit"
            variant="primary"
            className="w-full py-4 text-lg font-bold flex items-center justify-center gap-3"
            disabled={saving || !selectedStore || !valoreConteggio}
          >
            {saving ? (
              <>
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Salvataggio in corso...
              </>
            ) : (
              <>
                <Save className="w-6 h-6" />
                Salva Conteggio
              </>
            )}
          </NeumorphicButton>
        </NeumorphicCard>
      </form>

      {/* Recent Conteggi */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Ultimi Conteggi</h2>
        
        {conteggi.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#8b7355]">
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Data e Ora</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Locale</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Rilevato da</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Importo</th>
                </tr>
              </thead>
              <tbody>
                {conteggi.map((conteggio) => (
                  <tr key={conteggio.id} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#9b9b9b]" />
                        <span className="text-[#6b6b6b]">
                          {format(new Date(conteggio.data_conteggio), 'dd/MM/yyyy HH:mm', { locale: it })}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-[#9b9b9b]" />
                        <span className="text-[#6b6b6b]">{conteggio.store_name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[#9b9b9b]" />
                        <span className="text-[#6b6b6b] text-sm">{conteggio.rilevato_da}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-[#8b7355] font-bold text-lg">
                        €{conteggio.valore_conteggio.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-[#9b9b9b] opacity-50 mx-auto mb-4" />
            <p className="text-[#9b9b9b]">Nessun conteggio registrato</p>
          </div>
        )}
      </NeumorphicCard>
    </div>
  );
}