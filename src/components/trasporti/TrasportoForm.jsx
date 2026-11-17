import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Truck } from 'lucide-react';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { segnaAttivitaTurno } from '@/lib/segnaAttivitaTurno';
import { erroreFunzione } from '@/components/laboratorio/labUtils';
import DaPortareCard from './DaPortareCard';
import TrasportoCampi from './TrasportoCampi';
import TrasportoRiepilogo from './TrasportoRiepilogo';
import { chiaveUbicazione, contaAPezzi, numeroIt } from './trasportiUtils';

const LAB_STORE_DEFAULT = '6908b4f284cb01bc8402b4ee';

export default function TrasportoForm() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTo = urlParams.get('redirect');

  const [dati, setDati] = useState(null);
  const [form, setForm] = useState({ item: '', da: urlParams.get('store_id') || '', a: '', valore: '' });
  const [anteprima, setAnteprima] = useState(null);
  const [busy, setBusy] = useState(false);

  const carica = async () => {
    const user = await base44.auth.me();
    const [configs, impostazioni, materie, ricette, stores] = await Promise.all([
      base44.entities.ConfigInventario2.list(),
      base44.entities.ImpostazioneInventario2.filter({ incluso: true }),
      base44.entities.MateriePrime.filter({ trasportabile: true }),
      base44.entities.Ricetta.filter({ is_semilavorato: true, trasportabile: true }),
      base44.entities.Store.list()
    ]);
    const nomi = Object.fromEntries([...materie, ...ricette].map((x) => [x.id, x.nome_prodotto]));
    const prodotti = impostazioni
      .filter((i) => nomi[i.item_id])
      .map((i) => ({ ...i, nome: nomi[i.item_id] }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    const giacenze = prodotti.length
      ? await base44.entities.GiacenzaStimata.filter({ item_id: { $in: prodotti.map((p) => p.item_id) } })
      : [];
    setDati({ user, prodotti, stores, giacenze, labStoreId: configs[0]?.lab_store_id || LAB_STORE_DEFAULT });
  };

  useEffect(() => { carica(); }, []);

  const daPortare = useMemo(() => {
    if (!dati) return [];
    const giac = Object.fromEntries(dati.giacenze.map((g) => [`${g.ubicazione_key}|${g.item_id}`, g.giacenza_stimata]));
    const voci = [];
    dati.prodotti.forEach((p) => dati.stores.forEach((a) => dati.stores.forEach((da) => {
      if (a.id === da.id) return;
      const ka = chiaveUbicazione(a.id, p, dati.labStoreId);
      const kd = chiaveUbicazione(da.id, p, dati.labStoreId);
      const minA = p.min_per_ubicazione?.[ka];
      const gA = giac[`${ka}|${p.item_id}`];
      const gD = giac[`${kd}|${p.item_id}`];
      const minD = p.min_per_ubicazione?.[kd] || 0;
      if (minA == null || gA == null || gD == null || gA >= minA || gD <= minD) return;
      const maxA = Math.max(p.max_per_ubicazione?.[ka] || 0, minA);
      const quanto = Math.min(maxA - gA, gD - minD);
      if (quanto > 0) {
        voci.push({ id: `${p.item_id}|${da.id}|${a.id}`, item: p.item_id, nome: p.nome, unita: p.unita_conteggio, da: da.id, a: a.id, daNome: da.name, aNome: a.name, quanto });
      }
    })));
    return voci;
  }, [dati]);

  if (!dati) {
    return <NeumorphicCard className="p-8 text-center max-w-md mx-auto"><p className="text-slate-500">Caricamento...</p></NeumorphicCard>;
  }

  const prodotto = dati.prodotti.find((p) => p.item_id === form.item);
  const aPezzi = contaAPezzi(prodotto?.unita_conteggio);
  const valore = Number(form.valore);
  const nomeStore = (id) => dati.stores.find((s) => s.id === id)?.name;
  const richiesta = { item_id: form.item, da_store_id: form.da, a_store_id: form.a, [aPezzi ? 'pezzi' : 'peso_kg']: valore };

  const invia = async (extra) => {
    setBusy(true);
    try {
      return (await base44.functions.invoke('inv2RegistraTrasporto', { ...richiesta, ...extra })).data;
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
    toast({ title: `${res.trasporto.item_nome}: trasporto registrato` });
    await segnaAttivitaTurno({ user: dati.user, storeId: form.da, formPage: 'TrasportiMagazzino' });
    setAnteprima(null);
    setForm({ ...form, item: '', valore: '' });
    await carica();
  };

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
          <Truck className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trasporto tra negozi</h1>
          <p className="text-sm text-slate-500">Registra quello che porti da un negozio all'altro</p>
        </div>
      </div>

      <DaPortareCard voci={daPortare} onScegli={(v) => { setAnteprima(null); setForm({ item: v.item, da: v.da, a: v.a, valore: '' }); }} />

      <NeumorphicCard className="p-4 space-y-4">
        {dati.prodotti.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun prodotto è impostato come trasportabile in Inventario 2.0.</p>
        ) : anteprima ? (
          <TrasportoRiepilogo
            anteprima={anteprima}
            daNome={nomeStore(form.da)}
            aNome={nomeStore(form.a)}
            saving={busy}
            onConferma={conferma}
            onModifica={() => setAnteprima(null)}
          />
        ) : (
          <>
            <TrasportoCampi form={form} onChange={setForm} prodotti={dati.prodotti} stores={dati.stores} />
            <Button
              className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 text-white"
              disabled={busy || !form.item || !form.da || !form.a || !(valore > 0)}
              onClick={continua}
            >
              {busy ? 'Controllo…' : 'Continua'}
            </Button>
          </>
        )}
      </NeumorphicCard>

      {redirectTo && (
        <Button variant="outline" className="w-full h-12 text-base" onClick={() => navigate(createPageUrl(redirectTo))}>
          Fine
        </Button>
      )}
    </div>
  );
}