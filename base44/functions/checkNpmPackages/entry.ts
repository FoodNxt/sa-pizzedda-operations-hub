import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

const NOTIFY_EMAIL = 'admin@sapizzedda.it';

// Pacchetti usati nelle funzioni backend con la versione attuale
const PACKAGES = [
    { name: 'jspdf', current: '4.0.0' },
    { name: 'date-fns', current: '4.1.0' },
    { name: 'openai', current: null }, // check solo major
    { name: 'fast-xml-parser', current: null }
];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const updates = [];

        for (const pkg of PACKAGES) {
            try {
                const res = await fetch(`https://registry.npmjs.org/${pkg.name}/latest`);
                if (!res.ok) continue;

                const data = await res.json();
                const latestVersion = data.version;

                if (!latestVersion) continue;

                const latestMajor = parseInt(latestVersion.split('.')[0]);
                const currentMajor = pkg.current ? parseInt(pkg.current.split('.')[0]) : null;

                // Alert on major version bump (breaking changes)
                if (currentMajor !== null && latestMajor > currentMajor) {
                    updates.push({
                        name: pkg.name,
                        current: pkg.current,
                        latest: latestVersion,
                        type: 'MAJOR (breaking)'
                    });
                } else if (pkg.current && latestVersion !== pkg.current) {
                    // Just log minor/patch, don't alert
                    console.log(`${pkg.name}: ${pkg.current} → ${latestVersion} (minor/patch)`);
                }
            } catch (err) {
                console.error(`Error checking ${pkg.name}:`, err.message);
            }
        }

        console.log(`npm check: ${updates.length} major updates found`);

        if (updates.length > 0) {
            const rows = updates.map(u =>
                `<tr>
                    <td style="padding: 8px 16px; border: 1px solid #ddd; font-weight: bold;">${u.name}</td>
                    <td style="padding: 8px 16px; border: 1px solid #ddd;">${u.current || 'N/A'}</td>
                    <td style="padding: 8px 16px; border: 1px solid #ddd; color: #dc2626; font-weight: bold;">${u.latest}</td>
                    <td style="padding: 8px 16px; border: 1px solid #ddd;">${u.type}</td>
                </tr>`
            ).join('');

            const emailBody = `
<h2>📦 Aggiornamenti Major Pacchetti npm</h2>
<p>I seguenti pacchetti usati nelle funzioni backend hanno una nuova major version (possibili breaking changes):</p>
<table style="border-collapse: collapse; margin: 16px 0;">
    <tr>
        <th style="padding: 8px 16px; border: 1px solid #ddd; background: #f1f5f9;">Pacchetto</th>
        <th style="padding: 8px 16px; border: 1px solid #ddd; background: #f1f5f9;">Attuale</th>
        <th style="padding: 8px 16px; border: 1px solid #ddd; background: #f1f5f9;">Disponibile</th>
        <th style="padding: 8px 16px; border: 1px solid #ddd; background: #f1f5f9;">Tipo</th>
    </tr>
    ${rows}
</table>
<p>Verifica la compatibilità prima di aggiornare.</p>
<p style="color: #64748b; font-size: 12px;">Controllo automatico settimanale - Sa Pizzedda</p>`;

            await base44.asServiceRole.integrations.Core.SendEmail({
                to: NOTIFY_EMAIL,
                subject: `[Sa Pizzedda] 📦 ${updates.length} pacchetto/i npm con major update`,
                body: emailBody,
                from_name: 'Sa Pizzedda - Sistema'
            });
        }

        return Response.json({
            status: updates.length === 0 ? 'all_ok' : 'updates_found',
            updates
        });

    } catch (error) {
        console.error('checkNpmPackages error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});