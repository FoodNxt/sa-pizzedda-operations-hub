import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import NeumorphicCard from "@/components/neumorphic/NeumorphicCard";
import {
  DollarSign,
  Star,
  AlertTriangle,
  Clock,
  Sparkles,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Store,
  Truck,
  Receipt
} from "lucide-react";

function getWeekRange(weekOffset = 0) {
  const start = moment().startOf("isoWeek").add(weekOffset, "weeks");
  const end = moment(start).endOf("isoWeek");
  return { start, end };
}

export default function WeeklyMeetingDashboard({ stores = [], users = [] }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const { start: weekStart, end: weekEnd } = getWeekRange(weekOffset);

  const prevWeek = getWeekRange(weekOffset - 1);

  const dateRange = `${weekStart.format("DD MMM")} - ${weekEnd.format("DD MMM YYYY")}`;
  const startStr = weekStart.format("YYYY-MM-DD");
  const endStr = weekEnd.format("YYYY-MM-DD");
  const prevStartStr = prevWeek.start.format("YYYY-MM-DD");
  const prevEndStr = prevWeek.end.format("YYYY-MM-DD");

  const { data: iPratico = [] } = useQuery({
    queryKey: ["wm-ipratico", startStr, prevStartStr],
    queryFn: () => base44.entities.iPratico.filter({
      order_date: { $gte: prevStartStr, $lte: endStr }
    })
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["wm-reviews", startStr, prevStartStr],
    queryFn: () => base44.entities.Review.filter({})
  });

  const { data: wrongOrders = [] } = useQuery({
    queryKey: ["wm-wrong-orders", startStr, prevStartStr],
    queryFn: () => base44.entities.WrongOrder.filter({})
  });

  const { data: turni = [] } = useQuery({
    queryKey: ["wm-turni", startStr, prevStartStr],
    queryFn: () => base44.entities.TurnoPlanday.filter({
      data: { $gte: prevStartStr, $lte: endStr }
    })
  });

  const { data: pulizie = [] } = useQuery({
    queryKey: ["wm-pulizie", startStr, prevStartStr],
    queryFn: () => base44.entities.CleaningInspection.filter({})
  });

  const inRange = (dateVal, rangeStart, rangeEnd) => {
    if (!dateVal) return false;
    const d = moment(dateVal);
    return d.isValid() && d.isBetween(rangeStart, rangeEnd, "day", "[]");
  };

  const calcDelay = (shift) => {
    if (!shift.timbratura_entrata || !shift.ora_inizio) return 0;
    const clockIn = new Date(shift.timbratura_entrata);
    const [hh, mm] = shift.ora_inizio.split(":").map(Number);
    const scheduled = new Date(clockIn);
    scheduled.setHours(hh, mm, 0, 0);
    const delayMs = clockIn - scheduled;
    const mins = Math.floor(delayMs / 60000);
    return mins > 0 ? mins : 0;
  };

  const storeMetrics = useMemo(() => {
    return stores.map((store) => {
      // Current week
      const curRevenue = iPratico
        .filter((i) => i.store_id === store.id && inRange(i.order_date, weekStart, weekEnd))
        .reduce((sum, i) => sum + (i.total_revenue || 0), 0);

      const curOrders = iPratico
        .filter((i) => i.store_id === store.id && inRange(i.order_date, weekStart, weekEnd))
        .reduce((sum, i) => sum + (i.total_orders || 0), 0);

      const curReviews = reviews.filter(
        (r) => r.store_id === store.id && inRange(r.review_date, weekStart, weekEnd)
      );
      const curAvgRating =
        curReviews.length > 0
          ? curReviews.reduce((s, r) => s + (r.rating || 0), 0) / curReviews.length
          : null;

      const curWrongOrders = wrongOrders.filter(
        (o) => o.store_id === store.id && inRange(o.order_date || o.created_date, weekStart, weekEnd)
      ).length;

      const curShifts = turni.filter(
        (t) => t.store_id === store.id && inRange(t.data, weekStart, weekEnd) && t.timbratura_entrata
      );
      const curDelayMins = curShifts.reduce((s, t) => s + calcDelay(t), 0);

      const curClean = pulizie.filter(
        (p) =>
          p.store_id === store.id &&
          inRange(p.inspection_date, weekStart, weekEnd) &&
          p.analysis_status === "completed" &&
          p.overall_score != null
      );
      const curCleanAvg =
        curClean.length > 0
          ? curClean.reduce((s, p) => s + p.overall_score, 0) / curClean.length
          : null;

      // Previous week
      const prevRevenue = iPratico
        .filter((i) => i.store_id === store.id && inRange(i.order_date, prevWeek.start, prevWeek.end))
        .reduce((sum, i) => sum + (i.total_revenue || 0), 0);

      const prevOrders = iPratico
        .filter((i) => i.store_id === store.id && inRange(i.order_date, prevWeek.start, prevWeek.end))
        .reduce((sum, i) => sum + (i.total_orders || 0), 0);

      const prevReviews = reviews.filter(
        (r) => r.store_id === store.id && inRange(r.review_date, prevWeek.start, prevWeek.end)
      );
      const prevAvgRating =
        prevReviews.length > 0
          ? prevReviews.reduce((s, r) => s + (r.rating || 0), 0) / prevReviews.length
          : null;

      const prevWrongOrders = wrongOrders.filter(
        (o) => o.store_id === store.id && inRange(o.order_date || o.created_date, prevWeek.start, prevWeek.end)
      ).length;

      const prevShifts = turni.filter(
        (t) => t.store_id === store.id && inRange(t.data, prevWeek.start, prevWeek.end) && t.timbratura_entrata
      );
      const prevDelayMins = prevShifts.reduce((s, t) => s + calcDelay(t), 0);

      const prevClean = pulizie.filter(
        (p) =>
          p.store_id === store.id &&
          inRange(p.inspection_date, prevWeek.start, prevWeek.end) &&
          p.analysis_status === "completed" &&
          p.overall_score != null
      );
      const prevCleanAvg =
        prevClean.length > 0
          ? prevClean.reduce((s, p) => s + p.overall_score, 0) / prevClean.length
          : null;

      // Daily revenue breakdown
      const dailyRevenue = [];
      for (let d = 0; d < 7; d++) {
        const day = moment(weekStart).add(d, "days");
        const dayStr = day.format("YYYY-MM-DD");
        const rev = iPratico
          .filter((i) => i.store_id === store.id && i.order_date === dayStr)
          .reduce((sum, i) => sum + (i.total_revenue || 0), 0);
        dailyRevenue.push({ day: day.format("ddd DD"), revenue: rev });
      }

      // Channel breakdown (avg ticket) by sourceApp for current and previous week
      const sourceApps = ["glovo", "deliveroo", "justeat", "onlineordering", "ordertable", "tabesto", "store"];
      const sourceAppLabels = { glovo: "Glovo", deliveroo: "Deliveroo", justeat: "JustEat", onlineordering: "Online Ordering", ordertable: "OrderTable", tabesto: "Tabesto", store: "Negozio" };

      const calcChannelData = (rangeStart, rangeEnd) => {
        const filtered = iPratico.filter((i) => i.store_id === store.id && inRange(i.order_date, rangeStart, rangeEnd));
        return sourceApps.map((ch) => {
          const rev = filtered.reduce((s, i) => s + (i[`sourceApp_${ch}`] || 0), 0);
          const ord = filtered.reduce((s, i) => s + (i[`sourceApp_${ch}_orders`] || 0), 0);
          return { channel: ch, label: sourceAppLabels[ch], revenue: rev, orders: ord, avgTicket: ord > 0 ? rev / ord : 0 };
        });
      };

      const curChannels = calcChannelData(weekStart, weekEnd);
      const prevChannels = calcChannelData(prevWeek.start, prevWeek.end);

      const sm = users.find((u) => u.id === store.store_manager_id);

      return {
        store,
        sm,
        curRevenue, prevRevenue,
        curOrders, prevOrders,
        curAvgRating, prevAvgRating,
        curReviewCount: curReviews.length,
        curWrongOrders, prevWrongOrders,
        curDelayMins, prevDelayMins,
        curCleanAvg, prevCleanAvg,
        dailyRevenue,
        curChannels, prevChannels
      };
    });
  }, [stores, users, iPratico, reviews, wrongOrders, turni, pulizie, weekStart, weekEnd, prevWeek]);

  const DeltaBadge = ({ current, previous, isLowerBetter = false, suffix = "" }) => {
    if (previous === null || previous === undefined || current === null || current === undefined) {
      return <span className="text-xs text-slate-400">-</span>;
    }
    const diff = current - previous;
    if (diff === 0) return <span className="inline-flex items-center gap-0.5 text-xs text-slate-400"><Minus className="w-3 h-3" /> 0{suffix}</span>;
    const isGood = isLowerBetter ? diff < 0 : diff > 0;
    const arrowUp = diff > 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isGood ? "text-green-600" : "text-red-500"}`}>
        {arrowUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {diff > 0 ? "+" : ""}{typeof diff === "number" ? diff.toLocaleString("it-IT", { maximumFractionDigits: 1 }) : diff}{suffix}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekOffset((w) => w - 1)} className="neumorphic-flat p-2 rounded-xl">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="text-center">
          <p className="text-sm text-slate-500">Settimana</p>
          <p className="font-bold text-slate-800">{dateRange}</p>
        </div>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          disabled={weekOffset >= 0}
          className="neumorphic-flat p-2 rounded-xl disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Store Cards */}
      {storeMetrics.map(({ store, sm, curRevenue, prevRevenue, curOrders, prevOrders, curAvgRating, prevAvgRating, curReviewCount, curWrongOrders, prevWrongOrders, curDelayMins, prevDelayMins, curCleanAvg, prevCleanAvg, dailyRevenue, curChannels, prevChannels }) => (
        <NeumorphicCard key={store.id} className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Store className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-bold text-slate-800">{store.name}</h3>
              <p className="text-xs text-slate-500">SM: {sm?.nome_cognome || sm?.full_name || "N/A"}</p>
            </div>
          </div>

          {/* KPIs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <div className="neumorphic-flat p-3 rounded-xl">
              <div className="flex items-center gap-1 mb-1"><DollarSign className="w-4 h-4 text-green-600" /><span className="text-xs text-slate-500">Fatturato</span></div>
              <p className="font-bold text-slate-800">€{curRevenue.toLocaleString("it-IT", { maximumFractionDigits: 0 })}</p>
              <DeltaBadge current={curRevenue} previous={prevRevenue} suffix="€" />
            </div>
            <div className="neumorphic-flat p-3 rounded-xl">
              <div className="flex items-center gap-1 mb-1"><ShoppingCart className="w-4 h-4 text-blue-600" /><span className="text-xs text-slate-500">Ordini</span></div>
              <p className="font-bold text-slate-800">{curOrders.toLocaleString("it-IT")}</p>
              <DeltaBadge current={curOrders} previous={prevOrders} />
            </div>
            <div className="neumorphic-flat p-3 rounded-xl">
              <div className="flex items-center gap-1 mb-1"><Star className="w-4 h-4 text-yellow-500" /><span className="text-xs text-slate-500">Recensioni</span></div>
              <p className="font-bold text-slate-800">{curAvgRating ? curAvgRating.toFixed(1) : "-"} <span className="text-xs font-normal text-slate-400">({curReviewCount})</span></p>
              <DeltaBadge current={curAvgRating} previous={prevAvgRating} />
            </div>
            <div className="neumorphic-flat p-3 rounded-xl">
              <div className="flex items-center gap-1 mb-1"><AlertTriangle className="w-4 h-4 text-red-500" /><span className="text-xs text-slate-500">Ord. Sbagliati</span></div>
              <p className="font-bold text-slate-800">{curWrongOrders}</p>
              <DeltaBadge current={curWrongOrders} previous={prevWrongOrders} isLowerBetter />
            </div>
            <div className="neumorphic-flat p-3 rounded-xl">
              <div className="flex items-center gap-1 mb-1"><Clock className="w-4 h-4 text-orange-500" /><span className="text-xs text-slate-500">Ritardi</span></div>
              <p className="font-bold text-slate-800">{curDelayMins} min</p>
              <DeltaBadge current={curDelayMins} previous={prevDelayMins} isLowerBetter suffix=" min" />
            </div>

          </div>

          {/* Channel Avg Ticket */}
          {curChannels && curChannels.some((c) => c.orders > 0) && (
            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-2 font-medium flex items-center gap-1">
                <Receipt className="w-3 h-3" /> Scontrino medio per canale
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {curChannels.filter((c) => c.orders > 0 || prevChannels?.find((p) => p.channel === c.channel)?.orders > 0).map((c) => {
                  const prev = prevChannels?.find((p) => p.channel === c.channel);
                  return (
                    <div key={c.channel} className="neumorphic-flat p-2.5 rounded-xl">
                      <p className="text-[10px] text-slate-500 font-medium mb-1">{c.label}</p>
                      <p className="font-bold text-slate-800 text-sm">€{c.avgTicket.toFixed(2)}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">{c.orders} ord.</span>
                        <DeltaBadge current={c.avgTicket} previous={prev?.avgTicket || null} suffix="€" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Daily Revenue */}
          <div>
            <p className="text-xs text-slate-500 mb-2 font-medium">Fatturato giornaliero</p>
            <div className="grid grid-cols-7 gap-1">
              {dailyRevenue.map((d) => (
                <div key={d.day} className="text-center">
                  <p className="text-[10px] text-slate-400">{d.day}</p>
                  <p className="text-xs font-bold text-slate-700">
                    {d.revenue > 0 ? `€${(d.revenue / 1000).toFixed(1)}k` : "-"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </NeumorphicCard>
      ))}

      {stores.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Store className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>Nessun locale trovato</p>
        </div>
      )}
    </div>
  );
}