import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GIORNI, ORDINE_GIORNI, RICORRENZE, TIPO_LABEL } from './inv2Utils';

const GIORNI_MAX = { due_volte_settimana: 2, settimanale: 1, ogni_due_settimane: 1 };

export default function ProdottoPanel({ row, imp, onClose, onSave }) {
  const [d, setD] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row) return;
    const cf = imp.conteggio_fisso || {};
    setD({
      unita_conteggio: imp.unita_conteggio || '',
      fattore: imp.fattore_unita_ordine ?? 1,
      peso: imp.peso_unita_conteggio_kg ?? '',
      attivo: !!cf.attivo,
      ricorrenza: cf.ricorrenza || 'settimanale',
      giorni: cf.giorni_settimana || [],
      data_partenza: cf.data_partenza || '',
      giorno_mese: cf.giorno_mese || 1,
      note: imp.note || ''
    });
  }, [row?.key]);

  const set = (patch) => setD((prev) => ({ ...prev, ...patch }));
  const maxGiorni = d ? GIORNI_MAX[d.ricorrenza] : 0;

  const toggleGiorno = (g) => {
    if (d.giorni.includes(g)) set({ giorni: d.giorni.filter((x) => x !== g) });
    else set({ giorni: [...d.giorni, g].slice(-maxGiorni) });
  };

  const salva = async () => {
    setSaving(true);
    const cf = { attivo: d.attivo, ricorrenza: d.ricorrenza, giorni_settimana: maxGiorni ? d.giorni.slice(-maxGiorni) : [] };
    if (d.ricorrenza === 'ogni_due_settimane' && d.data_partenza) cf.data_partenza = d.data_partenza;
    if (d.ricorrenza === 'mensile') cf.giorno_mese = Math.min(28, Math.max(1, Number(d.giorno_mese) || 1));
    const patch = {
      unita_conteggio: d.unita_conteggio,
      fattore_unita_ordine: Number(d.fattore) || 1,
      conteggio_fisso: cf,
      note: d.note
    };
    if (d.peso !== '') patch.peso_unita_conteggio_kg = Number(d.peso);
    else if (imp.peso_unita_conteggio_kg != null) patch.peso_unita_conteggio_kg = null;
    await onSave(row, patch);
    setSaving(false);
    onClose();
  };

  return (
    <Sheet open={!!row} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {row && d && (
          <div className="space-y-5">
            <SheetHeader>
              <SheetTitle>{row.nome}</SheetTitle>
              <SheetDescription>{TIPO_LABEL[row.tipo]}{row.categoria ? ` · ${row.categoria}` : ''}</SheetDescription>
            </SheetHeader>

            <div className="space-y-2">
              <Label htmlFor="inv2-unita">Unità di conteggio</Label>
              <Input id="inv2-unita" value={d.unita_conteggio} onChange={(e) => set({ unita_conteggio: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="inv2-fattore">Unità di conteggio per 1 unità d'ordine</Label>
                <Input id="inv2-fattore" type="number" min="0" step="any" value={d.fattore} onChange={(e) => set({ fattore: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv2-peso">Peso di 1 unità di conteggio (kg)</Label>
                <Input id="inv2-peso" type="number" min="0" step="any" value={d.peso} onChange={(e) => set({ peso: e.target.value })} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="inv2-fisso">Giorno fisso di conteggio</Label>
                <Switch id="inv2-fisso" checked={d.attivo} onCheckedChange={(v) => set({ attivo: v })} />
              </div>
              {d.attivo && (
                <>
                  <div className="space-y-2">
                    <Label>Ricorrenza</Label>
                    <Select value={d.ricorrenza} onValueChange={(v) => set({ ricorrenza: v, giorni: d.giorni.slice(-(GIORNI_MAX[v] || 0) || d.giorni.length) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RICORRENZE.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {maxGiorni > 0 && (
                    <div className="space-y-2">
                      <Label>{maxGiorni === 2 ? 'Giorni della settimana (2)' : 'Giorno della settimana'}</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {ORDINE_GIORNI.map((g) => (
                          <button
                            key={g}
                            type="button"
                            aria-pressed={d.giorni.includes(g)}
                            onClick={() => toggleGiorno(g)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize ${d.giorni.includes(g) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'}`}
                          >
                            {GIORNI[g].slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {d.ricorrenza === 'ogni_due_settimane' && (
                    <div className="space-y-2">
                      <Label htmlFor="inv2-partenza">Data di partenza</Label>
                      <Input id="inv2-partenza" type="date" value={d.data_partenza} onChange={(e) => set({ data_partenza: e.target.value })} />
                    </div>
                  )}
                  {d.ricorrenza === 'mensile' && (
                    <div className="space-y-2">
                      <Label htmlFor="inv2-giorno-mese">Giorno del mese (1-28)</Label>
                      <Input id="inv2-giorno-mese" type="number" min="1" max="28" value={d.giorno_mese} onChange={(e) => set({ giorno_mese: e.target.value })} />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv2-note">Note</Label>
              <Textarea id="inv2-note" rows={3} value={d.note} onChange={(e) => set({ note: e.target.value })} />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Annulla</Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={salva} disabled={saving}>
                {saving ? 'Salvataggio…' : 'Salva'}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}