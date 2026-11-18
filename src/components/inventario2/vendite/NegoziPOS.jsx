import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { proponiNegozio } from './posUtils';

const NESSUNO = 'nessuno';

// Abbinamento dei punti vendita del POS agli store: proposto dal nome, confermato dall'admin
export default function NegoziPOS({ negozi, stores, config, onSalvato }) {
  const salvati = config.negozi_pos || {};
  const [scelte, setScelte] = useState(
    Object.fromEntries(negozi.map((n) => [n.id, salvati[n.id] || proponiNegozio(n.nome, stores)]))
  );
  const [busy, setBusy] = useState(false);
  const daConfermare = negozi.some((n) => (salvati[n.id] || '') !== scelte[n.id]);

  const conferma = async () => {
    setBusy(true);
    const negoziPos = Object.fromEntries(Object.entries(scelte).filter(([, storeId]) => storeId));
    await base44.entities.ConfigInventario2.update(config.id, { negozi_pos: negoziPos });
    // Le vendite già importate prendono lo store appena abbinato
    for (const [locationId, storeId] of Object.entries(negoziPos)) {
      let altre = true;
      while (altre) {
        const esito = await base44.entities.VenditaPOS.updateMany(
          { pos_location_id: locationId, store_id: { $ne: storeId } },
          { $set: { store_id: storeId } }
        );
        altre = esito.has_more;
      }
    }
    // I punti vendita rimasti senza store lo perdono anche sulle vendite già importate
    for (const n of negozi.filter((x) => !negoziPos[x.id])) {
      let altre = true;
      while (altre) {
        const esito = await base44.entities.VenditaPOS.updateMany(
          { pos_location_id: n.id, store_id: { $exists: true } },
          { $unset: { store_id: '' } }
        );
        altre = esito.has_more;
      }
    }
    await base44.functions.invoke('inv2Ricalcola', {});
    onSalvato(negoziPos);
    setBusy(false);
    toast({ title: 'Abbinamenti confermati e giacenze ricalcolate' });
  };

  return (
    <NeumorphicCard className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Negozi</h2>
        <p className="text-sm text-slate-500">A quale store corrisponde ogni punto vendita del POS.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {negozi.map((n) => (
          <div key={n.id} className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-700">{n.nome || n.id}</div>
              {!salvati[n.id] && scelte[n.id] && <div className="text-xs text-amber-700">Proposto, da confermare</div>}
            </div>
            <Select value={scelte[n.id] || NESSUNO} onValueChange={(v) => setScelte({ ...scelte, [n.id]: v === NESSUNO ? '' : v })}>
              <SelectTrigger className="w-44" aria-label={`Store di ${n.nome}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NESSUNO}>Nessuno</SelectItem>
                {stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={conferma} disabled={busy || !daConfermare} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Check className="w-4 h-4 mr-2" />
          {busy ? 'Salvataggio…' : 'Conferma abbinamenti'}
        </Button>
      </div>
    </NeumorphicCard>
  );
}