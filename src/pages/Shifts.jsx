import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Calendar, User, MapPin, CheckCircle, XCircle, AlertCircle, Edit, Save, X } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format } from 'date-fns';

export default function Shifts() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [dateFilter, setDateFilter] = useState('week');
  const [editingShift, setEditingShift] = useState(null);
  const [editFormData, setEditFormData] = useState(null);

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

  const handleEdit = (shift) => {
    setEditingShift(shift.id);
    setEditFormData({
      store_id: shift.store_id,
      store_name: shift.store_name,
      scheduled_start: shift.scheduled_start ? new Date(shift.scheduled_start).toISOString().slice(0, 16) : '',
      scheduled_end: shift.scheduled_end ? new Date(shift.scheduled_end).toISOString().slice(0, 16) : '',
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
    const shiftDate = new Date(shift.shift_date);
    const now = new Date();
    const daysDiff = Math.floor((now - shiftDate) / (1000 * 60 * 60 * 24));
    
    if (dateFilter === 'today' && daysDiff !== 0) return false;
    if (dateFilter === 'week' && daysDiff > 7) return false;
    if (dateFilter === 'month' && daysDiff > 30) return false;
    if (dateFilter === 'all') return true; // Keep all shifts for 'all' date filter
    
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Turni Dipendenti</h1>
        <p className="text-[#9b9b9b]">Gestione e monitoraggio turni</p>
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
                        {format(new Date(shift.shift_date), 'dd/MM/yyyy')}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full neumorphic-flat flex items-center justify-center">
                            <span className="text-xs font-bold text-[#8b7355]">
                              {shift.employee_name?.charAt(0) || 'E'}
                            </span>
                          </div>
                          <span className="text-[#6b6b6b] font-medium">{shift.employee_name}</span>
                        </div>
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
                              className="neumorphic-pressed px-2 py-1 rounded-lg text-xs text-[#6b6b6b] outline-none w-full"
                            />
                          </div>
                        ) : (
                          <div className="text-[#6b6b6b] text-sm">
                            {shift.scheduled_start && format(new Date(shift.scheduled_start), 'HH:mm')} - {shift.scheduled_end && format(new Date(shift.scheduled_end), 'HH:mm')}
                            {shift.actual_start && (
                              <div className="text-xs text-[#9b9b9b] mt-1">
                                Effettivo: {format(new Date(shift.actual_start), 'HH:mm')}
                                {shift.actual_end && ` - ${format(new Date(shift.actual_end), 'HH:mm')}`}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.employee_group_name}
                            onChange={(e) => setEditFormData({ ...editFormData, employee_group_name: e.target.value })}
                            className="neumorphic-pressed px-2 py-1 rounded-lg text-sm text-[#6b6b6b] outline-none w-full"
                            placeholder="Ruolo"
                          />
                        ) : (
                          <span className="text-sm text-[#6b6b6b]">
                            {shift.employee_group_name || '-'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.shift_type}
                            onChange={(e) => setEditFormData({ ...editFormData, shift_type: e.target.value })}
                            className="neumorphic-pressed px-2 py-1 rounded-lg text-sm text-[#6b6b6b] outline-none w-full"
                            placeholder="Tipo"
                          />
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
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => handleEdit(shift)}
                              className="neumorphic-flat p-2 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Modifica"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
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
    </div>
  );
}