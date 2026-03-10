import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Entity automation handler: triggered on TurnoPlanday create
// Purpose: marks CM - Chiamata shifts as pending for SMS, calculates send time (shift_start - 12h)
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();

        const event = body.event;
        const turnoId = event?.entity_id;

        // Only process create events
        if (event?.type !== 'create') {
            return Response.json({ success: true, skipped: 'not_create_event' });
        }

        if (!turnoId) {
            return Response.json({ success: true, skipped: 'no_entity_id' });
        }

        // Get turno data (fetch fresh if payload_too_large)
        let turnoData = body.data;
        if (body.payload_too_large || !turnoData) {
            const turni = await base44.asServiceRole.entities.TurnoPlanday.filter({ id: turnoId });
            turnoData = turni[0] || null;
        }

        if (!turnoData) {
            return Response.json({ success: true, skipped: 'turno_not_found' });
        }

        // Skip if SMS already scheduled/sent for this shift (duplicate guard)
        if (turnoData.sms_cm_status) {
            return Response.json({ success: true, skipped: 'already_processed', status: turnoData.sms_cm_status });
        }

        // Skip if no dipendente_id assigned
        if (!turnoData.dipendente_id || turnoData.dipendente_id === '') {
            return Response.json({ success: true, skipped: 'no_dipendente_id' });
        }

        // Fetch the User record
        let users;
        try {
            users = await base44.asServiceRole.entities.User.filter({ id: turnoData.dipendente_id });
        } catch (err) {
            console.error('scheduleCmShiftSms: error fetching user:', err.message);
            return Response.json({ success: true, skipped: 'user_fetch_error' });
        }

        if (!users || users.length === 0) {
            return Response.json({ success: true, skipped: 'user_not_found' });
        }

        const user = users[0];

        // Check employee group - only process CM - Chiamata
        if (user.employee_group !== 'CM') {
            return Response.json({ success: true, skipped: 'not_cm_chiamata', group: user.employee_group });
        }

        // Safety: require codice_fiscale
        if (!user.codice_fiscale) {
            console.error(`scheduleCmShiftSms: user ${turnoData.dipendente_id} has no codice_fiscale - cannot schedule SMS`);
            return Response.json({ success: true, skipped: 'no_codice_fiscale' });
        }

        // Safety: require data and ora_inizio
        if (!turnoData.data || !turnoData.ora_inizio) {
            console.error(`scheduleCmShiftSms: turno ${turnoId} missing data or ora_inizio`);
            return Response.json({ success: true, skipped: 'missing_date_or_time' });
        }

        // Build shift start datetime (Italian time treated as-is; Deno server time is UTC)
        // Parse "HH:MM" safely
        const timeParts = turnoData.ora_inizio.split(':');
        if (timeParts.length < 2) {
            return Response.json({ success: true, skipped: 'invalid_ora_inizio' });
        }
        const hh = timeParts[0].padStart(2, '0');
        const mm = timeParts[1].padStart(2, '0');

        // Treat shift time as Italian local (UTC+1 in winter). Use +01:00 as safe default.
        const shiftStart = new Date(`${turnoData.data}T${hh}:${mm}:00+01:00`);

        if (isNaN(shiftStart.getTime())) {
            console.error(`scheduleCmShiftSms: invalid shift datetime for turno ${turnoId}`);
            return Response.json({ success: true, skipped: 'invalid_shift_datetime' });
        }

        const now = new Date();

        // If shift has already started, do nothing
        if (shiftStart <= now) {
            return Response.json({ success: true, skipped: 'shift_already_started' });
        }

        // Calculate send time: shift_start - 12 hours
        const sendAt = new Date(shiftStart.getTime() - 12 * 60 * 60 * 1000);

        // If sendAt is in the past or within 5 minutes, use now + 1 minute (send at next processor run)
        const minSendAt = new Date(now.getTime() + 60 * 1000);
        const effectiveSendAt = sendAt <= now ? minSendAt : sendAt;

        // Mark turno as pending for SMS processing
        await base44.asServiceRole.entities.TurnoPlanday.update(turnoId, {
            sms_cm_status: 'pending',
            sms_cm_scheduled_at: effectiveSendAt.toISOString()
        });

        console.log(`scheduleCmShiftSms: turno ${turnoId} marked pending, send at ${effectiveSendAt.toISOString()}`);

        return Response.json({
            success: true,
            turno_id: turnoId,
            scheduled_at: effectiveSendAt.toISOString()
        });

    } catch (error) {
        // Always return 200 to avoid blocking shift creation or retrying forever
        console.error('scheduleCmShiftSms unexpected error:', error.message);
        return Response.json({ success: true, error: error.message });
    }
});