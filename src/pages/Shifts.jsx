import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Calendar, User, MapPin, CheckCircle, XCircle, AlertCircle, Edit, Save, X, Trash2, Plus, Search, AlertTriangle, CalendarOff } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format } from 'date-fns';

export default function Shifts() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [dateFilter, setDateFilter] = useState('week');
  const [editingShift, setEditingShift] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMissingDaysModal, setShowMissingDaysModal] = useState(false);
  const [missingDays, setMissingDays] = useState([]);
  const [closedDays, setClosedDays] = useState(() => {
    const saved = localStorage.getItem('closedDays');
    return saved ? JSON.parse(saved) : {};
  });
  const [newShift, setNewShift] = useState({
    employee_name: '',
    store_id: '',
    shift_date: '',
    scheduled_start: '',
    scheduled_end: '',
    employee_group_name: '',
    shift_type: ''
  });

  const queryClient = useQueryClient();

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-shift_date'),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setEditingShift(null);
      setEditFormData(null);
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: (id) => base44.entities.Shift.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });

  const createShiftMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setShowCreateModal(false);
      setNewShift({
        employee_name: '',
        store_id: '',
        shift_date: '',
        scheduled_start: '',
        scheduled_end: '',
        employee_group_name: '',
        shift_type: ''
      });
    },
  });

  const handleCreateShift = () => {
    if (!newShift.employee_name || !newShift.store_id || !newShift.shift_date || !newShift.scheduled_start || !newShift.scheduled_end) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    const selectedStoreObj = stores.find(s => s.id === newShift.store_id);
    
    createShiftMutation.mutate({
      employee_name: newShift.employee_name,
      store_id: newShift.store_id,
      store_name: selectedStoreObj?.name || '',
      shift_date: newShift.shift_date,
      scheduled_start: `${newShift.shift_date}T${newShift.scheduled_start}:00`,
      scheduled_end: `${newShift.shift_date}T${newShift.scheduled_end}:00`,
      employee_group_name: newShift.employee_group_name,
      shift_type: newShift.shift_type,
      timbratura_mancata: false
    });
  };

  const checkMissingDays = () => {
    const startDate = new Date('2025-11-01');
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Ieri
    
    const missingByStore = {};
    
    stores.forEach(store => {
      const storeMissingDays = [];
      const storeClosedDays = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const hasShift = shifts.some(s => 
          s.shift_date === dateStr && 
          (s.store_id === store.id || s.store_name === store.name)
        );
        
        const isClosed = closedDays[`${store.id}-${dateStr}`];
        
        if (!hasShift) {
          if (isClosed) {
            storeClosedDays.push(dateStr);
          } else {
            storeMissingDays.push(dateStr);
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      if (storeMissingDays.length > 0 || storeClosedDays.length > 0) {
        missingByStore[store.id] = {
          storeName: store.name,
          days: storeMissingDays,
          closedDays: storeClosedDays
        };
      }
    });
    
    setMissingDays(missingByStore);
    setShowMissingDaysModal(true);
  };

  const markAsClosed = (storeId, date) => {
    const key = `${storeId}-${date}`;
    const updated = { ...closedDays, [key]: true };
    setClosedDays(updated);
    localStorage.setItem('closedDays', JSON.stringify(updated));
    
    // Update missing days - move from days to closedDays
    setMissingDays(prev => {
      const newMissing = { ...prev };
      if (newMissing[storeId]) {
        newMissing[storeId].days = newMissing[storeId].days.filter(d => d !== date);
        newMissing[storeId].closedDays = [...(newMissing[storeId].closedDays || []), date].sort();
      }
      return newMissing;
    });
  };

  const unmarkAsClosed = (storeId, date) => {
    const key = `${storeId}-${date}`;
    const updated = { ...closedDays };
    delete updated[key];
    setClosedDays(updated);
    localStorage.setItem('closedDays', JSON.stringify(updated));
    
    // Update missing days - move from closedDays to days
    setMissingDays(prev => {
      const newMissing = { ...prev };
      if (newMissing[storeId]) {
        newMissing[storeId].closedDays = (newMissing[storeId].closedDays || []).filter(d => d !== date);
        newMissing[storeId].days = [...(newMissing[storeId].days || []), date].sort();
      }
      return newMissing;
    });
  };

  const openCreateShiftWithDate = (storeId, date) => {
    setNewShift({
      ...newShift,
      store_id: storeId,
      shift_date: date
    });
    setShowMissingDaysModal(false);
    setShowCreateModal(true);
  };

  const handleEdit = (shift) => {
    setEditingShift(shift.id);
    setEditFormData({
      store_id: shift.store_id,
      store_name: shift.store_name,
      scheduled_start: (() => {
        try {
          return shift.scheduled_start ? new Date(shift.scheduled_start).toISOString().slice(0, 16) : '';
        } catch (e) {
          return '';
        }
      })(),
      scheduled_end: (() => {
        try {
          return shift.scheduled_end ? new Date(shift.scheduled_end).toISOString().slice(0, 16) : '';
        } catch (e) {
          return '';
        }
      })(),
      actual_start: (() => {
        try {
          return shift.actual_start ? new Date(shift.actual_start).toISOString().slice(0, 16) : '';
        } catch (e) {
          return '';
        }
      })(),
      actual_end: (() => {
        try {
          return shift.actual_end ? new Date(shift.actual_end).toISOString().slice(0, 16) : '';
        } catch (e) {
          return '';
        }
      })(),
      employee_group_name: shift.employee_group_name || '',
      shift_type: shift.shift_type || '',
      timbratura_mancata: shift.timbratura_mancata || false,
    });
  };

  const handleSave = () => {
    if (!editFormData) return;

    const selectedStore = stores.find(s => s.id === editFormData.store_id);

    updateShiftMutation.mutate({
      id: editingShift,
      data: {
        store_id: editFormData.store_id,
        store_name: selectedStore?.name || editFormData.store_name,
        scheduled_start: editFormData.scheduled_start,
        scheduled_end: editFormData.scheduled_end,
        actual_start: editFormData.actual_start || null,
        actual_end: editFormData.actual_end || null,
        employee_group_name: editFormData.employee_group_name,
        shift_type: editFormData.shift_type,
        timbratura_mancata: editFormData.timbratura_mancata,
      }
    });
  };

  const handleCancel = () => {
    setEditingShift(null);
    setEditFormData(null);
  };

  // Filter shifts
  const filteredShifts = shifts.filter(shift => {
    if (selectedStore !== 'all' && shift.store_id !== selectedStore) return false;
    if (selectedEmployee !== 'all' && shift.employee_name !== selectedEmployee) return false;
    
    // Date filter
    if (!shift.shift_date) return false;
    try {
      const shiftDate = new Date(shift.shift_date);
      if (isNaN(shiftDate.getTime())) return false;
      const now = new Date();
      const daysDiff = Math.floor((now - shiftDate) / (1000 * 60 * 60 * 24));
      
      if (dateFilter === 'today' && daysDiff !== 0) return false;
      if (dateFilter === 'week' && daysDiff > 7) return false;
      if (dateFilter === 'month' && daysDiff > 30) return false;
      if (dateFilter === 'all') return true;
    } catch (e) {
      return false;
    }
    
    return true;
  });

  const getStatusColor = (shift) => {
    if (!shift.actual_start) return 'text-gray-400';
    if (!shift.actual_end) return 'text-blue-600';
    return 'text-green-600';
  };

  const getStatusIcon = (shift) => {
    if (!shift.actual_start) return <XCircle className="w-5 h-5" />;
    if (!shift.actual_end) return <Clock className="w-5 h-5" />;
    return <CheckCircle className="w-5 h-5" />;
  };

  const getStatusText = (shift) => {
    if (!shift.actual_start) return 'Non timbrato';
    if (!shift.actual_end) return 'In corso';
    return 'Completato';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Turni Dipendenti</h1>
          <p className="text-[#9b9b9b]">Gestione e monitoraggio turni</p>
        </div>
        <div className="flex gap-2">
          <NeumorphicButton
            onClick={checkMissingDays}
            className="flex items-center gap-2"
          >
            <Search className="w-5 h-5" />
            Verifica Giorni Mancanti
          </NeumorphicButton>
          <NeumorphicButton
            onClick={() => setShowCreateModal(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuovo Turno
          </NeumorphicButton>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <NeumorphicCard className="px-4 py-2">
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none"
          >
            <option value="all">Tutti i Locali</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </NeumorphicCard>

        <NeumorphicCard className="px-4 py-2">
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none"
          >
            <option value="all">Tutti i Dipendenti</option>
            {[...new Set(shifts.map(s => s.employee_name))].sort().map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </NeumorphicCard>

        <NeumorphicCard className="px-4 py-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none"
          >
            <option value="today">Oggi</option>
            <option value="week">Ultima Settimana</option>
            <option value="month">Ultimo Mese</option>
            <option value="all">Tutti</option>
          </select>
        </NeumorphicCard>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        <NeumorphicCard className="p-6 text-center">
          <p className="text-sm text-[#9b9b9b] mb-2">Totale Turni</p>
          <p className="text-3xl font-bold text-[#6b6b6b]">{filteredShifts.length}</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <p className="text-sm text-[#9b9b9b] mb-2">Completati</p>
          <p className="text-3xl font-bold text-green-600">
            {filteredShifts.filter(s => s.actual_start && s.actual_end).length}
          </p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <p className="text-sm text-[#9b9b9b] mb-2">In Corso</p>
          <p className="text-3xl font-bold text-blue-600">
            {filteredShifts.filter(s => s.actual_start && !s.actual_end).length}
          </p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <p className="text-sm text-[#9b9b9b] mb-2">Non Timbrati</p>
          <p className="text-3xl font-bold text-gray-400">
            {filteredShifts.filter(s => !s.actual_start).length}
          </p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <p className="text-sm text-[#9b9b9b] mb-2">Timbrature Mancate</p>
          <p className="text-3xl font-bold text-red-600">
            {filteredShifts.filter(s => s.timbratura_mancata === true).length}
          </p>
        </NeumorphicCard>
      </div>

      {/* Shifts Table */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Lista Turni</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#c1c1c1]">
                <th className="text-left p-3 text-[#9b9b9b] font-medium">Data</th>
                <th className="text-left p-3 text-[#9b9b9b] font-medium">Dipendente</th>
                <th className="text-left p-3 text-[#9b9b9b] font-medium">Locale</th>
                <th className="text-left p-3 text-[#9b9b9b] font-medium">Orario</th>
                <th className="text-center p-3 text-[#9b9b9b] font-medium">Ruolo</th>
                <th className="text-center p-3 text-[#9b9b9b] font-medium">Tipo Turno</th>
                <th className="text-center p-3 text-[#9b9b9b] font-medium">Stato</th>
                <th className="text-center p-3 text-[#9b9b9b] font-medium">Timbratura Mancata</th>
                <th className="text-center p-3 text-[#9b9b9b] font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredShifts.length > 0 ? (
                filteredShifts.map((shift) => {
                  const isEditing = editingShift === shift.id;

                  return (
                    <tr key={shift.id} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                      <td className="p-3 text-[#6b6b6b]">
                        {(() => {
                          try {
                            return format(new Date(shift.shift_date), 'dd/MM/yyyy');
                          } catch (e) {
                            return shift.shift_date;
                          }
                        })()}
                      </td>
                      <td className="p-3">
                        <span className="text-[#6b6b6b] font-medium">{shift.employee_name}</span>
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <select
                            value={editFormData.store_id}
                            onChange={(e) => setEditFormData({ ...editFormData, store_id: e.target.value })}
                            className="neumorphic-pressed px-2 py-1 rounded-lg text-sm text-[#6b6b6b] outline-none"
                          >
                            {stores.map(store => (
                              <option key={store.id} value={store.id}>{store.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[#6b6b6b]">{shift.store_name}</span>
                        )}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <div className="space-y-1">
                            <div>
                              <label className="text-xs text-[#9b9b9b]">Previsto:</label>
                              <input
                                type="datetime-local"
                                value={editFormData.scheduled_start}
                                onChange={(e) => setEditFormData({ ...editFormData, scheduled_start: e.target.value })}
                                className="neumorphic-pressed px-2 py-1 rounded-lg text-xs text-[#6b6b6b] outline-none w-full"
                              />
                              <input
                                type="datetime-local"
                                value={editFormData.scheduled_end}
                                onChange={(e) => setEditFormData({ ...editFormData, scheduled_end: e.target.value })}
                                className="neumorphic-pressed px-2 py-1 rounded-lg text-xs text-[#6b6b6b] outline-none w-full mt-1"
                              />
                            </div>
                            <div className="mt-2">
                              <label className="text-xs text-[#9b9b9b]">Effettivo:</label>
                              <input
                                type="datetime-local"
                                value={editFormData.actual_start || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, actual_start: e.target.value })}
                                className="neumorphic-pressed px-2 py-1 rounded-lg text-xs text-[#6b6b6b] outline-none w-full"
                                placeholder="Inizio effettivo"
                              />
                              <input
                                type="datetime-local"
                                value={editFormData.actual_end || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, actual_end: e.target.value })}
                                className="neumorphic-pressed px-2 py-1 rounded-lg text-xs text-[#6b6b6b] outline-none w-full mt-1"
                                placeholder="Fine effettiva"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-[#6b6b6b] text-sm">
                            {(() => {
                              try {
                                return shift.scheduled_start && format(new Date(shift.scheduled_start), 'HH:mm');
                              } catch (e) {
                                return 'N/A';
                              }
                            })()} - {(() => {
                              try {
                                return shift.scheduled_end && format(new Date(shift.scheduled_end), 'HH:mm');
                              } catch (e) {
                                return 'N/A';
                              }
                            })()}
                            {shift.actual_start && (
                              <div className="text-xs text-[#9b9b9b] mt-1">
                                Effettivo: {(() => {
                                  try {
                                    return format(new Date(shift.actual_start), 'HH:mm');
                                  } catch (e) {
                                    return 'N/A';
                                  }
                                })()}
                                {shift.actual_end && (() => {
                                  try {
                                    return ` - ${format(new Date(shift.actual_end), 'HH:mm')}`;
                                  } catch (e) {
                                    return '';
                                  }
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {isEditing ? (
                          <select
                            value={editFormData.employee_group_name}
                            onChange={(e) => setEditFormData({ ...editFormData, employee_group_name: e.target.value })}
                            className="neumorphic-pressed px-2 py-1 rounded-lg text-sm text-[#6b6b6b] outline-none w-full"
                          >
                            <option value="">Seleziona ruolo</option>
                            <option value="Pizzaiolo">Pizzaiolo</option>
                            <option value="Cassiere">Cassiere</option>
                            <option value="Store Manager">Store Manager</option>
                            <option value="FT">FT</option>
                            <option value="PT">PT</option>
                            <option value="CM">CM</option>
                          </select>
                        ) : (
                          <span className="text-sm text-[#6b6b6b]">
                            {shift.employee_group_name || '-'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {isEditing ? (
                          <select
                            value={editFormData.shift_type}
                            onChange={(e) => setEditFormData({ ...editFormData, shift_type: e.target.value })}
                            className="neumorphic-pressed px-2 py-1 rounded-lg text-sm text-[#6b6b6b] outline-none w-full"
                          >
                            <option value="">Turno normale</option>
                            <option value="Affiancamento">Affiancamento</option>
                            <option value="Straordinario">Straordinario</option>
                            <option value="Ferie">Ferie</option>
                            <option value="Malattia">Malattia</option>
                            <option value="Malattia (No Certificato)">Malattia (No Certificato)</option>
                            <option value="Permesso">Permesso</option>
                            <option value="Assenza">Assenza</option>
                            <option value="Ritardo">Ritardo</option>
                          </select>
                        ) : (
                          <span className="text-sm text-[#6b6b6b]">
                            {shift.shift_type || '-'}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className={`flex items-center justify-center gap-2 ${getStatusColor(shift)}`}>
                          {getStatusIcon(shift)}
                          <span className="text-sm font-medium">{getStatusText(shift)}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={editFormData.timbratura_mancata}
                              onChange={(e) => setEditFormData({ ...editFormData, timbratura_mancata: e.target.checked })}
                              className="w-5 h-5"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            {shift.timbratura_mancata === true ? (
                              <div className="flex items-center gap-2 text-red-600">
                                <AlertCircle className="w-5 h-5" />
                                <span className="text-sm font-medium">Sì</span>
                              </div>
                            ) : (
                              <span className="text-sm text-[#9b9b9b]">-</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={handleSave}
                              className="neumorphic-flat p-2 rounded-lg hover:bg-green-50 transition-colors"
                              title="Salva"
                            >
                              <Save className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={handleCancel}
                              className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                              title="Annulla"
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(shift)}
                              className="neumorphic-flat p-2 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Modifica"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Sei sicuro di voler eliminare questo turno?')) {
                                  deleteShiftMutation.mutate(shift.id);
                                }
                              }}
                              className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                              title="Elimina"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-[#9b9b9b]">
                    Nessun turno trovato
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </NeumorphicCard>

      {/* Missing Days Modal */}
      {showMissingDaysModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#6b6b6b] flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
                Giorni Senza Turni
              </h2>
              <button
                onClick={() => setShowMissingDaysModal(false)}
                className="neumorphic-flat p-2 rounded-lg"
              >
                <X className="w-5 h-5 text-[#6b6b6b]" />
              </button>
            </div>

            <p className="text-sm text-[#9b9b9b] mb-4">
              Controllo dal 1 Novembre 2025 ad oggi. I giorni elencati non hanno turni registrati.
            </p>

            {Object.keys(missingDays).length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-[#6b6b6b] font-medium">Nessun giorno mancante!</p>
                <p className="text-sm text-[#9b9b9b]">Tutti i giorni hanno almeno un turno registrato.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(missingDays).map(([storeId, data]) => (
                  <div key={storeId} className="neumorphic-pressed p-4 rounded-xl">
                    <h3 className="font-bold text-[#6b6b6b] mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {data.storeName}
                      <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">
                        {data.days.length} mancanti
                      </span>
                      {(data.closedDays || []).length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                          {data.closedDays.length} chiusure
                        </span>
                      )}
                    </h3>
                    
                    {/* Missing days */}
                    {data.days.length > 0 && (
                      <div className="space-y-2 mb-3">
                        <p className="text-xs font-medium text-orange-600 mb-1">Giorni senza turni:</p>
                        {data.days.slice(0, 10).map(date => (
                          <div key={date} className="flex items-center justify-between bg-white p-2 rounded-lg border-l-4 border-orange-400">
                            <span className="text-sm text-[#6b6b6b]">
                              {new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => markAsClosed(storeId, date)}
                                className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-1"
                              >
                                <CalendarOff className="w-3 h-3" />
                                Chiusura
                              </button>
                              <button
                                onClick={() => openCreateShiftWithDate(storeId, date)}
                                className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                Aggiungi Turno
                              </button>
                            </div>
                          </div>
                        ))}
                        {data.days.length > 10 && (
                          <p className="text-xs text-[#9b9b9b] text-center">
                            ... e altri {data.days.length - 10} giorni
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Closed days */}
                    {(data.closedDays || []).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-600 mb-1">Giorni segnati come chiusura:</p>
                        {data.closedDays.slice(0, 10).map(date => (
                          <div key={date} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border-l-4 border-gray-400">
                            <span className="text-sm text-[#6b6b6b] flex items-center gap-2">
                              <CalendarOff className="w-4 h-4 text-gray-500" />
                              {new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => unmarkAsClosed(storeId, date)}
                                className="px-3 py-1 rounded-lg text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 flex items-center gap-1"
                              >
                                <X className="w-3 h-3" />
                                Rimuovi chiusura
                              </button>
                              <button
                                onClick={() => openCreateShiftWithDate(storeId, date)}
                                className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                Aggiungi Turno
                              </button>
                            </div>
                          </div>
                        ))}
                        {data.closedDays.length > 10 && (
                          <p className="text-xs text-[#9b9b9b] text-center">
                            ... e altri {data.closedDays.length - 10} giorni
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </NeumorphicCard>
        </div>
      )}

      {/* Create Shift Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#6b6b6b]">Nuovo Turno</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="neumorphic-flat p-2 rounded-lg"
              >
                <X className="w-5 h-5 text-[#6b6b6b]" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Dipendente *</label>
                <select
                  value={newShift.employee_name}
                  onChange={(e) => setNewShift({ ...newShift, employee_name: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                >
                  <option value="">Seleziona dipendente...</option>
                  {[...new Set(shifts.map(s => s.employee_name))].sort().map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Locale *</label>
                <select
                  value={newShift.store_id}
                  onChange={(e) => setNewShift({ ...newShift, store_id: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                >
                  <option value="">Seleziona locale...</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Data *</label>
                <input
                  type="date"
                  value={newShift.shift_date}
                  onChange={(e) => setNewShift({ ...newShift, shift_date: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Inizio *</label>
                  <input
                    type="time"
                    value={newShift.scheduled_start}
                    onChange={(e) => setNewShift({ ...newShift, scheduled_start: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Fine *</label>
                  <input
                    type="time"
                    value={newShift.scheduled_end}
                    onChange={(e) => setNewShift({ ...newShift, scheduled_end: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Ruolo</label>
                <select
                  value={newShift.employee_group_name}
                  onChange={(e) => setNewShift({ ...newShift, employee_group_name: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                >
                  <option value="">Seleziona ruolo...</option>
                  <option value="Pizzaiolo">Pizzaiolo</option>
                  <option value="Cassiere">Cassiere</option>
                  <option value="Store Manager">Store Manager</option>
                  <option value="FT">FT</option>
                  <option value="PT">PT</option>
                  <option value="CM">CM</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Tipo Turno</label>
                <select
                  value={newShift.shift_type}
                  onChange={(e) => setNewShift({ ...newShift, shift_type: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                >
                  <option value="">Turno normale</option>
                  <option value="Affiancamento">Affiancamento</option>
                  <option value="Straordinario">Straordinario</option>
                  <option value="Ferie">Ferie</option>
                  <option value="Malattia">Malattia</option>
                  <option value="Permesso">Permesso</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <NeumorphicButton
                onClick={() => setShowCreateModal(false)}
                className="flex-1"
              >
                Annulla
              </NeumorphicButton>
              <NeumorphicButton
                onClick={handleCreateShift}
                variant="primary"
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Crea Turno
              </NeumorphicButton>
            </div>
          </NeumorphicCard>
        </div>
      )}
    </div>
  );
}