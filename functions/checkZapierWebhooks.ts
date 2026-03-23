import { createClientFromRequest } from 'npm:@base44/sdk@0.8.22';

const NOTIFY_EMAIL = 'admin@sapizzedda.it';
const MAX_DAYS_WITHOUT_DATA = 3;

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const problems = [];
        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - MAX_DAYS_WITHOUT_DATA);
        const cutoffISO = cutoff.toISOString();
        const cutoffDate = cutoff.toISOString().split('T')[0];

        // 1. Check Reviews (importate da Zapier)
        try {
            const recent = await base44.asServiceRole.entities.Review.list('-created_date', 1);
            if (recent.length > 0 && recent[0].created_date < cutoffISO) {
                const lastDate = new Date(recent[0].created_date).toLocaleDateString('it-IT');
                problems.push({ name: 'Zapier Reviews', lastData: lastDate });
            } else if (recent.length === 0) {
                problems.push({ name: 'Zapier Reviews', lastData: 'Nessun dato' });
            }
        } catch (err) {
            console.error('Error checking Reviews:', err.message);
        }

        // 2. Check iPratico
        try {
            const recent = await base44.asServiceRole.entities.iPratico.list('-created_date', 1);
            if (recent.length > 0 && recent[0].created_date < cutoffISO) {
                const lastDate = new Date(recent[0].created_date).toLocaleDateString('it-IT');
                problems.push({ name: 'Zapier iPratico', lastData: lastDate });
            } else if (recent.length === 0) {
                problems.push({ name: 'Zapier iPratico', lastData: 'Nessun dato' });
            }
        } catch (err) {
            console.error('Error checking iPratico:', err.message);
        }

        // 3. Check Prodotti Venduti
        try {
            const recent = await base44.asServiceRole.entities.ProdottiVenduti.list('-created_date', 1);
            if (recent.length > 0 && recent[0].created_date < cutoffISO) {
                const lastDate = new Date(recent[0].created_date).toLocaleDateString('it-IT');
                problems.push({ name: 'Zapier Prodotti Venduti', lastData: lastDate });
            } else if (recent.length === 0) {
                problems.push({ name: 'Zapier Prodotti Venduti', lastData: 'Nessun dato' });
            }
        } catch (err) {
            console.error('Error checking ProdottiVenduti:', err.message);
        }

        // 4. Check RevenueByTimeSlot (ordini)
        try {
            const recent = await base44.asServiceRole.entities.RevenueByTimeSlot.list('-created_date', 1);
            if (recent.length > 0 && recent[0].created_date < cutoffISO) {
                const lastDate = new Date(recent[0].created_date).toLocaleDateString('it-IT');
                problems.push({ name: 'Zapier Revenue/Ordini', lastData: lastDate });
            } else if (recent.length === 0) {
                problems.push({ name: 'Zapier Revenue/Ordini', lastData: 'Nessun dato' });
            }
        } catch (err) {
            console.error('Error checking RevenueByTimeSlot:', err.message);
        }

        // 5. Check Sconti
        try {
            const recent = await base44.asServiceRole.entities.Sconto.list('-created_date', 1);
            if (recent.length > 0 && recent[0].created_date < cutoffISO) {
                const lastDate = new Date(recent[0].created_date).toLocaleDateString('it-IT');
                problems.push({ name: 'Zapier Sconti', lastData: lastDate });
            } else if (recent.length === 0) {
                problems.push({ name: 'Zapier Sconti', lastData: 'Nessun dato' });
            }
        } catch (err) {
            console.error('Error checking Sconti:', err.message);
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