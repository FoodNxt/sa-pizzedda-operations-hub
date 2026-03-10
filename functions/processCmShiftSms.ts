import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Scheduled function: runs every 5 minutes
// Purpose: sends pending CM - Chiamata SMS via Twilio when scheduled time has been reached
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

        if (!accountSid || !authToken) {
            console.error('processCmShiftSms: Twilio credentials not configured');
            return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
        }

        // Fetch all pending SMS turni
        const pendingTurni = await base44.asServiceRole.entities.TurnoPlanday.filter({
            sms_cm_status: 'pending'
        });

        const now = new Date();
        let sent = 0;
        let skipped = 0;
        let failed = 0;

        for (const turno of pendingTurni) {
            // Check if it's time to send
            if (!turno.sms_cm_scheduled_at) {
                skipped++;
                continue;
            }

            const scheduledAt = new Date(turno.sms_cm_scheduled_at);
            if (scheduledAt > now) {
                skipped++;
                continue;
            }

            // Safety: require data field in format YYYY-MM-DD
            if (!turno.data || !turno.data.includes('-')) {
                console.error(`processCmShiftSms: invalid data field for turno ${turno.id}: ${turno.data}`);
                await base44.asServiceRole.entities.TurnoPlanday.update(turno.id, { sms_cm_status: 'failed' });
                failed++;
                continue;
            }

            // Format date as ddmmaaaa
            const [year, month, day] = turno.data.split('-');
            const dateFormatted = `${day}${month}${year}`;

            // Safety: require dipendente_id
            if (!turno.dipendente_id) {
                console.error(`processCmShiftSms: no dipendente_id for turno ${turno.id}`);
                await base44.asServiceRole.entities.TurnoPlanday.update(turno.id, { sms_cm_status: 'failed' });
                failed++;
                continue;
            }

            // Fetch user to get fresh codice_fiscale
            let users;
            try {
                users = await base44.asServiceRole.entities.User.filter({ id: turno.dipendente_id });
            } catch (err) {
                console.error(`processCmShiftSms: error fetching user for turno ${turno.id}:`, err.message);
                await base44.asServiceRole.entities.TurnoPlanday.update(turno.id, { sms_cm_status: 'failed' });
                failed++;
                continue;
            }

            if (!users || users.length === 0) {
                console.error(`processCmShiftSms: user not found for turno ${turno.id}`);
                await base44.asServiceRole.entities.TurnoPlanday.update(turno.id, { sms_cm_status: 'failed' });
                failed++;
                continue;
            }

            const user = users[0];

            if (!user.codice_fiscale) {
                console.error(`processCmShiftSms: no codice_fiscale for user ${turno.dipendente_id}`);
                await base44.asServiceRole.entities.TurnoPlanday.update(turno.id, { sms_cm_status: 'failed' });
                failed++;
                continue;
            }

            // Build exact SMS body
            const smsBody = `13505360969*${user.codice_fiscale}*${dateFormatted}`;

            // Twilio E.164 numbers (Italian prefix +39)
            const fromNumber = '+393515293557';
            const toNumber = '+393399942256';

            // Send via Twilio REST API (no npm package needed - use native fetch)
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
            const credentials = btoa(`${accountSid}:${authToken}`);

            try {
                const formBody = new URLSearchParams();
                formBody.append('To', toNumber);
                formBody.append('From', fromNumber);
                formBody.append('Body', smsBody);

                const twilioRes = await fetch(twilioUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${credentials}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: formBody.toString()
                });

                const twilioJson = await twilioRes.json();

                if (twilioRes.ok) {
                    await base44.asServiceRole.entities.TurnoPlanday.update(turno.id, {
                        sms_cm_status: 'sent',
                        sms_cm_sent_at: now.toISOString()
                    });
                    console.log(`processCmShiftSms: SMS sent for turno ${turno.id}, SID: ${twilioJson.sid}`);
                    sent++;
                } else {
                    console.error(`processCmShiftSms: Twilio error for turno ${turno.id}:`, JSON.stringify(twilioJson));
                    await base44.asServiceRole.entities.TurnoPlanday.update(turno.id, { sms_cm_status: 'failed' });
                    failed++;
                }
            } catch (fetchErr) {
                console.error(`processCmShiftSms: network error for turno ${turno.id}:`, fetchErr.message);
                await base44.asServiceRole.entities.TurnoPlanday.update(turno.id, { sms_cm_status: 'failed' });
                failed++;
            }
        }

        console.log(`processCmShiftSms complete: sent=${sent}, skipped=${skipped}, failed=${failed}`);
        return Response.json({ success: true, sent, skipped, failed });

    } catch (error) {
        console.error('processCmShiftSms unexpected error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});