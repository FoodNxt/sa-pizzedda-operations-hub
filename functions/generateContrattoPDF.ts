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
      // Add new page for signature
      doc.addPage();
      y = 30;

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('FIRMA DIGITALE', 105, y, { align: 'center' });
      
      y += 15;
      doc.setDrawColor(100, 100, 100);
      doc.line(20, y, 190, y);
      y += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Firmato da: ${firma_dipendente}`, margin, y);
      y += 8;
      
      const dataFirmaFormatted = new Date(data_firma).toLocaleDateString('it-IT') + 
                                  ' alle ' + 
                                  new Date(data_firma).toLocaleTimeString('it-IT');
      doc.text(`Data firma: ${dataFirmaFormatted}`, margin, y);
      y += 8;

      doc.text(`Questo documento è stato firmato digitalmente sulla piattaforma Sa Pizzedda Workspace.`, margin, y);
      y += 6;
      doc.text(`ID Contratto: ${contratto_id}`, margin, y);
      
      y += 10;
      doc.line(20, y, 190, y);
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