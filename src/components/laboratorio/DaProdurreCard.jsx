import React from 'react';
import { CheckCircle2, Flame } from 'lucide-react';
import NeumorphicCard from '@/components/neumorphic/NeumorphicCard';
import { numero } from './labUtils';

export default function DaProdurreCard({ voci }) {
  return (
    <NeumorphicCard className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Flame className="w-5 h-5 text-orange-500" />
        <h2 className="text-lg font-bold text-slate-900">Da produrre</h2>
      </div>
      {voci.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          Niente da produrre per ora.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {voci.map((v) => (
            <li key={v.id} className="py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900 truncate">{v.nome}</p>
                <p className="text-xs text-slate-500">
                  In negozio circa {numero(v.giacenza)} {v.unita}, minimo {numero(v.min)}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-orange-100 text-orange-800 px-3 py-1 text-sm font-bold">
                {numero(v.quanto)} {v.unita}
              </span>
            </li>
          ))}
        </ul>
      )}
    </NeumorphicCard>
  );
}