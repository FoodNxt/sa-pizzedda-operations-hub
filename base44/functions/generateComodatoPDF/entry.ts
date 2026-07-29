import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { jsPDF } from 'npm:jspdf@4.0.0';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { comodatoId } = await req.json();
    if (!comodatoId) return Response.json({ error: 'Missing comodatoId' }, { status: 400 });

    const comodato = await base44.asServiceRole.entities.ComodatoDivisa.get(comodatoId);
    if (!comodato) return Response.json({ error: 'Comodato non trovato' }, { status: 404 });

    const isOwner = comodato.user_id === user.id || (comodato.user_email && comodato.user_email === user.email);
    const isAdminOrManager = user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'manager';
    if (!isOwner && !isAdminOrManager) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (comodato.status !== 'firmato') {
      return Response.json({ error: 'Il contratto non è ancora stato firmato' }, { status: 400 });
    }

    const sanitize = (t) => (t || '')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[^\x00-\xFF\u20AC\n]/g, '');

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = 210, pageH = 297, margin = 20;
    const maxW = pageW - margin * 2;
    let y = margin;

    // Contract content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(sanitize(comodato.contenuto_contratto), maxW);
    for (const line of lines) {
      if (y > pageH - margin) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 5;
    }

    // DocuSign-style signature block
    const blockH = 46;
    if (y + blockH + 8 > pageH - margin) { doc.addPage(); y = margin; }
    y += 6;

    const firmaName = sanitize(comodato.firma_dipendente || comodato.dipendente_nome);
    const ts = comodato.data_firma
      ? new Date(comodato.data_firma).toLocaleString('it-IT', {
          timeZone: 'Europe/Rome',
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        })
      : 'N/A';

    doc.setDrawColor(22, 122, 62);
    doc.setLineWidth(0.6);
    doc.roundedRect(margin, y, maxW, blockH, 2, 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(22, 122, 62);
    doc.text('FIRMATO ELETTRONICAMENTE', margin + 6, y + 8);

    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(20);
    doc.setTextColor(25, 45, 95);
    doc.text(firmaName, margin + 6, y + 21);

    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.3);
    doc.line(margin + 6, y + 24, margin + 100, y + 24);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Firmato da: ${firmaName}`, margin + 6, y + 31);
    doc.text(`Data e ora firma: ${ts} (ora italiana)`, margin + 6, y + 36);
    doc.text(`ID documento: ${comodato.id}`, margin + 6, y + 41);

    // Encode to base64
    const buf = new Uint8Array(doc.output('arraybuffer'));
    let binary = '';
    for (let i = 0; i < buf.length; i += 8192) {
      binary += String.fromCharCode(...buf.subarray(i, i + 8192));
    }
    const base64Pdf = btoa(binary);

    const safeName = (comodato.dipendente_nome || 'dipendente').replace(/[^a-zA-Z0-9]/g, '_');
    return Response.json({
      success: true,
      pdf: base64Pdf,
      filename: `comodato_divisa_${safeName}.pdf`
    });
  } catch (error) {
    console.error('Error generating comodato PDF:', error);
    return Response.json({ error: error.message || 'Errore generazione PDF' }, { status: 500 });
  }
}