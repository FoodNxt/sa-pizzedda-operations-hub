import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { DOMParser } from 'jsr:@b-fuze/deno-dom';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { xml_content, file_url, file_name } = await req.json();

    if (!xml_content) {
      return Response.json({ error: 'xml_content required' }, { status: 400 });
    }

    // Parse XML using deno-dom
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml_content, 'text/xml');

    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      return Response.json({ 
        error: 'Invalid XML format', 
        details: parserError.textContent 
      }, { status: 400 });
    }

    const summary = {
      fornitori_creati: 0,
      fornitori_aggiornati: 0,
      prodotti_creati: 0,
      prodotti_aggiornati: 0,
      storico_creati: 0,
      errori: 0
    };

    const errors = [];
    const prodottiDettagli = [];

    // Extract Fornitore (CedentePrestatore)
    const cedente = xmlDoc.querySelector('CedentePrestatore');
    if (!cedente) {
      return Response.json({ 
        error: 'CedentePrestatore not found in XML' 
      }, { status: 400 });
    }

    const datiAnagrafici = cedente.querySelector('DatiAnagrafici');
    const anagrafica = datiAnagrafici?.querySelector('Anagrafica');
    
    const fornitoreData = {
      ragione_sociale: anagrafica?.querySelector('Denominazione')?.textContent || 
                       `${anagrafica?.querySelector('Nome')?.textContent || ''} ${anagrafica?.querySelector('Cognome')?.textContent || ''}`.trim(),
      partita_iva: datiAnagrafici?.querySelector('IdFiscaleIVA IdCodice')?.textContent || 
                   datiAnagrafici?.querySelector('CodiceFiscale')?.textContent || '',
      sede_legale: cedente.querySelector('Sede Indirizzo')?.textContent || '',
      tipo_fornitore: 'altro',
      attivo: true
    };

    // Check if fornitore exists (by P.IVA)
    let fornitore = null;
    if (fornitoreData.partita_iva) {
      const existing = await base44.asServiceRole.entities.Fornitore.filter({
        partita_iva: fornitoreData.partita_iva
      });
      
      if (existing.length > 0) {
        fornitore = existing[0];
        await base44.asServiceRole.entities.Fornitore.update(fornitore.id, fornitoreData);
        summary.fornitori_aggiornati++;
      } else {
        fornitore = await base44.asServiceRole.entities.Fornitore.create(fornitoreData);
        summary.fornitori_creati++;
      }
    } else {
      errors.push('Fornitore senza P.IVA, impossibile creare/aggiornare');
      summary.errori++;
    }

    // Extract Fattura Info
    const datiGenerali = xmlDoc.querySelector('DatiGeneraliDocumento');
    const fatturaInfo = {
      numero: datiGenerali?.querySelector('Numero')?.textContent || 'N/A',
      data: datiGenerali?.querySelector('Data')?.textContent || new Date().toISOString().split('T')[0],
      importo_totale: datiGenerali?.querySelector('ImportoTotaleDocumento')?.textContent || '0',
      fornitore_nome: fornitoreData.ragione_sociale,
      fornitore_id: fornitore?.id
    };

    // Extract Products (DettaglioLinee)
    const dettaglioLinee = xmlDoc.querySelectorAll('DettaglioLinee');
    
    for (const linea of dettaglioLinee) {
      try {
        const descrizione = linea.querySelector('Descrizione')?.textContent?.trim();
        if (!descrizione) continue;

        const codiceArticolo = linea.querySelector('CodiceArticolo CodiceValore')?.textContent?.trim();
        const quantita = parseFloat(linea.querySelector('Quantita')?.textContent || '0');
        const unitaMisura = linea.querySelector('UnitaMisura')?.textContent?.trim() || 'pezzi';
        const prezzoUnitario = parseFloat(linea.querySelector('PrezzoUnitario')?.textContent || '0');
        const aliquotaIVA = parseFloat(linea.querySelector('AliquotaIVA')?.textContent || '22');

        // Find or create product in MateriePrime
        let prodotto = null;
        
        // Try to find by codiceArticolo first
        if (codiceArticolo) {
          const byCode = await base44.asServiceRole.entities.MateriePrime.filter({
            codice_articolo: codiceArticolo
          });
          if (byCode.length > 0) prodotto = byCode[0];
        }

        // If not found, try by name (case insensitive)
        if (!prodotto) {
          const allProdotti = await base44.asServiceRole.entities.MateriePrime.list();
          prodotto = allProdotti.find(p => 
            p.nome_prodotto?.toLowerCase() === descrizione.toLowerCase()
          );
        }

        const prodottoData = {
          nome_prodotto: descrizione,
          codice_articolo: codiceArticolo || null,
          categoria: 'altro',
          unita_misura: unitaMisura,
          quantita_minima: quantita,
          prezzo_unitario: prezzoUnitario,
          fornitore: fornitoreData.ragione_sociale,
          attivo: true,
          posizione: 'negozio'
        };

        if (prodotto) {
          await base44.asServiceRole.entities.MateriePrime.update(prodotto.id, {
            prezzo_unitario: prezzoUnitario,
            fornitore: fornitoreData.ragione_sociale,
            codice_articolo: codiceArticolo || prodotto.codice_articolo
          });
          summary.prodotti_aggiornati++;
          
          prodottiDettagli.push({
            descrizione,
            codice: codiceArticolo,
            quantita,
            unita_misura: unitaMisura,
            prezzo_unitario: prezzoUnitario,
            status: 'updated'
          });
        } else {
          prodotto = await base44.asServiceRole.entities.MateriePrime.create(prodottoData);
          summary.prodotti_creati++;
          
          prodottiDettagli.push({
            descrizione,
            codice: codiceArticolo,
            quantita,
            unita_misura: unitaMisura,
            prezzo_unitario: prezzoUnitario,
            status: 'created'
          });
        }

        // Create historical price record
        if (fornitore && prodotto) {
          const storicoData = {
            materia_prima_id: prodotto.id,
            nome_prodotto: descrizione,
            fornitore_id: fornitore.id,
            fornitore_nome: fornitoreData.ragione_sociale,
            data_acquisto: fatturaInfo.data,
            prezzo_unitario: prezzoUnitario,
            quantita_acquistata: quantita,
            unita_misura: unitaMisura,
            numero_fattura: fatturaInfo.numero,
            codice_articolo_fornitore: codiceArticolo || null,
            aliquota_iva: aliquotaIVA
          };

          await base44.asServiceRole.entities.MateriePrimeStoricoPrezzi.create(storicoData);
          summary.storico_creati++;
        }

      } catch (err) {
        errors.push(`Errore prodotto "${linea.querySelector('Descrizione')?.textContent}": ${err.message}`);
        summary.errori++;
      }
    }

    return Response.json({
      success: true,
      message: `Importazione completata: ${summary.fornitori_creati + summary.fornitori_aggiornati} fornitori, ${summary.prodotti_creati + summary.prodotti_aggiornati} prodotti`,
      summary,
      fattura: fatturaInfo,
      prodotti: prodottiDettagli,
      errors: errors.length > 0 ? errors : undefined,
      file_name
    });

  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});