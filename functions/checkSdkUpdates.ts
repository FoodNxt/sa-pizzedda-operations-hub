import { createClientFromRequest } from 'npm:@base44/sdk@0.8.22';

const CURRENT_SDK_VERSION = '0.8.21';
const NOTIFY_EMAIL = 'admin@sapizzedda.it';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Check latest version from npm registry
        const npmRes = await fetch('https://registry.npmjs.org/@base44/sdk');
        if (!npmRes.ok) {
            console.error('Failed to fetch npm registry:', npmRes.status);
            return Response.json({ error: 'Failed to fetch npm registry' }, { status: 500 });
        }

        const npmData = await npmRes.json();
        const latestVersion = npmData['dist-tags']?.latest;

        if (!latestVersion) {
            console.error('Could not determine latest version');
            return Response.json({ error: 'Could not determine latest version' }, { status: 500 });
        }

        console.log(`Current SDK version: ${CURRENT_SDK_VERSION}, Latest: ${latestVersion}`);

        if (latestVersion === CURRENT_SDK_VERSION) {
            console.log('SDK is up to date, no action needed');
            return Response.json({ 
                status: 'up_to_date', 
                current: CURRENT_SDK_VERSION, 
                latest: latestVersion 
            });
        }

        // New version available - send email notification
        const emailBody = `
<h2>🔄 Aggiornamento SDK Base44 Disponibile</h2>
<p>È stata rilevata una nuova versione dell'SDK di Base44.</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr>
    <td style="padding: 8px 16px; border: 1px solid #ddd; font-weight: bold;">Versione attuale</td>
    <td style="padding: 8px 16px; border: 1px solid #ddd;">${CURRENT_SDK_VERSION}</td>
  </tr>
  <tr>
    <td style="padding: 8px 16px; border: 1px solid #ddd; font-weight: bold;">Nuova versione</td>
    <td style="padding: 8px 16px; border: 1px solid #ddd; color: #2563eb; font-weight: bold;">${latestVersion}</td>
  </tr>
</table>
<p>Per aggiornare, chiedi a Base44 AI di eseguire l'aggiornamento delle SDK in tutte le funzioni backend.</p>
<p style="color: #64748b; font-size: 12px;">Controllo automatico giornaliero - Sa Pizzedda</p>
`;

        await base44.asServiceRole.integrations.Core.SendEmail({
            to: NOTIFY_EMAIL,
            subject: `[Sa Pizzedda] Nuova versione SDK Base44: ${latestVersion}`,
            body: emailBody,
            from_name: 'Sa Pizzedda - Sistema'
        });

        console.log(`Email sent to ${NOTIFY_EMAIL} about SDK update ${CURRENT_SDK_VERSION} -> ${latestVersion}`);

        return Response.json({ 
            status: 'update_available', 
            current: CURRENT_SDK_VERSION, 
            latest: latestVersion,
            email_sent: true 
        });

    } catch (error) {
        console.error('checkSdkUpdates error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});