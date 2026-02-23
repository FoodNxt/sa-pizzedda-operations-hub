import React, { useState, useMemo } from 'react';
import moment from 'moment';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import NeumorphicCard from '../neumorphic/NeumorphicCard';
import { TrendingUp, Pizza, Calendar } from 'lucide-react';

export default function RevenueTeglia({ stores, iPratico, prodottiVenduti, teglieConfig }) {
  const [revenueStartDate, setRevenueStartDate] = useState(moment().subtract(30, 'days').format('YYYY-MM-DD'));
  const [revenueEndDate, setRevenueEndDate] = useState(moment().format('YYYY-MM-DD'));
  const [revenueSelectedStore, setRevenueSelectedStore] = useState('');
  const [revenueSelectedApp, setRevenueSelectedApp] = useState('');

  const analysis = useMemo(() => {
    // Filtra iPratico per periodo e filtri
    const filteredIPratico = iPratico.filter(i => {
      if (i.data < revenueStartDate || i.data > revenueEndDate) return false;
      if (revenueSelectedStore && i.store_id !== revenueSelectedStore) return false;
      if (revenueSelectedApp && i.app !== revenueSelectedApp) return false;
      return true;
    });

    // Filtra prodotti venduti per periodo e calcola teglie
    const filteredProdottiVenduti = prodottiVenduti.filter(p => {
      if (p.data_vendita < revenueStartDate || p.data_vendita > revenueEndDate) return false;
      if (revenueSelectedStore && p.store_id !== revenueSelectedStore) return false;
      if (!teglieConfig.categorie.includes(p.category)) return false;
      return true;
    });

    // Calcola teglie totali
    const teglieTotali = filteredProdottiVenduti.reduce((sum, p) => {
      return sum + (p.total_pizzas_sold || 0);
    }, 0) / teglieConfig.unita_per_teglia;

    // Calcola revenue totale
    const revenueTotale = filteredIPratico.reduce((sum, i) => sum + (i.revenue || 0), 0);

    // Revenue per teglia
    const revenuePerTeglia = teglieTotali > 0 ? revenueTotale / teglieTotali : 0;

    // Breakdown per store
    const revenueByStore = {};
    filteredIPratico.forEach(i => {
      if (!revenueByStore[i.store_id]) {
        revenueByStore[i.store_id] = { revenue: 0, store_name: i.store_name };
      }
      revenueByStore[i.store_id].revenue += i.revenue || 0;
    });

    const teglieByStore = {};
    filteredProdottiVenduti.forEach(p => {
      if (!teglieByStore[p.store_id]) {
        teglieByStore[p.store_id] = { teglie: 0, store_name: p.store_name };
      }
      teglieByStore[p.store_id].teglie += (p.total_pizzas_sold || 0) / teglieConfig.unita_per_teglia;
    });

    const storeBreakdown = Object.keys(revenueByStore).map(storeId => ({
      store_id: storeId,
      store_name: revenueByStore[storeId].store_name,
      revenue: revenueByStore[storeId].revenue,
      teglie: teglieByStore[storeId]?.teglie || 0,
      revenuePerTeglia: (teglieByStore[storeId]?.teglie || 0) > 0 ?
        revenueByStore[storeId].revenue / teglieByStore[storeId].teglie : 0
    })).sort((a, b) => b.revenuePerTeglia - a.revenuePerTeglia);

    // Breakdown per app
    const revenueByApp = {};
    filteredIPratico.forEach(i => {
      const app = i.app || 'Altro';
      if (!revenueByApp[app]) {
        revenueByApp[app] = 0;
      }
      revenueByApp[app] += i.revenue || 0;
    });

    const appBreakdown = Object.entries(revenueByApp).map(([app, revenue]) => ({
      app,
      revenue,
      percentage: revenueTotale > 0 ? (revenue / revenueTotale * 100) : 0
    })).sort((a, b) => b.revenue - a.revenue);

    // Trend temporale
    const dailyRevenue = {};
    filteredIPratico.forEach(i => {
      if (!dailyRevenue[i.data]) {
        dailyRevenue[i.data] = 0;
      }
      dailyRevenue[i.data] += i.revenue || 0;
    });

    const dailyTeglie = {};
    filteredProdottiVenduti.forEach(p => {
      if (!dailyTeglie[p.data_vendita]) {
        dailyTeglie[p.data_vendita] = 0;
      }
      dailyTeglie[p.data_vendita] += (p.total_pizzas_sold || 0) / teglieConfig.unita_per_teglia;
    });

    const trendData = Object.keys(dailyRevenue).map(date => ({
      date,
      revenue: dailyRevenue[date],
      teglie: dailyTeglie[date] || 0,
      revenuePerTeglia: (dailyTeglie[date] || 0) > 0 ? dailyRevenue[date] / dailyTeglie[date] : 0
    })).sort((a, b) => a.date.localeCompare(b.date));

    return {
      teglieTotali,
      revenueTotale,
      revenuePerTeglia,
      storeBreakdown,
      appBreakdown,
      trendData
    };
  }, [iPratico, prodottiVenduti, teglieConfig, revenueStartDate, revenueEndDate, revenueSelectedStore, revenueSelectedApp]);

  const { teglieTotali, revenueTotale, revenuePerTeglia, storeBreakdown, appBreakdown, trendData } = analysis;

  return (
    <div className="space-y-6">
      {/* Filtri */}
      <NeumorphicCard className="p-6">
        <h3 className="text-sm font-medium text-slate-700 mb-4">Filtri Analisi</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Data inizio</label>
            <input
              type="date"
              value={revenueStartDate}
              onChange={(e) => setRevenueStartDate(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Data fine</label>
            <input
              type="date"
              value={revenueEndDate}
              onChange={(e) => setRevenueEndDate(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Locale</label>
            <select
              value={revenueSelectedStore}
              onChange={(e) => setRevenueSelectedStore(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
            >
              <option value="">Tutti i locali</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">App Delivery</label>
            <select
              value={revenueSelectedApp}
              onChange={(e) => setRevenueSelectedApp(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
            >
              <option value="">Tutte le app</option>
              {Array.from(new Set(iPratico.map(i => i.app).filter(Boolean))).sort().map(app => (
                <option key={app} value={app}>{app}</option>
              ))}
            </select>
          </div>
        </div>
      </NeumorphicCard>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <NeumorphicCard className="p-6 text-center">
          <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-3xl font-bold text-slate-800">
            €{revenuePerTeglia.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Revenue / Teglia</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <p className="text-3xl font-bold text-slate-800">
            €{revenueTotale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Revenue Totale</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <Pizza className="w-8 h-8 text-orange-600 mx-auto mb-2" />
          <p className="text-3xl font-bold text-slate-800">
            {teglieTotali.toFixed(1)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Teglie Vendute</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <p className="text-3xl font-bold text-slate-800">
            {trendData.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Giorni Analizzati</p>
        </NeumorphicCard>
      </div>

      {/* Trend Chart */}
      {trendData.length > 0 && (
        <NeumorphicCard className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Trend €/Teglia nel Tempo</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  tickFormatter={(date) => moment(date).format('DD/MM')}
                />
                <YAxis
                  stroke="#64748b"
                  label={{ value: '€/Teglia', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(date) => moment(date).format('DD/MM/YYYY')}
                  formatter={(value) => ['€' + value.toFixed(2), '€/Teglia']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenuePerTeglia"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="€/Teglia"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </NeumorphicCard>
      )}

      {/* Breakdown per Store */}
      {storeBreakdown.length > 0 && (
        <NeumorphicCard className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Analisi per Locale</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 px-2 text-slate-700">Locale</th>
                  <th className="text-right py-3 px-2 text-slate-700 bg-green-50">Revenue</th>
                  <th className="text-right py-3 px-2 text-slate-700 bg-orange-50">Teglie</th>
                  <th className="text-right py-3 px-2 text-slate-700 bg-blue-50 font-bold">€/Teglia</th>
                </tr>
              </thead>
              <tbody>
                {storeBreakdown.map((s) => (
                  <tr key={s.store_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-2 font-medium text-slate-800">{s.store_name}</td>
                    <td className="py-3 px-2 text-right text-green-700 bg-green-50 font-medium">
                      €{s.revenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-2 text-right text-orange-700 bg-orange-50 font-medium">
                      {s.teglie.toFixed(1)}
                    </td>
                    <td className="py-3 px-2 text-right text-blue-700 bg-blue-50 font-bold text-lg">
                      €{s.revenuePerTeglia.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-100">
                  <td className="py-3 px-2 font-bold text-slate-800">TOTALE</td>
                  <td className="py-3 px-2 text-right font-bold text-green-700 bg-green-100">
                    €{revenueTotale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 text-right font-bold text-orange-700 bg-orange-100">
                    {teglieTotali.toFixed(1)}
                  </td>
                  <td className="py-3 px-2 text-right font-bold text-blue-700 bg-blue-100 text-xl">
                    €{revenuePerTeglia.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </NeumorphicCard>
      )}

      {/* Breakdown per App */}
      {appBreakdown.length > 0 && (
        <NeumorphicCard className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Distribuzione Revenue per App</h3>
          <div className="space-y-3">
            {appBreakdown.map((app) => (
              <div key={app.app} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{app.app}</span>
                    <span className="text-sm font-bold text-slate-800">
                      €{app.revenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${app.percentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-slate-600 w-16 text-right">
                  {app.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </NeumorphicCard>
      )}

      {trendData.length === 0 && (
        <NeumorphicCard className="p-12 text-center">
          <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">Nessun dato disponibile</h3>
          <p className="text-slate-500">
            Seleziona un periodo per visualizzare l'analisi del fatturato per teglia
          </p>
        </NeumorphicCard>
      )}
    </div>
  );
}