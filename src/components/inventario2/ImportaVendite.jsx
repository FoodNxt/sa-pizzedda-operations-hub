import React, { useState } from 'react';
import { format, subDays } from 'date-fns';
import { Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { erroreFunzione, oggiLocale } from '@/components/laboratorio/labUtils';

export default function ImportaVendite() {
  const [busy, setBusy] = useState(false);

  const importa = async () => {
    setBusy(true);
    try {
      const { data } = await base44.functions.invoke('inv2SincronizzaVendite', {
        date_from: format(subDays(new Date(), 59), 'yyyy-MM-dd'),
        date_to: oggiLocale()
      });
      toast({
        title: `Vendite importate: ${data.righe} righe su ${data.giorni} giorni`,
        description: data.errori.length ? `${data.errori.length} giorni non importati, riprova più tardi` : undefined
      });
    } catch (e) {
      toast({ title: 'Vendite non importate', description: erroreFunzione(e), variant: 'destructive' });
    }
    setBusy(false);
  };

  return (
    <NeumorphicCard className="p-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Vendite del POS</h2>
        <p className="text-sm text-slate-500">Ogni notte alle 02:00 si aggiornano gli ultimi 3 giorni. Qui puoi importare tutto lo storico.</p>
      </div>
      <Button onClick={importa} disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white">
        <Download className="w-4 h-4 mr-2" />
        {busy ? 'Importazione…' : 'Importa vendite ultimi 60 giorni'}
      </Button>
    </NeumorphicCard>
  );
}