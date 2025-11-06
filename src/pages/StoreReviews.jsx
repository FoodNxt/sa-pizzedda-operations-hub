import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Star, Filter, Calendar, MapPin, TrendingUp, TrendingDown, X, List } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Store Reviews</h1>
          <p className="text-[#9b9b9b]">Panoramica geografica del feedback dei clienti</p>
        </div>
        
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <NeumorphicCard className="px-4 py-2 flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#9b9b9b]" />
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="bg-transparent text-[#6b6b6b] outline-none text-sm"
            >
              <option value="all">Tutte le Valutazioni</option>
              <option value="4.5">4.5+ Stelle</option>
              <option value="4.0">4.0+ Stelle</option>
              <option value="3.5">3.5+ Stelle</option>
            </select>
          </NeumorphicCard>
        </div>
      </div>

      {/* Map - MOVED TO TOP */}
      <NeumorphicCard className="p-4 overflow-hidden">
        <div className="h-[500px] rounded-lg overflow-hidden">
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
                      <h3 className="font-bold text-[#6b6b6b] mb-1">{store.name}</h3>
                      <p className="text-sm text-[#9b9b9b] mb-2">{store.address}</p>
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-[#6b6b6b]">{store.avgRating.toFixed(1)}</span>
                        <span className="text-sm text-[#9b9b9b]">({store.reviewCount} reviews)</span>
                      </div>
                      {store.trend !== 'stable' && (
                        <div className="flex items-center gap-1 text-sm">
                          {store.trend === 'up' ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )}
                          <span className={store.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                            {store.trend === 'up' ? 'In Miglioramento' : 'In Calo'}
                          </span>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[#9b9b9b]">
              <div className="text-center">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nessuna posizione disponibile</p>
                <p className="text-sm mt-1">Aggiungi negozi con coordinate per vederli sulla mappa</p>
              </div>
            </div>
          )}
        </div>
      </NeumorphicCard>

      {/* Store List - MOVED BELOW MAP */}
      <NeumorphicCard className="p-6">
        <h2 className="text-lg font-bold text-[#6b6b6b] mb-4">Panoramica Locali</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStores.length > 0 ? (
            filteredStores.map(store => (
              <div
                key={store.id}
                onClick={() => setSelectedStore(store)}
                className={`
                  neumorphic-flat p-4 cursor-pointer transition-all hover:shadow-xl
                  ${selectedStore?.id === store.id ? 'neumorphic-pressed' : ''}
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-[#6b6b6b]">{store.name}</h3>
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ background: store.color }}
                  />
                </div>
                <p className="text-sm text-[#9b9b9b] mb-2">{store.address}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold text-[#6b6b6b]">{store.avgRating.toFixed(1)}</span>
                    <span className="text-xs text-[#9b9b9b]">({store.reviewCount})</span>
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
              <p className="text-[#9b9b9b]">Nessun locale corrisponde ai filtri</p>
            </div>
          )}
        </div>
      </NeumorphicCard>

      {/* Selected Store Details */}
      {selectedStore && (
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#6b6b6b]">{selectedStore.name}</h2>
            <NeumorphicButton onClick={() => setSelectedStore(null)}>
              Chiudi
            </NeumorphicButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="neumorphic-pressed p-4 rounded-xl text-center">
              <p className="text-sm text-[#9b9b9b] mb-2">Valutazione Media</p>
              <div className="flex items-center justify-center gap-2">
                <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                <span className="text-3xl font-bold text-[#6b6b6b]">
                  {selectedStore.avgRating.toFixed(1)}
                </span>
              </div>
            </div>
            
            <div className="neumorphic-pressed p-4 rounded-xl text-center">
              <p className="text-sm text-[#9b9b9b] mb-2">Totale Recensioni</p>
              <span className="text-3xl font-bold text-[#6b6b6b]">
                {selectedStore.reviewCount}
              </span>
            </div>

            <div className="neumorphic-pressed p-4 rounded-xl text-center">
              <p className="text-sm text-[#9b9b9b] mb-2">Trend</p>
              <div className="flex items-center justify-center gap-2">
                {selectedStore.trend === 'up' ? (
                  <>
                    <TrendingUp className="w-6 h-6 text-green-600" />
                    <span className="text-xl font-bold text-green-600">In Miglioramento</span>
                  </>
                ) : selectedStore.trend === 'down' ? (
                  <>
                    <TrendingDown className="w-6 h-6 text-red-600" />
                    <span className="text-xl font-bold text-red-600">In Calo</span>
                  </>
                ) : (
                  <span className="text-xl font-bold text-[#6b6b6b]">Stabile</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#6b6b6b]">
              {showAllReviews ? 'Tutte le Recensioni' : 'Recensioni Recenti'}
            </h3>
            <div className="flex items-center gap-3">
              {showAllReviews && (
                <select
                  value={reviewFilterRating}
                  onChange={(e) => setReviewFilterRating(e.target.value)}
                  className="neumorphic-pressed px-4 py-2 rounded-xl text-[#6b6b6b] outline-none text-sm"
                >
                  <option value="all">Tutte le Stelle</option>
                  <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                  <option value="4">⭐⭐⭐⭐ (4)</option>
                  <option value="3">⭐⭐⭐ (3)</option>
                  <option value="2">⭐⭐ (2)</option>
                  <option value="1">⭐ (1)</option>
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
                    Mostra Recenti
                  </>
                ) : (
                  <>
                    <List className="w-4 h-4" />
                    Mostra Tutte ({selectedStore.reviewCount})
                  </>
                )}
              </NeumorphicButton>
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {(showAllReviews ? filteredAllReviews : selectedStore.recentReviews).length > 0 ? (
              (showAllReviews ? filteredAllReviews : selectedStore.recentReviews).map(review => (
                <div key={review.id} className="neumorphic-flat p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#6b6b6b]">{review.customer_name || 'Anonimo'}</span>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-sm text-[#9b9b9b]">
                      {format(new Date(review.review_date), 'dd/MM/yyyy HH:mm', { locale: it })}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-[#6b6b6b]">{review.comment}</p>
                  )}
                  {review.employee_assigned_name && (
                    <p className="text-xs text-blue-600 mt-2">
                      👤 Assegnata a: {review.employee_assigned_name}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-[#9b9b9b] py-8">
                {showAllReviews && reviewFilterRating !== 'all' 
                  ? `Nessuna recensione con ${reviewFilterRating} stelle` 
                  : 'Nessuna recensione disponibile'}
              </p>
            )}
          </div>
        </NeumorphicCard>
      )}
    </div>
  );
}