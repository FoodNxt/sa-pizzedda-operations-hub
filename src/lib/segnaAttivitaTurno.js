import { base44 } from '@/api/base44Client';

// Segna completata l'attività del turno indicata nei parametri URL (turno_id, attivita, ora_attivita),
// come fa FormInventario. Restituisce true se i parametri c'erano.
export async function segnaAttivitaTurno({ user, storeId, formPage }) {
  const urlParams = new URLSearchParams(window.location.search);
  const turnoId = urlParams.get('turno_id');
  const attivitaNome = urlParams.get('attivita');
  if (!turnoId || !attivitaNome) return false;

  const oraAttivita = urlParams.get('ora_attivita');
  const filtro = { turno_id: turnoId, attivita_nome: decodeURIComponent(attivitaNome) };
  if (oraAttivita) filtro.ora_attivita = oraAttivita;
  const esistente = await base44.entities.AttivitaCompletata.filter(filtro);
  if (esistente.length) return true;

  await base44.entities.AttivitaCompletata.create({
    ...filtro,
    dipendente_id: user.id,
    dipendente_nome: user.nome_cognome || user.full_name || 'Dipendente',
    turno_data: new Date().toISOString().split('T')[0],
    store_id: storeId,
    form_page: formPage,
    completato_at: new Date().toISOString()
  });
  return true;
}