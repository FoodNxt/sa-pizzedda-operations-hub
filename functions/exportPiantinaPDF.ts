import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storeId, storeName } = await req.json();
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
      // Check if product is assigned to this store
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

    // Create PDF
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

    // Draw map representation (simplified boxes)
    let y = 35;
    
    if (areas.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Mappa Aree di Stoccaggio', margin, y);
      y += 8;

      const mapH = 80;
      const mapW = contentW;
      
      // Background
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(margin, y, mapW, mapH, 2, 2, 'FD');

      // Draw each area on the map
      areas.forEach(area => {
        const ax = margin + (area.x / 100) * mapW;
        const ay = y + (area.y / 100) * mapH;
        const aw = (area.width / 100) * mapW;
        const ah = (area.height / 100) * mapH;

        // Parse color
        const hex = (area.colore || '#3B82F6').replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        doc.setFillColor(r, g, b, 0.15);
        doc.setDrawColor(r, g, b);
        doc.setLineWidth(0.5);
        doc.rect(ax, ay, aw, ah, 'FD');

        // Area name
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(r, g, b);
        const nameX = ax + aw / 2;
        const nameY = ay + ah / 2 + 1;
        doc.text(area.nome || 'Area', nameX, nameY, { align: 'center' });
      });

      doc.setTextColor(0, 0, 0);
      y += mapH + 10;
    }

    // Product list per area
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Prodotti per Area', margin, y);
    y += 8;

    const sortedAreas = Object.entries(areaProducts)
      .filter(([_, data]) => data.products.length > 0)
      .sort(([, a], [, b]) => a.nome.localeCompare(b.nome, 'it'));

    for (const [areaId, data] of sortedAreas) {
      // Check page break
      if (y > 265) {
        doc.addPage();
        y = 20;
      }

      const hex = (data.colore || '#3B82F6').replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      // Area header
      doc.setFillColor(r, g, b);
      doc.roundedRect(margin, y - 4, contentW, 7, 1, 1, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`${data.nome} (${data.products.length} prodotti)`, margin + 3, y);
      doc.setTextColor(0, 0, 0);
      y += 7;

      // Sort products by nome_interno then nome_prodotto
      const sorted = data.products.sort((a, b) => 
        (a.nome_interno || a.nome_prodotto).localeCompare(b.nome_interno || b.nome_prodotto, 'it')
      );

      // Table header
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, contentW, 5, 'F');
      doc.text('Nome Interno', margin + 2, y + 3.5);
      doc.text('Prodotto', margin + 55, y + 3.5);
      doc.text('Fornitore', margin + 120, y + 3.5);
      doc.text('Cat.', margin + 160, y + 3.5);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      
      for (const p of sorted) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }

        // Alternate row color
        if (sorted.indexOf(p) % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 3, contentW, 5, 'F');
        }

        doc.text((p.nome_interno || '-').substring(0, 30), margin + 2, y);
        doc.text((p.nome_prodotto || '-').substring(0, 35), margin + 55, y);
        doc.text((p.fornitore || '-').substring(0, 22), margin + 120, y);
        doc.text((p.categoria || '-').substring(0, 15), margin + 160, y);
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
      doc.roundedRect(margin, y - 4, contentW, 7, 1, 1, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(`Senza Area Assegnata (${unmapped.length} prodotti)`, margin + 3, y);
      doc.setTextColor(0, 0, 0);
      y += 7;

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, contentW, 5, 'F');
      doc.text('Nome Interno', margin + 2, y + 3.5);
      doc.text('Prodotto', margin + 55, y + 3.5);
      doc.text('Fornitore', margin + 120, y + 3.5);
      doc.text('Cat.', margin + 160, y + 3.5);
      y += 6;

      doc.setFont('helvetica', 'normal');
      const sortedUnmapped = unmapped.sort((a, b) => 
        (a.nome_interno || a.nome_prodotto).localeCompare(b.nome_interno || b.nome_prodotto, 'it')
      );

      for (const p of sortedUnmapped) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        if (sortedUnmapped.indexOf(p) % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 3, contentW, 5, 'F');
        }
        doc.text((p.nome_interno || '-').substring(0, 30), margin + 2, y);
        doc.text((p.nome_prodotto || '-').substring(0, 35), margin + 55, y);
        doc.text((p.fornitore || '-').substring(0, 22), margin + 120, y);
        doc.text((p.categoria || '-').substring(0, 15), margin + 160, y);
        y += 5;
      }
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=posizioni-${(storeName || storeId).replace(/\s/g, '_')}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});