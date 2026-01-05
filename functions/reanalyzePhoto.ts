import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inspection_id, attrezzatura, photo_url, prompt_ai } = await req.json();

    if (!inspection_id || !attrezzatura || !photo_url) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    console.log(`Reanalyzing photo for ${attrezzatura} in inspection ${inspection_id}`);

    // Get inspection
    const inspections = await base44.asServiceRole.entities.CleaningInspection.filter({ id: inspection_id });
    const inspection = inspections[0];
    
    if (!inspection) {
      return Response.json({ error: 'Inspection not found' }, { status: 404 });
    }

    // Normalize attrezzatura name for field names - use EXACT mapping
    const attrezzaturaMap = {
      'Forno': 'forno',
      'Impastatrice': 'impastatrice',
      'Tavolo da lavoro': 'tavolo_lavoro',
      'Tavolo lavoro': 'tavolo_lavoro',
      'Frigo': 'frigo',
      'Cassa': 'cassa',
      'Lavandino': 'lavandino'
    };
    
    const normalizedAttrezzatura = attrezzaturaMap[attrezzatura] || attrezzatura.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[àáâãä]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u');
    
    console.log(`Attrezzatura: "${attrezzatura}" → normalized: "${normalizedAttrezzatura}"`);

    // Build AI prompt
    const prompt = `Analizza questa foto e valuta SOLO lo stato di pulizia di: ${attrezzatura}.

REGOLE CRITICHE:
1. Rispondi OBBLIGATORIAMENTE con UNA SOLA parola: "pulito" o "sporco"
2. "pulito" = accettabile, ordinato, senza sporco visibile
3. "sporco" = sporco evidente, disordinato, macchie, residui

${prompt_ai || ''}

Dopo la valutazione, aggiungi una riga con: "NOTE: [breve descrizione di cosa vedi]"

ESEMPIO RISPOSTA:
pulito
NOTE: Superficie pulita e ordinata`;

    console.log('Calling AI...');

    // Call AI
    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt,
      file_urls: [photo_url]
    });

    console.log('AI Response:', aiResponse);

    // Parse response
    const responseText = (aiResponse || '').toLowerCase().trim();
    let status = 'sporco'; // Default conservativo
    let note = aiResponse || '';

    const lines = responseText.split('\n');
    const firstLine = lines[0].trim();
    
    if (firstLine === 'pulito' || firstLine.includes('status: pulito')) {
      status = 'pulito';
    } else if (firstLine === 'sporco' || firstLine.includes('status: sporco')) {
      status = 'sporco';
    } else if (responseText.includes('pulito') && !responseText.includes('non pulito') && !responseText.includes('poco pulito') && !responseText.includes('sporco')) {
      status = 'pulito';
    }

    // Extract note - ALWAYS provide a note
    const noteMatch = aiResponse?.match(/NOTE:\s*(.+)/i);
    if (noteMatch) {
      note = noteMatch[1].trim();
    } else {
      // Fallback: use full response or create a default note
      if (aiResponse && aiResponse.length > 0) {
        // Remove the status word from the note
        note = aiResponse.replace(/^(pulito|sporco)\s*/i, '').trim();
        if (!note || note.length < 5) {
          note = status === 'pulito' ? 'Superficie pulita e ordinata' : 'Rilevata presenza di sporco';
        }
      } else {
        note = status === 'pulito' ? 'Superficie pulita e ordinata' : 'Rilevata presenza di sporco';
      }
    }

    console.log(`Parsed result: ${status}, note: ${note}`);

    // Update inspection with new analysis - reset corrected status if exists
    const updateData = {};
    updateData[`${normalizedAttrezzatura}_pulizia_status`] = status;
    updateData[`${normalizedAttrezzatura}_note_ai`] = note;
    updateData[`${normalizedAttrezzatura}_corrected`] = false;
    updateData[`${normalizedAttrezzatura}_corrected_status`] = null;

    console.log(`Updating inspection ${inspection_id} with data:`, updateData);

    const result = await base44.asServiceRole.entities.CleaningInspection.update(inspection_id, updateData);

    console.log(`✓ Successfully updated inspection, result:`, result);
    console.log(`✓ Successfully reanalyzed ${attrezzatura} - status: ${status}`);

    return Response.json({ 
      success: true, 
      status,
      note,
      attrezzatura: normalizedAttrezzatura
    });

  } catch (error) {
    console.error('Error in reanalyzePhoto:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});