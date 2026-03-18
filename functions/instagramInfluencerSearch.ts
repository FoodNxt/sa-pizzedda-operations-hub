import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { platforms, niches, followerRanges, city } = await req.json();
    
    if (!niches || !Array.isArray(niches) || niches.length === 0) {
        return Response.json({ error: 'niches array required' }, { status: 400 });
    }

    const selectedPlatforms = platforms || ['instagram'];
    const cityFilter = city || 'Italia';
    
    // Build follower range description
    let followerDesc = 'qualsiasi numero di follower';
    if (followerRanges && followerRanges.length > 0) {
        const rangeDescriptions = followerRanges.map(r => {
            const [min, max] = r.split('-');
            if (max === 'inf' || !max) return `più di ${parseInt(min).toLocaleString()}`;
            return `tra ${parseInt(min).toLocaleString()} e ${parseInt(max).toLocaleString()}`;
        });
        followerDesc = rangeDescriptions.join(' oppure ');
    }

    const nicheLabels = {
        food: 'Food, cucina, ristoranti, ricette',
        lifestyle: 'Lifestyle, vita quotidiana',
        travel: 'Viaggi, turismo',
        family: 'Famiglia, genitori, bambini',
        fitness: 'Fitness, sport, wellness',
        fashion: 'Moda, fashion, abbigliamento',
        pizza: 'Pizza, street food, cibo di strada',
        local: 'Local guide, city life, eventi locali'
    };

    const nicheStr = niches.map(n => nicheLabels[n] || n).join(', ');
    const platformStr = selectedPlatforms.join(' e ');

    // Step 1: Use LLM with web search to discover real influencer usernames
    const prompt = `Trova esattamente 30 profili REALI e ATTIVI di influencer/creator su ${platformStr} che corrispondono a questi criteri:

- Nicchie/categorie: ${nicheStr}
- Zona geografica: ${cityFilter}
- Range follower: ${followerDesc}
- Lingua: italiano o basati in Italia
- Devono essere account reali, attivi e verificabili

Per OGNI profilo trovato, fornisci:
- "username": lo username esatto (senza @)
- "full_name": il nome completo o nome visualizzato
- "platform": "${selectedPlatforms.length === 1 ? selectedPlatforms[0] : 'instagram o tiktok a seconda della piattaforma'}"
- "followers_estimate": stima numerica dei follower (es: 50000)
- "biography": breve descrizione del profilo (1-2 frasi)
- "niche": la nicchia principale
- "city": la città se nota, altrimenti "Italia"
- "verified": true/false se è un account verificato

IMPORTANTE: restituisci SOLO username che esistono davvero. Non inventare nomi. Cerca informazioni aggiornate dal web.`;

    try {
        const llmResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            add_context_from_internet: true,
            model: 'gemini_3_flash',
            response_json_schema: {
                type: 'object',
                properties: {
                    influencers: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                username: { type: 'string' },
                                full_name: { type: 'string' },
                                platform: { type: 'string' },
                                followers_estimate: { type: 'number' },
                                biography: { type: 'string' },
                                niche: { type: 'string' },
                                city: { type: 'string' },
                                verified: { type: 'boolean' }
                            }
                        }
                    }
                }
            }
        });

        let influencers = llmResponse?.influencers || [];
        console.log(`LLM returned ${influencers.length} influencers`);

        if (influencers.length === 0) {
            return Response.json({ results: [], source: 'llm', message: 'Nessun influencer trovato' });
        }

        // Step 2: For Instagram profiles, try to verify/enrich with RapidAPI
        const apiKey = Deno.env.get('RAPIDAPI_KEY');
        const igProfiles = influencers.filter(i => (i.platform || 'instagram') === 'instagram');
        const tiktokProfiles = influencers.filter(i => i.platform === 'tiktok');

        // Verify top 5 Instagram profiles in parallel with timeout
        const verifiedResults = [];

        const mapProfileToResult = (profile, platform, source, extra = {}) => ({
            username: profile.username,
            full_name: extra.full_name || profile.full_name || profile.username,
            platform,
            followers_count: extra.followers_count || profile.followers_estimate || 0,
            biography: extra.biography || profile.biography || '',
            verified: extra.verified || profile.verified || false,
            profile_pic_url: extra.profile_pic_url || '',
            engagement_rate: extra.engagement_rate || null,
            niche: profile.niche || niches[0],
            city: profile.city || cityFilter,
            profile_url: platform === 'tiktok' 
                ? `https://www.tiktok.com/@${profile.username}` 
                : `https://www.instagram.com/${profile.username}/`,
            source
        });

        if (apiKey && igProfiles.length > 0) {
            // Verify top 5 profiles concurrently with 8s timeout each
            const profilesToVerify = igProfiles.slice(0, 5);
            const verifyPromises = profilesToVerify.map(async (profile) => {
                try {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 8000);
                    const url = `https://instagram-statistics-api.p.rapidapi.com/community?url=https://www.instagram.com/${encodeURIComponent(profile.username)}/`;
                    const res = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'x-rapidapi-key': apiKey,
                            'x-rapidapi-host': 'instagram-statistics-api.p.rapidapi.com'
                        },
                        signal: controller.signal
                    });
                    clearTimeout(timeout);
                    
                    if (res.ok) {
                        const data = await res.json();
                        const p = data?.data || data;
                        const followers = p?.usersCount ?? p?.followers ?? p?.follower_count;
                        if (followers !== undefined && followers > 0) {
                            return mapProfileToResult(profile, 'instagram', 'verified', {
                                full_name: p.name || p.full_name || profile.full_name,
                                followers_count: followers,
                                biography: p.description || p.biography || profile.biography,
                                verified: p.verified || p.is_verified || profile.verified,
                                profile_pic_url: p.image || p.profile_pic_url || '',
                                engagement_rate: p.avgER ? parseFloat((p.avgER * 100).toFixed(2)) : null
                            });
                        }
                    }
                } catch (e) {
                    console.log(`Verification skipped for ${profile.username}: ${e.message}`);
                }
                return mapProfileToResult(profile, 'instagram', 'llm');
            });

            const verified = await Promise.all(verifyPromises);
            verifiedResults.push(...verified);

            // Add remaining IG profiles unverified
            for (const profile of igProfiles.slice(5)) {
                verifiedResults.push(mapProfileToResult(profile, 'instagram', 'llm'));
            }
        } else {
            for (const profile of igProfiles) {
                verifiedResults.push(mapProfileToResult(profile, 'instagram', 'llm'));
            }
        }

        // Add TikTok profiles (no verification API available)
        for (const profile of tiktokProfiles) {
            verifiedResults.push(mapProfileToResult(profile, 'tiktok', 'llm'));
        }

        // Apply follower range filter on final results
        let filteredResults = verifiedResults;
        if (followerRanges && followerRanges.length > 0) {
            filteredResults = verifiedResults.filter(r => {
                if (!r.followers_count || r.followers_count === 0) return true; // Keep unverified
                return followerRanges.some(range => {
                    const [minStr, maxStr] = range.split('-');
                    const min = parseInt(minStr);
                    const max = maxStr && maxStr !== 'inf' ? parseInt(maxStr) : Infinity;
                    return r.followers_count >= min && r.followers_count <= max;
                });
            });
        }

        return Response.json({ 
            results: filteredResults,
            total: filteredResults.length,
            verified_count: filteredResults.filter(r => r.source === 'verified').length,
            llm_count: filteredResults.filter(r => r.source === 'llm').length
        });

    } catch (error) {
        console.error('Search error:', error);
        return Response.json({ error: error.message, results: [] }, { status: 500 });
    }
});