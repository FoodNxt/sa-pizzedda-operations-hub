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

    // Crea PDF con pdf-lib
    const pdfDoc = await PDFDocument.create();
    let currentPage = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = currentPage.getSize();
    
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Colori brand Sa Pizzedda
    const brandRed = rgb(227/255, 30/255, 36/255);
    const brandBeige = rgb(244/255, 229/255, 201/255);
    const brandBlue = rgb(30/255, 64/255, 175/255);
    const lightBlue = rgb(219/255, 234/255, 254/255);
    const borderBlue = rgb(147/255, 197/255, 253/255);

    let yPosition = height - 35;

    // Header con sfondo beige
    currentPage.drawRectangle({
      x: 0,
      y: height - 150,
      width: width,
      height: 150,
      color: brandBeige
    });
    
    // Carica logo PNG
    if (logo_url) {
      try {
        console.log('🔄 Downloading logo:', logo_url);
        const logoResponse = await fetch(logo_url);
        
        if (logoResponse.ok) {
          const logoImageBytes = await logoResponse.arrayBuffer();
          console.log('✓ Logo downloaded:', logoImageBytes.byteLength, 'bytes');
          
          const logoImage = await pdfDoc.embedPng(logoImageBytes);
          const logoScaled = logoImage.scale(0.06);
          
          currentPage.drawImage(logoImage, {
            x: (width - logoScaled.width) / 2,
            y: height - 95,
            width: logoScaled.width,
            height: logoScaled.height
          });
          
          yPosition = height - 125;
          console.log('✅ Logo added to PDF');
        }
      } catch (error) {
        console.error('Logo error:', error.message);
        yPosition = height - 85;
      }
    }
    
    // Titolo
    currentPage.drawText('Lista Allergeni', {
      x: width / 2 - helveticaBold.widthOfTextAtSize('Lista Allergeni', 24) / 2,
      y: yPosition,
      size: 24,
      font: helveticaBold,
      color: brandRed
    });
    
    yPosition -= 18;
    
    // Sottotitolo
    const subtitle = 'Informazioni sugli allergeni presenti nei nostri prodotti';
    currentPage.drawText(subtitle, {
      x: width / 2 - helvetica.widthOfTextAtSize(subtitle, 9) / 2,
      y: yPosition,
      size: 9,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4)
    });
    
    yPosition -= 30;

    // Box avviso
    currentPage.drawRectangle({
      x: 40,
      y: yPosition - 35,
      width: width - 80,
      height: 35,
      color: rgb(1, 0.98, 0.94),
      borderColor: brandRed,
      borderWidth: 1
    });
    
    currentPage.drawText('ATTENZIONE', {
      x: 50,
      y: yPosition - 12,
      size: 10,
      font: helveticaBold,
      color: brandRed
    });
    
    const avviso = 'Per allergici gravi o intolleranze non elencate, contattare il personale';
    const avviso2 = 'prima di ordinare. Reg. UE 1169/2011.';
    currentPage.drawText(avviso, {
      x: 50,
      y: yPosition - 23,
      size: 7,
      font: helvetica,
      color: rgb(0, 0, 0)
    });
    currentPage.drawText(avviso2, {
      x: 50,
      y: yPosition - 31,
      size: 7,
      font: helvetica,
      color: rgb(0, 0, 0)
    });

    yPosition -= 50;

    // Ordina ricette
    const ricetteOrdinate = ricette
      .filter(r => r.attivo !== false)
      .sort((a, b) => (a.nome_prodotto || '').localeCompare(b.nome_prodotto || '', 'it'));

    // Disegna ricette
    for (const ricetta of ricetteOrdinate) {
      // Check se serve nuova pagina
      if (yPosition < 100) {
        currentPage = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }
      
      const boxHeight = 35;
      
      // Box beige
      currentPage.drawRectangle({
        x: 40,
        y: yPosition - boxHeight,
        width: width - 80,
        height: boxHeight,
        color: brandBeige
      });
      
      // Bordo rosso sinistra
      currentPage.drawRectangle({
        x: 40,
        y: yPosition - boxHeight,
        width: 4,
        height: boxHeight,
        color: brandRed
      });
      
      // Nome prodotto
      currentPage.drawText(ricetta.nome_prodotto || 'N/A', {
        x: 50,
        y: yPosition - 20,
        size: 14,
        font: helveticaBold,
        color: brandRed,
        maxWidth: 250
      });
      
      // Allergeni a destra
      if (ricetta.allergeni && ricetta.allergeni.length > 0) {
        let xPos = width - 60;
        
        for (let i = ricetta.allergeni.length - 1; i >= 0; i--) {
          const allergene = ricetta.allergeni[i];
          const textWidth = helvetica.widthOfTextAtSize(allergene, 9);
          const boxWidth = textWidth + 12;
          
          xPos -= boxWidth;
          
          // Box celeste rettangolare semplice
          currentPage.drawRectangle({
            x: xPos,
            y: yPosition - 26,
            width: boxWidth,
            height: 16,
            color: lightBlue,
            borderColor: borderBlue,
            borderWidth: 0.5
          });
          
          currentPage.drawText(allergene, {
            x: xPos + 6,
            y: yPosition - 20,
            size: 9,
            font: helvetica,
            color: brandBlue
          });
          
          xPos -= 8;
        }
      } else {
        currentPage.drawText('Nessuno', {
          x: width - 100,
          y: yPosition - 20,
          size: 10,
          font: helvetica,
          color: rgb(0.6, 0.6, 0.6)
        });
      }
      
      yPosition -= boxHeight + 4;
    }

    // Footer su TUTTE le pagine create
    const pages = pdfDoc.getPages();
    for (const page of pages) {
      page.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: 60,
        color: brandBeige
      });
      
      page.drawText('SA PIZZEDDA', {
        x: width / 2 - helveticaBold.widthOfTextAtSize('SA PIZZEDDA', 14) / 2,
        y: 40,
        size: 14,
        font: helveticaBold,
        color: brandRed
      });
      
      const regText = 'Regolamento UE 1169/2011 - Versione digitale disponibile su richiesta';
      page.drawText(regText, {
        x: width / 2 - helvetica.widthOfTextAtSize(regText, 8) / 2,
        y: 25,
        size: 8,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3)
      });
      
      const dataAggiornamento = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
      const dataText = 'Aggiornato: ' + dataAggiornamento;
      page.drawText(dataText, {
        x: width / 2 - helvetica.widthOfTextAtSize(dataText, 7) / 2,
        y: 12,
        size: 7,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3)
      });
    }

    const pdfBytes = await pdfDoc.save();
    
    // Convert to base64 for reliable transfer
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    return new Response(JSON.stringify({
      success: true,
      pdf: base64Pdf,
      filename: 'allergeni.pdf'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});