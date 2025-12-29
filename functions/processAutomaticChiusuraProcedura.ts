import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Service role - this is a scheduled/admin function
    console.log('Processing automatic chiusura procedura...');

    // Get config
    const configs = await base44.asServiceRole.entities.LettereConfig.list();
    const config = configs[0];

    if (!config || !config.invio_automatico_chiusura) {
      console.log('Automation not enabled');
      return Response.json({ message: 'Automation not enabled' });
    }

    if (!config.template_chiusura_id) {
      console.log('No template configured');
      return Response.json({ error: 'No chiusura template configured' }, { status: 400 });
    }

    // Get template
    const templates = await base44.asServiceRole.entities.LetteraRichiamoTemplate.filter({ 
      id: config.template_chiusura_id 
    });
    const template = templates[0];

    if (!template) {
      console.log('Template not found');
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get all lettere richiamo that have been visualized
    const lettereRichiamo = await base44.asServiceRole.entities.LetteraRichiamo.filter({
      tipo_lettera: 'lettera_richiamo',
      data_visualizzazione: { $exists: true, $ne: null }
    });

    console.log(`Found ${lettereRichiamo.length} visualized lettere richiamo`);

    let sent = 0;
    const giorniAttesa = config.giorni_attesa_chiusura || 0;
    const oggi = new Date();

    for (const letteraRichiamo of lettereRichiamo) {
      try {
        // Check if already has chiusura
        const existingChiusure = await base44.asServiceRole.entities.LetteraRichiamo.filter({
          user_id: letteraRichiamo.user_id,
          tipo_lettera: 'chiusura_procedura'
        });

        const hasRecentChiusura = existingChiusure.some(c => 
          new Date(c.data_invio) > new Date(letteraRichiamo.data_invio)
        );

        if (hasRecentChiusura) {
          console.log(`User ${letteraRichiamo.user_email} already has chiusura`);
          continue;
        }

        // Check if enough time has passed
        const dataVisualizzazione = new Date(letteraRichiamo.data_visualizzazione);
        const giorniPassati = Math.floor((oggi - dataVisualizzazione) / (1000 * 60 * 60 * 24));

        console.log(`User ${letteraRichiamo.user_email}: ${giorniPassati} days since visualization (need ${giorniAttesa})`);

        if (giorniPassati < giorniAttesa) {
          continue;
        }

        // Get user
        const users = await base44.asServiceRole.entities.User.filter({ 
          id: letteraRichiamo.user_id 
        });
        const dipendente = users[0];

        if (!dipendente) {
          console.log(`User ${letteraRichiamo.user_id} not found`);
          continue;
        }

        // Generate content
        let contenuto = template.contenuto;
        contenuto = contenuto.replace(/{{nome_dipendente}}/g, dipendente.nome_cognome || dipendente.full_name || dipendente.email);
        contenuto = contenuto.replace(/{{data_oggi}}/g, new Date().toLocaleDateString('it-IT'));
        
        if (letteraRichiamo.data_invio) {
          contenuto = contenuto.replace(/{{data_invio_richiamo}}/g, new Date(letteraRichiamo.data_invio).toLocaleDateString('it-IT'));
        }
        if (letteraRichiamo.data_firma) {
          const dataFirma = new Date(letteraRichiamo.data_firma);
          contenuto = contenuto.replace(/{{data_firma_richiamo}}/g, dataFirma.toLocaleDateString('it-IT'));
          const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
          contenuto = contenuto.replace(/{{mese_firma_richiamo}}/g, mesi[dataFirma.getMonth()] + ' ' + dataFirma.getFullYear());
        }
        if (letteraRichiamo.contenuto_lettera) {
          contenuto = contenuto.replace(/{{testo_lettera_richiamo}}/g, letteraRichiamo.contenuto_lettera);
        }

        // Create chiusura procedura
        await base44.asServiceRole.entities.LetteraRichiamo.create({
          user_id: dipendente.id,
          user_email: dipendente.email,
          user_name: dipendente.nome_cognome || dipendente.full_name || dipendente.email,
          tipo_lettera: 'chiusura_procedura',
          contenuto_lettera: contenuto,
          data_invio: new Date().toISOString(),
          status: 'inviata'
        });

        console.log(`✓ Chiusura procedura sent for user ${dipendente.email}`);
        sent++;

      } catch (error) {
        console.error(`Error processing lettera ${letteraRichiamo.id}:`, error);
      }
    }

    console.log(`Process completed: ${sent} chiusure sent`);

    return Response.json({ 
      success: true,
      processed: lettereRichiamo.length,
      sent: sent
    });

  } catch (error) {
    console.error('Error in processAutomaticChiusuraProcedura:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});