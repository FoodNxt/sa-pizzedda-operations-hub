import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ricette_ids, logo_url } = await req.json();

    // Recupera le ricette selezionate
    const ricette = await base44.asServiceRole.entities.Ricetta.filter({
      id: { $in: ricette_ids }
    });

    const doc = new jsPDF();

    // Header con logo (sfondo bianco per leggibilità)
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 50, 'F');
    
    // Add logo if provided (posizione alta)
    if (logo_url) {
      try {
        const logoResponse = await fetch(logo_url);
        const logoBlob = await logoResponse.blob();
        const logoBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(logoBlob);
        });
        doc.addImage(logoBase64, 'PNG', 85, 8, 40, 25, undefined, 'FAST');
      } catch (error) {
        console.error('Error loading logo:', error);
      }
    }
    
    // Titolo in nero per contrasto alto
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('ALLERGENI', 105, logo_url ? 42 : 25, { align: 'center' });
    
    // Linea separatrice
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(15, 48, 195, 48);

    // Avviso importante (minimo 12pt, alto contrasto)
    doc.setFillColor(255, 250, 205);
    doc.roundedRect(15, 52, 180, 18, 3, 3, 'F');
    doc.setDrawColor(255, 140, 0);
    doc.setLineWidth(0.8);
    doc.roundedRect(15, 52, 180, 18, 3, 3, 'S');
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(200, 80, 0);
    doc.text('⚠️ ATTENZIONE', 20, 59);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Per allergici gravi o intolleranze non elencate, contattare il personale prima di ordinare.', 20, 66);

    // Ordina ricette alfabeticamente
    const ricetteOrdinate = ricette
      .filter(r => r.attivo !== false)
      .sort((a, b) => (a.nome_prodotto || '').localeCompare(b.nome_prodotto || '', 'it'));

    const rowHeight = 12;
    let currentY = 75;
    const margin = 15;
    const tableWidth = 180;

    ricetteOrdinate.forEach((ricetta, idx) => {
      // Controlla se serve nuova pagina
      const allergeniCount = ricetta.allergeni?.length || 0;
      const allergeniLines = Math.ceil(allergeniCount / 2);
      const estimatedHeight = 18 + (allergeniLines > 0 ? allergeniLines * 7 : 0);
      
      if (currentY + estimatedHeight > 265) {
        doc.addPage();
        currentY = 20;
      }
      
      // Box prodotto con sfondo bianco e bordo nero (alto contrasto)
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, currentY, tableWidth, estimatedHeight, 4, 4, 'FD');

      // Nome prodotto - leggibile (minimo 12pt), nero su bianco
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(ricetta.nome_prodotto, margin + 8, currentY + 10);

      // Allergeni in box azzurri stondati (come screenshot)
      if (ricetta.allergeni && ricetta.allergeni.length > 0) {
        let allergeniY = currentY + 10;
        let allergeniX = margin + 100;
        let itemsInRow = 0;
        
        ricetta.allergeni.forEach((allergene) => {
          // Misura il testo - minimo 12pt per leggibilità
          doc.setFontSize(11);
          doc.setFont(undefined, 'normal');
          const textWidth = doc.getTextWidth(allergene);
          const boxWidth = textWidth + 10;
          const boxHeight = 7;
          
          // Vai a capo se non c'è spazio
          if (allergeniX + boxWidth > margin + tableWidth - 5) {
            allergeniY += 9;
            allergeniX = margin + 100;
            itemsInRow = 0;
          }
          
          // Box stondato azzurro chiaro (come screenshot)
          doc.setFillColor(224, 242, 254);
          doc.setDrawColor(147, 197, 253);
          doc.setLineWidth(0.3);
          doc.roundedRect(allergeniX, allergeniY - 5, boxWidth, boxHeight, 3, 3, 'FD');
          
          // Testo centrato nel box - blu scuro per contrasto
          doc.setTextColor(30, 64, 175);
          doc.text(allergene, allergeniX + 5, allergeniY);
          
          allergeniX += boxWidth + 4;
          itemsInRow++;
        });
      } else {
        doc.setFontSize(11);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text('Nessun allergene', margin + 100, currentY + 10);
      }

      currentY += estimatedHeight + 5;
    });

    // Footer con info normativa e QR code placeholder
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 275, 210, 22, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text('SA PIZZEDDA', 105, 282, { align: 'center' });
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text('Regolamento UE 1169/2011 - Versione digitale disponibile su richiesta', 105, 287, { align: 'center' });
    
    doc.setFontSize(7);
    doc.text(`Aggiornato: ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}`, 105, 292, { align: 'center' });

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