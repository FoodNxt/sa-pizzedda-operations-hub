import React, { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { base44 } from '@/api/base44Client';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { numero } from './labUtils';

const SETTIMANE = 6;
const lunedi = (d) => moment(d).startOf('isoWeek').format('YYYY-MM-DD');

export default function TotaliSettimanali({ versione }) {
  const [produzioni, setProduzioni] = useState(null);
  const settimane = useMemo(
    () => Array.from({ length: SETTIMANE }, (_, i) => lunedi(moment().subtract(SETTIMANE - 1 - i, 'weeks'))),
    []
  );

  useEffect(() => {
    (async () => {
      const page = await base44.entities.ProduzioneLab.filter(
        { annullata: false, data_produzione: { $gte: settimane[0] } },
        { sort: '-data_produzione', limit: 500 }
      );
      setProduzioni(page.items);
    })();
  }, [versione]);

  const righe = useMemo(() => {
    const perItem = {};
    (produzioni || []).forEach((p) => {
      const r = (perItem[p.item_id] ||= { id: p.item_id, nome: p.item_nome, unita: p.unita, totali: {} });
      const s = lunedi(p.data_produzione);
      r.totali[s] = (r.totali[s] || 0) + (p.quantita || 0);
    });
    return Object.values(perItem).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  }, [produzioni]);

  return (
    <NeumorphicCard className="p-5 space-y-3">
      <h2 className="text-lg font-bold text-slate-900">Totale prodotto per settimana</h2>
      {!produzioni ? (
        <p className="text-sm text-slate-500">Caricamento...</p>
      ) : righe.length === 0 ? (
        <p className="text-sm text-slate-500">Nessuna produzione nelle ultime {SETTIMANE} settimane.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="py-2 pr-4 font-medium">Semilavorato</th>
                {settimane.map((s) => (
                  <th key={s} className="py-2 px-2 font-medium text-right whitespace-nowrap">dal {moment(s).format('DD/MM')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {righe.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="py-2 pr-4 font-medium text-slate-900 whitespace-nowrap">{r.nome} <span className="text-slate-400 font-normal">({r.unita})</span></td>
                  {settimane.map((s) => (
                    <td key={s} className="py-2 px-2 text-right text-slate-700">{r.totali[s] ? numero(r.totali[s]) : '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </NeumorphicCard>
  );
}