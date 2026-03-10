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
      const res = await fetch(`https://instagram-scraper-stable-api.p.rapidapi.com/v1/info?username_or_id_or_url=${username}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com'
        }
      });
      const data = await res.json();
      if (data?.data) {
        results[username] = {
          followers_count: data.data.follower_count,
          full_name: data.data.full_name,
          biography: data.data.biography,
          is_private: data.data.is_private,
          profile_pic_url: data.data.profile_pic_url,
          verified: data.data.is_verified,
          exists: true
        };
      } else {
        results[username] = { exists: false };
      }
    } catch (e) {
      results[username] = { exists: false, error: e.message };
    }
  }

  return Response.json({ results });
});