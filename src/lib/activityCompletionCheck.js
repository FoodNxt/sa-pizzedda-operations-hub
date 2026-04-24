/**
 * Checks if a form-based slot activity is completed by matching AttivitaCompletata records.
 * Handles posizione_turno (inizio/fine) matching to avoid false positives.
 */
export function checkSlotFormDone(attivitaCompletate, turnoId, att) {
  return attivitaCompletate.some((ac) => {
    if (ac.turno_id !== turnoId) return false;
    if (ac.form_page !== att.form_page && ac.attivita_nome !== att.nome) return false;
    if (att.posizione_turno) {
      if (ac.posizione_turno) return ac.posizione_turno === att.posizione_turno;
      if (ac.ora_attivita && att.ora_inizio) return ac.ora_attivita === att.ora_inizio;
      return false;
    }
    if (att.ora_inizio && ac.ora_attivita) return ac.ora_attivita === att.ora_inizio;
    return true;
  });
}

/**
 * Checks if any activity (form, corso, or simple) is completed.
 */
export function isActivityCompleted(attivitaCompletate, turnoId, att, isSimpleCheckFn) {
  if (att.form_page || att.richiede_form) return checkSlotFormDone(attivitaCompletate, turnoId, att);
  if (att.corsi_ids?.length > 0) return true;
  return isSimpleCheckFn(turnoId, att.nome, att.ora_inizio);
}