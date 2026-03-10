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
      const body = new URLSearchParams({ username });
      const res = await fetch('https://instagram-scraper-stable-api.p.rapidapi.com/get_ig_user_info_v2.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com'
        },
        body: body.toString()
      });
      const data = await res.json();
      console.log('API response for', username, JSON.stringify(data).slice(0, 800));
      const profile = data?.user || data?.data || data;
      const followers = profile?.follower_count ?? profile?.followers ?? profile?.edge_followed_by?.count;
      if (followers !== undefined) {
        results[username] = {
          followers_count: followers,
          full_name: profile.full_name,
          biography: profile.biography || profile.bio,
          is_private: profile.is_private,
          verified: profile.is_verified || profile.verified,
          profile_pic_url: profile.profile_pic_url || profile.hd_profile_pic_url,
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