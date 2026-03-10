import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Funzione che usa InvokeLLM per generare query di ricerca realistiche per hashtag/niche
// e poi restituisce risultati simulati basati su criteri reali
Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { niches, followerRanges, city } = await req.json();
    
    if (!niches || !Array.isArray(niches) || niches.length === 0) {
        return Response.json({ error: 'niches array required' }, { status: 400 });
    }

    // Usa InvokeLLM per generare hashtag di ricerca per ogni niche
    const prompt = `Genera una lista di 30-40 hashtag Instagram reali e popolari (senza #) per trovare influencer nelle seguenti categorie:
${niches.join(', ')}

Gli hashtag devono essere:
- Reali e molto usati su Instagram
- Mirati a creatori di contenuto, non semplici utenti
- Includere mix di hashtag di nicchia specifici e hashtag più generali
- Lingua italiana preferibilmente

Restituisci SOLO gli hashtag separati da virgola, senza # e senza spazi aggiuntivi.`;

    try {
        const llmResult = await base44.integrations.Core.InvokeLLM({
            prompt,
            model: 'gemini_3_flash'
        });

        const hashtags = (llmResult || '')
            .split(',')
            .map(h => h.trim())
            .filter(h => h.length > 0)
            .slice(0, 20);

        if (hashtags.length === 0) {
            return Response.json({ error: 'Could not generate hashtags' }, { status: 500 });
        }

        // Genera risultati sintetici basati su criteri reali
        // (In produzione, qui chiameresti l'API di Instagram per cercare per hashtag)
        const results = [];
        
        for (let i = 0; i < 30; i++) {
            const randomHashtag = hashtags[Math.floor(Math.random() * hashtags.length)];
            const randomFollowers = [
                Math.floor(Math.random() * 9000) + 1000,      // nano
                Math.floor(Math.random() * 90000) + 10000,    // micro
                Math.floor(Math.random() * 400000) + 100000,  // mid-tier
                Math.floor(Math.random() * 500000) + 500000   // macro
            ];
            const followers = randomFollowers[Math.floor(Math.random() * randomFollowers.length)];

            // Verifica che sia nel range richiesto
            const inRange = followerRanges.some(range => {
                const [minStr, maxStr] = range.split('-');
                const min = parseInt(minStr);
                const max = maxStr ? parseInt(maxStr) : Infinity;
                return followers >= min && followers <= max;
            });

            if (!inRange) continue;

            results.push({
                username: `influencer_${randomHashtag}_${i}`,
                full_name: `Creator ${i}`,
                followers_count: followers,
                biography: `📍 ${city || 'Italia'} | ${niches[0]}`,
                verified: followers > 50000 && Math.random() > 0.7,
                profile_pic_url: '',
                avg_er: (Math.random() * 5 + 1) / 100,
                tags: [randomHashtag, ...niches.slice(0, 2)],
                profile_url: `https://www.instagram.com/influencer_${randomHashtag}_${i}/`
            });
        }

        return Response.json({ results: results.slice(0, 30) });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});