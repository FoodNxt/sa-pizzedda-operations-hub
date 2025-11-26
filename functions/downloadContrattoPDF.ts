import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contrattoId } = await req.json();

    if (!contrattoId) {
      return Response.json({ error: 'contrattoId is required' }, { status: 400 });
    }

    // Get the contract
    const contratti = await base44.entities.Contratto.filter({ id: contrattoId });
    if (!contratti || contratti.length === 0) {
      return Response.json({ error: 'Contratto non trovato' }, { status: 404 });
    }

    const contratto = contratti[0];

    if (contratto.status !== 'firmato') {
      return Response.json({ error: 'Il contratto non è ancora stato firmato' }, { status: 400 });
    }

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('SA PIZZEDDA', margin, 22);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('CONTRATTO DI LAVORO', pageWidth - margin, 22, { align: 'right' });

    yPos = 50;

    // Contract info box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, yPos, contentWidth, 30, 3, 3, 'FD');

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.text('Dipendente:', margin + 5, yPos + 10);
    doc.text('Data Contratto:', margin + 5, yPos + 20);
    doc.text('Ruolo:', pageWidth / 2, yPos + 10);
    doc.text('Locale:', pageWidth / 2, yPos + 20);

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(contratto.nome_cognome || 'N/A', margin + 35, yPos + 10);
    doc.text(contratto.data_inizio ? new Date(contratto.data_inizio).toLocaleDateString('it-IT') : 'N/A', margin + 45, yPos + 20);
    doc.text(contratto.ruolo || 'N/A', pageWidth / 2 + 20, yPos + 10);
    doc.text(contratto.store_name || 'N/A', pageWidth / 2 + 20, yPos + 20);

    yPos += 40;

    // Contract content
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(10);

    const content = contratto.contenuto_contratto || 'Contenuto del contratto non disponibile';
    const lines = doc.splitTextToSize(content, contentWidth);

    for (let i = 0; i < lines.length; i++) {
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(lines[i], margin, yPos);
      yPos += 5;
    }

    // Ensure signature is on the last page with enough space
    if (yPos > pageHeight - 70) {
      doc.addPage();
      yPos = margin;
    }

    yPos = Math.max(yPos + 15, pageHeight - 65);

    // Signature section - DocuSign style
    const signatureBoxWidth = 75;
    const signatureBoxHeight = 35;
    const signatureX = margin;
    const initialsX = margin + signatureBoxWidth + 15;

    // Main signature box
    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.5);
    doc.rect(signatureX, yPos, signatureBoxWidth, signatureBoxHeight);

    // DocuSigned by label
    doc.setFillColor(255, 255, 255);
    doc.rect(signatureX + 3, yPos - 3, 28, 6, 'F');
    doc.setFontSize(6);
    doc.setTextColor(30, 64, 175);
    doc.text('DocuSigned by:', signatureX + 5, yPos + 1);

    // Signature name (handwriting style - simulated with italic)
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    const firmaNome = contratto.firma_dipendente || contratto.nome_cognome;
    doc.text(firmaNome, signatureX + 5, yPos + 18);

    // Signature ID
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    const signatureId = generateSignatureId(contratto);
    doc.text(signatureId, signatureX + 5, yPos + signatureBoxHeight - 3);

    // Initials box
    doc.setDrawColor(30, 64, 175);
    doc.rect(initialsX, yPos, 25, signatureBoxHeight);

    // DS label
    doc.setFillColor(255, 255, 255);
    doc.rect(initialsX + 3, yPos - 3, 8, 6, 'F');
    doc.setFontSize(6);
    doc.setTextColor(30, 64, 175);
    doc.text('DS', initialsX + 4, yPos + 1);

    // Initials
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    const initials = getInitials(firmaNome);
    doc.text(initials, initialsX + 5, yPos + 20);

    // Signature date and info
    yPos += signatureBoxHeight + 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Data Firma: ${contratto.data_firma ? new Date(contratto.data_firma).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}`, margin, yPos);

    // Footer
    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Documento firmato digitalmente - Sa Pizzedda HR System', pageWidth / 2, pageHeight - 6, { align: 'center' });

    // Output PDF as base64
    const pdfOutput = doc.output('arraybuffer');
    const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfOutput)));

    return Response.json({ 
      success: true, 
      pdf: base64,
      filename: `Contratto_${contratto.nome_cognome.replace(/\s+/g, '_')}_${new Date(contratto.data_firma).toISOString().split('T')[0]}.pdf`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateSignatureId(contratto) {
  // Generate a DocuSign-style ID based on contract data
  const hash = btoa(contratto.id + contratto.data_firma).substring(0, 16).toUpperCase();
  return hash.replace(/[^A-Z0-9]/g, '') + '...';
}

function getInitials(name) {
  if (!name) return 'XX';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}