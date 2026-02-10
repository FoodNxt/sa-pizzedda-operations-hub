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
    
    // Mappa emoji allergeni
    const allergeniIcons = {
      'Glutine': '🌾',
      'Crostacei': '🦞',
      'Uova': '🥚',
      'Pesce': '🐟',
      'Arachidi': '🥜',
      'Soia': '🫘',
      'Latte': '🥛',
      'Frutta a guscio': '🌰',
      'Sedano': '🥬',
      'Senape': '🟡',
      'Semi di sesamo': '⚪',
      'Anidride solforosa': '☁️',
      'Lupini': '🫘',
      'Molluschi': '🐚'
    };

    // Header con design accattivante
    doc.setFillColor(251, 191, 36); // amber-400
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('🌾 ALLERGENI', 105, 20, { align: 'center' });
    
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
        let allergeniX = margin + 95;
        
        ricetta.allergeni.forEach((allergene, aIdx) => {
          const icon = allergeniIcons[allergene] || '⚠️';
          
          // Background allergene
          doc.setFillColor(254, 226, 226); // red-100
          doc.roundedRect(allergeniX, allergeniY - 4, 22, 5, 1, 1, 'F');
          
          // Testo allergene
          doc.setFontSize(8);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(185, 28, 28); // red-700
          doc.text(`${icon} ${allergene}`, allergeniX + 1, allergeniY);
          
          allergeniX += 24;
          
          // Vai a capo dopo 4 allergeni
          if ((aIdx + 1) % 4 === 0) {
            allergeniY += 6;
            allergeniX = margin + 95;
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