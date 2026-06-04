import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO, isValid, startOfWeek, startOfMonth } from "date-fns";
import { it } from "date-fns/locale";
import { BarChart3 } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";

export default function ReviewCountTrend({ reviews, stores, normalizeDateString }) {
  const [trendStore, setTrendStore] = useState("all");
  const [groupBy, setGroupBy] = useState("week");

  const trendData = useMemo(() => {
    const filtered = trendStore === "all"
      ? reviews
      : reviews.filter((r) => r.store_id === trendStore);

    const buckets = {};
    filtered.forEach((r) => {
      if (!r.review_date) return;
      try {
        const normalized = normalizeDateString(r.review_date);
        const d = parseISO(normalized);
        if (!isValid(d)) return;

        let key;
        if (groupBy === "day") {
          key = format(d, "yyyy-MM-dd");
        } else if (groupBy === "week") {
          key = format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
        } else {
          key = format(startOfMonth(d), "yyyy-MM");
        }

        buckets[key] = (buckets[key] || 0) + 1;
      } catch {
        // skip
      }
    });

    return Object.entries(buckets)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [reviews, trendStore, groupBy, normalizeDateString]);

  const formatLabel = (date) => {
    try {
      if (groupBy === "month") {
        const d = parseISO(date + "-01");
        return isValid(d) ? format(d, "MMM yy", { locale: it }) : date;
      }
      const d = parseISO(date);
      return isValid(d) ? format(d, "dd/MM", { locale: it }) : date;
    } catch {
      return date;
    }
  };

  return (
    <NeumorphicCard className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-base lg:text-lg font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Trend Numero Recensioni
        </h3>
        <div className="flex gap-2 flex-wrap">
          <select
            value={trendStore}
            onChange={(e) => setTrendStore(e.target.value)}
            className="neumorphic-pressed px-3 py-1.5 rounded-xl text-slate-700 outline-none text-sm"
          >
            <option value="all">Tutti i locali</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="neumorphic-pressed px-3 py-1.5 rounded-xl text-slate-700 outline-none text-sm"
          >
            <option value="day">Giorno</option>
            <option value="week">Settimana</option>
            <option value="month">Mese</option>
          </select>
        </div>
      </div>

      {trendData.length > 0 ? (
        <div className="w-full overflow-x-auto">
          <div style={{ minWidth: "300px" }}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickFormatter={formatLabel}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(248,250,252,0.95)",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    fontSize: "11px",
                  }}
                  labelFormatter={formatLabel}
                  formatter={(value) => [value, "Recensioni"]}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Recensioni" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <p className="text-center text-slate-500 py-8 text-sm">Nessun dato disponibile</p>
      )}
    </NeumorphicCard>
  );
}