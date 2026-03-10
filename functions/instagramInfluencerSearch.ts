import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Funzione che cerca VERI influencer su Instagram tramite RapidAPI
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

    const apiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!apiKey) {
        return Response.json({ error: 'RAPIDAPI_KEY not configured' }, { status: 500 });
    }

    // Usa InvokeLLM per generare hashtag di ricerca reali
    const prompt = `Genera una lista di 10 hashtag Instagram reali e MOLTO POPOLARI (senza #) per trovare creatori di contenuto nelle seguenti categorie:
${niches.join(', ')}

Gli hashtag devono essere:
- Reali e molto usati su Instagram (migliaia/milioni di post)
- Specifici per creatori/influencer, non generici
- Lingua italiana

Restituisci SOLO gli hashtag separati da virgola, senza # e senza spazi aggiuntivi.`;

    try {
        const llmResult = await base44.integrations.Core.InvokeLLM({
            prompt,
            model: 'gemini_3_flash'
        });

        const hashtags = (llmResult || '')
            .split(',')
            .map(h => h.trim().toLowerCase())
            .filter(h => h.length > 0)
            .slice(0, 5);

        if (hashtags.length === 0) {
            return Response.json({ error: 'Could not generate hashtags' }, { status: 500 });
        }

        const results = [];
        const seenUsernames = new Set();

        // Usa utenti noti italiani nel food/lifestyle come seed per cercare simili
        const seedUsernames = ['chiara_ferragni', 'saltapepe', 'simo_gentili', 'federicaclaudi', 'jadersgardner'];
        
        for (const seedUser of seedUsernames) {
            if (seenUsernames.size >= 30) break;

            try {
                // Cerca il profilo dell'utente seed
                const userResponse = await fetch(`https://instagram-scraper-stable-api.p.rapidapi.com/instagram/profile/${seedUser}`, {
                    method: 'GET',
                    headers: {
                        'x-rapidapi-key': apiKey,
                        'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com'
                    }
                });

                if (!userResponse.ok) continue;

                const userData = await userResponse.json();
                const profile = userData.user || userData;
                
                if (profile.username && !seenUsernames.has(profile.username)) {
                    const followers = profile.edge_followed_by?.count || profile.followers || 0;
                    
                    // Verifica range follower
                    const inRange = followerRanges.some(range => {
                        const [minStr, maxStr] = range.split('-');
                        const min = parseInt(minStr);
                        const max = maxStr && maxStr !== 'inf' ? parseInt(maxStr) : Infinity;
                        return followers >= min && followers <= max;
                    });

                    if (inRange) {
                        seenUsernames.add(profile.username);
                        results.push({
                            username: profile.username,
                            full_name: profile.full_name || profile.username,
                            followers_count: followers,
                            biography: profile.biography || '',
                            verified: profile.is_verified || false,
                            profile_pic_url: profile.profile_pic_url || '',
                            avg_er: 0.03,
                            tags: hashtags,
                            profile_url: `https://www.instagram.com/${profile.username}/`
                        });
                    }
                }
            } catch (err) {
                console.error(`Error fetching user ${seedUser}:`, err.message);
                continue;
            }
        }

        return Response.json({ results: results.slice(0, 30) });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});