import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lettera_richiamo_id } = await req.json();

    if (!lettera_richiamo_id) {
      return Response.json({ error: 'Missing lettera_richiamo_id' }, { status: 400 });
    }

    console.log(`Checking automation for lettera_richiamo_id: ${lettera_richiamo_id}`);

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

    // Get lettera richiamo
    const lettereRichiamo = await base44.asServiceRole.entities.LetteraRichiamo.filter({ 
      id: lettera_richiamo_id 
    });
    const letteraRichiamo = lettereRichiamo[0];

    if (!letteraRichiamo) {
      return Response.json({ error: 'Lettera not found' }, { status: 404 });
    }

    // Check if already has chiusura
    const existingChiusure = await base44.asServiceRole.entities.LetteraRichiamo.filter({
      user_id: letteraRichiamo.user_id,
      tipo_lettera: 'chiusura_procedura'
    });

    const hasChiusura = existingChiusure.some(c => 
      new Date(c.data_invio) > new Date(letteraRichiamo.data_invio)
    );

    if (hasChiusura) {
      console.log('Chiusura already sent for this user');
      return Response.json({ message: 'Chiusura already exists' });
    }

    // Check if enough time has passed
    const giorniAttesa = config.giorni_attesa_chiusura || 0;
    const dataVisualizzazione = new Date(letteraRichiamo.data_visualizzazione);
    const oggi = new Date();
    const giorniPassati = Math.floor((oggi - dataVisualizzazione) / (1000 * 60 * 60 * 24));

    console.log(`Giorni attesa: ${giorniAttesa}, Giorni passati: ${giorniPassati}`);

    if (giorniPassati < giorniAttesa) {
      console.log(`Too early to send - waiting ${giorniAttesa - giorniPassati} more days`);
      return Response.json({ 
        message: 'Waiting period not elapsed',
        giorni_rimanenti: giorniAttesa - giorniPassati
      });
    }

    // Get template
    const templates = await base44.asServiceRole.entities.LetteraRichiamoTemplate.filter({ 
      id: config.template_chiusura_id 
    });
    const template = templates[0];

    if (!template) {
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get user
    const users = await base44.asServiceRole.entities.User.filter({ 
      id: letteraRichiamo.user_id 
    });
    const dipendente = users[0];

    if (!dipendente) {
      return Response.json({ error: 'User not found' }, { status: 404 });
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

    return Response.json({ 
      success: true,
      message: 'Chiusura procedura sent successfully'
    });

  } catch (error) {
    console.error('Error in checkAndSendChiusuraProcedura:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});