import { base44 } from "@/api/base44Client";

export async function downloadAltroDocumentoPDF(documentoId) {
  const response = await base44.functions.invoke('generateAltroDocumentoPDF', { documentoId });
  const { pdf, filename } = response.data;
  const byteChars = atob(pdf);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    bytes[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}