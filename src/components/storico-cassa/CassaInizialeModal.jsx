import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function CassaInizialeModal({ isOpen, onClose, stores, onSave }) {
  const [storeId, setStoreId] = useState('');
  const [date, setDate] = useState('');
  const [valore, setValore] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setStoreId('');
      setDate('');
      setValore('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Modal submit:', { storeId, date, valore });
    onSave({ store_id: storeId, date: date, valore: parseFloat(valore) || 0 });
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[999999]"
      onClick={onClose}>
      <div 
        className="max-w-md w-full p-6 bg-white rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Imposta Cassa Manuale</h2>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl mb-4">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Info:</strong> Questo valore diventerà la "Cassa Teorica Inizio" per questo locale in questa data.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-600 mb-2 block font-medium">Locale *</label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-slate-700 outline-none text-sm border-2 border-slate-200 focus:border-blue-500 bg-white">
              <option value="">Seleziona locale...</option>
              {stores?.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-600 mb-2 block font-medium">Data *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-slate-700 outline-none text-sm border-2 border-slate-200 focus:border-blue-500 bg-white" />
          </div>

          <div>
            <label className="text-sm text-slate-600 mb-2 block font-medium">Cassa Teorica Inizio (€) *</label>
            <input
              type="number"
              step="0.01"
              value={valore}
              onChange={(e) => setValore(e.target.value)}
              required
              placeholder="0.00"
              className="w-full px-4 py-3 rounded-xl text-slate-700 outline-none text-sm border-2 border-slate-200 focus:border-blue-500 bg-white" />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors">
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium hover:shadow-lg transition-all">
              Salva
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}