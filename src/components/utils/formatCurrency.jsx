/**
 * Formatta un numero come valuta con virgola per decimali e punto per migliaia
 * @param {number} value - Il valore da formattare
 * @param {number} decimals - Numero di decimali (default: 2)
 * @returns {string} - Valore formattato (es. "1.234,56")
 */
export function formatCurrency(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return '0,00';
  
  return value.toLocaleString('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Formatta un numero come valuta con simbolo euro
 * @param {number} value - Il valore da formattare
 * @param {number} decimals - Numero di decimali (default: 2)
 * @returns {string} - Valore formattato con € (es. "€1.234,56")
 */
export function formatEuro(value, decimals = 2) {
  return `€${formatCurrency(value, decimals)}`;
}