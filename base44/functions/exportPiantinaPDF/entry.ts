import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storeId, storeName, format } = await req.json();
    if (!storeId) {
      return Response.json({ error: 'storeId richiesto' }, { status: 400 });
    }

    // Fetch data
    const [mappe, prodotti] = await Promise.all([
      base44.asServiceRole.entities.MappaLocale.filter({ store_id: storeId }),
      base44.asServiceRole.entities.MateriePrime.filter({ attivo: true }),
    ]);

    const mappa = mappe[0];
    const areas = mappa?.storage_areas || [];

    // Build product-to-area mapping for this store
    const areaProducts = {};
    areas.forEach(a => { areaProducts[a.id] = { nome: a.nome, colore: a.colore, products: [] }; });
    
    const unmapped = [];

    prodotti.forEach(p => {
      if (p.assigned_stores && p.assigned_stores.length > 0 && !p.assigned_stores.includes(storeId)) {
        return;
      }
      const areaId = p.storage_area_per_store?.[storeId];
      if (areaId && areaProducts[areaId]) {
        areaProducts[areaId].products.push(p);
      } else {
        unmapped.push(p);
      }
    });

    const sortedAreas = Object.entries(areaProducts)
      .filter(([_, data]) => data.products.length > 0)
      .sort(([, a], [, b]) => a.nome.localeCompare(b.nome, 'it'));

    const safeName = (storeName || storeId).replace(/\s/g, '_');

    // ======================== CSV FORMAT ========================
    if (format === 'csv') {
      let csv = 'Area;Nome Interno;Categoria\n';
      for (const [, data] of sortedAreas) {
        const sorted = data.products.sort((a, b) =>
          (a.nome_interno || '').localeCompare(b.nome_interno || '', 'it')
        );
        for (const p of sorted) {
          csv += `"${data.nome}";"${p.nome_interno || '-'}";"${p.categoria || '-'}"\n`;
        }
      }
      if (unmapped.length > 0) {
        const sortedU = unmapped.sort((a, b) =>
          (a.nome_interno || '').localeCompare(b.nome_interno || '', 'it')
        );
        for (const p of sortedU) {
          csv += `"Senza Area";"${p.nome_interno || '-'}";"${p.categoria || '-'}"\n`;
        }
      }
      return Response.json({
        success: true,
        data: csv,
        filename: `posizioni-${safeName}.csv`,
        mimeType: 'text/csv'
      });
    }

    // ======================== PDF FORMAT ========================
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 15;
    const contentW = pageW - margin * 2;

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Posizione Prodotti - ${storeName || storeId}`, margin, 20);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Generato il ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, 27);
    doc.setTextColor(0, 0, 0);

    let y = 35;

    // ---- Embed background planimetria image ----
    if (mappa?.background_image) {
      try {
        const imgResp = await fetch(mappa.background_image);
        if (imgResp.ok) {
          const imgBuf = await imgResp.arrayBuffer();
          const imgBytes = new Uint8Array(imgBuf);
          
          // Detect format from URL or content-type
          const ct = imgResp.headers.get('content-type') || '';
          let imgFormat = 'JPEG';
          if (ct.includes('png') || mappa.background_image.toLowerCase().includes('.png')) {
            imgFormat = 'PNG';
          }

          // Convert to base64
          let binary = '';
          for (let i = 0; i < imgBytes.length; i++) {
            binary += String.fromCharCode(imgBytes[i]);
          }
          const imgBase64 = btoa(binary);
          const dataUri = `data:${ct || 'image/jpeg'};base64,${imgBase64}`;

          // Calculate dimensions to fit the page width while maintaining aspect ratio
          const mapW = contentW;
          const mapH = 90; // max height for the map

          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Planimetria', margin, y);
          y += 5;

          // Draw the background image
          doc.addImage(dataUri, imgFormat, margin, y, mapW, mapH);

          // Overlay storage areas on top of the image
          if (areas.length > 0) {
            areas.forEach(area => {
              const ax = margin + (area.x / 100) * mapW;
              const ay = y + (area.y / 100) * mapH;
              const aw = (area.width / 100) * mapW;
              const ah = (area.height / 100) * mapH;

              const hex = (area.colore || '#3B82F6').replace('#', '');
              const r = parseInt(hex.substring(0, 2), 16);
              const g = parseInt(hex.substring(2, 4), 16);
              const b = parseInt(hex.substring(4, 6), 16);

              // Semi-transparent fill
              doc.setGState(new doc.GState({ opacity: 0.25 }));
              doc.setFillColor(r, g, b);
              doc.rect(ax, ay, aw, ah, 'F');
              
              // Border
              doc.setGState(new doc.GState({ opacity: 0.8 }));
              doc.setDrawColor(r, g, b);
              doc.setLineWidth(0.5);
              doc.rect(ax, ay, aw, ah, 'S');

              // Area label
              doc.setGState(new doc.GState({ opacity: 1 }));
              doc.setFontSize(6);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(r, g, b);
              doc.text(area.nome || 'Area', ax + aw / 2, ay + ah / 2 + 1, { align: 'center' });
            });
          }

          doc.setGState(new doc.GState({ opacity: 1 }));
          doc.setTextColor(0, 0, 0);
          y += mapH + 8;
        }
      } catch (imgErr) {
        console.error('Error loading planimetria image:', imgErr.message);
        // Fall through to draw areas without background
      }
    }

    // If no background image was drawn but areas exist, draw simplified boxes
    if (!mappa?.background_image && areas.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Mappa Aree di Stoccaggio', margin, y);
      y += 8;

      const mapH = 80;
      const mapW = contentW;
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(margin, y, mapW, mapH, 2, 2, 'FD');

      areas.forEach(area => {
        const ax = margin + (area.x / 100) * mapW;
        const ay = y + (area.y / 100) * mapH;
        const aw = (area.width / 100) * mapW;
        const ah = (area.height / 100) * mapH;

        const hex = (area.colore || '#3B82F6').replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        doc.setFillColor(r, g, b);
        doc.setDrawColor(r, g, b);
        doc.setLineWidth(0.5);
        doc.rect(ax, ay, aw, ah, 'FD');

        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(area.nome || 'Area', ax + aw / 2, ay + ah / 2 + 1, { align: 'center' });
      });

      doc.setTextColor(0, 0, 0);
      y += mapH + 10;
    }

    // ---- Product list per area (only nome_interno + categoria) ----
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Prodotti per Area', margin, y);
    y += 8;

    const colNome = margin + 2;
    const colCat = margin + 120;

    for (const [areaId, data] of sortedAreas) {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      const hex = (data.colore || '#3B82F6').replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      // Area header
      doc.setFillColor(r, g, b);
      doc.roundedRect(margin, y, contentW, 7, 1, 1, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`${data.nome} (${data.products.length})`, margin + 3, y + 5);
      doc.setTextColor(0, 0, 0);
      y += 10;

      const sorted = data.products.sort((a, b) =>
        (a.nome_interno || '').localeCompare(b.nome_interno || '', 'it')
      );

      // Table header
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, contentW, 6, 'F');
      doc.text('Nome Interno', colNome, y + 4);
      doc.text('Categoria', colCat, y + 4);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      for (let i = 0; i < sorted.length; i++) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        const rowY = y;
        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, rowY - 1, contentW, 5, 'F');
        }
        doc.text((sorted[i].nome_interno || '-').substring(0, 60), colNome, rowY + 2.5);
        doc.text((sorted[i].categoria || '-').substring(0, 30), colCat, rowY + 2.5);
        y += 5;
      }
      y += 5;
    }

    // Unmapped products
    if (unmapped.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(200, 200, 200);
      doc.roundedRect(margin, y, contentW, 7, 1, 1, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(`Senza Area Assegnata (${unmapped.length})`, margin + 3, y + 5);
      doc.setTextColor(0, 0, 0);
      y += 10;

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, contentW, 6, 'F');
      doc.text('Nome Interno', colNome, y + 4);
      doc.text('Categoria', colCat, y + 4);
      y += 8;

      doc.setFont('helvetica', 'normal');
      const sortedU = unmapped.sort((a, b) =>
        (a.nome_interno || '').localeCompare(b.nome_interno || '', 'it')
      );

      for (let i = 0; i < sortedU.length; i++) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        const rowY = y;
        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, rowY - 1, contentW, 5, 'F');
        }
        doc.text((sortedU[i].nome_interno || '-').substring(0, 60), colNome, rowY + 2.5);
        doc.text((sortedU[i].categoria || '-').substring(0, 30), colCat, rowY + 2.5);
        y += 5;
      }
    }

    const pdfBase64 = doc.output('datauristring').split(',')[1];

    return Response.json({
      success: true,
      pdf: pdfBase64,
      filename: `posizioni-${safeName}.pdf`
    });
  } catch (error) {
    console.error('Export error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});