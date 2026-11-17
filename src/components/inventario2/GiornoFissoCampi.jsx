import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CON_GIORNI, GIORNI, ORDINE_GIORNI, RICORRENZE } from './inv2Utils';

// Campi del giorno fisso di conteggio: f = { attivo, ricorrenza, giorni, data_partenza, giorno_mese }
export default function GiornoFissoCampi({ f, onChange }) {
  const set = (patch) => onChange({ ...f, ...patch });
  const toggleGiorno = (g) => set({ giorni: f.giorni.includes(g) ? f.giorni.filter((x) => x !== g) : [...f.giorni, g] });

  return (
    <>
      <div className="flex items-center justify-between">
        <Label htmlFor="inv2-fisso">Giorno fisso di conteggio</Label>
        <Switch id="inv2-fisso" checked={f.attivo} onCheckedChange={(v) => set({ attivo: v })} />
      </div>
      {f.attivo && (
        <>
          <div className="space-y-2">
            <Label>Ricorrenza</Label>
            <Select value={f.ricorrenza} onValueChange={(v) => set({ ricorrenza: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RICORRENZE.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {CON_GIORNI.includes(f.ricorrenza) && (
            <div className="space-y-2">
              <Label>Giorni della settimana (uno o più)</Label>
              <div className="flex flex-wrap gap-1.5">
                {ORDINE_GIORNI.map((g) => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={f.giorni.includes(g)}
                    onClick={() => toggleGiorno(g)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize ${f.giorni.includes(g) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'}`}
                  >
                    {GIORNI[g].slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {f.ricorrenza === 'ogni_due_settimane' && (
            <div className="space-y-2">
              <Label htmlFor="inv2-partenza">Data di partenza</Label>
              <Input id="inv2-partenza" type="date" value={f.data_partenza} onChange={(e) => set({ data_partenza: e.target.value })} />
            </div>
          )}
          {f.ricorrenza === 'mensile' && (
            <div className="space-y-2">
              <Label htmlFor="inv2-giorno-mese">Giorno del mese (1-28)</Label>
              <Input id="inv2-giorno-mese" type="number" min="1" max="28" value={f.giorno_mese} onChange={(e) => set({ giorno_mese: e.target.value })} />
            </div>
          )}
        </>
      )}
    </>
  );
}