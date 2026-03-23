import { createClientFromRequest } from 'npm:@base44/sdk@0.8.22';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const APIFY_TOKEN = Deno.env.get('APIFY_API_TOKEN');
    if (!APIFY_TOKEN) {
        return Response.json({ error: 'APIFY_API_TOKEN not configured' }, { status: 500 });
    }

    const { platforms, niches, followerRanges, city } = await req.json();
    if (!platforms || platforms.length === 0) {
        return Response.json({ error: 'platforms array required' }, { status: 400 });
    }

    const nicheKeywords = {
        food: ['food', 'foodie', 'restaurant', 'chef', 'cucina', 'ricette'],
        lifestyle: ['lifestyle', 'vita quotidiana'],
        travel: ['travel', 'viaggi', 'turismo'],
        family: ['family', 'famiglia', 'genitori'],
        fitness: ['fitness', 'gym', 'workout', 'sport'],
        fashion: ['fashion', 'moda', 'style', 'ootd'],
        pizza: ['pizza', 'street food', 'pizzeria'],
        local: ['local guide', 'city life', 'eventi']
    };

    const searchTerms = (niches || ['food']).flatMap(n => nicheKeywords[n] || [n]);
    const cityFilter = city || '';
    const searchQuery = cityFilter
        ? `${searchTerms[0]} ${cityFilter}`
        : searchTerms[0];

    // Parse follower ranges for post-filtering
    const parsedRanges = (followerRanges || []).map(r => {
        const [minStr, maxStr] = r.split('-');
        return { min: parseInt(minStr) || 0, max: maxStr === 'inf' ? Infinity : parseInt(maxStr) || Infinity };
    });

    const matchesFollowerRange = (count) => {
        if (!count || parsedRanges.length === 0) return true;
        return parsedRanges.some(r => count >= r.min && count <= r.max);
    };

    // Run actor and get dataset items. Returns { items: [], error: null } or { items: [], error: string }
    const runActor = async (actorId, input, timeoutSecs = 120) => {
        try {
            console.log(`Starting actor ${actorId} with input:`, JSON.stringify(input).slice(0, 500));
            const runRes = await fetch(
                `https://api.apify.com/v2/acts/${actorId}/runs?waitForFinish=${timeoutSecs}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${APIFY_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(input)
                }
            );

            if (!runRes.ok) {
                const errText = await runRes.text();
                console.error(`Actor ${actorId} run failed: ${runRes.status} ${errText}`);
                // Check for Apify usage limit
                const isLimitExceeded = errText.includes('limit') || errText.includes('exceeded') || runRes.status === 402;
                return { items: [], error: `HTTP ${runRes.status}`, isLimitExceeded };
            }

            const runData = await runRes.json();
            const datasetId = runData?.data?.defaultDatasetId;
            if (!datasetId) {
                console.error(`Actor ${actorId}: no dataset ID in response`);
                return { items: [], error: 'No dataset ID returned' };
            }

            const status = runData?.data?.status;
            if (status !== 'SUCCEEDED') {
                console.log(`Actor ${actorId} status: ${status}, fetching whatever data is available`);
            }

            const dataRes = await fetch(
                `https://api.apify.com/v2/datasets/${datasetId}/items?limit=50`,
                { headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` } }
            );

            if (!dataRes.ok) {
                console.error(`Failed to fetch dataset for ${actorId}: ${dataRes.status}`);
                return { items: [], error: `Dataset fetch failed: ${dataRes.status}` };
            }

            const dataItems = await dataRes.json();
            console.log(`Actor ${actorId}: dataset has ${dataItems.length} items, run status: ${status}`);
            return { items: dataItems, error: null };
        } catch (err) {
            console.error(`Actor ${actorId} error: ${err.message}`);
            return { items: [], error: err.message };
        }
    };

    const allResults = [];
    const errors = [];

    // Build platform-specific actor calls
    const platformPromises = [];

    if (platforms.includes('instagram')) {
        platformPromises.push((async () => {
            try {
                const input = {
                    search: cityFilter ? `${searchTerms[0]} ${cityFilter}` : searchTerms[0],
                    searchType: 'user',
                    resultsLimit: 30
                };
                const result = await runActor('apify~instagram-search-scraper', input);
                if (result.error) {
                    errors.push({ platform: 'instagram', error: result.error, isLimitExceeded: result.isLimitExceeded });
                }
                const items = result.items;
                console.log(`Instagram returned ${items.length} raw items`);

                for (const item of items) {
                    const username = item.username || item.ownerUsername || '';
                    if (!username) continue;

                    allResults.push({
                        username,
                        full_name: item.fullName || item.full_name || username,
                        platform: 'instagram',
                        biography: item.biography || item.bio || '',
                        followers_count: item.followersCount ?? item.followers ?? item.follower_count ?? 0,
                        profile_pic_url: item.profilePicUrl || item.profilePicUrlHd || item.profile_pic_url || '',
                        verified: item.verified || item.isVerified || item.is_verified || false,
                        engagement_rate: null,
                        niche: niches?.[0] || 'food',
                        city: item.city || item.locationName || cityFilter || null,
                        profile_url: `https://www.instagram.com/${username}/`,
                        email: item.email || item.businessEmail || item.public_email || null,
                        external_url: item.externalUrl || item.external_url || null,
                        posts_count: item.postsCount ?? item.mediaCount ?? null,
                        following_count: item.followsCount ?? item.followingCount ?? null,
                        is_business: item.isBusinessAccount || item.isBusiness || false,
                        account_id: item.id || item.pk || null,
                        source: 'apify'
                    });
                }
            } catch (err) {
                console.error('Instagram search error:', err.message);
                errors.push({ platform: 'instagram', error: err.message });
            }
        })());
    }

    if (platforms.includes('tiktok')) {
        platformPromises.push((async () => {
            try {
                const input = {
                    searchQueries: [cityFilter ? `${searchTerms[0]} ${cityFilter}` : searchTerms[0]],
                    resultsPerPage: 30,
                    searchSection: '/user',
                    shouldDownloadVideos: false
                };
                const result = await runActor('clockworks~tiktok-scraper', input);
                if (result.error) {
                    errors.push({ platform: 'tiktok', error: result.error, isLimitExceeded: result.isLimitExceeded });
                }
                const items = result.items;
                console.log(`TikTok returned ${items.length} raw items`);

                // TikTok scraper returns videos/posts — extract unique authors from authorMeta
                const seenTiktokUsers = new Set();
                for (const item of items) {
                    const author = item.authorMeta || item.author || item;
                    const username = author.name || author.uniqueId || author.unique_id || item.uniqueId || '';
                    if (!username || seenTiktokUsers.has(username)) continue;
                    seenTiktokUsers.add(username);

                    allResults.push({
                        username,
                        full_name: author.nickName || author.nickname || username,
                        platform: 'tiktok',
                        biography: author.signature || author.bio || '',
                        followers_count: author.fans ?? author.followerCount ?? 0,
                        profile_pic_url: author.avatar || author.avatarLarger || author.avatarMedium || '',
                        verified: author.verified || false,
                        engagement_rate: null,
                        niche: niches?.[0] || 'food',
                        city: null,
                        profile_url: author.profileUrl || `https://www.tiktok.com/@${username}`,
                        email: null,
                        external_url: author.bioLink?.link || null,
                        posts_count: author.video ?? null,
                        following_count: author.following ?? null,
                        is_business: author.commerceUserInfo?.commerceUser || false,
                        account_id: author.id || null,
                        source: 'apify'
                    });
                }
            } catch (err) {
                console.error('TikTok search error:', err.message);
                errors.push({ platform: 'tiktok', error: err.message });
            }
        })());
    }

    if (platforms.includes('youtube')) {
        platformPromises.push((async () => {
            try {
                // streamers~youtube-scraper: Apify-maintained, searches by keyword, returns videos with channel data
                const input = {
                    searchKeywords: [cityFilter ? `${searchTerms[0]} ${cityFilter}` : searchTerms[0]],
                    maxResults: 30,
                    maxResultsShorts: 0,
                    maxResultStreams: 0
                };
                const result = await runActor('streamers~youtube-scraper', input, 180);
                if (result.error) {
                    errors.push({ platform: 'youtube', error: result.error, isLimitExceeded: result.isLimitExceeded });
                }
                const items = result.items;
                console.log(`YouTube returned ${items.length} raw items`);

                // Extract unique channels from video results
                const seenYtChannels = new Set();
                for (const item of items) {
                    const channelUrl = item.channelUrl || '';
                    const channelName = item.channelName || '';
                    // Extract username from channelUrl like "http://www.youtube.com/@username"
                    const handleMatch = channelUrl.match(/@([^/]+)/);
                    const username = handleMatch ? handleMatch[1] : channelName.replace(/\s+/g, '');
                    if (!username || seenYtChannels.has(username)) continue;
                    seenYtChannels.add(username);

                    allResults.push({
                        username,
                        full_name: channelName || username,
                        platform: 'youtube',
                        biography: '',
                        followers_count: item.numberOfSubscribers ?? 0,
                        profile_pic_url: '',
                        verified: false,
                        engagement_rate: null,
                        niche: niches?.[0] || 'food',
                        city: null,
                        profile_url: channelUrl || `https://www.youtube.com/@${username}`,
                        email: null,
                        external_url: null,
                        posts_count: item.channelNumberOfVideos ?? null,
                        following_count: null,
                        is_business: false,
                        account_id: item.channelId || null,
                        source: 'apify'
                    });
                }
            } catch (err) {
                console.error('YouTube search error:', err.message);
                errors.push({ platform: 'youtube', error: err.message });
            }
        })());
    }

    console.log(`Running ${platformPromises.length} platform searches for: ${platforms.join(', ')}`);
    // Run all platform searches in parallel
    await Promise.all(platformPromises);

    // Apply follower range filtering — keep items with unknown/0 followers (search actors don't always return full profile data)
    let filtered = allResults.filter(r => !r.followers_count || matchesFollowerRange(r.followers_count));

    // Deduplicate by username+platform
    const seen = new Set();
    filtered = filtered.filter(r => {
        const key = `${r.platform}:${r.username}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    console.log(`Final results: ${filtered.length} (from ${allResults.length} raw, ${errors.length} platform errors)`);

    return Response.json({
        results: filtered,
        total: filtered.length,
        errors: errors.length > 0 ? errors : undefined
    });
});