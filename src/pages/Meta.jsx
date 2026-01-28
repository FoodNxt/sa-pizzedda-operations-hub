import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, MousePointerClick, Eye, DollarSign, Target, RefreshCw, Calendar, Users } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import ProtectedPage from "../components/ProtectedPage";

export default function Meta() {
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [syncing, setSyncing] = useState(false);

  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['meta-ads-campaigns'],
    queryFn: () => base44.entities.MetaAdsCampaign.list('-date', 1000)
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('syncMetaAds', {});
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-ads-campaigns'] });
    }
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncMutation.mutateAsync();
      alert('✅ Dati sincronizzati con successo!');
    } catch (error) {
      alert('Errore sincronizzazione: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns;

    if (dateRange === 'month') {
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());
      filtered = filtered.filter((c) => {
        const date = parseISO(c.date);
        return date >= monthStart && date <= monthEnd;
      });
    } else if (dateRange === 'custom') {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      filtered = filtered.filter((c) => {
        const date = parseISO(c.date);
        return date >= start && date <= end;
      });
    }

    return filtered;
  }, [campaigns, dateRange, startDate, endDate]);

  const stats = useMemo(() => {
    return {
      totalSpend: filteredCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0),
      totalClicks: filteredCampaigns.reduce((sum, c) => sum + (c.clicks || 0), 0),
      totalImpressions: filteredCampaigns.reduce((sum, c) => sum + (c.impressions || 0), 0),
      totalReach: filteredCampaigns.reduce((sum, c) => sum + (c.reach || 0), 0),
      totalConversions: filteredCampaigns.reduce((sum, c) => sum + (c.conversions || 0), 0),
      totalConversionValue: filteredCampaigns.reduce((sum, c) => sum + (c.conversion_value || 0), 0),
      avgCTR: filteredCampaigns.length > 0 ?
      filteredCampaigns.reduce((sum, c) => sum + (c.ctr || 0), 0) / filteredCampaigns.length :
      0,
      avgROAS: filteredCampaigns.length > 0 ?
      filteredCampaigns.reduce((sum, c) => sum + (c.roas || 0), 0) / filteredCampaigns.length :
      0
    };
  }, [filteredCampaigns]);

  const chartData = useMemo(() => {
    const byDate = {};
    filteredCampaigns.forEach((c) => {
      const dateKey = format(parseISO(c.date), 'dd/MM', { locale: it });
      if (!byDate[dateKey]) {
        byDate[dateKey] = { date: dateKey, spend: 0, clicks: 0, conversions: 0, reach: 0 };
      }
      byDate[dateKey].spend += c.spend || 0;
      byDate[dateKey].clicks += c.clicks || 0;
      byDate[dateKey].conversions += c.conversions || 0;
      byDate[dateKey].reach += c.reach || 0;
    });

    return Object.values(byDate).sort((a, b) => {
      const [dayA, monthA] = a.date.split('/').map(Number);
      const [dayB, monthB] = b.date.split('/').map(Number);
      return monthA !== monthB ? monthA - monthB : dayA - dayB;
    });
  }, [filteredCampaigns]);

  const campaignPerformance = useMemo(() => {
    const byCampaign = {};
    filteredCampaigns.forEach((c) => {
      if (!byCampaign[c.campaign_id]) {
        byCampaign[c.campaign_id] = {
          name: c.campaign_name,
          spend: 0,
          clicks: 0,
          conversions: 0,
          conversionValue: 0,
          impressions: 0,
          reach: 0
        };
      }
      byCampaign[c.campaign_id].spend += c.spend || 0;
      byCampaign[c.campaign_id].clicks += c.clicks || 0;
      byCampaign[c.campaign_id].conversions += c.conversions || 0;
      byCampaign[c.campaign_id].conversionValue += c.conversion_value || 0;
      byCampaign[c.campaign_id].impressions += c.impressions || 0;
      byCampaign[c.campaign_id].reach += c.reach || 0;
    });

    return Object.values(byCampaign).map((c) => ({
      ...c,
      ctr: c.impressions > 0 ? c.clicks / c.impressions * 100 : 0,
      cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
      cpm: c.impressions > 0 ? c.spend / c.impressions * 1000 : 0,
      roas: c.spend > 0 ? c.conversionValue / c.spend : 0
    })).sort((a, b) => b.spend - a.spend);
  }, [filteredCampaigns]);

  return (
    <ProtectedPage pageName="Meta" requiredUserTypes={['admin', 'manager']}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-slate-50 mb-2 text-3xl font-bold">📘 Meta Ads</h1>
            <p className="text-slate-50">Metriche e performance campagne Facebook/Instagram</p>
          </div>
          <NeumorphicButton
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2">

            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizzazione...' : 'Sincronizza'}
          </NeumorphicButton>
        </div>

        {/* Filters */}
        <NeumorphicCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Periodo</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none">

                <option value="month">Questo mese</option>
                <option value="custom">Personalizzato</option>
                <option value="all">Tutti i periodi</option>
              </select>
            </div>

            {dateRange === 'custom' &&
            <>
                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Data Inizio</label>
                  <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none" />

                </div>
                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Data Fine</label>
                  <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none" />

                </div>
              </>
            }
          </div>
        </NeumorphicCard>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NeumorphicCard className="p-6 text-center">
            <DollarSign className="w-10 h-10 text-red-600 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-[#6b6b6b] mb-1">€{stats.totalSpend.toFixed(2)}</h3>
            <p className="text-sm text-[#9b9b9b]">Spesa Totale</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <MousePointerClick className="w-10 h-10 text-blue-600 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-[#6b6b6b] mb-1">{stats.totalClicks.toLocaleString()}</h3>
            <p className="text-sm text-[#9b9b9b]">Click Totali</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <Eye className="w-10 h-10 text-purple-600 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-[#6b6b6b] mb-1">{stats.totalImpressions.toLocaleString()}</h3>
            <p className="text-sm text-[#9b9b9b]">Impressioni</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <Users className="w-10 h-10 text-indigo-600 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-[#6b6b6b] mb-1">{stats.totalReach.toLocaleString()}</h3>
            <p className="text-sm text-[#9b9b9b]">Reach</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <Target className="w-10 h-10 text-green-600 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-[#6b6b6b] mb-1">{stats.totalConversions.toFixed(0)}</h3>
            <p className="text-sm text-[#9b9b9b]">Conversioni</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <TrendingUp className="w-10 h-10 text-blue-600 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-blue-600 mb-1">{stats.avgCTR.toFixed(2)}%</h3>
            <p className="text-sm text-[#9b9b9b]">CTR Medio</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <DollarSign className="w-10 h-10 text-green-600 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-green-600 mb-1">€{stats.totalConversionValue.toFixed(2)}</h3>
            <p className="text-sm text-[#9b9b9b]">Valore Conv.</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <Target className="w-10 h-10 text-orange-600 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-orange-600 mb-1">{stats.avgROAS.toFixed(2)}x</h3>
            <p className="text-sm text-[#9b9b9b]">ROAS Medio</p>
          </NeumorphicCard>
        </div>

        {/* Trend Charts */}
        <NeumorphicCard className="p-6">
          <h3 className="text-lg font-bold text-[#6b6b6b] mb-4">Trend Spesa e Click</h3>
          {chartData.length > 0 ?
          <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="spend" stroke="#dc2626" strokeWidth={2} name="Spesa (€)" />
                <Line yAxisId="right" type="monotone" dataKey="clicks" stroke="#2563eb" strokeWidth={2} name="Click" />
              </LineChart>
            </ResponsiveContainer> :

          <p className="text-center text-[#9b9b9b] py-8">Nessun dato disponibile</p>
          }
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <h3 className="text-lg font-bold text-[#6b6b6b] mb-4">Reach e Conversioni</h3>
          {chartData.length > 0 ?
          <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="reach" fill="#6366f1" name="Reach" />
                <Bar yAxisId="right" dataKey="conversions" fill="#10b981" name="Conversioni" />
              </BarChart>
            </ResponsiveContainer> :

          <p className="text-center text-[#9b9b9b] py-8">Nessun dato disponibile</p>
          }
        </NeumorphicCard>

        {/* Campaign Performance Table */}
        <NeumorphicCard className="p-6">
          <h3 className="text-lg font-bold text-[#6b6b6b] mb-4">Performance per Campagna</h3>
          {campaignPerformance.length > 0 ?
          <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[#8b7355]">
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Campagna</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Spesa</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Reach</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Click</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">CTR</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">CPC</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">CPM</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Conv.</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignPerformance.map((campaign, idx) =>
                <tr key={idx} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                      <td className="p-3 text-[#6b6b6b] font-medium">{campaign.name}</td>
                      <td className="p-3 text-right font-bold text-red-600">€{campaign.spend.toFixed(2)}</td>
                      <td className="p-3 text-right text-indigo-600">{campaign.reach.toLocaleString()}</td>
                      <td className="p-3 text-right text-[#6b6b6b]">{campaign.clicks.toLocaleString()}</td>
                      <td className="p-3 text-right text-blue-600">{campaign.ctr.toFixed(2)}%</td>
                      <td className="p-3 text-right text-[#6b6b6b]">€{campaign.cpc.toFixed(2)}</td>
                      <td className="p-3 text-right text-[#6b6b6b]">€{campaign.cpm.toFixed(2)}</td>
                      <td className="p-3 text-right text-green-600 font-bold">{campaign.conversions.toFixed(0)}</td>
                      <td className="p-3 text-right text-orange-600 font-bold">{campaign.roas.toFixed(2)}x</td>
                    </tr>
                )}
                </tbody>
              </table>
            </div> :

          <p className="text-center text-[#9b9b9b] py-8">Nessuna campagna trovata</p>
          }
        </NeumorphicCard>
      </div>
    </ProtectedPage>);

}