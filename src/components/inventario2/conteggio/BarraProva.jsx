import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { addDays, format } from 'date-fns';
import { FlaskConical } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { oggiLocale } from '@/components/laboratorio/labUtils';

const campo = 'h-9 rounded-md border border-purple-300 bg-white px-2 text-sm text-slate-900';

// Barra fissa in alto: la copia invisibile tiene il posto nella pagina, quella visibile resta ferma
export default function BarraProva({ stores, ubicazione, onUbicazione, giorno, onGiorno, dettagli, onDettagli }) {
  const posto = useRef(null);
  const [box, setBox] = useState(null);
  const oggi = oggiLocale();
  const fino = format(addDays(new Date(), 14), 'yyyy-MM-dd');

  useEffect(() => {
    const aggiorna = () => {
      const r = posto.current.getBoundingClientRect();
      setBox({ left: r.left, width: r.width });
    };
    const osservatore = new ResizeObserver(aggiorna);
    osservatore.observe(posto.current);
    window.addEventListener('resize', aggiorna);
    const dopoAnimazione = setTimeout(aggiorna, 400);
    return () => {
      osservatore.disconnect();
      window.removeEventListener('resize', aggiorna);
      clearTimeout(dopoAnimazione);
    };
  }, []);

  const contenuto = (
    <div className="rounded-xl bg-purple-600 text-white shadow-lg px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-2 font-bold text-sm mr-auto">
        <FlaskConical className="w-5 h-5 flex-shrink-0" />
        MODALITÀ PROVA – nessun dato viene salvato
      </div>
      <select aria-label="Ubicazione" className={campo} value={ubicazione} onChange={(e) => onUbicazione(e.target.value)}>
        {!ubicazione && <option value="">Scegli ubicazione</option>}
        {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        <option value="laboratorio">Laboratorio</option>
      </select>
      <input
        type="date"
        aria-label="Data della lista"
        className={campo}
        min={oggi}
        max={fino}
        value={giorno}
        onChange={(e) => e.target.value >= oggi && e.target.value <= fino && onGiorno(e.target.value)}
      />
      <label className="flex items-center gap-2 text-sm font-medium">
        <Switch checked={dettagli} onCheckedChange={onDettagli} />
        Mostra dettagli admin
      </label>
    </div>
  );

  return (
    <>
      <div ref={posto} className="invisible" aria-hidden="true">{contenuto}</div>
      {box && createPortal(<div className="fixed top-24 lg:top-2 z-20" style={box}>{contenuto}</div>, document.body)}
    </>
  );
}