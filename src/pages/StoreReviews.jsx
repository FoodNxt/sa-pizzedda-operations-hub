import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Star, Filter, MapPin, TrendingUp, TrendingDown, X, List, Calendar, Sparkles, Settings, Copy, Check } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { format, parseISO, isValid, subDays, subMonths, startOfMonth, isAfter, isBefore } from 'date-fns';
import { it } from 'date-fns/locale';

// New imports for Recharts
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png'
});

export default function StoreReviews() {
  const [filterRating, setFilterRating] = useState('all');
  const [selectedStore, setSelectedStore] = useState(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewFilterRating, setReviewFilterRating] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [generatingResponseFor, setGeneratingResponseFor] = useState(null);
  const [aiResponses, setAiResponses] = useState({});
  const [copiedReviewId, setCopiedReviewId] = useState(null);
  const [showMoodSettings, setShowMoodSettings] = useState(false);
  const [responseMood, setResponseMood] = useState('professionale');

  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => base44.entities.Review.list('-review_date')
  });

  const { data: moodConfigs = [] } = useQuery({
    queryKey: ['review-response-configs'],
    queryFn: () => base44.entities.ReviewResponseConfig.list()
  });

  // Load saved mood on mount
  useEffect(() => {
    const activeConfig = moodConfigs.find((c) => c.is_active);
    if (activeConfig) {
      setResponseMood(activeConfig.response_mood);
    }
  }, [moodConfigs]);

  const saveMoodMutation = useMutation({
    mutationFn: async (mood) => {
      // Deactivate all existing configs
      for (const config of moodConfigs) {
        await base44.entities.ReviewResponseConfig.update(config.id, { is_active: false });
      }
      // Create new active config
      return base44.entities.ReviewResponseConfig.create({
        response_mood: mood,
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-response-configs'] });
    }
  });

  // Helper function to safely format dates
  const safeFormatDate = (dateString, formatStr = 'dd/MM/yyyy HH:mm') => {
    if (!dateString) return 'N/A';

    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return 'N/A';
      return format(date, formatStr, { locale: it });
    } catch (e) {
      return 'N/A';
    }
  };

  // Calculate date range filter
  const getDateRangeFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case '7':
        return subDays(now, 7);
      case '30':
        return subDays(now, 30);
      case 'month':
        return startOfMonth(now);
      case '180':
        return subMonths(now, 6);
      case '365':
        return subMonths(now, 12);
      default:
        return null;
    }
  };

  const dateRangeStart = getDateRangeFilter();

  // Filter reviews by date range
  const filteredReviewsByDate = useMemo(() => {
    if (!dateRangeStart) return reviews;

    return reviews.filter((review) => {
      if (!review.review_date) return false;
      try {
        const reviewDate = parseISO(review.review_date);
        if (!isValid(reviewDate)) return false;
        return isAfter(reviewDate, dateRangeStart);
      } catch (e) {
        return false;
      }
    });
  }, [reviews, dateRangeStart]);

  // Calculate store metrics with date filter
  const storeMetrics = useMemo(() => {
    return stores.map((store) => {
      const storeReviews = filteredReviewsByDate.filter((r) => r.store_id === store.id);
      const avgRating = storeReviews.length > 0 ?
      storeReviews.reduce((sum, r) => sum + r.rating, 0) / storeReviews.length :
      0;

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
    });
  }, [stores, filteredReviewsByDate]);

  // Calculate overall metrics (when no store is selected)
  const overallMetrics = useMemo(() => {
    const allReviews = filteredReviewsByDate;
    const avgRating = allReviews.length > 0 ?
    allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length :
    0;

    const recent = allReviews.slice(0, 10);
    const previous = allReviews.slice(10, 20);
    const recentAvg = recent.length > 0 ? recent.reduce((sum, r) => sum + r.rating, 0) / recent.length : 0;
    const previousAvg = previous.length > 0 ? previous.reduce((sum, r) => sum + r.rating, 0) / previous.length : 0;
    const trend = recentAvg > previousAvg ? 'up' : recentAvg < previousAvg ? 'down' : 'stable';

    return {
      avgRating,
      reviewCount: allReviews.length,
      allReviews,
      recentReviews: allReviews.slice(0, 5),
      trend
    };
  }, [filteredReviewsByDate]);

  // Filter stores
  const filteredStores = storeMetrics.filter((store) => {
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
      filtered = filtered.filter((r) => r.rating === rating);
    }

    return filtered;
  }, [selectedStore, reviewFilterRating]);

  // Calculate map center and bounds for better zoom
  const mapCenter = useMemo(() => {
    const storesWithCoords = storeMetrics.filter(s => s.latitude && s.longitude);
    if (storesWithCoords.length === 0) return [41.9028, 12.4964];

    const latitudes = storesWithCoords.map((s) => s.latitude);
    const longitudes = storesWithCoords.map((s) => s.longitude);

    const centerLat = latitudes.reduce((sum, lat) => sum + lat, 0) / latitudes.length;
    const centerLng = longitudes.reduce((sum, lng) => sum + lng, 0) / longitudes.length;

    return [centerLat, centerLng];
  }, [storeMetrics]);

  const mapBounds = useMemo(() => {
    const storesWithCoords = storeMetrics.filter(s => s.latitude && s.longitude);
    if (storesWithCoords.length === 0) return null;

    const latitudes = storesWithCoords.map((s) => s.latitude);
    const longitudes = storesWithCoords.map((s) => s.longitude);

    return [
    [Math.min(...latitudes), Math.min(...longitudes)],
    [Math.max(...latitudes), Math.max(...longitudes)]];

  }, [storeMetrics]);

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
      iconAnchor: [15, 30]
    });
  };

  // Calculate rating trend data for selected store or overall
  const ratingTrendData = useMemo(() => {
    const reviews = selectedStore ? selectedStore.allReviews : overallMetrics.allReviews;

    const reviewsByDate = {};
    reviews.forEach((review) => {
      if (!review.review_date) return;

      try {
        const reviewDate = parseISO(review.review_date);
        if (!isValid(reviewDate)) return;

        const date = format(reviewDate, 'yyyy-MM-dd');
        if (!reviewsByDate[date]) {
          reviewsByDate[date] = { ratings: [], count: 0 };
        }
        reviewsByDate[date].ratings.push(review.rating);
        reviewsByDate[date].count++;
      } catch (e) {
        return;
      }
    });

    const trendData = Object.entries(reviewsByDate).
    map(([date, data]) => {
      try {
        const parsedDate = parseISO(date);
        if (!isValid(parsedDate)) return null;

        return {
          date,
          avgRating: (data.ratings.reduce((sum, r) => sum + r, 0) / data.count).toFixed(1),
          count: data.count
        };
      } catch (e) {
        return null;
      }
    }).
    filter((item) => item !== null).
    sort((a, b) => new Date(a.date) - new Date(b.date)).
    slice(-30);

    return trendData;
  }, [selectedStore, overallMetrics]);

  // Generate AI analysis
  const generateAIAnalysis = async () => {
    setLoadingAnalysis(true);
    setAiAnalysis(null);

    try {
      const reviewsToAnalyze = selectedStore ? selectedStore.allReviews : overallMetrics.allReviews;
      const storeName = selectedStore ? selectedStore.name : 'tutti i locali';

      const reviewTexts = reviewsToAnalyze.
      filter((r) => r.comment).
      slice(0, 50).
      map((r) => `[${r.rating}⭐] ${r.comment}`).
      join('\n');

      const prompt = `Analizza le seguenti recensioni per ${storeName} nel periodo selezionato (${dateRange === '7' ? 'ultimi 7 giorni' : dateRange === '30' ? 'ultimi 30 giorni' : dateRange === 'month' ? 'mese in corso' : dateRange === '180' ? 'ultimi 6 mesi' : 'ultimi 12 mesi'}):

${reviewTexts}

Fornisci:
1. Trend generale: cosa emerge dall'andamento delle recensioni
2. Temi principali: quali sono i 3-4 aspetti più menzionati (positivi e negativi)
3. Insights: suggerimenti concreti per migliorare

Rispondi in italiano, in modo conciso e actionable.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            trend: { type: 'string' },
            temi_principali: {
              type: 'array',
              items: { type: 'string' }
            },
            insights: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      });

      setAiAnalysis(result);
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      setAiAnalysis({ error: 'Errore durante l\'analisi' });
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // Generate AI response for a specific review
  const generateAIResponse = async (review) => {
    setGeneratingResponseFor(review.id);

    try {
      const moodInstructions = {
        professionale: 'Rispondi in modo professionale e cortese',
        amichevole: 'Rispondi in modo amichevole e caloroso, come se stessi parlando con un amico',
        formale: 'Rispondi in modo formale ed elegante',
        entusiasta: 'Rispondi con entusiasmo e positività',
        empatico: 'Rispondi mostrando empatia e comprensione per il cliente'
      };

      const prompt = `Sei il manager di una pizzeria chiamata "Sa Pizzedda". Genera una risposta alla seguente recensione di un cliente.

RECENSIONE:
Rating: ${review.rating}/5 stelle
Cliente: ${review.customer_name || 'Cliente'}
Commento: ${review.comment || 'Nessun commento'}
Data: ${safeFormatDate(review.review_date, 'dd/MM/yyyy')}

ISTRUZIONI:
${moodInstructions[responseMood]}
- Ringrazia il cliente per il feedback
- Se il rating è alto (4-5), rinforza gli aspetti positivi
- Se il rating è basso (1-3), mostra comprensione e volontà di migliorare
- Mantieni un tono ${responseMood}
- Firma con "Il Team di Sa Pizzedda"
- Massimo 3-4 righe

Genera SOLO la risposta, senza introduzioni o spiegazioni.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt
      });

      setAiResponses((prev) => ({
        ...prev,
        [review.id]: response
      }));
    } catch (error) {
      console.error('Error generating AI response:', error);
      setAiResponses((prev) => ({
        ...prev,
        [review.id]: 'Errore durante la generazione della risposta'
      }));
    } finally {
      setGeneratingResponseFor(null);
    }
  };

  const copyToClipboard = (text, reviewId) => {
    navigator.clipboard.writeText(text);
    setCopiedReviewId(reviewId);
    setTimeout(() => setCopiedReviewId(null), 2000);
  };

  return (
    <ProtectedPage pageName="StoreReviews">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="mb-4 lg:mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="mb-1 text-2xl font-bold lg:text-3xl" style={{ color: '#000000' }}>Store Reviews
              </h1>
              <p className="text-sm" style={{ color: '#000000' }}>Panoramica geografica del feedback dei clienti</p>
            </div>
            
            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <div className="neumorphic-flat px-4 py-2 flex items-center gap-2 rounded-xl">
                <Calendar className="w-4 h-4 text-slate-400" />
                <select
                  value={dateRange}
                  onChange={(e) => {
                    setDateRange(e.target.value);
                    setAiAnalysis(null);
                  }}
                  className="bg-transparent text-slate-700 outline-none text-sm">

                  <option value="7">Ultimi 7 giorni</option>
                  <option value="30">Ultimi 30 giorni</option>
                  <option value="month">Mese in corso</option>
                  <option value="180">Ultimi 6 mesi</option>
                  <option value="365">Ultimi 12 mesi</option>
                </select>
              </div>
              <div className="neumorphic-flat px-4 py-2 flex items-center gap-2 rounded-xl">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value)}
                  className="bg-transparent text-slate-700 outline-none text-sm">

                  <option value="all">Tutte</option>
                  <option value="4.5">4.5+</option>
                  <option value="4.0">4.0+</option>
                  <option value="3.5">3.5+</option>
                </select>
              </div>
              <NeumorphicButton
                onClick={() => setShowMoodSettings(!showMoodSettings)}
                className="flex items-center gap-2">

                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Mood AI</span>
              </NeumorphicButton>
            </div>
          </div>
        </div>

        {/* Mood Settings */}
        {showMoodSettings &&
        <NeumorphicCard className="p-4 lg:p-6 bg-blue-50 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Impostazioni Mood Risposte AI
              </h3>
              <button onClick={() => setShowMoodSettings(false)} className="text-slate-500 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">Seleziona il tono delle risposte generate dall'AI:</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
            { value: 'professionale', label: 'Professionale', emoji: '👔' },
            { value: 'amichevole', label: 'Amichevole', emoji: '😊' },
            { value: 'formale', label: 'Formale', emoji: '🎩' },
            { value: 'entusiasta', label: 'Entusiasta', emoji: '🎉' },
            { value: 'empatico', label: 'Empatico', emoji: '💙' }].
            map((mood) =>
            <button
              key={mood.value}
              type="button"
              onClick={() => {
                setResponseMood(mood.value);
                saveMoodMutation.mutate(mood.value);
              }}
              disabled={saveMoodMutation.isPending}
              className={`px-3 py-2 rounded-xl font-medium text-sm transition-all ${
              responseMood === mood.value ?
              'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' :
              'neumorphic-flat text-slate-700 hover:shadow-md'}`
              }>

                  <div className="text-lg mb-1">{mood.emoji}</div>
                  {mood.label}
                </button>
            )}
            </div>
            {saveMoodMutation.isPending &&
          <p className="text-xs text-blue-600 mt-3 flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Salvataggio mood...
              </p>
          }
          </NeumorphicCard>
        }

        {/* Map */}
        <NeumorphicCard className="p-4 lg:p-6 overflow-hidden">
          <div className="h-[400px] lg:h-[500px] rounded-xl overflow-hidden">
            {storeMetrics.filter(s => s.latitude && s.longitude).length > 0 ?
            <MapContainer
              center={mapCenter}
              zoom={mapBounds ? undefined : 10}
              bounds={mapBounds}
              style={{ height: '100%', width: '100%' }}>

                <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />

                {filteredStores.filter(s => s.latitude && s.longitude).map((store) =>
              <Marker
                key={store.id}
                position={[store.latitude, store.longitude]}
                icon={createCustomIcon(store.color)}
                eventHandlers={{
                  click: () => setSelectedStore(store)
                }}>

                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold text-slate-800 mb-1">{store.name}</h3>
                        <p className="text-sm text-slate-500 mb-2">{store.address}</p>
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-bold text-slate-800">{store.avgRating.toFixed(1)}</span>
                          <span className="text-sm text-slate-500">({store.reviewCount})</span>
                        </div>
                        {store.trend !== 'stable' &&
                    <div className="flex items-center gap-1 text-sm">
                            {store.trend === 'up' ?
                      <TrendingUp className="w-4 h-4 text-green-600" /> :

                      <TrendingDown className="w-4 h-4 text-red-600" />
                      }
                            <span className={store.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                              {store.trend === 'up' ? 'Migliora' : 'Calo'}
                            </span>
                          </div>
                    }
                      </div>
                    </Popup>
                  </Marker>
              )}
              </MapContainer> :

            <div className="h-full flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nessuna posizione disponibile</p>
                </div>
              </div>
            }
          </div>
        </NeumorphicCard>

        {/* Store List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {filteredStores.length > 0 ?
          filteredStores.map((store) =>
          <div
            key={store.id}
            onClick={() => setSelectedStore(store)}
            className={`cursor-pointer transition-all hover:shadow-xl p-4 lg:p-5 rounded-xl ${
            selectedStore?.id === store.id ? 'neumorphic-pressed' : 'neumorphic-flat'}`
            }>

                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm lg:text-base truncate">{store.name}</h3>
                    <p className="text-xs lg:text-sm text-slate-500 truncate">{store.address}</p>
                  </div>
                  <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: store.color }} />

                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold text-slate-800">{store.avgRating.toFixed(1)}</span>
                    <span className="text-xs text-slate-500">({store.reviewCount})</span>
                  </div>
                  {store.trend !== 'stable' && (
              store.trend === 'up' ?
              <TrendingUp className="w-4 h-4 text-green-600" /> :

              <TrendingDown className="w-4 h-4 text-red-600" />)

              }
                </div>
              </div>
          ) :

          <div className="col-span-full text-center py-8">
              <p className="text-slate-500">Nessun locale</p>
            </div>
          }
        </div>

        {/* Overall Metrics (when no store selected) */}
        {!selectedStore && overallMetrics.reviewCount > 0 &&
        <NeumorphicCard className="p-4 lg:p-6">
            <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-4 lg:mb-6">Panoramica Generale</h2>

            <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-4 lg:mb-6">
              <div className="neumorphic-pressed p-3 lg:p-4 rounded-xl text-center">
                <p className="text-xs text-slate-500 mb-1 lg:mb-2">Media</p>
                <div className="flex items-center justify-center gap-2">
                  <Star className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-500 fill-yellow-500" />
                  <span className="text-2xl lg:text-3xl font-bold text-slate-800">
                    {overallMetrics.avgRating.toFixed(1)}
                  </span>
                </div>
              </div>
              
              <div className="neumorphic-pressed p-3 lg:p-4 rounded-xl text-center">
                <p className="text-xs text-slate-500 mb-1 lg:mb-2">Totale</p>
                <span className="text-2xl lg:text-3xl font-bold text-slate-800">
                  {overallMetrics.reviewCount}
                </span>
              </div>

              <div className="neumorphic-pressed p-3 lg:p-4 rounded-xl text-center">
                <p className="text-xs text-slate-500 mb-1 lg:mb-2">Trend</p>
                <div className="flex items-center justify-center gap-2">
                  {overallMetrics.trend === 'up' ?
                <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" /> :
                overallMetrics.trend === 'down' ?
                <TrendingDown className="w-5 h-5 lg:w-6 lg:h-6 text-red-600" /> :

                <span className="text-base lg:text-lg font-bold text-slate-600">Stabile</span>
                }
                </div>
              </div>
            </div>

            {/* AI Analysis Button and Results */}
            <div className="mb-4 lg:mb-6">
              <NeumorphicButton
              onClick={generateAIAnalysis}
              disabled={loadingAnalysis}
              variant="primary"
              className="w-full flex items-center justify-center gap-2">

                {loadingAnalysis ?
              <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analisi in corso...
                  </> :

              <>
                    <Sparkles className="w-5 h-5" />
                    Analisi AI
                  </>
              }
              </NeumorphicButton>

              {aiAnalysis && !aiAnalysis.error &&
            <div className="neumorphic-flat p-4 lg:p-6 rounded-xl mt-4 space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      Trend Generale
                    </h4>
                    <p className="text-sm text-slate-700">{aiAnalysis.trend}</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-600" />
                      Temi Principali
                    </h4>
                    <ul className="space-y-1">
                      {aiAnalysis.temi_principali?.map((tema, idx) =>
                  <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          {tema}
                        </li>
                  )}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      Insights
                    </h4>
                    <ul className="space-y-1">
                      {aiAnalysis.insights?.map((insight, idx) =>
                  <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                          <span className="text-purple-600">•</span>
                          {insight}
                        </li>
                  )}
                    </ul>
                  </div>
                </div>
            }
            </div>

            {/* Rating Trend Chart */}
            {ratingTrendData.length > 0 &&
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
                          if (!isValid(parsedDate)) return '';
                          return format(parsedDate, 'dd/MM');
                        } catch (e) {
                          return '';
                        }
                      }} />

                        <YAxis
                      stroke="#64748b"
                      domain={[0, 5]}
                      ticks={[0, 1, 2, 3, 4, 5]}
                      tick={{ fontSize: 11 }} />

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
                          if (!isValid(parsedDate)) return date;
                          return format(parsedDate, 'dd/MM/yyyy');
                        } catch (e) {
                          return date;
                        }
                      }} />

                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line
                      type="monotone"
                      dataKey="avgRating"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      name="Media"
                      dot={{ fill: '#3b82f6', r: 4 }} />

                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
          }

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base lg:text-lg font-bold text-slate-800">
                {showAllReviews ? 'Tutte le Recensioni' : 'Recensioni Recenti'}
              </h3>
              <NeumorphicButton
              onClick={() => setShowAllReviews(!showAllReviews)}
              className="flex items-center gap-2">

                {showAllReviews ?
              <>
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">Recenti</span>
                  </> :

              <>
                    <List className="w-4 h-4" />
                    <span className="hidden sm:inline">Tutte ({overallMetrics.reviewCount})</span>
                  </>
              }
              </NeumorphicButton>
            </div>

            {showAllReviews &&
          <div className="flex gap-2 mb-4">
                <select
              value={reviewFilterRating}
              onChange={(e) => setReviewFilterRating(e.target.value)}
              className="neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm">

                  <option value="all">Tutte</option>
                  <option value="5">⭐⭐⭐⭐⭐</option>
                  <option value="4">⭐⭐⭐⭐</option>
                  <option value="3">⭐⭐⭐</option>
                  <option value="2">⭐⭐</option>
                  <option value="1">⭐</option>
                </select>
              </div>
          }

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {(() => {
              let reviewsToShow = showAllReviews ? overallMetrics.allReviews : overallMetrics.recentReviews;
              if (showAllReviews && reviewFilterRating !== 'all') {
                reviewsToShow = reviewsToShow.filter((r) => r.rating === parseInt(reviewFilterRating));
              }
              return reviewsToShow.length > 0 ?
              reviewsToShow.map((review) =>
              <div key={review.id} className="neumorphic-flat p-3 lg:p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-medium text-slate-800 text-sm truncate">{review.customer_name || 'Anonimo'}</span>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) =>
                      <Star
                        key={i}
                        className={`w-3 h-3 lg:w-4 lg:h-4 ${
                        i < review.rating ?
                        'text-yellow-500 fill-yellow-500' :
                        'text-gray-300'}`
                        } />

                      )}
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                        {safeFormatDate(review.review_date, 'dd/MM/yy')}
                      </span>
                    </div>
                    {review.comment &&
                <p className="text-xs lg:text-sm text-slate-700 mb-2">{review.comment}</p>
                }
                    {review.employee_assigned_name &&
                <p className="text-xs text-blue-600 mt-2">
                        👤 {review.employee_assigned_name}
                      </p>
                }
                    
                    {/* AI Response Section */}
                    {review.comment &&
                <div className="mt-3 pt-3 border-t border-slate-200">
                        {!aiResponses[review.id] ?
                  <button
                    onClick={() => generateAIResponse(review)}
                    disabled={generatingResponseFor === review.id}
                    className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
                    generatingResponseFor === review.id ?
                    'bg-blue-100 text-blue-600' :
                    'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700'}`
                    }>

                            {generatingResponseFor === review.id ?
                    <>
                                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                Generazione...
                              </> :

                    <>
                                <Sparkles className="w-3 h-3" />
                                Genera Risposta AI
                              </>
                    }
                          </button> :

                  <div className="neumorphic-pressed p-3 rounded-lg bg-purple-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-purple-700">Risposta AI ({responseMood})</span>
                              <button
                        onClick={() => copyToClipboard(aiResponses[review.id], review.id)}
                        className="text-purple-600 hover:text-purple-700">

                                {copiedReviewId === review.id ?
                        <Check className="w-4 h-4" /> :

                        <Copy className="w-4 h-4" />
                        }
                              </button>
                            </div>
                            <p className="text-xs text-slate-700 whitespace-pre-line">{aiResponses[review.id]}</p>
                          </div>
                  }
                      </div>
                }
                  </div>
              ) :

              <p className="text-center text-slate-500 py-8 text-sm">
                  {showAllReviews && reviewFilterRating !== 'all' ?
                `Nessuna recensione con ${reviewFilterRating} stelle` :
                'Nessuna recensione'}
                </p>;

            })()}
            </div>
          </NeumorphicCard>
        }

        {/* Selected Store Details */}
        {selectedStore &&
        <NeumorphicCard className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h2 className="text-xl lg:text-2xl font-bold text-slate-800">{selectedStore.name}</h2>
              <NeumorphicButton onClick={() => {
              setSelectedStore(null);
              setAiAnalysis(null);
            }}>
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
                  {selectedStore.trend === 'up' ?
                <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" /> :
                selectedStore.trend === 'down' ?
                <TrendingDown className="w-5 h-5 lg:w-6 lg:h-6 text-red-600" /> :

                <span className="text-base lg:text-lg font-bold text-slate-600">Stabile</span>
                }
                </div>
              </div>
            </div>

            {/* AI Analysis Button and Results */}
            <div className="mb-4 lg:mb-6">
              <NeumorphicButton
              onClick={generateAIAnalysis}
              disabled={loadingAnalysis}
              variant="primary"
              className="w-full flex items-center justify-center gap-2">

                {loadingAnalysis ?
              <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analisi in corso...
                  </> :

              <>
                    <Sparkles className="w-5 h-5" />
                    Analisi AI
                  </>
              }
              </NeumorphicButton>

              {aiAnalysis && !aiAnalysis.error &&
            <div className="neumorphic-flat p-4 lg:p-6 rounded-xl mt-4 space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      Trend Generale
                    </h4>
                    <p className="text-sm text-slate-700">{aiAnalysis.trend}</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-600" />
                      Temi Principali
                    </h4>
                    <ul className="space-y-1">
                      {aiAnalysis.temi_principali?.map((tema, idx) =>
                  <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          {tema}
                        </li>
                  )}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      Insights
                    </h4>
                    <ul className="space-y-1">
                      {aiAnalysis.insights?.map((insight, idx) =>
                  <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                          <span className="text-purple-600">•</span>
                          {insight}
                        </li>
                  )}
                    </ul>
                  </div>
                </div>
            }
            </div>

            {/* Rating Trend Chart */}
            {ratingTrendData.length > 0 &&
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
                      }} />

                        <YAxis
                      stroke="#64748b"
                      domain={[0, 5]}
                      ticks={[0, 1, 2, 3, 4, 5]}
                      tick={{ fontSize: 11 }} />

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
                      }} />

                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line
                      type="monotone"
                      dataKey="avgRating"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      name="Media"
                      dot={{ fill: '#3b82f6', r: 4 }} />

                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
          }

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base lg:text-lg font-bold text-slate-800">
                {showAllReviews ? 'Tutte le Recensioni' : 'Recensioni Recenti'}
              </h3>
              <div className="flex items-center gap-3">
                {showAllReviews &&
              <select
                value={reviewFilterRating}
                onChange={(e) => setReviewFilterRating(e.target.value)}
                className="neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm">

                    <option value="all">Tutte</option>
                    <option value="5">⭐⭐⭐⭐⭐</option>
                    <option value="4">⭐⭐⭐⭐</option>
                    <option value="3">⭐⭐⭐</option>
                    <option value="2">⭐⭐</option>
                    <option value="1">⭐</option>
                  </select>
              }
                <NeumorphicButton
                onClick={() => {
                  setShowAllReviews(!showAllReviews);
                  setReviewFilterRating('all');
                }}
                className="flex items-center gap-2">

                  {showAllReviews ?
                <>
                      <X className="w-4 h-4" />
                      <span className="hidden sm:inline">Recenti</span>
                    </> :

                <>
                      <List className="w-4 h-4" />
                      <span className="hidden sm:inline">Tutte ({selectedStore.reviewCount})</span>
                    </>
                }
                </NeumorphicButton>
              </div>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {(showAllReviews ? filteredAllReviews : selectedStore.recentReviews).length > 0 ?
            (showAllReviews ? filteredAllReviews : selectedStore.recentReviews).map((review) =>
            <div key={review.id} className="neumorphic-flat p-3 lg:p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-medium text-slate-800 text-sm truncate">{review.customer_name || 'Anonimo'}</span>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) =>
                    <Star
                      key={i}
                      className={`w-3 h-3 lg:w-4 lg:h-4 ${
                      i < review.rating ?
                      'text-yellow-500 fill-yellow-500' :
                      'text-gray-300'}`
                      } />

                    )}
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                        {safeFormatDate(review.review_date, 'dd/MM/yy')}
                      </span>
                    </div>
                    {review.comment &&
              <p className="text-xs lg:text-sm text-slate-700 mb-2">{review.comment}</p>
              }
                    {review.employee_assigned_name &&
              <p className="text-xs text-blue-600 mt-2">
                        👤 {review.employee_assigned_name}
                      </p>
              }
                    
                    {/* AI Response Section */}
                    {review.comment &&
              <div className="mt-3 pt-3 border-t border-slate-200">
                        {!aiResponses[review.id] ?
                <button
                  onClick={() => generateAIResponse(review)}
                  disabled={generatingResponseFor === review.id}
                  className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
                  generatingResponseFor === review.id ?
                  'bg-blue-100 text-blue-600' :
                  'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700'}`
                  }>

                            {generatingResponseFor === review.id ?
                  <>
                                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                Generazione...
                              </> :

                  <>
                                <Sparkles className="w-3 h-3" />
                                Genera Risposta AI
                              </>
                  }
                          </button> :

                <div className="neumorphic-pressed p-3 rounded-lg bg-purple-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-purple-700">Risposta AI ({responseMood})</span>
                              <button
                      onClick={() => copyToClipboard(aiResponses[review.id], review.id)}
                      className="text-purple-600 hover:text-purple-700">

                                {copiedReviewId === review.id ?
                      <Check className="w-4 h-4" /> :

                      <Copy className="w-4 h-4" />
                      }
                              </button>
                            </div>
                            <p className="text-xs text-slate-700 whitespace-pre-line">{aiResponses[review.id]}</p>
                          </div>
                }
                      </div>
              }
                  </div>
            ) :

            <p className="text-center text-slate-500 py-8 text-sm">
                  {showAllReviews && reviewFilterRating !== 'all' ?
              `Nessuna recensione con ${reviewFilterRating} stelle` :
              'Nessuna recensione'}
                </p>
            }
            </div>
          </NeumorphicCard>
        }
      </div>
    </ProtectedPage>);

}