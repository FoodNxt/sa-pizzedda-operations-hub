import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { erroreFunzione, oggiLocale } from './labUtils';

const selectClass = 'w-full h-9 rounded-md border border-input bg-background px-3 text-sm';

export default function RegistraProduzioneDialog({ semilavorati, onClose, onSalvato }) {
  const [prodotti, setProdotti] = useState(null);
  const [form, setForm] = useState({ item: '', quantita: '', data: oggiLocale(), note: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [configs, impostazioni] = await Promise.all([
        base44.entities.ConfigInventario2.list(),
        base44.entities.ImpostazioneInventario2.filter({ item_tipo: 'semilavorato', producibile_lab: true })
      ]);
      const basiId = configs[0]?.basi_ricetta_id;
      const producibili = new Set(impostazioni.map((i) => i.item_id));
      setProdotti(
        semilavorati
          .filter((r) => r.id === basiId || producibili.has(r.id))
          .map((r) => ({ id: r.id, nome: r.nome_prodotto, unita: r.id === basiId ? 'pezzi' : r.unita_misura_prodotta || 'grammi' }))
      );
    })();
  }, [semilavorati]);

  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });
  const prodotto = prodotti?.find((p) => p.id === form.item);
  const quantita = Number(form.quantita);

  const salva = async () => {
    setBusy(true);
    try {
      await base44.functions.invoke('inv2RegistraProduzione', {
        item_id: prodotto.id,
        data_produzione: form.data,
        quantita,
        unita: prodotto.unita,
        note: form.note
      });
      toast({ title: `${prodotto.nome}: produzione registrata` });
      onSalvato();
    } catch (e) {
      toast({ title: 'Produzione non registrata', description: erroreFunzione(e), variant: 'destructive' });
    }
    setBusy(false);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registra produzione</DialogTitle>
          <DialogDescription>Carica il semilavorato prodotto in laboratorio e scarica le materie prime della ricetta.</DialogDescription>
        </DialogHeader>
        {!prodotti ? (
          <p className="text-sm text-slate-500">Caricamento...</p>
        ) : prodotti.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun semilavorato è impostato come producibile in laboratorio.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pr-item">Semilavorato</Label>
              <select id="pr-item" className={selectClass} value={form.item} onChange={set('item')}>
                <option value="">Seleziona un semilavorato</option>
                {prodotti.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pr-quantita">Quantità{prodotto ? ` (${prodotto.unita})` : ''}</Label>
                <Input id="pr-quantita" type="number" min="0" step="any" value={form.quantita} onChange={set('quantita')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pr-data">Data di produzione</Label>
                <Input id="pr-data" type="date" max={oggiLocale()} value={form.data} onChange={set('data')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pr-note">Note</Label>
              <Textarea id="pr-note" rows={2} value={form.note} onChange={set('note')} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled={busy || !prodotto || !(quantita > 0) || !form.data} onClick={salva}>
            {busy ? 'Salvataggio…' : 'Registra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}