import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Google Drive access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googledrive");

    // List folders in Drive - only those created by this app or explicitly shared
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder' and 'me' in owners&fields=files(id,name,createdTime)&orderBy=createdTime desc`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list folders: ${error}`);
    }

    const data = await response.json();

    return Response.json({ 
      success: true,
      folders: data.files || []
    });

  } catch (error) {
    console.error('Error listing Drive folders:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});