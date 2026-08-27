const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

const fmt = (value?: string | null) => value ? new Date(value).toLocaleDateString('it-IT') : '';

// Costruisce il contenuto della chiusura procedura sostituendo TUTTE le variabili del template.
export function buildChiusuraContenuto(template: string, letteraRichiamo: any, dipendente: any): string {
  const dataFirma = letteraRichiamo.data_firma ? new Date(letteraRichiamo.data_firma) : null;

  const values: Record<string, string> = {
    nome_dipendente: dipendente.nome_cognome || dipendente.full_name || dipendente.email || '',
    data_oggi: new Date().toLocaleDateString('it-IT'),
    data_invio_richiamo: fmt(letteraRichiamo.data_invio),
    data_visualizzazione_richiamo: fmt(letteraRichiamo.data_visualizzazione || letteraRichiamo.data_firma),
    data_firma_richiamo: fmt(letteraRichiamo.data_firma),
    mese_firma_richiamo: dataFirma ? `${MESI[dataFirma.getMonth()]} ${dataFirma.getFullYear()}` : '',
    testo_lettera_richiamo: letteraRichiamo.contenuto_lettera || '',
    tipo_provvedimento: letteraRichiamo.tipo_provvedimento || '',
    motivo: letteraRichiamo.motivo || ''
  };

  let contenuto = template;
  for (const [key, value] of Object.entries(values)) {
    contenuto = contenuto.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value);
  }

  // Nessuna variabile residua non sostituita
  contenuto = contenuto.replace(/{{\s*[\w.]+\s*}}/g, '');

  return contenuto;
}