import React, { useState } from "react";
import { Package, Calendar, AlertTriangle, Building2, Truck, TrendingDown, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

export default function AnalisiOrdiniTab({ ordiniInviati, ordiniCompletati, selectedStore }) {
  const [timeRange, setTimeRange] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');

  const now = new Date();
  let startDate = new Date(0);
  if (timeRange === 'week') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  else if (timeRange === 'month') startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  else if (timeRange === '3months') startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  else if (timeRange === '6months') startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  else if (timeRange === 'year') startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const allOrders = [...ordiniInviati, ...ordiniCompletati];
  let filteredOrders = allOrders.filter(o => new Date(o.data_invio || o.created_date) >= startDate);
  if (selectedStore !== 'all') filteredOrders = filteredOrders.filter(o => o.store_id === selectedStore);

  const productNames = new Set();
  allOrders.forEach(order => order.prodotti?.forEach(p => productNames.add(p.nome_prodotto)));

  const byStore = {};
  const byProduct = {};
  const bySupplier = {};
  const byMonth = {};
  const byDate = {};

  filteredOrders.forEach(order => {
    if (!byStore[order.store_name]) byStore[order.store_name] = { count: 0, total: 0, inviati: 0, completati: 0 };
    byStore[order.store_name].count++;
    byStore[order.store_name].total += order.totale_ordine;
    if (order.status === 'inviato') byStore[order.store_name].inviati++;
    if (order.status === 'completato') byStore[order.store_name].completati++;

    if (!bySupplier[order.fornitore]) bySupplier[order.fornitore] = { count: 0, total: 0 };
    bySupplier[order.fornitore].count++;
    bySupplier[order.fornitore].total += order.totale_ordine;

    const date = order.data_invio || order.created_date;
    const month = format(parseISO(date), 'MMM yyyy', { locale: it });
    if (!byMonth[month]) byMonth[month] = { count: 0, total: 0 };
    byMonth[month].count++;
    byMonth[month].total += order.totale_ordine;

    const dateKey = format(parseISO(date), 'dd MMM', { locale: it });
    if (!byDate[dateKey]) byDate[dateKey] = { date: dateKey, count: 0, total: 0, timestamp: new Date(date).getTime() };
    byDate[dateKey].count++;
    byDate[dateKey].total += order.totale_ordine;

    order.prodotti?.forEach(prod => {
      if (!byProduct[prod.nome_prodotto]) byProduct[prod.nome_prodotto] = { count: 0, totalQuantity: 0, totalCost: 0, unit: prod.unita_misura };
      byProduct[prod.nome_prodotto].count++;
      byProduct[prod.nome_prodotto].totalQuantity += prod.quantita_ordinata;
      byProduct[prod.nome_prodotto].totalCost += (prod.prezzo_unitario || 0) * prod.quantita_ordinata;
    });
  });

  const timelineData = Object.values(byDate).sort((a, b) => a.timestamp - b.timestamp).map(({ date, count, total }) => ({ date, count, total }));
  const supplierData = Object.entries(bySupplier).map(([name, data]) => ({ name, value: data.total }));
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  return (
    <div className="space-y-6">
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6">📊 Analisi Ordini</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Periodo Temporale</label>
            <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none">
              <option value="week">Ultima Settimana</option>
              <option value="month">Ultimo Mese</option>
              <option value="3months">Ultimi 3 Mesi</option>
              <option value="6months">Ultimi 6 Mesi</option>
              <option value="year">Ultimo Anno</option>
              <option value="all">Tutto il Periodo</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Prodotto Specifico</label>
            <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none">
              <option value="all">Tutti i Prodotti</option>
              {Array.from(productNames).sort().map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <p className="text-center text-slate-500 py-8">Nessun ordine trovato</p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[
                { label: 'Ordini Totali', value: filteredOrders.length, color: 'text-blue-600' },
                { label: 'Valore Totale', value: `€${filteredOrders.reduce((s, o) => s + o.totale_ordine, 0).toFixed(2)}`, color: 'text-green-600' },
                { label: 'Inviati', value: filteredOrders.filter(o => o.status === 'inviato').length, color: 'text-orange-600' },
                { label: 'Completati', value: filteredOrders.filter(o => o.status === 'completato').length, color: 'text-green-600' },
              ].map((stat, i) => (
                <div key={i} className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-slate-500 mb-1">Tempo Medio Consegna</p>
                <p className="text-3xl font-bold text-purple-600">
                  {(() => {
                    const comp = filteredOrders.filter(o => o.status === 'completato' && o.data_invio && o.data_completamento);
                    if (!comp.length) return '-';
                    return Math.round(comp.reduce((s, o) => s + Math.ceil((new Date(o.data_completamento) - new Date(o.data_invio)) / 86400000), 0) / comp.length);
                  })()}
                </p>
                <p className="text-xs text-slate-500">giorni</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="neumorphic-flat p-6 rounded-xl">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Andamento Ordini nel Tempo</h3>
                {timelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" angle={-45} textAnchor="end" height={80} style={{ fontSize: '12px' }} /><YAxis /><Tooltip /><Legend />
                      <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} name="Numero Ordini" dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-slate-500 py-8">Nessun dato disponibile</p>}
              </div>
              <div className="neumorphic-flat p-6 rounded-xl">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Valore Ordini nel Tempo</h3>
                {timelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" angle={-45} textAnchor="end" height={80} style={{ fontSize: '12px' }} /><YAxis /><Tooltip formatter={v => `€${v.toFixed(2)}`} /><Legend />
                      <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} name="Valore Totale (€)" dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-slate-500 py-8">Nessun dato disponibile</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="neumorphic-flat p-6 rounded-xl">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Distribuzione Spesa per Fornitore</h3>
                {supplierData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={supplierData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">
                        {supplierData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => `€${v.toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-slate-500 py-8">Nessun dato disponibile</p>}
              </div>
              <div className="neumorphic-flat p-6 rounded-xl">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Top 10 Prodotti per Valore</h3>
                {Object.keys(byProduct).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={Object.entries(byProduct).sort((a, b) => b[1].totalCost - a[1].totalCost).slice(0, 10).map(([name, data]) => ({ name: name.length > 20 ? name.substring(0, 20) + '...' : name, value: data.totalCost }))}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-45} textAnchor="end" height={100} style={{ fontSize: '10px' }} /><YAxis /><Tooltip formatter={v => `€${v.toFixed(2)}`} />
                      <Bar dataKey="value" fill="#8b5cf6" name="Valore Totale (€)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-slate-500 py-8">Nessun dato disponibile</p>}
              </div>
            </div>

            <div className="neumorphic-flat p-6 rounded-xl">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Per Negozio</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b-2 border-blue-600"><th className="text-left p-3 text-slate-600 font-medium">Negozio</th><th className="text-right p-3 text-slate-600 font-medium">Ordini</th><th className="text-right p-3 text-slate-600 font-medium">Inviati</th><th className="text-right p-3 text-slate-600 font-medium">Completati</th><th className="text-right p-3 text-slate-600 font-medium">Totale</th></tr></thead>
                  <tbody>{Object.entries(byStore).sort((a, b) => b[1].total - a[1].total).map(([store, data]) => (
                    <tr key={store} className="border-b border-slate-200"><td className="p-3 text-slate-800 font-medium">{store}</td><td className="p-3 text-right text-slate-700">{data.count}</td><td className="p-3 text-right text-orange-600">{data.inviati}</td><td className="p-3 text-right text-green-600">{data.completati}</td><td className="p-3 text-right font-bold text-blue-600">€{data.total.toFixed(2)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>

            <div className="neumorphic-flat p-6 rounded-xl">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Per Prodotto (Top 20)</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b-2 border-purple-600"><th className="text-left p-3 text-slate-600 font-medium">Prodotto</th><th className="text-right p-3 text-slate-600 font-medium">Ordini</th><th className="text-right p-3 text-slate-600 font-medium">Quantità Totale</th><th className="text-right p-3 text-slate-600 font-medium">Costo Totale</th></tr></thead>
                  <tbody>{Object.entries(byProduct).sort((a, b) => b[1].totalCost - a[1].totalCost).slice(0, 20).map(([product, data]) => (
                    <tr key={product} className="border-b border-slate-200"><td className="p-3 text-slate-800 font-medium">{product}</td><td className="p-3 text-right text-slate-700">{data.count}</td><td className="p-3 text-right text-purple-600">{data.totalQuantity.toFixed(2)} {data.unit}</td><td className="p-3 text-right font-bold text-blue-600">€{data.totalCost.toFixed(2)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>

            <div className="neumorphic-flat p-6 rounded-xl">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Per Fornitore</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b-2 border-green-600"><th className="text-left p-3 text-slate-600 font-medium">Fornitore</th><th className="text-right p-3 text-slate-600 font-medium">Ordini</th><th className="text-right p-3 text-slate-600 font-medium">Tempo Medio</th><th className="text-right p-3 text-slate-600 font-medium">Totale Speso</th></tr></thead>
                  <tbody>{Object.entries(bySupplier).sort((a, b) => b[1].total - a[1].total).map(([supplier, data]) => {
                    const comp = filteredOrders.filter(o => o.fornitore === supplier && o.status === 'completato' && o.data_invio && o.data_completamento);
                    const avgDays = comp.length > 0 ? Math.round(comp.reduce((s, o) => s + Math.ceil((new Date(o.data_completamento) - new Date(o.data_invio)) / 86400000), 0) / comp.length) : null;
                    return <tr key={supplier} className="border-b border-slate-200"><td className="p-3 text-slate-800 font-medium">{supplier}</td><td className="p-3 text-right text-slate-700">{data.count}</td><td className="p-3 text-right text-purple-600 font-medium">{avgDays ? `${avgDays}gg` : '-'}</td><td className="p-3 text-right font-bold text-green-600">€{data.total.toFixed(2)}</td></tr>;
                  })}</tbody>
                </table>
              </div>
            </div>

            <div className="neumorphic-flat p-6 rounded-xl">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Per Mese</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b-2 border-orange-600"><th className="text-left p-3 text-slate-600 font-medium">Mese</th><th className="text-right p-3 text-slate-600 font-medium">Ordini</th><th className="text-right p-3 text-slate-600 font-medium">Totale</th><th className="text-right p-3 text-slate-600 font-medium">Media per Ordine</th></tr></thead>
                  <tbody>{Object.entries(byMonth).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([month, data]) => (
                    <tr key={month} className="border-b border-slate-200"><td className="p-3 text-slate-800 font-medium">{month}</td><td className="p-3 text-right text-slate-700">{data.count}</td><td className="p-3 text-right font-bold text-orange-600">€{data.total.toFixed(2)}</td><td className="p-3 text-right text-blue-600">€{(data.total / data.count).toFixed(2)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </NeumorphicCard>
    </div>
  );
}