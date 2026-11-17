import React, { useState } from 'react';
import { AlertTriangle, Mail, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { erroreFunzione, giorno } from '@/components/laboratorio/labUtils';
import { numeroIt } from '@/components/trasporti/trasportiUtils';
import RigaOrdine from './RigaOrdine';
import EmailOrdineDialog from './EmailOrdineDialog';
import { buildOrdine, copertura, euro, testoEmail, totaleNetto } from './ordiniUtils';

export default function GruppoOrdine({ gruppo, ubicazione, onInviato }) {
  const [qta, setQta] = useState(() => Object.fromEntries(gruppo.prodotti.filter((p) => p.quantita > 0).map((p) => [p.item_id, p.quantita])));
  const [email, setEmail] = useState(false);
  const [invio, setInvio] = useState(false);

  const righe = gruppo.prodotti.filter((p) => p.item_id in qta);
  const altri = gruppo.prodotti.filter((p) => !(p.item_id in qta));
  const daInviare = righe.filter((p) => qta[p.item_id] > 0);
  const totale = totaleNetto(righe, qta);
  const minimo = gruppo.fornitore.ordine_minimo;
  const mancano = daInviare.length && totale < minimo ? minimo - totale : 0;
  const daAumentare = gruppo.prodotti
    .map((p) => ({ p, giorni: copertura(p, qta[p.item_id] || 0) }))
    .filter((x) => x.giorni != null)
    .sort((a, b) => a.giorni - b.giorni)
    .slice(0, 3);
  const simulazione = ubicazione.modalita === 'spento';

  const set = (id, v) => setQta((prev) => ({ ...prev, [id]: v }));
  const rimuovi = (id) => setQta(({ [id]: _, ...resto }) => resto);

  const invia = async (mail) => {
    setInvio(true);
    try {
      if (mail) {
        await base44.functions.invoke('inviaEmailOrdineFornitore', { to: gruppo.fornitore.email, subject: mail.subject, body: mail.body, from_name: 'Sa Pizzedda' });
      }
      await base44.entities.OrdineFornitore.create(buildOrdine(gruppo, ubicazione, daInviare, qta));
      toast({ title: mail ? 'Email inviata e ordine segnato come inviato' : 'Ordine segnato come inviato' });
      setEmail(false);
      onInviato();
    } catch (e) {
      toast({ title: 'Ordine non inviato', description: erroreFunzione(e), variant: 'destructive' });
    }
    setInvio(false);
  };

  return (
    <NeumorphicCard className="p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{gruppo.fornitore.ragione_sociale}</h2>
          <p className="text-sm text-slate-500">{ubicazione.nome} · Prossima consegna: {giorno(gruppo.prossima_consegna)}</p>
        </div>
        <div className="flex gap-2">
          {!gruppo.scatta && <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600">Non scatta</span>}
          {simulazione && <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-800">Simulazione</span>}
        </div>
      </div>

      {gruppo.ordini_aperti.length > 0 && (
        <p className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          C'è già un ordine inviato a questo fornitore per {ubicazione.store_name} ({gruppo.ordini_aperti.map((d) => new Date(d).toLocaleDateString('it-IT')).join(', ')}).
        </p>
      )}

      {righe.length === 0 ? (
        <p className="text-sm text-slate-500">Nessun prodotto da ordinare.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 860 }}>
            <thead>
              <tr className="text-xs uppercase text-slate-500 text-left">
                <th className="py-2 pr-3 font-medium">Prodotto</th>
                <th className="py-2 pr-3 font-medium">Giacenza stimata</th>
                <th className="py-2 pr-3 font-medium">Min / Max</th>
                <th className="py-2 pr-3 font-medium">In arrivo</th>
                <th className="py-2 pr-3 font-medium">Giorni copertura</th>
                <th className="py-2 pr-3 font-medium">Quantità</th>
                <th className="py-2 pr-3 font-medium text-right">Netto</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {righe.map((p) => (
                <RigaOrdine key={p.item_id} p={p} quantita={qta[p.item_id]} onQuantita={(v) => set(p.item_id, v)} onRimuovi={() => rimuovi(p.item_id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {altri.length > 0 && (
        <select
          aria-label="Aggiungi un prodotto dello stesso fornitore"
          className="rounded-md border border-slate-200 px-3 py-2 text-sm max-w-full"
          value=""
          onChange={(e) => set(e.target.value, 1)}
        >
          <option value="">+ Aggiungi prodotto</option>
          {altri.map((p) => (
            <option key={p.item_id} value={p.item_id}>
              {p.nome} · giacenza {numeroIt(p.giacenza, 2)} {p.unita_conteggio} · min {numeroIt(p.min, 2)} / max {numeroIt(p.max, 2)}
            </option>
          ))}
        </select>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="text-sm">
          <p className="text-slate-900"><span className="font-bold">Totale netto: {euro(totale)}</span> · Ordine minimo: {minimo ? euro(minimo) : 'nessuno'}</p>
          {mancano > 0 && (
            <p className="text-red-700 font-medium">
              Mancano {euro(mancano)} al minimo.
              {daAumentare.length > 0 && ` Da aumentare: ${daAumentare.map((x) => `${x.p.nome} (${numeroIt(x.giorni, 1)} giorni)`).join(', ')}.`}
            </p>
          )}
        </div>
        {!simulazione && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={invio || !daInviare.length || !gruppo.fornitore.email}
              title={gruppo.fornitore.email ? '' : 'Il fornitore non ha un indirizzo email'}
              onClick={() => setEmail(true)}
            >
              <Mail className="w-4 h-4 mr-2" />Invia email
            </Button>
            <Button variant="outline" disabled={invio || !daInviare.length} onClick={() => invia(null)}>
              <Check className="w-4 h-4 mr-2" />Segna inviato
            </Button>
          </div>
        )}
      </div>

      {email && (
        <EmailOrdineDialog
          to={gruppo.fornitore.email}
          iniziale={testoEmail(gruppo, ubicazione, daInviare, qta)}
          invio={invio}
          onInvia={(subject, body) => invia({ subject, body })}
          onClose={() => setEmail(false)}
        />
      )}
    </NeumorphicCard>
  );
}