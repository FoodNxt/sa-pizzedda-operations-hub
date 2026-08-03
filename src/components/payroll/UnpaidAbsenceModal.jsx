import { X, AlertCircle, Clock } from 'lucide-react';
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import { parseISO, format } from 'date-fns';

export default function UnpaidAbsenceModal({ details, startDate, endDate, minutesToHours, onClose }) {
  const safeFormat = (value, fmt) => {
    try {
      return format(parseISO(value), fmt);
    } catch (e) {
      return value || 'N/A';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <NeumorphicCard className="max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#6b6b6b] mb-1">
              Dettaglio Assenze Non Retribuite
            </h2>
            <p className="text-[#9b9b9b] mb-1">{details.employee.employee_name}</p>
            <p className="text-sm text-[#9b9b9b]">
              {startDate && endDate ?
                <span>Periodo: {safeFormat(startDate, 'dd/MM/yyyy')} - {safeFormat(endDate, 'dd/MM/yyyy')}</span> :
                startDate ?
                <span>Da: {safeFormat(startDate, 'dd/MM/yyyy')}</span> :
                endDate ?
                <span>Fino a: {safeFormat(endDate, 'dd/MM/yyyy')}</span> :
                <span>Tutti i turni</span>
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="neumorphic-flat p-2 rounded-lg text-[#6b6b6b] hover:text-red-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary */}
        <div className="neumorphic-pressed p-6 rounded-xl mb-6 text-center">
          <p className="text-sm text-[#9b9b9b] mb-2">Totale Ore Non Retribuite</p>
          <p className="text-4xl font-bold text-red-600">
            {minutesToHours(details.totalMinutes)}
          </p>
          <p className="text-sm text-[#9b9b9b] mt-2">
            {details.shifts.length} voci di assenza
          </p>
        </div>

        {/* Shifts List */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-[#6b6b6b] mb-4">Dettaglio Voci</h3>

          {details.shifts.length > 0 ?
            details.shifts.map((shift, index) =>
              <div key={`${shift.id}-${index}`} className="neumorphic-flat p-4 rounded-xl hover:bg-[#e8ecf3] transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold text-[#6b6b6b]">
                        {safeFormat(shift.shift_date, 'dd/MM/yyyy')}
                      </span>
                      <span className="text-sm text-[#9b9b9b]">
                        {shift.store_name}
                      </span>
                    </div>

                    <div className="neumorphic-pressed px-3 py-1 rounded-lg inline-flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-bold text-red-600">
                        {shift.unpaid_reason}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-600">
                      {minutesToHours(shift.unpaid_minutes)}
                    </p>
                    <p className="text-xs text-[#9b9b9b]">non retribuite</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-[#d1d1d1]">
                  <div>
                    <p className="text-xs text-[#9b9b9b] mb-1">Orario Previsto</p>
                    <p className="text-sm text-[#6b6b6b] font-medium">
                      {shift.scheduled_start ? safeFormat(shift.scheduled_start, 'HH:mm') : 'N/A'}
                      {' - '}
                      {shift.scheduled_end ? safeFormat(shift.scheduled_end, 'HH:mm') : 'N/A'}
                    </p>
                  </div>

                  {shift.actual_start &&
                    <div>
                      <p className="text-xs text-[#9b9b9b] mb-1">Orario Effettivo</p>
                      <p className="text-sm text-[#6b6b6b] font-medium">
                        {safeFormat(shift.actual_start, 'HH:mm')}
                        {shift.actual_end ? ` - ${safeFormat(shift.actual_end, 'HH:mm')}` : ''}
                      </p>
                    </div>
                  }

                  <div>
                    <p className="text-xs text-[#9b9b9b] mb-1">Tipo Turno Originale</p>
                    <p className="text-sm text-[#6b6b6b] font-medium">
                      {shift.shift_type || 'Turno normale'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#9b9b9b] mb-1">Minuti Previsti</p>
                    <p className="text-sm text-[#6b6b6b] font-medium">
                      {shift.scheduled_minutes || 0} min
                    </p>
                  </div>
                </div>

                {shift.minuti_di_ritardo > 0 && shift.unpaid_reason !== 'Turno di tipo Ritardo' &&
                  <div className="mt-3 pt-3 border-t border-[#d1d1d1]">
                    <div className="flex items-center gap-2 text-red-600">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-bold">
                        Ritardo effettivo sul timbro: {shift.minuti_di_ritardo} minuti
                      </span>
                    </div>
                  </div>
                }

                <div className="mt-3 pt-3 border-t border-[#d1d1d1] text-xs text-[#9b9b9b]">
                  ID Turno: {shift.id} • Creato: {shift.created_date ? safeFormat(shift.created_date, 'dd/MM/yyyy HH:mm') : 'N/A'}
                </div>
              </div>
            ) :

            <div className="text-center py-8">
              <p className="text-[#9b9b9b]">Nessuna assenza non retribuita nel periodo selezionato</p>
            </div>
          }
        </div>

        <div className="mt-6 pt-6 border-t border-[#c1c1c1]">
          <button
            onClick={onClose}
            className="neumorphic-flat px-6 py-3 rounded-lg text-[#6b6b6b] hover:text-[#8b7355] transition-colors mx-auto block">
            Chiudi
          </button>
        </div>
      </NeumorphicCard>
    </div>
  );
}