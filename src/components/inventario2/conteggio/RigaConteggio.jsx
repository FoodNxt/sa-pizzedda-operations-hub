import React from 'react';
import { Package, X } from 'lucide-react';
import DettagliAdmin from './DettagliAdmin';

// I grammi si pesano e si scrivono interi
const DECIMALI = ['kg', 'litri', 'ml'];

export default function RigaConteggio({ riga, valore, onChange, onRimuovi, dettagli, ricontrolla }) {
  const decimale = DECIMALI.includes(riga.unita);
  return (
    <div className={`neumorphic-pressed p-3 rounded-xl flex items-center gap-3 ${ricontrolla ? 'ring-2 ring-red-500' : ''}`}>
      {riga.foto ? (
        <img src={riga.foto} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Package className="w-6 h-6 text-slate-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-800 text-base">{riga.nome}</h3>
        <p className="text-sm text-slate-500">{riga.unita}</p>
        {riga.unita === 'grammi' && <p className="text-sm font-medium text-blue-700">Pesa e scrivi i grammi (es. 1250)</p>}
        {ricontrolla && <span className="block text-sm font-bold text-red-600">Ricontrolla questo prodotto</span>}
        {dettagli && <DettagliAdmin riga={riga} />}
      </div>
      <input
        type="number"
        inputMode={decimale ? 'decimal' : 'numeric'}
        step={decimale ? '0.01' : '1'}
        min="0"
        aria-label={`Quantità di ${riga.nome}`}
        value={valore ?? ''}
        onChange={(e) => onChange(riga.unita === 'grammi' && e.target.value !== '' ? String(Math.floor(Number(e.target.value) || 0)) : e.target.value)}
        className="w-28 neumorphic-pressed px-3 py-4 rounded-xl outline-none text-xl font-bold text-slate-700 text-center"
      />
      {onRimuovi && (
        <button type="button" onClick={onRimuovi} aria-label={`Togli ${riga.nome}`} className="p-2 text-slate-400 hover:text-red-600">
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}