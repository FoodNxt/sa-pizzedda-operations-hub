import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChefHat, Check, X } from 'lucide-react';
import NeumorphicCard from '../neumorphic/NeumorphicCard';

export default function SemilavoratiInventarioTab({ stores = [] }) {
  const queryClient = useQueryClient();

  const { data: semilavorati = [], isLoading } = useQuery({
    queryKey: ['semilavorati-inventario'],
    queryFn: () => base44.entities.Ricetta.filter({ is_semilavorato: true })
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ ricetta, storeId }) => {
      const current = ricetta.stores_form_inventario || [];
      const stores_form_inventario = current.includes(storeId)
        ? current.filter(id => id !== storeId)
        : [...current, storeId];
      await base44.entities.Ricetta.update(ricetta.id, {
        stores_form_inventario,
        mostra_in_form_inventario: stores_form_inventario.length > 0
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['semilavorati-inventario'] })
  });

  if (isLoading) {
    return <NeumorphicCard className="p-6 text-slate-500">Caricamento...</NeumorphicCard>;
  }

  return (
    <NeumorphicCard className="p-4 lg:p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ChefHat className="w-6 h-6 text-blue-600" />
          Semilavorati nel Form Inventario
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Attiva o disattiva ogni semilavorato per singolo locale. Se nessun locale è attivo, il semilavorato non appare nell'inventario.
        </p>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b-2 border-blue-600">
              <th className="text-left p-3 text-slate-600 font-medium text-sm">Semilavorato</th>
              {stores.map(store => (
                <th key={store.id} className="text-center p-3 text-slate-600 font-medium text-sm">
                  {store.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {semilavorati
              .sort((a, b) => (a.nome_prodotto || '').localeCompare(b.nome_prodotto || '', 'it'))
              .map(ricetta => (
                <tr key={ricetta.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-700 text-sm">{ricetta.nome_prodotto}</td>
                  {stores.map(store => {
                    const active = (ricetta.stores_form_inventario || []).includes(store.id);
                    return (
                      <td key={store.id} className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleMutation.mutate({ ricetta, storeId: store.id })}
                          disabled={toggleMutation.isPending}
                          className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${
                            active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
                          }`}
                          title={active ? 'Attivo — clicca per disattivare' : 'Disattivo — clicca per attivare'}
                        >
                          {active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {semilavorati.length === 0 && (
        <p className="text-center text-slate-500 py-8">Nessun semilavorato configurato</p>
      )}
    </NeumorphicCard>
  );
}