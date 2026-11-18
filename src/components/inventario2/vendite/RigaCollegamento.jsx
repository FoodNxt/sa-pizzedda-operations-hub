import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const TIPI = { ricetta: 'Ricetta', materia_prima: 'Materia prima', ignora: 'Ignora' };

// Il collegamento di un prodotto venduto: tipo, ricetta o materia prima, quantità per pezzo venduto
export default function RigaCollegamento({ riga, opzioni, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={riga.tipo} onValueChange={(v) => onChange({ tipo: v, item_id: '' })}>
        <SelectTrigger className="w-40" aria-label="Tipo di collegamento"><SelectValue /></SelectTrigger>
        <SelectContent>
          {Object.entries(TIPI).map(([valore, nome]) => <SelectItem key={valore} value={valore}>{nome}</SelectItem>)}
        </SelectContent>
      </Select>
      {riga.tipo !== 'ignora' && (
        <>
          <Select value={riga.item_id || undefined} onValueChange={(v) => onChange({ item_id: v })}>
            <SelectTrigger className="flex-1 min-w-[14rem]" aria-label="Prodotto collegato"><SelectValue placeholder="Scegli" /></SelectTrigger>
            <SelectContent>
              {opzioni.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome_prodotto}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min="0"
            step="any"
            className="w-24"
            aria-label={riga.tipo === 'ricetta' ? 'Ricette per pezzo venduto' : 'Pezzi per pezzo venduto'}
            value={riga.quantita_per_pezzo}
            onChange={(e) => onChange({ quantita_per_pezzo: e.target.value })}
          />
          <span className="text-xs text-slate-500">
            {riga.tipo === 'ricetta' ? 'ricette per pezzo venduto' : 'pezzi singoli per pezzo venduto (es. 1 lattina)'}
          </span>
        </>
      )}
    </div>
  );
}