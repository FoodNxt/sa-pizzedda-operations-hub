
import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Store, TrendingUp, Users, DollarSign, Star, AlertTriangle, Filter, Calendar, X } from "lucide-react";
import StatsCard from "../components/dashboard/StatsCard";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, isAfter, isBefore, parseISO } from 'date-fns';

export default function Dashboard() {
  const [dateRange, setDateRange] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  const { data: iPraticoData = [], isLoading: dataLoading } = useQuery({
    queryKey: ['iPratico'],
    queryFn: () => base44.entities.iPratico.list('-order_date', 1000),
  });

  // Process data with date filters
  const processedData = useMemo(() => {
    let cutoffDate;
    let endFilterDate;
    
    if (startDate || endDate) {
      cutoffDate = startDate ? parseISO(startDate) : new Date(0);
      endFilterDate = endDate ? parseISO(endDate) : new Date();
    } else {
      const days = parseInt(dateRange);
      cutoffDate = subDays(new Date(), days);
      endFilterDate = new Date();
    }
    
    const filteredData = iPraticoData.filter(item => {
      if (item.order_date) {
        const itemDate = parseISO(item.order_date);
        if (isBefore(itemDate, cutoffDate) || isAfter(itemDate, endFilterDate)) {
          return false;
        }
      }
      return true;
    });

    const totalRevenue = filteredData.reduce((sum, item) => 
      sum + (item.total_revenue || 0), 0
    );

    const totalOrders = filteredData.reduce((sum, item) => 
      sum + (item.total_orders || 0), 0
    );

    // Revenue by date for chart
    const revenueByDate = {};
    filteredData.forEach(item => {
      if (item.order_date) {
        const date = item.order_date;
        if (!revenueByDate[date]) {
          revenueByDate[date] = { date, revenue: 0 };
        }
        revenueByDate[date].revenue += item.total_revenue || 0;
      }
    });

    const dailyRevenue = Object.values(revenueByDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(d => ({
        date: format(new Date(d.date), 'dd MMM'),
        revenue: parseFloat(d.revenue.toFixed(2))
      }));

    return { totalRevenue, totalOrders, dailyRevenue };
  }, [iPraticoData, dateRange, startDate, endDate]);

  // Calculate metrics
  const totalStores = stores.length;
  const activeStores = stores.filter(s => s.status === 'active').length;
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';
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

  const COLORS = ['#8b7355', '#a68a6a', '#c1a07f', '#dcb794'];

  const clearCustomDates = () => {
    setStartDate('');
    setEndDate('');
    setDateRange('30');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Dashboard Overview</h1>
        <p className="text-[#9b9b9b]">Monitor your business performance across all locations</p>
      </div>

      {/* Date Range Filter */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-lg font-bold text-[#6b6b6b]">Filtri Periodo</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-[#9b9b9b] mb-2 block">Periodo</label>
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                if (e.target.value !== 'custom') {
                  setStartDate('');
                  setEndDate('');
                }
              }}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            >
              <option value="7">Ultimi 7 giorni</option>
              <option value="30">Ultimi 30 giorni</option>
              <option value="90">Ultimi 90 giorni</option>
              <option value="365">Ultimo anno</option>
              <option value="custom">Periodo Personalizzato</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <>
              <div>
                <label className="text-sm text-[#9b9b9b] mb-2 block flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data Inizio
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-[#9b9b9b] mb-2 block flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data Fine
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  />
                  {(startDate || endDate) && (
                    <button
                      onClick={clearCustomDates}
                      className="neumorphic-flat px-3 rounded-xl text-[#9b9b9b] hover:text-red-600 transition-colors"
                      title="Cancella date"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </NeumorphicCard>

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
          value={`€${processedData.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          trend="up"
          trendValue="From iPratico"
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
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={processedData.dailyRevenue}>
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
                formatter={(value) => `€${value.toFixed(2)}`}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#8b7355" strokeWidth={3} name="Revenue €" />
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
              €{(processedData.totalRevenue / (stores.length || 1)).toFixed(0)}
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
