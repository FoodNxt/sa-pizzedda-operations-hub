import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const adesso = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const VUOTO = { tipo: 'rettifica', ubicazione: '', prodotto: '', quantita: '', note: '' };
const selectClass = 'w-full h-9 rounded-md border border-input bg-background px-3 text-sm';

export default function MovimentoManualeDialog({ open, onClose, ubicazioni, prodotti, onSaved }) {
  const [d, setD] = useState(VUOTO);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setD({ ...VUOTO, data: adesso() });
  }, [open]);

  const set = (patch) => setD((prev) => ({ ...prev, ...patch }));
  const q = Number(d.quantita);
  const valido = d.ubicazione && d.prodotto && d.data && d.quantita !== '' && (d.tipo === 'spreco' ? q > 0 : q !== 0);

  const salva = async () => {
    setSaving(true);
    const prodotto = prodotti.find((p) => p.key === d.prodotto);
    const lab = d.ubicazione.startsWith('lab:');
    const [user, impostazioni] = await Promise.all([
      base44.auth.me(),
      base44.entities.ImpostazioneInventario2.filter({ item_id: prodotto.id })
    ]);
    await base44.entities.MovimentoMagazzino.create({
      ubicazione_key: d.ubicazione,
      store_id: lab ? d.ubicazione.slice(4) : d.ubicazione,
      ubicazione_tipo: lab ? 'laboratorio' : 'negozio',
      item_tipo: prodotto.tipo,
      item_id: prodotto.id,
      item_nome: prodotto.nome,
      tipo: d.tipo,
      quantita: q,
      unita: impostazioni[0]?.unita_conteggio || prodotto.unitaDefault,
      data_movimento: new Date(d.data).toISOString(),
      utente_email: user.email,
      utente_nome: user.nome_cognome || user.full_name,
      fonte: 'manuale',
      note: d.note
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aggiungi movimento manuale</DialogTitle>
          <DialogDescription>Registra una rettifica o uno spreco nel registro.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[['rettifica', 'Rettifica'], ['spreco', 'Spreco']].map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={d.tipo === value}
                onClick={() => set({ tipo: value })}
                className={`h-9 rounded-md border text-sm font-medium ${d.tipo === value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="mov-ubicazione">Ubicazione</Label>
            <select id="mov-ubicazione" className={selectClass} value={d.ubicazione} onChange={(e) => set({ ubicazione: e.target.value })}>
              <option value="">Seleziona un'ubicazione</option>
              {ubicazioni.map((u) => <option key={u.key} value={u.key}>{u.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mov-prodotto">Prodotto</Label>
            <select id="mov-prodotto" className={selectClass} value={d.prodotto} onChange={(e) => set({ prodotto: e.target.value })}>
              <option value="">Seleziona un prodotto</option>
              {prodotti.map((p) => <option key={p.key} value={p.key}>{p.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="mov-quantita">Quantità</Label>
              <Input id="mov-quantita" type="number" step="any" min={d.tipo === 'spreco' ? '0' : undefined} value={d.quantita} onChange={(e) => set({ quantita: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mov-data">Data e ora</Label>
              <Input id="mov-data" type="datetime-local" value={d.data || ''} onChange={(e) => set({ data: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {d.tipo === 'rettifica'
              ? 'Rettifica: una quantità positiva aggiunge alla giacenza, una negativa toglie.'
              : 'Spreco: la quantità viene tolta dalla giacenza.'}
          </p>
          <div className="space-y-2">
            <Label htmlFor="mov-note">Note</Label>
            <Textarea id="mov-note" rows={2} value={d.note} onChange={(e) => set({ note: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={salva} disabled={!valido || saving}>
            {saving ? 'Salvataggio…' : 'Aggiungi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}