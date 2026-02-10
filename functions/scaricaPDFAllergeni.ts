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
    
    // Mappa codici allergeni con colori
    const allergeniCodes = {
      'Glutine': { code: 'GL', color: [255, 179, 71] },
      'Crostacei': { code: 'CR', color: [255, 107, 107] },
      'Uova': { code: 'UO', color: [255, 234, 167] },
      'Pesce': { code: 'PE', color: [84, 160, 255] },
      'Arachidi': { code: 'AR', color: [210, 145, 188] },
      'Soia': { code: 'SO', color: [162, 155, 254] },
      'Latte': { code: 'LA', color: [255, 255, 255] },
      'Frutta a guscio': { code: 'FG', color: [186, 139, 96] },
      'Sedano': { code: 'SE', color: [130, 204, 130] },
      'Senape': { code: 'SN', color: [255, 215, 64] },
      'Semi di sesamo': { code: 'SS', color: [245, 245, 220] },
      'Anidride solforosa': { code: 'AN', color: [200, 200, 200] },
      'Lupini': { code: 'LU', color: [255, 183, 77] },
      'Molluschi': { code: 'MO', color: [255, 138, 101] }
    };

    // Header con design accattivante
    doc.setFillColor(251, 191, 36); // amber-400
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
      const estimatedHeight = rowHeight + (allergeniCount > 4 ? Math.ceil(allergeniCount / 4) * 5 : 0);
      
      if (currentY + estimatedHeight > 270) {
        doc.addPage();
        currentY = 20;
      }

      const isEven = idx % 2 === 0;
      
      // Box prodotto con sfondo
      doc.setFillColor(isEven ? 249 : 255, isEven ? 250 : 255, isEven ? 251 : 255);
      doc.roundedRect(margin, currentY, tableWidth, estimatedHeight, 3, 3, 'F');
      
      // Bordo colorato a sinistra
      doc.setFillColor(251, 191, 36);
      doc.roundedRect(margin, currentY, 4, estimatedHeight, 2, 2, 'F');

      // Nome prodotto
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(ricetta.nome_prodotto, margin + 8, currentY + 7);

      // Allergeni
      if (ricetta.allergeni && ricetta.allergeni.length > 0) {
        let allergeniY = currentY + 7;
        let allergeniX = margin + 90;
        
        ricetta.allergeni.forEach((allergene, aIdx) => {
          const info = allergeniCodes[allergene] || { code: '??', color: [200, 200, 200] };
          
          // Box colorato per allergene
          doc.setFillColor(...info.color);
          doc.roundedRect(allergeniX, allergeniY - 4.5, 10, 6, 1.5, 1.5, 'F');
          
          // Bordo nero sottile
          doc.setDrawColor(50, 50, 50);
          doc.setLineWidth(0.3);
          doc.roundedRect(allergeniX, allergeniY - 4.5, 10, 6, 1.5, 1.5, 'S');
          
          // Codice allergene
          doc.setFontSize(7);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(30, 30, 30);
          doc.text(info.code, allergeniX + 5, allergeniY + 0.5, { align: 'center' });
          
          allergeniX += 11.5;
          
          // Vai a capo dopo 8 allergeni
          if ((aIdx + 1) % 8 === 0) {
            allergeniY += 7;
            allergeniX = margin + 90;
          }
        });
      } else {
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(148, 163, 184);
        doc.text('Nessun allergene', margin + 95, currentY + 7);
      }

      currentY += estimatedHeight + 3;
    });

    // Legenda allergeni in fondo
    if (currentY < 220) {
      currentY = Math.max(currentY + 5, 220);
      
      doc.setFillColor(251, 191, 36);
      doc.rect(margin, currentY, tableWidth, 4, 'F');
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('LEGENDA ALLERGENI', margin + 2, currentY + 3);
      
      currentY += 6;
      const legendCols = 3;
      const colWidth = tableWidth / legendCols;
      let legendX = margin;
      let legendY = currentY;
      let colIdx = 0;
      
      Object.entries(allergeniCodes).forEach(([nome, info]) => {
        // Box colorato
        doc.setFillColor(...info.color);
        doc.roundedRect(legendX, legendY - 3, 6, 4, 1, 1, 'F');
        doc.setDrawColor(50, 50, 50);
        doc.setLineWidth(0.2);
        doc.roundedRect(legendX, legendY - 3, 6, 4, 1, 1, 'S');
        
        // Codice
        doc.setFontSize(5.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text(info.code, legendX + 3, legendY - 0.2, { align: 'center' });
        
        // Nome allergene
        doc.setFontSize(6);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(nome, legendX + 7.5, legendY);
        
        colIdx++;
        if (colIdx >= legendCols) {
          colIdx = 0;
          legendX = margin;
          legendY += 5;
        } else {
          legendX += colWidth;
        }
      });
    }

    // Footer
    doc.setFillColor(241, 245, 249);
    doc.rect(0, 282, 210, 15, 'F');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
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