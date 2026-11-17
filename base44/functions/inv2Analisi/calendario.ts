import { fetchAll, loadConfig } from '../../shared/inv2.ts';
import { addGiorni, giornoRoma, prossimaRicorrenza } from '../../shared/inv2Calcolo.ts';
import { limiteSera, listaSera } from '../../shared/inv2Lista.ts';

// Previsione delle liste delle prossime 14 sere. Chi resta fuori dal limite slitta alla sera dopo;
// i giorni fissi tornano alla ricorrenza successiva, gli altri dopo il conteggio escono dalla previsione.
export async function calendario(sr) {
  const E = sr.entities;
  const [{ config }, giacenze, impostazioni] = await Promise.all([
    loadConfig(sr),
    fetchAll(E.GiacenzaStimata),
    fetchAll(E.ImpostazioneInventario2, { incluso: true })
  ]);
  const fisso = Object.fromEntries(impostazioni.map((i) => [i.item_id, i]));
  const oggi = giornoRoma(new Date());
  const giorni = Array.from({ length: 14 }, (_, i) => addGiorni(oggi, i));
  const perUbicazione = {};
  giacenze.forEach((g) => (perUbicazione[g.ubicazione_key] ||= []).push(g));

  const ubicazioni = Object.entries(perUbicazione).map(([key, voci]) => {
    let coda = voci.filter((g) => g.prossimo_conteggio_data);
    const sere = giorni.map((giorno) => {
      const lista = listaSera(coda, limiteSera(config), giorno);
      const presi = new Set(lista.map((g) => g.item_id));
      coda = coda.flatMap((g) => {
        if (!presi.has(g.item_id)) return [g];
        const imp = fisso[g.item_id];
        const cf = imp?.conteggio_fisso_per_ubicazione?.[key] ?? imp?.conteggio_fisso;
        return g.priorita === 1 && cf?.attivo ? [{ ...g, prossimo_conteggio_data: prossimaRicorrenza(cf, addGiorni(giorno, 1)) }] : [];
      });
      return lista.map((g) => ({ item_id: g.item_id, nome: g.item_nome, motivo: g.prossimo_conteggio_motivo }));
    });
    return { ubicazione_key: key, sere };
  });
  return { giorni, ubicazioni };
}