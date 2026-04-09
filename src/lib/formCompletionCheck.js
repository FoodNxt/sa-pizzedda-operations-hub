/**
 * Check if a form was actually submitted for a given store + date
 * by checking allFormData (actual database records).
 */
export function isFormSubmittedForTurno(formPage, storeId, turnoDate, allFormData) {
  const checkRecords = (records, dateField) =>
    (records || []).some(r => r.store_id === storeId && r[dateField]?.startsWith(turnoDate));

  switch (formPage) {
    case 'FormInventario': return checkRecords(allFormData.FormInventario, 'data_rilevazione');
    case 'FormTeglieButtate': return checkRecords(allFormData.FormTeglieButtate, 'data_rilevazione');
    case 'FormCantina': return checkRecords(allFormData.FormCantina, 'data_rilevazione');
    case 'ConteggioCassa': return checkRecords(allFormData.ConteggioCassa, 'data_conteggio');
    case 'FormPreparazioni': return checkRecords(allFormData.FormPreparazioni, 'data_rilevazione');
    case 'Impasto': return checkRecords(allFormData.Impasto, 'data_calcolo');
    case 'ControlloPuliziaCassiere': return checkRecords(allFormData.ControlloPuliziaCassiere, 'inspection_date');
    case 'ControlloPuliziaPizzaiolo': return checkRecords(allFormData.ControlloPuliziaPizzaiolo, 'inspection_date');
    case 'ControlloPuliziaStoreManager': return checkRecords(allFormData.ControlloPuliziaStoreManager, 'inspection_date');
    default: return false;
  }
}