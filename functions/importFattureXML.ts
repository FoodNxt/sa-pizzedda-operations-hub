
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { XMLParser } from 'npm:fast-xml-parser@4.3.4';

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

    // Parse XML using fast-xml-parser
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
    
    let xmlDoc;
    try {
      xmlDoc = parser.parse(xml_content);
    } catch (parseError) {
      return Response.json({ 
        error: 'Invalid XML format', 
        details: parseError.message 
      }, { status: 400 });
    }

    // Navigate to FatturaElettronica
    const fattura = xmlDoc.FatturaElettronica || xmlDoc['p:FatturaElettronica'];
    if (!fattura) {
      return Response.json({ 
        error: 'FatturaElettronica not found in XML. This might not be a FatturaPA file.' 
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
    const header = fattura.FatturaElettronicaHeader;
    if (!header) {
      return Response.json({ 
        error: 'FatturaElettronicaHeader not found in XML' 
      }, { status: 400 });
    }

    const cedente = header.CedentePrestatore;
    if (!cedente) {
      return Response.json({ 
        error: 'CedentePrestatore not found in XML' 
      }, { status: 400 });
    }

    const datiAnagrafici = cedente.DatiAnagrafici;
    const anagrafica = datiAnagrafici?.Anagrafica;
    const sede = cedente.Sede;
    
    const fornitoreData = {
      ragione_sociale: anagrafica?.Denominazione || 
                       `${anagrafica?.Nome || ''} ${anagrafica?.Cognome || ''}`.trim() ||
                       'Fornitore Sconosciuto',
      partita_iva: String(datiAnagrafici?.IdFiscaleIVA?.IdCodice || 
                   datiAnagrafici?.CodiceFiscale || ''),
      sede_legale: sede?.Indirizzo ? 
        `${sede.Indirizzo}, ${sede.CAP || ''} ${sede.Comune || ''} ${sede.Provincia || ''}`.trim() : '',
      tipo_fornitore: 'altro',
      attivo: true
    };

    // Check if fornitore exists (by P.IVA) - only if we have a valid P.IVA
    let fornitore = null;
    if (fornitoreData.partita_iva && fornitoreData.partita_iva.length > 0) {
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
      // If no P.IVA, try to create with ragione_sociale only
      try {
        fornitore = await base44.asServiceRole.entities.Fornitore.create(fornitoreData);
        summary.fornitori_creati++;
        errors.push('Fornitore creato senza P.IVA - verifica i dati');
      } catch (e) {
        errors.push('Impossibile creare fornitore senza P.IVA valida: ' + e.message);
        summary.errori++;
      }
    }

    // Extract Fattura Info
    const body = fattura.FatturaElettronicaBody;
    if (!body) {
      return Response.json({ 
        error: 'FatturaElettronicaBody not found in XML' 
      }, { status: 400 });
    }

    const datiGenerali = body.DatiGenerali?.DatiGeneraliDocumento;
    const fatturaInfo = {
      numero: datiGenerali?.Numero || 'N/A',
      data: datiGenerali?.Data || new Date().toISOString().split('T')[0],
      importo_totale: datiGenerali?.ImportoTotaleDocumento || '0',
      fornitore_nome: fornitoreData.ragione_sociale,
      fornitore_id: fornitore?.id
    };

    // Extract Products (DettaglioLinee)
    const datiBeniServizi = body.DatiBeniServizi;
    if (!datiBeniServizi) {
      return Response.json({
        success: true,
        message: `Fornitore importato ma nessun prodotto trovato`,
        summary,
        fattura: fatturaInfo,
        prodotti: [],
        file_name
      });
    }

    let dettaglioLinee = datiBeniServizi.DettaglioLinee;
    
    // Handle both single object and array
    if (!Array.isArray(dettaglioLinee)) {
      dettaglioLinee = dettaglioLinee ? [dettaglioLinee] : [];
    }
    
    for (const linea of dettaglioLinee) {
      try {
        const descrizione = linea.Descrizione?.trim();
        if (!descrizione) continue;

        const codiceArticolo = linea.CodiceArticolo?.CodiceValore?.trim();
        const quantita = parseFloat(linea.Quantita || '0');
        const unitaMisura = linea.UnitaMisura?.trim() || 'pezzi';
        const prezzoUnitario = parseFloat(linea.PrezzoUnitario || '0');
        const aliquotaIVA = parseFloat(linea.AliquotaIVA || '22');

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
        errors.push(`Errore prodotto "${linea.Descrizione}": ${err.message}`);
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
