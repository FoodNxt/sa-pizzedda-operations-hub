import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { question, projectId, datasetId } = await req.json();
    
    if (!question || !projectId) {
      return Response.json({ error: 'Missing question or projectId' }, { status: 400 });
    }

    // Step 1: Use AI to generate SQL query from natural language
    const sqlGenerationPrompt = `You are a BigQuery SQL expert. Convert the following natural language question into a valid BigQuery SQL query.

Project ID: ${projectId}
${datasetId ? `Dataset ID: ${datasetId}` : ''}

Question: ${question}

Important:
- Use standard SQL syntax (not legacy SQL)
- Use fully qualified table names: \`project.dataset.table\`
- Add LIMIT 100 to prevent large results
- Return ONLY the SQL query, no explanations

SQL Query:`;

    const sqlResponse = await base44.integrations.Core.InvokeLLM({
      prompt: sqlGenerationPrompt
    });

    const sqlQuery = sqlResponse.trim().replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();

    // Step 2: Get BigQuery access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlebigquery");

    // Step 3: Execute query on BigQuery
    const queryResponse = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: sqlQuery,
          useLegacySql: false,
          maxResults: 100
        })
      }
    );

    const queryResult = await queryResponse.json();

    if (!queryResponse.ok) {
      return Response.json({
        error: 'BigQuery error',
        details: queryResult.error?.message || 'Unknown error',
        sqlQuery
      }, { status: 500 });
    }

    // Step 4: Format results for display
    const rows = queryResult.rows || [];
    const schema = queryResult.schema?.fields || [];
    
    const formattedRows = rows.map(row => {
      const formattedRow = {};
      schema.forEach((field, index) => {
        formattedRow[field.name] = row.f[index].v;
      });
      return formattedRow;
    });

    return Response.json({
      success: true,
      sqlQuery,
      data: formattedRows,
      totalRows: queryResult.totalRows,
      jobComplete: queryResult.jobComplete
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});