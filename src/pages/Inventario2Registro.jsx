import React from 'react';
import { ClipboardList } from 'lucide-react';
import ProtectedPage from '@/components/ProtectedPage';
import RegistroMovimenti from '@/components/inventario2/RegistroMovimenti';

export default function Inventario2Registro() {
  return (
    <ProtectedPage pageName="Inventario2Registro">
      <div className="max-w-[1500px] mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
            <ClipboardList className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Inventario 2.0 › Registro</h1>
            <p className="text-slate-500">Tutti i movimenti di magazzino: conteggi, ricevimenti, sprechi e rettifiche</p>
          </div>
        </div>
        <RegistroMovimenti />
      </div>
    </ProtectedPage>
  );
}