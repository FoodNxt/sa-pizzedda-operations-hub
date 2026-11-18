import { norm } from '@/components/inventario2/vendite/posUtils';

// Nomi per una ricetta di prodotto finito: POS, storico e ricette esistenti, senza doppioni.
// I prodotti del POS senza ricetta vanno in cima
export function opzioniProdotto({ pos, storico, ricette }) {
  const voci = {};
  const aggiungi = (nome, fonte) => {
    if (!nome?.trim()) return;
    const voce = (voci[norm(nome)] ||= { nome: nome.trim(), fonti: [] });
    if (!voce.fonti.includes(fonte)) voce.fonti.push(fonte);
  };
  pos.forEach((n) => aggiungi(n, 'POS'));
  storico.forEach((n) => aggiungi(n, 'storico'));
  ricette.forEach((n) => aggiungi(n, 'ricetta esistente'));

  return Object.values(voci)
    .map((v) => {
      const senzaRicetta = v.fonti.includes('POS') && !v.fonti.includes('ricetta esistente');
      return { nome: v.nome, senzaRicetta, etichetta: `${v.nome} — ${v.fonti.join(', ')}${senzaRicetta ? ' · senza ricetta' : ''}` };
    })
    .sort((a, b) => b.senzaRicetta - a.senzaRicetta || a.nome.localeCompare(b.nome, 'it'));
}