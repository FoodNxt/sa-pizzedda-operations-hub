import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Parse request body
        let body;
        try {
            const text = await req.text();
            body = JSON.parse(text);
        } catch (parseError) {
            return Response.json({ 
                error: 'Invalid JSON in request body',
                details: parseError.message 
            }, { status: 400 });
        }
        
        // Validate webhook secret
        const providedSecret = body.secret;
        const expectedSecret = Deno.env.get('ZAPIER_SHIFTS_WEBHOOK_SECRET');
        
        if (!expectedSecret) {
            return Response.json({ 
                error: 'Server configuration error: ZAPIER_SHIFTS_WEBHOOK_SECRET not set',
                hint: 'Set ZAPIER_SHIFTS_WEBHOOK_SECRET in Dashboard → Code → Secrets'
            }, { status: 500 });
        }
        
        if (!providedSecret || providedSecret !== expectedSecret) {
            return Response.json({ 
                error: 'Unauthorized: Invalid or missing webhook secret',
                hint: 'Make sure the "secret" field matches your ZAPIER_SHIFTS_WEBHOOK_SECRET'
            }, { status: 401 });
        }
        
        // Validate required fields
        if (!body.employee_name) {
            return Response.json({ 
                error: 'Campo obbligatorio mancante: employee_name',
                received_fields: Object.keys(body)
            }, { status: 400 });
        }

        if (!body.department_name) {
            return Response.json({ 
                error: 'Campo obbligatorio mancante: department_name (nome locale)',
                received_fields: Object.keys(body)
            }, { status: 400 });
        }

        if (!body.start || !body.end) {
            return Response.json({ 
                error: 'Campi obbligatori mancanti: start e end',
                received_fields: Object.keys(body)
            }, { status: 400 });
        }

        // Find employee by name
        const employees = await base44.asServiceRole.entities.Employee.filter({
            full_name: body.employee_name
        });

        if (!employees || employees.length === 0) {
            const allEmployees = await base44.asServiceRole.entities.Employee.list();
            return Response.json({ 
                error: `Dipendente non trovato: "${body.employee_name}". Verifica che il nome sia esatto.`,
                available_employees: allEmployees.map(e => e.full_name),
                received: body.employee_name
            }, { status: 404 });
        }

        const employee = employees[0];

        // Find store by department name
        const stores = await base44.asServiceRole.entities.Store.filter({
            name: body.department_name
        });

        if (!stores || stores.length === 0) {
            const allStores = await base44.asServiceRole.entities.Store.list();
            return Response.json({ 
                error: `Locale non trovato: "${body.department_name}". Verifica che il nome sia esatto.`,
                available_stores: allStores.map(s => s.name),
                received: body.department_name
            }, { status: 404 });
        }

        const store = stores[0];

        // Parse datetime (format: DD/MM/YYYY HH:MM)
        const parseDateTime = (dateStr) => {
            if (!dateStr) return new Date().toISOString();
            
            // Format: 30/09/2025 09:30
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
        const actualStart = body.timeclock_start ? parseDateTime(body.timeclock_start) : null;
        const actualEnd = body.timeclock_end ? parseDateTime(body.timeclock_end) : null;

        // Create shift
        const shiftData = {
            employee_name: body.employee_name,
            employee_id_external: body.employee_id || null,
            store_name: body.department_name,
            store_id: store.id,
            shift_date: scheduledStart.split('T')[0],
            scheduled_start: scheduledStart,
            scheduled_end: scheduledEnd,
            scheduled_minutes: parseInt(body.minutes) || 0,
            actual_start: actualStart,
            actual_end: actualEnd,
            actual_minutes: body.timeclock_minutes ? parseInt(body.timeclock_minutes) : null,
            notes: body.note || '',
            shift_type: body.timesheet_type_name || '',
            employee_group: body.employee_group || null,
            function_name: body.function_name || null,
            approved: body.timesheet_approved === '1' || body.timesheet_approved === 1 || body.timesheet_approved === true
        };

        const shift = await base44.asServiceRole.entities.Shift.create(shiftData);

        return Response.json({
            success: true,
            message: 'Turno importato con successo',
            shift: {
                id: shift.id,
                employee_name: shift.employee_name,
                store_name: shift.store_name,
                shift_date: shift.shift_date,
                scheduled_start: shift.scheduled_start,
                scheduled_end: shift.scheduled_end
            }
        }, { status: 201 });

    } catch (error) {
        console.error('Error importing shift:', error);
        return Response.json({ 
            error: 'Errore durante l\'importazione del turno',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});