import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contenuto, nome_cognome, status, firma_dipendente, data_firma, contratto_id } = await req.json();

    if (!contenuto) {
      return Response.json({ error: 'Contenuto contratto mancante' }, { status: 400 });
    }

    const doc = new jsPDF();

    // Title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('CONTRATTO DI LAVORO', 105, 20, { align: 'center' });

    // Contract content
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    const lines = contenuto.split('\n');
    let y = 35;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 6;

    lines.forEach((line) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      // Handle long lines by splitting them
      const splitLines = doc.splitTextToSize(line || ' ', 170);
      splitLines.forEach((splitLine) => {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(splitLine, margin, y);
        y += lineHeight;
      });
    });

    // Add signature section if contract is signed
    if (status === 'firmato' && firma_dipendente) {
      // Ensure there's space, otherwise add new page
      if (y > pageHeight - 80) {
        doc.addPage();
        y = margin;
      } else {
        y += 20;
      }

      // DocuSign-style signature box
      doc.setFillColor(250, 250, 250);
      doc.rect(15, y, 180, 65, 'F');
      doc.setDrawColor(70, 130, 180);
      doc.setLineWidth(0.5);
      doc.rect(15, y, 180, 65, 'S');

      y += 10;

      // Header
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(70, 130, 180);
      doc.text('✓ Firmato Digitalmente', margin + 5, y);
      
      y += 10;

      // Signature line
      doc.setFontSize(14);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(firma_dipendente, margin + 5, y);
      
      y += 8;

      // Timestamp
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 100, 100);
      const dataFirmaObj = new Date(data_firma);
      const dataFirmaFormatted = dataFirmaObj.toLocaleDateString('it-IT', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      }) + ' alle ' + dataFirmaObj.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
      doc.text(`Firmato il: ${dataFirmaFormatted}`, margin + 5, y);
      
      y += 6;

      // IP and Document ID
      doc.text(`ID Documento: ${contratto_id}`, margin + 5, y);
      
      y += 10;

      // Footer line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(margin + 5, y, 190, y);
      
      y += 5;

      // Certification text
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text('Questo documento è stato firmato elettronicamente tramite la piattaforma Sa Pizzedda.', margin + 5, y);
      y += 4;
      doc.text('La firma digitale è legalmente vincolante e verificabile.', margin + 5, y);
    }

    // Get PDF as base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];

    return Response.json({ 
      success: true,
      pdf_base64: pdfBase64
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});