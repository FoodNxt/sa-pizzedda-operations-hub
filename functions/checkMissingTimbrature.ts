import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Questa funzione deve essere schedulata per essere eseguita ogni 15 minuti
// tramite un sistema di cron job esterno (es: cron-job.org, EasyCron, etc.)

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verifica configurazione alert
    const configs = await base44.asServiceRole.entities.TimbraturaConfig.list();
    const config = configs[0];
    
    if (!config || !config.alert_enabled) {
      return Response.json({ 
        message: 'Alert disabilitati',
        checked: 0,
        alerts_sent: 0
      });
    }
    
    const minutiRitardo = config.alert_minuti_ritardo || 15;
    const whatsappNumber = config.alert_whatsapp_number;
    const notifyManagers = config.alert_notify_managers !== false;
    
    if (!whatsappNumber) {
      return Response.json({ 
        error: 'Numero WhatsApp non configurato',
        message: 'Configurare il numero WhatsApp nelle impostazioni'
      }, { status: 400 });
    }
    
    // Ottieni data e ora corrente
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.getTime();
    
    // Carica turni di oggi
    const turni = await base44.asServiceRole.entities.TurnoPlanday.filter({
      data: today
    });
    
    const stores = await base44.asServiceRole.entities.Store.list();
    const users = await base44.asServiceRole.entities.User.list();
    
    let alertsSent = 0;
    const alertMessages = [];
    
    // Controlla ogni turno
    for (const turno of turni) {
      // Salta se già timbrato
      if (turno.timbrata_entrata) continue;
      
      // Calcola se è in ritardo
      const scheduledStart = new Date(`${turno.data} ${turno.ora_inizio}`);
      const minutiPassati = Math.floor((currentTime - scheduledStart.getTime()) / (1000 * 60));
      
      // Salta se non ancora in ritardo
      if (minutiPassati < minutiRitardo) continue;
      
      // Verifica se è già stato inviato un alert per questo turno
      // (usando un campo aggiuntivo alert_sent_at nel turno)
      if (turno.alert_sent_at) continue;
      
      // Prepara messaggio alert
      const storeName = stores.find(s => s.id === turno.store_id)?.name || 'Locale sconosciuto';
      const dipendenteNome = turno.dipendente_nome || 'Dipendente sconosciuto';
      
      let message = `🚨 ALERT TIMBRATURA MANCANTE\n\n`;
      message += `📅 Data: ${new Date(turno.data).toLocaleDateString('it-IT')}\n`;
      message += `👤 Dipendente: ${dipendenteNome}\n`;
      message += `🏪 Locale: ${storeName}\n`;
      message += `⏰ Turno: ${turno.ora_inizio} - ${turno.ora_fine}\n`;
      message += `🔴 Ruolo: ${turno.ruolo}\n\n`;
      message += `⚠️ Sono passati ${minutiPassati} minuti dall'inizio del turno e non è stata ancora effettuata la timbratura di entrata.`;
      
      alertMessages.push({
        turno_id: turno.id,
        message,
        recipient: whatsappNumber,
        dipendente: dipendenteNome
      });
      
      // Notifica anche i manager se abilitato
      if (notifyManagers) {
        const storeManagers = users.filter(u => 
          u.ruoli_dipendente?.includes('Store Manager') &&
          u.assigned_stores?.includes(turno.store_id)
        );
        
        for (const manager of storeManagers) {
          if (manager.phone) {
            alertMessages.push({
              turno_id: turno.id,
              message: `[Manager Alert] ${message}`,
              recipient: manager.phone,
              dipendente: dipendenteNome
            });
          }
        }
      }
      
      // Marca come alert inviato
      await base44.asServiceRole.entities.TurnoPlanday.update(turno.id, {
        alert_sent_at: now.toISOString()
      });
      
      alertsSent++;
    }
    
    // IMPORTANTE: Per inviare i messaggi WhatsApp, devi integrare con un servizio
    // come Twilio, WhatsApp Business API, o un servizio simile.
    // Questa è solo la logica di rilevamento - l'invio effettivo richiede
    // un'integrazione WhatsApp esterna.
    
    // Esempio pseudo-codice per l'invio (da implementare con il tuo provider):
    // for (const alert of alertMessages) {
    //   await sendWhatsAppMessage(alert.recipient, alert.message);
    // }
    
    return Response.json({
      success: true,
      checked: turni.length,
      alerts_detected: alertsSent,
      messages_to_send: alertMessages.length,
      alerts: alertMessages,
      note: 'Per inviare i messaggi WhatsApp, integrare con un servizio come Twilio WhatsApp API'
    });
    
  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});