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
    
    // Colori brand Sa Pizzedda
    const brandRed = [227, 30, 36];
    const brandBeige = [244, 229, 201];

    // Header con sfondo beige
    doc.setFillColor(...brandBeige);
    doc.rect(0, 0, 210, 40, 'F');
    
    // Brand name come "logo" testuale
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...brandRed);
    doc.text('SA PIZZEDDA', 105, 15, { align: 'center' });
    
    // Titolo "Lista allergeni"
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...brandRed);
    doc.text('Lista Allergeni', 105, 27, { align: 'center' });
    
    // Sottotitolo
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Informazioni sugli allergeni presenti nei nostri prodotti', 105, 35, { align: 'center' });

    // Avviso importante
    doc.setFillColor(255, 250, 240);
    doc.roundedRect(15, 43, 180, 14, 2, 2, 'F');
    doc.setDrawColor(...brandRed);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, 43, 180, 14, 2, 2, 'S');
    
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...brandRed);
    doc.text('ATTENZIONE', 18, 48);
    
    doc.setFontSize(6.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    const avvisoTesto = 'Per allergici gravi o intolleranze non elencate, contattare il personale prima di ordinare. Reg. UE 1169/2011.';
    const avvisoLines = doc.splitTextToSize(avvisoTesto, 170);
    doc.text(avvisoLines, 18, 53);

    // Ordina ricette alfabeticamente
    const ricetteOrdinate = ricette
      .filter(r => r.attivo !== false)
      .sort((a, b) => (a.nome_prodotto || '').localeCompare(b.nome_prodotto || '', 'it'));

    let currentY = 61;
    const margin = 15;
    const tableWidth = 180;

    ricetteOrdinate.forEach((ricetta) => {
      const boxHeight = 12;
      doc.setFillColor(...brandBeige);
      doc.roundedRect(margin, currentY, tableWidth, boxHeight, 2, 2, 'F');
      
      // Bordo rosso a sinistra
      doc.setFillColor(...brandRed);
      doc.roundedRect(margin, currentY, 2, boxHeight, 1, 1, 'F');

      // Nome prodotto
      doc.setFontSize(15);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...brandRed);
      doc.text(ricetta.nome_prodotto, margin + 5, currentY + 8);

      // Allergeni
      if (ricetta.allergeni && ricetta.allergeni.length > 0) {
        let totalWidth = 0;
        const allergeniWidths = [];
        
        ricetta.allergeni.forEach((allergene) => {
          doc.setFontSize(10);
          doc.setFont(undefined, 'normal');
          const textWidth = doc.getTextWidth(allergene);
          const boxWidth = textWidth + 5;
          allergeniWidths.push(boxWidth);
          totalWidth += boxWidth + 2.5;
        });
        totalWidth -= 2.5;
        
        let allergeniX = margin + tableWidth - totalWidth - 2;
        const allergeniY = currentY + 7.5;
        
        ricetta.allergeni.forEach((allergene, idx) => {
          const boxWidth = allergeniWidths[idx];
          const boxHeight = 6;
          
          doc.setFillColor(219, 234, 254);
          doc.setDrawColor(147, 197, 253);
          doc.setLineWidth(0.4);
          doc.roundedRect(allergeniX, allergeniY - 4, boxWidth, boxHeight, 3, 3, 'FD');
          
          doc.setFontSize(10);
          doc.setTextColor(30, 64, 175);
          doc.text(allergene, allergeniX + 2.5, allergeniY);
          
          allergeniX += boxWidth + 2.5;
        });
      } else {
        doc.setFontSize(11);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(150, 150, 150);
        const nessunoWidth = doc.getTextWidth('Nessuno');
        doc.text('Nessuno', margin + tableWidth - nessunoWidth - 2, currentY + 7.5);
      }

      currentY += boxHeight + 1.5;
    });

    // Footer
    doc.setFillColor(...brandBeige);
    doc.rect(0, 275, 210, 22, 'F');
    
    doc.setFontSize(11);
    doc.setTextColor(...brandRed);
    doc.setFont(undefined, 'bold');
    doc.text('SA PIZZEDDA', 105, 282, { align: 'center' });
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text('Regolamento UE 1169/2011 - Versione digitale disponibile su richiesta', 105, 287, { align: 'center' });
    
    doc.setFontSize(7);
    const dataAggiornamento = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text('Aggiornato: ' + dataAggiornamento, 105, 292, { align: 'center' });

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