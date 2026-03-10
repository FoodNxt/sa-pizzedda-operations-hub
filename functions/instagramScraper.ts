import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { usernames } = await req.json();
  if (!usernames || !Array.isArray(usernames)) {
    return Response.json({ error: 'usernames array required' }, { status: 400 });
  }

  const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
  const results = {};

  for (const username of usernames) {
    try {
      const res = await fetch(`https://instagram-scraper-stable-api.p.rapidapi.com/v1/info?username_or_id_or_url=${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com'
        }
      });
      const data = await res.json();
      console.log('API response for', username, JSON.stringify(data).slice(0, 500));
      const profile = data?.data;
      if (profile?.follower_count !== undefined) {
        results[username] = {
          followers_count: profile.follower_count,
          full_name: profile.full_name,
          biography: profile.biography,
          is_private: profile.is_private,
          verified: profile.is_verified,
          exists: true
        };
      } else {
        results[username] = { exists: false, raw: data };
      }
    } catch (e) {
      results[username] = { exists: false, error: e.message };
    }
  }

  return Response.json({ results });
});