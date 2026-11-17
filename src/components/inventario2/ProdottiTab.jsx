import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import ProdottiTable from './ProdottiTable';
import ProdottoPanel from './ProdottoPanel';
import { DEFAULT_CONFIG, buildRows, defaultImpostazione, precompilaImpostazione } from './inv2Utils';

const keyOf = (i) => `${i.item_tipo}:${i.item_id}`;

export default function ProdottiTab() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [stores, setStores] = useState([]);
  const [labStoreId, setLabStoreId] = useState(DEFAULT_CONFIG.lab_store_id);
  const [imp, setImp] = useState({});
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState('');
  const [precompilando, setPrecompilando] = useState(false);
  const impRef = useRef({});
  const idsRef = useRef({});
  const toastTimer = useRef(null);

  const indexImpostazioni = (list) => {
    const map = {};
    idsRef.current = {};
    list.forEach((i) => { map[keyOf(i)] = i; idsRef.current[keyOf(i)] = i.id; });
    impRef.current = map;
    setImp(map);
  };

  useEffect(() => {
    (async () => {
      const [s, materie, ricette, impostazioni, configs] = await Promise.all([
        base44.entities.Store.list(),
        base44.entities.MateriePrime.list(),
        base44.entities.Ricetta.filter({ is_semilavorato: true }),
        base44.entities.ImpostazioneInventario2.list(),
        base44.entities.ConfigInventario2.list()
      ]);
      setStores(s);
      setRows(buildRows(materie, ricette));
      indexImpostazioni(impostazioni);
      if (configs[0]?.lab_store_id) setLabStoreId(configs[0].lab_store_id);
      setLoading(false);
    })();
  }, []);

  const ubicazioni = useMemo(() => {
    const negozi = ['Lanino', 'Palazzi']
      .map((nome) => stores.find((s) => s.name === nome))
      .filter(Boolean)
      .map((s) => ({ key: s.id, label: s.name }));
    return [...negozi, { key: `lab:${labStoreId}`, label: 'Laboratorio' }];
  }, [stores, labStoreId]);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  };

  // Crea l'impostazione alla prima modifica, poi la aggiorna
  const salva = async (row, patchOrFn) => {
    const k = row.key;
    const current = impRef.current[k] || defaultImpostazione(row);
    const patch = typeof patchOrFn === 'function' ? patchOrFn(current) : patchOrFn;
    impRef.current = { ...impRef.current, [k]: { ...current, ...patch } };
    setImp(impRef.current);
    if (!idsRef.current[k]) {
      idsRef.current[k] = base44.entities.ImpostazioneInventario2.create({ ...current, ...patch }).then((r) => r.id);
      await idsRef.current[k];
    } else {
      const id = await idsRef.current[k];
      await base44.entities.ImpostazioneInventario2.update(id, patch);
    }
  };

  const precompila = async () => {
    setPrecompilando(true);
    const esistenti = await base44.entities.ImpostazioneInventario2.list();
    const presenti = new Set(esistenti.map(keyOf));
    const nuove = rows.filter((r) => !presenti.has(r.key) && !idsRef.current[r.key]).map(precompilaImpostazione);
    if (nuove.length) await base44.entities.ImpostazioneInventario2.bulkCreate(nuove);
    indexImpostazioni(await base44.entities.ImpostazioneInventario2.list());
    setPrecompilando(false);
    showToast(nuove.length ? `${nuove.length} prodotti precompilati` : 'Tutti i prodotti hanno già le impostazioni');
  };

  return (
    <>
      <ProdottiTable
        rows={rows}
        imp={imp}
        ubicazioni={ubicazioni}
        loading={loading}
        onSave={salva}
        onEdit={setEditing}
        onPrecompila={precompila}
        precompilando={precompilando}
        toast={toast}
        onToast={showToast}
      />
      <ProdottoPanel
        row={editing}
        imp={editing ? (imp[editing.key] || defaultImpostazione(editing)) : {}}
        onClose={() => setEditing(null)}
        onSave={salva}
      />
    </>
  );
}