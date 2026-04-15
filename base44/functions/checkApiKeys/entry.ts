import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

const NOTIFY_EMAIL = 'admin@sapizzedda.it';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const problems = [];

        // 1. Check Twilio
        const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        if (twilioSid && twilioToken) {
            try {
                const credentials = btoa(`${twilioSid}:${twilioToken}`);
                const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}.json`, {
                    headers: { 'Authorization': `Basic ${credentials}` }
                });
                if (!res.ok) {
                    problems.push({ name: 'Twilio', error: `HTTP ${res.status}` });
                }
            } catch (err) {
                problems.push({ name: 'Twilio', error: err.message });
            }
        } else {
            problems.push({ name: 'Twilio', error: 'Credenziali mancanti (SID o Token)' });
        }

        // 2. Check RapidAPI
        const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
        if (rapidApiKey) {
            try {
                const res = await fetch('https://instagram-statistics-api.p.rapidapi.com/community', {
                    headers: {
                        'X-RapidAPI-Key': rapidApiKey,
                        'X-RapidAPI-Host': 'instagram-statistics-api.p.rapidapi.com'
                    }
                });
                // 401/403 = key invalid, other errors could be API-specific
                if (res.status === 401 || res.status === 403) {
                    problems.push({ name: 'RapidAPI', error: `Chiave non valida (HTTP ${res.status})` });
                }
            } catch (err) {
                problems.push({ name: 'RapidAPI', error: err.message });
            }
        } else {
            problems.push({ name: 'RapidAPI', error: 'Chiave mancante' });
        }

        // 3. Check Apify
        const apifyToken = Deno.env.get('APIFY_API_TOKEN');
        if (apifyToken) {
            try {
                const res = await fetch('https://api.apify.com/v2/users/me', {
                    headers: { 'Authorization': `Bearer ${apifyToken}` }
                });
                if (!res.ok) {
                    problems.push({ name: 'Apify', error: `HTTP ${res.status}` });
                }
            } catch (err) {
                problems.push({ name: 'Apify', error: err.message });
            }
        } else {
            problems.push({ name: 'Apify', error: 'Token mancante' });
        }

        // 4. Check WeatherAPI
        const weatherKey = Deno.env.get('WEATHERAPI_KEY');
        if (weatherKey) {
            try {
                const res = await fetch(`https://api.weatherapi.com/v1/current.json?key=${weatherKey}&q=Milan`);
                if (!res.ok) {
                    problems.push({ name: 'WeatherAPI', error: `HTTP ${res.status}` });
                }
            } catch (err) {
                problems.push({ name: 'WeatherAPI', error: err.message });
            }
        } else {
            problems.push({ name: 'WeatherAPI', error: 'Chiave mancante' });
        }

        console.log(`API keys check: ${problems.length} problems found`);

        if (problems.length > 0) {
            const rows = problems.map(p =>
                `<tr>
                    <td style="padding: 8px 16px; border: 1px solid #ddd; font-weight: bold;">${p.name}</td>
                    <td style="padding: 8px 16px; border: 1px solid #ddd; color: #dc2626;">${p.error}</td>
                </tr>`
            ).join('');

            const emailBody = `
<h2>🔑 Problema Chiavi API</h2>
<p>Le seguenti chiavi API hanno problemi:</p>
<table style="border-collapse: collapse; margin: 16px 0;">
    <tr>
        <th style="padding: 8px 16px; border: 1px solid #ddd; background: #f1f5f9;">Servizio</th>
        <th style="padding: 8px 16px; border: 1px solid #ddd; background: #f1f5f9;">Errore</th>
    </tr>
    ${rows}
</table>
<p>Vai nelle impostazioni dell'app per aggiornare le chiavi.</p>
<p style="color: #64748b; font-size: 12px;">Controllo automatico settimanale - Sa Pizzedda</p>`;

            await base44.asServiceRole.integrations.Core.SendEmail({
                to: NOTIFY_EMAIL,
                subject: `[Sa Pizzedda] 🔑 ${problems.length} chiave/i API non funzionante/i`,
                body: emailBody,
                from_name: 'Sa Pizzedda - Sistema'
            });
        }

        return Response.json({
            status: problems.length === 0 ? 'all_ok' : 'problems_found',
            problems
        });

    } catch (error) {
        console.error('checkApiKeys error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});