import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contratto_id, pdf_base64, nome_cognome } = await req.json();

    if (!contratto_id || !pdf_base64 || !nome_cognome) {
      return Response.json({ error: 'Dati mancanti' }, { status: 400 });
    }

    // Get Google Drive access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googledrive");

    // Convert base64 to blob
    const binaryString = atob(pdf_base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create file metadata
    const fileName = `Contratto_${nome_cognome.replace(/\s/g, '_')}_${contratto_id.substring(0, 8)}.pdf`;
    const metadata = {
      name: fileName,
      mimeType: 'application/pdf'
    };

    // Upload to Google Drive
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/pdf\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      pdf_base64 +
      close_delim;

    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`Failed to upload to Drive: ${error}`);
    }

    const uploadResult = await uploadResponse.json();

    // Update contract with Drive file ID
    await base44.asServiceRole.entities.Contratto.update(contratto_id, {
      google_drive_file_id: uploadResult.id,
      google_drive_file_name: fileName
    });

    return Response.json({ 
      success: true,
      file_id: uploadResult.id,
      file_name: fileName,
      message: 'Contratto salvato su Google Drive con successo'
    });

  } catch (error) {
    console.error('Error saving to Drive:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});