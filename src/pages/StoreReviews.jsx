
import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Star, Filter, MapPin, TrendingUp, TrendingDown, X, List } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage"; // New import
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { format, parseISO, isValid } from 'date-fns'; // Modified import: added isValid
import { it } from 'date-fns/locale';

// New imports for Recharts
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

export default function StoreReviews() {
  const [filterRating, setFilterRating] = useState('all');
  const [selectedStore, setSelectedStore] = useState(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewFilterRating, setReviewFilterRating] = useState('all');

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => base44.entities.Review.list('-review_date'),
  });

  // Helper function to safely format dates - Updated with isValid
  const safeFormatDate = (dateString, formatStr = 'dd/MM/yyyy HH:mm') => {
    if (!dateString) return 'N/A';
    
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return 'N/A'; // Use isValid here
      return format(date, formatStr, { locale: it });
    } catch (e) {
      return 'N/A';
    }
  };

  // Calculate store metrics
  const storeMetrics = useMemo(() => {
    return stores.map(store => {
      const storeReviews = reviews.filter(r => r.store_id === store.id);
      const avgRating = storeReviews.length > 0
        ? storeReviews.reduce((sum, r) => sum + r.rating, 0) / storeReviews.length
        : 0;
      
      const recent = storeReviews.slice(0, 5);
      const previous = storeReviews.slice(5, 10);
      const recentAvg = recent.length > 0 ? recent.reduce((sum, r) => sum + r.rating, 0) / recent.length : 0;
      const previousAvg = previous.length > 0 ? previous.reduce((sum, r) => sum + r.rating, 0) / previous.length : 0;
      const trend = recentAvg > previousAvg ? 'up' : recentAvg < previousAvg ? 'down' : 'stable';

      return {
        ...store,
        avgRating,
        reviewCount: storeReviews.length,
        allReviews: storeReviews,
        recentReviews: storeReviews.slice(0, 3),
        trend,
        color: avgRating >= 4.5 ? '#22c55e' : avgRating >= 3.5 ? '#eab308' : '#ef4444'
      };
    }).filter(s => s.latitude && s.longitude);
  }, [stores, reviews]);

  // Filter stores
  const filteredStores = storeMetrics.filter(store => {
    if (filterRating !== 'all') {
      const threshold = parseFloat(filterRating);
      if (store.avgRating < threshold) return false;
    }
    return true;
  });

  // Filter reviews for all reviews modal
  const filteredAllReviews = useMemo(() => {
    if (!selectedStore) return [];
    
    let filtered = selectedStore.allReviews;
    
    if (reviewFilterRating !== 'all') {
      const rating = parseInt(reviewFilterRating);
      filtered = filtered.filter(r => r.rating === rating);
    }
    
    return filtered;
  }, [selectedStore, reviewFilterRating]);

  const mapCenter = storeMetrics.length > 0 
    ? [storeMetrics[0].latitude, storeMetrics[0].longitude]
    : [41.9028, 12.4964];

  const createCustomIcon = (color) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 3px 6px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });
  };

  // Calculate rating trend data for selected store - FIXED with date validation
  const ratingTrendData = useMemo(() => {
    if (!selectedStore) return [];
    
    // Group reviews by date and calculate average rating
    const reviewsByDate = {};
    selectedStore.allReviews.forEach(review => {
      if (!review.review_date) return; // Skip if no date
      
      try {
        // Validate date before parsing
        const reviewDate = parseISO(review.review_date);
        if (!isValid(reviewDate)) return; // Skip invalid dates - Updated with isValid
        
        const date = format(reviewDate, 'yyyy-MM-dd');
        if (!reviewsByDate[date]) {
          reviewsByDate[date] = { ratings: [], count: 0 };
        }
        reviewsByDate[date].ratings.push(review.rating);
        reviewsByDate[date].count++;
      } catch (e) {
        // Skip reviews with invalid dates
        return;
      }
    });

    // Convert to array and calculate averages
    const trendData = Object.entries(reviewsByDate)
      .map(([date, data]) => {
        try {
          const parsedDate = parseISO(date);
          if (!isValid(parsedDate)) return null; // Skip invalid dates - Updated with isValid
          
          return {
            date,
            avgRating: (data.ratings.reduce((sum, r) => sum + r, 0) / data.count).toFixed(1),
            count: data.count
          };
        } catch (e) {
          return null;
        }
      })
      .filter(item => item !== null) // Remove null entries
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30); // Last 30 days

    return trendData;
  }, [selectedStore]);

  return (
    <ProtectedPage pageName="StoreReviews">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="mb-4 lg:mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
                Store Reviews
              </h1>
              <p className="text-sm text-slate-500">Panoramica geografica del feedback dei clienti</p>
            </div>
            
            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <div className="neumorphic-flat px-4 py-2 flex items-center gap-2 rounded-xl">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value)}
                  className="bg-transparent text-slate-700 outline-none text-sm"
                >
                  <option value="all">Tutte</option>
                  <option value="4.5">4.5+</option>
                  <option value="4.0">4.0+</option>
                  <option value="3.5">3.5+</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <NeumorphicCard className="p-4 lg:p-6 overflow-hidden">
          <div className="h-[400px] lg:h-[500px] rounded-xl overflow-hidden">
            {storeMetrics.length > 0 ? (
              <MapContainer
                center={mapCenter}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {filteredStores.map(store => (
                  <Marker
                    key={store.id}
                    position={[store.latitude, store.longitude]}
                    icon={createCustomIcon(store.color)}
                    eventHandlers={{
                      click: () => setSelectedStore(store)
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold text-slate-800 mb-1">{store.name}</h3>
                        <p className="text-sm text-slate-500 mb-2">{store.address}</p>
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-bold text-slate-800">{store.avgRating.toFixed(1)}</span>
                          <span className="text-sm text-slate-500">({store.reviewCount})</span>
                        </div>
                        {store.trend !== 'stable' && (
                          <div className="flex items-center gap-1 text-sm">
                            {store.trend === 'up' ? (
                              <TrendingUp className="w-4 h-4 text-green-600" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            )}
                            <span className={store.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                              {store.trend === 'up' ? 'Migliora' : 'Calo'}
                            </span>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nessuna posizione disponibile</p>
                </div>
              </div>
            )}
          </div>
        </NeumorphicCard>

        {/* Store List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {filteredStores.length > 0 ? (
            filteredStores.map(store => (
              <div
                key={store.id}
                onClick={() => setSelectedStore(store)}
                className={`cursor-pointer transition-all hover:shadow-xl p-4 lg:p-5 rounded-xl ${
                  selectedStore?.id === store.id ? 'neumorphic-pressed' : 'neumorphic-flat'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm lg:text-base truncate">{store.name}</h3>
                    <p className="text-xs lg:text-sm text-slate-500 truncate">{store.address}</p>
                  </div>
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: store.color }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold text-slate-800">{store.avgRating.toFixed(1)}</span>
                    <span className="text-xs text-slate-500">({store.reviewCount})</span>
                  </div>
                  {store.trend !== 'stable' && (
                    store.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-slate-500">Nessun locale</p>
            </div>
          )}
        </div>

        {/* Selected Store Details */}
        {selectedStore && (
          <NeumorphicCard className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h2 className="text-xl lg:text-2xl font-bold text-slate-800">{selectedStore.name}</h2>
              <NeumorphicButton onClick={() => setSelectedStore(null)}>
                Chiudi
              </NeumorphicButton>
            </div>

            <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-4 lg:mb-6">
              <div className="neumorphic-pressed p-3 lg:p-4 rounded-xl text-center">
                <p className="text-xs text-slate-500 mb-1 lg:mb-2">Media</p>
                <div className="flex items-center justify-center gap-2">
                  <Star className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-500 fill-yellow-500" />
                  <span className="text-2xl lg:text-3xl font-bold text-slate-800">
                    {selectedStore.avgRating.toFixed(1)}
                  </span>
                </div>
              </div>
              
              <div className="neumorphic-pressed p-3 lg:p-4 rounded-xl text-center">
                <p className="text-xs text-slate-500 mb-1 lg:mb-2">Totale</p>
                <span className="text-2xl lg:text-3xl font-bold text-slate-800">
                  {selectedStore.reviewCount}
                </span>
              </div>

              <div className="neumorphic-pressed p-3 lg:p-4 rounded-xl text-center">
                <p className="text-xs text-slate-500 mb-1 lg:mb-2">Trend</p>
                <div className="flex items-center justify-center gap-2">
                  {selectedStore.trend === 'up' ? (
                    <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
                  ) : selectedStore.trend === 'down' ? (
                    <TrendingDown className="w-5 h-5 lg:w-6 lg:h-6 text-red-600" />
                  ) : (
                    <span className="text-base lg:text-lg font-bold text-slate-600">Stabile</span>
                  )}
                </div>
              </div>
            </div>

            {/* Rating Trend Chart */}
            {ratingTrendData.length > 0 && (
              <div className="neumorphic-flat p-4 lg:p-6 rounded-xl mb-4 lg:mb-6">
                <h3 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Andamento</h3>
                <div className="w-full overflow-x-auto">
                  <div style={{ minWidth: '300px' }}>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={ratingTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#64748b"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(date) => {
                            try {
                              const parsedDate = parseISO(date);
                              if (!isValid(parsedDate)) return ''; // Updated with isValid
                              return format(parsedDate, 'dd/MM');
                            } catch (e) {
                              return '';
                            }
                          }}
                        />
                        <YAxis 
                          stroke="#64748b"
                          domain={[0, 5]}
                          ticks={[0, 1, 2, 3, 4, 5]}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'rgba(248, 250, 252, 0.95)', 
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            fontSize: '11px'
                          }}
                          labelFormatter={(date) => {
                            try {
                              const parsedDate = parseISO(date);
                              if (!isValid(parsedDate)) return date; // Updated with isValid
                              return format(parsedDate, 'dd/MM/yyyy');
                            } catch (e) {
                              return date;
                            }
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line 
                          type="monotone" 
                          dataKey="avgRating" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          name="Media"
                          dot={{ fill: '#3b82f6', r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base lg:text-lg font-bold text-slate-800">
                {showAllReviews ? 'Tutte le Recensioni' : 'Recensioni Recenti'}
              </h3>
              <div className="flex items-center gap-3">
                {showAllReviews && (
                  <select
                    value={reviewFilterRating}
                    onChange={(e) => setReviewFilterRating(e.target.value)}
                    className="neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm"
                  >
                    <option value="all">Tutte</option>
                    <option value="5">⭐⭐⭐⭐⭐</option>
                    <option value="4">⭐⭐⭐⭐</option>
                    <option value="3">⭐⭐⭐</option>
                    <option value="2">⭐⭐</option>
                    <option value="1">⭐</option>
                  </select>
                )}
                <NeumorphicButton
                  onClick={() => {
                    setShowAllReviews(!showAllReviews);
                    setReviewFilterRating('all');
                  }}
                  className="flex items-center gap-2"
                >
                  {showAllReviews ? (
                    <>
                      <X className="w-4 h-4" />
                      <span className="hidden sm:inline">Recenti</span>
                    </>
                  ) : (
                    <>
                      <List className="w-4 h-4" />
                      <span className="hidden sm:inline">Tutte ({selectedStore.reviewCount})</span>
                    </>
                  )}
                </NeumorphicButton>
              </div>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {(showAllReviews ? filteredAllReviews : selectedStore.recentReviews).length > 0 ? (
                (showAllReviews ? filteredAllReviews : selectedStore.recentReviews).map(review => (
                  <div key={review.id} className="neumorphic-flat p-3 lg:p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-medium text-slate-800 text-sm truncate">{review.customer_name || 'Anonimo'}</span>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 lg:w-4 lg:h-4 ${
                                i < review.rating
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                        {safeFormatDate(review.review_date, 'dd/MM/yy')}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-xs lg:text-sm text-slate-700">{review.comment}</p>
                    )}
                    {review.employee_assigned_name && (
                      <p className="text-xs text-blue-600 mt-2">
                        👤 {review.employee_assigned_name}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 py-8 text-sm">
                  {showAllReviews && reviewFilterRating !== 'all' 
                    ? `Nessuna recensione con ${reviewFilterRating} stelle` 
                    : 'Nessuna recensione'}
                </p>
              )}
            </div>
          </NeumorphicCard>
        )}
      </div>
    </ProtectedPage>
  );
}
