import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

const NOTIFY_EMAIL = 'admin@sapizzedda.it';

// Funzioni critiche da testare con un ping leggero
const CRITICAL_FUNCTIONS = [
    'importReviewFromZapier',
    'importIPraticoFromZapier',
    'importOrderItemFromZapier',
    'importProdottiVendutiFromZapier',
    'importScontiFromZapier',
    'importRevenueSlotFromZapier',
    'analyzeCleaningInspection',
    'timbraTurno',
    'calculateShiftDelay',
    'processCmShiftSms',
    'inviaEmailOrdineFornitore',
    'inviaEmailPayroll'
];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const problems = [];

        for (const fnName of CRITICAL_FUNCTIONS) {
            try {
                // Send empty/minimal payload - we expect an error response, NOT a crash
                const res = await base44.asServiceRole.functions.invoke(fnName, {});

                // Any response (even error 400/401/403) means the function is deployed and running
                // We're just checking it doesn't crash with a 500 deployment error
                console.log(`✓ ${fnName}: OK (status in response)`);
            } catch (err) {
                const msg = err.message || '';
                // Distinguish between "function logic error" (OK) and "deployment/not found error" (BAD)
                if (msg.includes('404') || msg.includes('not found') || msg.includes('deploy') || msg.includes('Module not found')) {
                    problems.push({ name: fnName, error: msg.slice(0, 200) });
                    console.error(`✗ ${fnName}: ${msg}`);
                } else {
                    // Logic errors (400, 401, 403, validation) = function is alive
                    console.log(`✓ ${fnName}: alive (returned logic error)`);
                }
            }
        }

        console.log(`Backend functions check: ${problems.length} broken functions`);

        if (problems.length > 0) {
            const rows = problems.map(p =>
                `<tr>
                    <td style="padding: 8px 16px; border: 1px solid #ddd; font-weight: bold;">${p.name}</td>
                    <td style="padding: 8px 16px; border: 1px solid #ddd; color: #dc2626;">${p.error}</td>
                </tr>`
            ).join('');

            const emailBody = `
<h2>🚨 Funzioni Backend Non Funzionanti</h2>
<p>Le seguenti funzioni backend critiche non rispondono correttamente:</p>
<table style="border-collapse: collapse; margin: 16px 0;">
    <tr>
        <th style="padding: 8px 16px; border: 1px solid #ddd; background: #f1f5f9;">Funzione</th>
        <th style="padding: 8px 16px; border: 1px solid #ddd; background: #f1f5f9;">Errore</th>
    </tr>
    ${rows}
</table>
<p>Chiedi a Base44 AI di verificare e correggere queste funzioni.</p>
<p style="color: #64748b; font-size: 12px;">Controllo automatico giornaliero - Sa Pizzedda</p>`;

            await base44.asServiceRole.integrations.Core.SendEmail({
                to: NOTIFY_EMAIL,
                subject: `[Sa Pizzedda] 🚨 ${problems.length} funzione/i backend non funzionante/i`,
                body: emailBody,
                from_name: 'Sa Pizzedda - Sistema'
            });
        }

        return Response.json({
            status: problems.length === 0 ? 'all_ok' : 'problems_found',
            problems,
            checked: CRITICAL_FUNCTIONS.length
        });

    } catch (error) {
        console.error('checkBackendFunctions error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});