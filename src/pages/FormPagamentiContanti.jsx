import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Store, CheckCircle, Calendar, User, FileText } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function FormPagamentiContanti() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    store_id: '',
    store_name: '',
    importo: '',
    descrizione: ''
  });

  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recentPayments = [] } = useQuery({
    queryKey: ['recent-payments'],
    queryFn: () => base44.entities.PagamentoContanti.list('-data_pagamento', 20),
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data) => base44.entities.PagamentoContanti.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-payments'] });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setFormData({
        store_id: '',
        store_name: '',
        importo: '',
        descrizione: ''
      });
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = {
      store_id: formData.store_id,
      store_name: formData.store_name,
      importo: parseFloat(formData.importo),
      descrizione: formData.descrizione,
      data_pagamento: new Date().toISOString(),
      registrato_da: user?.nome_cognome || user?.full_name || user?.email || 'Utente'
    };

    await createPaymentMutation.mutateAsync(data);
  };

  const handleStoreChange = (e) => {
    const selectedStore = stores.find(s => s.id === e.target.value);
    setFormData({
      ...formData,
      store_id: e.target.value,
      store_name: selectedStore?.name || ''
    });
  };

  return (
    <ProtectedPage pageName="FormPagamentiContanti">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              Pagamenti Contanti
            </h1>
          </div>
          <p className="text-sm text-slate-500">Registra pagamenti effettuati in contanti</p>
        </div>

        {showSuccess && (
          <NeumorphicCard className="p-4 bg-green-50 border-2 border-green-500">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <p className="text-green-800 font-medium">Pagamento registrato con successo!</p>
            </div>
          </NeumorphicCard>
        )}

        <NeumorphicCard className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                <Store className="w-4 h-4" />
                Locale
              </label>
              <select
                value={formData.store_id}
                onChange={handleStoreChange}
                required
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              >
                <option value="">Seleziona locale...</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Importo (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.importo}
                onChange={(e) => setFormData({ ...formData, importo: e.target.value })}
                required
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-lg font-bold"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Descrizione Pagamento
              </label>
              <textarea
                value={formData.descrizione}
                onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                required
                rows={4}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none resize-none"
                placeholder="Descrivi il pagamento effettuato..."
              />
            </div>

            <NeumorphicButton
              type="submit"
              variant="primary"
              className="w-full flex items-center justify-center gap-2"
              disabled={createPaymentMutation.isPending}
            >
              <DollarSign className="w-5 h-5" />
              {createPaymentMutation.isPending ? 'Salvataggio...' : 'Registra Pagamento'}
            </NeumorphicButton>
          </form>
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Pagamenti Recenti</h2>
          
          {recentPayments.length > 0 ? (
            <div className="space-y-3">
              {recentPayments.map(payment => (
                <div key={payment.id} className="neumorphic-pressed p-4 rounded-xl">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-slate-400" />
                      <span className="font-bold text-slate-800">{payment.store_name}</span>
                    </div>
                    <span className="text-xl font-bold text-green-600">
                      €{payment.importo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-700 mb-2">{payment.descrizione}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(payment.data_pagamento), 'dd/MM/yyyy HH:mm', { locale: it })}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {payment.registrato_da}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-slate-300 opacity-50 mx-auto mb-4" />
              <p className="text-slate-500">Nessun pagamento registrato</p>
            </div>
          )}
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}