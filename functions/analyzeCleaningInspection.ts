import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inspection_id, domande_risposte } = await req.json();

    if (!inspection_id || !domande_risposte) {
      return Response.json({ error: 'Missing inspection_id or domande_risposte' }, { status: 400 });
    }

    console.log(`\n=== RECEIVED REQUEST ===`);
    console.log(`Inspection ID: ${inspection_id}`);
    console.log(`Total domande_risposte: ${domande_risposte.length}`);
    console.log(`All questions:`, domande_risposte.map(d => ({
      attrezzatura: d.attrezzatura,
      tipo: d.tipo_controllo,
      hasPhoto: !!d.risposta
    })));

    // Get inspection
    const inspections = await base44.asServiceRole.entities.CleaningInspection.filter({ id: inspection_id });
    const inspection = inspections[0];
    
    if (!inspection) {
      return Response.json({ error: 'Inspection not found' }, { status: 404 });
    }

    // Analyze ALL photo questions - more flexible filtering
    const fotoDomande = domande_risposte.filter(d => {
      // Check if it's a photo question with actual photo data
      const hasFoto = d.tipo_controllo === 'foto' && d.risposta && d.risposta.trim() !== '';
      if (!hasFoto) {
        console.log(`Skipping ${d.attrezzatura || d.domanda_testo}: tipo=${d.tipo_controllo}, hasRisposta=${!!d.risposta}`);
      }
      return hasFoto;
    });
    
    console.log(`=== STARTING ANALYSIS ===`);
    console.log(`Found ${fotoDomande.length} photo questions to analyze`);
    console.log(`Photo questions:`, fotoDomande.map(d => d.attrezzatura));
    
    const analysisResults = {};
    const updatedDomandeRisposte = [...domande_risposte];

    // Process photos in parallel batches for speed
    const batchSize = 3;
    for (let batchStart = 0; batchStart < fotoDomande.length; batchStart += batchSize) {
      const batch = fotoDomande.slice(batchStart, batchStart + batchSize);
      console.log(`\n=== Processing batch ${Math.floor(batchStart/batchSize) + 1} (${batch.length} photos) ===`);
      
      await Promise.all(batch.map(async (domanda, batchIdx) => {
        const i = batchStart + batchIdx;
        console.log(`\n--- Analyzing photo ${i + 1}/${fotoDomande.length}: ${domanda.attrezzatura} ---`);
        
        try {
          const attrezzatura = domanda.attrezzatura?.toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[àáâãä]/g, 'a')
            .replace(/[èéêë]/g, 'e')
            .replace(/[ìíîï]/g, 'i')
            .replace(/[òóôõö]/g, 'o')
            .replace(/[ùúûü]/g, 'u');
          
          console.log(`Field name: ${attrezzatura}`);
          console.log(`Photo URL: ${domanda.risposta}`);
          
          // Build AI prompt - VERY STRICT
          let prompt = `Analizza questa foto e valuta SOLO lo stato di pulizia di: ${domanda.attrezzatura}.

REGOLE CRITICHE:
1. Rispondi OBBLIGATORIAMENTE con UNA SOLA parola: "pulito" o "sporco"
2. "pulito" = accettabile, ordinato, senza sporco visibile
3. "sporco" = sporco evidente, disordinato, macchie, residui

${domanda.prompt_ai || ''}

Dopo la valutazione, aggiungi una riga con: "NOTE: [breve descrizione di cosa vedi]"

ESEMPIO RISPOSTA:
pulito
NOTE: Superficie pulita e ordinata`;

          console.log(`Calling AI for ${domanda.attrezzatura}...`);

          // Call AI with explicit instructions
          const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: prompt,
            file_urls: [domanda.risposta]
          });

          console.log(`✓ AI Response received for ${domanda.attrezzatura}:`, aiResponse);

        // Parse response - more robust
        const responseText = (aiResponse || '').toLowerCase().trim();
        let status = 'sporco'; // Default conservativo
        let note = aiResponse || '';

        // Check first line for status
        const lines = responseText.split('\n');
        const firstLine = lines[0].trim();
        
        if (firstLine === 'pulito' || firstLine.includes('status: pulito')) {
          status = 'pulito';
        } else if (firstLine === 'sporco' || firstLine.includes('status: sporco')) {
          status = 'sporco';
        } else if (responseText.includes('pulito') && !responseText.includes('non pulito') && !responseText.includes('poco pulito') && !responseText.includes('sporco')) {
          status = 'pulito';
        }

        // Extract note
        const noteMatch = aiResponse?.match(/NOTE:\s*(.+)/i);
        if (noteMatch) {
          note = noteMatch[1].trim();
        } else {
          note = aiResponse?.substring(0, 200) || 'Analisi completata';
        }

        console.log(`✓ Parsed result for ${domanda.attrezzatura}: ${status}`);

        // Store in dynamic fields
        analysisResults[`${attrezzatura}_pulizia_status`] = status;
        analysisResults[`${attrezzatura}_note_ai`] = note;
        analysisResults[`${attrezzatura}_foto_url`] = domanda.risposta;

        // Update in domande_risposte array too for easier access
        const domandaIndex = updatedDomandeRisposte.findIndex(d => d.domanda_id === domanda.domanda_id);
        if (domandaIndex !== -1) {
          updatedDomandeRisposte[domandaIndex] = {
            ...updatedDomandeRisposte[domandaIndex],
            ai_status: status,
            ai_note: note
          };
        }

          console.log(`✓ Successfully processed ${domanda.attrezzatura}`);

        } catch (error) {
          console.error(`✗ ERROR analyzing ${domanda.attrezzatura}:`, error.message);
          console.error(`Stack trace:`, error.stack);
          const attrezzatura = domanda.attrezzatura?.toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[àáâãä]/g, 'a')
            .replace(/[èéêë]/g, 'e')
            .replace(/[ìíîï]/g, 'i')
            .replace(/[òóôõö]/g, 'o')
            .replace(/[ùúûü]/g, 'u');
          analysisResults[`${attrezzatura}_pulizia_status`] = 'sporco';
          analysisResults[`${attrezzatura}_note_ai`] = `Errore analisi: ${error.message}`;
        }
      }));
    }

    console.log(`\n=== ANALYSIS COMPLETE ===`);
    console.log(`Total photos processed: ${fotoDomande.length}`);
    console.log(`Results:`, Object.keys(analysisResults).filter(k => k.endsWith('_pulizia_status')));

    console.log('Analysis results:', analysisResults);

    // Update inspection with ALL results
    await base44.asServiceRole.entities.CleaningInspection.update(inspection_id, {
      ...analysisResults,
      domande_risposte: updatedDomandeRisposte,
      analysis_status: 'completed'
    });

    console.log(`Successfully analyzed ${fotoDomande.length} photos for inspection ${inspection_id}`);

    return Response.json({ 
      success: true, 
      message: `Analysis completed for ${fotoDomande.length} photos`,
      analyzed_count: fotoDomande.length,
      results: analysisResults
    });

  } catch (error) {
    console.error('Error in analyzeCleaningInspection:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});