import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Truck, Calendar, Store, Package, TrendingUp, Filter, X } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import moment from "moment";

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function SpostamentiAdmin() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: spostamenti = [] } = useQuery({
    queryKey: ['spostamenti'],
    queryFn: () => base44.entities.Spostamento.list('-data_spostamento', 1000),
  });

  const filteredSpostamenti = useMemo(() => {
    const start = moment(startDate).startOf('day');
    const end = moment(endDate).endOf('day');

    return spostamenti.filter(s => {
      if (!s.data_spostamento) return false;
      const date = moment(s.data_spostamento);
      if (!date.isValid()) return false;
      
      const inDateRange = date.isBetween(start, end, null, '[]');
      const storeMatch = selectedStore === 'all' || s.store_origine_id === selectedStore || s.store_destinazione_id === selectedStore;
      
      return inDateRange && storeMatch;
    });
  }, [spostamenti, selectedStore, startDate, endDate]);

  const stats = useMemo(() => {
    const totalSpostamenti = filteredSpostamenti.length;
    const totalPeso = filteredSpostamenti.reduce((sum, s) => sum + (s.peso_kg || 0), 0);
    const avgPeso = totalSpostamenti > 0 ? totalPeso / totalSpostamenti : 0;

    const byProdotto = {};
    const byStore = {};
    const byDipendente = {};

    filteredSpostamenti.forEach(s => {
      const prodotto = s.materia_prima_nome || 'N/A';
      const store = s.store_origine_nome || 'N/A';
      const dipendente = s.dipendente_nome || 'N/A';

      byProdotto[prodotto] = (byProdotto[prodotto] || 0) + s.peso_kg;
      byStore[store] = (byStore[store] || 0) + s.peso_kg;
      byDipendente[dipendente] = (byDipendente[dipendente] || 0) + s.peso_kg;
    });

    return {
      totalSpostamenti,
      totalPeso,
      avgPeso,
      byProdotto,
      byStore,
      byDipendente
    };
  }, [filteredSpostamenti]);

  const timelineData = useMemo(() => {
    const data = {};
    filteredSpostamenti.forEach(s => {
      if (!s.data_spostamento) return;
      const date = moment(s.data_spostamento).format('DD/MM');
      data[date] = (data[date] || 0) + s.peso_kg;
    });

    return Object.entries(data)
      .sort((a, b) => moment(a[0], 'DD/MM').diff(moment(b[0], 'DD/MM')))
      .map(([date, peso]) => ({ date, peso }));
  }, [filteredSpostamenti]);

  const prodottoData = useMemo(() => {
    return Object.entries(stats.byProdotto)
      .map(([nome, peso]) => ({ name: nome, value: peso }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [stats.byProdotto]);

  const dipendenteData = useMemo(() => {
    return Object.entries(stats.byDipendente)
      .map(([nome, peso]) => ({ name: nome, value: peso }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [stats.byDipendente]);

  return (
    <ProtectedPage pageName="SpostamentiAdmin">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Truck className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-800">Storico Spostamenti</h1>
          </div>
          <p className="text-sm text-slate-500">Analizza gli spostamenti di prodotti tra negozi</p>
        </div>

        {/* Filtri */}
        <NeumorphicCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h2 className="font-bold text-slate-800">Filtri</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Negozio</label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              >
                <option value="all">Tutti i negozi</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Data Inizio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Data Fine</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              />
            </div>
          </div>
          {(selectedStore !== 'all' || startDate || endDate) && (
            <button
              onClick={() => {
                setSelectedStore('all');
                setStartDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                setEndDate(new Date().toISOString().split('T')[0]);
              }}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Reset filtri
            </button>
          )}
        </NeumorphicCard>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <NeumorphicCard className="p-4">
            <p className="text-xs text-slate-500 mb-1">Totale Spostamenti</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalSpostamenti}</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4">
            <p className="text-xs text-slate-500 mb-1">Peso Totale</p>
            <p className="text-2xl font-bold text-green-600">{stats.totalPeso.toFixed(1)} kg</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4">
            <p className="text-xs text-slate-500 mb-1">Peso Medio</p>
            <p className="text-2xl font-bold text-purple-600">{stats.avgPeso.toFixed(1)} kg</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4">
            <p className="text-xs text-slate-500 mb-1">Prodotti Movimentati</p>
            <p className="text-2xl font-bold text-orange-600">{Object.keys(stats.byProdotto).length}</p>
          </NeumorphicCard>
        </div>

        {/* Grafici */}
        {timelineData.length > 0 && (
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Andamento nel Tempo
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toFixed(1)} kg`} />
                <Line type="monotone" dataKey="peso" stroke="#3b82f6" name="Peso (kg)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </NeumorphicCard>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prodotti Top */}
          {prodottoData.length > 0 && (
            <NeumorphicCard className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Prodotti più Movimentati
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={prodottoData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value.toFixed(1)} kg`} />
                  <Bar dataKey="value" fill="#3b82f6" name="Peso (kg)" />
                </BarChart>
              </ResponsiveContainer>
            </NeumorphicCard>
          )}

          {/* Dipendenti Top */}
          {dipendenteData.length > 0 && (
            <NeumorphicCard className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Dipendenti più Attivi</h2>
              <div className="space-y-2">
                {dipendenteData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 neumorphic-pressed rounded-lg">
                    <span className="font-medium text-slate-700 text-sm">{item.name}</span>
                    <span className="font-bold text-blue-600">{item.value.toFixed(1)} kg</span>
                  </div>
                ))}
              </div>
            </NeumorphicCard>
          )}
        </div>

        {/* Dettaglio */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Dettaglio Spostamenti ({filteredSpostamenti.length})</h2>
          {filteredSpostamenti.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Nessuno spostamento trovato per i filtri selezionati</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b-2 border-blue-600">
                    <th className="text-left p-3 text-slate-600 font-medium text-sm">Data</th>
                    <th className="text-left p-3 text-slate-600 font-medium text-sm">Prodotto</th>
                    <th className="text-right p-3 text-slate-600 font-medium text-sm">Peso (kg)</th>
                    <th className="text-left p-3 text-slate-600 font-medium text-sm">Da</th>
                    <th className="text-left p-3 text-slate-600 font-medium text-sm">A</th>
                    <th className="text-left p-3 text-slate-600 font-medium text-sm">Dipendente</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSpostamenti.slice(0, 50).map(s => (
                    <tr key={s.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-3 text-sm text-slate-700">{moment(s.data_spostamento).format('DD/MM/YYYY HH:mm')}</td>
                      <td className="p-3 text-sm text-slate-700">{s.materia_prima_nome}</td>
                      <td className="p-3 text-right font-bold text-blue-600">{s.peso_kg}</td>
                      <td className="p-3 text-sm text-slate-700">{s.store_origine_nome}</td>
                      <td className="p-3 text-sm text-slate-700">{s.store_destinazione_nome}</td>
                      <td className="p-3 text-sm text-slate-700">{s.dipendente_nome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}