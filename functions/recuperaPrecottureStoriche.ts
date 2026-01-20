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

    // Controlla quali sono già salvate in PrecottureForm
    const precottureFormEsistenti = await base44.asServiceRole.entities.PrecottureForm.list();
    const esistentiSet = new Set(
      precottureFormEsistenti.map(p => 
        `${p.dipendente_id}_${p.store_id}_${p.data_compilazione.split('T')[0]}_${p.turno}`
      )
    );

    const daRecuperare = [];

    for (const attivita of attivitaPrecotture) {
      const chiave = `${attivita.dipendente_id}_${attivita.store_id}_${attivita.completato_at.split('T')[0]}_${attivita.turno_precotture}`;
      
      if (!esistentiSet.has(chiave)) {
        daRecuperare.push({
          store_id: attivita.store_id,
          store_name: attivita.store_name || 'N/A',
          dipendente_id: attivita.dipendente_id,
          dipendente_nome: attivita.dipendente_nome,
          data_compilazione: attivita.completato_at,
          turno: attivita.turno_precotture,
          rosse_presenti: attivita.rosse_presenti || 0,
          rosse_richieste: attivita.rosse_richieste || 0,
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