import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Save } from 'lucide-react';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { DEFAULT_CONFIG, MODALITA } from './inv2Utils';
import ChecklistAttivo from './ChecklistAttivo';
import ImportaVendite from './ImportaVendite';
import InizioStorico from './InizioStorico';
import RicetteEscluse from './RicetteEscluse';
import { oggiLocale } from '@/components/laboratorio/labUtils';

export default function ConfigurazioneTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stores, setStores] = useState([]);
  const [ricette, setRicette] = useState([]);
  const [configId, setConfigId] = useState(null);
  const [cfg, setCfg] = useState(DEFAULT_CONFIG);
  const [confronto, setConfronto] = useState({});

  // Valori della checklist: gli stessi della pagina Confronto, per gli store in affiancamento
  const caricaConfronto = () => base44.functions.invoke('inv2Analisi', { azione: 'confronto' })
    .then((r) => setConfronto(Object.fromEntries(r.data.stores.map((s) => [s.store_id, s]))))
    .catch(() => setConfronto({}));

  useEffect(() => {
    caricaConfronto();
    (async () => {
      const [s, r, configs] = await Promise.all([
        base44.entities.Store.list(),
        base44.entities.Ricetta.filter({ is_semilavorato: true }),
        base44.entities.ConfigInventario2.list()
      ]);
      setStores(s);
      setRicette(r);
      // Senza una scelta salvata vale la Pallina, come nel calcolo
      set({ ricette_escluse_dal_consumo_negozio: r.filter((x) => x.nome_prodotto === 'Pallina').map((x) => x.id) });
      const rec = configs[0];
      if (rec) {
        setConfigId(rec.id);
        setCfg((prev) => ({
          ...prev,
          ...rec,
          modalita_per_store: rec.modalita_per_store || {},
          intervallo_max_giorni_per_categoria: { ...DEFAULT_CONFIG.intervallo_max_giorni_per_categoria, ...(rec.intervallo_max_giorni_per_categoria || {}) }
        }));
      }
      setLoading(false);
    })();
  }, []);

  const set = (patch) => setCfg((prev) => ({ ...prev, ...patch }));

  const salva = async () => {
    setSaving(true);
    const modalita = {};
    stores.forEach((s) => { modalita[s.id] = cfg.modalita_per_store[s.id] || 'spento'; });
    const intervalli = {};
    Object.entries(cfg.intervallo_max_giorni_per_categoria).forEach(([k, v]) => { intervalli[k] = Number(v) || 0; });
    // L'affiancamento parte dal giorno in cui viene salvato
    const inizio = {};
    stores.forEach((s) => {
      if (modalita[s.id] === 'affiancamento') inizio[s.id] = cfg.affiancamento_dal_per_store?.[s.id] || oggiLocale();
    });
    const data = {
      modalita_per_store: modalita,
      affiancamento_dal_per_store: inizio,
      inizio_storico_per_store: Object.fromEntries(Object.entries(cfg.inizio_storico_per_store || {}).filter(([, giorno]) => giorno)),
      lab_store_id: cfg.lab_store_id,
      basi_ricetta_id: cfg.basi_ricetta_id || '',
      ricette_escluse_dal_consumo_negozio: cfg.ricette_escluse_dal_consumo_negozio || [],
      limite_voci_sera: Number(cfg.limite_voci_sera) || 0,
      intervallo_max_giorni_per_categoria: intervalli,
      soglia_affidabilita: Number(cfg.soglia_affidabilita) || 0
    };
    if (configId) await base44.entities.ConfigInventario2.update(configId, data);
    else setConfigId((await base44.entities.ConfigInventario2.create(data)).id);
    set({ affiancamento_dal_per_store: inizio });
    await caricaConfronto();
    setSaving(false);
    toast({ title: 'Configurazione salvata' });
  };

  if (loading) {
    return <NeumorphicCard className="p-8 text-center"><p className="text-slate-500">Caricamento configurazione...</p></NeumorphicCard>;
  }

  return (
    <div className="space-y-4">
      <NeumorphicCard className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Modalità per store</h2>
          <p className="text-sm text-slate-500">Spento: solo inventario attuale. Affiancamento: i due sistemi lavorano insieme. Attivo: Inventario 2.0.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {stores.map((s) => (
            <div key={s.id} className="rounded-xl border border-slate-200 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-700">
                {s.name}{s.status !== 'active' ? ' (non attivo)' : ''}
              </span>
              <Select
                value={cfg.modalita_per_store[s.id] || 'spento'}
                onValueChange={(v) => set({ modalita_per_store: { ...cfg.modalita_per_store, [s.id]: v } })}
              >
                <SelectTrigger className="w-44" aria-label={`Modalità ${s.name}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODALITA.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
              {confronto[s.id] && (
                <div>
                  <p className="text-xs uppercase text-slate-500 mb-1">Per passare ad attivo</p>
                  <ChecklistAttivo dati={confronto[s.id]} />
                </div>
              )}
            </div>
          ))}
        </div>
      </NeumorphicCard>

      <NeumorphicCard className="p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Laboratorio e conteggi</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Store del laboratorio</Label>
            <Select value={cfg.lab_store_id} onValueChange={(v) => set({ lab_store_id: v })}>
              <SelectTrigger><SelectValue placeholder="Seleziona uno store" /></SelectTrigger>
              <SelectContent>
                {stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ricetta delle basi</Label>
            <Select value={cfg.basi_ricetta_id || undefined} onValueChange={(v) => set({ basi_ricetta_id: v })}>
              <SelectTrigger><SelectValue placeholder="Seleziona un semilavorato" /></SelectTrigger>
              <SelectContent>
                {ricette.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome_prodotto}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv2-limite">Limite voci per sera</Label>
            <Input id="inv2-limite" type="number" min="1" value={cfg.limite_voci_sera} onChange={(e) => set({ limite_voci_sera: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv2-soglia">Soglia di affidabilità (0-1)</Label>
            <Input id="inv2-soglia" type="number" min="0" max="1" step="0.05" value={cfg.soglia_affidabilita} onChange={(e) => set({ soglia_affidabilita: e.target.value })} />
          </div>
        </div>
      </NeumorphicCard>

      <NeumorphicCard className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Intervalli massimi tra due conteggi</h2>
          <p className="text-sm text-slate-500">Giorni massimi per categoria.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(cfg.intervallo_max_giorni_per_categoria).map(([cat, giorni]) => (
            <div key={cat} className="space-y-1.5">
              <Label htmlFor={`inv2-int-${cat}`} className="capitalize">{cat}</Label>
              <Input
                id={`inv2-int-${cat}`}
                type="number"
                min="1"
                value={giorni}
                onChange={(e) => set({ intervallo_max_giorni_per_categoria: { ...cfg.intervallo_max_giorni_per_categoria, [cat]: e.target.value } })}
              />
            </div>
          ))}
        </div>
      </NeumorphicCard>

      <InizioStorico
        stores={stores}
        valori={cfg.inizio_storico_per_store || {}}
        onChange={(valori) => set({ inizio_storico_per_store: valori })}
      />

      <RicetteEscluse
        ricette={ricette}
        escluse={cfg.ricette_escluse_dal_consumo_negozio || []}
        onChange={(ids) => set({ ricette_escluse_dal_consumo_negozio: ids })}
      />

      <ImportaVendite />

      <div className="flex justify-end">
        <Button onClick={salva} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvataggio…' : 'Salva configurazione'}
        </Button>
      </div>
    </div>
  );
}