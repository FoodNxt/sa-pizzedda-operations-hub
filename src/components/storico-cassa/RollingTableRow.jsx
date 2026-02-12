import React from 'react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Edit, X } from 'lucide-react';

export default function RollingTableRow({ entry, dayDate, saldiManuali, onEditClick, onDeleteClick }) {
  const diffInizio = entry.conteggiInizio ? entry.conteggiInizio - entry.cassaTeoricaInitial : null;
  const diffFinale = entry.conteggiFinale ? entry.conteggiFinale - entry.cassaTeoricaFinale : null;



  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Delete button clicked!');
    onDeleteClick();
  };

  return (
    <>
      <tr className="border-b border-slate-200 hover:bg-slate-50">
        <td className="p-3 font-bold text-slate-800">{entry.store_name}</td>
        <td className="p-3 text-right">
          <div className="flex flex-col items-end gap-2">
            <span className={`text-sm font-bold ${entry.cassaTeoricaInitialManual ? 'text-orange-600' : 'text-blue-600'}`}>
              €{entry.cassaTeoricaInitial.toFixed(2)}
            </span>
            {entry.cassaTeoricaInitialManual && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">Manuale</span>
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="p-1 hover:bg-red-100 rounded transition-colors cursor-pointer">
                  <X className="w-3 h-3 text-red-600" />
                </button>
              </div>
            )}
          </div>
        </td>
        <td className="p-3 text-right">
          <span className="text-sm font-bold text-green-600">+€{entry.pagamentiContanti.toFixed(2)}</span>
        </td>
        <td className="p-3 text-right">
          <span className="text-sm font-bold text-red-600">-€{entry.prelievi.toFixed(2)}</span>
        </td>
        <td className="p-3 text-right">
          <span className="text-sm font-bold text-blue-700 bg-blue-50 px-3 py-2 rounded">
            €{entry.cassaTeoricaFinale.toFixed(2)}
          </span>
        </td>
        <td className="p-3 text-xs">
          {entry.conteggiInizio || entry.conteggiFinale ? (
            <div className="space-y-1">
              {entry.conteggiInizio && (
                <div>
                  <p className="text-slate-600">Inizio: €{entry.conteggiInizio.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">{format(parseISO(entry.conteggiInizioOra), 'HH:mm')} - {entry.conteggiInizioRilevatoDa}</p>
                </div>
              )}
              {entry.conteggiFinale && (
                <div>
                  <p className="text-slate-600">Fine: €{entry.conteggiFinale.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">{format(parseISO(entry.conteggiFinaleOra), 'HH:mm')} - {entry.conteggiFinaleRilevatoDa}</p>
                </div>
              )}
            </div>
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </td>
        <td className="p-3 text-center">
          <div className="space-y-1">
            {diffInizio !== null && (
              <div className={`text-xs font-bold px-2 py-1 rounded ${diffInizio >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {diffInizio >= 0 ? '+' : ''}€{diffInizio.toFixed(2)}
              </div>
            )}
            {diffFinale !== null && (
              <div className={`text-xs font-bold px-2 py-1 rounded ${diffFinale >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {diffFinale >= 0 ? '+' : ''}€{diffFinale.toFixed(2)}
              </div>
            )}
          </div>
        </td>
      </tr>

      {entry.conteggiInizio && entry.differenciaInizio !== null && entry.differenciaInizio > 0.5 && (
        <tr className="bg-orange-50 border-b border-orange-200">
          <td colSpan="7" className="p-3 text-xs text-orange-800">
            ⚠️ <strong>Differenza inizio giornata:</strong> €{entry.differenciaInizio.toFixed(2)}
          </td>
        </tr>
      )}

      {entry.conteggiFinale && entry.differenciaFinale !== null && entry.differenciaFinale > 0.5 && (
        <tr className="bg-red-50 border-b border-red-200">
          <td colSpan="7" className="p-3 text-xs text-red-800">
            ❌ <strong>Differenza fine giornata:</strong> €{entry.differenciaFinale.toFixed(2)}
          </td>
        </tr>
      )}
    </>
  );
}