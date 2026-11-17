import React from 'react';
import { Flag, MapPin } from 'lucide-react';

export const PARTENZA = 'partenza';

function Segno({ punto, nome, attivo, partenza, onClick }) {
  const Icona = partenza ? Flag : MapPin;
  const colore = attivo ? 'text-blue-600' : partenza ? 'text-green-600' : 'text-red-500';
  return (
    <div
      role="button"
      tabIndex={0}
      title={nome}
      aria-label={nome}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      className={`absolute -translate-x-1/2 -translate-y-full cursor-pointer ${attivo ? 'z-10' : ''}`}
      style={{ left: `${punto.x}%`, top: `${punto.y}%` }}
    >
      <Icona className={`${attivo ? 'w-8 h-8' : 'w-5 h-5'} ${colore} fill-white drop-shadow`} />
      {attivo && (
        <span className="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-xs text-white">{nome}</span>
      )}
    </div>
  );
}

// Piantina con i pin: un clic sull'immagine posiziona la voce selezionata
export default function PiantinaMappa({ url, pin, partenza, prodotti, selezionato, onPosiziona, onSeleziona }) {
  const clic = (e) => {
    if (!selezionato) return;
    const r = e.currentTarget.getBoundingClientRect();
    onPosiziona({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return (
    <div className={`relative select-none overflow-hidden rounded-lg border border-slate-200 ${selezionato ? 'cursor-crosshair' : ''}`} onClick={clic}>
      <img src={url} alt="Piantina del locale" className="block w-full" draggable={false} />
      {partenza && (
        <Segno punto={partenza} nome="Punto di partenza" partenza attivo={selezionato === PARTENZA} onClick={() => onSeleziona(PARTENZA)} />
      )}
      {prodotti.filter((p) => pin[p.item_id]).map((p) => (
        <Segno key={p.item_id} punto={pin[p.item_id]} nome={p.item_nome} attivo={selezionato === p.item_id} onClick={() => onSeleziona(p.item_id)} />
      ))}
    </div>
  );
}