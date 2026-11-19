import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { erroreFunzione } from '@/components/laboratorio/labUtils';

// Rilegge dal POS le vendite per ora della giornata in corso, fino all'ultima ora chiusa
export default function AggiornaVenditeOggi() {
  const [busy, setBusy] = useState(false);

  const aggiorna = async () => {
    setBusy(true);
    try {
      const { data } = await base44.functions.invoke('inv2SincronizzaVendite', { orarie: true, solo_oggi: true });
      const ora = Object.values(data.ultima_ora)[0];
      toast({
        title: 'Vendite di oggi aggiornate',
        description: ora == null ? 'Nessuna vendita nelle ore già chiuse' : `${data.righe} righe, ultima ora con vendite: ${ora}:00-${ora + 1}:00`
      });
    } catch (e) {
      toast({ title: 'Vendite di oggi non aggiornate', description: erroreFunzione(e), variant: 'destructive' });
    }
    setBusy(false);
  };

  return (
    <Button variant="outline" onClick={aggiorna} disabled={busy}>
      <RefreshCw className={`w-4 h-4 mr-2 ${busy ? 'animate-spin' : ''}`} />
      {busy ? 'Aggiornamento…' : 'Aggiorna vendite di oggi'}
    </Button>
  );
}