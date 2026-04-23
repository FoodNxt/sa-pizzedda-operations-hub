/**
 * Check if a form was actually submitted for a given store + date
 * by checking allFormData (actual database records).
 * 
 * For forms that can be submitted multiple times per day by different employees
 * (like ConteggioCassa), we also check created_by to avoid false positives
 * where another employee's submission marks the form as completed for everyone.
 */
export function isFormSubmittedForTurno(formPage, storeId, turnoDate, allFormData, userEmail) {
  const checkRecords = (records, dateField) =>
    (records || []).some(r => r.store_id === storeId && r[dateField]?.startsWith(turnoDate));

  // For per-employee forms, ALWAYS match on created_by.
  // If userEmail is not available, return false (not completed) to prevent false positives
  // where another employee's submission marks the form as completed.
  const checkRecordsPerEmployee = (records, dateField) => {
    if (!userEmail) return false;
    return (records || []).some(r => 
      r.store_id === storeId && 
      r[dateField]?.startsWith(turnoDate) &&
      r.created_by === userEmail
    );
  };

  switch (formPage) {
    case 'FormInventario': return checkRecords(allFormData.FormInventario, 'data_rilevazione');
    case 'FormTeglieButtate': return checkRecords(allFormData.FormTeglieButtate, 'data_rilevazione');
    case 'FormCantina': return checkRecords(allFormData.FormCantina, 'data_rilevazione');
    case 'ConteggioCassa': return checkRecordsPerEmployee(allFormData.ConteggioCassa, 'data_conteggio');
    case 'FormPreparazioni': return checkRecords(allFormData.FormPreparazioni, 'data_rilevazione');
    case 'Impasto': return checkRecords(allFormData.Impasto, 'data_calcolo');
    case 'ControlloPuliziaCassiere': return checkRecordsPerEmployee(allFormData.ControlloPuliziaCassiere, 'inspection_date');
    case 'ControlloPuliziaPizzaiolo': return checkRecordsPerEmployee(allFormData.ControlloPuliziaPizzaiolo, 'inspection_date');
    case 'ControlloPuliziaStoreManager': return checkRecordsPerEmployee(allFormData.ControlloPuliziaStoreManager, 'inspection_date');
    default: return false;
  }
}