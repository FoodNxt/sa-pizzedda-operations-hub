import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import InventarioCompletoLista from '@/components/inventario2/InventarioCompletoLista';
import { erroreFunzione } from '@/components/laboratorio/labUtils';
import VerificaRisultato from './VerificaRisultato';

const selectClass = 'w-full h-9 rounded-md border border-input bg-background px-3 text-sm';
const dove = (key) => (key.startsWith('lab:') ? { ubicazione: 'laboratorio' } : { store_id: key });

// Conteggio di verifica dell'admin: inserimento cieco, poi il confronto con stima e ultimo conteggio dei dipendenti
export default function ConteggioVerificaDialog({ open, onClose, ubicazioni, onSaved }) {
  const [ubicazione, setUbicazione] = useState('');
  const [lista, setLista] = useState(null);
  const [tutti, setTutti] = useState(false);
  const [valori, setValori] = useState({});
  const [cerca, setCerca] = useState('');
  const [problema, setProblema] = useState('');
  const [saving, setSaving] = useState(false);
  const [risultato, setRisultato] = useState(null);

  useEffect(() => {
    if (open) { setUbicazione(''); setCerca(''); setRisultato(null); }
  }, [open]);

  useEffect(() => {
    setLista(null);
    setValori({});
    setProblema('');
    if (!ubicazione) return;
    base44.functions.invoke('inv2Conteggio', { azione: 'lista_verifica', ...dove(ubicazione) })
      .then((r) => { setLista(r.data); setTutti(r.data.predefiniti.length === 0); })
      .catch((e) => setProblema(erroreFunzione(e)));
  }, [ubicazione]);

  const righe = (lista?.righe || []).filter((r) => tutti || lista.predefiniti.includes(r.item_id));
  const visibili = righe.filter((r) => r.nome.toLowerCase().includes(cerca.trim().toLowerCase()));
  const inLista = new Set(righe.map((r) => r.item_id));
  const conteggi = Object.entries(valori)
    .filter(([id, v]) => inLista.has(id) && v !== '' && Number(v) >= 0)
    .map(([item_id, v]) => ({ item_id, quantita: Number(v) }));

  const salva = async () => {
    setSaving(true);
    setProblema('');
    try {
      const { data } = await base44.functions.invoke('inv2Conteggio', { azione: 'salva_verifica', ...dove(ubicazione), conteggi });
      setRisultato(data.risultato);
      onSaved?.();
    } catch (e) {
      setProblema(erroreFunzione(e));
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={risultato ? 'sm:max-w-5xl' : 'sm:max-w-2xl'}>
        <DialogHeader>
          <DialogTitle>{risultato ? 'Verifica salvata' : 'Conteggio di verifica'}</DialogTitle>
          <DialogDescription>
            {risultato
              ? 'Differenza = tuo conteggio meno il valore di confronto. In rosso le differenze oltre il 10%.'
              : 'Conteggio reale fatto dall\'admin: vale sempre nel calcolo. Stima, ultimo conteggio e soglie si vedono solo dopo il salvataggio. I campi vuoti non vengono registrati.'}
          </DialogDescription>
        </DialogHeader>
        {risultato ? (
          <VerificaRisultato righe={risultato} />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select aria-label="Ubicazione" className={selectClass} value={ubicazione} onChange={(e) => setUbicazione(e.target.value)}>
                <option value="">Seleziona un'ubicazione</option>
                {ubicazioni.map((u) => <option key={u.key} value={u.key}>{u.nome}</option>)}
              </select>
              <select aria-label="Prodotti" className={selectClass} value={tutti ? 'tutti' : 'verifica'} onChange={(e) => setTutti(e.target.value === 'tutti')} disabled={!lista}>
                <option value="verifica">Prodotti di verifica{lista ? ` (${lista.predefiniti.length})` : ''}</option>
                <option value="tutti">Tutti i prodotti{lista ? ` (${lista.righe.length})` : ''}</option>
              </select>
              <Input aria-label="Cerca prodotto" placeholder="Cerca prodotto" value={cerca} onChange={(e) => setCerca(e.target.value)} />
            </div>
            {problema && <p className="text-sm text-red-600">{problema}</p>}
            {ubicazione && !lista && !problema && <p className="text-sm text-slate-500">Caricamento…</p>}
            {lista && !lista.righe.length && <p className="text-sm text-slate-500">Nessun prodotto da contare: questa ubicazione non è attiva in Inventario 2.0 o non ha prodotti inclusi.</p>}
            {lista && lista.righe.length > 0 && !righe.length && (
              <p className="text-sm text-slate-500">Nessun prodotto di verifica in questa ubicazione. La lista si sceglie in Impostazioni, tab Configurazione.</p>
            )}
            {righe.length > 0 && (
              <InventarioCompletoLista righe={visibili} valori={valori} onChange={(id, v) => setValori((prev) => ({ ...prev, [id]: v }))} />
            )}
          </div>
        )}
        <DialogFooter className="items-center">
          {!risultato && righe.length > 0 && <span className="text-sm text-slate-500 sm:mr-auto">{conteggi.length} di {righe.length} contati</span>}
          <Button variant="outline" onClick={onClose}>{risultato ? 'Chiudi' : 'Annulla'}</Button>
          {!risultato && (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={salva} disabled={!conteggi.length || saving}>
              {saving ? 'Salvataggio…' : 'Salva verifica'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}