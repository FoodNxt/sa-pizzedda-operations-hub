import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { ChefHat } from 'lucide-react';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { segnaAttivitaTurno } from '@/lib/segnaAttivitaTurno';
import ProduzioneCard from './ProduzioneCard';
import DaProdurreCard from './DaProdurreCard';
import ProduzioniOggi from './ProduzioniOggi';
import { dataCreazione, erroreFunzione } from './labUtils';

const LAB_STORE_DEFAULT = '6908b4f284cb01bc8402b4ee';
const sommaNegozi = (obj) => Object.entries(obj || {}).reduce((s, [k, v]) => (k.startsWith('lab:') ? s : s + (Number(v) || 0)), 0);

export default function LaboratorioForm() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTo = urlParams.get('redirect');
  const turnoId = urlParams.get('turno_id');
  const attivitaNome = urlParams.get('attivita');

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [dati, setDati] = useState({ config: {}, impostazioni: [], ricette: [], giacenze: [], mie: [] });
  const attivitaSegnata = useRef(false);

  const carica = async () => {
    const u = await base44.auth.me();
    const [configs, impostazioni, ricette, giacenze, mie] = await Promise.all([
      base44.entities.ConfigInventario2.list(),
      base44.entities.ImpostazioneInventario2.filter({ item_tipo: 'semilavorato' }),
      base44.entities.Ricetta.filter({ is_semilavorato: true }),
      base44.entities.GiacenzaStimata.filter({ item_tipo: 'semilavorato', ubicazione_tipo: 'negozio' }),
      base44.entities.ProduzioneLab.filter({ operatore_email: u.email }, { sort: '-created_date', limit: 30 })
    ]);
    setUser(u);
    setDati({ config: configs[0] || {}, impostazioni, ricette, giacenze, mie: mie.items });
    setLoading(false);
  };

  useEffect(() => { carica(); }, []);

  const { prodotti, basi, daProdurre, oggi } = useMemo(() => {
    const impById = Object.fromEntries(dati.impostazioni.map((i) => [i.item_id, i]));
    const basiRicetta = dati.ricette.find((r) => r.id === dati.config.basi_ricetta_id);
    const lista = dati.ricette
      .filter((r) => impById[r.id]?.producibile_lab && r.id !== basiRicetta?.id)
      .sort((a, b) => a.nome_prodotto.localeCompare(b.nome_prodotto, 'it'));
    const voci = [...lista, basiRicetta].filter(Boolean).map((r) => {
      const imp = impById[r.id] || {};
      const min = sommaNegozi(imp.min_per_ubicazione);
      const max = Math.max(sommaNegozi(imp.max_per_ubicazione), min);
      const giacenza = dati.giacenze.filter((g) => g.item_id === r.id).reduce((s, g) => s + (g.giacenza_stimata || 0), 0);
      return { id: r.id, nome: r.nome_prodotto, unita: imp.unita_conteggio || '', min, giacenza, quanto: max - giacenza };
    }).filter((v) => v.min > 0 && v.giacenza < v.min);
    const adesso = new Date().toDateString();
    return {
      prodotti: lista,
      basi: basiRicetta,
      daProdurre: voci,
      oggi: dati.mie.filter((p) => dataCreazione(p).toDateString() === adesso)
    };
  }, [dati]);

  // Come FormInventario: segna completata l'attività del turno da cui si arriva
  const segnaAttivita = async () => {
    if (!turnoId || !attivitaNome || attivitaSegnata.current) return;
    attivitaSegnata.current = true;
    await segnaAttivitaTurno({ user, storeId: dati.config.lab_store_id || LAB_STORE_DEFAULT, formPage: 'LaboratorioProduzioni' });
  };

  const registra = async (ricetta, unita, { data, quantita }) => {
    try {
      await base44.functions.invoke('inv2RegistraProduzione', { item_id: ricetta.id, data_produzione: data, quantita, unita });
      toast({ title: `${ricetta.nome_prodotto}: produzione registrata` });
      await segnaAttivita();
      await carica();
      return true;
    } catch (e) {
      toast({ title: 'Produzione non registrata', description: erroreFunzione(e), variant: 'destructive' });
      return false;
    }
  };

  const annulla = async (p) => {
    try {
      await base44.functions.invoke('inv2AnnullaProduzione', { produzione_id: p.id });
      toast({ title: 'Produzione annullata' });
      await carica();
    } catch (e) {
      toast({ title: 'Annullamento non riuscito', description: erroreFunzione(e), variant: 'destructive' });
    }
  };

  if (loading) {
    return <NeumorphicCard className="p-8 text-center max-w-md mx-auto"><p className="text-slate-500">Caricamento...</p></NeumorphicCard>;
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
          <ChefHat className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laboratorio</h1>
          <p className="text-sm text-slate-500">Registra quello che hai prodotto</p>
        </div>
      </div>

      <DaProdurreCard voci={daProdurre} />

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Produzioni</h2>
        {prodotti.length === 0 ? (
          <NeumorphicCard className="p-4"><p className="text-sm text-slate-500">Nessun semilavorato è impostato come producibile in laboratorio.</p></NeumorphicCard>
        ) : (
          prodotti.map((r) => {
            const unita = r.unita_misura_prodotta || 'grammi';
            return <ProduzioneCard key={r.id} id={r.id} titolo={r.nome_prodotto} unita={unita} onRegistra={(v) => registra(r, unita, v)} />;
          })
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Basi</h2>
        {basi ? (
          <ProduzioneCard id="basi" titolo={basi.nome_prodotto} unita="pezzi" etichettaQuantita="Numero di basi" onRegistra={(v) => registra(basi, 'pezzi', v)} />
        ) : (
          <NeumorphicCard className="p-4"><p className="text-sm text-slate-500">La ricetta delle basi non è ancora stata scelta nelle impostazioni.</p></NeumorphicCard>
        )}
      </section>

      <ProduzioniOggi produzioni={oggi} onAnnulla={annulla} />

      {redirectTo && (
        <Button variant="outline" className="w-full h-12 text-base" onClick={() => navigate(createPageUrl(redirectTo))}>
          Fine
        </Button>
      )}
    </div>
  );
}