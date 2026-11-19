import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import '@/components/inventario2/prodottiTable.css';
import SogliaRow from './SogliaRow';

const chiave = (r) => `${r.ubicazione_key}|${r.item_id}`;
const diversa = (r) => r.min_suggerito != null && (r.min !== r.min_suggerito || r.max !== r.max_suggerito);

// Scrive minimo e massimo suggeriti sulle impostazioni dei prodotti
async function applica(righe) {
  const impostazioni = await base44.entities.ImpostazioneInventario2.filter({ item_id: { $in: [...new Set(righe.map((r) => r.item_id))] } });
  await Promise.all(impostazioni.map((imp) => {
    const min = { ...(imp.min_per_ubicazione || {}) };
    const max = { ...(imp.max_per_ubicazione || {}) };
    righe.filter((r) => r.item_id === imp.item_id).forEach((r) => {
      min[r.ubicazione_key] = r.min_suggerito;
      max[r.ubicazione_key] = r.max_suggerito;
    });
    return base44.entities.ImpostazioneInventario2.update(imp.id, { min_per_ubicazione: min, max_per_ubicazione: max });
  }));
}

export default function SoglieTab({ ubicazioni }) {
  const [ubicazione, setUbicazione] = useState(ubicazioni[0].key);
  const [righe, setRighe] = useState(null);
  const [selezionate, setSelezionate] = useState(new Set());
  const [salvando, setSalvando] = useState(false);

  const carica = () => base44.functions.invoke('inv2Analisi', { azione: 'soglie' }).then((r) => setRighe(r.data.righe));
  useEffect(() => { carica(); }, []);

  const visibili = (righe || []).filter((r) => r.ubicazione_key === ubicazione);
  const scelte = visibili.filter((r) => selezionate.has(chiave(r)) && diversa(r));

  const salva = async (lista) => {
    setSalvando(true);
    await applica(lista);
    await carica();
    setSelezionate(new Set());
    setSalvando(false);
  };
  const seleziona = (r) => (si) => {
    const next = new Set(selezionate);
    if (si) next.add(chiave(r)); else next.delete(chiave(r));
    setSelezionate(next);
  };

  return (
    <section className="dt1-section">
      <div className="dt1-card">
        <div className="dt1-shell">
          <div className="dt1-head">
            <div className="dt1-titles">
              <h3 className="dt1-title">Minimo e massimo suggeriti</h3>
              <p className="dt1-meta">Materie prime: dal consumo al giorno, dai giorni di attesa medi più quelli di sicurezza e dai giorni tra due ordini del fornitore</p>
            </div>
            <div className="dt1-selects">
              <select className="dt1-select" value={ubicazione} onChange={(e) => { setUbicazione(e.target.value); setSelezionate(new Set()); }} aria-label="Ubicazione">
                {ubicazioni.map((u) => <option key={u.key} value={u.key}>{u.nome}</option>)}
              </select>
              <button type="button" className="dt1-btn dt1-btn--plain" disabled={!scelte.length || salvando} onClick={() => salva(scelte)}>
                Applica a tutti i selezionati ({scelte.length})
              </button>
            </div>
          </div>
          <div className="dt1-tablewrap">
            <div className="dt1-zone">
              {!righe ? (
                <div className="dt1-skel" aria-hidden="true">
                  {Array.from({ length: 6 }).map((_, i) => <div key={i} className="dt1-skel-row" />)}
                </div>
              ) : (
                <table className="dt1-table" style={{ minWidth: 1000 }}>
                  <thead>
                    <tr>
                      <th className="dt1-th" scope="col" />
                      <th className="dt1-th" scope="col">Prodotto</th>
                      <th className="dt1-th" scope="col">Fornitore</th>
                      <th className="dt1-th" scope="col" style={{ textAlign: 'right' }}>Consumo al giorno</th>
                      <th className="dt1-th" scope="col">Attesa e ordini</th>
                      <th className="dt1-th" scope="col" style={{ textAlign: 'right' }}>Minimo attuale → suggerito</th>
                      <th className="dt1-th" scope="col" style={{ textAlign: 'right' }}>Massimo attuale → suggerito</th>
                      <th className="dt1-th" scope="col" />
                    </tr>
                  </thead>
                  <tbody>
                    {visibili.map((r) => (
                      <SogliaRow
                        key={chiave(r)}
                        riga={r}
                        diversa={diversa(r)}
                        selezionata={selezionate.has(chiave(r))}
                        onSeleziona={seleziona(r)}
                        onApplica={() => salva([r])}
                        salvando={salvando}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          <div className="dt1-foot">
            <div className="dt1-range">{visibili.length} materie prime, valori nell'unità di conteggio</div>
          </div>
        </div>
      </div>
    </section>
  );
}