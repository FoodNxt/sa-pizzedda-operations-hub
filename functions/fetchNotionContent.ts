import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notion_url } = await req.json();
    
    if (!notion_url) {
      return Response.json({ error: 'URL Notion mancante' }, { status: 400 });
    }

    // Estrai l'ID della pagina dall'URL
    // Formati supportati:
    // https://www.notion.so/Titolo-Pagina-abc123def456...
    // https://www.notion.so/workspace/abc123def456...
    // https://notion.so/abc123def456...
    let pageId = null;
    
    const urlMatch = notion_url.match(/([a-f0-9]{32})|([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (urlMatch) {
      pageId = urlMatch[0].replace(/-/g, '');
    }
    
    if (!pageId) {
      return Response.json({ error: 'Impossibile estrarre l\'ID della pagina dall\'URL' }, { status: 400 });
    }

    // Ottieni l'access token dal connector
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("notion");

    // Recupera i blocchi della pagina
    const blocksResponse = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28'
      }
    });

    if (!blocksResponse.ok) {
      const errorData = await blocksResponse.text();
      console.error('Notion API error:', errorData);
      return Response.json({ 
        error: 'Per importare questa pagina, vai su Notion, apri la pagina, clicca sui 3 puntini in alto a destra, seleziona "Connessioni" e aggiungi "Base44". Poi riprova.' 
      }, { status: 400 });
    }

    const blocksData = await blocksResponse.json();
    
    // Recupera anche i dettagli della pagina per il titolo
    const pageResponse = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28'
      }
    });

    let titolo = '';
    if (pageResponse.ok) {
      const pageData = await pageResponse.json();
      // Estrai il titolo dalla pagina
      if (pageData.properties?.title?.title?.[0]?.plain_text) {
        titolo = pageData.properties.title.title[0].plain_text;
      } else if (pageData.properties?.Name?.title?.[0]?.plain_text) {
        titolo = pageData.properties.Name.title[0].plain_text;
      }
    }

    // Estrai il testo dai blocchi
    const extractText = (blocks) => {
      let text = '';
      for (const block of blocks) {
        const type = block.type;
        const content = block[type];
        
        if (content?.rich_text) {
          const blockText = content.rich_text.map(t => t.plain_text).join('');
          if (blockText) {
            if (type === 'heading_1') {
              text += `\n# ${blockText}\n`;
            } else if (type === 'heading_2') {
              text += `\n## ${blockText}\n`;
            } else if (type === 'heading_3') {
              text += `\n### ${blockText}\n`;
            } else if (type === 'bulleted_list_item') {
              text += `• ${blockText}\n`;
            } else if (type === 'numbered_list_item') {
              text += `- ${blockText}\n`;
            } else if (type === 'to_do') {
              const checked = content.checked ? '☑' : '☐';
              text += `${checked} ${blockText}\n`;
            } else {
              text += `${blockText}\n`;
            }
          }
        } else if (type === 'divider') {
          text += '\n---\n';
        } else if (type === 'code') {
          const codeText = content.rich_text?.map(t => t.plain_text).join('') || '';
          text += `\n\`\`\`\n${codeText}\n\`\`\`\n`;
        }
      }
      return text.trim();
    };

    const contenuto = extractText(blocksData.results);

    return Response.json({ 
      contenuto: contenuto || 'Nessun contenuto trovato nella pagina.',
      titolo 
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});