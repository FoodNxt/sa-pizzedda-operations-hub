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

    // Get inspection
    const inspections = await base44.asServiceRole.entities.CleaningInspection.filter({ id: inspection_id });
    const inspection = inspections[0];
    
    if (!inspection) {
      return Response.json({ error: 'Inspection not found' }, { status: 404 });
    }

    // Analyze only photo questions
    const fotoDomande = domande_risposte.filter(d => d.tipo_controllo === 'foto' && d.risposta);
    
    const analysisResults = {};

    for (const domanda of fotoDomande) {
      try {
        const attrezzatura = domanda.attrezzatura?.toLowerCase().replace(/\s+/g, '_');
        
        // Build AI prompt
        let prompt = `Analizza questa foto di ${domanda.attrezzatura} e valuta lo stato di pulizia.
        
IMPORTANTE: Devi rispondere SOLO con una di queste due parole: "pulito" o "sporco".

${domanda.prompt_ai || 'Valuta attentamente lo stato generale di pulizia, presenza di sporco, macchie, residui di cibo, o disordine.'}

Rispondi con:
- "pulito" se l'attrezzatura è in condizioni accettabili
- "sporco" se presenta sporco evidente, macchie, o necessita pulizia

Fornisci anche una breve descrizione (massimo 2 frasi) di cosa hai osservato.

Formato risposta:
STATUS: [pulito o sporco]
NOTE: [descrizione breve]`;

        // Call AI
        const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: prompt,
          file_urls: [domanda.risposta]
        });

        // Parse response
        const responseText = aiResponse?.toLowerCase() || '';
        let status = 'sporco'; // Default to sporco if uncertain
        let note = aiResponse || '';

        if (responseText.includes('pulito') && !responseText.includes('non pulito') && !responseText.includes('poco pulito')) {
          status = 'pulito';
        }

        // Extract note if present
        const noteMatch = aiResponse?.match(/NOTE:\s*(.+)/i);
        if (noteMatch) {
          note = noteMatch[1].trim();
        }

        // Store results with dynamic field names
        analysisResults[`${attrezzatura}_pulizia_status`] = status;
        analysisResults[`${attrezzatura}_note_ai`] = note;

      } catch (error) {
        console.error(`Error analyzing ${domanda.attrezzatura}:`, error);
        // Set default values on error
        const attrezzatura = domanda.attrezzatura?.toLowerCase().replace(/\s+/g, '_');
        analysisResults[`${attrezzatura}_pulizia_status`] = 'sporco';
        analysisResults[`${attrezzatura}_note_ai`] = 'Errore durante l\'analisi AI';
      }
    }

    // Update inspection with results
    await base44.asServiceRole.entities.CleaningInspection.update(inspection_id, {
      ...analysisResults,
      analysis_status: 'completed'
    });

    return Response.json({ 
      success: true, 
      message: 'Analysis completed',
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