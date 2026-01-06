import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";
import { Clock, Plus, Trash2, Check, X } from "lucide-react";

const GIORNI_SETTIMANA = [
  { value: 0, label: 'Domenica' },
  { value: 1, label: 'Lunedì' },
  { value: 2, label: 'Martedì' },
  { value: 3, label: 'Mercoledì' },
  { value: 4, label: 'Giovedì' },
  { value: 5, label: 'Venerdì' },
  { value: 6, label: 'Sabato' }
];

export default function DisponibilitaRicorrenti({ dipendente, disponibilita = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    giorno_settimana: 1,
    ora_inizio: '09:00',
    ora_fine: '17:00',
    tipo: 'disponibile',
    note: ''
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const creatoAdmin = user.user_type === 'admin' || user.user_type === 'manager';
      return base44.entities.Disponibilita.create({
        ...data,
        creato_da_admin: creatoAdmin
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disponibilita'] });
      setShowForm(false);
      setFormData({ giorno_settimana: 1, ora_inizio: '09:00', ora_fine: '17:00', tipo: 'disponibile', note: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Disponibilita.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disponibilita'] });
    },
  });

  const disponibilitaRicorrenti = disponibilita.filter(d => d.ricorrente);

  const handleSubmit = () => {
    if (!formData.ora_inizio || !formData.ora_fine) {
      alert('Compila tutti i campi');
      return;
    }

    createMutation.mutate({
      dipendente_id: dipendente.id,
      dipendente_nome: dipendente.nome_cognome || dipendente.full_name,
      tipo: formData.tipo,
      ricorrente: true,
      giorno_settimana: formData.giorno_settimana,
      ora_inizio: formData.ora_inizio,
      ora_fine: formData.ora_fine,
      note: formData.note
    });
  };

  // Raggruppa per giorno
  const disponibilitaPerGiorno = useMemo(() => {
    const grouped = {};
    GIORNI_SETTIMANA.forEach(g => {
      grouped[g.value] = disponibilitaRicorrenti.filter(d => d.giorno_settimana === g.value);
    });
    return grouped;
  }, [disponibilitaRicorrenti]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Disponibilità Ricorrenti
        </h3>
        <NeumorphicButton
          onClick={() => setShowForm(!showForm)}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Aggiungi
        </NeumorphicButton>
      </div>

      {/* Form */}
      {showForm && (
        <NeumorphicCard className="p-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Giorno</label>
              <select
                value={formData.giorno_settimana}
                onChange={(e) => setFormData({ ...formData, giorno_settimana: parseInt(e.target.value) })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
              >
                {GIORNI_SETTIMANA.map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Ora Inizio</label>
                <input
                  type="time"
                  value={formData.ora_inizio}
                  onChange={(e) => setFormData({ ...formData, ora_inizio: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Ora Fine</label>
                <input
                  type="time"
                  value={formData.ora_fine}
                  onChange={(e) => setFormData({ ...formData, ora_fine: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Tipo</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tipo: 'disponibile' })}
                  className={`flex-1 px-4 py-2 rounded-xl font-medium ${
                    formData.tipo === 'disponibile'
                      ? 'bg-green-500 text-white'
                      : 'neumorphic-flat text-slate-700'
                  }`}
                >
                  <Check className="w-4 h-4 inline mr-1" /> Disponibile
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tipo: 'non_disponibile' })}
                  className={`flex-1 px-4 py-2 rounded-xl font-medium ${
                    formData.tipo === 'non_disponibile'
                      ? 'bg-red-500 text-white'
                      : 'neumorphic-flat text-slate-700'
                  }`}
                >
                  <X className="w-4 h-4 inline mr-1" /> Non Disponibile
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Note</label>
              <input
                type="text"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                placeholder="Motivo (opzionale)..."
              />
            </div>

            <div className="flex gap-2">
              <NeumorphicButton onClick={() => setShowForm(false)} className="flex-1">
                Annulla
              </NeumorphicButton>
              <NeumorphicButton
                onClick={handleSubmit}
                variant="primary"
                className="flex-1"
                disabled={createMutation.isPending}
              >
                Salva
              </NeumorphicButton>
            </div>
          </div>
        </NeumorphicCard>
      )}

      {/* Lista disponibilità per giorno */}
      <div className="space-y-3">
        {GIORNI_SETTIMANA.map(giorno => {
          const items = disponibilitaPerGiorno[giorno.value];
          if (items.length === 0) return null;

          return (
            <NeumorphicCard key={giorno.value} className="p-4">
              <h4 className="font-bold text-slate-800 mb-2">{giorno.label}</h4>
              <div className="space-y-2">
                {items.map(disp => (
                  <div
                    key={disp.id}
                    className={`p-3 rounded-xl flex items-center justify-between ${
                      disp.tipo === 'disponibile'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {disp.tipo === 'disponibile' ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`font-medium ${
                          disp.tipo === 'disponibile' ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {disp.ora_inizio} - {disp.ora_fine}
                        </span>
                      </div>
                      {disp.note && (
                        <p className="text-xs text-slate-500 mt-1 ml-6">{disp.note}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Eliminare questa disponibilità?')) {
                          deleteMutation.mutate(disp.id);
                        }
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </NeumorphicCard>
          );
        })}

        {disponibilitaRicorrenti.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            Nessuna disponibilità ricorrente impostata
          </div>
        )}
      </div>
    </div>
  );
}