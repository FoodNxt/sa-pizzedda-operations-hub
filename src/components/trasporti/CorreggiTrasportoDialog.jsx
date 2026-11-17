import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { erroreFunzione } from '@/components/laboratorio/labUtils';
import { campoSelect, storeDaChiave } from './trasportiUtils';

export default function CorreggiTrasportoDialog({ trasporto, stores, onClose, onSalvato }) {
  const aPezzi = trasporto.pezzi != null;
  const [form, setForm] = useState({
    da: storeDaChiave(trasporto.da_ubicazione_key),
    a: storeDaChiave(trasporto.a_ubicazione_key),
    valore: String(aPezzi ? trasporto.pezzi : trasporto.peso_kg ?? ''),
    note: trasporto.note || ''
  });
  const [saving, setSaving] = useState(false);
  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const salva = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('inv2CorreggiTrasporto', {
        trasporto_id: trasporto.id,
        da_store_id: form.da,
        a_store_id: form.a,
        [aPezzi ? 'pezzi' : 'peso_kg']: Number(form.valore),
        note: form.note
      });
      toast({ title: 'Trasporto corretto' });
      onSalvato();
    } catch (e) {
      toast({ title: 'Correzione non riuscita', description: erroreFunzione(e), variant: 'destructive' });
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Correggi trasporto di {trasporto.item_nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ct-da">Da</Label>
              <select id="ct-da" className={campoSelect} value={form.da} onChange={set('da')}>
                {stores.filter((s) => s.id !== form.a).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ct-a">A</Label>
              <select id="ct-a" className={campoSelect} value={form.a} onChange={set('a')}>
                {stores.filter((s) => s.id !== form.da).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ct-valore">{aPezzi ? 'Numero di pezzi' : 'Peso in kg'}</Label>
            <Input id="ct-valore" type="number" min="0" step={aPezzi ? '1' : '0.01'} value={form.valore} onChange={set('valore')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ct-note">Note</Label>
            <Input id="ct-note" value={form.note} onChange={set('note')} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>Annulla</Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled={saving || !(Number(form.valore) > 0)} onClick={salva}>
            {saving ? 'Salvataggio…' : 'Salva e ricalcola'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}