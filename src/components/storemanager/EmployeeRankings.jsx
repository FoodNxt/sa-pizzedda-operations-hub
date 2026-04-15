import React from "react";
import { Star, Clock, AlertTriangle, User } from "lucide-react";

function RankingSection({ icon: Icon, iconColor, title, entries, isReviews = false }) {
  if (!entries || entries.length === 0) return null;
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1 mb-1.5">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{title}</span>
      </div>
      <div className="space-y-1">
        {entries.map((e, idx) => (
          <div key={e.name} className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold w-4 text-center ${idx === 0 ? "text-slate-700" : "text-slate-400"}`}>
              {idx + 1}.
            </span>
            <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className={`text-[11px] truncate ${idx === 0 ? "font-semibold text-slate-700" : "text-slate-500"}`}>
              {e.name}
            </span>
            {isReviews ? (
              <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                <span className="text-[10px] font-bold text-yellow-600">{e.count} rec.</span>
                <span className="text-[10px] text-slate-400">·</span>
                <span className="flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-[10px] font-bold text-slate-600">{e.avgRating.toFixed(1)}</span>
                </span>
              </div>
            ) : (
              <span className={`text-[10px] font-bold ml-auto flex-shrink-0 ${e.valueColor || "text-slate-600"}`}>
                {e.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EmployeeRankings({ topReviewers, topDelayers, topWrongOrders }) {
  const hasData = (topReviewers?.length > 0) || (topDelayers?.length > 0) || (topWrongOrders?.length > 0);
  if (!hasData) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <p className="text-xs text-slate-500 mb-2 font-medium flex items-center gap-1">
        <User className="w-3 h-3" /> Classifica dipendenti della settimana
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <RankingSection
          icon={Star}
          iconColor="text-yellow-500"
          title="Più recensioni"
          entries={topReviewers}
          isReviews
        />
        <RankingSection
          icon={Clock}
          iconColor="text-orange-500"
          title="Più ritardi"
          entries={topDelayers}
        />
        <RankingSection
          icon={AlertTriangle}
          iconColor="text-red-500"
          title="Più ord. sbagliati"
          entries={topWrongOrders}
        />
      </div>
    </div>
  );
}