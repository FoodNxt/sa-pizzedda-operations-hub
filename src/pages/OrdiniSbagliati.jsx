import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, CheckCircle, AlertCircle, TrendingUp, DollarSign, Package, Link as LinkIcon, X, BarChart3, Settings, Eye, Sparkles, Users, Send, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import LetterModal from "../components/ordini-sbagliati/LetterModal";
import AIAnalysisModal from "../components/ordini-sbagliati/AIAnalysisModal";
import { splitCsvLines, parseCsvLine, parseNumericValue, parseDeliverooDate } from "../lib/csvParser";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function OrdiniSbagliati() {
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [unmappedStores, setUnmappedStores] = useState([]);
  const [storeMapping, setStoreMapping] = useState({});
  const [activeTab, setActiveTab] = useState('analytics');
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateRange, setDateRange] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCount, setShowCount] = useState(true);
  const [showRefunds, setShowRefunds] = useState(true);
  const [trendView, setTrendView] = useState('daily');
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({ order_id_column: '', store_column: '', order_date_column: '', order_total_column: '', refund_column: '', refund_reason_column: '' });
  const [pendingFile, setPendingFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [aiAnalysisContent, setAiAnalysisContent] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [expandedEmployees, setExpandedEmployees] = useState({});
  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({ queryKey: ['stores'], queryFn: () => base44.entities.Store.list() });
  const { data: wrongOrders = [] } = useQuery({ queryKey: ['wrong-orders'], queryFn: async () => { const all = await base44.entities.WrongOrder.list('-order_date', 1000); const unique = []; const seen = new Set(); for (const o of all) { if (!seen.has(o.order_id)) { seen.add(o.order_id); unique.push(o); } } return unique; } });
  const { data: storeMappings = [] } = useQuery({ queryKey: ['store-mappings'], queryFn: () => base44.entities.StoreMapping.list() });
  const { data: columnMappings = [] } = useQuery({ queryKey: ['column-mappings'], queryFn: () => base44.entities.CSVColumnMapping.list() });
  const { data: wrongOrderMatches = [] } = useQuery({ queryKey: ['wrong-order-matches'], queryFn: () => base44.entities.WrongOrderMatch.list() });
  const { data: letterTemplates = [] } = useQuery({ queryKey: ['letter-templates'], queryFn: () => base44.entities.LetteraRichiamoTemplate.list() });
  const createMappingMutation = useMutation({ mutationFn: (d) => base44.entities.StoreMapping.create(d), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['store-mappings'] }) });
  const createColumnMappingMutation = useMutation({ mutationFn: (d) => base44.entities.CSVColumnMapping.create(d), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['column-mappings'] }) });
  const deleteOrderMutation = useMutation({ mutationFn: (id) => base44.entities.WrongOrder.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wrong-orders'] }); alert('✅ Ordine eliminato'); } });

  const findBestMatch = (platformStoreName, storesList) => {
    const normalize = (str) => str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const np = normalize(platformStoreName);
    let best = null, bestScore = 0;
    storesList.forEach((store) => {
      const ns = normalize(store.name);
      if (np === ns) { best = store; bestScore = 100; return; }
      if (np.includes(ns) || ns.includes(np)) { if (80 > bestScore) { best = store; bestScore = 80; } }
    });
    return best ? { store: best, confidence: Math.round(bestScore) } : null;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedPlatform) { alert('Seleziona prima una piattaforma'); event.target.value = ''; return; }
    setUploading(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const lines = splitCsvLines(text);
      if (lines.length < 2) throw new Error('CSV deve contenere almeno una riga di intestazione e una di dati');
      const headers = parseCsvLine(lines[0]);
      const existingMapping = columnMappings.find((m) => m.platform === selectedPlatform && m.is_active);
      if (!existingMapping) { setCsvHeaders(headers); setPendingFile({ text, headers, lines }); setShowColumnMapping(true); setUploading(false); event.target.value = ''; return; }
      setCsvHeaders(headers); setPendingFile({ text, headers, lines }); setColumnMapping(existingMapping); generatePreview(lines, headers, existingMapping); setShowPreview(true); setUploading(false);
    } catch (error) { setImportResult({ success: false, error: error.message }); setUploading(false); }
    event.target.value = '';
  };

  const processCSVWithMapping = async (lines, headers, mapping) => {
    try {
      const records = [], unmapped = [], skippedLines = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        const record = {}; headers.forEach((header, idx) => { record[header] = values[idx] || ''; });
        const platformStoreName = record[mapping.store_column]?.trim() || '';
        const orderId = record[mapping.order_id_column]?.trim() || '';
        if (!platformStoreName || !orderId) { skippedLines.push(i + 1); continue; }
        const orderTotal = parseNumericValue(record[mapping.order_total_column]);
        const refundValue = parseNumericValue(record[mapping.refund_column]);

        let storeMatch = storeMappings.find((m) => m.platform === selectedPlatform && m.platform_store_name === platformStoreName);
        if (!storeMatch) {
          const autoMatch = findBestMatch(platformStoreName, stores);
          if (autoMatch && autoMatch.confidence >= 70) { const md = { platform: selectedPlatform, platform_store_name: platformStoreName, store_id: autoMatch.store.id, store_name: autoMatch.store.name, auto_matched: true, confidence_score: autoMatch.confidence }; await createMappingMutation.mutateAsync(md); storeMatch = md; }
          else { if (!unmapped.find((u) => u.platformStoreName === platformStoreName)) unmapped.push({ platformStoreName, suggestedMatch: autoMatch }); }
        }

        let parsedDate;
        try { parsedDate = selectedPlatform === 'deliveroo' ? parseDeliverooDate(record[mapping.order_date_column]) : (record[mapping.order_date_column] ? new Date(record[mapping.order_date_column]).toISOString() : null); if (!parsedDate || parsedDate === 'Invalid Date') parsedDate = new Date().toISOString(); } catch { parsedDate = new Date().toISOString(); }

        records.push({ platform: selectedPlatform, order_id: orderId, order_date: parsedDate, store_name: platformStoreName, store_id: storeMatch ? storeMatch.store_id : null, store_matched: !!storeMatch, order_total: orderTotal, refund_value: refundValue, customer_refund_status: '', complaint_reason: selectedPlatform === 'glovo' && mapping.refund_reason_column ? record[mapping.refund_reason_column] || '' : null, cancellation_reason: null, order_status: null, raw_data: record, import_date: new Date().toISOString(), imported_by: (await base44.auth.me()).email });
      }
      let successCount = 0, errorCount = 0, duplicateCount = 0;
      for (const record of records) {
        const existing = wrongOrders.find((o) => o.order_id === record.order_id && o.platform === record.platform && o.order_date?.split('T')[0] === record.order_date?.split('T')[0]);
        if (existing) { duplicateCount++; continue; }
        try { await base44.entities.WrongOrder.create(record); successCount++; } catch { errorCount++; }
      }
      queryClient.invalidateQueries({ queryKey: ['wrong-orders'] });
      setImportResult({ success: true, total: records.length, successCount, errorCount, duplicateCount, unmappedCount: unmapped.length, skippedLinesCount: skippedLines.length, totalCsvLines: lines.length - 1 });
      if (unmapped.length > 0) { setUnmappedStores(unmapped); setShowMappingModal(true); }
      setUploading(false);
    } catch (error) { setImportResult({ success: false, error: error.message }); setUploading(false); }
  };

  const handleManualMapping = async () => {
    for (const [platformStoreName, storeId] of Object.entries(storeMapping)) {
      if (!storeId) continue;
      const store = stores.find((s) => s.id === storeId);
      if (!store) continue;
      await createMappingMutation.mutateAsync({ platform: selectedPlatform, platform_store_name: platformStoreName, store_id: storeId, store_name: store.name, auto_matched: false, confidence_score: 100 });
    }
    setShowMappingModal(false); setUnmappedStores([]); setStoreMapping({});
    queryClient.invalidateQueries({ queryKey: ['store-mappings'] });
    alert('Mapping salvati! Riprova il caricamento del CSV.');
  };

  const generatePreview = (lines, headers, mapping) => {
    const preview = [];
    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      const values = parseCsvLine(lines[i]);
      const record = {}; headers.forEach((h, idx) => { record[h] = values[idx] || ''; });
      const storeName = record[mapping.store_column] || '';
      const totalRaw = record[mapping.order_total_column] || '';
      const refundRaw = record[mapping.refund_column] || '';
      const totalParsed = parseNumericValue(totalRaw);
      const refundParsed = parseNumericValue(refundRaw);
      preview.push({ orderId: record[mapping.order_id_column] || '', store: storeName, storeSuspicious: false, date: record[mapping.order_date_column] || '', total: totalRaw, totalParsed, totalSuspicious: !totalRaw || totalParsed === 0, refund: refundRaw, refundParsed, refundSuspicious: !refundRaw || refundParsed === 0, reason: mapping.refund_reason_column ? record[mapping.refund_reason_column] || '' : '' });
    }
    setPreviewData(preview);
  };

  const handleSaveColumnMapping = async () => {
    if (!columnMapping.order_id_column || !columnMapping.store_column || !columnMapping.order_date_column || !columnMapping.order_total_column || !columnMapping.refund_column) { alert('Compila tutti i campi obbligatori'); return; }
    try {
      for (const m of columnMappings.filter((m) => m.platform === selectedPlatform)) { await base44.entities.CSVColumnMapping.update(m.id, { is_active: false }); }
      await createColumnMappingMutation.mutateAsync({ platform: selectedPlatform, ...columnMapping, is_active: true });
      setShowColumnMapping(false);
      if (pendingFile) { generatePreview(pendingFile.lines, pendingFile.headers, columnMapping); setShowPreview(true); }
      alert('✅ Mapping colonne salvato!');
    } catch (error) { alert('Errore: ' + error.message); }
  };

  const handleConfirmImport = async () => {
    if (!pendingFile) return;
    setShowPreview(false); setUploading(true);
    try { await processCSVWithMapping(pendingFile.lines, pendingFile.headers, columnMapping); setPendingFile(null); setPreviewData([]); } catch { setUploading(false); }
  };

  const analyzeWithAI = async (chartType) => {
    setLoadingAI(true); setShowAIAnalysis(true); setAiAnalysisContent('Analisi in corso...');
    try {
      let prompt = '';
      if (chartType === 'byStore') { prompt = `Analizza questi dati sugli ordini sbagliati per negozio:\n\n${analyticsData.byStore.map((s) => `${s.name}: ${s.count} ordini, €${s.refunds.toFixed(2)} rimborsi`).join('\n')}\n\nFornisci insights, pattern e raccomandazioni.`; }
      else { prompt = `Analizza questo trend temporale degli ordini sbagliati:\n\n${analyticsData.byDate.map((d) => `${d.date}: ${d.count} ordini, €${d.refunds.toFixed(2)} rimborsi`).join('\n')}\n\nFornisci trend, pattern e raccomandazioni.`; }
      const response = await base44.integrations.Core.InvokeLLM({ prompt, add_context_from_internet: false });
      setAiAnalysisContent(response);
    } catch (error) { setAiAnalysisContent('Errore: ' + error.message); } finally { setLoadingAI(false); }
  };

  const filteredOrders = useMemo(() => {
    let filtered = wrongOrders;
    if (selectedStore !== 'all') filtered = filtered.filter((o) => o.store_id === selectedStore);
    const now = new Date();
    if (dateRange === 'week') { const ws = startOfWeek(now, { locale: it }); const we = endOfWeek(now, { locale: it }); filtered = filtered.filter((o) => { const d = parseISO(o.order_date); return d >= ws && d <= we; }); }
    else if (dateRange === 'month') { const ms = startOfMonth(now); const me = endOfMonth(now); filtered = filtered.filter((o) => { const d = parseISO(o.order_date); return d >= ms && d <= me; }); }
    else if (dateRange === 'custom' && customStartDate && customEndDate) { const s = new Date(customStartDate); const e = new Date(customEndDate); filtered = filtered.filter((o) => { const d = parseISO(o.order_date); return d >= s && d <= e; }); }
    return filtered;
  }, [wrongOrders, selectedStore, dateRange, customStartDate, customEndDate]);

  const stats = { total: wrongOrders.length, glovo: wrongOrders.filter((o) => o.platform === 'glovo').length, deliveroo: wrongOrders.filter((o) => o.platform === 'deliveroo').length, totalRefunds: wrongOrders.reduce((sum, o) => sum + (o.refund_value || 0), 0) };

  const employeeAnalytics = useMemo(() => {
    const byEmp = {};
    let fm = wrongOrderMatches;
    const now = new Date();
    if (dateRange === 'week') { const ws = startOfWeek(now, { locale: it }); const we = endOfWeek(now, { locale: it }); fm = fm.filter((m) => m.order_date && parseISO(m.order_date) >= ws && parseISO(m.order_date) <= we); }
    else if (dateRange === 'month') { const ms = startOfMonth(now); const me = endOfMonth(now); fm = fm.filter((m) => m.order_date && parseISO(m.order_date) >= ms && parseISO(m.order_date) <= me); }
    else if (dateRange === 'custom' && customStartDate && customEndDate) { const s = new Date(customStartDate); const e = new Date(customEndDate); fm = fm.filter((m) => m.order_date && parseISO(m.order_date) >= s && parseISO(m.order_date) <= e); }
    if (selectedStore !== 'all') fm = fm.filter((m) => m.store_id === selectedStore);
    fm.forEach((match) => { if (!match.matched_employee_name) return; const order = wrongOrders.find((o) => o.id === match.wrong_order_id); if (!order) return; const k = match.matched_employee_name; if (!byEmp[k]) byEmp[k] = { dipendente_nome: k, count: 0, totalRefunds: 0, orders: [] }; byEmp[k].count++; byEmp[k].totalRefunds += order.refund_value || 0; byEmp[k].orders.push({ ...order, match_confidence: match.match_confidence }); });
    return Object.values(byEmp).sort((a, b) => b.count - a.count);
  }, [wrongOrderMatches, wrongOrders, dateRange, customStartDate, customEndDate, selectedStore]);

  const analyticsData = useMemo(() => {
    const byStore = {};
    filteredOrders.forEach((o) => { const sn = stores.find((s) => s.id === o.store_id)?.name || o.store_name; if (!byStore[sn]) byStore[sn] = { count: 0, refunds: 0, glovo: 0, deliveroo: 0 }; byStore[sn].count++; byStore[sn].refunds += o.refund_value || 0; if (o.platform === 'glovo') byStore[sn].glovo++; if (o.platform === 'deliveroo') byStore[sn].deliveroo++; });
    const now = new Date();
    let startDate, endDate;
    if (dateRange === 'week') { startDate = startOfWeek(now, { locale: it }); endDate = endOfWeek(now, { locale: it }); }
    else if (dateRange === 'month') { startDate = startOfMonth(now); endDate = endOfMonth(now); }
    else if (dateRange === 'custom' && customStartDate && customEndDate) { startDate = new Date(customStartDate); endDate = new Date(customEndDate); }
    else { if (filteredOrders.length > 0) { const dates = filteredOrders.map((o) => parseISO(o.order_date)).filter((d) => !isNaN(d)); startDate = new Date(Math.min(...dates)); endDate = new Date(Math.max(...dates)); } else { startDate = now; endDate = now; } }
    const byDate = {};
    if (trendView === 'daily') { const cd = new Date(startDate); while (cd <= endDate) { const dk = format(cd, 'dd/MM', { locale: it }); byDate[dk] = { date: dk, count: 0, refunds: 0 }; cd.setDate(cd.getDate() + 1); } filteredOrders.forEach((o) => { const d = format(parseISO(o.order_date), 'dd/MM', { locale: it }); if (byDate[d]) { byDate[d].count++; byDate[d].refunds += o.refund_value || 0; } }); }
    else if (trendView === 'weekly') { filteredOrders.forEach((o) => { const ws = startOfWeek(parseISO(o.order_date), { locale: it }); const wk = format(ws, 'dd/MM/yy', { locale: it }); if (!byDate[wk]) byDate[wk] = { date: wk, count: 0, refunds: 0 }; byDate[wk].count++; byDate[wk].refunds += o.refund_value || 0; }); }
    else { filteredOrders.forEach((o) => { const mk = format(parseISO(o.order_date), 'MM/yyyy', { locale: it }); if (!byDate[mk]) byDate[mk] = { date: mk, count: 0, refunds: 0 }; byDate[mk].count++; byDate[mk].refunds += o.refund_value || 0; }); }
    return { byStore: Object.entries(byStore).map(([name, data]) => ({ name, ...data })), byDate: Object.values(byDate) };
  }, [filteredOrders, stores, dateRange, trendView, customStartDate, customEndDate]);

  const FilterBar = () => (
    <NeumorphicCard className="p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Negozio</label><select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"><option value="all">Tutti</option>{stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Periodo</label><select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"><option value="week">Settimana</option><option value="month">Mese</option><option value="custom">Custom</option><option value="all">Tutti</option></select></div>
        {dateRange === 'custom' && <><div><label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Inizio</label><input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none" /></div><div><label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Fine</label><input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none" /></div></>}
      </div>
    </NeumorphicCard>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="mb-6"><h1 className="mb-2 text-3xl font-bold" style={{ color: '#000000' }}>📦 Ordini Sbagliati</h1><p style={{ color: '#000000' }}>Importa e gestisci ordini con problemi da Glovo e Deliveroo</p></div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6 text-center"><div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"><Package className="w-8 h-8 text-[#8b7355]" /></div><h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{stats.total}</h3><p className="text-sm text-[#9b9b9b]">Totali</p></NeumorphicCard>
        <NeumorphicCard className="p-6 text-center"><div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"><TrendingUp className="w-8 h-8 text-orange-600" /></div><h3 className="text-3xl font-bold text-orange-600 mb-1">{stats.glovo}</h3><p className="text-sm text-[#9b9b9b]">Glovo</p></NeumorphicCard>
        <NeumorphicCard className="p-6 text-center"><div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"><TrendingUp className="w-8 h-8 text-teal-600" /></div><h3 className="text-3xl font-bold text-teal-600 mb-1">{stats.deliveroo}</h3><p className="text-sm text-[#9b9b9b]">Deliveroo</p></NeumorphicCard>
        <NeumorphicCard className="p-6 text-center"><div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"><DollarSign className="w-8 h-8 text-red-600" /></div><h3 className="text-3xl font-bold text-red-600 mb-1">€{stats.totalRefunds.toFixed(2)}</h3><p className="text-sm text-[#9b9b9b]">Rimborsi</p></NeumorphicCard>
      </div>

      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4 flex items-center gap-2"><Upload className="w-5 h-5" />Importa CSV</h2>
        <div className="space-y-4">
          <div><label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Piattaforma *</label><select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)} className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"><option value="">-- Seleziona --</option><option value="glovo">Glovo</option><option value="deliveroo">Deliveroo</option></select></div>
          {selectedPlatform && (() => { const m = columnMappings.find((m) => m.platform === selectedPlatform && m.is_active); return m ? <div className="neumorphic-pressed p-4 rounded-xl bg-green-50"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-green-800 mb-2">✅ Mapping attivo</p><div className="text-xs text-green-700 space-y-1"><p>• Order ID: {m.order_id_column}</p><p>• Negozio: {m.store_column}</p><p>• Data: {m.order_date_column}</p><p>• Totale: {m.order_total_column}</p><p>• Rimborso: {m.refund_column}</p>{m.refund_reason_column && <p>• Ragione: {m.refund_reason_column}</p>}</div></div><NeumorphicButton onClick={() => { setColumnMapping(m); setShowColumnMapping(true); }} className="text-xs">Modifica</NeumorphicButton></div></div> : <div className="neumorphic-pressed p-3 rounded-xl bg-orange-50"><p className="text-sm text-orange-700">⚠️ Nessun mapping per {selectedPlatform}</p></div>; })()}
          <div><input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-upload" disabled={!selectedPlatform || uploading} /><label htmlFor="csv-upload" className={`block text-center neumorphic-flat px-6 py-4 rounded-xl cursor-pointer transition-all ${!selectedPlatform || uploading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}`}><FileText className="w-8 h-8 text-[#8b7355] mx-auto mb-2" /><p className="text-[#6b6b6b] font-medium">{uploading ? 'Caricamento...' : selectedPlatform ? 'Clicca per caricare CSV' : 'Seleziona piattaforma'}</p></label></div>
        </div>
      </NeumorphicCard>

      {importResult && <NeumorphicCard className={`p-6 ${importResult.success ? 'bg-green-50' : 'bg-red-50'}`}><div className="flex items-start gap-3">{importResult.success ? <CheckCircle className="w-6 h-6 text-green-600 mt-1" /> : <AlertCircle className="w-6 h-6 text-red-600 mt-1" />}<div className="flex-1"><h3 className={`text-xl font-bold mb-2 ${importResult.success ? 'text-green-700' : 'text-red-700'}`}>{importResult.success ? '✅ Importazione Completata!' : '❌ Errore'}</h3>{importResult.success ? <div className="space-y-1 text-sm"><p className="text-green-700">CSV: {importResult.totalCsvLines} righe</p><p className="text-green-700">✅ Importati: {importResult.successCount}</p>{importResult.duplicateCount > 0 && <p className="text-blue-600">🔁 Duplicati: {importResult.duplicateCount}</p>}{importResult.skippedLinesCount > 0 && <p className="text-orange-600">⚠️ Saltate: {importResult.skippedLinesCount}</p>}{importResult.unmappedCount > 0 && <p className="text-yellow-600">🏪 Non abbinati: {importResult.unmappedCount}</p>}</div> : <p className="text-red-700">{importResult.error}</p>}</div></div></NeumorphicCard>}

      {showPreview && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="max-w-5xl w-full max-h-[90vh] overflow-y-auto"><NeumorphicCard className="p-6"><div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-[#6b6b6b] flex items-center gap-2"><Eye className="w-6 h-6" />Anteprima - {selectedPlatform}</h2><button onClick={() => { setShowPreview(false); setPendingFile(null); setPreviewData([]); }} className="neumorphic-flat p-2 rounded-lg hover:bg-red-50"><X className="w-5 h-5 text-[#9b9b9b]" /></button></div>
        <h3 className="font-bold text-[#6b6b6b] mb-3">Primi {previewData.length} ordini:</h3>
        <div className="overflow-x-auto mb-6"><table className="w-full text-sm"><thead><tr className="border-b-2 border-[#8b7355]"><th className="text-left p-2">Order ID</th><th className="text-left p-2">Negozio</th><th className="text-left p-2">Data</th><th className="text-right p-2">Totale</th><th className="text-right p-2">Rimborso</th>{selectedPlatform === 'glovo' && <th className="text-left p-2">Ragione</th>}</tr></thead><tbody>{previewData.map((row, idx) => <tr key={idx} className={`border-b ${row.totalSuspicious || row.refundSuspicious ? 'bg-red-50' : 'border-[#d1d1d1]'}`}><td className="p-2 font-mono">{row.orderId}</td><td className="p-2 font-bold">{row.store || '(vuoto)'}</td><td className="p-2">{row.date}</td><td className="p-2 text-right">{row.total} {row.totalParsed > 0 && <span className="text-xs text-green-600 ml-1">→ €{row.totalParsed.toFixed(2)}</span>}</td><td className="p-2 text-right font-bold text-red-600">{row.refund} {row.refundParsed > 0 && <span className="text-xs text-green-600 ml-1">→ €{row.refundParsed.toFixed(2)}</span>}</td>{selectedPlatform === 'glovo' && <td className="p-2 text-xs">{row.reason}</td>}</tr>)}</tbody></table></div>
        <div className="flex gap-3"><NeumorphicButton onClick={() => { setShowPreview(false); setShowColumnMapping(true); }} className="flex-1">← Modifica Mapping</NeumorphicButton><NeumorphicButton onClick={() => { setShowPreview(false); setPendingFile(null); setPreviewData([]); }} className="flex-1">Annulla</NeumorphicButton><NeumorphicButton onClick={handleConfirmImport} variant="primary" className="flex-1">✅ Importa</NeumorphicButton></div>
      </NeumorphicCard></div></div>}

      {showColumnMapping && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto"><NeumorphicCard className="p-6"><div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-[#6b6b6b] flex items-center gap-2"><Settings className="w-6 h-6" />Mappa Colonne - {selectedPlatform}</h2><button onClick={() => { setShowColumnMapping(false); setPendingFile(null); setUploading(false); }} className="neumorphic-flat p-2 rounded-lg hover:bg-red-50"><X className="w-5 h-5" /></button></div>
        <div className="space-y-4 mb-6">
          {[{ label: 'Numero Ordine *', key: 'order_id_column' }, { label: 'Negozio *', key: 'store_column' }, { label: 'Data Ordine *', key: 'order_date_column' }, { label: 'Valore Ordine *', key: 'order_total_column' }, { label: 'Valore Rimborso *', key: 'refund_column' }].map(({ label, key }) => <div key={key}><label className="text-sm font-medium text-[#6b6b6b] mb-2 block">{label}</label><select value={columnMapping[key]} onChange={(e) => setColumnMapping({ ...columnMapping, [key]: e.target.value })} className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"><option value="">-- Seleziona --</option>{csvHeaders.map((h) => <option key={h} value={h}>{h}</option>)}</select></div>)}
          {selectedPlatform === 'glovo' && <div><label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Ragione Rimborso (opzionale)</label><select value={columnMapping.refund_reason_column} onChange={(e) => setColumnMapping({ ...columnMapping, refund_reason_column: e.target.value })} className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"><option value="">-- Seleziona --</option>{csvHeaders.map((h) => <option key={h} value={h}>{h}</option>)}</select></div>}
        </div>
        <div className="flex gap-3"><NeumorphicButton onClick={() => { setShowColumnMapping(false); setPendingFile(null); setUploading(false); }} className="flex-1">Annulla</NeumorphicButton><NeumorphicButton onClick={handleSaveColumnMapping} variant="primary" className="flex-1">Salva</NeumorphicButton></div>
      </NeumorphicCard></div></div>}

      {showMappingModal && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto"><NeumorphicCard className="p-6"><div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-[#6b6b6b] flex items-center gap-2"><LinkIcon className="w-6 h-6" />Abbina Negozi</h2><button onClick={() => setShowMappingModal(false)} className="neumorphic-flat p-2 rounded-lg hover:bg-red-50"><X className="w-5 h-5" /></button></div>
        <div className="space-y-4 mb-6">{unmappedStores.map((u, idx) => <div key={idx} className="neumorphic-pressed p-4 rounded-xl"><p className="font-medium text-[#6b6b6b] mb-3">CSV: <span className="text-[#8b7355]">{u.platformStoreName}</span></p>{u.suggestedMatch && <p className="text-sm text-blue-600 mb-2">Suggerimento: {u.suggestedMatch.store.name} ({u.suggestedMatch.confidence}%)</p>}<select value={storeMapping[u.platformStoreName] || ''} onChange={(e) => setStoreMapping((p) => ({ ...p, [u.platformStoreName]: e.target.value }))} className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"><option value="">-- Seleziona --</option>{stores.map((s) => <option key={s.id} value={s.id}>{s.name} - {s.address}</option>)}</select></div>)}</div>
        <div className="flex gap-3"><NeumorphicButton onClick={() => setShowMappingModal(false)} className="flex-1">Annulla</NeumorphicButton><NeumorphicButton onClick={handleManualMapping} variant="primary" className="flex-1" disabled={Object.keys(storeMapping).length === 0}>Salva</NeumorphicButton></div>
      </NeumorphicCard></div></div>}

      <div className="flex gap-2 mb-6">
        <NeumorphicButton onClick={() => setActiveTab('list')} className={`flex items-center gap-2 ${activeTab === 'list' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' : ''}`}><Package className="w-4 h-4" />Lista</NeumorphicButton>
        <NeumorphicButton onClick={() => setActiveTab('analytics')} className={`flex items-center gap-2 ${activeTab === 'analytics' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' : ''}`}><BarChart3 className="w-4 h-4" />Analisi</NeumorphicButton>
        <NeumorphicButton onClick={() => setActiveTab('employees')} className={`flex items-center gap-2 ${activeTab === 'employees' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' : ''}`}><Users className="w-4 h-4" />Dipendenti</NeumorphicButton>
      </div>

      {activeTab === 'analytics' && <><FilterBar />
        <NeumorphicCard className="p-6 mb-6"><div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-[#6b6b6b]">Per Negozio</h3><NeumorphicButton onClick={() => analyzeWithAI('byStore')} disabled={!analyticsData.byStore.length || loadingAI} className="flex items-center gap-2 text-sm"><Sparkles className="w-4 h-4" />AI</NeumorphicButton></div>{analyticsData.byStore.length > 0 ? <ResponsiveContainer width="100%" height={300}><BarChart data={analyticsData.byStore}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-45} textAnchor="end" height={100} /><YAxis /><Tooltip /><Legend /><Bar dataKey="glovo" fill="#ea580c" name="Glovo" /><Bar dataKey="deliveroo" fill="#14b8a6" name="Deliveroo" /></BarChart></ResponsiveContainer> : <p className="text-center text-[#9b9b9b] py-8">Nessun dato</p>}</NeumorphicCard>
        <NeumorphicCard className="p-6 mb-6"><div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-[#6b6b6b]">Trend</h3><div className="flex gap-2"><div className="flex gap-1 neumorphic-pressed rounded-lg p-1">{['daily','weekly','monthly'].map((v) => <button key={v} onClick={() => setTrendView(v)} className={`px-3 py-1 rounded-lg text-xs font-medium ${trendView === v ? 'bg-blue-500 text-white' : 'text-[#6b6b6b]'}`}>{v === 'daily' ? 'Giorno' : v === 'weekly' ? 'Settimana' : 'Mese'}</button>)}</div><NeumorphicButton onClick={() => analyzeWithAI('byDate')} disabled={!analyticsData.byDate.length || loadingAI} className="text-sm"><Sparkles className="w-4 h-4" /></NeumorphicButton></div></div>{analyticsData.byDate.length > 0 ? <ResponsiveContainer width="100%" height={300}><LineChart data={analyticsData.byDate}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend />{showCount && <Line type="monotone" dataKey="count" stroke="#8b7355" name="Ordini" strokeWidth={2} />}{showRefunds && <Line type="monotone" dataKey="refunds" stroke="#dc2626" name="€ Rimborsi" strokeWidth={2} />}</LineChart></ResponsiveContainer> : <p className="text-center text-[#9b9b9b] py-8">Nessun dato</p>}</NeumorphicCard>
      </>}

      {activeTab === 'list' && <NeumorphicCard className="p-6"><h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Ordini ({wrongOrders.length})</h2>{wrongOrders.length === 0 ? <div className="text-center py-12"><Package className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" /><p>Nessun ordine</p></div> : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b-2 border-[#8b7355]"><th className="text-left p-3">Platform</th><th className="text-left p-3">ID</th><th className="text-left p-3">Data</th><th className="text-left p-3">Negozio</th><th className="text-right p-3">Totale</th><th className="text-right p-3">Rimborso</th><th className="text-center p-3">Azioni</th></tr></thead><tbody>{wrongOrders.map((o) => <tr key={o.id} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3]"><td className="p-3"><span className={`px-3 py-1 rounded-full text-xs font-bold ${o.platform === 'glovo' ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'}`}>{o.platform}</span></td><td className="p-3 font-mono text-sm">{o.order_id}</td><td className="p-3 text-sm">{new Date(o.order_date).toLocaleDateString('it-IT')}</td><td className="p-3 text-sm">{o.store_name}{o.store_matched && <span className="text-xs text-green-600 ml-1">✓</span>}</td><td className="p-3 text-right">€{o.order_total?.toFixed(2) || '0.00'}</td><td className="p-3 text-right font-bold text-red-600">€{o.refund_value?.toFixed(2) || '0.00'}</td><td className="p-3 text-center"><button onClick={() => { if (confirm('Eliminare?')) deleteOrderMutation.mutate(o.id); }} className="neumorphic-flat p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-600" /></button></td></tr>)}</tbody></table></div>}</NeumorphicCard>}

      {activeTab === 'employees' && <><FilterBar />
        <NeumorphicCard className="p-6"><h3 className="text-lg font-bold text-[#6b6b6b] mb-4">Per Dipendente</h3>{employeeAnalytics.length > 0 ? <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b-2 border-[#8b7355]"><th className="text-left p-3">Dipendente</th><th className="text-right p-3">N°</th><th className="text-right p-3">Rimborsi</th><th className="text-center p-3">Azioni</th></tr></thead><tbody>{employeeAnalytics.map((emp, idx) => <React.Fragment key={idx}><tr className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3]"><td className="p-3"><div className="flex items-center gap-2"><button onClick={() => setExpandedEmployees((p) => ({ ...p, [idx]: !p[idx] }))} className="neumorphic-flat p-1 rounded-lg">{expandedEmployees[idx] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button><span className="font-medium">{emp.dipendente_nome}</span></div></td><td className="p-3 text-right font-bold">{emp.count}</td><td className="p-3 text-right font-bold text-red-600">€{emp.totalRefunds.toFixed(2)}</td><td className="p-3 text-center"><NeumorphicButton onClick={() => { setSelectedEmployee(emp); setShowLetterModal(true); }} className="text-sm"><Send className="w-4 h-4" /></NeumorphicButton></td></tr>{expandedEmployees[idx] && <tr><td colSpan="4" className="p-0"><div className="bg-slate-50 p-4"><table className="w-full text-sm"><thead><tr className="border-b border-slate-300"><th className="text-left p-2">Platform</th><th className="text-left p-2">ID</th><th className="text-left p-2">Data</th><th className="text-left p-2">Negozio</th></tr></thead><tbody>{emp.orders.map((o, oi) => <tr key={oi} className="border-b border-slate-200"><td className="p-2"><span className={`px-2 py-1 rounded-full text-xs font-bold ${o.platform === 'glovo' ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'}`}>{o.platform}</span></td><td className="p-2 font-mono text-xs">{o.order_id}</td><td className="p-2 text-xs">{new Date(o.order_date).toLocaleDateString('it-IT')}</td><td className="p-2 text-xs">{o.store_name}</td></tr>)}</tbody></table></div></td></tr>}</React.Fragment>)}</tbody></table></div> : <p className="text-center text-[#9b9b9b] py-8">Nessun dato</p>}</NeumorphicCard>
      </>}

      {showLetterModal && selectedEmployee && <LetterModal selectedEmployee={selectedEmployee} letterTemplates={letterTemplates} dateRange={dateRange} customStartDate={customStartDate} customEndDate={customEndDate} onClose={() => { setShowLetterModal(false); setSelectedEmployee(null); }} />}
      {showAIAnalysis && <AIAnalysisModal content={aiAnalysisContent} loading={loadingAI} onClose={() => setShowAIAnalysis(false)} />}

      <NeumorphicCard className="p-6 bg-blue-50"><div className="flex items-start gap-3"><AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" /><div className="text-sm text-blue-800"><p className="font-medium mb-2">💡 Come funziona</p><ul className="text-xs space-y-1 list-disc list-inside"><li>Seleziona piattaforma e carica CSV</li><li>Il sistema abbinerà i negozi automaticamente</li><li>Abbinamenti salvati per futuri import</li></ul></div></div></NeumorphicCard>
    </div>
  );
}