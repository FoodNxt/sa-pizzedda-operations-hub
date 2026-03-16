import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Upload, Camera, Loader2, ShieldAlert } from 'lucide-react';
import NeumorphicCard from '../neumorphic/NeumorphicCard';

export default function ContestaOrdineModal({ order, orderMatches, onClose }) {
  const [note, setNote] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleUploadFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFotoUrl(file_url);
    setUploading(false);
  };

  const handleContesta = async () => {
    setSaving(true);
    const user = await base44.auth.me();

    // 1. Mark the WrongOrder as contestato
    await base44.entities.WrongOrder.update(order.id, {
      contestato: true,
      contestato_foto_url: fotoUrl || null,
      contestato_note: note || null,
      contestato_da: user.email,
      contestato_data: new Date().toISOString()
    });

    // 2. Delete all matches for this order (removes assignment from employees)
    if (orderMatches && orderMatches.length > 0) {
      for (const match of orderMatches) {
        await base44.entities.WrongOrderMatch.delete(match.id);
      }
    }

    queryClient.invalidateQueries({ queryKey: ['wrong-orders-unmatched'] });
    queryClient.invalidateQueries({ queryKey: ['wrong-order-matches'] });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <NeumorphicCard className="max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Contesta Ordine</h2>
              <p className="text-xs text-slate-500">Ordine {order.order_id} — {order.platform}</p>
            </div>
          </div>
          <button onClick={onClose} className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Warning */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-800">
            <strong>Attenzione:</strong> Contestando questo ordine, verrà rimosso l'abbinamento con tutti i dipendenti associati ({orderMatches?.length || 0} abbinamenti).
          </div>

          {/* Photo upload */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Foto prova (opzionale)</label>
            {fotoUrl ? (
              <div className="relative">
                <img src={fotoUrl} alt="Prova contestazione" className="w-full h-48 object-cover rounded-xl border border-slate-200" />
                <button
                  onClick={() => setFotoUrl('')}
                  className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-md hover:bg-red-50"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-sm text-slate-500">Carica foto</span>
                  </>
                )}
                <input type="file" accept="image/*" capture="environment" onChange={handleUploadFoto} className="hidden" />
              </label>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Note contestazione (opzionale)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Motivo della contestazione..."
              rows={3}
              className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-slate-700 outline-none text-sm resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 neumorphic-flat px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleContesta}
              disabled={saving}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
              Contesta Ordine
            </button>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}