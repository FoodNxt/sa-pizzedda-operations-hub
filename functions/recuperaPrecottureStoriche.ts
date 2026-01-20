import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Recupera tutte le attività completate di tipo Precotture
    const attivitaPrecotture = await base44.asServiceRole.entities.AttivitaCompletata.filter({
      form_page: 'Precotture'
    });

    console.log(`Trovate ${attivitaPrecotture.length} attività precotture`);

    // Carica configurazione impasti per calcolare rosse_richieste
    const impasti = await base44.asServiceRole.entities.GestioneImpasti.list();
    const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

    // Controlla quali sono già salvate in PrecottureForm
    const precottureFormEsistenti = await base44.asServiceRole.entities.PrecottureForm.list();
    const esistentiSet = new Set(
      precottureFormEsistenti.map(p => 
        `${p.dipendente_id}_${p.store_id}_${p.data_compilazione.split('T')[0]}_${p.turno}`
      )
    );

    const daRecuperare = [];

    // Carica anche i turni per identificare i negozi
    const turni = await base44.asServiceRole.entities.TurnoPlanday.list();

    for (const attivita of attivitaPrecotture) {
      const chiave = `${attivita.dipendente_id}_${attivita.store_id}_${attivita.completato_at.split('T')[0]}_${attivita.turno_precotture}`;
      
      if (!esistentiSet.has(chiave) && attivita.turno_precotture) {
        // Calcola rosse_richieste e rosse_presenti se non disponibili
        let rosseRichieste = attivita.rosse_richieste || 0;
        let rossePresenti = attivita.rosse_presenti || 0;
        
        if (!attivita.rosse_richieste || !attivita.rosse_presenti) {
          // Prova a ricavare dalla configurazione
          const dataCompilazione = new Date(attivita.completato_at);
          const giornoNome = giorni[dataCompilazione.getDay()];
          const storeImpasti = impasti.filter(i => i.store_id === attivita.store_id);
          const datiGiorno = storeImpasti.find(imp => imp.giorno_settimana === giornoNome);
          
          if (datiGiorno) {
            if (attivita.turno_precotture === 'pranzo') {
              rosseRichieste = datiGiorno.pranzo_rosse || 0;
            } else if (attivita.turno_precotture === 'pomeriggio') {
              rosseRichieste = datiGiorno.pomeriggio_rosse || 0;
            } else if (attivita.turno_precotture === 'cena') {
              rosseRichieste = datiGiorno.cena_rosse || 0;
            }
            
            // Calcola rosse_presenti da: rosse_presenti = rosse_richieste - rosse_da_fare
            rossePresenti = Math.max(0, rosseRichieste - (attivita.rosse_da_fare || 0));
          }
        }

        // Trova il negozio corretto dal turno del dipendente
        let storeName = attivita.store_name || 'N/A';
        if (attivita.turno_id) {
          const turno = turni.find(t => t.id === attivita.turno_id);
          if (turno && turno.store_nome) {
            storeName = turno.store_nome;
          }
        }
        
        daRecuperare.push({
          store_id: attivita.store_id,
          store_name: storeName,
          dipendente_id: attivita.dipendente_id,
          dipendente_nome: attivita.dipendente_nome,
          data_compilazione: attivita.completato_at,
          turno: attivita.turno_precotture,
          rosse_presenti: rossePresenti,
          rosse_richieste: rosseRichieste,
          rosse_da_fare: attivita.rosse_da_fare || 0
        });
      }
    }

    console.log(`Da recuperare: ${daRecuperare.length} record`);

    // Salva in blocco
    if (daRecuperare.length > 0) {
      await base44.asServiceRole.entities.PrecottureForm.bulkCreate(daRecuperare);
    }

    return Response.json({
      success: true,
      totale_attivita: attivitaPrecotture.length,
      gia_salvati: precottureFormEsistenti.length,
      recuperati: daRecuperare.length,
      message: `Recuperati ${daRecuperare.length} form precotture storici`
    });
  } catch (error) {
    console.error('Errore recupero precotture:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});