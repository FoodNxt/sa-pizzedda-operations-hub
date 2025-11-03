import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Store, TrendingUp, Users, DollarSign, Star, AlertTriangle } from "lucide-react";
import StatsCard from "../components/dashboard/StatsCard";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => base44.entities.Review.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials'],
    queryFn: () => base44.entities.Financial.list(),
  });

  // Calculate metrics
  const totalStores = stores.length;
  const activeStores = stores.filter(s => s.status === 'active').length;
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';
  const totalRevenue = financials.reduce((sum, f) => sum + (f.revenue || 0), 0);
  const totalEmployees = employees.filter(e => e.status === 'active').length;

  // Low-rated stores
  const storeRatings = stores.map(store => {
    const storeReviews = reviews.filter(r => r.store_id === store.id);
    const avgRating = storeReviews.length > 0
      ? storeReviews.reduce((sum, r) => sum + r.rating, 0) / storeReviews.length
      : 0;
    return { ...store, avgRating, reviewCount: storeReviews.length };
  });

  const alertStores = storeRatings.filter(s => s.avgRating < 3.5 && s.reviewCount > 0);

  // Recent performance data
  const recentFinancials = financials
    .filter(f => f.period_type === 'daily')
    .slice(-7)
    .map(f => ({
      date: new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: f.revenue,
      costs: (f.cost_ingredients || 0) + (f.cost_labor || 0) + (f.cost_overhead || 0),
      profit: f.revenue - ((f.cost_ingredients || 0) + (f.cost_labor || 0) + (f.cost_overhead || 0))
    }));

  const COLORS = ['#8b7355', '#a68a6a', '#c1a07f', '#dcb794'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Dashboard Overview</h1>
        <p className="text-[#9b9b9b]">Monitor your business performance across all locations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active Stores"
          value={`${activeStores}/${totalStores}`}
          icon={Store}
          trend="up"
          trendValue="100%"
        />
        <StatsCard
          title="Average Rating"
          value={averageRating}
          icon={Star}
          trend={parseFloat(averageRating) >= 4 ? 'up' : 'down'}
          trendValue={`${reviews.length} reviews`}
        />
        <StatsCard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend="up"
          trendValue="This period"
        />
        <StatsCard
          title="Active Employees"
          value={totalEmployees}
          icon={Users}
          trend="neutral"
          trendValue="Across all stores"
        />
      </div>

      {/* Alerts Section */}
      {alertStores.length > 0 && (
        <NeumorphicCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold text-[#6b6b6b]">Attention Required</h2>
          </div>
          <div className="space-y-3">
            {alertStores.map(store => (
              <div key={store.id} className="neumorphic-pressed p-4 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#6b6b6b]">{store.name}</p>
                  <p className="text-sm text-[#9b9b9b]">Average rating: {store.avgRating.toFixed(1)} ⭐</p>
                </div>
                <div className="neumorphic-flat px-4 py-2 rounded-lg">
                  <span className="text-sm font-medium text-red-600">Low Rating</span>
                </div>
              </div>
            ))}
          </div>
        </NeumorphicCard>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Revenue Trend (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={recentFinancials}>
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
              <Line type="monotone" dataKey="profit" stroke="#a68a6a" strokeWidth={3} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </NeumorphicCard>

        {/* Store Performance */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Store Ratings Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={storeRatings.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#c1c1c1" />
              <XAxis dataKey="name" stroke="#9b9b9b" />
              <YAxis stroke="#9b9b9b" domain={[0, 5]} />
              <Tooltip 
                contentStyle={{ 
                  background: '#e0e5ec', 
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 8px #b8bec8, -4px -4px 8px #ffffff'
                }}
              />
              <Bar dataKey="avgRating" fill="#8b7355" name="Average Rating" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </NeumorphicCard>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NeumorphicCard className="p-6">
          <div className="text-center">
            <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Star className="w-8 h-8 text-[#8b7355]" />
            </div>
            <h3 className="text-2xl font-bold text-[#6b6b6b] mb-1">{reviews.length}</h3>
            <p className="text-sm text-[#9b9b9b]">Total Reviews</p>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <div className="text-center">
            <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-[#8b7355]" />
            </div>
            <h3 className="text-2xl font-bold text-[#6b6b6b] mb-1">
              ${(totalRevenue / (stores.length || 1)).toFixed(0)}
            </h3>
            <p className="text-sm text-[#9b9b9b]">Avg Revenue per Store</p>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <div className="text-center">
            <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Users className="w-8 h-8 text-[#8b7355]" />
            </div>
            <h3 className="text-2xl font-bold text-[#6b6b6b] mb-1">
              {(employees.length / (stores.length || 1)).toFixed(1)}
            </h3>
            <p className="text-sm text-[#9b9b9b]">Avg Employees per Store</p>
          </div>
        </NeumorphicCard>
      </div>
    </div>
  );
}