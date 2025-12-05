import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const body = await req.json();
        const { inspection_id, equipment_photos } = body;

        if (!inspection_id || !equipment_photos) {
            return Response.json({ 
                error: 'Missing inspection_id or equipment_photos'
            }, { status: 400 });
        }

        // FETCH PREVIOUS CORRECTIONS FOR LEARNING
        const allInspections = await base44.asServiceRole.entities.CleaningInspection.list('-inspection_date', 100);
        const correctionsHistory = allInspections.filter(i => i.has_corrections === true);

        const equipment = [
            { key: 'forno', label: 'Forno' },
            { key: 'impastatrice', label: 'Impastatrice' },
            { key: 'tavolo_lavoro', label: 'Tavolo Lavoro' },
            { key: 'frigo', label: 'Frigo' },
            { key: 'cassa', label: 'Cassa' },
            { key: 'lavandino', label: 'Lavandino' }
        ];

        // Analyze each photo with AI
        const analysisResults = {};
        
        for (const eq of equipment) {
            const url = equipment_photos[eq.key];
            if (!url) continue; // Skip if no photo URL
            
            {
                // BUILD LEARNING EXAMPLES FROM CORRECTIONS
                const relevantCorrections = correctionsHistory
                    .filter(i => i[`${eq.key}_corrected`] === true)
                    .slice(0, 5) // Use last 5 corrections
                    .map(i => ({
                        ai_said: i[`${eq.key}_pulizia_status`],
                        correct_answer: i[`${eq.key}_corrected_status`],
                        user_note: i[`${eq.key}_correction_note`],
                        ai_note: i[`${eq.key}_note_ai`]
                    }));

                // BUILD ENHANCED PROMPT WITH LEARNING
                let learningSection = '';
                if (relevantCorrections.length > 0) {
                    learningSection = `\n\n🎓 ESEMPI DI APPRENDIMENTO (da correzioni precedenti):
Questi sono esempi reali di come hai corretto l'AI in passato per ${eq.label}. Usa questi esempi per migliorare la tua valutazione.

${relevantCorrections.map((c, idx) => `
Esempio ${idx + 1}:
- L'AI aveva valutato: "${c.ai_said}"
- La valutazione CORRETTA era: "${c.correct_answer}"
- Nota AI originale: "${c.ai_note}"
- Feedback utente: "${c.user_note || 'Nessuna nota'}"
`).join('\n')}

⚠️ IMPORTANTE: Impara da questi esempi! Se vedi situazioni simili, applica gli stessi criteri di valutazione.`;
                }

                const prompt = `Analizza questa foto di ${eq.label} in una pizzeria e valuta lo stato di pulizia.
${learningSection}

Rispondi in formato JSON con questa struttura esatta:
{
  "pulizia_status": "pulito" | "medio" | "sporco" | "non_valutabile",
  "note": "Descrizione dettagliata dello stato di pulizia, specifica ESATTAMENTE dove si trova lo sporco (es. 'angolo in basso a sinistra', 'superficie superiore', 'maniglie', 'bordi laterali', ecc.)",
  "problemi_critici": ["lista", "di", "problemi"] oppure []
}

Criteri di valutazione:
- "pulito": Attrezzatura perfettamente pulita, senza residui visibili
- "medio": Presenza di piccoli residui o macchie, ma condizioni accettabili
- "sporco": Sporco evidente, incrostazioni, residui di cibo, necessita pulizia urgente
- "non_valutabile": Foto non chiara o non mostra l'attrezzatura

IMPORTANTE: Nelle note, specifica sempre la POSIZIONE ESATTA dello sporco (es. "Residui di farina nell'angolo in alto a destra", "Macchie di unto sulla superficie centrale", "Incrostazioni sul bordo inferiore").

Sii molto critico e attento ai dettagli di igiene in una cucina professionale. ${relevantCorrections.length > 0 ? 'APPLICA GLI INSEGNAMENTI dagli esempi sopra!' : ''}`;

                try {
                    const aiResponse = await base44.integrations.Core.InvokeLLM({
                        prompt,
                        file_urls: [url],
                        response_json_schema: {
                            type: "object",
                            properties: {
                                pulizia_status: { type: "string" },
                                note: { type: "string" },
                                problemi_critici: { type: "array", items: { type: "string" } }
                            }
                        }
                    });

                    analysisResults[eq.key] = aiResponse;
                } catch (aiError) {
                    console.error(`Error analyzing ${eq.key}:`, aiError);
                    analysisResults[eq.key] = {
                        pulizia_status: 'non_valutabile',
                        note: 'Errore durante l\'analisi: ' + aiError.message,
                        problemi_critici: []
                    };
                }
            // Removed unnecessary closing brace
        }

        // Calculate overall score (only from analyzed photos)
        const statusScores = { pulito: 100, medio: 50, sporco: 0, non_valutabile: 50 };
        const analyzedEquipment = equipment.filter(eq => analysisResults[eq.key]);
        const scores = analyzedEquipment.map(eq => statusScores[analysisResults[eq.key]?.pulizia_status] || 50);
        const overallScore = scores.length > 0 
            ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
            : 0;

        // Collect critical issues
        const allCriticalIssues = equipment
            .map(eq => analysisResults[eq.key]?.problemi_critici || [])
            .flat()
            .filter(Boolean);

        // Update inspection record
        const updateData = {
            analysis_status: 'completed',
            overall_score: overallScore,
            critical_issues: allCriticalIssues.length > 0 ? allCriticalIssues.join('; ') : null
        };

        // Add all equipment analysis results
        equipment.forEach(eq => {
            const result = analysisResults[eq.key];
            if (result) {
                updateData[`${eq.key}_pulizia_status`] = result.pulizia_status;
                updateData[`${eq.key}_note_ai`] = result.note;
            }
        });

        await base44.asServiceRole.entities.CleaningInspection.update(inspection_id, updateData);

        return Response.json({
            success: true,
            inspection_id,
            overall_score: overallScore,
            analysis_results: analysisResults,
            learned_from_corrections: correctionsHistory.length
        }, { status: 200 });

    } catch (error) {
        console.error('Error in analyzeCleaningInspection:', error);
        
        // Try to update inspection status to failed
        try {
            if (body?.inspection_id) {
                const base44 = createClientFromRequest(req);
                await base44.asServiceRole.entities.CleaningInspection.update(body.inspection_id, {
                    analysis_status: 'failed',
                    critical_issues: 'Errore durante l\'analisi: ' + error.message
                });
            }
        } catch (updateError) {
            console.error('Failed to update inspection status:', updateError);
        }

        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});