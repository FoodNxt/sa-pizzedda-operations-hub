import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import InventarioCompletoLista from './InventarioCompletoLista';

const selectClass = 'w-full h-9 rounded-md border border-input bg-background px-3 text-sm';
const dove = (key) => (key.startsWith('lab:') ? { ubicazione: 'laboratorio' } : { store_id: key });
const errore = (e) => e.response?.data?.error || e.message;

export default function InventarioCompletoDialog({ open, onClose, ubicazioni, onSaved }) {
  const [ubicazione, setUbicazione] = useState('');
  const [righe, setRighe] = useState(null);
  const [valori, setValori] = useState({});
  const [cerca, setCerca] = useState('');
  const [problema, setProblema] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setUbicazione(''); setCerca(''); }
  }, [open]);

  useEffect(() => {
    setRighe(null);
    setValori({});
    setProblema('');
    if (!ubicazione) return;
    base44.functions.invoke('inv2Conteggio', { azione: 'lista_completa', ...dove(ubicazione) })
      .then((r) => setRighe(r.data.righe))
      .catch((e) => setProblema(errore(e)));
  }, [ubicazione]);

  const conteggi = Object.entries(valori)
    .filter(([, v]) => v !== '' && Number(v) >= 0)
    .map(([item_id, v]) => ({ item_id, quantita: Number(v) }));
  const visibili = (righe || []).filter((r) => r.nome.toLowerCase().includes(cerca.trim().toLowerCase()));

  const salva = async () => {
    setSaving(true);
    try {
      const { data } = await base44.functions.invoke('inv2Conteggio', { azione: 'salva_completo', ...dove(ubicazione), conteggi });
      toast({ title: `${data.conteggi} prodotti contati`, description: data.ricalcolato ? 'Giacenze aggiornate.' : 'Le giacenze si aggiornano al prossimo ricalcolo.' });
      onSaved();
      onClose();
    } catch (e) {
      setProblema(errore(e));
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Inventario completo</DialogTitle>
          <DialogDescription>Conta tutti i prodotti di un locale per avere una base di partenza precisa. I campi lasciati vuoti non vengono registrati.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select aria-label="Locale" className={selectClass} value={ubicazione} onChange={(e) => setUbicazione(e.target.value)}>
              <option value="">Seleziona un locale</option>
              {ubicazioni.map((u) => <option key={u.key} value={u.key}>{u.label}</option>)}
            </select>
            <Input aria-label="Cerca prodotto" placeholder="Cerca prodotto" value={cerca} onChange={(e) => setCerca(e.target.value)} />
          </div>
          {problema && <p className="text-sm text-red-600">{problema}</p>}
          {ubicazione && !righe && !problema && <p className="text-sm text-slate-500">Caricamento…</p>}
          {righe && !righe.length && <p className="text-sm text-slate-500">Nessun prodotto da contare: questo locale non è ancora attivo in Inventario 2.0 o non ha prodotti inclusi.</p>}
          {righe && righe.length > 0 && (
            <InventarioCompletoLista righe={visibili} valori={valori} onChange={(id, v) => setValori((prev) => ({ ...prev, [id]: v }))} />
          )}
        </div>
        <DialogFooter className="items-center">
          {righe && righe.length > 0 && <span className="text-sm text-slate-500 sm:mr-auto">{conteggi.length} di {righe.length} contati</span>}
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={salva} disabled={!conteggi.length || saving}>
            {saving ? 'Salvataggio…' : 'Salva inventario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}