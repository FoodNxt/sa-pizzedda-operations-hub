import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This is a scheduled task, verify it's admin
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('=== AUTO REANALYZE CLEANING PHOTOS - START ===');
    
    // Fetch all inspections with unrated photos
    const allInspections = await base44.asServiceRole.entities.CleaningInspection.list();
    
    console.log(`Total inspections: ${allInspections.length}`);
    
    let totalReanalyzed = 0;
    let totalErrors = 0;

    for (const inspection of allInspections) {
      const fotoDomande = inspection.domande_risposte?.filter(d => d.tipo_controllo === 'foto') || [];
      
      for (const domanda of fotoDomande) {
        const attrezzatura = domanda.attrezzatura?.toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[àáâãä]/g, 'a')
          .replace(/[èéêë]/g, 'e')
          .replace(/[ìíîï]/g, 'i')
          .replace(/[òóôõö]/g, 'o')
          .replace(/[ùúûü]/g, 'u') || '';
        
        const statusField = `${attrezzatura}_pulizia_status`;
        const correctedField = `${attrezzatura}_corrected_status`;
        const status = inspection[correctedField] || inspection[statusField];
        
        // Skip if already rated
        if (status && status !== 'non_valutabile') continue;
        
        // Skip if no photo
        if (!domanda.risposta) continue;
        
        console.log(`Reanalyzing: ${inspection.store_name} - ${domanda.attrezzatura}`);
        
        try {
          // Call reanalyze function
          await base44.asServiceRole.functions.invoke('reanalyzePhoto', {
            inspection_id: inspection.id,
            attrezzatura: domanda.attrezzatura,
            photo_url: domanda.risposta,
            prompt_ai: domanda.prompt_ai || ''
          });
          
          totalReanalyzed++;
          console.log(`✓ Reanalyzed: ${domanda.attrezzatura}`);
        } catch (error) {
          totalErrors++;
          console.error(`✗ Error reanalyzing ${domanda.attrezzatura}:`, error.message);
        }
      }
    }
    
    console.log('=== AUTO REANALYZE COMPLETE ===');
    console.log(`Total reanalyzed: ${totalReanalyzed}`);
    console.log(`Total errors: ${totalErrors}`);

    return Response.json({ 
      success: true, 
      totalReanalyzed,
      totalErrors,
      message: `Reanalyzed ${totalReanalyzed} photos with ${totalErrors} errors`
    });

  } catch (error) {
    console.error('Error in autoReanalyzeCleaningPhotos:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});