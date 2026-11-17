import React, { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ProtectedPage from '@/components/ProtectedPage';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import ConfrontoStoreCard from '@/components/inventario2/ConfrontoStoreCard';
import { useUbicazioni } from '@/components/inventario2/useUbicazioni';
import { erroreFunzione } from '@/components/laboratorio/labUtils';

export default function Inventario2Confronto() {
  const ubicazioni = useUbicazioni();
  const [dati, setDati] = useState(null);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    base44.functions.invoke('inv2Analisi', { azione: 'confronto' })
      .then((r) => setDati(r.data))
      .catch((e) => setErrore(erroreFunzione(e)));
  }, []);

  const nome = (id) => ubicazioni.find((u) => u.key === id)?.nome || id;

  return (
    <ProtectedPage pageName="Inventario2Confronto">
      <div className="max-w-[1500px] mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Inventario 2.0 › Confronto</h1>
            <p className="text-slate-500">Nuovo sistema contro inventario attuale, ultimi 21 giorni, per gli store in affiancamento</p>
          </div>
        </div>

        {errore ? (
          <NeumorphicCard className="p-5"><p className="text-sm text-red-600">{errore}</p></NeumorphicCard>
        ) : !dati || !ubicazioni ? (
          <NeumorphicCard className="p-5"><p className="text-sm text-slate-500">Caricamento...</p></NeumorphicCard>
        ) : dati.stores.length === 0 ? (
          <NeumorphicCard className="p-5">
            <p className="text-sm text-slate-500">Nessuno store è in affiancamento. La modalità si sceglie in Impostazioni, tab Configurazione.</p>
          </NeumorphicCard>
        ) : (
          dati.stores.map((s) => <ConfrontoStoreCard key={s.store_id} nome={nome(s.store_id)} dati={s} />)
        )}
      </div>
    </ProtectedPage>
  );
}