import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Crown,
  DollarSign,
  Star,
  AlertTriangle,
  Clock,
  Sparkles,
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  Store,
  CheckCircle,
  XCircle
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";

export default function DashboardStoreManager() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: targets = [] } = useQuery({
    queryKey: ['sm-targets', selectedMonth],
    queryFn: () => base44.entities.StoreManagerTarget.filter({ mese: selectedMonth })
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => base44.entities.Review.list('-review_date')
  });

  const { data: wrongOrders = [] } = useQuery({
    queryKey: ['wrong-orders'],
    queryFn: () => base44.entities.WrongOrder.list('-order_date')
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-shift_date')
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ['inspections'],
    queryFn: () => base44.entities.CleaningInspection.list('-inspection_date')
  });

  const { data: iPratico = [] } = useQuery({
    queryKey: ['ipratico'],
    queryFn: () => base44.entities.iPratico.list('-order_date')
  });

  // Trova i locali di cui l'utente è Store Manager
  const myStores = useMemo(() => {
    if (!currentUser?.id) return [];
    return stores.filter(s => s.store_manager_id === currentUser.id);
  }, [stores, currentUser]);

  // Calcola metriche per il mese selezionato
  const metrics = useMemo(() => {
    if (myStores.length === 0) return null;

    const storeIds = myStores.map(s => s.id);
    const monthStart = new Date(`${selectedMonth}-01`);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

    // Fatturato
    const monthRevenue = iPratico
      .filter(r => {
        const date = new Date(r.order_date);
        return storeIds.includes(r.store_id) && date >= monthStart && date <= monthEnd;
      })
      .reduce((acc, r) => acc + (r.total_revenue || 0), 0);

    // Recensioni
    const monthReviews = reviews.filter(r => {
      const date = new Date(r.review_date);
      return storeIds.includes(r.store_id) && date >= monthStart && date <= monthEnd;
    });
    const avgRating = monthReviews.length > 0
      ? monthReviews.reduce((acc, r) => acc + r.rating, 0) / monthReviews.length
      : 0;

    // Ordini sbagliati
    const monthWrongOrders = wrongOrders.filter(o => {
      const date = new Date(o.order_date);
      return storeIds.includes(o.store_id) && date >= monthStart && date <= monthEnd;
    });

    // Ritardi
    const monthShifts = shifts.filter(s => {
      const date = new Date(s.shift_date);
      return storeIds.includes(s.store_id) && date >= monthStart && date <= monthEnd;
    });
    const totalDelayMinutes = monthShifts.reduce((acc, s) => acc + (s.minuti_di_ritardo || 0), 0);
    const avgDelay = monthShifts.length > 0 ? totalDelayMinutes / monthShifts.length : 0;

    // Pulizie
    const monthInspections = inspections.filter(i => {
      const date = new Date(i.inspection_date);
      return storeIds.includes(i.store_id) && date >= monthStart && date <= monthEnd;
    });
    const avgCleaningScore = monthInspections.length > 0
      ? monthInspections.reduce((acc, i) => acc + (i.overall_score || 0), 0) / monthInspections.length
      : 0;

    // Target
    const target = targets.find(t => storeIds.includes(t.store_id));

    return {
      fatturato: monthRevenue,
      avgRating,
      totalReviews: monthReviews.length,
      wrongOrdersCount: monthWrongOrders.length,
      avgDelay,
      avgCleaningScore,
      totalShifts: monthShifts.length,
      totalInspections: monthInspections.length,
      target
    };
  }, [myStores, selectedMonth, iPratico, reviews, wrongOrders, shifts, inspections, targets]);

  // Scorecard dipendenti
  const employeeScorecard = useMemo(() => {
    if (myStores.length === 0) return [];

    const storeIds = myStores.map(s => s.id);
    const monthStart = new Date(`${selectedMonth}-01`);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

    // Trova dipendenti che hanno lavorato nei miei locali
    const monthShifts = shifts.filter(s => {
      const date = new Date(s.shift_date);
      return storeIds.includes(s.store_id) && date >= monthStart && date <= monthEnd;
    });

    const employeeIds = [...new Set(monthShifts.map(s => s.employee_id_external).filter(Boolean))];

    return employeeIds.map(empId => {
      const empShifts = monthShifts.filter(s => s.employee_id_external === empId);
      const user = users.find(u => u.employee_id_external === empId || u.id === empId);
      
      // Calcola metriche
      const totalDelay = empShifts.reduce((acc, s) => acc + (s.minuti_di_ritardo || 0), 0);
      const avgDelay = empShifts.length > 0 ? totalDelay / empShifts.length : 0;
      const lateShifts = empShifts.filter(s => s.ritardo).length;
      
      // Trova recensioni assegnate
      const empReviews = reviews.filter(r => 
        storeIds.includes(r.store_id) && 
        r.employee_assigned_name === (user?.nome_cognome || user?.full_name || empShifts[0]?.employee_name)
      );
      const empAvgRating = empReviews.length > 0
        ? empReviews.reduce((acc, r) => acc + r.rating, 0) / empReviews.length
        : null;

      // Locale principale
      const primaryStores = user?.primary_stores || [];
      const isPrimaryHere = primaryStores.some(ps => storeIds.includes(ps));

      return {
        id: empId,
        name: user?.nome_cognome || user?.full_name || empShifts[0]?.employee_name || 'N/A',
        email: user?.email,
        ruoli: user?.ruoli_dipendente || [],
        shiftsCount: empShifts.length,
        avgDelay,
        lateShifts,
        reviewsCount: empReviews.length,
        avgRating: empAvgRating,
        isPrimaryHere
      };
    }).sort((a, b) => b.shiftsCount - a.shiftsCount);
  }, [myStores, selectedMonth, shifts, users, reviews]);

  // Genera opzioni mesi
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  }, []);

  if (!currentUser) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <NeumorphicCard className="p-12 text-center">
          <p className="text-slate-500">Caricamento...</p>
        </NeumorphicCard>
      </div>
    );
  }

  if (myStores.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-10 h-10 text-purple-600" />
            <h1 className="text-3xl font-bold text-slate-800">Dashboard Store Manager</h1>
          </div>
        </div>
        <NeumorphicCard className="p-12 text-center">
          <Crown className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">Nessun locale assegnato</h2>
          <p className="text-slate-500">Non sei ancora stato assegnato come Store Manager di un locale.</p>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-10 h-10 text-purple-600" />
            <h1 className="text-3xl font-bold text-slate-800">Dashboard Store Manager</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {myStores.map(store => (
              <span key={store.id} className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-medium text-sm">
                {store.name}
              </span>
            ))}
          </div>
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="neumorphic-pressed px-4 py-2 rounded-xl outline-none"
        >
          {monthOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {metrics && (
        <>
          {/* Obiettivo Fatturato */}
          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold text-slate-800">Obiettivo Fatturato</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-slate-500 mb-1">Fatturato Attuale</p>
                <p className="text-3xl font-bold text-green-600">€{metrics.fatturato.toLocaleString()}</p>
              </div>
              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-slate-500 mb-1">Target</p>
                <p className="text-3xl font-bold text-slate-700">
                  {metrics.target?.target_fatturato ? `€${metrics.target.target_fatturato.toLocaleString()}` : '-'}
                </p>
              </div>
              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-slate-500 mb-1">Progresso</p>
                {metrics.target?.target_fatturato ? (
                  <div className="flex items-center justify-center gap-2">
                    <p className={`text-3xl font-bold ${
                      metrics.fatturato >= metrics.target.target_fatturato ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {Math.round((metrics.fatturato / metrics.target.target_fatturato) * 100)}%
                    </p>
                    {metrics.fatturato >= metrics.target.target_fatturato ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <Target className="w-6 h-6 text-orange-600" />
                    )}
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-slate-400">-</p>
                )}
              </div>
            </div>
          </NeumorphicCard>

          {/* Performance */}
          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-6 h-6 text-yellow-500" />
              <h2 className="text-xl font-bold text-slate-800">Performance</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">Media Recensioni</span>
                  {metrics.target?.target_recensioni_media && (
                    <span className="text-xs text-slate-400">Target: {metrics.target.target_recensioni_media}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className={`text-3xl font-bold ${
                    metrics.avgRating >= (metrics.target?.target_recensioni_media || 4) ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {metrics.avgRating.toFixed(1)}
                  </p>
                  <div className="flex">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={`w-5 h-5 ${i <= Math.round(metrics.avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} />
                    ))}
                  </div>
                  <span className="text-sm text-slate-500">({metrics.totalReviews} recensioni)</span>
                </div>
              </div>
              <div className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">Ordini Sbagliati</span>
                  {metrics.target?.target_ordini_sbagliati_max !== undefined && (
                    <span className="text-xs text-slate-400">Max: {metrics.target.target_ordini_sbagliati_max}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className={`text-3xl font-bold ${
                    metrics.wrongOrdersCount <= (metrics.target?.target_ordini_sbagliati_max || 10) ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metrics.wrongOrdersCount}
                  </p>
                  <AlertTriangle className={`w-6 h-6 ${
                    metrics.wrongOrdersCount <= (metrics.target?.target_ordini_sbagliati_max || 10) ? 'text-green-600' : 'text-red-600'
                  }`} />
                </div>
              </div>
            </div>
          </NeumorphicCard>

          {/* Ops */}
          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-800">Ops</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">Media Ritardi</span>
                  {metrics.target?.target_ritardi_max_minuti !== undefined && (
                    <span className="text-xs text-slate-400">Max: {metrics.target.target_ritardi_max_minuti} min</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className={`text-3xl font-bold ${
                    metrics.avgDelay <= (metrics.target?.target_ritardi_max_minuti || 5) ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metrics.avgDelay.toFixed(1)} min
                  </p>
                  <span className="text-sm text-slate-500">({metrics.totalShifts} turni)</span>
                </div>
              </div>
              <div className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">Score Pulizie</span>
                  {metrics.target?.target_pulizie_min_score !== undefined && (
                    <span className="text-xs text-slate-400">Min: {metrics.target.target_pulizie_min_score}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className={`text-3xl font-bold ${
                    metrics.avgCleaningScore >= (metrics.target?.target_pulizie_min_score || 70) ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {metrics.avgCleaningScore.toFixed(0)}
                  </p>
                  <Sparkles className={`w-6 h-6 ${
                    metrics.avgCleaningScore >= (metrics.target?.target_pulizie_min_score || 70) ? 'text-green-600' : 'text-orange-600'
                  }`} />
                  <span className="text-sm text-slate-500">({metrics.totalInspections} ispezioni)</span>
                </div>
              </div>
            </div>
          </NeumorphicCard>

          {/* Scorecard Dipendenti */}
          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-800">Scorecard Dipendenti</h2>
            </div>

            {employeeScorecard.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Nessun dipendente ha lavorato questo mese</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left p-3 text-slate-600 font-medium">Dipendente</th>
                      <th className="text-center p-3 text-slate-600 font-medium">Turni</th>
                      <th className="text-center p-3 text-slate-600 font-medium">Ritardi</th>
                      <th className="text-center p-3 text-slate-600 font-medium">Media Ritardo</th>
                      <th className="text-center p-3 text-slate-600 font-medium">Recensioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeScorecard.map(emp => (
                      <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{emp.name}</span>
                            {emp.isPrimaryHere && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                                Principale
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1 mt-1">
                            {emp.ruoli.map(r => (
                              <span key={r} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r}</span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">{emp.shiftsCount}</td>
                        <td className="p-3 text-center">
                          <span className={`font-bold ${emp.lateShifts > 3 ? 'text-red-600' : 'text-green-600'}`}>
                            {emp.lateShifts}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`font-bold ${emp.avgDelay > 5 ? 'text-red-600' : 'text-green-600'}`}>
                            {emp.avgDelay.toFixed(1)} min
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {emp.avgRating !== null ? (
                            <div className="flex items-center justify-center gap-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              <span className="font-bold text-slate-700">{emp.avgRating.toFixed(1)}</span>
                              <span className="text-xs text-slate-500">({emp.reviewsCount})</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </NeumorphicCard>
        </>
      )}
    </div>
  );
}