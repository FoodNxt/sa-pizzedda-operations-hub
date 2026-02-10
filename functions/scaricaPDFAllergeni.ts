import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ricette_ids } = await req.json();

    // Recupera le ricette selezionate
    const ricette = await base44.asServiceRole.entities.Ricetta.filter({
      id: { $in: ricette_ids }
    });

    const doc = new jsPDF();
    
    // Titolo
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('TABELLA ALLERGENI', 105, 15, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, 105, 22, { align: 'center' });

    // Preparazione dati
    const rowHeight = 8;
    const startY = 30;
    const colWidths = { prodotto: 60, allergeni: 130 };
    let currentY = startY;

    // Header tabella
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setFillColor(59, 130, 246);
    doc.rect(10, currentY, colWidths.prodotto + colWidths.allergeni, rowHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('PRODOTTO', 12, currentY + 5.5);
    doc.text('ALLERGENI', 72, currentY + 5.5);
    currentY += rowHeight;

    // Reset colore testo
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);

    // Ordina ricette alfabeticamente
    const ricetteOrdinate = ricette
      .filter(r => r.attivo !== false)
      .sort((a, b) => (a.nome_prodotto || '').localeCompare(b.nome_prodotto || '', 'it'));

    ricetteOrdinate.forEach((ricetta, idx) => {
      const isEven = idx % 2 === 0;
      
      // Background alternato
      if (isEven) {
        doc.setFillColor(248, 250, 252);
        doc.rect(10, currentY, colWidths.prodotto + colWidths.allergeni, rowHeight, 'F');
      }

      // Nome prodotto
      doc.setFont(undefined, 'bold');
      doc.text(ricetta.nome_prodotto, 12, currentY + 5.5);

      // Allergeni
      doc.setFont(undefined, 'normal');
      const allergeniText = ricetta.allergeni && ricetta.allergeni.length > 0 
        ? ricetta.allergeni.join(', ')
        : 'Nessuno';
      
      // Word wrap per allergeni
      const allergeniLines = doc.splitTextToSize(allergeniText, colWidths.allergeni - 4);
      doc.text(allergeniLines, 72, currentY + 5.5);

      currentY += rowHeight;

      // Nuova pagina se necessario
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }
    });

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Sa Pizzedda - Tabella Allergeni', 105, 290, { align: 'center' });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=allergeni.pdf'
      }
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});