import React, { useState } from 'react';
import { format, subDays } from 'date-fns';
import { Download, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { erroreFunzione, oggiLocale } from '@/components/laboratorio/labUtils';

export default function ImportaVendite() {
  const [busy, setBusy] = useState(null);

  const esegui = async (azione, parametri) => {
    setBusy(azione);
    try {
      const { data } = await base44.functions.invoke('inv2SincronizzaVendite', parametri);
      toast({
        title: `Vendite importate: ${data.righe} righe su ${data.giorni} giorni`,
        description: data.errori.length ? `${data.errori.length} giorni non importati, riprova più tardi` : undefined
      });
    } catch (e) {
      toast({ title: 'Vendite non importate', description: erroreFunzione(e), variant: 'destructive' });
    }
    setBusy(null);
  };

  const importa = () => esegui('importa', { date_from: format(subDays(new Date(), 59), 'yyyy-MM-dd'), date_to: oggiLocale() });
  const reimporta = () => {
    const ok = window.confirm('Cancello tutte le vendite importate e i collegamenti senza prodotto (compresi quelli segnati "Ignora"), poi reimporto gli ultimi 60 giorni. Continuo?');
    if (ok) esegui('reimporta', { reimporta: true });
  };

  return (
    <NeumorphicCard className="p-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Vendite del POS</h2>
        <p className="text-sm text-slate-500">Ogni notte alle 02:00 si aggiornano gli ultimi 3 giorni. Qui puoi importare tutto lo storico.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={reimporta} disabled={!!busy} className="border-red-300 text-red-700 hover:bg-red-50">
          <RefreshCw className="w-4 h-4 mr-2" />
          {busy === 'reimporta' ? 'Reimportazione…' : 'Cancella e reimporta vendite (60 giorni)'}
        </Button>
        <Button onClick={importa} disabled={!!busy} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Download className="w-4 h-4 mr-2" />
          {busy === 'importa' ? 'Importazione…' : 'Importa vendite ultimi 60 giorni'}
        </Button>
      </div>
    </NeumorphicCard>
  );
}