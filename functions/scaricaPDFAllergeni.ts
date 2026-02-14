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
    
    // Colori brand Sa Pizzedda
    const brandRed = [227, 30, 36];
    const brandBeige = [244, 229, 201];

    // Header con sfondo beige
    doc.setFillColor(...brandBeige);
    doc.rect(0, 0, 210, 55, 'F');
    
    // Add logo if provided (posizione alta centrata)
    if (logo_url) {
      try {
        const logoResponse = await fetch(logo_url);
        const logoArrayBuffer = await logoResponse.arrayBuffer();
        const logoUint8Array = new Uint8Array(logoArrayBuffer);
        
        // Convert to base64
        let binary = '';
        for (let i = 0; i < logoUint8Array.length; i++) {
          binary += String.fromCharCode(logoUint8Array[i]);
        }
        const logoBase64 = 'data:image/png;base64,' + btoa(binary);
        
        doc.addImage(logoBase64, 'PNG', 85, 8, 40, 25, undefined, 'FAST');
      } catch (error) {
        console.error('Error loading logo:', error);
      }
    }
    
    // Titolo "Lista allergeni" in rosso brand
    doc.setFontSize(26);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...brandRed);
    doc.text('Lista Allergeni', 105, logo_url ? 42 : 25, { align: 'center' });
    
    // Sottotitolo
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Informazioni sugli allergeni presenti nei nostri prodotti', 105, logo_url ? 50 : 33, { align: 'center' });

    // Avviso importante con colori brand
    doc.setFillColor(255, 250, 240);
    doc.roundedRect(15, 60, 180, 18, 4, 4, 'F');
    doc.setDrawColor(...brandRed);
    doc.setLineWidth(1);
    doc.roundedRect(15, 60, 180, 18, 4, 4, 'S');
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...brandRed);
    doc.text('ATTENZIONE', 20, 67);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Per allergici gravi o intolleranze non elencate, contattare il personale prima di ordinare.', 20, 74);

    // Ordina ricette alfabeticamente
    const ricetteOrdinate = ricette
      .filter(r => r.attivo !== false)
      .sort((a, b) => (a.nome_prodotto || '').localeCompare(b.nome_prodotto || '', 'it'));

    let currentY = 83;
    const margin = 15;
    const tableWidth = 180;

    ricetteOrdinate.forEach((ricetta, idx) => {
      // Controlla se serve nuova pagina
      const allergeniCount = ricetta.allergeni?.length || 0;
      const allergeniLines = Math.ceil(allergeniCount / 2);
      const estimatedHeight = 20 + (allergeniLines > 0 ? allergeniLines * 8 : 0);
      
      if (currentY + estimatedHeight > 265) {
        doc.addPage();
        currentY = 20;
      }
      
      // Box prodotto moderno con sfondo beige e bordo rosso
      doc.setFillColor(...brandBeige);
      doc.roundedRect(margin, currentY, tableWidth, estimatedHeight, 5, 5, 'F');
      
      // Bordo rosso a sinistra (accento design)
      doc.setFillColor(...brandRed);
      doc.roundedRect(margin, currentY, 4, estimatedHeight, 2, 2, 'F');

      // Nome prodotto - leggibile (minimo 13pt), rosso brand
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...brandRed);
      doc.text(ricetta.nome_prodotto, margin + 10, currentY + 11);

      // Allergeni in box rosati stondati (palette brand)
      if (ricetta.allergeni && ricetta.allergeni.length > 0) {
        let allergeniY = currentY + 11;
        let allergeniX = margin + 100;
        
        ricetta.allergeni.forEach((allergene) => {
          // Misura il testo - minimo 11pt per leggibilità
          doc.setFontSize(10);
          doc.setFont(undefined, 'normal');
          const textWidth = doc.getTextWidth(allergene);
          const boxWidth = textWidth + 8;
          const boxHeight = 6;
          
          // Vai a capo se non c'è spazio
          if (allergeniX + boxWidth > margin + tableWidth - 5) {
            allergeniY += 8;
            allergeniX = margin + 100;
          }
          
          // Box stondato rosa chiaro
          doc.setFillColor(252, 235, 235);
          doc.setDrawColor(...brandRed);
          doc.setLineWidth(0.4);
          doc.roundedRect(allergeniX, allergeniY - 4.5, boxWidth, boxHeight, 3, 3, 'FD');
          
          // Testo centrato nel box - rosso scuro
          doc.setTextColor(185, 28, 28);
          doc.text(allergene, allergeniX + 4, allergeniY);
          
          allergeniX += boxWidth + 3;
        });
      } else {
        doc.setFontSize(10);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text('Nessun allergene', margin + 100, currentY + 11);
      }

      currentY += estimatedHeight + 4;
    });

    // Footer con palette brand
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