import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useUbicazioni } from '../useUbicazioni';
import PiantinaMappa, { PARTENZA } from './PiantinaMappa';
import PiantinaProdotti from './PiantinaProdotti';

const selectClass = 'h-9 rounded-md border border-input bg-background px-3 text-sm';

export default function PiantinaTab() {
  const ubicazioni = useUbicazioni();
  const [key, setKey] = useState('');
  const [impostazioni, setImpostazioni] = useState([]);
  const [piantina, setPiantina] = useState(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [caricando, setCaricando] = useState(false);
  const [selezionato, setSelezionato] = useState(null);

  useEffect(() => {
    base44.entities.ImpostazioneInventario2.filter({ incluso: true }, { sort: 'item_nome', limit: 500 }).then((p) => setImpostazioni(p.items));
  }, []);

  useEffect(() => {
    setPiantina(null);
    setUrl('');
    setSelezionato(null);
    if (!key) return;
    setLoading(true);
    (async () => {
      const [rec] = await base44.entities.PiantinaInventario2.filter({ ubicazione_key: key });
      if (rec?.immagine_uri) {
        const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: rec.immagine_uri, expires_in: 3600 });
        setUrl(signed_url);
      }
      setPiantina(rec || null);
      setLoading(false);
    })();
  }, [key]);

  // I prodotti del laboratorio stanno nel laboratorio, non nel negozio che lo ospita
  const prodotti = useMemo(() => {
    const labId = ubicazioni?.find((u) => u.key.startsWith('lab:'))?.key.slice(4);
    if (key.startsWith('lab:')) return impostazioni.filter((i) => i.laboratorio);
    return impostazioni.filter((i) => !(i.laboratorio && (i.solo_laboratorio || key === labId)));
  }, [impostazioni, ubicazioni, key]);

  const pin = piantina?.pin || {};

  const salva = async (patch) => {
    setPiantina((prev) => ({ ...prev, ...patch }));
    await base44.entities.PiantinaInventario2.update(piantina.id, patch);
  };

  const caricaImmagine = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setCaricando(true);
    try {
      const anteprima = URL.createObjectURL(file);
      const img = new Image();
      img.src = anteprima;
      await img.decode();
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const dati = { immagine_uri: file_uri, rapporto: img.naturalWidth / img.naturalHeight };
      if (piantina) await salva(dati);
      else setPiantina(await base44.entities.PiantinaInventario2.create({ ubicazione_key: key, pin: {}, ...dati }));
      setUrl(anteprima);
    } catch (err) {
      toast({ title: 'Piantina non caricata', description: err.message, variant: 'destructive' });
    }
    setCaricando(false);
  };

  const posiziona = (punto) => {
    if (selezionato === PARTENZA) {
      salva({ partenza: punto });
      setSelezionato(null);
      return;
    }
    const nuovi = { ...pin, [selezionato]: punto };
    salva({ pin: nuovi });
    // Passa al prossimo prodotto ancora senza pin
    setSelezionato(prodotti.find((p) => !nuovi[p.item_id])?.item_id || null);
  };

  const togli = (id) => {
    if (id === PARTENZA) return salva({ partenza: null });
    const { [id]: _, ...resto } = pin;
    salva({ pin: resto });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select aria-label="Locale" className={selectClass} value={key} onChange={(e) => setKey(e.target.value)}>
          <option value="">Seleziona un locale</option>
          {(ubicazioni || []).map((u) => <option key={u.key} value={u.key}>{u.nome}</option>)}
        </select>
        {key && !loading && (
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Upload className="w-4 h-4" />
            {caricando ? 'Caricamento…' : url ? 'Cambia piantina' : 'Carica piantina'}
            <input type="file" accept="image/*" className="hidden" disabled={caricando} onChange={caricaImmagine} />
          </label>
        )}
      </div>

      {!key ? (
        <p className="text-sm text-slate-500">Scegli un locale per caricare la piantina e segnare dove si trova ogni prodotto.</p>
      ) : loading ? (
        <p className="text-sm text-slate-500">Caricamento…</p>
      ) : !url ? (
        <p className="text-sm text-slate-500">Questo locale non ha ancora una piantina. Carica un'immagine per iniziare a mettere i pin.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px] items-start">
          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              {selezionato ? 'Clicca sulla piantina nel punto in cui si trova la voce selezionata.' : 'Scegli una voce dall\'elenco, poi clicca sulla piantina per posizionarla.'}
            </p>
            <PiantinaMappa url={url} pin={pin} partenza={piantina.partenza} prodotti={prodotti} selezionato={selezionato} onPosiziona={posiziona} onSeleziona={setSelezionato} />
          </div>
          <PiantinaProdotti prodotti={prodotti} pin={pin} partenza={piantina.partenza} selezionato={selezionato} onSeleziona={setSelezionato} onTogli={togli} />
        </div>
      )}
    </div>
  );
}