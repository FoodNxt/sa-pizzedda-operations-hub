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
    
    // Mappa allergeni con icone e colori
    const allergeniInfo = {
      'Glutine': { icon: '●', color: brandRed },
      'Crostacei': { icon: '●', color: brandRed },
      'Uova': { icon: '●', color: brandRed },
      'Pesce': { icon: '●', color: brandRed },
      'Arachidi': { icon: '●', color: brandRed },
      'Soia': { icon: '●', color: brandRed },
      'Latte': { icon: '●', color: brandRed },
      'Frutta a guscio': { icon: '●', color: brandRed },
      'Sedano': { icon: '●', color: brandRed },
      'Senape': { icon: '●', color: brandRed },
      'Semi di sesamo': { icon: '●', color: brandRed },
      'Anidride solforosa': { icon: '●', color: brandRed },
      'Lupini': { icon: '●', color: brandRed },
      'Molluschi': { icon: '●', color: brandRed }
    };

    // Header con design accattivante
    doc.setFillColor(...brandRed);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('ALLERGENI', 105, 20, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text('Informazioni sugli allergeni presenti nei nostri prodotti', 105, 28, { align: 'center' });
    
    doc.setFontSize(8);
    doc.text(`Aggiornato: ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}`, 105, 35, { align: 'center' });

    // Info normativa
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('Regolamento UE 1169/2011', 105, 38, { align: 'center' });

    // Ordina ricette alfabeticamente
    const ricetteOrdinate = ricette
      .filter(r => r.attivo !== false)
      .sort((a, b) => (a.nome_prodotto || '').localeCompare(b.nome_prodotto || '', 'it'));

    const rowHeight = 12;
    let currentY = 50;
    const margin = 15;
    const tableWidth = 180;

    ricetteOrdinate.forEach((ricetta, idx) => {
      // Controlla se serve nuova pagina
      const allergeniCount = ricetta.allergeni?.length || 0;
      const allergeniLines = Math.ceil(allergeniCount / 2);
      const estimatedHeight = 16 + (allergeniLines > 1 ? (allergeniLines - 1) * 6 : 0);
      
      if (currentY + estimatedHeight > 270) {
        doc.addPage();
        currentY = 20;
      }
      
      // Box prodotto con sfondo beige
      doc.setFillColor(...brandBeige);
      doc.roundedRect(margin, currentY, tableWidth, estimatedHeight, 4, 4, 'F');
      
      // Bordo rosso spesso a sinistra
      doc.setFillColor(...brandRed);
      doc.roundedRect(margin, currentY, 5, estimatedHeight, 2, 2, 'F');

      // Nome prodotto - più grande e bold
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...brandRed);
      doc.text(ricetta.nome_prodotto, margin + 10, currentY + 10);

      // Allergeni in box stondati
      if (ricetta.allergeni && ricetta.allergeni.length > 0) {
        let allergeniY = currentY + 10;
        let allergeniX = margin + 95;
        let itemsInRow = 0;
        
        ricetta.allergeni.forEach((allergene, aIdx) => {
          // Misura il testo
          doc.setFontSize(9);
          doc.setFont(undefined, 'normal');
          const textWidth = doc.getTextWidth(allergene);
          const boxWidth = textWidth + 8;
          const boxHeight = 6;
          
          // Box stondato rosa chiaro
          doc.setFillColor(252, 235, 235);
          doc.roundedRect(allergeniX, allergeniY - 4.5, boxWidth, boxHeight, 3, 3, 'F');
          
          // Testo centrato nel box - rosso scuro
          doc.setTextColor(185, 28, 28);
          doc.text(allergene, allergeniX + 4, allergeniY);
          
          allergeniX += boxWidth + 4;
          itemsInRow++;
          
          // Vai a capo se necessario
          if (itemsInRow >= 2 || allergeniX + boxWidth > margin + tableWidth) {
            allergeniY += 8;
            allergeniX = margin + 95;
            itemsInRow = 0;
          }
        });
      } else {
        doc.setFontSize(9);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text('Nessun allergene', margin + 95, currentY + 10);
      }

      currentY += estimatedHeight + 4;
    });

    // Footer
    doc.setFillColor(...brandBeige);
    doc.rect(0, 282, 210, 15, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...brandRed);
    doc.setFont(undefined, 'bold');
    doc.text('SA PIZZEDDA', 105, 290, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7);
    doc.text('Per maggiori informazioni sugli allergeni, contatta il personale', 105, 294, { align: 'center' });

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