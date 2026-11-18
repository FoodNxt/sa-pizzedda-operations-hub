import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { frazione, quotaConfezione } from './posUtils';

export const TIPI = { ricetta: 'Ricetta', materia_prima: 'Materia prima', ignora: 'Ignora' };

// Il collegamento di un prodotto venduto: tipo, ricetta o materia prima, quantità per pezzo venduto
export default function RigaCollegamento({ riga, opzioni, onChange }) {
  const materia = riga.tipo === 'materia_prima' ? opzioni.find((o) => o.id === riga.item_id) : null;
  const scegli = (id) => onChange({
    item_id: id,
    ...(riga.tipo === 'materia_prima' ? { quantita_per_pezzo: quotaConfezione(opzioni.find((o) => o.id === id)) } : {})
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={riga.tipo} onValueChange={(v) => onChange({ tipo: v, item_id: '', quantita_per_pezzo: 1 })}>
        <SelectTrigger className="w-40" aria-label="Tipo di collegamento"><SelectValue /></SelectTrigger>
        <SelectContent>
          {Object.entries(TIPI).map(([valore, nome]) => <SelectItem key={valore} value={valore}>{nome}</SelectItem>)}
        </SelectContent>
      </Select>
      {riga.tipo !== 'ignora' && (
        <>
          <Select value={riga.item_id || undefined} onValueChange={scegli}>
            <SelectTrigger className="flex-1 min-w-[14rem]" aria-label="Prodotto collegato"><SelectValue placeholder="Scegli" /></SelectTrigger>
            <SelectContent>
              {opzioni.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome_prodotto}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min="0"
            step="any"
            className="w-28"
            aria-label={riga.tipo === 'ricetta' ? 'Ricette per pezzo venduto' : 'Confezioni per pezzo venduto'}
            value={riga.quantita_per_pezzo}
            onChange={(e) => onChange({ quantita_per_pezzo: e.target.value })}
          />
          <span className="text-xs text-slate-500">
            {riga.tipo === 'ricetta' ? 'ricette per pezzo venduto' : `${materia?.unita_misura || 'confezioni'} per pezzo venduto`}
          </span>
          {materia && Number(riga.quantita_per_pezzo) > 0 && (
            <p className="w-full text-xs text-slate-600">
              1 pezzo venduto = {frazione(riga.quantita_per_pezzo)} di {materia.nome_prodotto}
              {materia.unita_per_confezione > 1 ? ` (confezione da ${materia.unita_per_confezione})` : ''}
            </p>
          )}
        </>
      )}
    </div>
  );
}