import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Temporary debug function - test Twilio SMS directly and return full response
Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!accountSid || !authToken) {
        return Response.json({ error: 'Twilio credentials missing', accountSid: !!accountSid, authToken: !!authToken });
    }

    const fromNumber = '+393515293557';
    const toNumber = '+393399942256';
    const smsBody = `13505360969*RSLHSN96T01Z249C*15032026`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = btoa(`${accountSid}:${authToken}`);

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

    return Response.json({
        http_status: twilioRes.status,
        ok: twilioRes.ok,
        twilio_response: twilioJson,
        sms_body_sent: smsBody,
        from: fromNumber,
        to: toNumber
    });
});