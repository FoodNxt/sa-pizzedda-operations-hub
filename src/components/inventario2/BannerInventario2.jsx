import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

// Banner giallo per gli store in modalità "attivo". pagina: 'FormInventario2' (stessi parametri URL) oppure 'Ordini2'.
export default function BannerInventario2({ storeId, pagina, pulsante }) {
  const { data: modalita = {} } = useQuery({
    queryKey: ['inv2-modalita-per-store'],
    queryFn: async () => (await base44.entities.ConfigInventario2.list())[0]?.modalita_per_store || {},
    staleTime: 60000
  });
  if (!storeId || modalita[storeId] !== 'attivo') return null;

  let url = createPageUrl(pagina);
  if (pagina === 'FormInventario2') {
    const params = new URLSearchParams(window.location.search);
    params.set('store_id', storeId);
    url += `?${params.toString()}`;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-yellow-400 bg-yellow-50 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-yellow-900">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        Questo negozio usa Inventario 2.0
      </p>
      <Link to={url} className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold text-yellow-950 hover:bg-yellow-500">
        {pulsante}
      </Link>
    </div>
  );
}