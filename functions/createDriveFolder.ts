import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { folder_name } = await req.json();

    if (!folder_name) {
      return Response.json({ error: 'Nome cartella mancante' }, { status: 400 });
    }

    // Get Google Drive access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googledrive");

    // Create folder
    const metadata = {
      name: folder_name,
      mimeType: 'application/vnd.google-apps.folder'
    };

    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create folder: ${error}`);
    }

    const result = await response.json();

    return Response.json({ 
      success: true,
      folder_id: result.id,
      folder_name: result.name
    });

  } catch (error) {
    console.error('Error creating Drive folder:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});