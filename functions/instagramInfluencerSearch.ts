import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Funzione che usa instagram-scraper-stable-api da RapidAPI per cercare e validare influencer
Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { usernames } = await req.json();
    
    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
        return Response.json({ error: 'usernames array required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!apiKey) {
        return Response.json({ error: 'RAPIDAPI_KEY not configured' }, { status: 500 });
    }

    const results = {};

    for (const username of usernames) {
        const cleanUsername = username.replace('@', '').trim();
        
        try {
            const response = await fetch('https://instagram-scraper-stable-api.p.rapidapi.com/instagram/profile/' + cleanUsername, {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': apiKey,
                    'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com'
                }
            });

            if (!response.ok) {
                results[cleanUsername] = { 
                    exists: false, 
                    error: `HTTP ${response.status}` 
                };
                continue;
            }

            const data = await response.json();
            
            // Estrai i dati dal formato dell'API
            results[cleanUsername] = {
                exists: true,
                full_name: data.user?.full_name || data.fullname || '',
                followers_count: data.user?.edge_followed_by?.count || data.followers || 0,
                biography: data.user?.biography || data.bio || '',
                verified: data.user?.is_verified || data.verified || false,
                profile_pic_url: data.user?.profile_pic_url || data.profilePicUrl || '',
                avg_er: data.engagement_rate ? data.engagement_rate / 100 : 0,
                tags: data.tags || [],
                media_count: data.user?.edge_owner_to_timeline_media?.count || data.mediaCount || 0
            };
        } catch (err) {
            results[cleanUsername] = { 
                exists: false, 
                error: err.message 
            };
        }
    }

    return Response.json({ results });
});