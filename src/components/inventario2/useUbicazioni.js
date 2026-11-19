import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const LAB_STORE_DEFAULT = '6908b4f284cb01bc8402b4ee';

// Negozi e laboratorio come ubicazioni: [{ key, nome }]. null mentre carica.
export function useUbicazioni() {
  const [ubicazioni, setUbicazioni] = useState(null);

  useEffect(() => {
    (async () => {
      const [stores, configs] = await Promise.all([base44.entities.Store.list(), base44.entities.ConfigInventario2.list()]);
      const labId = configs[0]?.lab_store_id || LAB_STORE_DEFAULT;
      const lab = stores.find((s) => s.id === labId);
      setUbicazioni([
        ...stores.filter((s) => s.status === 'active').map((s) => ({ key: s.id, nome: s.name })),
        { key: `lab:${labId}`, nome: `Laboratorio${lab ? ` (${lab.name})` : ''}` }
      ]);
    })();
  }, []);

  return ubicazioni;
}