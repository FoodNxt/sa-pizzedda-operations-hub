import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { city, type, date } = await req.json();

    if (!city || !type) {
      return Response.json({ error: 'City and type are required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('WEATHERAPI_KEY');
    if (!apiKey) {
      return Response.json({ error: 'WeatherAPI key not configured' }, { status: 500 });
    }

    let url;
    if (type === 'forecast') {
      // Forecast for next 7 days
      url = `http://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(city)}&days=7&aqi=no&alerts=no`;
    } else if (type === 'history') {
      // Historical data for a specific date
      if (!date) {
        return Response.json({ error: 'Date is required for historical data' }, { status: 400 });
      }
      url = `http://api.weatherapi.com/v1/history.json?key=${apiKey}&q=${encodeURIComponent(city)}&dt=${date}`;
    } else {
      return Response.json({ error: 'Invalid type. Use "forecast" or "history"' }, { status: 400 });
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      return Response.json({ 
        error: errorData.error?.message || 'Failed to fetch weather data',
        details: errorData 
      }, { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});