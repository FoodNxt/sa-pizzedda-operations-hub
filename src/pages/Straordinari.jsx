import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  Plus,
  Trash2,
  Edit,
  X,
  Save,
  DollarSign,
  User,
  Calendar,
  Euro
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { format, parseISO } from 'date-fns';

export default function Straordinari() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    dipendente_id: '',
    dipendente_nome: '',
    costo_orario_straordinario: '',
    note: ''
  });

  const queryClient = useQueryClient();

  const { data: straordinariList = [] } = useQuery({
    queryKey: ['straordinari'],
    queryFn: () => base44.entities.StraordinarioDipendente.list('-updated_date', 100),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: attivitaPagamenti = [] } = useQuery({
    queryKey: ['attivita-pagamenti-straordinari'],
    queryFn: async () => {
      const attivita = await base44.entities.AttivitaCompletata.filter({
        attivita_nome: { $regex: 'Pagamento straordinari' }
      });
      return attivita.sort((a, b) => new Date(b.completato_at) - new Date(a.completato_at));
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingId) {
        return base44.entities.StraordinarioDipendente.update(editingId, data);
      }
      return base44.entities.StraordinarioDipendente.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['straordinari'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StraordinarioDipendente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['straordinari'] });
    },
  });

  const resetForm = () => {
    setFormData({
      dipendente_id: '',
      dipendente_nome: '',
      costo_orario_straordinario: '',
      note: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item) => {
    setFormData({
      dipendente_id: item.dipendente_id,
      dipendente_nome: item.dipendente_nome,
      costo_orario_straordinario: item.costo_orario_straordinario,
      note: item.note || ''
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.dipendente_id && formData.costo_orario_straordinario) {
      saveMutation.mutate({
        dipendente_id: formData.dipendente_id,
        dipendente_nome: formData.dipendente_nome,
        costo_orario_straordinario: parseFloat(formData.costo_orario_straordinario),
        note: formData.note
      });
    }
  };

  const handleSelectEmployee = (e) => {
    const employeeId = e.target.value;
    const employee = employees.find(emp => emp.id === employeeId);
    setFormData({
      ...formData,
      dipendente_id: employeeId,
      dipendente_nome: employee?.full_name || ''
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
            Costi Straordinari Dipendenti
          </h1>
          <p className="text-sm text-slate-500">Gestisci il costo orario dello straordinario per ogni dipendente</p>
        </div>

        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Elenco Dipendenti</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 font-medium"
            >
              <Plus className="w-5 h-5" />
              Aggiungi Costo
            </button>
          </div>

          {straordinariList.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-slate-300 opacity-50 mx-auto mb-4" />
              <p className="text-slate-500">Nessun costo straordinario configurato</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-blue-600">
                    <th className="text-left p-3 text-slate-600 font-medium text-sm">Dipendente</th>
                    <th className="text-right p-3 text-slate-600 font-medium text-sm">Costo Orario Straordinario</th>
                    <th className="text-left p-3 text-slate-600 font-medium text-sm">Note</th>
                    <th className="text-right p-3 text-slate-600 font-medium text-sm">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {straordinariList.map((item) => (
                    <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700 font-medium">{item.dipendente_nome}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-lg font-bold text-blue-600">
                          €{parseFloat(item.costo_orario_straordinario).toFixed(2)}/h
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-slate-500">{item.note || '-'}</span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(item.id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Euro className="w-5 h-5 text-green-600" />
              Storico Pagamenti Straordinari
            </h2>
          </div>

          {attivitaPagamenti.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-slate-300 opacity-50 mx-auto mb-4" />
              <p className="text-slate-500">Nessun pagamento straordinario registrato</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-green-600">
                    <th className="text-left p-3 text-slate-600 font-medium text-sm">Data</th>
                    <th className="text-left p-3 text-slate-600 font-medium text-sm">Dipendente Pagato</th>
                    <th className="text-left p-3 text-slate-600 font-medium text-sm">Completato da</th>
                    <th className="text-left p-3 text-slate-600 font-medium text-sm">Locale</th>
                    <th className="text-right p-3 text-slate-600 font-medium text-sm">Importo</th>
                  </tr>
                </thead>
                <tbody>
                  {attivitaPagamenti.map((attivita) => (
                    <tr key={attivita.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700 text-sm">
                            {attivita.completato_at ? format(parseISO(attivita.completato_at), 'dd/MM/yyyy HH:mm') : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-slate-700 font-medium">{attivita.dipendente_nome}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-slate-700 text-sm">{attivita.created_by || '-'}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-slate-700 text-sm">{attivita.store_id || '-'}</span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-lg font-bold text-green-600">
                          €{attivita.importo_pagato ? parseFloat(attivita.importo_pagato).toFixed(2) : '0.00'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </NeumorphicCard>

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800">
                  {editingId ? 'Modifica Costo Straordinario' : 'Aggiungi Costo Straordinario'}
                </h2>
                <button onClick={resetForm} className="p-2 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-slate-600 mb-2 block">Dipendente</label>
                  <select
                    value={formData.dipendente_id}
                    onChange={handleSelectEmployee}
                    required
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                  >
                    <option value="">Seleziona dipendente...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-2 block">Costo Orario Straordinario (€)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.costo_orario_straordinario}
                      onChange={(e) => setFormData({
                        ...formData,
                        costo_orario_straordinario: e.target.value
                      })}
                      required
                      placeholder="Es. 15.50"
                      className="w-full neumorphic-pressed px-4 py-3 pl-10 rounded-xl text-slate-700 outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-2 block">Note (opzionale)</label>
                  <input
                    type="text"
                    value={formData.note}
                    onChange={(e) => setFormData({
                      ...formData,
                      note: e.target.value
                    })}
                    placeholder="Es. Aumentato da gennaio 2026"
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-3 rounded-xl neumorphic-flat text-slate-700 font-medium"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Salva
                  </button>
                </div>
              </form>
            </NeumorphicCard>
          </div>
        )}
    </div>
  );
}