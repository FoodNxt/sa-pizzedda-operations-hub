import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Get credentials from MarketingConfig entity
    const configs = await base44.asServiceRole.entities.MarketingConfig.filter({ config_name: 'meta_ads' });
    
    if (configs.length === 0) {
      return Response.json({ 
        error: 'Meta Ads non configurato. Vai su Marketing Settings per inserire le credenziali.' 
      }, { status: 400 });
    }

    const credentials = configs[0].credentials;
    const ACCESS_TOKEN = credentials.access_token;
    const AD_ACCOUNT_ID = credentials.ad_account_id;

    if (!ACCESS_TOKEN || !AD_ACCOUNT_ID) {
      return Response.json({ 
        error: 'Credenziali Meta Ads incomplete. Completa la configurazione in Marketing Settings.' 
      }, { status: 400 });
    }

    // Calculate date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const dateRangeParams = {
      time_range: JSON.stringify({
        since: startDate.toISOString().split('T')[0],
        until: endDate.toISOString().split('T')[0]
      }),
      time_increment: 1
    };

    // Fetch campaigns
    const campaignsUrl = `https://graph.facebook.com/v18.0/${AD_ACCOUNT_ID}/campaigns?fields=id,name,status&access_token=${ACCESS_TOKEN}`;
    const campaignsResponse = await fetch(campaignsUrl);

    if (!campaignsResponse.ok) {
      const error = await campaignsResponse.text();
      return Response.json({ error: 'Meta API error (campaigns): ' + error }, { status: 500 });
    }

    const campaignsData = await campaignsResponse.json();
    const allInsights = [];

    // Fetch insights for each campaign
    for (const campaign of campaignsData.data || []) {
      const insightsUrl = `https://graph.facebook.com/v18.0/${campaign.id}/insights?fields=impressions,clicks,ctr,spend,reach,actions,action_values,cpc,cpm&level=campaign&${new URLSearchParams(dateRangeParams)}&access_token=${ACCESS_TOKEN}`;
      
      const insightsResponse = await fetch(insightsUrl);
      
      if (!insightsResponse.ok) {
        console.error(`Failed to fetch insights for campaign ${campaign.id}`);
        continue;
      }

      const insightsData = await insightsResponse.json();

      for (const insight of insightsData.data || []) {
        const conversions = insight.actions?.find(a => 
          a.action_type === 'purchase' || a.action_type === 'lead' || a.action_type === 'complete_registration'
        )?.value || 0;

        const conversionValue = insight.action_values?.find(a => 
          a.action_type === 'purchase' || a.action_type === 'omni_purchase'
        )?.value || 0;

        const spend = parseFloat(insight.spend || 0);

        allInsights.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          status: campaign.status,
          date: insight.date_start,
          impressions: parseInt(insight.impressions || 0),
          clicks: parseInt(insight.clicks || 0),
          ctr: parseFloat(insight.ctr || 0),
          spend: spend,
          reach: parseInt(insight.reach || 0),
          conversions: parseFloat(conversions),
          conversion_value: parseFloat(conversionValue),
          cpc: parseFloat(insight.cpc || 0),
          cpm: parseFloat(insight.cpm || 0),
          roas: spend > 0 ? parseFloat(conversionValue) / spend : 0
        });
      }
    }

    // Save to database
    let created = 0;
    for (const insight of allInsights) {
      try {
        // Check if already exists
        const existing = await base44.asServiceRole.entities.MetaAdsCampaign.filter({
          campaign_id: insight.campaign_id,
          date: insight.date
        });

        if (existing.length === 0) {
          await base44.asServiceRole.entities.MetaAdsCampaign.create(insight);
          created++;
        }
      } catch (error) {
        console.error('Error saving campaign:', insight.campaign_name, error.message);
      }
    }

    return Response.json({
      success: true,
      message: `Synced ${allInsights.length} records, ${created} new records created`
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});