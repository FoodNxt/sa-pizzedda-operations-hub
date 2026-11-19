import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, ClipboardCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ProtectedPage from '@/components/ProtectedPage';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUbicazioni } from '@/components/inventario2/useUbicazioni';
import GiacenzeTab from '@/components/inventario2/pianificazione/GiacenzeTab';
import CalendarioTab from '@/components/inventario2/pianificazione/CalendarioTab';
import ConsumabiliTab from '@/components/inventario2/pianificazione/ConsumabiliTab';
import SoglieTab from '@/components/inventario2/pianificazione/SoglieTab';
import AffidabilitaTab from '@/components/inventario2/pianificazione/AffidabilitaTab';
import ProvaDipendente from '@/components/inventario2/pianificazione/ProvaDipendente';
import ConteggioVerificaDialog from '@/components/inventario2/verifica/ConteggioVerificaDialog';
import PromemoriaVerifiche from '@/components/inventario2/verifica/PromemoriaVerifiche';
import AggiornaVenditeOggi from '@/components/inventario2/verifica/AggiornaVenditeOggi';

export default function Inventario2Pianificazione() {
  const ubicazioni = useUbicazioni();
  const [verifica, setVerifica] = useState(false);
  const [verifiche, setVerifiche] = useState();
  // Cambia dopo una verifica: le giacenze si rileggono
  const [versione, setVersione] = useState(0);

  const caricaVerifiche = useCallback(() => {
    base44.functions.invoke('inv2Analisi', { azione: 'verifiche' }).then((r) => setVerifiche(r.data));
  }, []);
  useEffect(caricaVerifiche, [caricaVerifiche]);

  return (
    <ProtectedPage pageName="Inventario2Pianificazione">
      <div className="max-w-[1500px] mx-auto space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Inventario 2.0 › Pianificazione</h1>
            <p className="text-slate-500">Giacenze stimate, prossimi conteggi e frequenza dei consumabili</p>
          </div>
          {ubicazioni && <ProvaDipendente ubicazioni={ubicazioni} />}
          {ubicazioni && <AggiornaVenditeOggi />}
          {ubicazioni && (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setVerifica(true)}>
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Conteggio di verifica
            </Button>
          )}
        </div>

        {ubicazioni && <PromemoriaVerifiche dati={verifiche} ubicazioni={ubicazioni} />}

        {ubicazioni && (
          <Tabs defaultValue="giacenze">
            <TabsList>
              <TabsTrigger value="giacenze">Giacenze</TabsTrigger>
              <TabsTrigger value="calendario">Calendario</TabsTrigger>
              <TabsTrigger value="consumabili">Consumabili</TabsTrigger>
              <TabsTrigger value="soglie">Minimo e massimo</TabsTrigger>
              <TabsTrigger value="affidabilita">Affidabilità conteggi</TabsTrigger>
            </TabsList>
            <TabsContent value="soglie" className="mt-4">
              <SoglieTab ubicazioni={ubicazioni} />
            </TabsContent>
            <TabsContent value="giacenze" className="mt-4">
              <GiacenzeTab key={versione} ubicazioni={ubicazioni} />
            </TabsContent>
            <TabsContent value="calendario" className="mt-4">
              <CalendarioTab ubicazioni={ubicazioni} />
            </TabsContent>
            <TabsContent value="consumabili" className="mt-4">
              <ConsumabiliTab />
            </TabsContent>
            <TabsContent value="affidabilita" className="mt-4">
              <AffidabilitaTab dati={verifiche} />
            </TabsContent>
          </Tabs>
        )}

        {ubicazioni && (
          <ConteggioVerificaDialog
            open={verifica}
            onClose={() => setVerifica(false)}
            ubicazioni={ubicazioni}
            onSaved={() => { setVersione((v) => v + 1); caricaVerifiche(); }}
          />
        )}
      </div>
    </ProtectedPage>
  );
}