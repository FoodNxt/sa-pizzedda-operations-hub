import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';

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

    // Crea PDF con pdf-lib (supporto PNG migliore)
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Colori brand Sa Pizzedda
    const brandRed = rgb(227/255, 30/255, 36/255);
    const brandBeige = rgb(244/255, 229/255, 201/255);
    const brandBlue = rgb(30/255, 64/255, 175/255);
    const lightBlue = rgb(219/255, 234/255, 254/255);

    let currentY = height - 35; // Start from top

    // Header con sfondo beige
    page.drawRectangle({
      x: 0,
      y: height - 100,
      width: width,
      height: 100,
      color: brandBeige
    });
    
    // Carica e aggiungi logo - APPROCCIO NUOVO con pdf-lib
    let logoLoaded = false;
    if (logo_url) {
      try {
        console.log('🔄 Loading logo from:', logo_url);
        
        const logoResponse = await fetch(logo_url);
        if (!logoResponse.ok) {
          throw new Error(`HTTP ${logoResponse.status}`);
        }
        
        const logoBytes = await logoResponse.arrayBuffer();
        console.log('✓ Logo downloaded:', logoBytes.byteLength, 'bytes');
        
        // pdf-lib ha supporto nativo migliore per PNG
        const logoImage = await pdfDoc.embedPng(logoBytes);
        const logoDims = logoImage.scale(0.3); // Scala automatica
        
        // Centra il logo
        const logoX = (width - logoDims.width) / 2;
        const logoY = height - 80;
        
        page.drawImage(logoImage, {
          x: logoX,
          y: logoY,
          width: logoDims.width,
          height: logoDims.height
        });
        
        logoLoaded = true;
        currentY = logoY - 15;
        console.log('✅ Logo embedded successfully');
        
      } catch (error) {
        console.error('❌ Logo error:', error.message);
        currentY = height - 50; // Position senza logo
      }
    } else {
      console.log('⚠ No logo configured');
      currentY = height - 50;
    }
    
    // Titolo
    page.drawText('Lista Allergeni', {
      x: width / 2 - 80,
      y: currentY,
      size: 24,
      font: helveticaBold,
      color: brandRed
    });
    
    currentY -= 15;
    
    // Sottotitolo
    page.drawText('Informazioni sugli allergeni presenti nei nostri prodotti', {
      x: width / 2 - 140,
      y: currentY,
      size: 9,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4)
    });
    
    currentY -= 25;

    // Box avviso
    page.drawRectangle({
      x: 40,
      y: currentY - 35,
      width: width - 80,
      height: 35,
      color: rgb(1, 0.98, 0.94),
      borderColor: brandRed,
      borderWidth: 1
    });
    
    page.drawText('ATTENZIONE', {
      x: 50,
      y: currentY - 15,
      size: 10,
      font: helveticaBold,
      color: brandRed
    });
    
    const avvisoTesto = 'Per allergici gravi o intolleranze non elencate, contattare il personale prima di ordinare. Reg. UE 1169/2011.';
    page.drawText(avvisoTesto, {
      x: 50,
      y: currentY - 28,
      size: 7,
      font: helvetica,
      color: rgb(0, 0, 0),
      maxWidth: width - 100
    });

    currentY -= 50;

    // Ordina ricette alfabeticamente
    const ricetteOrdinate = ricette
      .filter(r => r.attivo !== false)
      .sort((a, b) => (a.nome_prodotto || '').localeCompare(b.nome_prodotto || '', 'it'));

    // Disegna ricette
    for (const ricetta of ricetteOrdinate) {
      if (currentY < 80) {
        // Aggiungi nuova pagina se necessario
        const newPage = pdfDoc.addPage([595, 842]);
        currentY = height - 50;
      }
      
      const boxHeight = 35;
      
      // Box beige
      page.drawRectangle({
        x: 40,
        y: currentY - boxHeight,
        width: width - 80,
        height: boxHeight,
        color: brandBeige
      });
      
      // Bordo rosso sinistra
      page.drawRectangle({
        x: 40,
        y: currentY - boxHeight,
        width: 4,
        height: boxHeight,
        color: brandRed
      });
      
      // Nome prodotto
      page.drawText(ricetta.nome_prodotto || 'N/A', {
        x: 50,
        y: currentY - 22,
        size: 14,
        font: helveticaBold,
        color: brandRed,
        maxWidth: 200
      });
      
      // Allergeni
      if (ricetta.allergeni && ricetta.allergeni.length > 0) {
        let allergeniX = width - 60;
        const allergeniY = currentY - 22;
        
        for (let i = ricetta.allergeni.length - 1; i >= 0; i--) {
          const allergene = ricetta.allergeni[i];
          const textWidth = helvetica.widthOfTextAtSize(allergene, 9);
          const boxWidth = textWidth + 12;
          
          allergeniX -= boxWidth;
          
          // Box celeste
          page.drawRectangle({
            x: allergeniX,
            y: allergeniY - 6,
            width: boxWidth,
            height: 15,
            color: lightBlue,
            borderColor: rgb(147/255, 197/255, 253/255),
            borderWidth: 0.5
          });
          
          page.drawText(allergene, {
            x: allergeniX + 6,
            y: allergeniY,
            size: 9,
            font: helvetica,
            color: brandBlue
          });
          
          allergeniX -= 8;
        }
      } else {
        page.drawText('Nessuno', {
          x: width - 100,
          y: currentY - 22,
          size: 10,
          font: helvetica,
          color: rgb(0.6, 0.6, 0.6)
        });
      }
      
      currentY -= boxHeight + 4;
    }

    // Footer
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: 60,
      color: brandBeige
    });
    
    page.drawText('SA PIZZEDDA', {
      x: width / 2 - 50,
      y: 40,
      size: 14,
      font: helveticaBold,
      color: brandRed
    });
    
    page.drawText('Regolamento UE 1169/2011 - Versione digitale disponibile su richiesta', {
      x: width / 2 - 150,
      y: 25,
      size: 8,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3)
    });
    
    const dataAggiornamento = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
    page.drawText('Aggiornato: ' + dataAggiornamento, {
      x: width / 2 - 60,
      y: 12,
      size: 7,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3)
    });

    const pdfBytes = await pdfDoc.save();

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