import React, { useEffect, useState } from 'react';
import { Plus, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RegistraTrasportoDialog from '@/components/trasporti/RegistraTrasportoDialog';
import { base44 } from '@/api/base44Client';
import ProtectedPage from '@/components/ProtectedPage';
import TrasportiAdminTable from '@/components/trasporti/TrasportiAdminTable';
import TotaliTrasporti from '@/components/trasporti/TotaliTrasporti';

export default function TrasportiAdmin() {
  const [stores, setStores] = useState(null);
  const [prodotti, setProdotti] = useState([]);
  const [versione, setVersione] = useState(0);
  const [registra, setRegistra] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, imp] = await Promise.all([
        base44.entities.Store.list(),
        base44.entities.ImpostazioneInventario2.filter({ incluso: true })
      ]);
      setProdotti(imp.filter((i) => i.item_nome).sort((a, b) => a.item_nome.localeCompare(b.item_nome, 'it')));
      setStores(s);
    })();
  }, []);

  return (
    <ProtectedPage pageName="TrasportiAdmin">
      <div className="max-w-[1500px] mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Inventario 2.0 › Trasporti</h1>
            <p className="text-slate-500">Trasporti tra negozi, totali settimanali e correzioni</p>
          </div>
        </div>
        {stores && (
          <>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setRegistra(true)}>
              <Plus className="w-4 h-4 mr-2" />Registra trasporto
            </Button>
            <TotaliTrasporti stores={stores} versione={versione} />
            <TrasportiAdminTable stores={stores} prodotti={prodotti} versione={versione} onCambio={() => setVersione((v) => v + 1)} />
            {registra && (
              <RegistraTrasportoDialog
                stores={stores}
                onClose={() => setRegistra(false)}
                onSalvato={() => { setRegistra(false); setVersione((v) => v + 1); }}
              />
            )}
          </>
        )}
      </div>
    </ProtectedPage>
  );
}