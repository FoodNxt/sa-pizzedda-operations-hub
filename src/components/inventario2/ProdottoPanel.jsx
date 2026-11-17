import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import GiornoFissoCampi from './GiornoFissoCampi';
import { TIPO_LABEL, giornoFissoACf, giornoFissoDaCf } from './inv2Utils';

const TUTTI = 'tutti';

export default function ProdottoPanel({ row, imp, ubicazioni, onClose, onSave }) {
  const [d, setD] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row) return;
    const perLocale = Object.entries(imp.conteggio_fisso_per_ubicazione || {}).map(([k, cf]) => [k, giornoFissoDaCf(cf)]);
    setD({
      unita_conteggio: imp.unita_conteggio || '',
      fattore: imp.fattore_unita_ordine ?? 1,
      peso: imp.peso_unita_conteggio_kg ?? '',
      // Giorno fisso: 'tutti' vale per ogni locale, le altre chiavi sono i locali con un giorno diverso
      fisso: { [TUTTI]: giornoFissoDaCf(imp.conteggio_fisso), ...Object.fromEntries(perLocale) },
      locale: TUTTI,
      note: imp.note || ''
    });
  }, [row?.key]);

  const set = (patch) => setD((prev) => ({ ...prev, ...patch }));
  const diverso = d && d.locale !== TUTTI && !!d.fisso[d.locale];

  const usaTutti = () => {
    const { [d.locale]: _, ...resto } = d.fisso;
    set({ fisso: resto });
  };

  const salva = async () => {
    setSaving(true);
    const { [TUTTI]: tutti, ...perLocale } = d.fisso;
    const patch = {
      unita_conteggio: d.unita_conteggio,
      fattore_unita_ordine: Number(d.fattore) || 1,
      conteggio_fisso: giornoFissoACf(tutti),
      conteggio_fisso_per_ubicazione: Object.fromEntries(Object.entries(perLocale).map(([k, f]) => [k, giornoFissoACf(f)])),
      note: d.note
    };
    if (d.peso !== '') patch.peso_unita_conteggio_kg = Number(d.peso);
    else if (imp.peso_unita_conteggio_kg != null) patch.peso_unita_conteggio_kg = null;
    await onSave(row, patch);
    setSaving(false);
    onClose();
  };

  return (
    <Sheet open={!!row} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {row && d && (
          <div className="space-y-5">
            <SheetHeader>
              <SheetTitle>{row.nome}</SheetTitle>
              <SheetDescription>{TIPO_LABEL[row.tipo]}{row.categoria ? ` · ${row.categoria}` : ''}</SheetDescription>
            </SheetHeader>

            <div className="space-y-2">
              <Label htmlFor="inv2-unita">Unità di conteggio</Label>
              <Input id="inv2-unita" value={d.unita_conteggio} onChange={(e) => set({ unita_conteggio: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="inv2-fattore">Unità di conteggio per 1 unità d'ordine</Label>
                <Input id="inv2-fattore" type="number" min="0" step="any" value={d.fattore} onChange={(e) => set({ fattore: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv2-peso">Peso di 1 unità di conteggio (kg)</Label>
                <Input id="inv2-peso" type="number" min="0" step="any" value={d.peso} onChange={(e) => set({ peso: e.target.value })} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 space-y-4">
              <div className="space-y-2">
                <Label>Locale</Label>
                <div className="flex flex-wrap gap-1.5">
                  {[{ key: TUTTI, label: 'Tutti i locali' }, ...ubicazioni].map((u) => (
                    <button
                      key={u.key}
                      type="button"
                      aria-pressed={d.locale === u.key}
                      onClick={() => set({ locale: u.key })}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border ${d.locale === u.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'}`}
                    >
                      {u.label}{d.fisso[u.key] && u.key !== TUTTI ? ' •' : ''}
                    </button>
                  ))}
                </div>
                {d.locale !== TUTTI && (
                  <p className="text-xs text-slate-500">
                    {diverso ? (
                      <>Giorno diverso solo per questo locale. <button type="button" className="text-blue-600 underline" onClick={usaTutti}>Usa quello di tutti i locali</button></>
                    ) : 'Vale il giorno di tutti i locali. Modificalo qui sotto per cambiarlo solo in questo locale.'}
                  </p>
                )}
              </div>
              <GiornoFissoCampi
                f={d.fisso[d.locale] || d.fisso[TUTTI]}
                onChange={(f) => set({ fisso: { ...d.fisso, [d.locale]: f } })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv2-note">Note</Label>
              <Textarea id="inv2-note" rows={3} value={d.note} onChange={(e) => set({ note: e.target.value })} />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Annulla</Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={salva} disabled={saving}>
                {saving ? 'Salvataggio…' : 'Salva'}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}