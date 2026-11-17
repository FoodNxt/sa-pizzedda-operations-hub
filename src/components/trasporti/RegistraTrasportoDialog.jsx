import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { erroreFunzione } from '@/components/laboratorio/labUtils';
import TrasportoCampi from './TrasportoCampi';
import TrasportoRiepilogo from './TrasportoRiepilogo';
import { campoSelect, contaAPezzi, numeroIt } from './trasportiUtils';

// Data e ora locali nel formato dell'input datetime-local
const perInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function RegistraTrasportoDialog({ stores, onClose, onSalvato }) {
  const [dati, setDati] = useState(null);
  const [form, setForm] = useState({ item: '', da: '', a: '', valore: '', quando: perInput(new Date()), dipendente: '', note: '' });
  const [anteprima, setAnteprima] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [impostazioni, materie, ricette, dipendenti] = await Promise.all([
        base44.entities.ImpostazioneInventario2.filter({ incluso: true }),
        base44.entities.MateriePrime.filter({ trasportabile: true }),
        base44.entities.Ricetta.filter({ is_semilavorato: true, trasportabile: true }),
        base44.entities.Employee.filter({ status: 'active' })
      ]);
      const nomi = Object.fromEntries([...materie, ...ricette].map((x) => [x.id, x.nome_prodotto]));
      setDati({
        prodotti: impostazioni.filter((i) => nomi[i.item_id]).map((i) => ({ ...i, nome: nomi[i.item_id] })).sort((a, b) => a.nome.localeCompare(b.nome, 'it')),
        dipendenti: dipendenti.sort((a, b) => a.full_name.localeCompare(b.full_name, 'it'))
      });
    })();
  }, []);

  const adesso = new Date();
  const prodotto = dati?.prodotti.find((p) => p.item_id === form.item);
  const aPezzi = contaAPezzi(prodotto?.unita_conteggio);
  const valore = Number(form.valore);
  const dipendente = dati?.dipendenti.find((d) => d.id === form.dipendente);
  const nomeStore = (id) => stores.find((s) => s.id === id)?.name;

  const invia = async (extra) => {
    setBusy(true);
    try {
      return (await base44.functions.invoke('inv2RegistraTrasporto', {
        item_id: form.item,
        da_store_id: form.da,
        a_store_id: form.a,
        [aPezzi ? 'pezzi' : 'peso_kg']: valore,
        data_trasporto: new Date(form.quando).toISOString(),
        per_conto_di_email: dipendente?.email,
        per_conto_di_nome: dipendente?.full_name,
        note: form.note,
        ...extra
      })).data;
    } catch (e) {
      toast({ title: 'Trasporto non registrato', description: erroreFunzione(e), variant: 'destructive' });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const continua = async () => {
    if (!aPezzi && valore > 30 && !window.confirm(`Hai scritto ${numeroIt(valore)}? Il peso va in kg: ${numeroIt(valore / 1000)}`)) return;
    const res = await invia({ anteprima: true });
    if (res) setAnteprima(res.anteprima);
  };

  const conferma = async () => {
    const res = await invia({});
    if (!res) return;
    toast({ title: `${res.trasporto.item_nome}: trasporto registrato`, description: `Giacenze ricalcolate: ${res.ricalcolato ? 'sì' : 'no'}` });
    onSalvato();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Registra trasporto</DialogTitle></DialogHeader>
        {!dati ? (
          <p className="text-sm text-slate-500">Caricamento...</p>
        ) : dati.prodotti.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun prodotto è impostato come trasportabile in Inventario 2.0.</p>
        ) : anteprima ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              {new Date(form.quando).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
              {dipendente ? `, per conto di ${dipendente.full_name}` : ''}
            </p>
            <TrasportoRiepilogo anteprima={anteprima} daNome={nomeStore(form.da)} aNome={nomeStore(form.a)} saving={busy} onConferma={conferma} onModifica={() => setAnteprima(null)} />
          </div>
        ) : (
          <div className="space-y-3">
            <TrasportoCampi form={form} onChange={setForm} prodotti={dati.prodotti} stores={stores} />
            <div className="space-y-1.5">
              <Label htmlFor="tr-quando">Data e ora del trasporto</Label>
              <Input
                id="tr-quando"
                type="datetime-local"
                className="h-12"
                value={form.quando}
                min={perInput(new Date(adesso.getTime() - 14 * 86400000))}
                max={perInput(adesso)}
                onChange={(e) => setForm({ ...form, quando: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tr-dipendente">Registrato per conto di</Label>
              <select id="tr-dipendente" className={campoSelect} value={form.dipendente} onChange={(e) => setForm({ ...form, dipendente: e.target.value })}>
                <option value="">Nessuno (registro io)</option>
                {dati.dipendenti.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tr-note">Note</Label>
              <Textarea id="tr-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <Button
              className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 text-white"
              disabled={busy || !form.item || !form.da || !form.a || !(valore > 0) || !form.quando}
              onClick={continua}
            >
              {busy ? 'Controllo…' : 'Continua'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}