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
  Euro,
  CheckCircle,
  XCircle } from
'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { format, parseISO } from 'date-fns';

export default function Straordinari() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingDefaultRate, setEditingDefaultRate] = useState(false);
  const [formData, setFormData] = useState({
    dipendente_id: '',
    dipendente_nome: '',
    costo_orario_straordinario: '',
    note: ''
  });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: straordinariList = [] } = useQuery({
    queryKey: ['straordinari'],
    queryFn: () => base44.entities.StraordinarioDipendente.list('-updated_date', 100)
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: disponibilitaConfigs = [] } = useQuery({
    queryKey: ['disponibilita-config'],
    queryFn: () => base44.entities.DisponibilitaConfig.filter({ is_active: true })
  });

  const { data: attivitaPagamenti = [] } = useQuery({
    queryKey: ['attivita-pagamenti-straordinari'],
    queryFn: async () => {
      const attivita = await base44.entities.AttivitaCompletata.filter({
        attivita_nome: { $regex: 'Pagamento straordinari' }
      });
      return attivita.sort((a, b) => new Date(b.completato_at) - new Date(a.completato_at));
    }
  });

  const { data: pagamentiStraordinari = [] } = useQuery({
    queryKey: ['pagamenti-straordinari'],
    queryFn: () => base44.entities.PagamentoStraordinario.list('-data_turno', 500)
  });

  const { data: turniStraordinari = [] } = useQuery({
    queryKey: ['turni-straordinari'],
    queryFn: async () => {
      const shifts = await base44.entities.TurnoPlanday.list('-data', 500);
      return shifts.filter(s => 
        s.tipo_turno === 'Straordinario' || (s.ore_straordinarie && s.ore_straordinarie > 0)
      );
    }
  });

  const { data: attivitaCompletate = [] } = useQuery({
    queryKey: ['attivita-completate-straordinari'],
    queryFn: () => base44.entities.AttivitaCompletata.filter({
      attivita_nome: { $regex: 'Pagamento straordinari' }
    })
  });

  const activeConfig = disponibilitaConfigs[0] || null;

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
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StraordinarioDipendente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['straordinari'] });
    }
  });

  const updateDefaultRateMutation = useMutation({
    mutationFn: (newRate) => {
      if (activeConfig?.id) {
        return base44.entities.DisponibilitaConfig.update(activeConfig.id, {
          retribuzione_oraria_straordinari: newRate
        });
      }
      return base44.entities.DisponibilitaConfig.create({
        retribuzione_oraria_straordinari: newRate,
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disponibilita-config'] });
      setEditingDefaultRate(false);
    }
  });

  const effettuaPagamentoMutation = useMutation({
    mutationFn: async ({ turnoId, dipendente_id, dipendente_nome, store_id, store_name, data_turno, ore_straordinarie, costo_orario, importo_totale }) => {
      const newPagamento = await base44.entities.PagamentoStraordinario.create({
        turno_id: turnoId,
        dipendente_id,
        dipendente_nome,
        store_id,
        store_name,
        data_turno,
        ore_straordinarie,
        costo_orario,
        importo_totale,
        pagato: true,
        data_pagamento: new Date().toISOString(),
        pagato_da: currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email,
        pagato_da_id: currentUser?.id
      });

      await base44.entities.Prelievo.create({
        store_id: 'pagamento_straordinario',
        store_name: 'Pagamento Straordinario',
        rilevato_da: currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email,
        importo: importo_totale,
        data_prelievo: new Date().toISOString(),
        note: `Pagamento straordinario a ${dipendente_nome}`,
        impostato_da: currentUser?.email || ''
      });

      return newPagamento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagamenti-straordinari'] });
      queryClient.invalidateQueries({ queryKey: ['prelievi'] });
    }
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
    const employee = employees.find((emp) => emp.id === employeeId);
    setFormData({
      ...formData,
      dipendente_id: employeeId,
      dipendente_nome: employee?.full_name || ''
    });
  };

  const getStoreName = (storeId) => stores.find((s) => s.id === storeId)?.name || '-';

  const handleEffettuaPagamento = async (turno, oreStr, costoOrario, importoTotale) => {
    if (!confirm(`Confermare il pagamento di €${importoTotale.toFixed(2)} a ${turno.dipendente_nome}?`)) {
      return;
    }

    effettuaPagamentoMutation.mutate({
      turnoId: turno.id,
      dipendente_id: turno.dipendente_id,
      dipendente_nome: turno.dipendente_nome,
      store_id: turno.store_id,
      store_name: turno.store_nome,
      data_turno: turno.data,
      ore_straordinarie: oreStr,
      costo_orario: costoOrario,
      importo_totale: importoTotale
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="bg-clip-text text-slate-50 mb-1 text-3xl font-bold from-slate-700 to-slate-900">Costi Straordinari Dipendenti

        </h1>
          <p className="text-slate-50 text-sm">Gestisci il costo orario dello straordinario per ogni dipendente</p>
        </div>

        <NeumorphicCard className="p-6 bg-blue-50 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                Tariffa Oraria Default Straordinari
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Applicata ai dipendenti senza tariffa personalizzata
              </p>
            </div>
            {!editingDefaultRate ?
          <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-blue-600">
                  €{(activeConfig?.retribuzione_oraria_straordinari || 10).toFixed(2)}/h
                </span>
                <button
              onClick={() => setEditingDefaultRate(true)}
              className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors">

                  <Edit className="w-5 h-5" />
                </button>
              </div> :

          <div className="flex items-center gap-2">
                <input
              type="number"
              step="0.01"
              min="0"
              defaultValue={activeConfig?.retribuzione_oraria_straordinari || 10}
              className="w-32 neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm"
              id="defaultRate" />

                <button
              onClick={() => {
                const input = document.getElementById('defaultRate');
                updateDefaultRateMutation.mutate(parseFloat(input.value));
              }}
              className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600">

                  <Save className="w-5 h-5" />
                </button>
                <button
              onClick={() => setEditingDefaultRate(false)}
              className="p-2 rounded-lg hover:bg-slate-100">

                  <X className="w-5 h-5" />
                </button>
              </div>
          }
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Elenco Dipendenti</h2>
            <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 font-medium">

              <Plus className="w-5 h-5" />
              Aggiungi Costo
            </button>
          </div>

          {straordinariList.length === 0 ?
        <div className="text-center py-12">
              <Clock className="w-16 h-16 text-slate-300 opacity-50 mx-auto mb-4" />
              <p className="text-slate-500">Nessun costo straordinario configurato</p>
            </div> :

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
                  {straordinariList.map((item) =>
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
                      className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">

                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                      onClick={() => deleteMutation.mutate(item.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors">

                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
              )}
                </tbody>
              </table>
            </div>
        }
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Turni Straordinari
            </h2>
          </div>

          {turniStraordinari.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-slate-300 opacity-50 mx-auto mb-4" />
              <p className="text-slate-500">Nessun turno straordinario trovato</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-blue-600">
                    <th className="text-left p-3 text-slate-600 font-medium text-sm">Data</th>
                    <th className="text-left p-3 text-slate-600 font-medium text-sm">Dipendente</th>
                    <th className="text-left p-3 text-slate-600 font-medium text-sm">Locale</th>
                    <th className="text-center p-3 text-slate-600 font-medium text-sm">Ore Straord.</th>
                    <th className="text-right p-3 text-slate-600 font-medium text-sm">€/h</th>
                    <th className="text-right p-3 text-slate-600 font-medium text-sm">Totale</th>
                    <th className="text-center p-3 text-slate-600 font-medium text-sm">Stato Pagamento</th>
                    <th className="text-center p-3 text-slate-600 font-medium text-sm">Azione</th>
                  </tr>
                </thead>
                <tbody>
                  {turniStraordinari.map((turno) => {
                    const pagamento = pagamentiStraordinari.find(p => p.turno_id === turno.id);
                    const dipConfig = straordinariList.find(c => c.dipendente_id === turno.dipendente_id);
                    const costoOrario = dipConfig?.costo_orario_straordinario || activeConfig?.retribuzione_oraria_straordinari || 10;
                    
                    // Calculate ore straordinarie from turno times if not set
                    let oreStr = turno.ore_straordinarie || 0;
                    if (oreStr === 0 && turno.ora_inizio && turno.ora_fine) {
                      const [startH, startM] = turno.ora_inizio.split(':').map(Number);
                      const [endH, endM] = turno.ora_fine.split(':').map(Number);
                      const startMinutes = startH * 60 + startM;
                      let endMinutes = endH * 60 + endM;
                      if (endMinutes < startMinutes) endMinutes += 24 * 60;
                      oreStr = (endMinutes - startMinutes) / 60;
                    }
                    
                    const importoTotale = oreStr * costoOrario;

                    // Check if already paid via old logic (AttivitaCompletata)
                    const pagatoVecchiaLogica = attivitaCompletate.find(ac => 
                      ac.turno_id === turno.id && 
                      ac.attivita_nome?.includes('Pagamento straordinari') &&
                      ac.importo_pagato
                    );

                    const isPagato = pagamento?.pagato || !!pagatoVecchiaLogica;

                    return (
                      <tr key={turno.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-700 text-sm">
                              {turno.data ? format(parseISO(turno.data), 'dd/MM/yyyy') : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-700 font-medium">{turno.dipendente_nome}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-700 text-sm">{turno.store_nome}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-slate-700 font-bold text-sm">
                            {oreStr.toFixed(2)}h
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="text-slate-600 text-sm">
                            €{costoOrario.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="text-lg font-bold text-blue-600">
                            €{importoTotale.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {isPagato ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                                <CheckCircle className="w-3 h-3" />
                                Pagato
                              </div>
                              {pagamento?.data_pagamento && (
                                <>
                                  <span className="text-xs text-slate-500">
                                    {format(parseISO(pagamento.data_pagamento), 'dd/MM HH:mm')}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    da {pagamento.pagato_da || '-'}
                                  </span>
                                </>
                              )}
                              {pagatoVecchiaLogica && !pagamento && (
                                <span className="text-xs text-slate-500">
                                  (vecchia logica - {format(parseISO(pagatoVecchiaLogica.completato_at), 'dd/MM HH:mm')})
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">
                              <XCircle className="w-3 h-3" />
                              Non Pagato
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {!isPagato && (
                            <button
                              onClick={() => handleEffettuaPagamento(turno, oreStr, costoOrario, importoTotale)}
                              disabled={effettuaPagamentoMutation.isPending}
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-medium hover:from-green-600 hover:to-green-700 disabled:opacity-50">
                              Paga
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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

          {pagamentiStraordinari.length === 0 ?
        <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-slate-300 opacity-50 mx-auto mb-4" />
              <p className="text-slate-500">Nessun pagamento straordinario registrato</p>
            </div> :

        <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-green-600">
                    <th className="text-left p-3 text-slate-600 font-medium text-sm">Data Turno</th>
                    <th className="text-left p-3 text-slate-600 font-medium text-sm">Dipendente</th>
                    <th className="text-left p-3 text-slate-600 font-medium text-sm">Locale</th>
                    <th className="text-center p-3 text-slate-600 font-medium text-sm">Ore</th>
                    <th className="text-right p-3 text-slate-600 font-medium text-sm">Importo</th>
                    <th className="text-center p-3 text-slate-600 font-medium text-sm">Stato</th>
                    <th className="text-left p-3 text-slate-600 font-medium text-sm">Pagato da</th>
                    <th className="text-left p-3 text-slate-600 font-medium text-sm">Data Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentiStraordinari.map((pagamento) => (
                    <tr key={pagamento.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700 text-sm">
                            {pagamento.data_turno ? format(parseISO(pagamento.data_turno), 'dd/MM/yyyy') : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700 font-medium">{pagamento.dipendente_nome}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-slate-700 text-sm">{pagamento.store_name}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-slate-700 font-bold text-sm">
                          {pagamento.ore_straordinarie}h
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-lg font-bold text-green-600">
                          €{pagamento.importo_totale?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {pagamento.pagato ? (
                          <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            Pagato
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">
                            <XCircle className="w-3 h-3" />
                            Non Pagato
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-slate-700 text-sm">
                          {pagamento.pagato_da || '-'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-slate-700 text-sm">
                          {pagamento.data_pagamento ? format(parseISO(pagamento.data_pagamento), 'dd/MM/yyyy HH:mm') : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
        </NeumorphicCard>

        {showForm &&
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
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm">

                    <option value="">Seleziona dipendente...</option>
                    {employees.map((emp) =>
                <option key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </option>
                )}
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
                  className="w-full neumorphic-pressed px-4 py-3 pl-10 rounded-xl text-slate-700 outline-none text-sm" />

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
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

                </div>

                <div className="flex gap-3 pt-4">
                  <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-3 rounded-xl neumorphic-flat text-slate-700 font-medium">

                    Annulla
                  </button>
                  <button
                type="submit"
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium flex items-center justify-center gap-2">

                    <Save className="w-4 h-4" />
                    Salva
                  </button>
                </div>
              </form>
            </NeumorphicCard>
          </div>
      }
    </div>);

}