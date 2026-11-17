import React from 'react';

export const PILLS = [
  { key: 'all', label: 'Tutti', test: () => true, style: { '--dt1-fc-cap': '#2563eb', '--dt1-fc-cap-ink': '#ffffff' } },
  { key: 'inclusi', label: 'Inclusi', test: (i) => !!i.incluso, style: { '--dt1-fc': '#22c55e', '--dt1-fc-fill': 'linear-gradient(180deg, #48E781 0%, #96F1B7 100%)' } },
  { key: 'non_inclusi', label: 'Non inclusi', test: (i) => !i.incluso, style: { '--dt1-fc': '#94a3b8', '--dt1-fc-fill': 'linear-gradient(180deg, #cbd5e1 0%, #e2e8f0 100%)' } },
  { key: 'laboratorio', label: 'Laboratorio', test: (i) => !!i.laboratorio, style: { '--dt1-fc': '#636FE5', '--dt1-fc-fill': 'linear-gradient(180deg, #818CFA 0%, #a5b4fc 100%)' } },
  { key: 'consumabili', label: 'Consumabili', test: (i) => !!i.consumabile, style: { '--dt1-fc': '#eab308', '--dt1-fc-fill': 'linear-gradient(180deg, #F7CC32 0%, #FFE588 100%)' } }
];

export default function ProdottiPills({ value, counts, onChange }) {
  return (
    <div className="dt1-chips" role="group" aria-label="Filtra per stato">
      {PILLS.map((p, i) => (
        <button
          key={p.key}
          type="button"
          className="dt1-fcard"
          data-dt1-filter={p.key}
          aria-pressed={value === p.key}
          style={{ '--dt1-i': i, ...p.style }}
          onClick={() => onChange(p.key)}
        >
          <span className="dt1-fcard-dot" aria-hidden="true" />
          <span className="dt1-fcard-name">{p.label}</span>
          <span className="dt1-fcard-n">{counts[p.key] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}