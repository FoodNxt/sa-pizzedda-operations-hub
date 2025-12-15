import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Store, TrendingUp, Users, DollarSign, Star, AlertTriangle, Filter, Calendar, X, RefreshCw } from "lucide-react";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, isAfter, isBefore, parseISO, isValid } from 'date-fns';

export default function Dashboard() {
  const [dateRange, setDateRange] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [syncMessage, setSyncMessage] = useState(null);

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

  const safeParseDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return null;
      return date;
    } catch (e) {
      return null;
    }
  };

  const safeFormatDate = (date, formatString) => {
    if (!date || !isValid(date)) return 'N/A';
    try {
      return format(date, formatString);
    } catch (e) {
      return 'N/A';
    }
  };

  const processedData = useMemo(() => {
    let cutoffDate;
    let endFilterDate;
    
    if (startDate || endDate) {
      cutoffDate = startDate ? safeParseDate(startDate) : new Date(0);
      endFilterDate = endDate ? safeParseDate(endDate) : new Date();
    } else {
      const days = parseInt(dateRange);
      cutoffDate = subDays(new Date(), days);
      endFilterDate = new Date();
    }
    
    const filteredData = iPraticoData.filter(item => {
      if (!item.order_date) return false;
      
      const itemDate = safeParseDate(item.order_date);
      if (!itemDate) return false;
      
      if (cutoffDate && isBefore(itemDate, cutoffDate)) return false;
      if (endFilterDate && isAfter(itemDate, endFilterDate)) return false;
      
      return true;
    });

    const totalRevenue = filteredData.reduce((sum, item) => 
      sum + (item.total_revenue || 0), 0
    );

    const totalOrders = filteredData.reduce((sum, item) => 
      sum + (item.total_orders || 0), 0
    );

    const revenueByDate = {};
    filteredData.forEach(item => {
      if (!item.order_date) return;
      
      const dateStr = item.order_date;
      if (!revenueByDate[dateStr]) {
        revenueByDate[dateStr] = { date: dateStr, revenue: 0 };
      }
      revenueByDate[dateStr].revenue += item.total_revenue || 0;
    });

    const dailyRevenue = Object.values(revenueByDate)
      .map(d => {
        const parsedDate = safeParseDate(d.date);
        return {
          date: parsedDate,
          dateStr: d.date,
          revenue: parseFloat(d.revenue.toFixed(2))
        };
      })
      .filter(d => d.date !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(d => ({
        date: safeFormatDate(d.date, 'dd MMM'),
        revenue: d.revenue
      }))
      .filter(d => d.date !== 'N/A');

    return { totalRevenue, totalOrders, dailyRevenue };
  }, [iPraticoData, dateRange, startDate, endDate]);

  const totalStores = stores.length;
  const activeStores = stores.filter(s => s.status === 'active').length;
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';
  const totalEmployees = employees.filter(e => e.status === 'active').length;

  const storeRatings = stores.map(store => {
    const storeReviews = reviews.filter(r => r.store_id === store.id);
    const avgRating = storeReviews.length > 0
      ? storeReviews.reduce((sum, r) => sum + r.rating, 0) / storeReviews.length
      : 0;
    return { ...store, avgRating, reviewCount: storeReviews.length };
  });

  const alertStores = storeRatings.filter(s => s.avgRating < 3.5 && s.reviewCount > 0);

  const clearCustomDates = () => {
    setStartDate('');
    setEndDate('');
    setDateRange('30');
  };

  const syncEmployeesMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('syncEmployeesFromUsers');
      return response.data;
    },
    onSuccess: (data) => {
      setSyncMessage({ 
        type: 'success', 
        text: `Sincronizzati ${data.summary.created} dipendenti (${data.summary.skipped} già esistenti)`
      });
      setTimeout(() => setSyncMessage(null), 5000);
    },
    onError: (error) => {
      setSyncMessage({ type: 'error', text: error.message });
      setTimeout(() => setSyncMessage(null), 5000);
    }
  });

  return (
    <ProtectedPage pageName="Dashboard">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        <div className="mb-4 lg:mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
                Dashboard
              </h1>
              <p className="text-sm text-slate-500">Monitor business performance</p>
            </div>
            {employees.length === 0 && (
              <NeumorphicButton
                onClick={() => syncEmployeesMutation.mutate()}
                disabled={syncEmployeesMutation.isPending}
                variant="primary"
                className="flex items-center gap-2"
              >
                {syncEmployeesMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Sincronizza Dipendenti
              </NeumorphicButton>
            )}
          </div>
        </div>

        {syncMessage && (
          <NeumorphicCard className={`p-4 ${syncMessage.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`text-sm ${syncMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
              {syncMessage.text}
            </p>
          </NeumorphicCard>
        )}

        <NeumorphicCard className="p-4 lg:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-base lg:text-lg font-bold text-slate-800">Filtri Periodo</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm text-slate-600 mb-2 block">Periodo</label>
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  if (e.target.value !== 'custom') {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
              >
                <option value="7">Ultimi 7 giorni</option>
                <option value="30">Ultimi 30 giorni</option>
                <option value="90">Ultimi 90 giorni</option>
                <option value="365">Ultimo anno</option>
                <option value="custom">Personalizzato</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-600 mb-2 block">Inizio</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full neumorphic-pressed px-3 py-2.5 rounded-xl text-slate-700 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-2 block">Fine</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full neumorphic-pressed px-3 py-2.5 rounded-xl text-slate-700 outline-none text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </NeumorphicCard>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <NeumorphicCard className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-3 shadow-lg">
                <Store className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">
                {activeStores}/{totalStores}
              </h3>
              <p className="text-xs text-slate-500">Stores Attivi</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mb-3 shadow-lg">
                <Star className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">{averageRating}</h3>
              <p className="text-xs text-slate-500">Rating Medio</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-3 shadow-lg">
                <DollarSign className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-slate-800 mb-1">
                €{(processedData.totalRevenue / 1000).toFixed(1)}k
              </h3>
              <p className="text-xs text-slate-500">Revenue</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-3 shadow-lg">
                <Users className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">{totalEmployees}</h3>
              <p className="text-xs text-slate-500">Dipendenti</p>
            </div>
          </NeumorphicCard>
        </div>

        {alertStores.length > 0 && (
          <NeumorphicCard className="p-4 lg:p-6 bg-red-50">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="text-base lg:text-lg font-bold text-slate-800">Attenzione</h2>
            </div>
            <div className="space-y-2">
              {alertStores.map(store => (
                <div key={store.id} className="neumorphic-pressed p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-700 truncate">{store.name}</p>
                    <p className="text-sm text-slate-500">Rating: {store.avgRating.toFixed(1)} ⭐</p>
                  </div>
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold whitespace-nowrap self-start sm:self-auto">
                    Basso
                  </span>
                </div>
              ))}
            </div>
          </NeumorphicCard>
        )}

        <div className="grid grid-cols-1 gap-4 lg:gap-6">
          <NeumorphicCard className="p-4 lg:p-6">
            <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Trend Revenue</h2>
            {processedData.dailyRevenue.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <div style={{ minWidth: '300px' }}>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={processedData.dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#64748b" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        stroke="#64748b"
                        tick={{ fontSize: 12 }}
                        width={60}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'rgba(248, 250, 252, 0.95)', 
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          fontSize: '12px'
                        }}
                        formatter={(value) => `€${value.toFixed(2)}`}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#3b82f6" 
                        strokeWidth={2} 
                        name="Revenue €"
                        dot={{ fill: '#3b82f6', r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-500">
                Nessun dato disponibile per il periodo selezionato
              </div>
            )}
          </NeumorphicCard>

          <NeumorphicCard className="p-4 lg:p-6">
            <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Rating per Store</h2>
            {storeRatings.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <div style={{ minWidth: '300px' }}>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={storeRatings.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#64748b"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        domain={[0, 5]}
                        tick={{ fontSize: 12 }}
                        width={40}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'rgba(248, 250, 252, 0.95)', 
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          fontSize: '12px'
                        }}
                      />
                      <Bar 
                        dataKey="avgRating" 
                        fill="url(#colorGradient)" 
                        name="Avg Rating" 
                        radius={[8, 8, 0, 0]} 
                      />
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#f97316" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-500">
                Nessun dato disponibile
              </div>
            )}
          </NeumorphicCard>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
          <NeumorphicCard className="p-4">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 mx-auto mb-3 flex items-center justify-center shadow-lg">
                <Star className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-1">{reviews.length}</h3>
              <p className="text-xs text-slate-500">Recensioni</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 mx-auto mb-3 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">
                €{(processedData.totalRevenue / (stores.length || 1)).toFixed(0)}
              </h3>
              <p className="text-xs text-slate-500">Avg/Store</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 mx-auto mb-3 flex items-center justify-center shadow-lg">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-1">
                {(employees.length / (stores.length || 1)).toFixed(1)}
              </h3>
              <p className="text-xs text-slate-500">Emp/Store</p>
            </div>
          </NeumorphicCard>
        </div>
      </div>
    </ProtectedPage>
  );
}