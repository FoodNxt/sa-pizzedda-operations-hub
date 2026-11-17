import { createClientFromRequest } from 'npm:@base44/sdk@0.8.62';
import { fetchAll, loadConfig, ubicazioneDaKey } from '../../shared/inv2.ts';
import { giornoRoma } from '../../shared/inv2Calcolo.ts';
import { ricalcola } from '../../shared/inv2Ricalcolo.ts';
import { convertiCarico, espandiIngredienti, inBase } from './conversioni.ts';

const r6 = (n) => Math.round(n * 1e6) / 1e6;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const sr = base44.asServiceRole;
    const E = sr.entities;

    const body = await req.json().catch(() => ({}));
    const quantita = Number(body.quantita);
    const oggi = giornoRoma(new Date());
    const data = body.data_produzione || oggi;
    if (!body.item_id || !(quantita > 0)) return Response.json({ error: 'Servono item_id e una quantità maggiore di zero' }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || data > oggi) return Response.json({ error: 'Data di produzione non valida' }, { status: 400 });

    const [{ config, labStoreId }, ricette, impostazioni] = await Promise.all([
      loadConfig(sr),
      fetchAll(E.Ricetta, { is_semilavorato: true }),
      fetchAll(E.ImpostazioneInventario2)
    ]);
    const ricetta = ricette.find((r) => r.id === body.item_id);
    if (!ricetta) return Response.json({ error: 'Semilavorato non trovato' }, { status: 404 });
    const impById = Object.fromEntries(impostazioni.map((i) => [i.item_id, i]));
    const isBasi = ricetta.id === config.basi_ricetta_id;
    if (!isBasi && !impById[ricetta.id]?.producibile_lab) {
      return Response.json({ error: 'Questo semilavorato non è producibile in laboratorio' }, { status: 403 });
    }

    const unita = body.unita || ricetta.unita_misura_prodotta || 'grammi';

    // Ingredienti da scaricare (nessuno se la ricetta non ha distinta)
    let scarichi = [];
    if ((ricetta.ingredienti || []).length) {
      const materie = await fetchAll(E.MateriePrime);
      const fattore = inBase(quantita, unita) / inBase(ricetta.quantita_prodotta || 1, ricetta.unita_misura_prodotta);
      scarichi = Object.values(espandiIngredienti(ricetta.ingredienti, fattore, ricette, materie))
        .filter((v) => v.id && v.quantita > 0)
        .map((v) => ({
          item_id: v.id,
          item_nome: v.nome,
          quantita: r6(v.quantita),
          unita: v.unita_misura,
          ubicazione_key: impById[v.id]?.laboratorio ? `lab:${labStoreId}` : labStoreId
        }));
    }

    const operatoreNome = user.nome_cognome || user.full_name;
    const produzione = await E.ProduzioneLab.create({
      data_produzione: data,
      item_id: ricetta.id,
      item_nome: ricetta.nome_prodotto,
      is_basi: isBasi,
      quantita,
      unita,
      operatore_email: user.email,
      operatore_nome: operatoreNome,
      ubicazione_destinazione_key: labStoreId,
      scarichi,
      annullata: false,
      note: body.note || ''
    });

    const comune = {
      data_movimento: data === oggi ? new Date().toISOString() : `${data}T12:00:00.000Z`,
      utente_email: user.email,
      utente_nome: operatoreNome,
      fonte: 'produzione_lab',
      riferimento_id: produzione.id
    };
    const carico = convertiCarico(quantita, unita, impById[ricetta.id]);
    const movimenti = [
      {
        ...ubicazioneDaKey(labStoreId),
        item_tipo: 'semilavorato',
        item_id: ricetta.id,
        item_nome: ricetta.nome_prodotto,
        tipo: 'produzione_carico',
        quantita: r6(carico.quantita),
        unita: carico.unita,
        ...comune
      },
      ...scarichi.map((s) => ({
        ...ubicazioneDaKey(s.ubicazione_key),
        item_tipo: 'materia_prima',
        item_id: s.item_id,
        item_nome: s.item_nome,
        tipo: 'produzione_scarico',
        quantita: s.quantita,
        unita: s.unita,
        ...comune
      }))
    ];
    try {
      await E.MovimentoMagazzino.bulkCreate(movimenti);
    } catch (e) {
      await E.ProduzioneLab.delete(produzione.id);
      throw e;
    }

    // La produzione è già salvata: se il ricalcolo fallisce ci pensa quello notturno
    let ricalcolato = true;
    try {
      await ricalcola(sr, [...new Set(movimenti.map((m) => m.ubicazione_key))]);
    } catch (e) {
      ricalcolato = false;
      console.error('Ricalcolo non riuscito dopo la produzione', e.message);
    }
    return Response.json({ produzione, movimenti: movimenti.length, ricalcolato });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}