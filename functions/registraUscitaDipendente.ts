import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import moment from 'npm:moment@2.30.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const payload = await req.json();
    const {
      dipendente_id,
      dipendente_nome,
      tipo_uscita,
      data_uscita,
      turni_futuri_liberi,
      note
    } = payload;

    // Create Uscita record
    const uscitaRecord = await base44.asServiceRole.entities.Uscita.create({
      dipendente_id,
      dipendente_nome,
      tipo_uscita,
      data_uscita,
      turni_futuri_liberi,
      note,
      registrato_da: user.email,
      registrato_il: new Date().toISOString()
    });

    // If turni_futuri_liberi is true, free all future shifts
    let turniLiberati = 0;
    if (turni_futuri_liberi) {
      const allTurni = await base44.asServiceRole.entities.TurnoPlanday.filter({
        dipendente_id: dipendente_id
      });

      const dataUscitaMoment = moment(data_uscita);
      const turniDaLiberare = allTurni.filter(turno => {
        const turnoDate = moment(turno.data);
        return turnoDate.isSameOrAfter(dataUscitaMoment);
      });

      // Update each turno to make it unassigned
      for (const turno of turniDaLiberare) {
        await base44.asServiceRole.entities.TurnoPlanday.update(turno.id, {
          dipendente_id: null,
          stato: 'programmato'
        });
        turniLiberati++;
      }

      // Update the Uscita record with count
      await base44.asServiceRole.entities.Uscita.update(uscitaRecord.id, {
        turni_liberati_count: turniLiberati
      });
    }

    return Response.json({
      success: true,
      uscitaId: uscitaRecord.id,
      turniLiberati
    });
  } catch (error) {
    console.error('Error registering exit:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});