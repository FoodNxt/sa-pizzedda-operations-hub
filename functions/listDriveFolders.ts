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

    // List ALL folders visible to the user (not restricted to owned only)
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name,createdTime,ownedByMe,shared)&orderBy=createdTime desc&pageSize=100`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Drive API error:', errorText);
      throw new Error(`Failed to list folders: ${errorText}`);
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