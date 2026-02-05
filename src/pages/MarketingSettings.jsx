import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Save, Eye, EyeOff } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";

export default function MarketingSettings() {
  const [showPasswords, setShowPasswords] = useState({});
  const queryClient = useQueryClient();

  const { data: configs = [] } = useQuery({
    queryKey: ['marketing-configs'],
    queryFn: () => base44.entities.MarketingConfig.list()
  });

  const googleConfig = configs.find((c) => c.config_name === 'google_ads');
  const metaConfig = configs.find((c) => c.config_name === 'meta_ads');

  const [googleForm, setGoogleForm] = useState({
    developer_token: '',
    client_id: '',
    client_secret: '',
    refresh_token: '',
    customer_id: ''
  });

  const [metaForm, setMetaForm] = useState({
    access_token: '',
    ad_account_id: ''
  });

  // Update forms when configs are loaded
  React.useEffect(() => {
    if (googleConfig?.credentials) {
      setGoogleForm(googleConfig.credentials);
    }
  }, [googleConfig]);

  React.useEffect(() => {
    if (metaConfig?.credentials) {
      setMetaForm(metaConfig.credentials);
    }
  }, [metaConfig]);

  const saveMutation = useMutation({
    mutationFn: async ({ configName, credentials }) => {
      const existing = configs.find((c) => c.config_name === configName);
      if (existing) {
        return await base44.entities.MarketingConfig.update(existing.id, { credentials });
      } else {
        return await base44.entities.MarketingConfig.create({
          config_name: configName,
          credentials,
          is_active: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-configs'] });
      alert('✅ Configurazione salvata con successo!');
    },
    onError: (error) => {
      alert('❌ Errore nel salvataggio: ' + error.message);
    }
  });

  const handleSaveGoogle = () => {
    saveMutation.mutate({
      configName: 'google_ads',
      credentials: googleForm
    });
  };

  const handleSaveMeta = () => {
    saveMutation.mutate({
      configName: 'meta_ads',
      credentials: metaForm
    });
  };

  const toggleShow = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <ProtectedPage pageName="MarketingSettings" requiredUserTypes={['admin']}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold flex items-center gap-3" style={{ color: '#000000' }}>Configurazione Marketing
          </h1>
          <p style={{ color: '#000000' }}>Inserisci le credenziali per Google Ads e Meta Ads</p>
        </div>

        {/* Google Ads Configuration */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
            🔍 Google Ads API
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Developer Token</label>
              <div className="flex gap-2">
                <input
                  type={showPasswords.google_dev ? "text" : "password"}
                  value={googleForm.developer_token}
                  onChange={(e) => setGoogleForm({ ...googleForm, developer_token: e.target.value })}
                  className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  placeholder="Ottienilo da https://ads.google.com/aw/apicenter" />

                <button onClick={() => toggleShow('google_dev')} className="neumorphic-flat p-3 rounded-xl">
                  {showPasswords.google_dev ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Client ID</label>
              <input
                type="text"
                value={googleForm.client_id}
                onChange={(e) => setGoogleForm({ ...googleForm, client_id: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                placeholder="Da Google Cloud Console → Credentials" />

            </div>

            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Client Secret</label>
              <div className="flex gap-2">
                <input
                  type={showPasswords.google_secret ? "text" : "password"}
                  value={googleForm.client_secret}
                  onChange={(e) => setGoogleForm({ ...googleForm, client_secret: e.target.value })}
                  className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  placeholder="Da Google Cloud Console" />

                <button onClick={() => toggleShow('google_secret')} className="neumorphic-flat p-3 rounded-xl">
                  {showPasswords.google_secret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Refresh Token</label>
              <div className="flex gap-2">
                <input
                  type={showPasswords.google_refresh ? "text" : "password"}
                  value={googleForm.refresh_token}
                  onChange={(e) => setGoogleForm({ ...googleForm, refresh_token: e.target.value })}
                  className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  placeholder="Generalo con OAuth Playground" />

                <button onClick={() => toggleShow('google_refresh')} className="neumorphic-flat p-3 rounded-xl">
                  {showPasswords.google_refresh ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Customer ID</label>
              <input
                type="text"
                value={googleForm.customer_id}
                onChange={(e) => setGoogleForm({ ...googleForm, customer_id: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                placeholder="1234567890 (senza trattini)" />

            </div>

            <NeumorphicButton onClick={handleSaveGoogle} className="w-full flex items-center justify-center gap-2">
              <Save className="w-5 h-5" />
              Salva Google Ads
            </NeumorphicButton>
          </div>
        </NeumorphicCard>

        {/* Meta Ads Configuration */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
            📘 Meta Ads API
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Access Token</label>
              <div className="flex gap-2">
                <input
                  type={showPasswords.meta_token ? "text" : "password"}
                  value={metaForm.access_token}
                  onChange={(e) => setMetaForm({ ...metaForm, access_token: e.target.value })}
                  className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  placeholder="Da https://developers.facebook.com/tools/explorer/" />

                <button onClick={() => toggleShow('meta_token')} className="neumorphic-flat p-3 rounded-xl">
                  {showPasswords.meta_token ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-[#9b9b9b] mt-1">Assicurati di avere i permessi: ads_read, ads_management</p>
            </div>

            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Ad Account ID</label>
              <input
                type="text"
                value={metaForm.ad_account_id}
                onChange={(e) => setMetaForm({ ...metaForm, ad_account_id: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                placeholder="act_XXXXXXXXXX" />

              <p className="text-xs text-[#9b9b9b] mt-1">Trovalo in Meta Business Manager → Impostazioni</p>
            </div>

            <NeumorphicButton onClick={handleSaveMeta} className="w-full flex items-center justify-center gap-2">
              <Save className="w-5 h-5" />
              Salva Meta Ads
            </NeumorphicButton>
          </div>
        </NeumorphicCard>

        {/* Instructions */}
        <NeumorphicCard className="p-6 bg-blue-50">
          <h3 className="font-bold text-[#6b6b6b] mb-3">📋 Guida rapida</h3>
          <div className="space-y-2 text-sm text-[#6b6b6b]">
            <p><strong>Google Ads:</strong></p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Developer Token: vai su Google Ads → Strumenti → API Center</li>
              <li>Client ID/Secret: crea OAuth 2.0 su Google Cloud Console</li>
              <li>Refresh Token: usa OAuth Playground con scope adwords</li>
              <li>Customer ID: nell'angolo in alto a destra di Google Ads</li>
            </ul>
            <p className="mt-3"><strong>Meta Ads:</strong></p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Access Token: Graph API Explorer con permessi ads_read e ads_management</li>
              <li>Ad Account ID: Business Manager → Impostazioni Business → Account pubblicitari</li>
            </ul>
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>);

}