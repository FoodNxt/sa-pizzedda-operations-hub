import React, { useEffect, useState } from 'react';
import { ChefHat } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ProtectedPage from '@/components/ProtectedPage';
import ProduzioniAdmin from '@/components/laboratorio/ProduzioniAdmin';
import TotaliSettimanali from '@/components/laboratorio/TotaliSettimanali';

export default function LaboratorioAdmin() {
  const [semilavorati, setSemilavorati] = useState([]);
  const [versione, setVersione] = useState(0);

  useEffect(() => {
    base44.entities.Ricetta.filter({ is_semilavorato: true }).then((r) =>
      setSemilavorati(r.sort((a, b) => a.nome_prodotto.localeCompare(b.nome_prodotto, 'it')))
    );
  }, []);

  return (
    <ProtectedPage pageName="LaboratorioAdmin">
      <div className="max-w-[1500px] mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Inventario 2.0 › Laboratorio</h1>
            <p className="text-slate-500">Produzioni registrate, scarichi delle materie prime e totali settimanali</p>
          </div>
        </div>
        <TotaliSettimanali versione={versione} />
        <ProduzioniAdmin semilavorati={semilavorati} onCambio={() => setVersione((v) => v + 1)} />
      </div>
    </ProtectedPage>
  );
}