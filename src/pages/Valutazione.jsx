
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Clock,
  Star,
  TrendingUp,
  Eye,
  X,
  User,
  Calendar
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { parseISO, isValid, format as formatDate } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Valutazione() {
  const [expandedView, setExpandedView] = useState(null); // 'late', 'missing', 'reviews'
  // const [currentUser, setCurrentUser] = useState(null); // Removed: user data now directly from useQuery
  const [matchedEmployee, setMatchedEmployee] = useState(null);

  // Fetch current user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const u = await base44.auth.me();
      // setCurrentUser(u); // Removed: user data now directly from useQuery
      return u;
    },
  });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  // Fetch shifts
  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-shift_date'),
  });

  // Fetch reviews
  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => base44.entities.Review.list('-review_date'),
  });

  // Match employee by full_name or nome_cognome
  React.useEffect(() => {
    if (user && employees.length > 0) {
      const userDisplayName = (user.nome_cognome || user.full_name)?.toLowerCase().trim();
      const matched = employees.find(emp =>
        emp.full_name?.toLowerCase().trim() === userDisplayName
      );
      setMatchedEmployee(matched);
    }
  }, [user, employees]); // Changed dependency from currentUser to user

  // Helper function to safely format dates
  const safeFormatDate = (dateString, formatString, options = {}) => {
    if (!dateString) return 'N/A';
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return 'N/A';
      return formatDate(date, formatString, { locale: it, ...options });
    } catch (e) {
      return 'N/A';
    }
  };

  const safeFormatTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    try {
      const date = new Date(dateTimeString);
      if (!isValid(date)) return 'N/A';
      return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'N/A';
    }
  };

  const safeFormatDateLocale = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (!isValid(date)) return 'N/A';
      return date.toLocaleDateString('it-IT');
    } catch (e) {
      return 'N/A';
    }
  };

  // Filter shifts for current user - UPDATED TO USE nome_cognome
  const myShifts = useMemo(() => {
    if (!user || !shifts.length) return [];
    const userDisplayName = (user.nome_cognome || user.full_name)?.toLowerCase().trim();
    return shifts.filter(s =>
      s.employee_name?.toLowerCase().trim() === userDisplayName
    );
  }, [user, shifts]);

  // Filter reviews assigned to current user - UPDATED TO USE nome_cognome
  const myReviews = useMemo(() => {
    if (!user || !reviews.length) return [];
    const userDisplayName = (user.nome_cognome || user.full_name || '').toLowerCase().trim();
    return reviews.filter(r => {
      if (!r.employee_assigned_name) return false;
      const assignedNames = r.employee_assigned_name.split(',').map(n => n.trim().toLowerCase());
      return assignedNames.includes(userDisplayName);
    });
  }, [user, reviews]);

  // Filter data for current employee
  const employeeData = useMemo(() => {
    if (!matchedEmployee || !user) { // Added !user for safety, as myShifts/myReviews depend on user
      return {
        lateShifts: [],
        missingClockIns: [],
        googleReviews: [],
        totalShifts: 0,
        latePercentage: 0
      };
    }

    // Use the pre-filtered myShifts and myReviews
    const lateShifts = myShifts.filter(s => s.ritardo === true);
    const missingClockIns = myShifts.filter(s => s.timbratura_mancata === true);
    // myReviews is already filtered by employee_assigned_name, just filter by source
    const googleReviews = myReviews.filter(r => r.source === 'google');

    const totalShifts = myShifts.length; // total shifts are myShifts length
    const latePercentage = totalShifts > 0
      ? (lateShifts.length / totalShifts) * 100
      : 0;

    return {
      lateShifts: lateShifts.sort((a, b) => new Date(b.shift_date) - new Date(a.shift_date)),
      missingClockIns: missingClockIns.sort((a, b) => new Date(b.shift_date) - new Date(a.shift_date)),
      googleReviews: googleReviews.sort((a, b) => new Date(b.review_date) - new Date(a.review_date)),
      totalShifts,
      latePercentage
    };
  }, [user, matchedEmployee, myShifts, myReviews]); // Dependencies adjusted

  if (userLoading) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center">
        <div className="neumorphic-card p-8">
          <p className="text-[#9b9b9b]">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!matchedEmployee) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">La Tua Valutazione</h1>
          <p className="text-[#9b9b9b]">Monitora i tuoi turni, timbrature e recensioni</p>
        </div>

        <NeumorphicCard className="p-8 text-center border-2 border-yellow-300">
          <AlertCircle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-2">Profilo Non Trovato</h2>
          <p className="text-[#9b9b9b] mb-4">
            Non è stato trovato un dipendente con il nome: <strong>{user?.full_name || 'N/A'}</strong>
          </p>
          <p className="text-sm text-[#9b9b9b]">
            Contatta l'amministratore per verificare che il tuo profilo dipendente sia stato creato correttamente.
          </p>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">La Tua Valutazione</h1>
        <p className="text-[#9b9b9b]">Monitora i tuoi turni, timbrature e recensioni</p>
      </div>

      {/* Employee Info */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full neumorphic-flat flex items-center justify-center">
            <User className="w-8 h-8 text-[#8b7355]" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-[#6b6b6b]">{matchedEmployee.full_name}</h2>
            <p className="text-[#9b9b9b]">{matchedEmployee.function_name || 'Dipendente'}</p>
            {matchedEmployee.employee_group && (
              <p className="text-sm text-[#9b9b9b]">Gruppo: {matchedEmployee.employee_group}</p>
            )}
          </div>
          <div className="text-right">
            <div className="neumorphic-pressed px-4 py-2 rounded-xl">
              <p className="text-sm text-[#9b9b9b]">Turni Totali</p>
              <p className="text-2xl font-bold text-[#6b6b6b]">{employeeData.totalShifts}</p>
            </div>
          </div>
        </div>
      </NeumorphicCard>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Clock className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-3xl font-bold text-red-600 mb-1">{employeeData.lateShifts.length}</h3>
          <p className="text-sm text-[#9b9b9b]">Turni in Ritardo</p>
          <p className="text-xs text-[#9b9b9b] mt-1">
            {employeeData.latePercentage.toFixed(1)}% dei turni
          </p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-3xl font-bold text-orange-600 mb-1">{employeeData.missingClockIns.length}</h3>
          <p className="text-sm text-[#9b9b9b]">Timbrature Mancanti</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{employeeData.googleReviews.length}</h3>
          <p className="text-sm text-[#9b9b9b]">Recensioni Google</p>
          {employeeData.googleReviews.length > 0 && (
            <p className="text-xs text-[#9b9b9b] mt-1">
              Media: {(employeeData.googleReviews.reduce((sum, r) => sum + r.rating, 0) / employeeData.googleReviews.length).toFixed(1)} ⭐
            </p>
          )}
        </NeumorphicCard>
      </div>

      {/* Turni in Ritardo */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-[#6b6b6b]">
              {expandedView === 'late' ? 'Tutti i Turni in Ritardo' : 'Ultimi 5 Turni in Ritardo'}
            </h2>
          </div>
          {employeeData.lateShifts.length > 5 && (
            <button
              onClick={() => setExpandedView(expandedView === 'late' ? null : 'late')}
              className="neumorphic-flat px-4 py-2 rounded-lg text-sm text-[#8b7355] hover:text-[#6b6b6b] transition-colors flex items-center gap-2"
            >
              {expandedView === 'late' ? (
                <>
                  <X className="w-4 h-4" />
                  Chiudi
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Vedi tutti ({employeeData.lateShifts.length})
                </>
              )}
            </button>
          )}
        </div>

        {employeeData.lateShifts.length > 0 ? (
          <div className={`space-y-3 ${expandedView === 'late' ? 'max-h-96 overflow-y-auto pr-2' : ''}`}>
            {(expandedView === 'late' ? employeeData.lateShifts : employeeData.lateShifts.slice(0, 5)).map((shift, index) => (
              <div key={`${shift.id}-${index}`} className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#9b9b9b]" />
                    <span className="font-medium text-[#6b6b6b]">
                      {safeFormatDateLocale(shift.shift_date)}
                    </span>
                    {shift.store_name && (
                      <span className="text-sm text-[#9b9b9b]">• {shift.store_name}</span>
                    )}
                  </div>
                  <span className="text-lg font-bold text-red-600">
                    +{shift.minuti_di_ritardo || 0} min
                  </span>
                </div>
                <div className="text-sm text-[#9b9b9b]">
                  <strong>Previsto:</strong> {safeFormatTime(shift.scheduled_start)}
                  {' → '}
                  <strong>Effettivo:</strong> {safeFormatTime(shift.actual_start)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-[#6b6b6b] font-medium">Nessun ritardo registrato! 🎉</p>
            <p className="text-sm text-[#9b9b9b] mt-1">Continua così!</p>
          </div>
        )}
      </NeumorphicCard>

      {/* Timbrature Mancanti */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-bold text-[#6b6b6b]">
              {expandedView === 'missing' ? 'Tutte le Timbrature Mancanti' : 'Ultime 5 Timbrature Mancanti'}
            </h2>
          </div>
          {employeeData.missingClockIns.length > 5 && (
            <button
              onClick={() => setExpandedView(expandedView === 'missing' ? null : 'missing')}
              className="neumorphic-flat px-4 py-2 rounded-lg text-sm text-[#8b7355] hover:text-[#6b6b6b] transition-colors flex items-center gap-2"
            >
              {expandedView === 'missing' ? (
                <>
                  <X className="w-4 h-4" />
                  Chiudi
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Vedi tutte ({employeeData.missingClockIns.length})
                </>
              )}
            </button>
          )}
        </div>

        {employeeData.missingClockIns.length > 0 ? (
          <div className={`space-y-3 ${expandedView === 'missing' ? 'max-h-96 overflow-y-auto pr-2' : ''}`}>
            {(expandedView === 'missing' ? employeeData.missingClockIns : employeeData.missingClockIns.slice(0, 5)).map((shift, index) => (
              <div key={`${shift.id}-${index}`} className="neumorphic-pressed p-4 rounded-xl border-2 border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#9b9b9b]" />
                    <span className="font-medium text-[#6b6b6b]">
                      {safeFormatDateLocale(shift.shift_date)}
                    </span>
                    {shift.store_name && (
                      <span className="text-sm text-[#9b9b9b]">• {shift.store_name}</span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                    NON TIMBRATO
                  </span>
                </div>
                <div className="text-sm text-[#9b9b9b]">
                  <strong>Orario Previsto:</strong> {safeFormatTime(shift.scheduled_start)} - {safeFormatTime(shift.scheduled_end)}
                </div>
                {shift.shift_type && (
                  <div className="text-xs text-[#9b9b9b] mt-1">
                    Tipo: {shift.shift_type}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-[#6b6b6b] font-medium">Nessuna timbratura mancante! 🎉</p>
            <p className="text-sm text-[#9b9b9b] mt-1">Ottimo lavoro!</p>
          </div>
        )}
      </NeumorphicCard>

      {/* Recensioni Google */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            <h2 className="text-xl font-bold text-[#6b6b6b]">
              {expandedView === 'reviews' ? 'Tutte le Recensioni Google' : 'Ultime 5 Recensioni Google'}
            </h2>
          </div>
          {employeeData.googleReviews.length > 5 && (
            <button
              onClick={() => setExpandedView(expandedView === 'reviews' ? null : 'reviews')}
              className="neumorphic-flat px-4 py-2 rounded-lg text-sm text-[#8b7355] hover:text-[#6b6b6b] transition-colors flex items-center gap-2"
            >
              {expandedView === 'reviews' ? (
                <>
                  <X className="w-4 h-4" />
                  Chiudi
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Vedi tutte ({employeeData.googleReviews.length})
                </>
              )}
            </button>
          )}
        </div>

        {employeeData.googleReviews.length > 0 ? (
          <div className={`space-y-3 ${expandedView === 'reviews' ? 'max-h-96 overflow-y-auto pr-2' : ''}`}>
            {(expandedView === 'reviews' ? employeeData.googleReviews : employeeData.googleReviews.slice(0, 5)).map((review, index) => (
              <div key={`${review.id}-${index}`} className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-[#6b6b6b]">
                    {review.customer_name || 'Anonimo'}
                  </span>
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
                {review.comment && (
                  <p className="text-sm text-[#6b6b6b] mb-2">{review.comment}</p>
                )}
                <div className="flex items-center justify-between text-xs text-[#9b9b9b]">
                  <span>{safeFormatDateLocale(review.review_date)}</span>
                  {review.store_name && <span>• {review.store_name}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Star className="w-12 h-12 text-[#9b9b9b] mx-auto mb-3" />
            <p className="text-[#6b6b6b] font-medium">Nessuna recensione ancora</p>
            <p className="text-sm text-[#9b9b9b] mt-1">Continua a fare un ottimo lavoro!</p>
          </div>
        )}
      </NeumorphicCard>
    </div>
  );
}
