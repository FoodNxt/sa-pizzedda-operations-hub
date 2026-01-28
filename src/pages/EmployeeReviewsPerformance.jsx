import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Star, TrendingUp, TrendingDown, Award, Users, Calendar, MapPin, CheckCircle } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { format, parseISO, isWithinInterval } from 'date-fns';

export default function EmployeeReviewsPerformance() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [sortBy, setSortBy] = useState('rating');

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => base44.entities.Review.list('-review_date')
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-dipendenti'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter((u) => u.user_type === 'user' || u.user_type === 'dipendente');
    }
  });

  const { data: turniPlanday = [] } = useQuery({
    queryKey: ['turni-planday'],
    queryFn: () => base44.entities.TurnoPlanday.list()
  });

  // Process employee performance data - Only users with Planday shifts
  const employeePerformance = useMemo(() => {
    // Get unique dipendenti IDs from Planday shifts
    const dipendenteIdsWithShifts = new Set(
      turniPlanday.filter((t) => t.dipendente_id).map((t) => t.dipendente_id)
    );

    // Filter users to only those with Planday shifts
    const validUsers = users.filter((u) => dipendenteIdsWithShifts.has(u.id));

    // Create a map of normalized names to user IDs for matching
    const nameToUserMap = new Map();
    validUsers.forEach((user) => {
      const displayName = (user.nome_cognome || user.full_name || '').toLowerCase().trim();
      if (displayName) {
        nameToUserMap.set(displayName, user);
      }
    });

    // Filter reviews by date and store
    let filteredReviews = reviews.filter((r) => r.employee_assigned_name);

    // Date filter
    if (startDate || endDate) {
      filteredReviews = filteredReviews.filter((review) => {
        if (!review.review_date) return false;

        try {
          const reviewDate = parseISO(review.review_date);
          if (isNaN(reviewDate.getTime())) return false;

          const start = startDate ? parseISO(startDate + 'T00:00:00') : null;
          const end = endDate ? parseISO(endDate + 'T23:59:59') : null;

          if (start && end) {
            return isWithinInterval(reviewDate, { start, end });
          } else if (start) {
            return reviewDate >= start;
          } else if (end) {
            return reviewDate <= end;
          }
        } catch (e) {
          return false;
        }
        return true;
      });
    }

    // Store filter
    if (selectedStore !== 'all') {
      filteredReviews = filteredReviews.filter((r) => r.store_id === selectedStore);
    }

    // Group by employee - ONLY valid users with Planday shifts
    const employeeMap = new Map();

    filteredReviews.forEach((review) => {
      const employeeNames = (review.employee_assigned_name || '').
      split(',').
      map((n) => n.trim()).
      filter((n) => n.length > 0);

      const uniqueNamesThisReview = [...new Set(
        employeeNames.map((name) => name.toLowerCase())
      )].map((lowerName) => {
        return employeeNames.find((n) => n.toLowerCase() === lowerName) || lowerName;
      });

      uniqueNamesThisReview.forEach((employeeName) => {
        const mapKey = employeeName.toLowerCase();

        // ONLY process if this name matches a valid user with Planday shifts
        const matchedUser = nameToUserMap.get(mapKey);
        if (!matchedUser) return; // Skip if no matching user

        if (!employeeMap.has(mapKey)) {
          employeeMap.set(mapKey, {
            name: matchedUser.nome_cognome || matchedUser.full_name,
            userId: matchedUser.id,
            reviews: [],
            reviewIds: new Set(),
            totalReviews: 0,
            avgRating: 0,
            ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            positiveReviews: 0,
            negativeReviews: 0,
            stores: new Set()
          });
        }

        const emp = employeeMap.get(mapKey);

        if (!emp.reviewIds.has(review.id)) {
          emp.reviewIds.add(review.id);
          emp.reviews.push(review);
          emp.totalReviews++;
          emp.ratings[review.rating]++;
          emp.stores.add(review.store_id);

          if (review.rating >= 4) emp.positiveReviews++;
          if (review.rating < 3) emp.negativeReviews++;
        }
      });
    });

    // Calculate averages and convert to array
    const employeeArray = Array.from(employeeMap.values()).map((emp) => {
      const totalRating = emp.reviews.reduce((sum, r) => sum + r.rating, 0);
      emp.avgRating = emp.totalReviews > 0 ? totalRating / emp.totalReviews : 0;
      emp.positiveRate = emp.totalReviews > 0 ? emp.positiveReviews / emp.totalReviews * 100 : 0;
      emp.storeCount = emp.stores.size;
      delete emp.reviewIds;
      return emp;
    });

    // Sort based on sortBy
    if (sortBy === 'rating') {
      return employeeArray.sort((a, b) => b.avgRating - a.avgRating);
    } else if (sortBy === 'reviews') {
      return employeeArray.sort((a, b) => b.totalReviews - a.totalReviews);
    }
    return employeeArray;
  }, [reviews, selectedStore, startDate, endDate, users, turniPlanday, sortBy]);

  const getStoreName = (storeId) => {
    const store = stores.find((s) => s.id === storeId);
    return store?.name || 'Sconosciuto';
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-blue-600';
    if (rating >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (rating) => {
    if (rating >= 4.5) return { label: 'Eccellente', color: 'bg-green-100 text-green-800' };
    if (rating >= 4.0) return { label: 'Ottimo', color: 'bg-blue-100 text-blue-800' };
    if (rating >= 3.5) return { label: 'Buono', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Da Migliorare', color: 'bg-red-100 text-red-800' };
  };

  // Overall stats
  const stats = {
    totalEmployees: employeePerformance.length,
    totalReviews: employeePerformance.reduce((sum, e) => sum + e.totalReviews, 0),
    avgRating: employeePerformance.length > 0 ?
    employeePerformance.reduce((sum, e) => sum + e.avgRating, 0) / employeePerformance.length :
    0,
    topPerformers: employeePerformance.filter((e) => e.avgRating >= 4.5).length
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-slate-50 mb-2 text-3xl font-bold">Performance Recensioni Dipendenti</h1>
        <p className="text-slate-50">Analisi delle recensioni assegnate ai dipendenti</p>
      </div>

      {/* Info about deduplication */}
      <NeumorphicCard className="p-4 bg-green-50">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
          <div className="text-sm text-green-800">
            <p className="font-bold mb-1">✅ Sistema Anti-Duplicati Attivo</p>
            <p>
              Questa pagina utilizza un sistema robusto per prevenire i duplicati:
            </p>
            <ul className="mt-2 space-y-1 ml-4">
              <li>• I nomi vengono normalizzati (case-insensitive, spazi rimossi)</li>
              <li>• Ogni recensione viene contata <strong>una sola volta per dipendente</strong></li>
              <li>• I duplicati nello stesso assegnamento vengono automaticamente rimossi</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <NeumorphicCard className="px-4 py-2">
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none">

            <option value="all">Tutti i Locali</option>
            {stores.map((store) =>
            <option key={store.id} value={store.id}>{store.name}</option>
            )}
          </select>
        </NeumorphicCard>

        <NeumorphicCard className="px-4 py-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none">

            <option value="rating">Ordina per Punteggio</option>
            <option value="reviews">Ordina per N° Recensioni</option>
          </select>
        </NeumorphicCard>

        <NeumorphicCard className="px-4 py-2 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#9b9b9b]" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none text-sm"
            placeholder="Data inizio" />

        </NeumorphicCard>

        <NeumorphicCard className="px-4 py-2 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#9b9b9b]" />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none text-sm"
            placeholder="Data fine" />

        </NeumorphicCard>

        {(startDate || endDate) &&
        <button
          onClick={() => {
            setStartDate('');
            setEndDate('');
          }}
          className="neumorphic-flat px-4 py-2 rounded-lg text-sm text-[#9b9b9b] hover:text-[#6b6b6b]">

            Rimuovi filtro data
          </button>
        }
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Users className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{stats.totalEmployees}</h3>
          <p className="text-sm text-[#9b9b9b]">Dipendenti con Recensioni</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Star className="w-8 h-8 text-yellow-500" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{stats.totalReviews}</h3>
          <p className="text-sm text-[#9b9b9b]">Recensioni Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className={`text-3xl font-bold mb-1 ${getRatingColor(stats.avgRating)}`}>
            {stats.avgRating.toFixed(2)}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Rating Medio</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Award className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">{stats.topPerformers}</h3>
          <p className="text-sm text-[#9b9b9b]">Top Performers (4.5+)</p>
        </NeumorphicCard>
      </div>

      {/* Employee Rankings */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Classifica Dipendenti</h2>
        
        {employeePerformance.length > 0 ?
        <div className="space-y-4">
            {employeePerformance.map((employee, index) => {
            const badge = getPerformanceBadge(employee.avgRating);

            return (
              <div
                key={employee.name}
                onClick={() => setSelectedEmployee(employee)}
                className="neumorphic-flat p-5 rounded-xl cursor-pointer hover:shadow-lg transition-all">

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="neumorphic-pressed w-12 h-12 rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-[#8b7355]">#{index + 1}</span>
                      </div>
                      
                      {/* Name and Badge */}
                      <div>
                        <h3 className="font-bold text-[#6b6b6b] text-lg">{employee.name}</h3>
                        <span className={`text-xs px-3 py-1 rounded-full ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                        <span className={`text-3xl font-bold ${getRatingColor(employee.avgRating)}`}>
                          {employee.avgRating.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm text-[#9b9b9b]">{employee.totalReviews} recensioni</p>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="neumorphic-pressed p-3 rounded-lg text-center">
                      <p className="text-xs text-[#9b9b9b] mb-1">Positive</p>
                      <p className="text-lg font-bold text-green-600">{employee.positiveReviews}</p>
                      <p className="text-xs text-[#9b9b9b]">{employee.positiveRate.toFixed(0)}%</p>
                    </div>

                    <div className="neumorphic-pressed p-3 rounded-lg text-center">
                      <p className="text-xs text-[#9b9b9b] mb-1">Negative</p>
                      <p className="text-lg font-bold text-red-600">{employee.negativeReviews}</p>
                      <p className="text-xs text-[#9b9b9b]">
                        {employee.totalReviews > 0 ? (employee.negativeReviews / employee.totalReviews * 100).toFixed(0) : 0}%
                      </p>
                    </div>

                    <div className="neumorphic-pressed p-3 rounded-lg text-center">
                      <p className="text-xs text-[#9b9b9b] mb-1">Locali</p>
                      <p className="text-lg font-bold text-[#6b6b6b]">{employee.storeCount}</p>
                    </div>
                  </div>

                  {/* Rating Distribution */}
                  <div className="mt-4 space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => {
                    const count = employee.ratings[rating];
                    const percentage = employee.totalReviews > 0 ?
                    count / employee.totalReviews * 100 :
                    0;

                    return (
                      <div key={rating} className="flex items-center gap-2">
                          <div className="flex items-center gap-1 w-12">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs text-[#6b6b6b]">{rating}</span>
                          </div>
                          <div className="flex-1 neumorphic-pressed rounded-full h-2 overflow-hidden">
                            <div
                            className="h-full bg-gradient-to-r from-[#8b7355] to-[#a68a6a]"
                            style={{ width: `${percentage}%` }} />

                          </div>
                          <span className="text-xs text-[#9b9b9b] w-12 text-right">
                            {count} ({percentage.toFixed(0)}%)
                          </span>
                        </div>);

                  })}
                  </div>
                </div>);

          })}
          </div> :

        <div className="text-center py-12">
            <Users className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
            <p className="text-[#9b9b9b]">Nessuna recensione assegnata ai dipendenti nel periodo selezionato</p>
          </div>
        }
      </NeumorphicCard>

      {/* Employee Detail Modal */}
      {selectedEmployee &&
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#6b6b6b] mb-1">{selectedEmployee.name}</h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className={`text-xl font-bold ${getRatingColor(selectedEmployee.avgRating)}`}>
                      {selectedEmployee.avgRating.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-[#9b9b9b]">•</span>
                  <span className="text-[#9b9b9b]">{selectedEmployee.totalReviews} recensioni</span>
                </div>
              </div>
              <button
              onClick={() => setSelectedEmployee(null)}
              className="neumorphic-flat px-4 py-2 rounded-lg text-[#6b6b6b]">

                Chiudi
              </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-1">Recensioni Totali</p>
                <p className="text-2xl font-bold text-[#6b6b6b]">{selectedEmployee.totalReviews}</p>
              </div>
              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-1">Positive (4-5⭐)</p>
                <p className="text-2xl font-bold text-green-600">{selectedEmployee.positiveReviews}</p>
              </div>
              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-1">Negative (1-2⭐)</p>
                <p className="text-2xl font-bold text-red-600">{selectedEmployee.negativeReviews}</p>
              </div>
              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-1">Locali</p>
                <p className="text-2xl font-bold text-[#6b6b6b]">{selectedEmployee.storeCount}</p>
              </div>
            </div>

            {/* Recent Reviews */}
            <h3 className="text-lg font-bold text-[#6b6b6b] mb-4">Recensioni Recenti</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedEmployee.reviews.slice(0, 20).map((review, idx) =>
            <div key={idx} className="neumorphic-flat p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#6b6b6b]">{review.customer_name || 'Anonimo'}</span>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) =>
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                      i < review.rating ?
                      'text-yellow-500 fill-yellow-500' :
                      'text-gray-300'}`
                      } />

                    )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#9b9b9b]">
                      <MapPin className="w-4 h-4" />
                      <span>{getStoreName(review.store_id)}</span>
                      <span>•</span>
                      <span>{format(parseISO(review.review_date), 'dd/MM/yyyy')}</span>
                    </div>
                  </div>
                  {review.comment &&
              <p className="text-sm text-[#6b6b6b]">{review.comment}</p>
              }
                </div>
            )}
            </div>
          </NeumorphicCard>
        </div>
      }
    </div>);

}