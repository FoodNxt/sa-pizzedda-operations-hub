import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Save, Store } from 'lucide-react';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { toast } from '@/components/ui/use-toast';
import { segnaAttivitaTurno } from '@/lib/segnaAttivitaTurno';
import { erroreFunzione } from '@/components/laboratorio/labUtils';
import ListaConteggio from './ListaConteggio';

export default function ConteggioForm() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTo = urlParams.get('redirect');
  const lab = urlParams.get('ubicazione') === 'laboratorio';

  const [user, setUser] = useState(null);
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(urlParams.get('store_id') || '');
  const [dati, setDati] = useState(null);
  const [valori, setValori] = useState({});
  const [extra, setExtra] = useState([]);
  const [saving, setSaving] = useState(false);
  const [salvato, setSalvato] = useState(false);

  const richiesta = { store_id: storeId, ubicazione: lab ? 'laboratorio' : 'negozio' };
  const pronto = lab || !!storeId;

  const caricaLista = async () => {
    setDati(null);
    setValori({});
    setExtra([]);
    try {
      setDati((await base44.functions.invoke('inv2Conteggio', { azione: 'lista', ...richiesta })).data);
    } catch (e) {
      toast({ title: 'Lista non caricata', description: erroreFunzione(e), variant: 'destructive' });
    }
  };

  useEffect(() => {
    base44.auth.me().then(setUser);
    if (!lab) base44.entities.Store.list().then(setStores);
  }, []);

  useEffect(() => {
    if (pronto) caricaLista();
  }, [storeId]);

  const visibili = dati ? [...dati.righe, ...extra] : [];
  const vuoti = visibili.filter((r) => valori[r.item_id] == null || valori[r.item_id] === '').length;

  const fine = async () => {
    await segnaAttivitaTurno({ user, storeId: dati.store_id, formPage: 'FormInventario2' });
    if (redirectTo) navigate(createPageUrl(redirectTo));
  };

  const salva = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.functions.invoke('inv2Conteggio', {
        azione: 'salva',
        ...richiesta,
        turno_id: urlParams.get('turno_id'),
        previsti: dati.righe.map((r) => r.item_id),
        conteggi: visibili.map((r) => ({ item_id: r.item_id, quantita: Number(valori[r.item_id]) }))
      });
      setSalvato(true);
      await segnaAttivitaTurno({ user, storeId: dati.store_id, formPage: 'FormInventario2' });
      setTimeout(() => {
        if (redirectTo) return navigate(createPageUrl(redirectTo));
        setSalvato(false);
        caricaLista();
      }, 1500);
    } catch (err) {
      toast({ title: 'Inventario non salvato', description: erroreFunzione(err), variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="mb-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-1">Inventario</h1>
        <p className="text-sm text-slate-500">
          {lab ? 'Conta i prodotti del magazzino del laboratorio' : 'Conta i prodotti della lista di stasera'}
        </p>
      </div>

      {salvato && (
        <NeumorphicCard className="p-4 bg-green-50 border-2 border-green-400">
          <div className="flex items-center gap-3">
            <Save className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800 font-medium">Inventario salvato con successo!</p>
          </div>
        </NeumorphicCard>
      )}

      <form onSubmit={salva} className="space-y-4">
        {!lab && (
          <NeumorphicCard className="p-4 lg:p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Store className="w-5 h-5" />
              Seleziona Locale
            </h2>
            <div className="flex flex-wrap gap-2">
              {stores.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStoreId(s.id)}
                  className={`px-4 py-3 rounded-xl font-medium transition-all ${
                    storeId === s.id ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'neumorphic-flat text-slate-700 hover:shadow-md'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </NeumorphicCard>
        )}

        {pronto && !dati && (
          <NeumorphicCard className="p-8 text-center"><p className="text-slate-500">Caricamento...</p></NeumorphicCard>
        )}

        {dati && (
          <>
            <ListaConteggio
              dati={dati}
              extra={extra}
              valori={valori}
              onValore={(id, v) => setValori((prev) => ({ ...prev, [id]: v }))}
              onAggiungi={(p) => setExtra((prev) => [...prev, p])}
              onRimuovi={(id) => setExtra((prev) => prev.filter((r) => r.item_id !== id))}
            />

            {visibili.length > 0 ? (
              <>
                {vuoti > 0 && (
                  <p className="text-sm text-center text-red-600 font-medium">
                    {vuoti === 1 ? 'Manca 1 prodotto' : `Mancano ${vuoti} prodotti`}: se non ce n'è, scrivi 0.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={saving || salvato || vuoti > 0}
                  className="w-full py-3 lg:py-4 rounded-xl text-base lg:text-lg font-bold flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Salvataggio…' : 'Salva inventario'}
                </button>
              </>
            ) : redirectTo && (
              <button type="button" onClick={fine} className="w-full neumorphic-flat py-3 rounded-xl text-base font-bold text-slate-700">
                Fine
              </button>
            )}
          </>
        )}
      </form>
    </div>
  );
}