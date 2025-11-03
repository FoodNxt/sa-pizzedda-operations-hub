import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        let body;
        try {
            const text = await req.text();
            body = JSON.parse(text);
        } catch (parseError) {
            return Response.json({ 
                error: 'Invalid JSON',
                details: parseError.message 
            }, { status: 400 });
        }
        
        const providedSecret = body.secret;
        const expectedSecret = Deno.env.get('ZAPIER_SHIFTS_WEBHOOK_SECRET');
        
        if (!expectedSecret) {
            return Response.json({ 
                error: 'ZAPIER_SHIFTS_WEBHOOK_SECRET not configured'
            }, { status: 500 });
        }
        
        if (!providedSecret || providedSecret !== expectedSecret) {
            return Response.json({ 
                error: 'Invalid secret'
            }, { status: 401 });
        }
        
        if (!body.employee_name || !body.department_name || !body.start || !body.end) {
            return Response.json({ 
                error: 'Missing required fields',
                required: ['employee_name', 'department_name', 'start', 'end']
            }, { status: 400 });
        }

        const stores = await base44.asServiceRole.entities.Store.filter({
            name: body.department_name
        });

        if (!stores || stores.length === 0) {
            return Response.json({ 
                error: `Store not found: ${body.department_name}`
            }, { status: 404 });
        }

        const parseDateTime = (dateStr) => {
            if (!dateStr) return new Date().toISOString();
            const parts = dateStr.split(' ');
            if (parts.length === 2) {
                const dateParts = parts[0].split('/');
                if (dateParts.length === 3) {
                    const day = dateParts[0].padStart(2, '0');
                    const month = dateParts[1].padStart(2, '0');
                    const year = dateParts[2];
                    return `${year}-${month}-${day}T${parts[1]}:00`;
                }
            }
            return new Date().toISOString();
        };

        const scheduledStart = parseDateTime(body.start);
        const scheduledEnd = parseDateTime(body.end);

        const shiftData = {
            employee_name: body.employee_name,
            employee_id_external: body.employee_id || null,
            store_name: body.department_name,
            store_id: stores[0].id,
            shift_date: scheduledStart.split('T')[0],
            scheduled_start: scheduledStart,
            scheduled_end: scheduledEnd,
            scheduled_minutes: parseInt(body.minutes) || 0,
            actual_start: body.timeclock_start ? parseDateTime(body.timeclock_start) : null,
            actual_end: body.timeclock_end ? parseDateTime(body.timeclock_end) : null,
            actual_minutes: body.timeclock_minutes ? parseInt(body.timeclock_minutes) : null,
            notes: body.note || '',
            shift_type: body.timesheet_type_name || '',
            employee_group: body.employee_group || null,
            employee_group_name: body.employee_group_name || null,
            function_name: body.function_name || null,
            approved: body.timesheet_approved === '1' || body.timesheet_approved === 1
        };

        const shift = await base44.asServiceRole.entities.Shift.create(shiftData);

        return Response.json({
            success: true,
            shift: {
                id: shift.id,
                employee_name: shift.employee_name,
                store_name: shift.store_name
            }
        }, { status: 201 });

    } catch (error) {
        return Response.json({ 
            error: error.message
        }, { status: 500 });
    }
});