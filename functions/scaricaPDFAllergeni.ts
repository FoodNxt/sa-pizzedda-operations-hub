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
    
    // Recupera config allergeni per il logo
    const configs = await base44.asServiceRole.entities.AllergeniConfig.filter({
      is_active: true
    });
    const logo_url = configs[0]?.logo_url;

    const doc = new jsPDF();
    
    // Colori brand Sa Pizzedda
    const brandRed = [227, 30, 36];
    const brandBeige = [244, 229, 201];

    // Header con sfondo beige (ridotto)
    doc.setFillColor(...brandBeige);
    doc.rect(0, 0, 210, 40, 'F');
    
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
        
        doc.addImage(logoBase64, 'PNG', 85, 5, 40, 20, undefined, 'FAST');
      } catch (error) {
        console.error('Error loading logo:', error);
      }
    }
    
    // Titolo "Lista allergeni" in rosso brand (ridotto)
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...brandRed);
    doc.text('Lista Allergeni', 105, logo_url ? 30 : 20, { align: 'center' });
    
    // Sottotitolo (ridotto)
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Informazioni sugli allergeni presenti nei nostri prodotti', 105, logo_url ? 36 : 26, { align: 'center' });

    // Avviso importante con colori brand (compatto)
    doc.setFillColor(255, 250, 240);
    doc.roundedRect(15, 42, 180, 18, 3, 3, 'F');
    doc.setDrawColor(...brandRed);
    doc.setLineWidth(0.8);
    doc.roundedRect(15, 42, 180, 18, 3, 3, 'S');
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...brandRed);
    doc.text('ATTENZIONE', 20, 48);
    
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    const avvisoTesto = 'Questo documento contiene informazioni sugli allergeni secondo il Regolamento UE 1169/2011. Per allergici gravi o intolleranze non elencate, contattare il personale prima di ordinare.';
    const avvisoLines = doc.splitTextToSize(avvisoTesto, 170);
    doc.text(avvisoLines, 20, 54);

    // Ordina ricette alfabeticamente
    const ricetteOrdinate = ricette
      .filter(r => r.attivo !== false)
      .sort((a, b) => (a.nome_prodotto || '').localeCompare(b.nome_prodotto || '', 'it'));

    let currentY = 64;
    const margin = 15;
    const tableWidth = 180;

    // Calcola layout a 2 colonne per compattezza
    const itemsPerColumn = Math.ceil(ricetteOrdinate.length / 2);
    const columnWidth = 88;
    let columnX = margin;
    let itemIndex = 0;

    ricetteOrdinate.forEach((ricetta, idx) => {
      // Passa alla seconda colonna dopo metà prodotti
      if (idx === itemsPerColumn) {
        columnX = margin + columnWidth + 4;
        currentY = 64;
      }
      
      // Design semplificato - solo linea separatrice
      const rowHeight = 5.5;
      
      // Linea sottile beige di separazione
      if (idx > 0 && idx !== itemsPerColumn) {
        doc.setDrawColor(...brandBeige);
        doc.setLineWidth(0.3);
        doc.line(columnX, currentY - 0.5, columnX + columnWidth, currentY - 0.5);
      }

      // Nome prodotto - compatto
      doc.setFontSize(7);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...brandRed);
      const nomeTruncato = doc.splitTextToSize(ricetta.nome_prodotto, 30);
      doc.text(nomeTruncato[0], columnX + 1, currentY + 3.5);

      // Allergeni - testo semplice separato da virgole
      if (ricetta.allergeni && ricetta.allergeni.length > 0) {
        doc.setFontSize(6);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        
        const allergeniText = ricetta.allergeni.slice(0, 4).join(', ');
        const suffix = ricetta.allergeni.length > 4 ? ` +${ricetta.allergeni.length - 4}` : '';
        const fullText = allergeniText + suffix;
        
        const textWidth = doc.getTextWidth(fullText);
        const maxWidth = columnWidth - 32;
        
        if (textWidth <= maxWidth) {
          doc.text(fullText, columnX + 31, currentY + 3.5);
        } else {
          const truncated = doc.splitTextToSize(fullText, maxWidth);
          doc.text(truncated[0], columnX + 31, currentY + 3.5);
        }
      } else {
        doc.setFontSize(6);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(150, 150, 150);
        doc.text('Nessuno', columnX + 31, currentY + 3.5);
      }

      currentY += rowHeight;
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