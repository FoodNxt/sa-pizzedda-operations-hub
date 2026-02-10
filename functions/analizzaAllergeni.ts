import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ricetta_id } = await req.json();

    // Recupera la ricetta
    const ricette = await base44.asServiceRole.entities.Ricetta.filter({ id: ricetta_id });
    if (ricette.length === 0) {
      return Response.json({ error: 'Ricetta non trovata' }, { status: 404 });
    }

    const ricetta = ricette[0];

    // Costruisci lista ingredienti per l'analisi
    const ingredientiDescrizione = ricetta.ingredienti?.map(ing => 
      `${ing.nome_prodotto} (${ing.quantita} ${ing.unita_misura})`
    ).join(', ') || '';

    // Se ci sono semilavorati, recupera anche le loro ricette
    const semilavorati = ricetta.ingredienti?.filter(ing => ing.is_semilavorato) || [];
    let ingredientiSemilavorati = '';
    
    if (semilavorati.length > 0) {
      for (const semi of semilavorati) {
        const semiRicette = await base44.asServiceRole.entities.Ricetta.filter({ 
          nome_prodotto: semi.nome_prodotto 
        });
        if (semiRicette.length > 0) {
          const semiIngr = semiRicette[0].ingredienti?.map(ing => 
            `${ing.nome_prodotto}`
          ).join(', ') || '';
          ingredientiSemilavorati += `\n- ${semi.nome_prodotto} contiene: ${semiIngr}`;
        }
      }
    }

    // Usa AI per identificare allergeni
    const prompt = `Analizza questa ricetta e identifica TUTTI gli allergeni presenti secondo la normativa europea (Regolamento UE 1169/2011).

Prodotto: ${ricetta.nome_prodotto}
Categoria: ${ricetta.categoria}

Ingredienti diretti:
${ingredientiDescrizione}
${ingredientiSemilavorati ? '\nIngredienti nei semilavorati:' + ingredientiSemilavorati : ''}

Allergeni da considerare:
1. Glutine (cereali contenenti glutine)
2. Crostacei
3. Uova
4. Pesce
5. Arachidi
6. Soia
7. Latte (lattosio)
8. Frutta a guscio
9. Sedano
10. Senape
11. Semi di sesamo
12. Anidride solforosa e solfiti
13. Lupini
14. Molluschi

Rispondi SOLO con l'array JSON degli allergeni presenti. Non aggiungere spiegazioni.
Esempi:
- Se c'è farina/pasta: ["Glutine"]
- Se c'è mozzarella/formaggio: ["Latte"]
- Se c'è salame/prosciutto: ["Latte"] (spesso contiene lattosio)
- Pizza Margherita: ["Glutine", "Latte"]

Sii COMPLETO e ACCURATO. Identifica TUTTI gli allergeni anche quelli nascosti.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          allergeni: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["allergeni"]
      }
    });

    const allergeni = result.allergeni || [];

    // Aggiorna la ricetta con gli allergeni identificati
    await base44.asServiceRole.entities.Ricetta.update(ricetta_id, {
      allergeni: allergeni
    });

    return Response.json({
      success: true,
      ricetta_id: ricetta_id,
      allergeni: allergeni
    });

  } catch (error) {
    console.error('Error analyzing allergeni:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});