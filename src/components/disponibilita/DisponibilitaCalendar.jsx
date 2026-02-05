import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";
import { Calendar, Check, X, Plus, Trash2 } from "lucide-react";
import moment from "moment";

export default function DisponibilitaCalendar({ dipendente, disponibilita = [] }) {
  const [selectedDate, setSelectedDate] = useState(moment().startOf('month'));
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [slotForm, setSlotForm] = useState({
    data: '',
    ora_inizio: '09:00',
    ora_fine: '17:00',
    tipo: 'disponibile'
  });

  const queryClient = useQueryClient();

  const createDisponibilitaMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const creatoAdmin = user.user_type === 'admin' || user.user_type === 'manager';
      return base44.entities.Disponibilita.create({
        ...data,
        creato_da_admin: creatoAdmin
      });
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['disponibilita'] });
      const previous = queryClient.getQueryData(['disponibilita']);
      
      const optimisticDisp = {
        ...newData,
        id: `temp-${Date.now()}`,
        created_date: new Date().toISOString()
      };
      
      queryClient.setQueryData(['disponibilita'], old => 
        old ? [...old, optimisticDisp] : [optimisticDisp]
      );
      
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['disponibilita'], context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disponibilita'] });
      setShowSlotForm(false);
      setSlotForm({ data: '', ora_inizio: '09:00', ora_fine: '17:00', tipo: 'disponibile' });
    },
  });

  const deleteDisponibilitaMutation = useMutation({
    mutationFn: (id) => base44.entities.Disponibilita.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['disponibilita'] });
      const previous = queryClient.getQueryData(['disponibilita']);
      
      queryClient.setQueryData(['disponibilita'], old => 
        old?.filter(d => d.id !== id)
      );
      
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['disponibilita'], context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disponibilita'] });
    },
  });

  const daysInMonth = useMemo(() => {
    const start = selectedDate.clone().startOf('month').startOf('week');
    const end = selectedDate.clone().endOf('month').endOf('week');
    const days = [];
    let current = start.clone();
    
    while (current.isSameOrBefore(end)) {
      days.push(current.clone());
      current.add(1, 'day');
    }
    return days;
  }, [selectedDate]);

  const getDisponibilitaForDate = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    const dayOfWeek = date.day();
    
    // Filtra disponibilità specifiche per questa data
    const specifiche = disponibilita.filter(d => 
      !d.ricorrente && d.data_specifica === dateStr
    );
    
    // Filtra disponibilità ricorrenti per questo giorno della settimana
    const ricorrenti = disponibilita.filter(d => 
      d.ricorrente && d.giorno_settimana === dayOfWeek
    );
    
    return [...specifiche, ...ricorrenti];
  };

  const handleSubmit = () => {
    if (!slotForm.data || !slotForm.ora_inizio || !slotForm.ora_fine) {
      alert('Compila tutti i campi');
      return;
    }

    createDisponibilitaMutation.mutate({
      dipendente_id: dipendente.id,
      dipendente_nome: dipendente.nome_cognome || dipendente.full_name,
      tipo: slotForm.tipo,
      data_specifica: slotForm.data,
      ora_inizio: slotForm.ora_inizio,
      ora_fine: slotForm.ora_fine,
      ricorrente: false
    });
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setSelectedDate(selectedDate.clone().subtract(1, 'month'))}
          className="neumorphic-flat px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100"
        >
          ‹
        </button>
        <h3 className="text-lg font-bold text-slate-800 capitalize">
          {selectedDate.format('MMMM YYYY')}
        </h3>
        <button
          onClick={() => setSelectedDate(selectedDate.clone().add(1, 'month'))}
          className="neumorphic-flat px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100"
        >
          ›
        </button>
      </div>

      {/* Calendar Grid */}
      <NeumorphicCard className="p-4">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-slate-500">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {daysInMonth.map(day => {
            const isCurrentMonth = day.month() === selectedDate.month();
            const isToday = day.isSame(moment(), 'day');
            const disponibilitaDay = getDisponibilitaForDate(day);
            const hasDisponibile = disponibilitaDay.some(d => d.tipo === 'disponibile');
            const hasNonDisponibile = disponibilitaDay.some(d => d.tipo === 'non_disponibile');
            
            return (
              <div
                key={day.format('YYYY-MM-DD')}
                className={`relative p-2 rounded-lg border min-h-[60px] ${
                  !isCurrentMonth ? 'opacity-30' :
                  isToday ? 'border-blue-500 bg-blue-50' :
                  hasNonDisponibile ? 'bg-red-50 border-red-300' :
                  hasDisponibile ? 'bg-green-50 border-green-300' :
                  'border-slate-200'
                }`}
              >
                <div className="text-sm font-medium text-slate-700">
                  {day.format('D')}
                </div>
                <div className="space-y-1 mt-1">
                  {disponibilitaDay.map((disp, idx) => (
                    <div
                      key={idx}
                      className={`text-[10px] px-1 py-0.5 rounded flex items-center justify-between ${
                        disp.tipo === 'disponibile'
                          ? 'bg-green-200 text-green-800'
                          : 'bg-red-200 text-red-800'
                      }`}
                    >
                      <span>{disp.ora_inizio}-{disp.ora_fine.substring(0, 5)}</span>
                      <button
                        onClick={() => deleteDisponibilitaMutation.mutate(disp.id)}
                        className="hover:opacity-70"
                      >
                        <X className="w-2 h-2" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </NeumorphicCard>

      {/* Add Slot Button */}
      <NeumorphicButton
        onClick={() => setShowSlotForm(!showSlotForm)}
        variant="primary"
        className="w-full flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Aggiungi Slot
      </NeumorphicButton>

      {/* Slot Form */}
      {showSlotForm && (
        <NeumorphicCard className="p-4">
          <h3 className="font-bold text-slate-800 mb-3">Nuovo Slot</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Data</label>
              <input
                type="date"
                value={slotForm.data}
                onChange={(e) => setSlotForm({ ...slotForm, data: e.target.value })}
                min={moment().format('YYYY-MM-DD')}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Ora Inizio</label>
                <input
                  type="time"
                  value={slotForm.ora_inizio}
                  onChange={(e) => setSlotForm({ ...slotForm, ora_inizio: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Ora Fine</label>
                <input
                  type="time"
                  value={slotForm.ora_fine}
                  onChange={(e) => setSlotForm({ ...slotForm, ora_fine: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Tipo</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSlotForm({ ...slotForm, tipo: 'disponibile' })}
                  className={`flex-1 px-4 py-2 rounded-xl font-medium ${
                    slotForm.tipo === 'disponibile'
                      ? 'bg-green-500 text-white'
                      : 'neumorphic-flat text-slate-700'
                  }`}
                >
                  <Check className="w-4 h-4 inline mr-1" /> Disponibile
                </button>
                <button
                  type="button"
                  onClick={() => setSlotForm({ ...slotForm, tipo: 'non_disponibile' })}
                  className={`flex-1 px-4 py-2 rounded-xl font-medium ${
                    slotForm.tipo === 'non_disponibile'
                      ? 'bg-red-500 text-white'
                      : 'neumorphic-flat text-slate-700'
                  }`}
                >
                  <X className="w-4 h-4 inline mr-1" /> Non Disponibile
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <NeumorphicButton onClick={() => setShowSlotForm(false)} className="flex-1">
                Annulla
              </NeumorphicButton>
              <NeumorphicButton
                onClick={handleSubmit}
                variant="primary"
                className="flex-1"
                disabled={createDisponibilitaMutation.isPending}
              >
                Salva
              </NeumorphicButton>
            </div>
          </div>
        </NeumorphicCard>
      )}
    </div>
  );
}