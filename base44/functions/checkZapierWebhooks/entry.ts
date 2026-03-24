import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const NOTIFY_EMAIL = 'admin@sapizzedda.it';
const MAX_DAYS_WITHOUT_DATA = 3;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const problems = [];
        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - MAX_DAYS_WITHOUT_DATA);
        const cutoffISO = cutoff.toISOString();

        const checks = [
            { name: 'Zapier Reviews', entity: 'Review' },
            { name: 'Zapier iPratico', entity: 'iPratico' },
            { name: 'Zapier Prodotti Venduti', entity: 'ProdottiVenduti' },
            { name: 'Zapier Revenue/Ordini', entity: 'RevenueByTimeSlot' },
            { name: 'Zapier Sconti', entity: 'Sconto' },
        ];

        for (const check of checks) {
            try {
                // Only check if there's at least 1 record created after the cutoff
                const recent = await base44.asServiceRole.entities[check.entity].filter(
                    { created_date: { $gte: cutoffISO } },
                    '-created_date',
                    1
                );

                if (recent.length === 0) {
                    // No recent data — get the very last record to report its date
                    await sleep(300);
                    const last = await base44.asServiceRole.entities[check.entity].list('-created_date', 1);
                    if (last.length > 0) {
                        const lastDate = new Date(last[0].created_date).toLocaleDateString('it-IT');
                        problems.push({ name: check.name, lastData: lastDate });
                    } else {
                        problems.push({ name: check.name, lastData: 'Nessun dato' });
                    }
                }
            } catch (err) {
                console.error(`Error checking ${check.entity}:`, err.message);
            }
            await sleep(300);
        }

        console.log(`Zapier check: ${problems.length} stale webhooks found`);

        if (problems.length > 0) {
            const rows = problems.map(p =>
                `<tr>
                    <td style="padding: 8px 16px; border: 1px solid #ddd; font-weight: bold;">${p.name}</td>
                    <td style="padding: 8px 16px; border: 1px solid #ddd; color: #dc2626;">${p.lastData}</td>
                </tr>`
            ).join('');

            const emailBody = `
<h2>🔗 Webhook Zapier Inattivi</h2>
<p>I seguenti flussi Zapier non inviano dati da più di ${MAX_DAYS_WITHOUT_DATA} giorni:</p>
<table style="border-collapse: collapse; margin: 16px 0;">
    <tr>
        <th style="padding: 8px 16px; border: 1px solid #ddd; background: #f1f5f9;">Flusso</th>
        <th style="padding: 8px 16px; border: 1px solid #ddd; background: #f1f5f9;">Ultimo dato</th>
    </tr>
    ${rows}
</table>
<p>Controlla la dashboard di Zapier per verificare che gli Zap siano attivi e funzionanti.</p>
<p style="color: #64748b; font-size: 12px;">Controllo automatico giornaliero - Sa Pizzedda</p>`;

            await base44.asServiceRole.integrations.Core.SendEmail({
                to: NOTIFY_EMAIL,
                subject: `[Sa Pizzedda] 🔗 ${problems.length} webhook Zapier inattivo/i`,
                body: emailBody,
                from_name: 'Sa Pizzedda - Sistema'
            });
        }

        return Response.json({
            status: problems.length === 0 ? 'all_ok' : 'stale_webhooks',
            problems,
            threshold_days: MAX_DAYS_WITHOUT_DATA
        });

    } catch (error) {
        console.error('checkZapierWebhooks error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});