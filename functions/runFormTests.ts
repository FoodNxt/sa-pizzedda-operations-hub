import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.user_type !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { test_case_id } = await req.json();

    // Se è specificato un test case, esegui solo quello, altrimenti tutti
    const testCases = test_case_id 
      ? await base44.asServiceRole.entities.FormTestCase.filter({ id: test_case_id, is_active: true })
      : await base44.asServiceRole.entities.FormTestCase.filter({ is_active: true });

    if (testCases.length === 0) {
      return Response.json({ error: 'Nessun test case trovato' }, { status: 404 });
    }

    // Ottieni tutti i dipendenti
    const allUsers = await base44.asServiceRole.entities.User.list();
    const dipendenti = allUsers.filter(u => u.ruoli_dipendente && u.ruoli_dipendente.length > 0);

    const testRunId = `run_${Date.now()}`;
    const results = [];

    // Esegui i test
    for (const testCase of testCases) {
      // Filtra dipendenti per ruolo se specificato
      const targetDipendenti = testCase.required_role
        ? dipendenti.filter(d => d.ruoli_dipendente.includes(testCase.required_role))
        : dipendenti;

      for (const dipendente of targetDipendenti) {
        const startTime = Date.now();
        let success = false;
        let statusCode = 0;
        let errorMessage = null;
        let responseData = null;

        try {
          // Prepara i dati di test con info dipendente
          const testData = {
            ...testCase.test_data,
            dipendente_id: dipendente.id,
            dipendente_nome: dipendente.nome_cognome || dipendente.full_name
          };

          // Esegui la creazione dell'entità
          const response = await base44.asServiceRole.entities[testCase.entity_name].create(testData);
          
          success = true;
          statusCode = 200;
          responseData = response;
        } catch (error) {
          success = false;
          statusCode = error.status || 500;
          errorMessage = error.message || 'Unknown error';
          responseData = { error: errorMessage };
        }

        const executionTime = Date.now() - startTime;

        // Salva il risultato
        const result = await base44.asServiceRole.entities.FormTestResult.create({
          test_case_id: testCase.id,
          form_name: testCase.form_name,
          dipendente_id: dipendente.id,
          dipendente_nome: dipendente.nome_cognome || dipendente.full_name,
          success,
          status_code: statusCode,
          error_message: errorMessage,
          request_data: testCase.test_data,
          response_data: responseData,
          execution_time_ms: executionTime,
          test_run_id: testRunId
        });

        results.push(result);
      }
    }

    // Calcola statistiche
    const totalTests = results.length;
    const successfulTests = results.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    const successRate = totalTests > 0 ? (successfulTests / totalTests * 100).toFixed(2) : 0;

    return Response.json({
      test_run_id: testRunId,
      total_tests: totalTests,
      successful: successfulTests,
      failed: failedTests,
      success_rate: successRate,
      results: results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});