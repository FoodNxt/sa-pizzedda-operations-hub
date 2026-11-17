import React from 'react';
import { ArrowRight, CheckCircle2, Truck } from 'lucide-react';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { numeroIt, unitaBreve } from './trasportiUtils';

export default function DaPortareCard({ voci, onScegli }) {
  return (
    <NeumorphicCard className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Truck className="w-5 h-5 text-orange-500" />
        <h2 className="text-lg font-bold text-slate-900">Da portare</h2>
      </div>
      {voci.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          Niente da portare per ora.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {voci.map((v) => (
            <li key={v.id}>
              <button type="button" className="w-full py-2 flex items-center justify-between gap-3 text-left" onClick={() => onScegli(v)}>
                <span className="min-w-0">
                  <span className="block font-medium text-slate-900 truncate">{v.nome}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    {v.daNome} <ArrowRight className="w-3 h-3" /> {v.aNome}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-orange-100 text-orange-800 px-3 py-1 text-sm font-bold">
                  {numeroIt(v.quanto, 2)} {unitaBreve(v.unita)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </NeumorphicCard>
  );
}