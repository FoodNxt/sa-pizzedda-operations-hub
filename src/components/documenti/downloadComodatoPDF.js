import { base44 } from '@/api/base44Client';

export async function downloadComodatoPDF(comodato) {
  const res = await base44.functions.invoke('generateComodatoPDF', { comodatoId: comodato.id });
  const { pdf, filename } = res.data;
  const bytes = Uint8Array.from(atob(pdf), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}