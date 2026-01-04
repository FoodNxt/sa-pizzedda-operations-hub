import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  TrendingUp,
  DollarSign,
  Package,
  Link as LinkIcon,
  X,
  BarChart3,
  Calendar,
  Settings,
  Eye
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function OrdiniSbagliati() {
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [unmappedStores, setUnmappedStores] = useState([]);
  const [storeMapping, setStoreMapping] = useState({});
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'analytics'
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateRange, setDateRange] = useState('month'); // 'week', 'month', 'all', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCount, setShowCount] = useState(true);
  const [showRefunds, setShowRefunds] = useState(true);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({
    order_id_column: '',
    store_column: '',
    order_date_column: '',
    order_total_column: '',
    refund_column: '',
    refund_reason_column: ''
  });
  const [pendingFile, setPendingFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState([]);

  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: wrongOrders = [] } = useQuery({
    queryKey: ['wrong-orders'],
    queryFn: async () => {
      const allOrders = await base44.entities.WrongOrder.list('-order_date', 1000);
      // Remove duplicates by order_id
      const uniqueOrders = [];
      const seenOrderIds = new Set();
      
      for (const order of allOrders) {
        if (!seenOrderIds.has(order.order_id)) {
          seenOrderIds.add(order.order_id);
          uniqueOrders.push(order);
        }
      }
      
      return uniqueOrders;
    },
  });

  const { data: storeMappings = [] } = useQuery({
    queryKey: ['store-mappings'],
    queryFn: () => base44.entities.StoreMapping.list(),
  });

  const { data: columnMappings = [] } = useQuery({
    queryKey: ['column-mappings'],
    queryFn: () => base44.entities.CSVColumnMapping.list(),
  });

  const createMappingMutation = useMutation({
    mutationFn: (data) => base44.entities.StoreMapping.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-mappings'] });
    },
  });

  const createColumnMappingMutation = useMutation({
    mutationFn: (data) => base44.entities.CSVColumnMapping.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['column-mappings'] });
    },
  });

  // NEW: Parse Deliveroo date format "2 Aug 2025 at 19:55"
  const parseDeliverooDate = (dateString) => {
    try {
      // Format: "2 Aug 2025 at 19:55"
      const parts = dateString.split(' at ');
      if (parts.length === 2) {
        const datePart = parts[0]; // "2 Aug 2025"
        const timePart = parts[1]; // "19:55"
        
        // Parse date
        const dateComponents = datePart.split(' '); // ["2", "Aug", "2025"]
        const day = dateComponents[0];
        const month = dateComponents[1];
        const year = dateComponents[2];
        
        // Convert month name to number
        const months = {
          'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
          'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
          'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        
        const monthNum = months[month];
        if (!monthNum) return null;
        
        // Build ISO string: YYYY-MM-DDTHH:MM:SS
        const isoString = `${year}-${monthNum}-${day.padStart(2, '0')}T${timePart}:00`;
        const date = new Date(isoString);
        
        if (isNaN(date.getTime())) return null;
        return date.toISOString();
      }
      
      // Fallback to standard parsing
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return null;
    }
  };

  const parseCsvLine = (line) => {
    const values = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentValue += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());
    return values;
  };

  const parseNumericValue = (value) => {
    if (!value || value.trim() === '') return 0;

    // Remove currency symbols and spaces
    let cleaned = value.replace(/[€$£\s]/g, '');

    // Handle European format (1.234,56) vs US format (1,234.56)
    const hasComma = cleaned.includes(',');
    const hasDot = cleaned.includes('.');

    if (hasComma && hasDot) {
      // Both present - determine which is decimal separator
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');
      if (lastComma > lastDot) {
        // European: 1.234,56
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // US: 1,234.56
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (hasComma) {
      // Only comma - check if it's thousands or decimal
      const commaPos = cleaned.indexOf(',');
      const afterComma = cleaned.substring(commaPos + 1);
      if (afterComma.length === 2) {
        // Likely decimal: 12,50
        cleaned = cleaned.replace(',', '.');
      } else {
        // Likely thousands: 1,234
        cleaned = cleaned.replace(',', '');
      }
    }

    // Remove any remaining non-numeric characters except dot and minus
    cleaned = cleaned.replace(/[^0-9.-]/g, '');

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const findBestMatch = (platformStoreName, stores) => {
    const normalize = (str) => str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const normalizedPlatform = normalize(platformStoreName);
    
    let bestMatch = null;
    let bestScore = 0;
    
    stores.forEach(store => {
      const normalizedStore = normalize(store.name);
      
      // Exact match
      if (normalizedPlatform === normalizedStore) {
        bestMatch = store;
        bestScore = 100;
        return;
      }
      
      // Contains match
      if (normalizedPlatform.includes(normalizedStore) || normalizedStore.includes(normalizedPlatform)) {
        const score = 80;
        if (score > bestScore) {
          bestMatch = store;
          bestScore = score;
        }
      }
      
      // Fuzzy match (simple Levenshtein-like)
      const minLength = Math.min(normalizedPlatform.length, normalizedStore.length);
      let matchingChars = 0;
      for (let i = 0; i < minLength; i++) {
        if (normalizedPlatform[i] === normalizedStore[i]) matchingChars++;
      }
      const score = (matchingChars / Math.max(normalizedPlatform.length, normalizedStore.length)) * 60;
      if (score > bestScore && score > 30) {
        bestMatch = store;
        bestScore = score;
      }
    });
    
    return bestMatch ? { store: bestMatch, confidence: Math.round(bestScore) } : null;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedPlatform) {
      alert('Seleziona prima una piattaforma');
      event.target.value = '';
      return;
    }

    setUploading(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV deve contenere almeno una riga di intestazione e una di dati');
      }

      const headers = parseCsvLine(lines[0]);

      // Check if column mapping exists for this platform
      const existingMapping = columnMappings.find(m => m.platform === selectedPlatform && m.is_active);
      
      if (!existingMapping) {
        // Show column mapping modal
        setCsvHeaders(headers);
        setPendingFile({ text, headers, lines });
        setShowColumnMapping(true);
        setUploading(false);
        event.target.value = '';
        return;
      }

      // Show preview with existing mapping
      setCsvHeaders(headers);
      setPendingFile({ text, headers, lines });
      setColumnMapping(existingMapping);
      generatePreview(lines, headers, existingMapping);
      setShowPreview(true);
      setUploading(false);
      event.target.value = '';

    } catch (error) {
      console.error('Error processing CSV:', error);
      setImportResult({
        success: false,
        error: error.message
      });
      setUploading(false);
    }

    event.target.value = '';
  };

  const processCSVWithMapping = async (lines, headers, mapping) => {
    try {
      const records = [];
      const unmapped = [];
      const skippedLines = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        
        const record = {};
        headers.forEach((header, idx) => {
          record[header] = values[idx] || '';
        });

        // CRITICAL: Use ONLY the mapped columns
        const storeNameField = mapping.store_column;
        const orderIdField = mapping.order_id_column;
        const orderDateField = mapping.order_date_column;
        const orderTotalField = mapping.order_total_column;
        const refundField = mapping.refund_column;

        // Extract data ONLY from the specified mapped columns
        const platformStoreName = record[storeNameField]?.trim() || '';
        const orderId = record[orderIdField]?.trim() || '';
        
        // Skip ONLY if critical data is missing
        if (!platformStoreName || !orderId) {
          skippedLines.push(i + 1);
          continue;
        }
        
        // Parse numeric values (allow 0 values)
        const orderTotal = parseNumericValue(record[orderTotalField]);
        const refundValue = parseNumericValue(record[refundField]);
        
        const finalStoreName = platformStoreName;
        const finalOrderId = orderId;

        let storeMatch = storeMappings.find(
          m => m.platform === selectedPlatform && m.platform_store_name === finalStoreName
        );

        if (!storeMatch) {
          const autoMatch = findBestMatch(finalStoreName, stores);
          if (autoMatch && autoMatch.confidence >= 70) {
            const mappingData = {
              platform: selectedPlatform,
              platform_store_name: finalStoreName,
              store_id: autoMatch.store.id,
              store_name: autoMatch.store.name,
              auto_matched: true,
              confidence_score: autoMatch.confidence
            };
            await createMappingMutation.mutateAsync(mappingData);
            storeMatch = mappingData;
          } else {
            if (!unmapped.find(u => u.platformStoreName === finalStoreName)) {
              unmapped.push({
                platformStoreName: finalStoreName,
                suggestedMatch: autoMatch
              });
            }
          }
        }

        let parsedDate;
        try {
          if (selectedPlatform === 'deliveroo') {
            parsedDate = parseDeliverooDate(record[orderDateField]);
          } else {
            parsedDate = record[orderDateField] ? new Date(record[orderDateField]).toISOString() : null;
          }
          
          if (!parsedDate || parsedDate === 'Invalid Date') {
            parsedDate = new Date().toISOString();
          }
        } catch (error) {
          parsedDate = new Date().toISOString();
        }

        const wrongOrder = {
          platform: selectedPlatform,
          order_id: finalOrderId,
          order_date: parsedDate,
          store_name: finalStoreName,
          store_id: storeMatch ? storeMatch.store_id : null,
          store_matched: !!storeMatch,
          order_total: orderTotal,
          refund_value: refundValue,
          customer_refund_status: '',
          complaint_reason: selectedPlatform === 'glovo' && mapping.refund_reason_column ? (record[mapping.refund_reason_column] || '') : null,
          cancellation_reason: null,
          order_status: null,
          raw_data: record,
          import_date: new Date().toISOString(),
          imported_by: (await base44.auth.me()).email
        };

        records.push(wrongOrder);
      }

      let successCount = 0;
      let errorCount = 0;
      let duplicateCount = 0;

      for (const record of records) {
        try {
          const existing = wrongOrders.find(o => o.order_id === record.order_id && o.platform === record.platform);
          if (existing) {
            duplicateCount++;
            continue;
          }
          
          await base44.entities.WrongOrder.create(record);
          successCount++;
        } catch (error) {
          console.error('Error creating order:', error);
          errorCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['wrong-orders'] });

      setImportResult({
        success: true,
        total: records.length,
        successCount,
        errorCount,
        duplicateCount,
        unmappedCount: unmapped.length,
        skippedLinesCount: skippedLines.length,
        totalCsvLines: lines.length - 1
      });

      if (unmapped.length > 0) {
        setUnmappedStores(unmapped);
        setShowMappingModal(true);
      }

      setUploading(false);
    } catch (error) {
      console.error('Error processing CSV:', error);
      setImportResult({
        success: false,
        error: error.message
      });
      setUploading(false);
    }
  };

  const handleManualMapping = async () => {
    for (const [platformStoreName, storeId] of Object.entries(storeMapping)) {
      if (!storeId) continue;

      const store = stores.find(s => s.id === storeId);
      if (!store) continue;

      const mappingData = {
        platform: selectedPlatform,
        platform_store_name: platformStoreName,
        store_id: storeId,
        store_name: store.name,
        auto_matched: false,
        confidence_score: 100
      };

      await createMappingMutation.mutateAsync(mappingData);
    }

    setShowMappingModal(false);
    setUnmappedStores([]);
    setStoreMapping({});
    queryClient.invalidateQueries({ queryKey: ['store-mappings'] });
    
    alert('Mapping salvati! Riprova il caricamento del CSV.');
  };

  const generatePreview = (lines, headers, mapping) => {
    const preview = [];
    const maxPreview = 5;

    for (let i = 1; i < Math.min(lines.length, maxPreview + 1); i++) {
      const values = parseCsvLine(lines[i]);
      const record = {};
      headers.forEach((header, idx) => {
        record[header] = values[idx] || '';
      });

      const storeName = record[mapping.store_column] || '';
      const totalRaw = record[mapping.order_total_column] || '';
      const refundRaw = record[mapping.refund_column] || '';

      // Mark as suspicious only if clearly wrong
      const storeSuspicious = false; // Accept all store names

      // Parse and validate numeric values
      const totalParsed = parseNumericValue(totalRaw);
      const refundParsed = parseNumericValue(refundRaw);
      const totalSuspicious = !totalRaw || totalParsed === 0;
      const refundSuspicious = !refundRaw || refundParsed === 0;

      preview.push({
        orderId: record[mapping.order_id_column] || '',
        store: storeName,
        storeSuspicious,
        date: record[mapping.order_date_column] || '',
        total: totalRaw,
        totalParsed,
        totalSuspicious,
        refund: refundRaw,
        refundParsed,
        refundSuspicious,
        reason: mapping.refund_reason_column ? record[mapping.refund_reason_column] || '' : ''
      });
    }

    setPreviewData(preview);
  };

  const handleSaveColumnMapping = async () => {
    if (!columnMapping.order_id_column || !columnMapping.store_column || 
        !columnMapping.order_date_column || !columnMapping.order_total_column || 
        !columnMapping.refund_column) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    try {
      // Deactivate existing mappings for this platform
      const existing = columnMappings.filter(m => m.platform === selectedPlatform);
      for (const m of existing) {
        await base44.entities.CSVColumnMapping.update(m.id, { is_active: false });
      }

      // Create new mapping
      await createColumnMappingMutation.mutateAsync({
        platform: selectedPlatform,
        ...columnMapping,
        is_active: true
      });

      setShowColumnMapping(false);
      
      // Show preview with new mapping
      if (pendingFile) {
        generatePreview(pendingFile.lines, pendingFile.headers, columnMapping);
        setShowPreview(true);
      }
      
      alert('✅ Mapping colonne salvato! Controlla l\'anteprima prima di importare.');
    } catch (error) {
      alert('Errore nel salvare il mapping: ' + error.message);
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingFile) return;
    
    setShowPreview(false);
    setUploading(true);
    
    try {
      await processCSVWithMapping(pendingFile.lines, pendingFile.headers, columnMapping);
      setPendingFile(null);
      setPreviewData([]);
    } catch (error) {
      setUploading(false);
    }
  };

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    let filtered = wrongOrders;

    if (selectedStore !== 'all') {
      filtered = filtered.filter(o => o.store_id === selectedStore);
    }

    const now = new Date();
    if (dateRange === 'week') {
      const weekStart = startOfWeek(now, { locale: it });
      const weekEnd = endOfWeek(now, { locale: it });
      filtered = filtered.filter(o => {
        const date = parseISO(o.order_date);
        return date >= weekStart && date <= weekEnd;
      });
    } else if (dateRange === 'month') {
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      filtered = filtered.filter(o => {
        const date = parseISO(o.order_date);
        return date >= monthStart && date <= monthEnd;
      });
    } else if (dateRange === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      filtered = filtered.filter(o => {
        const date = parseISO(o.order_date);
        return date >= start && date <= end;
      });
    }

    return filtered;
  }, [wrongOrders, selectedStore, dateRange, customStartDate, customEndDate]);

  const stats = {
    total: wrongOrders.length,
    glovo: wrongOrders.filter(o => o.platform === 'glovo').length,
    deliveroo: wrongOrders.filter(o => o.platform === 'deliveroo').length,
    totalRefunds: wrongOrders.reduce((sum, o) => sum + (o.refund_value || 0), 0),
    lastGlovoOrder: wrongOrders.filter(o => o.platform === 'glovo').sort((a, b) => 
      new Date(b.order_date) - new Date(a.order_date)
    )[0],
    lastDeliverooOrder: wrongOrders.filter(o => o.platform === 'deliveroo').sort((a, b) => 
      new Date(b.order_date) - new Date(a.order_date)
    )[0]
  };

  // Analytics data
  const analyticsData = useMemo(() => {
    // Group by store
    const byStore = {};
    filteredOrders.forEach(order => {
      const storeName = stores.find(s => s.id === order.store_id)?.name || order.store_name;
      if (!byStore[storeName]) {
        byStore[storeName] = {
          count: 0,
          refunds: 0,
          glovo: 0,
          deliveroo: 0
        };
      }
      byStore[storeName].count++;
      byStore[storeName].refunds += order.refund_value || 0;
      if (order.platform === 'glovo') byStore[storeName].glovo++;
      if (order.platform === 'deliveroo') byStore[storeName].deliveroo++;
    });

    // Group by date - include ALL days in range, even with 0 orders
    const now = new Date();
    let startDate, endDate;
    
    if (dateRange === 'week') {
      startDate = startOfWeek(now, { locale: it });
      endDate = endOfWeek(now, { locale: it });
    } else if (dateRange === 'month') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else if (dateRange === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
    } else {
      // For 'all', use the earliest and latest order dates
      if (filteredOrders.length > 0) {
        const dates = filteredOrders.map(o => parseISO(o.order_date)).filter(d => !isNaN(d));
        startDate = new Date(Math.min(...dates));
        endDate = new Date(Math.max(...dates));
      } else {
        startDate = now;
        endDate = now;
      }
    }

    // Create an entry for each day in the range
    const byDate = {};
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = format(currentDate, 'dd/MM', { locale: it });
      byDate[dateKey] = {
        date: dateKey,
        count: 0,
        refunds: 0
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add actual order data
    filteredOrders.forEach(order => {
      const date = format(parseISO(order.order_date), 'dd/MM', { locale: it });
      if (byDate[date]) {
        byDate[date].count++;
        byDate[date].refunds += order.refund_value || 0;
      }
    });

    return {
      byStore: Object.entries(byStore).map(([name, data]) => ({ name, ...data })),
      byDate: Object.values(byDate).sort((a, b) => {
        const [dayA, monthA] = a.date.split('/').map(Number);
        const [dayB, monthB] = b.date.split('/').map(Number);
        return monthA !== monthB ? monthA - monthB : dayA - dayB;
      })
    };
  }, [filteredOrders, stores, dateRange]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">📦 Ordini Sbagliati</h1>
        <p className="text-[#9b9b9b]">Importa e gestisci ordini con problemi da Glovo e Deliveroo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Package className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{stats.total}</h3>
          <p className="text-sm text-[#9b9b9b]">Ordini Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-3xl font-bold text-orange-600 mb-1">{stats.glovo}</h3>
          <p className="text-sm text-[#9b9b9b]">Glovo</p>
          {stats.lastGlovoOrder && (
            <p className="text-xs text-[#9b9b9b] mt-2">
              Ultimo: {new Date(stats.lastGlovoOrder.order_date).toLocaleDateString('it-IT')}
            </p>
          )}
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-teal-600" />
          </div>
          <h3 className="text-3xl font-bold text-teal-600 mb-1">{stats.deliveroo}</h3>
          <p className="text-sm text-[#9b9b9b]">Deliveroo</p>
          {stats.lastDeliverooOrder && (
            <p className="text-xs text-[#9b9b9b] mt-2">
              Ultimo: {new Date(stats.lastDeliverooOrder.order_date).toLocaleDateString('it-IT')}
            </p>
          )}
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <DollarSign className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-3xl font-bold text-red-600 mb-1">€{stats.totalRefunds.toFixed(2)}</h3>
          <p className="text-sm text-[#9b9b9b]">Rimborsi Totali</p>
        </NeumorphicCard>
      </div>

      {/* Upload Section */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Importa CSV
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
              Piattaforma <span className="text-red-600">*</span>
            </label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            >
              <option value="">-- Seleziona piattaforma --</option>
              <option value="glovo">Glovo</option>
              <option value="deliveroo">Deliveroo</option>
            </select>
          </div>

          {/* Show current mapping */}
          {selectedPlatform && (() => {
            const mapping = columnMappings.find(m => m.platform === selectedPlatform && m.is_active);
            return mapping ? (
              <div className="neumorphic-pressed p-4 rounded-xl bg-green-50">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-bold text-green-800 mb-2">✅ Mapping attivo per {selectedPlatform}</p>
                    <div className="text-xs text-green-700 space-y-1">
                      <p>• <strong>Order ID:</strong> {mapping.order_id_column}</p>
                      <p>• <strong>Negozio:</strong> {mapping.store_column}</p>
                      <p>• <strong>Data:</strong> {mapping.order_date_column}</p>
                      <p>• <strong>Totale:</strong> {mapping.order_total_column}</p>
                      <p>• <strong>Rimborso:</strong> {mapping.refund_column}</p>
                      {mapping.refund_reason_column && <p>• <strong>Ragione:</strong> {mapping.refund_reason_column}</p>}
                    </div>
                  </div>
                  <NeumorphicButton
                    onClick={() => {
                      setColumnMapping(mapping);
                      setShowColumnMapping(true);
                    }}
                    className="text-xs"
                  >
                    Modifica
                  </NeumorphicButton>
                </div>
              </div>
            ) : (
              <div className="neumorphic-pressed p-3 rounded-xl bg-orange-50">
                <p className="text-sm text-orange-700">⚠️ Nessun mapping configurato per {selectedPlatform}. Al primo caricamento ti chiederemo di mappare le colonne.</p>
              </div>
            );
          })()}

          <div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
              disabled={!selectedPlatform || uploading}
            />
            <label
              htmlFor="csv-upload"
              className={`block text-center neumorphic-flat px-6 py-4 rounded-xl cursor-pointer transition-all ${
                !selectedPlatform || uploading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
              }`}
            >
              <FileText className="w-8 h-8 text-[#8b7355] mx-auto mb-2" />
              <p className="text-[#6b6b6b] font-medium">
                {uploading ? 'Caricamento in corso...' : selectedPlatform ? 'Clicca per caricare CSV' : 'Seleziona prima una piattaforma'}
              </p>
            </label>
          </div>
        </div>
      </NeumorphicCard>

      {/* Import Result */}
      {importResult && (
        <NeumorphicCard className={`p-6 ${importResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-start gap-3">
            {importResult.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
            )}
            <div className="flex-1">
              <h3 className={`text-xl font-bold mb-2 ${importResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {importResult.success ? '✅ Importazione Completata!' : '❌ Errore Importazione'}
              </h3>
              
              {importResult.success ? (
                <div className="space-y-2">
                  <p className="text-green-700">
                    <strong>CSV processato: {importResult.totalCsvLines} righe totali</strong>
                  </p>
                  <p className="text-green-700">
                    ✅ Importati <strong>{importResult.successCount}</strong> ordini
                  </p>
                  {importResult.duplicateCount > 0 && (
                    <p className="text-blue-600">
                      🔁 {importResult.duplicateCount} ordini già esistenti (duplicati)
                    </p>
                  )}
                  {importResult.skippedLinesCount > 0 && (
                    <p className="text-orange-600">
                      ⚠️ {importResult.skippedLinesCount} righe saltate (dati mancanti)
                    </p>
                  )}
                  {importResult.errorCount > 0 && (
                    <p className="text-red-600">
                      ❌ {importResult.errorCount} ordini non importati per errori
                    </p>
                  )}
                  {importResult.unmappedCount > 0 && (
                    <p className="text-yellow-600">
                      🏪 {importResult.unmappedCount} negozi non abbinati - completa gli abbinamenti nel modal
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-red-700">{importResult.error}</p>
              )}
            </div>
          </div>
        </NeumorphicCard>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#6b6b6b] flex items-center gap-2">
                  <Eye className="w-6 h-6 text-[#8b7355]" />
                  Anteprima Import - {selectedPlatform}
                </h2>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setPendingFile(null);
                    setPreviewData([]);
                  }}
                  className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <X className="w-5 h-5 text-[#9b9b9b]" />
                </button>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl bg-blue-50 mb-6">
                <p className="text-sm font-bold text-blue-800 mb-2">📋 Mapping Colonne Attivo:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                  <p>• <strong>Order ID:</strong> {columnMapping.order_id_column}</p>
                  <p>• <strong>Negozio:</strong> {columnMapping.store_column}</p>
                  <p>• <strong>Data:</strong> {columnMapping.order_date_column}</p>
                  <p>• <strong>Totale:</strong> {columnMapping.order_total_column}</p>
                  <p>• <strong>Rimborso:</strong> {columnMapping.refund_column}</p>
                  {columnMapping.refund_reason_column && <p>• <strong>Ragione:</strong> {columnMapping.refund_reason_column}</p>}
                </div>
              </div>

              {(() => {
                const hasSuspiciousStores = previewData.some(row => row.storeSuspicious);
                return (
                  <>
                    {hasSuspiciousStores && (
                      <div className="neumorphic-pressed p-4 rounded-xl bg-red-50 mb-4">
                        <p className="text-sm font-bold text-red-800 mb-2">🚨 ATTENZIONE: Nomi Negozio Sospetti!</p>
                        <p className="text-xs text-red-700">
                          Alcuni nomi di negozio sembrano SBAGLIATI (contengono date, virgole, "delivered", ecc.). 
                          <strong> Probabilmente hai mappato la colonna SBAGLIATA.</strong> Clicca "Modifica Mapping" sotto per correggere!
                        </p>
                      </div>
                    )}
                    
                    <h3 className="font-bold text-[#6b6b6b] mb-3">Primi {previewData.length} ordini del file:</h3>
                    
                    <div className="overflow-x-auto mb-6">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-[#8b7355]">
                            <th className="text-left p-2 text-[#9b9b9b] font-medium">Order ID</th>
                            <th className="text-left p-2 text-[#9b9b9b] font-medium">Negozio</th>
                            <th className="text-left p-2 text-[#9b9b9b] font-medium">Data</th>
                            <th className="text-right p-2 text-[#9b9b9b] font-medium">Totale</th>
                            <th className="text-right p-2 text-[#9b9b9b] font-medium">Rimborso</th>
                            {selectedPlatform === 'glovo' && <th className="text-left p-2 text-[#9b9b9b] font-medium">Ragione</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((row, idx) => (
                            <tr key={idx} className={`border-b ${row.storeSuspicious || row.totalSuspicious || row.refundSuspicious ? 'bg-red-50' : 'border-[#d1d1d1]'}`}>
                              <td className="p-2 text-[#6b6b6b] font-mono">{row.orderId}</td>
                              <td className={`p-2 font-bold ${row.storeSuspicious ? 'text-red-600' : 'text-[#6b6b6b]'}`}>
                                {row.storeSuspicious && '⚠️ '}
                                {row.store || '(vuoto)'}
                              </td>
                              <td className="p-2 text-[#6b6b6b]">{row.date}</td>
                              <td className={`p-2 text-right ${row.totalSuspicious ? 'text-red-600 font-bold' : 'text-[#6b6b6b]'}`}>
                                {row.totalSuspicious && '⚠️ '}
                                {row.total || '(vuoto)'} 
                                {row.totalParsed > 0 && <span className="text-xs text-green-600 ml-1">→ €{row.totalParsed.toFixed(2)}</span>}
                              </td>
                              <td className={`p-2 text-right font-bold ${row.refundSuspicious ? 'text-orange-600' : 'text-red-600'}`}>
                                {row.refundSuspicious && '⚠️ '}
                                {row.refund || '(vuoto)'}
                                {row.refundParsed > 0 && <span className="text-xs text-green-600 ml-1">→ €{row.refundParsed.toFixed(2)}</span>}
                              </td>
                              {selectedPlatform === 'glovo' && <td className="p-2 text-[#6b6b6b] text-xs">{row.reason}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}

              <div className="neumorphic-pressed p-4 rounded-xl bg-blue-50 mb-6">
                <p className="text-sm font-bold text-blue-800 mb-2">💡 Guida alla Verifica:</p>
                <div className="text-xs text-blue-700 space-y-1">
                  <p>✅ <strong>Colonna "Negozio" CORRETTA:</strong> dovrebbe contenere solo il nome del negozio (es. "Ticinese", "Lanino")</p>
                  <p>❌ <strong>Colonna SBAGLIATA:</strong> se vedi date, indirizzi completi, "delivered", "missing", o valori con molte virgole → hai mappato la colonna sbagliata!</p>
                  <p>🔧 <strong>Come correggere:</strong> clicca "Modifica Mapping" sotto e seleziona la colonna che contiene SOLO i nomi dei negozi</p>
                </div>
              </div>

              <div className="flex gap-3">
                <NeumorphicButton
                  onClick={() => {
                    setShowPreview(false);
                    setShowColumnMapping(true);
                  }}
                  className="flex-1"
                >
                  ← Modifica Mapping
                </NeumorphicButton>
                <NeumorphicButton
                  onClick={() => {
                    setShowPreview(false);
                    setPendingFile(null);
                    setPreviewData([]);
                  }}
                  className="flex-1"
                >
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton
                  onClick={handleConfirmImport}
                  variant="primary"
                  className="flex-1"
                >
                  ✅ Conferma e Importa
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          </div>
        </div>
      )}

      {/* Column Mapping Modal */}
      {showColumnMapping && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#6b6b6b] flex items-center gap-2">
                  <Settings className="w-6 h-6 text-[#8b7355]" />
                  Mappa Colonne CSV - {selectedPlatform}
                </h2>
                <button
                  onClick={() => {
                    setShowColumnMapping(false);
                    setPendingFile(null);
                    setUploading(false);
                  }}
                  className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <X className="w-5 h-5 text-[#9b9b9b]" />
                </button>
              </div>

              <p className="text-[#9b9b9b] mb-6">
                Prima importazione per {selectedPlatform}. Seleziona quali colonne del CSV corrispondono ai dati richiesti:
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                    Numero Ordine <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={columnMapping.order_id_column}
                    onChange={(e) => setColumnMapping({...columnMapping, order_id_column: e.target.value})}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  >
                    <option value="">-- Seleziona colonna --</option>
                    {csvHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                    Negozio <span className="text-red-600">*</span>
                  </label>
                  <p className="text-xs text-blue-600 mb-2 bg-blue-50 p-2 rounded">
                    ⚠️ Questa colonna sarà usata per il matching automatico con i tuoi negozi nel sistema
                  </p>
                  <select
                    value={columnMapping.store_column}
                    onChange={(e) => setColumnMapping({...columnMapping, store_column: e.target.value})}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  >
                    <option value="">-- Seleziona colonna --</option>
                    {csvHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                    Data Ordine <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={columnMapping.order_date_column}
                    onChange={(e) => setColumnMapping({...columnMapping, order_date_column: e.target.value})}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  >
                    <option value="">-- Seleziona colonna --</option>
                    {csvHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                    Valore Ordine <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={columnMapping.order_total_column}
                    onChange={(e) => setColumnMapping({...columnMapping, order_total_column: e.target.value})}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  >
                    <option value="">-- Seleziona colonna --</option>
                    {csvHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                    Valore Rimborso <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={columnMapping.refund_column}
                    onChange={(e) => setColumnMapping({...columnMapping, refund_column: e.target.value})}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  >
                    <option value="">-- Seleziona colonna --</option>
                    {csvHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {selectedPlatform === 'glovo' && (
                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Ragione Rimborso (opzionale, solo Glovo)
                    </label>
                    <select
                      value={columnMapping.refund_reason_column}
                      onChange={(e) => setColumnMapping({...columnMapping, refund_reason_column: e.target.value})}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                    >
                      <option value="">-- Seleziona colonna --</option>
                      {csvHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <NeumorphicButton
                  onClick={() => {
                    setShowColumnMapping(false);
                    setPendingFile(null);
                    setUploading(false);
                  }}
                  className="flex-1"
                >
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton
                  onClick={handleSaveColumnMapping}
                  variant="primary"
                  className="flex-1"
                >
                  Salva e Importa
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          </div>
        </div>
      )}

      {/* Mapping Modal */}
      {showMappingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#6b6b6b] flex items-center gap-2">
                  <LinkIcon className="w-6 h-6 text-[#8b7355]" />
                  Abbina Negozi
                </h2>
                <button
                  onClick={() => setShowMappingModal(false)}
                  className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <X className="w-5 h-5 text-[#9b9b9b]" />
                </button>
              </div>

              <p className="text-[#9b9b9b] mb-6">
                I seguenti negozi dal CSV non sono stati abbinati automaticamente. Seleziona il negozio corrispondente:
              </p>

              <div className="space-y-4 mb-6">
                {unmappedStores.map((unmapped, idx) => (
                  <div key={idx} className="neumorphic-pressed p-4 rounded-xl">
                    <p className="font-medium text-[#6b6b6b] mb-3">
                      Nome dal CSV: <span className="text-[#8b7355]">{unmapped.platformStoreName}</span>
                    </p>
                    
                    {unmapped.suggestedMatch && (
                      <p className="text-sm text-blue-600 mb-2">
                        Suggerimento: {unmapped.suggestedMatch.store.name} ({unmapped.suggestedMatch.confidence}% match)
                      </p>
                    )}
                    
                    <select
                      value={storeMapping[unmapped.platformStoreName] || ''}
                      onChange={(e) => setStoreMapping(prev => ({
                        ...prev,
                        [unmapped.platformStoreName]: e.target.value
                      }))}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                    >
                      <option value="">-- Seleziona negozio --</option>
                      {stores.map(store => (
                        <option key={store.id} value={store.id}>
                          {store.name} - {store.address}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <NeumorphicButton
                  onClick={() => setShowMappingModal(false)}
                  className="flex-1"
                >
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton
                  onClick={handleManualMapping}
                  variant="primary"
                  className="flex-1"
                  disabled={Object.keys(storeMapping).length === 0}
                >
                  Salva Abbinamenti
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <NeumorphicButton
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 ${activeTab === 'list' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' : ''}`}
        >
          <Package className="w-4 h-4" />
          Lista Ordini
        </NeumorphicButton>
        <NeumorphicButton
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 ${activeTab === 'analytics' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' : ''}`}
        >
          <BarChart3 className="w-4 h-4" />
          Analisi
        </NeumorphicButton>
      </div>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <>
          {/* Filters */}
          <NeumorphicCard className="p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                  Negozio
                </label>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                >
                  <option value="all">Tutti i negozi</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                  Periodo
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                >
                  <option value="week">Questa settimana</option>
                  <option value="month">Questo mese</option>
                  <option value="custom">Personalizzato</option>
                  <option value="all">Tutti i periodi</option>
                </select>
              </div>

              {dateRange === 'custom' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Data Inizio
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Data Fine
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          </NeumorphicCard>

          {/* Charts */}
          <NeumorphicCard className="p-6 mb-6">
            <h3 className="text-lg font-bold text-[#6b6b6b] mb-4">Ordini Sbagliati per Negozio</h3>
            {analyticsData.byStore.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.byStore}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="glovo" fill="#ea580c" name="Glovo" />
                  <Bar dataKey="deliveroo" fill="#14b8a6" name="Deliveroo" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-[#9b9b9b] py-8">Nessun dato disponibile</p>
            )}
          </NeumorphicCard>

          <NeumorphicCard className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#6b6b6b]">Trend nel Tempo</h3>
              <div className="flex gap-2">
                <label className="flex items-center gap-2 text-sm text-[#6b6b6b] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCount}
                    onChange={(e) => setShowCount(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Numero Ordini
                </label>
                <label className="flex items-center gap-2 text-sm text-[#6b6b6b] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRefunds}
                    onChange={(e) => setShowRefunds(e.target.checked)}
                    className="w-4 h-4"
                  />
                  € Rimborsi
                </label>
              </div>
            </div>
            {analyticsData.byDate.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.byDate}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {showCount && <Line type="monotone" dataKey="count" stroke="#8b7355" name="Ordini" strokeWidth={2} />}
                  {showRefunds && <Line type="monotone" dataKey="refunds" stroke="#dc2626" name="Rimborsi (€)" strokeWidth={2} />}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-[#9b9b9b] py-8">Nessun dato disponibile</p>
            )}
          </NeumorphicCard>

          {/* Store Breakdown Table */}
          <NeumorphicCard className="p-6">
            <h3 className="text-lg font-bold text-[#6b6b6b] mb-4">Dettaglio per Negozio</h3>
            {analyticsData.byStore.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-[#8b7355]">
                      <th className="text-left p-3 text-[#9b9b9b] font-medium">Negozio</th>
                      <th className="text-right p-3 text-[#9b9b9b] font-medium">Totale</th>
                      <th className="text-right p-3 text-[#9b9b9b] font-medium">Glovo</th>
                      <th className="text-right p-3 text-[#9b9b9b] font-medium">Deliveroo</th>
                      <th className="text-right p-3 text-[#9b9b9b] font-medium">Rimborsi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.byStore.sort((a, b) => b.count - a.count).map((store, idx) => (
                      <tr key={idx} className="border-b border-[#d1d1d1]">
                        <td className="p-3 text-[#6b6b6b] font-medium">{store.name}</td>
                        <td className="p-3 text-right font-bold text-[#6b6b6b]">{store.count}</td>
                        <td className="p-3 text-right text-orange-600">{store.glovo}</td>
                        <td className="p-3 text-right text-teal-600">{store.deliveroo}</td>
                        <td className="p-3 text-right font-bold text-red-600">€{store.refunds.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-[#9b9b9b] py-8">Nessun dato disponibile</p>
            )}
          </NeumorphicCard>
        </>
      )}

      {/* Orders List Tab */}
      {activeTab === 'list' && (
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#6b6b6b]">Ordini Importati ({wrongOrders.length})</h2>
          </div>

          {wrongOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
              <p className="text-[#6b6b6b] font-medium">Nessun ordine trovato</p>
              <p className="text-sm text-[#9b9b9b] mt-1">Carica un CSV per iniziare</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#8b7355]">
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Piattaforma</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Order ID</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Data</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Negozio</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Totale</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Rimborso</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {wrongOrders.map((order) => (
                    <tr key={order.id} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          order.platform === 'glovo' 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-teal-100 text-teal-700'
                        }`}>
                          {order.platform}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-sm text-[#6b6b6b]">{order.order_id}</span>
                      </td>
                      <td className="p-3 text-sm text-[#6b6b6b]">
                        {new Date(order.order_date).toLocaleDateString('it-IT')} {new Date(order.order_date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="text-sm text-[#6b6b6b]">{order.store_name}</p>
                          {order.store_matched && (
                            <span className="text-xs text-green-600">✓ Abbinato</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right font-medium text-[#6b6b6b]">
                        €{order.order_total?.toFixed(2) || '0.00'}
                      </td>
                      <td className="p-3 text-right font-bold text-red-600">
                        €{order.refund_value?.toFixed(2) || '0.00'}
                      </td>
                      <td className="p-3 text-sm text-[#6b6b6b]">
                        {order.customer_refund_status || order.order_status || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </NeumorphicCard>
      )}

      {/* Info Box */}
      <NeumorphicCard className="p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">💡 Come funziona</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>Seleziona la piattaforma (Glovo o Deliveroo)</li>
              <li>Carica il CSV con gli ordini problematici</li>
              <li>Il sistema abbinerà automaticamente i negozi quando possibile</li>
              <li>Se necessario, ti verrà chiesto di abbinare manualmente i negozi non riconosciuti</li>
              <li>Gli abbinamenti vengono salvati per futuri import</li>
              <li>Puoi visualizzare statistiche e dettagli di tutti gli ordini importati</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}