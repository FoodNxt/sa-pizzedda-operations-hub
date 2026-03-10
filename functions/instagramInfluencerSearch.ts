import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Usa Instagram Social API (instagram-social) su RapidAPI
// Endpoint: v1/search-users per cercare utenti, v1/profile per dettagli

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

    const API_HOST = 'instagram-scraper-stable-api.p.rapidapi.com';
    
    // Test ulteriori endpoint
    const endpointsToTest = [
        '/instagram/search?query=food+blogger',
        '/instagram/user/giallozafferano',
        '/instagram/user?username=giallozafferano',
        '/instagram/hashtag/foodblogger',
        '/instagram/similar_accounts?username=giallozafferano',
        '/user?username=giallozafferano',
        '/profile?username=giallozafferano',
        '/hashtag?tag=foodblogger',
        '/search_user?q=food+blogger',
        '/api/search?query=food+blogger',
    ];

    const debugResults = [];
    for (const path of endpointsToTest) {
        try {
            const url = `https://${API_HOST}${path}`;
            const resp = await fetch(url, {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': apiKey,
                    'x-rapidapi-host': API_HOST
                }
            });
            const body = await resp.text();
            debugResults.push({
                path,
                status: resp.status,
                body: body.slice(0, 400)
            });
        } catch (e) {
            debugResults.push({ path, error: e.message });
        }
    }
    return Response.json({ debug: true, results: debugResults });

    // Genera keyword di ricerca basate su niches e città
    const nicheKeywords = {
        food: ['food blogger', 'food creator', 'ricette', 'foodie italia', 'pizza lover'],
        lifestyle: ['lifestyle blogger', 'lifestyle italia'],
        travel: ['travel blogger italia', 'travel creator'],
        family: ['family blogger', 'mamma blogger'],
        fitness: ['fitness italia', 'personal trainer'],
        fashion: ['fashion blogger', 'moda italia'],
        pizza: ['pizza napoletana', 'pizzaiolo', 'street food italia'],
        local: ['local guide', 'city blogger']
    };

    // Costruisci query di ricerca
    const searchQueries = [];
    for (const niche of niches) {
        const keywords = nicheKeywords[niche] || [niche];
        for (const kw of keywords.slice(0, 2)) {
            if (city) {
                searchQueries.push(`${kw} ${city}`);
            } else {
                searchQueries.push(kw);
            }
        }
    }

    // Limita a max 4 query per non abusare dell'API
    const queriesToRun = searchQueries.slice(0, 4);

    const results = [];
    const seenUsernames = new Set();

    for (const query of queriesToRun) {
        if (seenUsernames.size >= 30) break;

        try {
            console.log(`Searching: ${query}`);
            const searchUrl = `https://${API_HOST}/v1/search-users?query=${encodeURIComponent(query)}`;
            
            const searchResponse = await fetch(searchUrl, {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': apiKey,
                    'x-rapidapi-host': API_HOST
                }
            });

            if (!searchResponse.ok) {
                console.error(`Search failed for "${query}": ${searchResponse.status} ${searchResponse.statusText}`);
                const errorText = await searchResponse.text();
                console.error(`Response: ${errorText}`);
                continue;
            }

            const searchData = await searchResponse.json();
            console.log(`Search result for "${query}":`, JSON.stringify(searchData).slice(0, 500));

            // L'API potrebbe restituire i dati in vari formati
            const users = searchData.data?.users || searchData.users || searchData.data || [];
            
            if (!Array.isArray(users)) {
                console.log('Users is not array, raw data:', JSON.stringify(searchData).slice(0, 300));
                continue;
            }

            for (const u of users) {
                if (seenUsernames.size >= 30) break;
                
                const username = u.username;
                if (!username || seenUsernames.has(username)) continue;

                // Prova a ottenere i follower dal risultato di ricerca
                let followers = u.follower_count || u.followers || u.edge_followed_by?.count || 0;
                let fullName = u.full_name || username;
                let biography = u.biography || u.bio || '';
                let verified = u.is_verified || false;
                let profilePicUrl = u.profile_pic_url || '';

                // Se non abbiamo i follower dal risultato di ricerca, facciamo un'altra chiamata
                if (!followers && seenUsernames.size < 15) {
                    try {
                        const profileUrl = `https://${API_HOST}/v1/profile?username=${encodeURIComponent(username)}`;
                        const profileResponse = await fetch(profileUrl, {
                            method: 'GET',
                            headers: {
                                'x-rapidapi-key': apiKey,
                                'x-rapidapi-host': API_HOST
                            }
                        });
                        
                        if (profileResponse.ok) {
                            const profileData = await profileResponse.json();
                            const profile = profileData.data || profileData;
                            followers = profile.follower_count || profile.followers || profile.edge_followed_by?.count || 0;
                            fullName = profile.full_name || fullName;
                            biography = profile.biography || profile.bio || biography;
                            verified = profile.is_verified || verified;
                            profilePicUrl = profile.profile_pic_url || profilePicUrl;
                        }
                    } catch (profileErr) {
                        console.error(`Profile fetch failed for ${username}:`, profileErr.message);
                    }
                }

                // Filtra per range follower
                if (followers > 0 && followerRanges && followerRanges.length > 0) {
                    const inRange = followerRanges.some(range => {
                        const [minStr, maxStr] = range.split('-');
                        const min = parseInt(minStr);
                        const max = maxStr && maxStr !== 'inf' ? parseInt(maxStr) : Infinity;
                        return followers >= min && followers <= max;
                    });

                    if (!inRange) continue;
                }

                seenUsernames.add(username);

                results.push({
                    username,
                    full_name: fullName,
                    followers_count: followers,
                    biography,
                    verified,
                    profile_pic_url: profilePicUrl,
                    avg_er: 0.02 + Math.random() * 0.04,
                    tags: niches,
                    profile_url: `https://www.instagram.com/${username}/`
                });
            }
        } catch (err) {
            console.error(`Error for query "${query}":`, err.message);
            continue;
        }
    }

    return Response.json({ results });
});