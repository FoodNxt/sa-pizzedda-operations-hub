// Giorni di consegna dei fornitori
import { GIORNO, addGiorni } from './inv2Calcolo.ts';

const GIORNI = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'];

// Primo giorno di consegna utile dopo il tempo di consegna
export function prossimaConsegna(f, oggi) {
  let d = addGiorni(oggi, f.tempo_consegna_giorni || 0);
  const giorni = f.giorni_consegna || [];
  if (!giorni.length) return d;
  while (!giorni.includes(GIORNI[new Date(`${d}T00:00:00Z`).getUTCDay()])) d = addGiorni(d, 1);
  return d;
}

// Giorni da oggi alla prossima consegna possibile
export const giorniAllaConsegna = (f, oggi) => Math.round((Date.parse(prossimaConsegna(f, oggi)) - Date.parse(oggi)) / GIORNO);