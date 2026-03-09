import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { location, start_date, end_date } = await req.json();
  if (!location || !start_date || !end_date) {
    return Response.json({ error: 'Missing location, start_date or end_date' }, { status: 400 });
  }

  const apiKey = Deno.env.get('WEATHERAPI_KEY');
  if (!apiKey) return Response.json({ error: 'WEATHERAPI_KEY not configured' }, { status: 500 });

  // Build list of dates between start and end (max 90 days to avoid overload)
  const start = new Date(start_date);
  const end = new Date(end_date);
  const msPerDay = 86400000;
  const totalDays = Math.min(Math.round((end - start) / msPerDay) + 1, 90);

  const results = [];

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start.getTime() + i * msPerDay);
    const dateStr = d.toISOString().split('T')[0];

    const url = `https://api.weatherapi.com/v1/history.json?key=${apiKey}&q=${encodeURIComponent(location)}&dt=${dateStr}`;
    const res = await fetch(url);
    if (!res.ok) continue;

    const data = await res.json();
    const day = data?.forecast?.forecastday?.[0]?.day;
    if (!day) continue;

    results.push({
      date: dateStr,
      max_temp_c: day.maxtemp_c,
      min_temp_c: day.mintemp_c,
      avg_temp_c: day.avgtemp_c,
      precip_mm: day.totalprecip_mm,
      avg_humidity: day.avghumidity,
      avg_vis_km: day.avgvis_km,
      uv: day.uv,
      condition: day.condition?.text || '',
      condition_code: day.condition?.code,
      will_it_rain: day.daily_will_it_rain,
      chance_of_rain: day.daily_chance_of_rain,
    });
  }

  return Response.json({ success: true, data: results });
});