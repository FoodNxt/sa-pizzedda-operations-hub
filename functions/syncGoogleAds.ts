import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Get credentials from MarketingConfig entity
    const configs = await base44.asServiceRole.entities.MarketingConfig.filter({ config_name: 'google_ads' });
    
    if (configs.length === 0) {
      return Response.json({ 
        error: 'Google Ads non configurato. Vai su Marketing Settings per inserire le credenziali.' 
      }, { status: 400 });
    }

    const credentials = configs[0].credentials;
    const DEVELOPER_TOKEN = credentials.developer_token;
    const CLIENT_ID = credentials.client_id;
    const CLIENT_SECRET = credentials.client_secret;
    const REFRESH_TOKEN = credentials.refresh_token;
    const CUSTOMER_ID = credentials.customer_id;

    if (!DEVELOPER_TOKEN || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !CUSTOMER_ID) {
      return Response.json({ 
        error: 'Credenziali Google Ads incomplete. Completa la configurazione in Marketing Settings.' 
      }, { status: 400 });
    }

    // Get access token from refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: 'refresh_token'
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      return Response.json({ error: 'Failed to get access token: ' + error }, { status: 500 });
    }

    const { access_token } = await tokenResponse.json();

    // Query Google Ads API
    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.average_cpc
      FROM campaign
      WHERE segments.date DURING LAST_30_DAYS
      ORDER BY segments.date DESC
    `;

    const adsResponse = await fetch(
      `https://googleads.googleapis.com/v15/customers/${CUSTOMER_ID.replace(/-/g, '')}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'developer-token': DEVELOPER_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      }
    );

    if (!adsResponse.ok) {
      const error = await adsResponse.text();
      return Response.json({ error: 'Google Ads API error: ' + error }, { status: 500 });
    }

    const data = await adsResponse.json();
    const campaigns = [];

    for (const result of data) {
      if (result.results) {
        for (const row of result.results) {
          const campaign = row.campaign;
          const metrics = row.metrics;
          const segments = row.segments;

          const cost = (metrics.costMicros || 0) / 1000000;
          const clicks = metrics.clicks || 0;
          const conversions = metrics.conversions || 0;
          const conversionValue = metrics.conversionsValue || 0;

          campaigns.push({
            campaign_id: campaign.id.toString(),
            campaign_name: campaign.name,
            status: campaign.status,
            date: segments.date,
            impressions: metrics.impressions || 0,
            clicks: clicks,
            ctr: metrics.ctr ? metrics.ctr * 100 : 0,
            cost: cost,
            conversions: conversions,
            conversion_value: conversionValue,
            cpc: clicks > 0 ? cost / clicks : 0,
            cpa: conversions > 0 ? cost / conversions : 0,
            roas: cost > 0 ? conversionValue / cost : 0
          });
        }
      }
    }

    // Save to database
    let created = 0;
    for (const campaign of campaigns) {
      try {
        // Check if already exists
        const existing = await base44.asServiceRole.entities.GoogleAdsCampaign.filter({
          campaign_id: campaign.campaign_id,
          date: campaign.date
        });

        if (existing.length === 0) {
          await base44.asServiceRole.entities.GoogleAdsCampaign.create(campaign);
          created++;
        }
      } catch (error) {
        console.error('Error saving campaign:', campaign.campaign_name, error.message);
      }
    }

    return Response.json({
      success: true,
      message: `Synced ${campaigns.length} records, ${created} new records created`
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});