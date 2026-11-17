import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProdottiPager({ page, pages, shown, total, onPage }) {
  return (
    <div className="dt1-foot">
      <div className="dt1-range">Mostrati {shown} di {total}</div>
      <div className="dt1-meter" aria-hidden="true">
        <span className="dt1-meter-fill" style={{ width: total ? `${(shown / total) * 100}%` : '0%' }} />
      </div>
      <div className="dt1-pager">
        <button type="button" className="dt1-page" aria-label="Pagina precedente" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft />
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" className="dt1-page" aria-current={n === page ? 'page' : undefined} onClick={() => onPage(n)}>
            {n}
          </button>
        ))}
        <button type="button" className="dt1-page" aria-label="Pagina successiva" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}