import React from 'react';
import { Calendar } from 'lucide-react';
import ProtectedPage from '@/components/ProtectedPage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUbicazioni } from '@/components/inventario2/useUbicazioni';
import GiacenzeTab from '@/components/inventario2/pianificazione/GiacenzeTab';
import CalendarioTab from '@/components/inventario2/pianificazione/CalendarioTab';
import ConsumabiliTab from '@/components/inventario2/pianificazione/ConsumabiliTab';
import SoglieTab from '@/components/inventario2/pianificazione/SoglieTab';
import ProvaDipendente from '@/components/inventario2/pianificazione/ProvaDipendente';

export default function Inventario2Pianificazione() {
  const ubicazioni = useUbicazioni();

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
        </div>

        {ubicazioni && (
          <Tabs defaultValue="giacenze">
            <TabsList>
              <TabsTrigger value="giacenze">Giacenze</TabsTrigger>
              <TabsTrigger value="calendario">Calendario</TabsTrigger>
              <TabsTrigger value="consumabili">Consumabili</TabsTrigger>
              <TabsTrigger value="soglie">Minimo e massimo</TabsTrigger>
            </TabsList>
            <TabsContent value="soglie" className="mt-4">
              <SoglieTab ubicazioni={ubicazioni} />
            </TabsContent>
            <TabsContent value="giacenze" className="mt-4">
              <GiacenzeTab ubicazioni={ubicazioni} />
            </TabsContent>
            <TabsContent value="calendario" className="mt-4">
              <CalendarioTab ubicazioni={ubicazioni} />
            </TabsContent>
            <TabsContent value="consumabili" className="mt-4">
              <ConsumabiliTab />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </ProtectedPage>
  );
}