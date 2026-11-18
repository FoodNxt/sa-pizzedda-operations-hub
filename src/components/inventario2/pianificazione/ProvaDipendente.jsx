import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { oggiLocale } from '@/components/laboratorio/labUtils';

// Apre l'inventario serale in modalità prova: solo per admin
export default function ProvaDipendente({ ubicazioni }) {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(false);
  const [key, setKey] = useState(ubicazioni[0]?.key || '');

  useEffect(() => {
    base44.auth.me().then((u) => setAdmin(u.role === 'admin'));
  }, []);

  if (!admin) return null;

  const apri = () => {
    const dove = key.startsWith('lab:') ? 'ubicazione=laboratorio' : `store_id=${key}`;
    navigate(`${createPageUrl('FormInventario2')}?prova=1&${dove}&data=${oggiLocale()}`);
  };

  return (
    <div className="flex items-center gap-2 md:ml-auto">
      <select
        aria-label="Ubicazione da provare"
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        value={key}
        onChange={(e) => setKey(e.target.value)}
      >
        {ubicazioni.map((u) => <option key={u.key} value={u.key}>{u.nome}</option>)}
      </select>
      <Button className="bg-purple-600 hover:bg-purple-700 text-white" disabled={!key} onClick={apri}>
        <FlaskConical className="w-4 h-4 mr-2" />
        Prova come dipendente
      </Button>
    </div>
  );
}