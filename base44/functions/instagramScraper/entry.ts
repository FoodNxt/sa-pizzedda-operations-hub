import { createClientFromRequest } from 'npm:@base44/sdk@0.8.22';

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
      const url = `https://instagram-statistics-api.p.rapidapi.com/community?url=https://www.instagram.com/${encodeURIComponent(username)}/`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'instagram-statistics-api.p.rapidapi.com'
        }
      });
      const data = await res.json();
      console.log('API response for', username, JSON.stringify(data).slice(0, 800));
      const profile = data?.data || data;
      const followers = profile?.usersCount ?? profile?.followers ?? profile?.follower_count;
      if (followers !== undefined) {
        results[username] = {
          followers_count: followers,
          full_name: profile.name || profile.full_name,
          biography: profile.description || profile.biography,
          verified: profile.verified || profile.is_verified,
          profile_pic_url: profile.image || profile.profile_pic_url,
          tags: profile.tags || [],
          avg_er: profile.avgER,
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