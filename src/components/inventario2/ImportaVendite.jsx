import React from 'react';
import { Download, RefreshCw, RotateCcw } from 'lucide-react';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { Button } from '@/components/ui/button';
import StatoGiorniVendite from './StatoGiorniVendite';
import useImportaVendite from './useImportaVendite';

export default function ImportaVendite() {
  const { busy, avanzamento, log, mancanti, importa, reimporta, riprova } = useImportaVendite();

  const confermaReimporta = () => {
    const ok = window.confirm('Rileggo dal POS gli ultimi 60 giorni e sostituisco le vendite un giorno alla volta, solo dopo averlo letto. Cancello anche i collegamenti senza prodotto (compresi quelli segnati "Ignora"). Continuo?');
    if (ok) reimporta();
  };

  return (
    <NeumorphicCard className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Vendite del POS</h2>
          <p className="text-sm text-slate-500">Ogni notte alle 02:00 si aggiornano gli ultimi 3 giorni. Qui puoi importare tutto lo storico, 10 giorni alla volta.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={confermaReimporta} disabled={!!busy} className="border-red-300 text-red-700 hover:bg-red-50">
            <RefreshCw className="w-4 h-4 mr-2" />
            {busy === 'reimporta' ? 'Reimportazione…' : 'Cancella e reimporta vendite (60 giorni)'}
          </Button>
          <Button variant="outline" onClick={riprova} disabled={!!busy || !mancanti.length}>
            <RotateCcw className="w-4 h-4 mr-2" />
            {busy === 'riprova' ? 'Importazione…' : `Riprova giorni mancanti (${mancanti.length})`}
          </Button>
          <Button onClick={importa} disabled={!!busy} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="w-4 h-4 mr-2" />
            {busy === 'importa' ? 'Importazione…' : 'Importa vendite ultimi 60 giorni'}
          </Button>
        </div>
      </div>
      {avanzamento && (
        <div className="text-sm font-medium text-blue-700">
          Importati {avanzamento.fatti} giorni su {avanzamento.totale}… Non chiudere la pagina.
        </div>
      )}
      <StatoGiorniVendite log={log} />
    </NeumorphicCard>
  );
}