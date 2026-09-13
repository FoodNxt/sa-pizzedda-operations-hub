import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';

export default function SemilavoratoSacchiConfig({ ricetta }) {
  const queryClient = useQueryClient();
  const [soglia, setSoglia] = useState(ricetta.soglia_minima_sacchi ?? '');

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.Ricetta.update(ricetta.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['semilavorati-inventario'] })
  });

  const attivo = ricetta.inventario_a_sacchi === true;

  return (
    <>
      <td className="p-3 text-center">
        <button
          type="button"
          onClick={() => saveMutation.mutate({ inventario_a_sacchi: !attivo })}
          disabled={saveMutation.isPending}
          className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${
            attivo ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
          }`}
          title="Conta a sacchi (la materia prima collegata non viene più chiesta)"
        >
          {attivo ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
      </td>
      <td className="p-3 text-center">
        <input
          type="number"
          min="0"
          step="1"
          value={soglia}
          disabled={!attivo}
          onChange={(e) => setSoglia(e.target.value)}
          onBlur={() => saveMutation.mutate({ soglia_minima_sacchi: parseFloat(soglia) || 0 })}
          className="w-20 neumorphic-pressed px-2 py-2 rounded-lg text-center text-slate-700 outline-none disabled:opacity-40"
          placeholder="0"
        />
      </td>
      <td className="p-3 text-center text-xs text-slate-500">
        {ricetta.somma_a_materia_prima_nome || '—'}
      </td>
    </>
  );
}