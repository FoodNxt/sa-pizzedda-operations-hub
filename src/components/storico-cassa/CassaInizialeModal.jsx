import React, { useState } from 'react';
import { X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

export default function CassaInizialeModal({ isOpen, onClose, stores, onSave, initialData }) {
  const [formData, setFormData] = useState(initialData || { store_id: '', date: '', valore: 0 });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[999999]">
      <div className="max-w-md w-full p-6 bg-white rounded-xl shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Imposta Cassa Teorica Inizio</h2>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl mb-4">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Info:</strong> Questo valore diventerà la "Cassa Teorica Inizio" per questo locale in questa data, sostituendo il valore calcolato automaticamente.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-600 mb-2 block">Locale</label>
            <select
              value={formData.store_id}
              onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-xl text-slate-700 outline-none text-sm border border-slate-300 focus:border-blue-500">
              <option value="">Seleziona locale...</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-600 mb-2 block">Data</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-xl text-slate-700 outline-none text-sm border border-slate-300 focus:border-blue-500" />
          </div>

          <div>
            <label className="text-sm text-slate-600 mb-2 block">Cassa Teorica Inizio (€)</label>
            <input
              type="number"
              step="0.01"
              value={formData.valore}
              onChange={(e) => setFormData({ ...formData, valore: parseFloat(e.target.value) || 0 })}
              required
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-slate-700 outline-none text-sm border border-slate-300 focus:border-blue-500" />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200">
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium hover:shadow-lg">
              Salva
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}