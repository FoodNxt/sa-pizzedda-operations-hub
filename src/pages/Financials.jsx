import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Financials() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [periodType, setPeriodType] = useState('daily');
  const [dateRange, setDateRange] = useState(30);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials'],
    queryFn: () => base44.entities.Financial.list('-date'),
  });

  // Filter and process financial data
  const processedData = useMemo(() => {
    let filtered = financials.filter(f => f.period_type === periodType);
    
    if (selectedStore !== 'all') {
      filtered = filtered.filter(f => f.store_id === selectedStore);
    }

    // Get recent data based on date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dateRange);
    filtered = filtered.filter(f => new Date(f.date) >= cutoffDate);

    // Calculate totals
    const totalRevenue = filtered.reduce((sum, f) => sum + (f.revenue || 0), 0);
    const totalCosts = filtered.reduce((sum, f) => 
      sum + (f.cost_ingredients || 0) + (f.cost_labor || 0) + (f.cost_overhead || 0), 0
    );
    const totalProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Prepare chart data
    const chartData = filtered
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(f => ({
        date: new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: f.revenue || 0,
        costs: (f.cost_ingredients || 0) + (f.cost_labor || 0) + (f.cost_overhead || 0),
        profit: (f.revenue || 0) - ((f.cost_ingredients || 0) + (f.cost_labor || 0) + (f.cost_overhead || 0)),
      }));

    // Cost breakdown
    const costBreakdown = [
      {
        name: 'Ingredients',
        value: filtered.reduce((sum, f) => sum + (f.cost_ingredients || 0), 0)
      },
      {
        name: 'Labor',
        value: filtered.reduce((sum, f) => sum + (f.cost_labor || 0), 0)
      },
      {
        name: 'Overhead',
        value: filtered.reduce((sum, f) => sum + (f.cost_overhead || 0), 0)
      }
    ].filter(item => item.value > 0);

    // Store comparison
    const storeComparison = stores.map(store => {
      const storeFinancials = financials.filter(f => 
        f.store_id === store.id && f.period_type === periodType
      );
      const revenue = storeFinancials.reduce((sum, f) => sum + (f.revenue || 0), 0);
      const costs = storeFinancials.reduce((sum, f) => 
        sum + (f.cost_ingredients || 0) + (f.cost_labor || 0) + (f.cost_overhead || 0), 0
      );
      return {
        name: store.name,
        revenue,
        profit: revenue - costs,
        margin: revenue > 0 ? ((revenue - costs) / revenue) * 100 : 0
      };
    }).filter(s => s.revenue > 0);

    return {
      totalRevenue,
      totalCosts,
      totalProfit,
      profitMargin,
      chartData,
      costBreakdown,
      storeComparison
    };
  }, [financials, selectedStore, periodType, dateRange, stores]);

  const COLORS = ['#8b7355', '#a68a6a', '#c1a07f', '#dcb794'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Financial Performance</h1>
        <p className="text-[#9b9b9b]">Track revenue, costs, and profitability</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <NeumorphicCard className="px-4 py-2">
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none"
          >
            <option value="all">All Stores</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </NeumorphicCard>

        <NeumorphicCard className="px-4 py-2">
          <select
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </NeumorphicCard>

        <NeumorphicCard className="px-4 py-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="bg-transparent text-[#6b6b6b] outline-none"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </NeumorphicCard>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#9b9b9b] mb-2">Total Revenue</p>
              <h3 className="text-3xl font-bold text-[#6b6b6b]">
                ${processedData.totalRevenue.toLocaleString()}
              </h3>
            </div>
            <div className="neumorphic-flat p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-[#8b7355]" />
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#9b9b9b] mb-2">Total Costs</p>
              <h3 className="text-3xl font-bold text-[#6b6b6b]">
                ${processedData.totalCosts.toLocaleString()}
              </h3>
            </div>
            <div className="neumorphic-flat p-3 rounded-lg">
              <BarChart3 className="w-6 h-6 text-[#8b7355]" />
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#9b9b9b] mb-2">Net Profit</p>
              <h3 className={`text-3xl font-bold ${
                processedData.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ${processedData.totalProfit.toLocaleString()}
              </h3>
            </div>
            <div className="neumorphic-flat p-3 rounded-lg">
              {processedData.totalProfit >= 0 ? (
                <TrendingUp className="w-6 h-6 text-green-600" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-600" />
              )}
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#9b9b9b] mb-2">Profit Margin</p>
              <h3 className={`text-3xl font-bold ${
                processedData.profitMargin >= 20 ? 'text-green-600' : 
                processedData.profitMargin >= 10 ? 'text-yellow-600' : 
                'text-red-600'
              }`}>
                {processedData.profitMargin.toFixed(1)}%
              </h3>
            </div>
            <div className="neumorphic-flat p-3 rounded-lg">
              <PieChartIcon className="w-6 h-6 text-[#8b7355]" />
            </div>
          </div>
        </NeumorphicCard>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue & Profit Trend */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Revenue & Profit Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={processedData.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#c1c1c1" />
              <XAxis dataKey="date" stroke="#9b9b9b" />
              <YAxis stroke="#9b9b9b" />
              <Tooltip 
                contentStyle={{ 
                  background: '#e0e5ec', 
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 8px #b8bec8, -4px -4px 8px #ffffff'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#8b7355" strokeWidth={3} name="Revenue" />
              <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={3} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </NeumorphicCard>

        {/* Cost Breakdown */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Cost Breakdown</h2>
          {processedData.costBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={processedData.costBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {processedData.costBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: '#e0e5ec', 
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '4px 4px 8px #b8bec8, -4px -4px 8px #ffffff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[#9b9b9b]">
              No cost data available
            </div>
          )}
        </NeumorphicCard>
      </div>

      {/* Store Comparison */}
      {selectedStore === 'all' && processedData.storeComparison.length > 0 && (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Store Comparison</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={processedData.storeComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#c1c1c1" />
              <XAxis dataKey="name" stroke="#9b9b9b" />
              <YAxis stroke="#9b9b9b" />
              <Tooltip 
                contentStyle={{ 
                  background: '#e0e5ec', 
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 8px #b8bec8, -4px -4px 8px #ffffff'
                }}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#8b7355" name="Revenue" radius={[8, 8, 0, 0]} />
              <Bar dataKey="profit" fill="#22c55e" name="Profit" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </NeumorphicCard>
      )}

      {/* Details Table */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Financial Details</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#c1c1c1]">
                <th className="text-left p-3 text-[#9b9b9b] font-medium">Date</th>
                <th className="text-right p-3 text-[#9b9b9b] font-medium">Revenue</th>
                <th className="text-right p-3 text-[#9b9b9b] font-medium">Costs</th>
                <th className="text-right p-3 text-[#9b9b9b] font-medium">Profit</th>
                <th className="text-right p-3 text-[#9b9b9b] font-medium">Margin</th>
              </tr>
            </thead>
            <tbody>
              {processedData.chartData.slice(0, 10).map((row, index) => (
                <tr key={index} className="border-b border-[#d1d1d1]">
                  <td className="p-3 text-[#6b6b6b]">{row.date}</td>
                  <td className="p-3 text-right text-[#6b6b6b] font-medium">
                    ${row.revenue.toLocaleString()}
                  </td>
                  <td className="p-3 text-right text-[#6b6b6b]">
                    ${row.costs.toLocaleString()}
                  </td>
                  <td className={`p-3 text-right font-medium ${
                    row.profit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${row.profit.toLocaleString()}
                  </td>
                  <td className="p-3 text-right text-[#6b6b6b]">
                    {row.revenue > 0 ? ((row.profit / row.revenue) * 100).toFixed(1) : '0.0'}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NeumorphicCard>
    </div>
  );
}