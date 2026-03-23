import { createClientFromRequest } from 'npm:@base44/sdk@0.8.22';

const NOTIFY_EMAIL = 'admin@sapizzedda.it';

const CONNECTORS = [
    {
        name: 'Gmail',
        type: 'gmail',
        testUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/profile'
    },
    {
        name: 'Google Sheets',
        type: 'googlesheets',
        testUrl: null // scope readonly - just verify token exists
    },
    {
        name: 'Google Drive',
        type: 'googledrive',
        testUrl: null // scope drive.file - just verify token exists
    }
];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const problems = [];

        for (const connector of CONNECTORS) {
            try {
                const { accessToken } = await base44.asServiceRole.connectors.getConnection(connector.type);

                if (!accessToken) {
                    problems.push({ name: connector.name, error: 'Nessun access token disponibile' });
                    continue;
                }

                // Some connectors have limited scopes, so just verify the token exists
                // For connectors with a test URL, actually call it
                if (connector.testUrl) {
                    const res = await fetch(connector.testUrl, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });

                    if (!res.ok) {
                        const body = await res.text().catch(() => 'N/A');
                        problems.push({
                            name: connector.name,
                            error: `HTTP ${res.status} - ${body.slice(0, 200)}`
                        });
                    }
                }
            } catch (err) {
                problems.push({ name: connector.name, error: err.message });
            }
        }

        // Check Notion separately (different auth model)
        try {
            const { accessToken } = await base44.asServiceRole.connectors.getConnection('notion');
            if (!accessToken) {
                problems.push({ name: 'Notion', error: 'Nessun access token disponibile' });
            } else {
                // With read_content scope, /v1/users/me is not available. Use /v1/search instead.
                const res = await fetch('https://api.notion.com/v1/search', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Notion-Version': '2022-06-28',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ page_size: 1 })
                });
                if (!res.ok) {
                    problems.push({ name: 'Notion', error: `HTTP ${res.status}` });
                }
            }
        } catch (err) {
            problems.push({ name: 'Notion', error: err.message });
        }

        console.log(`OAuth check: ${problems.length} problems found`);

        if (problems.length > 0) {
            const rows = problems.map(p =>
                `<tr>
                    <td style="padding: 8px 16px; border: 1px solid #ddd; font-weight: bold;">${p.name}</td>
                    <td style="padding: 8px 16px; border: 1px solid #ddd; color: #dc2626;">${p.error}</td>
                </tr>`
            ).join('');

            const emailBody = `
<h2>⚠️ Problema Connettori OAuth</h2>
<p>I seguenti connettori hanno problemi di autenticazione:</p>
<table style="border-collapse: collapse; margin: 16px 0;">
    <tr>
        <th style="padding: 8px 16px; border: 1px solid #ddd; background: #f1f5f9;">Connettore</th>
        <th style="padding: 8px 16px; border: 1px solid #ddd; background: #f1f5f9;">Errore</th>
    </tr>
    ${rows}
</table>
<p>Vai nelle impostazioni dell'app Base44 per riconnettere i connettori.</p>
<p style="color: #64748b; font-size: 12px;">Controllo automatico giornaliero - Sa Pizzedda</p>`;

            await base44.asServiceRole.integrations.Core.SendEmail({
                to: NOTIFY_EMAIL,
                subject: `[Sa Pizzedda] ⚠️ ${problems.length} connettore/i OAuth non funzionante/i`,
                body: emailBody,
                from_name: 'Sa Pizzedda - Sistema'
            });
        }

        return Response.json({
            status: problems.length === 0 ? 'all_ok' : 'problems_found',
            problems,
            checked: CONNECTORS.length + 1
        });

    } catch (error) {
        console.error('checkOAuthConnectors error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});