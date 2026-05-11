import React from "react";
import { Shirt } from "lucide-react";
import ProtectedPage from "../components/ProtectedPage";
import ComodatoDivisaAdmin from "../components/documenti/ComodatoDivisaAdmin";
import DotazioneDivisaReadonly from "../components/divise/DotazioneDivisaReadonly";

export default function DiviseStoreManager() {
  return (
    <ProtectedPage pageName="DiviseStoreManager">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Shirt className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#000000' }}>Divise</h1>
            <p className="text-sm text-slate-500">Gestione comodato d'uso divise dipendenti</p>
          </div>
        </div>
        <DotazioneDivisaReadonly />
        <ComodatoDivisaAdmin />
      </div>
    </ProtectedPage>
  );
}