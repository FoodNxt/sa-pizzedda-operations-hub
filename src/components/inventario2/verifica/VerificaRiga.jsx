import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { numeroIt } from '@/components/trasporti/trasportiUtils';

const ora = (iso) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
const campo = { type: 'number', min: '0', step: 'any', inputMode: 'decimal' };

// Un prodotto del conteggio di verifica: "Salva" lo conferma con l'ora di quel momento.
// Con una tara si può scrivere il peso lordo e il numero di contenitori. confermato = { quantita, ora }
export default function VerificaRiga({ r, confermato, onConferma, onModifica }) {
  const [valore, setValore] = useState('');
  const [lordo, setLordo] = useState(false);
  const [contenitori, setContenitori] = useState('');

  const netto = Math.round((Number(valore) - (lordo ? Number(contenitori) * r.tara : 0)) * 1000) / 1000;
  const valido = valore !== '' && Number(valore) >= 0 && (!lordo || Number(contenitori) >= 1) && netto >= 0;

  if (confermato) {
    return (
      <div className="flex items-center gap-3 px-3 py-1.5 border-t border-slate-100 bg-green-50">
        <Check className="w-4 h-4 text-green-600" />
        <span className="flex-1 text-sm text-slate-800">{r.nome}</span>
        <span className="text-sm font-semibold text-slate-900">{numeroIt(confermato.quantita, 3)} <span className="font-normal text-slate-500">{r.unita}</span></span>
        <span className="text-xs text-slate-500">alle {ora(confermato.ora)}</span>
        <Button variant="outline" size="sm" onClick={onModifica}>Modifica</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 border-t border-slate-100">
      <span className="flex-1 min-w-[140px] text-sm text-slate-800">{r.nome}</span>
      {r.tara > 0 && (
        <label className="flex items-center gap-1 text-xs text-slate-600">
          <input type="checkbox" checked={lordo} onChange={(e) => setLordo(e.target.checked)} />
          Peso lordo
        </label>
      )}
      <Input {...campo} aria-label={lordo ? `Peso lordo di ${r.nome}` : `Quantità di ${r.nome}`} className="w-24 h-8 text-right" value={valore} onChange={(e) => setValore(e.target.value)} />
      <span className="w-12 text-xs text-slate-500">{r.unita}</span>
      {lordo && (
        <>
          <Input {...campo} step="1" aria-label={`Contenitori di ${r.nome}`} placeholder="Contenitori" className="w-28 h-8 text-right" value={contenitori} onChange={(e) => setContenitori(e.target.value)} />
          <span className={`text-xs ${netto < 0 ? 'text-red-600' : 'text-slate-600'}`}>
            {valore !== '' && contenitori !== '' ? `netto ${numeroIt(netto, 3)} ${r.unita}` : `tara ${numeroIt(r.tara, 3)} ${r.unita}`}
          </span>
        </>
      )}
      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={!valido} onClick={() => onConferma(netto)}>Salva</Button>
    </div>
  );
}