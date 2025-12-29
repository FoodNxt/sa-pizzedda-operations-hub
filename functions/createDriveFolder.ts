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

    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('Drive API error:', error);
      throw new Error(`Failed to create folder: ${error}`);
    }

    const result = await createResponse.json();

    // Share the folder with the user to make it visible
    const permissionResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${result.id}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'writer',
        type: 'user',
        emailAddress: user.email
      })
    });

    if (!permissionResponse.ok) {
      console.warn('Failed to set permissions, but folder was created:', await permissionResponse.text());
    }

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