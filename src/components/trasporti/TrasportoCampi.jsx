import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { campoSelect, contaAPezzi } from './trasportiUtils';

export default function TrasportoCampi({ form, onChange, prodotti, stores }) {
  const set = (campo) => (e) => onChange({ ...form, [campo]: e.target.value });
  const prodotto = prodotti.find((p) => p.item_id === form.item);
  const aPezzi = contaAPezzi(prodotto?.unita_conteggio);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="tr-prodotto">Prodotto</Label>
        <select id="tr-prodotto" className={campoSelect} value={form.item} onChange={(e) => onChange({ ...form, item: e.target.value, valore: '' })}>
          <option value="">Scegli il prodotto</option>
          {prodotti.map((p) => <option key={p.item_id} value={p.item_id}>{p.nome}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="tr-da">Da</Label>
          <select id="tr-da" className={campoSelect} value={form.da} onChange={set('da')}>
            <option value="">Partenza</option>
            {stores.filter((s) => s.id !== form.a).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tr-a">A</Label>
          <select id="tr-a" className={campoSelect} value={form.a} onChange={set('a')}>
            <option value="">Arrivo</option>
            {stores.filter((s) => s.id !== form.da).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tr-valore">{aPezzi ? 'Numero di pezzi' : 'Peso in kg'}</Label>
        <Input
          id="tr-valore"
          type="number"
          inputMode={aPezzi ? 'numeric' : 'decimal'}
          min="0"
          step={aPezzi ? '1' : '0.01'}
          className="h-12 text-lg"
          placeholder={aPezzi ? '0' : '0,00'}
          value={form.valore}
          onChange={set('valore')}
        />
      </div>
    </div>
  );
}