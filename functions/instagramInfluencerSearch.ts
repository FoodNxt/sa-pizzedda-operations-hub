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

        // Per ogni hashtag, cerca i post e estrai gli utenti
        for (const hashtag of hashtags) {
            try {
                const response = await fetch(`https://instagram-scraper-stable-api.p.rapidapi.com/hashtag/${hashtag}/posts`, {
                    method: 'GET',
                    headers: {
                        'x-rapidapi-key': apiKey,
                        'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com'
                    }
                });

                if (!response.ok) continue;

                const data = await response.json();
                const posts = data.data || [];

                // Estrai profili dai post
                for (const post of posts.slice(0, 10)) {
                    if (seenUsernames.size >= 30) break;

                    const owner = post.owner || {};
                    const username = owner.username;
                    
                    if (!username || seenUsernames.has(username)) continue;

                    const followers = owner.edge_followed_by?.count || owner.followers || 0;
                    
                    // Verifica range follower
                    const inRange = followerRanges.some(range => {
                        const [minStr, maxStr] = range.split('-');
                        const min = parseInt(minStr);
                        const max = maxStr && maxStr !== 'inf' ? parseInt(maxStr) : Infinity;
                        return followers >= min && followers <= max;
                    });

                    if (!inRange) continue;

                    seenUsernames.add(username);

                    results.push({
                        username,
                        full_name: owner.full_name || username,
                        followers_count: followers,
                        biography: owner.biography || '',
                        verified: owner.is_verified || false,
                        profile_pic_url: owner.profile_pic_url || '',
                        avg_er: (owner.engagement_rate || 0) / 100,
                        tags: [hashtag, ...niches.slice(0, 1)],
                        profile_url: `https://www.instagram.com/${username}/`
                    });
                }
            } catch (err) {
                console.error(`Error fetching hashtag ${hashtag}:`, err.message);
                continue;
            }
        }

        return Response.json({ results: results.slice(0, 30) });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});