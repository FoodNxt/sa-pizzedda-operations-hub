import React from 'react';
import { Settings } from 'lucide-react';
import ProtectedPage from '@/components/ProtectedPage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProdottiTab from '@/components/inventario2/ProdottiTab';
import ConfigurazioneTab from '@/components/inventario2/ConfigurazioneTab';

export default function Inventario2Impostazioni() {
  return (
    <ProtectedPage pageName="Inventario2Impostazioni">
      <div className="max-w-[1500px] mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Inventario 2.0 › Impostazioni</h1>
            <p className="text-slate-500">Prodotti, soglie e configurazione del nuovo inventario</p>
          </div>
        </div>

        <Tabs defaultValue="prodotti">
          <TabsList>
            <TabsTrigger value="prodotti">Prodotti</TabsTrigger>
            <TabsTrigger value="configurazione">Configurazione</TabsTrigger>
          </TabsList>
          <TabsContent value="prodotti" className="mt-4">
            <ProdottiTab />
          </TabsContent>
          <TabsContent value="configurazione" className="mt-4">
            <ConfigurazioneTab />
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedPage>
  );
}