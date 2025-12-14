import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const body = await req.json();
        const { inspection_id, domande_risposte } = body;

        if (!inspection_id || !domande_risposte) {
            return Response.json({ 
                error: 'Missing inspection_id or domande_risposte'
            }, { status: 400 });
        }

        // FETCH PREVIOUS CORRECTIONS FOR LEARNING
        const allInspections = await base44.asServiceRole.entities.CleaningInspection.list('-inspection_date', 100);
        const correctionsHistory = allInspections.filter(i => i.has_corrections === true);

        // Get ALL questions that have a photo URL, regardless of tipo_controllo
        const fotoQuestions = domande_risposte.filter(r => 
            r.risposta && 
            typeof r.risposta === 'string' && 
            r.risposta.startsWith('http')
        );

        console.log(`Found ${fotoQuestions.length} photo questions to analyze`);

        // Analyze each photo with AI
        const analysisResults = {};
        const updateData = {
            analysis_status: 'completed'
        };
        
        for (const question of fotoQuestions) {
            const url = question.risposta;
            const attrezzatura = question.attrezzatura;
            const prompt_ai = question.prompt_ai;
            const domandaId = question.domanda_id;
            
            // Skip only if no URL (photo) is provided
            if (!url) {
                console.log('Skipping question - no photo URL:', question);
                continue;
            }
            
            // Generate equipment key for storing results
            // ALWAYS generate a key - use attrezzatura, domanda_id, or domanda_testo
            let equipmentKey;
            if (attrezzatura && attrezzatura.trim()) {
                equipmentKey = attrezzatura.toLowerCase().replace(/\s+/g, '_');
            } else if (domandaId && domandaId.trim()) {
                equipmentKey = `domanda_${domandaId.replace(/[^a-z0-9]/gi, '_')}`;
            } else if (question.domanda_testo && question.domanda_testo.trim()) {
                equipmentKey = question.domanda_testo.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50);
            } else {
                // Last resort: use question index
                equipmentKey = `foto_${fotoQuestions.indexOf(question)}`;
            }
            
            console.log(`Processing question with key: ${equipmentKey}, attrezzatura: ${attrezzatura || 'N/A'}`);
            
            // BUILD LEARNING EXAMPLES FROM CORRECTIONS
            const relevantCorrections = correctionsHistory
                .filter(i => i[`${equipmentKey}_corrected`] === true)
                .slice(0, 5)
                .map(i => ({
                    ai_said: i[`${equipmentKey}_pulizia_status`],
                    correct_answer: i[`${equipmentKey}_corrected_status`],
                    user_note: i[`${equipmentKey}_correction_note`],
                    ai_note: i[`${equipmentKey}_note_ai`]
                }));

            // BUILD ENHANCED PROMPT WITH LEARNING
            let learningSection = '';
            if (relevantCorrections.length > 0) {
                learningSection = `\n\n🎓 ESEMPI DI APPRENDIMENTO (da correzioni precedenti):
Questi sono esempi reali di come hai corretto l'AI in passato per ${attrezzatura}. Usa questi esempi per migliorare la tua valutazione.

${relevantCorrections.map((c, idx) => `
Esempio ${idx + 1}:
- L'AI aveva valutato: "${c.ai_said}"
- La valutazione CORRETTA era: "${c.correct_answer}"
- Nota AI originale: "${c.ai_note}"
- Feedback utente: "${c.user_note || 'Nessuna nota'}"
`).join('\n')}

⚠️ IMPORTANTE: Impara da questi esempi! Se vedi situazioni simili, applica gli stessi criteri di valutazione.`;
            }

            // Always analyze with a prompt - use custom or default
            let finalPrompt;
            
            if (prompt_ai) {
                // Use custom prompt with learning section if available
                finalPrompt = learningSection ? `${prompt_ai}\n${learningSection}` : prompt_ai;
            } else {
                // Use comprehensive default prompt
                finalPrompt = `Analizza questa foto di ${attrezzatura || 'attrezzatura'} in una pizzeria e valuta lo stato di pulizia.
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
            }

            try {
                const aiResponse = await base44.integrations.Core.InvokeLLM({
                    prompt: finalPrompt,
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

                analysisResults[equipmentKey] = aiResponse;
                updateData[`${equipmentKey}_pulizia_status`] = aiResponse.pulizia_status;
                updateData[`${equipmentKey}_note_ai`] = aiResponse.note;
            } catch (aiError) {
                console.error(`Error analyzing ${equipmentKey}:`, aiError);
                analysisResults[equipmentKey] = {
                    pulizia_status: 'non_valutabile',
                    note: 'Errore durante l\'analisi: ' + aiError.message,
                    problemi_critici: []
                };
                updateData[`${equipmentKey}_pulizia_status`] = 'non_valutabile';
                updateData[`${equipmentKey}_note_ai`] = 'Errore: ' + aiError.message;
            }
        }

        // Calculate overall score from ALL questions (photos + multiple choice)
        const statusScores = { pulito: 100, medio: 50, sporco: 0, non_valutabile: 50 };
        const allScores = [];
        
        // Add scores from analyzed photos
        Object.keys(analysisResults).forEach(key => {
            const status = analysisResults[key]?.pulizia_status;
            allScores.push(statusScores[status] || 50);
        });
        
        // Add scores from multiple choice questions
        domande_risposte.forEach(q => {
            if (q.tipo_controllo === 'scelta_multipla' && q.risposta) {
                const risposta = q.risposta.toLowerCase();
                if (risposta.includes('pulito') || risposta.includes('tutti_con_etichette') || risposta.includes('piu_di_40')) {
                    allScores.push(100);
                } else if (risposta.includes('da_migliorare') || risposta.includes('alcuni_senza_etichette')) {
                    allScores.push(50);
                } else if (risposta.includes('sporco') || risposta.includes('nessuno_con_etichette') || risposta.includes('meno_di_40') || risposta.includes('nessun_cartone')) {
                    allScores.push(0);
                }
            }
        });
        
        const overallScore = allScores.length > 0 
            ? Math.round(allScores.reduce((sum, s) => sum + s, 0) / allScores.length)
            : 0;
        
        console.log(`Calculated overall score: ${overallScore} from ${allScores.length} questions`);

        // Collect critical issues
        const allCriticalIssues = Object.keys(analysisResults)
            .map(key => analysisResults[key]?.problemi_critici || [])
            .flat()
            .filter(Boolean);

        updateData.overall_score = overallScore;
        updateData.critical_issues = allCriticalIssues.length > 0 ? allCriticalIssues.join('; ') : null;

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