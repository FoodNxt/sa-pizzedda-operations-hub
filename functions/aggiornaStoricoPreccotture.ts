import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

    // Carica tutti i PrecottureForm esistenti
    const precottureForm = await base44.asServiceRole.entities.PrecottureForm.list();
    
    // Carica configurazione impasti per calcolare rosse_richieste
    const impasti = await base44.asServiceRole.entities.GestioneImpasti.list();
    
    // Carica turni per ottenere i nomi dei negozi
    const turni = await base44.asServiceRole.entities.TurnoPlanday.list();

    let aggiornati = 0;

    for (const form of precottureForm) {
      let needsUpdate = false;
      const updates = {};

      // 1. Correggi store_name se vuoto o "N/A"
      if (!form.store_name || form.store_name === 'N/A' || form.store_name === '') {
        // Trova dal turno dell'attività
        const attivita = await base44.asServiceRole.entities.AttivitaCompletata.filter({
          dipendente_id: form.dipendente_id,
          completato_at: { $gte: form.data_compilazione, $lte: form.data_compilazione },
          form_page: 'Precotture'
        });

        if (attivita.length > 0 && attivita[0].turno_id) {
          const turno = turni.find(t => t.id === attivita[0].turno_id);
          if (turno && turno.store_nome) {
            updates.store_name = turno.store_nome;
            needsUpdate = true;
          }
        }
      }

      // 2. Calcola rosse_richieste e rosse_presenti se mancanti
      if (!form.rosse_richieste || !form.rosse_presenti || form.rosse_richieste === 0) {
        const dataCompilazione = new Date(form.data_compilazione);
        const giornoNome = giorni[dataCompilazione.getDay()];
        const storeImpasti = impasti.filter(i => i.store_id === form.store_id);
        const datiGiorno = storeImpasti.find(imp => imp.giorno_settimana === giornoNome);
        
        if (datiGiorno) {
          let rosseRichieste = 0;
          
          if (form.turno === 'pranzo') {
            rosseRichieste = datiGiorno.pranzo_rosse || 0;
          } else if (form.turno === 'pomeriggio') {
            rosseRichieste = datiGiorno.pomeriggio_rosse || 0;
          } else if (form.turno === 'cena') {
            rosseRichieste = datiGiorno.cena_rosse || 0;
          }
          
          // Calcola rosse_presenti da: rosse_presenti = rosse_richieste - rosse_da_fare
          const rossePresenti = Math.max(0, rosseRichieste - (form.rosse_da_fare || 0));
          
          updates.rosse_richieste = rosseRichieste;
          updates.rosse_presenti = rossePresenti;
          needsUpdate = true;
        }
      }

      // Applica gli aggiornamenti se necessari
      if (needsUpdate && Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.PrecottureForm.update(form.id, updates);
        aggiornati++;
      }
    }

    return Response.json({
      success: true,
      totale_form: precottureForm.length,
      aggiornati: aggiornati,
      message: `Aggiornati ${aggiornati} form precotture`
    });
  } catch (error) {
    console.error('Errore aggiornamento precotture:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});