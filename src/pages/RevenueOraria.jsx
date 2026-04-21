import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import RevenueOrariaFilters from "../components/revenue-oraria/RevenueOrariaFilters";
import RevenueOrariaKPIs from "../components/revenue-oraria/RevenueOrariaKPIs";
import RevenueOrariaTable from "../components/revenue-oraria/RevenueOrariaTable";
import RevenueOrariaCharts from "../components/revenue-oraria/RevenueOrariaCharts";
import RevenueOrariaEmployeeTable from "../components/revenue-oraria/RevenueOrariaEmployeeTable";
import { Clock, Loader2 } from "lucide-react";

export default function RevenueOraria() {
  const [selectedStore, setSelectedStore] = useState("all");
  const [dateFrom, setDateFrom] = useState(moment().subtract(7, "days").format("YYYY-MM-DD"));
  const [dateTo, setDateTo] = useState(moment().format("YYYY-MM-DD"));

  const { data: stores = [] } = useQuery({
    queryKey: ["rev-hour-stores"],
    queryFn: () => base44.entities.Store.filter({ status: "active" })
  });

  const { data: revenueData = [], isLoading } = useQuery({
    queryKey: ["rev-hour-data", dateFrom, dateTo, selectedStore],
    queryFn: () => {
      const filter = {
        order_date: { $gte: dateFrom, $lte: dateTo }
      };
      if (selectedStore !== "all") filter.store_id = selectedStore;
      return base44.entities.RevenueByHour.filter(filter);
    }
  });

  // Aggregate metrics
  const metrics = useMemo(() => {
    if (!revenueData.length) return null;

    const totalRevenue = revenueData.reduce((s, r) => s + (r.total_revenue || 0), 0);
    const totalOrders = revenueData.reduce((s, r) => s + (r.total_orders || 0), 0);
    const globalAvgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // By hour
    const byHour = {};
    for (let h = 0; h < 24; h++) byHour[h] = { revenue: 0, orders: 0, count: 0 };
    revenueData.forEach(r => {
      byHour[r.order_hour].revenue += r.total_revenue || 0;
      byHour[r.order_hour].orders += r.total_orders || 0;
      byHour[r.order_hour].count++;
    });
    const hourlyData = Object.entries(byHour)
      .map(([hour, d]) => ({
        hour: parseInt(hour),
        label: `${hour.toString().padStart(2, "0")}:00`,
        revenue: d.revenue,
        orders: d.orders,
        avgTicket: d.orders > 0 ? d.revenue / d.orders : 0,
        count: d.count
      }))
      .filter(h => h.orders > 0);

    // By employee
    const byEmployee = {};
    revenueData.forEach(r => {
      (r.matched_employees || []).forEach(emp => {
        if (!emp.employee_name || emp.employee_name === 'N/A') return;
        if (!byEmployee[emp.employee_name]) {
          byEmployee[emp.employee_name] = { revenue: 0, orders: 0, hours: 0 };
        }
        // Split evenly among matched employees
        const share = (r.matched_employees || []).length;
        byEmployee[emp.employee_name].revenue += (r.total_revenue || 0) / share;
        byEmployee[emp.employee_name].orders += (r.total_orders || 0) / share;
        byEmployee[emp.employee_name].hours++;
      });
    });
    const employeeData = Object.entries(byEmployee)
      .map(([name, d]) => ({
        name,
        revenue: d.revenue,
        orders: d.orders,
        hours: d.hours,
        avgTicket: d.orders > 0 ? d.revenue / d.orders : 0
      }))
      .sort((a, b) => b.avgTicket - a.avgTicket);

    // Best/worst hour
    const bestHour = hourlyData.reduce((best, h) => (!best || h.avgTicket > best.avgTicket) ? h : best, null);
    const worstHour = hourlyData.reduce((worst, h) => (!worst || h.avgTicket < worst.avgTicket) ? h : worst, null);

    return { totalRevenue, totalOrders, globalAvgTicket, hourlyData, employeeData, bestHour, worstHour };
  }, [revenueData]);

  return (
    <ProtectedPage pageName="RevenueOraria">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Revenue Oraria</h1>
            <p className="text-sm text-slate-500">Analisi scontrino medio orario per negozio e cassiere</p>
          </div>
        </div>

        <RevenueOrariaFilters
          stores={stores}
          selectedStore={selectedStore}
          setSelectedStore={setSelectedStore}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
        />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : !metrics ? (
          <NeumorphicCard className="p-8 text-center">
            <p className="text-slate-500">Nessun dato trovato per il periodo selezionato</p>
          </NeumorphicCard>
        ) : (
          <>
            <RevenueOrariaKPIs metrics={metrics} />
            <RevenueOrariaEmployeeTable employeeData={metrics.employeeData} />
            <RevenueOrariaCharts metrics={metrics} />
            <RevenueOrariaTable data={revenueData} />
          </>
        )}
      </div>
    </ProtectedPage>
  );
}