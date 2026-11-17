// Lista dei prodotti da contare in una sera (Inventario 2.0)
import { fetchAll, loadConfig } from './inv2.ts';
import { giornoRoma } from './inv2Calcolo.ts';

export const limiteSera = (config) => config.limite_voci_sera ?? 15;

// voci = giacenze di una sola ubicazione. I giorni fissi (priorità 1) entrano sempre, gli altri fino al limite.
export function listaSera(voci, limite, giorno) {
  const dovute = voci
    .filter((g) => g.prossimo_conteggio_data && g.prossimo_conteggio_data <= giorno)
    .sort((a, b) => (a.priorita ?? 9) - (b.priorita ?? 9) || (a.giorni_copertura ?? 1e9) - (b.giorni_copertura ?? 1e9));
  const fissi = dovute.filter((g) => g.priorita === 1);
  const altri = dovute.filter((g) => g.priorita !== 1);
  return [...fissi, ...altri.slice(0, Math.max(0, limite - fissi.length))];
}

// Salva la lista prevista per la sera di oggi, una sola volta per ubicazione (vale la prima della giornata)
export async function salvaListe(sr) {
  const E = sr.entities;
  const oggi = giornoRoma(new Date());
  const [{ config }, giacenze, esistenti] = await Promise.all([
    loadConfig(sr),
    fetchAll(E.GiacenzaStimata),
    E.ListaConteggioLog.filter({ data: oggi })
  ]);
  const giaSalvate = new Set(esistenti.map((l) => l.ubicazione_key));
  const perUbicazione = {};
  giacenze.forEach((g) => (perUbicazione[g.ubicazione_key] ||= []).push(g));
  const nuove = Object.entries(perUbicazione)
    .filter(([key]) => !giaSalvate.has(key))
    .map(([key, voci]) => {
      const lista = listaSera(voci, limiteSera(config), oggi);
      return { data: oggi, ubicazione_key: key, numero_voci: lista.length, item_ids: lista.map((g) => g.item_id) };
    });
  if (nuove.length) await E.ListaConteggioLog.bulkCreate(nuove);
  return nuove.length;
}