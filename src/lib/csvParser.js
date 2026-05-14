/**
 * Split CSV text into lines, correctly handling newlines inside quoted fields.
 */
export function splitCsvLines(text) {
  const lines = [];
  let currentLine = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
    }
    if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      if (currentLine.trim()) lines.push(currentLine);
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) lines.push(currentLine);
  return lines;
}

/**
 * Parse a single CSV line into an array of values, handling quoted fields.
 */
export function parseCsvLine(line) {
  const values = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentValue += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  values.push(currentValue.trim());
  return values;
}

/**
 * Parse a numeric value from various formats (EU/US).
 */
/**
 * Parse Deliveroo date format "2 Aug 2025 at 19:55"
 */
export function parseDeliverooDate(dateString) {
  try {
    const parts = dateString.split(' at ');
    if (parts.length === 2) {
      const dateComponents = parts[0].split(' ');
      const months = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };
      const monthNum = months[dateComponents[1]];
      if (!monthNum) return null;
      const iso = `${dateComponents[2]}-${monthNum}-${dateComponents[0].padStart(2,'0')}T${parts[1]}:00`;
      const d = new Date(iso);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch { return null; }
}

export function parseNumericValue(value) {
  if (!value || value.trim() === '') return 0;

  let cleaned = value.replace(/[€$£\s]/g, '');

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    const commaPos = cleaned.indexOf(',');
    const afterComma = cleaned.substring(commaPos + 1);
    if (afterComma.length === 2) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(',', '');
    }
  }

  cleaned = cleaned.replace(/[^0-9.-]/g, '');

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}