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

        console.log('=== PHOTO ANALYSIS DEBUG ===');
        console.log(`Total domande_risposte received: ${domande_risposte.length}`);
        console.log(`Found ${fotoQuestions.length} photo questions to analyze`);
        fotoQuestions.forEach((q, idx) => {
            console.log(`Photo ${idx + 1}: ${q.domanda_testo || q.attrezzatura || 'Unknown'} - URL: ${q.risposta?.substring(0, 50)}...`);
        });

        // Analyze each photo with AI
        const analysisResults = {};
        const updateData = {
            analysis_status: 'completed'
        };
        
        for (const question of fotoQuestions) {
            const url = question.risposta;
            const attrezzatura = question.attrezzatura;
            const prompt_ai = question.prompt_ai;
            const tipoControlloAI = question.tipo_controllo_ai;
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

            // Get custom prompt if available
            const customPrompts = await base44.asServiceRole.entities.PromptAIPulizia.list();
            
            // Determine category from tipo_controllo_ai of the question or from prompt_ai content
            let categoria = 'Pulizia'; // default
            if (tipoControlloAI === 'divisa') {
                categoria = 'Divisa corretta';
            } else if (tipoControlloAI === 'frigo_bibite') {
                categoria = 'Frigo bibite';
            } else if (tipoControlloAI === 'etichette') {
                categoria = 'Presenza etichette';
            } else if (prompt_ai && prompt_ai.includes('divisa')) {
                categoria = 'Divisa corretta';
            } else if (prompt_ai && prompt_ai.includes('frigo bibite')) {
                categoria = 'Frigo bibite';
            } else if (prompt_ai && prompt_ai.includes('etichette')) {
                categoria = 'Presenza etichette';
            }
            
            // Find custom prompt for this category
            const customPrompt = customPrompts.find(p => p.categoria === categoria && p.attivo !== false);
            
            // Always analyze with a prompt - use custom, provided, or default
            let finalPrompt;
            
            if (customPrompt?.prompt) {
                // Use custom configured prompt with learning section
                finalPrompt = learningSection ? `${customPrompt.prompt}\n${learningSection}` : customPrompt.prompt;
            } else if (prompt_ai) {
                // Use prompt from question with learning section if available
                finalPrompt = learningSection ? `${prompt_ai}\n${learningSection}` : prompt_ai;
            } else {
                // Use comprehensive default prompt with STRICT rules
                finalPrompt = `Analizza questa foto di ${attrezzatura || 'attrezzatura'} in una pizzeria e valuta lo stato di pulizia.
${learningSection}

⚠️ REGOLE CRITICHE - DEVI SEMPRE DARE UN VOTO:
1. USA "non_valutabile" SOLO in casi ESTREMI: foto completamente nera, totalmente sfocata, attrezzatura completamente invisibile
2. Se vedi QUALSIASI parte dell'attrezzatura, DEVI dare un voto (pulito/medio/sporco)
3. Anche se la foto è parziale o leggermente sfocata, valuta ciò che vedi
4. Se la foto mostra solo una parte dell'attrezzatura, valuta quella parte

Se usi "non_valutabile", SPIEGA DETTAGLIATAMENTE:
- Cosa vedi esattamente nella foto?
- Perché è impossibile valutare?
- Cosa manca per poter dare un voto?

Rispondi in formato JSON:
{
  "pulizia_status": "pulito" | "medio" | "sporco" | "non_valutabile",
  "note": "Se VALUTABILE: descrizione dettagliata e POSIZIONE ESATTA dello sporco. Se NON VALUTABILE: spiega ESATTAMENTE perché è impossibile valutare (es: 'Foto completamente nera senza dettagli visibili', 'Attrezzatura completamente fuori dall'inquadratura, si vede solo il pavimento', 'Foto totalmente sfocata, impossibile distinguere qualsiasi dettaglio')",
  "problemi_critici": []
}

Criteri:
- "pulito": Perfettamente pulito, nessun residuo
- "medio": Piccoli residui o macchie, accettabile
- "sporco": Sporco evidente, richiede pulizia urgente
- "non_valutabile": SOLO se davvero impossibile vedere l'attrezzatura

Sii critico con l'igiene professionale. ${relevantCorrections.length > 0 ? 'APPLICA gli insegnamenti dagli esempi!' : ''}`;
            }
            
            console.log(`Processing photo for ${attrezzatura || equipmentKey} (URL: ${url})`);
            console.log(`Detected Category: ${categoria}, Custom Prompt Used: ${!!customPrompt?.prompt}`);

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

                // FORCE a valid status - never leave undefined
                const validStatuses = ['pulito', 'medio', 'sporco', 'non_valutabile'];
                const finalStatus = validStatuses.includes(aiResponse.pulizia_status) 
                    ? aiResponse.pulizia_status 
                    : 'medio';

                analysisResults[equipmentKey] = {
                    ...aiResponse,
                    pulizia_status: finalStatus
                };
                updateData[`${equipmentKey}_pulizia_status`] = finalStatus;
                updateData[`${equipmentKey}_note_ai`] = aiResponse.note || 'Analizzato dall\'AI';
                console.log(`✓ AI analysis successful for ${equipmentKey}:`, finalStatus);
            } catch (aiError) {
                console.error(`❌ ERROR analyzing ${equipmentKey}:`, aiError);
                console.error('Error details:', {
                    message: aiError.message,
                    stack: aiError.stack,
                    url: url,
                    attrezzatura: attrezzatura
                });
                
                // ALWAYS provide a status even on error - default to 'medio' requiring manual review
                analysisResults[equipmentKey] = {
                    pulizia_status: 'medio',
                    note: 'Analisi AI fallita - richiede valutazione manuale. Errore: ' + aiError.message,
                    problemi_critici: ['Errore AI - necessaria revisione manuale']
                };
                updateData[`${equipmentKey}_pulizia_status`] = 'medio';
                updateData[`${equipmentKey}_note_ai`] = 'AI fallita - richiede revisione. Errore: ' + aiError.message;
                console.log(`⚠️ Set default 'medio' status for ${equipmentKey} due to AI error`);
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

        console.log('=== FINAL UPDATE DATA ===');
        console.log(`Analysis results count: ${Object.keys(analysisResults).length}`);
        console.log(`Overall score: ${overallScore}`);
        console.log('Update data keys:', Object.keys(updateData));

        await base44.asServiceRole.entities.CleaningInspection.update(inspection_id, updateData);

        console.log('✅ Inspection updated successfully');

        return Response.json({
            success: true,
            inspection_id,
            overall_score: overallScore,
            photos_analyzed: Object.keys(analysisResults).length,
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