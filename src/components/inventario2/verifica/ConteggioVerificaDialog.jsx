import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { giornoOra } from '@/components/inventario2/inv2Utils';
import { erroreFunzione } from '@/components/laboratorio/labUtils';
import VerificaLista from './VerificaLista';
import VerificaRisultato from './VerificaRisultato';

const selectClass = 'w-full h-9 rounded-md border border-input bg-background px-3 text-sm';
const dove = (key) => (key.startsWith('lab:') ? { ubicazione: 'laboratorio' } : { store_id: key });

// Conteggio di verifica dell'admin: inserimento cieco. Ogni riga salvata va subito in una bozza sul server e si ritrova riaprendo
// la stessa ubicazione. "Salva verifica" trasforma la bozza in conteggi e mostra il confronto
export default function ConteggioVerificaDialog({ open, onClose, ubicazioni, onSaved }) {
  const [ubicazione, setUbicazione] = useState('');
  const [lista, setLista] = useState(null);
  // { righe: [{ item_id, quantita, ora }], iniziata, scaduta }
  const [bozza, setBozza] = useState(null);
  const [tutti, setTutti] = useState(false);
  const [cerca, setCerca] = useState('');
  const [problema, setProblema] = useState('');
  const [saving, setSaving] = useState(false);
  const [risultato, setRisultato] = useState(null);

  useEffect(() => {
    if (open) { setUbicazione(''); setCerca(''); setRisultato(null); }
  }, [open]);

  const chiama = async (body) => {
    setProblema('');
    try {
      return (await base44.functions.invoke('inv2Conteggio', { ...dove(ubicazione), ...body })).data;
    } catch (e) {
      setProblema(erroreFunzione(e));
      return null;
    }
  };

  useEffect(() => {
    setLista(null);
    setBozza(null);
    if (!ubicazione) { setProblema(''); return; }
    chiama({ azione: 'lista_verifica' }).then((d) => {
      if (!d) return;
      setLista(d);
      setBozza(d.bozza);
      setTutti(d.predefiniti.length === 0);
    });
  }, [ubicazione]);

  const confermati = Object.fromEntries((bozza?.righe || []).map((r) => [r.item_id, r]));
  const salvate = bozza?.righe.length || 0;
  const scaduta = !!bozza?.scaduta;
  // Una bozza scaduta mostra solo le sue righe: si può salvare o scartare
  const righe = (lista?.righe || []).filter((r) => (scaduta ? confermati[r.item_id] : tutti || lista.predefiniti.includes(r.item_id) || confermati[r.item_id]));
  const visibili = righe.filter((r) => r.nome.toLowerCase().includes(cerca.trim().toLowerCase()));

  const riga = async (body) => {
    const d = await chiama({ azione: 'bozza_riga', ...body });
    if (d) setBozza(d.bozza);
  };
  const scarta = async () => {
    if (!window.confirm(`Scarto la bozza con ${salvate} righe? Non verranno registrate.`)) return;
    const d = await chiama({ azione: 'scarta_bozza' });
    if (d) setBozza(null);
  };
  const salva = async () => {
    setSaving(true);
    const d = await chiama({ azione: 'salva_verifica' });
    if (d) { setRisultato(d.risultato); onSaved?.(); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={risultato ? 'sm:max-w-6xl' : 'sm:max-w-2xl'}>
        <DialogHeader>
          <DialogTitle>{risultato ? 'Verifica salvata' : 'Conteggio di verifica'}</DialogTitle>
          <DialogDescription>
            {risultato
              ? 'Atteso = ultimo conteggio del dipendente meno il teorico delle vendite tra i due orari. In rosso le differenze oltre il 10%.'
              : 'Ogni riga salvata resta in bozza con la sua ora, anche se chiudi la pagina. Non entra nei calcoli finché non premi Salva verifica. Stima e ultimo conteggio si vedono solo dopo.'}
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
              <select aria-label="Prodotti" className={selectClass} value={tutti ? 'tutti' : 'verifica'} onChange={(e) => setTutti(e.target.value === 'tutti')} disabled={!lista || scaduta}>
                <option value="verifica">Prodotti di verifica{lista ? ` (${lista.predefiniti.length})` : ''}</option>
                <option value="tutti">Tutti i prodotti{lista ? ` (${lista.righe.length})` : ''}</option>
              </select>
              <Input aria-label="Cerca prodotto" placeholder="Cerca prodotto" value={cerca} onChange={(e) => setCerca(e.target.value)} />
            </div>
            {bozza && salvate > 0 && (
              <p className={`rounded-lg px-3 py-2 text-sm ${scaduta ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'}`}>
                {scaduta
                  ? `Bozza scaduta, iniziata il ${giornoOra(bozza.iniziata)}: ${salvate} righe. Puoi salvarla o scartarla.`
                  : `Bozza iniziata il ${giornoOra(bozza.iniziata)}: ${salvate} righe già salvate.`}
              </p>
            )}
            {problema && <p className="text-sm text-red-600">{problema}</p>}
            {ubicazione && !lista && !problema && <p className="text-sm text-slate-500">Caricamento…</p>}
            {lista && !lista.righe.length && <p className="text-sm text-slate-500">Nessun prodotto da contare: questa ubicazione non è attiva in Inventario 2.0 o non ha prodotti inclusi.</p>}
            {lista && lista.righe.length > 0 && !righe.length && (
              <p className="text-sm text-slate-500">Nessun prodotto di verifica in questa ubicazione. La lista si sceglie in Impostazioni, tab Configurazione.</p>
            )}
            {righe.length > 0 && (
              <VerificaLista
                righe={visibili}
                confermati={confermati}
                bloccata={scaduta}
                onConferma={(item_id, quantita) => riga({ item_id, quantita })}
                onModifica={(item_id) => riga({ item_id, rimuovi: true })}
              />
            )}
          </div>
        )}
        <DialogFooter className="items-center">
          {!risultato && righe.length > 0 && <span className="text-sm text-slate-500 sm:mr-auto">{salvate} righe in bozza</span>}
          {!risultato && salvate > 0 && <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={scarta} disabled={saving}>Scarta bozza</Button>}
          <Button variant="outline" onClick={onClose}>Chiudi</Button>
          {!risultato && (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={salva} disabled={!salvate || saving}>
              {saving ? 'Salvataggio…' : 'Salva verifica'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}