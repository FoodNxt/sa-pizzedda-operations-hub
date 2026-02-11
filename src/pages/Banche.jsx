import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NeumorphicCard from '../components/neumorphic/NeumorphicCard';
import NeumorphicButton from '../components/neumorphic/NeumorphicButton';
import ProtectedPage from '../components/ProtectedPage';
import { RefreshCw, Download, Plus, Trash2, Edit2, Check, X, ChevronRight } from 'lucide-react';
import { formatEuro } from '../components/utils/formatCurrency';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Banche() {
  const [activeView, setActiveView] = useState('overview');
  const [editingRule, setEditingRule] = useState(null);
  const [newRule, setNewRule] = useState({ pattern: '', category: '', subcategory: '', match_type: 'contains', search_in: 'description', priority: 0, is_giroconto: false });
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [trendView, setTrendView] = useState('daily'); // daily, weekly, monthly
  const [trendDateRange, setTrendDateRange] = useState('last30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [spendingDateRange, setSpendingDateRange] = useState('currentMonth');
  const [expandedSpendingSubcategories, setExpandedSpendingSubcategories] = useState({});
  const [incomeView, setIncomeView] = useState('category'); // category, subcategory
  const [incomeDateRange, setIncomeDateRange] = useState('currentMonth');
  const [uncategorizedExpanded, setUncategorizedExpanded] = useState(false);
  const [expandedSpendingRows, setExpandedSpendingRows] = useState({});
  const [expandedIncomeRows, setExpandedIncomeRows] = useState({});
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['bank-transactions'],
    queryFn: () => base44.entities.BankTransaction.list('-madeOn', 1000)
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['bank-transaction-rules'],
    queryFn: () => base44.entities.BankTransactionRule.list('-priority')
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('importBankTransactionsFromGoogleSheets');
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      alert(`Importati ${data.imported} nuove transazioni, saltate ${data.skipped} duplicate`);
    },
    onError: (error) => {
      alert(`Errore: ${error.message}`);
    }
  });

  const createRuleMutation = useMutation({
    mutationFn: (ruleData) => base44.entities.BankTransactionRule.create(ruleData),
    onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['bank-transaction-rules'] });
    setNewRule({ pattern: '', category: '', subcategory: '', match_type: 'contains', search_in: 'description', priority: 0, is_giroconto: false });
    }
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankTransactionRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transaction-rules'] });
      setEditingRule(null);
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => base44.entities.BankTransactionRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transaction-rules'] });
    }
  });

  const applyRulesMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('applyBankTransactionRules');
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      alert(`Applicate regole a ${data.updated} transazioni`);
    }
  });

  const matchTransaction = (tx, rule) => {
    const pattern = rule.pattern.toLowerCase();
    const searchIn = rule.search_in || 'description';
    
    const fieldsToCheck = [];
    if (searchIn === 'description' || searchIn === 'both') {
      if (tx.description) fieldsToCheck.push(tx.description.toLowerCase());
    }
    if (searchIn === 'additional' || searchIn === 'both') {
      if (tx.additional) fieldsToCheck.push(tx.additional.toLowerCase());
    }
    
    return fieldsToCheck.some(text => {
      switch (rule.match_type) {
        case 'contains': return text.includes(pattern);
        case 'starts_with': return text.startsWith(pattern);
        case 'ends_with': return text.endsWith(pattern);
        case 'exact': return text === pattern;
        default: return false;
      }
    });
  };

  const getMatchedTransactions = (rule) => {
    return transactions.filter(tx => matchTransaction(tx, rule));
  };

  // Get latest balance for each account
  const accountBalances = transactions.reduce((acc, tx) => {
    if (!tx.account_name || tx.account_balance_snapshot === null || tx.account_balance_snapshot === undefined) return acc;
    
    const key = `${tx.account_provider_name || 'N/A'}_${tx.account_name}`;
    
    if (!acc[key] || new Date(tx.madeOn) > new Date(acc[key].date)) {
      acc[key] = {
        account_name: tx.account_name,
        account_provider: tx.account_provider_name || 'N/A',
        balance: tx.account_balance_snapshot,
        date: tx.madeOn
      };
    }
    
    return acc;
  }, {});

  const balanceData = Object.values(accountBalances);

  // Get unique providers and accounts
  const providers = ['all', ...new Set(transactions.map(t => t.account_provider_name).filter(Boolean))];
  const accounts = selectedProvider === 'all' 
    ? ['all', ...new Set(transactions.map(t => t.account_name).filter(Boolean))]
    : ['all', ...new Set(transactions.filter(t => t.account_provider_name === selectedProvider).map(t => t.account_name).filter(Boolean))];

  // Filter transactions for trend
  const filteredTransactions = transactions.filter(tx => {
    if (selectedProvider !== 'all' && tx.account_provider_name !== selectedProvider) return false;
    if (selectedAccount !== 'all' && tx.account_name !== selectedAccount) return false;
    return true;
  });

  // Calculate date range for trend
  const getTrendDateRange = () => {
    const today = new Date();
    let startDate, endDate = today;

    if (trendDateRange === 'custom') {
      if (!customStartDate || !customEndDate) return { startDate: null, endDate: null };
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
    } else if (trendDateRange === 'currentMonth') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (trendDateRange === 'lastMonth') {
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (trendDateRange === 'last30') {
      startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (trendDateRange === 'last60') {
      startDate = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
    } else if (trendDateRange === 'last90') {
      startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  };

  const { startDate: trendStart, endDate: trendEnd } = getTrendDateRange();

  // Get categories marked as giroconto
  const girocontoCategories = new Set(
    rules.filter(r => r.is_giroconto).map(r => r.category)
  );

  // Filter transactions by date range and exclude giroconti
  const dateFilteredTransactions = filteredTransactions.filter(tx => {
    if (!trendStart || !trendEnd || !tx.madeOn) return true;
    const txDate = new Date(tx.madeOn);
    const inDateRange = txDate >= trendStart && txDate <= trendEnd;
    const isGiroconto = tx.category && girocontoCategories.has(tx.category);
    return inDateRange && !isGiroconto;
  });

  // Group by period (daily, weekly, monthly)
  const trendData = dateFilteredTransactions.reduce((acc, tx) => {
    if (!tx.madeOn) return acc;
    
    const date = new Date(tx.madeOn);
    let key;

    if (trendView === 'daily') {
      key = tx.madeOn;
    } else if (trendView === 'weekly') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else if (trendView === 'monthly') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    
    if (!acc[key]) {
      acc[key] = { date: key, entrate: 0, uscite: 0 };
    }
    
    if (tx.amount > 0) {
      acc[key].entrate += tx.amount;
    } else {
      acc[key].uscite += Math.abs(tx.amount);
    }
    
    return acc;
  }, {});

  const trendChartData = Object.values(trendData).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate spending date range
  const getSpendingDateRange = () => {
    const today = new Date();
    let startDate, endDate = today;

    if (spendingDateRange === 'currentMonth') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (spendingDateRange === 'lastMonth') {
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (spendingDateRange === 'last30') {
      startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (spendingDateRange === 'last60') {
      startDate = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
    } else if (spendingDateRange === 'last90') {
      startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  };

  const { startDate: spendingStart, endDate: spendingEnd } = getSpendingDateRange();

  // Filter spending transactions (only negative amounts)
  const spendingTransactions = transactions.filter(tx => {
    if (tx.amount >= 0) return false;
    if (!spendingStart || !spendingEnd || !tx.madeOn) return false;
    const txDate = new Date(tx.madeOn);
    return txDate >= spendingStart && txDate <= spendingEnd;
  });

  // Group by category with subcategories hierarchy
  const spendingDataByCategory = spendingTransactions.reduce((acc, tx) => {
    const category = tx.category || 'Non categorizzato';
    const subcategory = tx.subcategory || 'Senza sottocategoria';
    
    if (!acc[category]) {
      acc[category] = { 
        name: category, 
        total: 0, 
        count: 0, 
        subcategories: {} 
      };
    }
    
    if (!acc[category].subcategories[subcategory]) {
      acc[category].subcategories[subcategory] = {
        name: subcategory,
        total: 0,
        count: 0,
        transactions: []
      };
    }
    
    const amount = Math.abs(tx.amount);
    acc[category].total += amount;
    acc[category].count += 1;
    acc[category].subcategories[subcategory].total += amount;
    acc[category].subcategories[subcategory].count += 1;
    acc[category].subcategories[subcategory].transactions.push(tx);
    
    return acc;
  }, {});

  const spendingTableData = Object.values(spendingDataByCategory).sort((a, b) => b.total - a.total);

  // Income by category/subcategory
  const getIncomeDateRange = () => {
    const today = new Date();
    let startDate, endDate = today;

    if (incomeDateRange === 'currentMonth') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (incomeDateRange === 'lastMonth') {
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (incomeDateRange === 'last30') {
      startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (incomeDateRange === 'last60') {
      startDate = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
    } else if (incomeDateRange === 'last90') {
      startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  };

  const { startDate: incomeStart, endDate: incomeEnd } = getIncomeDateRange();

  // Filter income transactions (only positive amounts)
  const incomeTransactions = transactions.filter(tx => {
    if (tx.amount <= 0) return false;
    if (!incomeStart || !incomeEnd || !tx.madeOn) return false;
    const txDate = new Date(tx.madeOn);
    return txDate >= incomeStart && txDate <= incomeEnd;
  });

  // Group by category or subcategory
  const incomeData = incomeTransactions.reduce((acc, tx) => {
    let key = incomeView === 'category' ? tx.category : tx.subcategory;
    if (!key || key === '') {
      key = incomeView === 'category' ? 'Non categorizzato' : 'Senza sottocategoria';
    }
    
    if (!acc[key]) {
      acc[key] = { name: key, total: 0, count: 0, transactions: [] };
    }
    
    acc[key].total += tx.amount;
    acc[key].count += 1;
    acc[key].transactions.push(tx);
    
    return acc;
  }, {});

  const incomeTableData = Object.values(incomeData).sort((a, b) => b.total - a.total);

  // Uncategorized transactions
  const uncategorizedTransactions = transactions.filter(tx => !tx.category || tx.category === '' || tx.category === 'uncategorized');

  // Get unique existing categories and subcategories
  const existingCategories = [...new Set(transactions.map(t => t.category).filter(Boolean))];
  const existingSubcategories = [...new Set(transactions.map(t => t.subcategory).filter(Boolean))];

  // Gerarchia categorie/sottocategorie costruita dai dati (DOPO che rules è definito)
  const categoryHierarchy = (() => {
    const hierarchy = {};
    (rules || []).forEach(rule => {
      if (!rule.category) return;
      if (!hierarchy[rule.category]) {
        hierarchy[rule.category] = new Set();
      }
      if (rule.subcategory) {
        hierarchy[rule.category].add(rule.subcategory);
      }
    });
    Object.keys(hierarchy).forEach(cat => {
      hierarchy[cat] = Array.from(hierarchy[cat]).sort();
    });
    return hierarchy;
  })();
  const categories = Object.keys(categoryHierarchy).sort();

  return (
    <ProtectedPage pageName="Banche">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-800">Banche</h1>
          <NeumorphicButton
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending}
            variant="primary"
            className="flex items-center gap-2"
          >
            {importMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Importa da Google Sheets
          </NeumorphicButton>
        </div>

        {/* View Tabs */}
        <NeumorphicCard className="p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView('overview')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeView === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveView('matching')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeView === 'matching'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Matching
            </button>
            <button
              onClick={() => setActiveView('raw')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeView === 'raw'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Raw Data
            </button>
          </div>
        </NeumorphicCard>

        {/* Overview View */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Balance Table */}
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Balance</h2>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Totale</p>
                  <p className={`text-2xl font-bold ${
                    balanceData.reduce((sum, b) => sum + b.balance, 0) >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {formatEuro(balanceData.reduce((sum, b) => sum + b.balance, 0))}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left p-3 font-semibold text-slate-700">Account Provider</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Account Name</th>
                      <th className="text-right p-3 font-semibold text-slate-700">Balance</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balanceData.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-8 text-slate-500">
                          Nessun dato disponibile
                        </td>
                      </tr>
                    ) : (
                      balanceData.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 text-slate-700">{item.account_provider}</td>
                          <td className="p-3 text-slate-700">{item.account_name}</td>
                          <td className={`p-3 text-right font-medium ${
                            item.balance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatEuro(item.balance)}
                          </td>
                          <td className="p-3 text-slate-700">{item.date}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </NeumorphicCard>

            {/* Trend Chart */}
            <NeumorphicCard className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Trend Entrate/Uscite</h2>
              
              {/* View Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setTrendView('daily')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    trendView === 'daily'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Giornaliero
                </button>
                <button
                  onClick={() => setTrendView('weekly')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    trendView === 'weekly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Settimanale
                </button>
                <button
                  onClick={() => setTrendView('monthly')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    trendView === 'monthly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Mensile
                </button>
              </div>

              {/* Date Range Filters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <button
                  onClick={() => setTrendDateRange('currentMonth')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    trendDateRange === 'currentMonth'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Mese Corrente
                </button>
                <button
                  onClick={() => setTrendDateRange('lastMonth')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    trendDateRange === 'lastMonth'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Mese Scorso
                </button>
                <button
                  onClick={() => setTrendDateRange('last30')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    trendDateRange === 'last30'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Ultimi 30gg
                </button>
                <button
                  onClick={() => setTrendDateRange('last60')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    trendDateRange === 'last60'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Ultimi 60gg
                </button>
                <button
                  onClick={() => setTrendDateRange('last90')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    trendDateRange === 'last90'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Ultimi 90gg
                </button>
                <button
                  onClick={() => setTrendDateRange('custom')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    trendDateRange === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Custom Date Range */}
              {trendDateRange === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Data Inizio
                    </label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Data Fine
                    </label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              {/* Provider and Account Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Account Provider
                  </label>
                  <Select value={selectedProvider} onValueChange={(v) => {
                    setSelectedProvider(v);
                    setSelectedAccount('all');
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map(p => (
                        <SelectItem key={p} value={p}>
                          {p === 'all' ? 'Tutti' : p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Account Name
                  </label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => (
                        <SelectItem key={a} value={a}>
                          {a === 'all' ? 'Tutti' : a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Chart */}
              {trendChartData.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  Nessun dato disponibile per i filtri selezionati
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value) => formatEuro(value)}
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="entrate" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Entrate"
                      dot={{ r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="uscite" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Uscite"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </NeumorphicCard>

            {/* Spending by Category */}
            <NeumorphicCard className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Spesa per Categoria</h2>
              
              {/* Date Range Filters */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
                <button
                  onClick={() => setSpendingDateRange('currentMonth')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    spendingDateRange === 'currentMonth'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Mese Corrente
                </button>
                <button
                  onClick={() => setSpendingDateRange('lastMonth')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    spendingDateRange === 'lastMonth'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Mese Scorso
                </button>
                <button
                  onClick={() => setSpendingDateRange('last30')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    spendingDateRange === 'last30'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Ultimi 30gg
                </button>
                <button
                  onClick={() => setSpendingDateRange('last60')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    spendingDateRange === 'last60'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Ultimi 60gg
                </button>
                <button
                  onClick={() => setSpendingDateRange('last90')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    spendingDateRange === 'last90'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Ultimi 90gg
                </button>
              </div>

              {/* Spending Table with Hierarchical View */}
              {spendingTableData.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  Nessuna spesa nel periodo selezionato
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left p-3 font-semibold text-slate-700">Categoria</th>
                        <th className="text-right p-3 font-semibold text-slate-700">Totale</th>
                        <th className="text-right p-3 font-semibold text-slate-700">Transazioni</th>
                        <th className="text-right p-3 font-semibold text-slate-700">Media</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spendingTableData.map((category, catIdx) => {
                        const subcategoriesArray = Object.values(category.subcategories).sort((a, b) => b.total - a.total);
                        
                        return (
                          <React.Fragment key={catIdx}>
                            {/* Category Row */}
                            <tr 
                              className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer bg-slate-50"
                              onClick={() => setExpandedSpendingRows(prev => ({...prev, [category.name]: !prev[category.name]}))}
                            >
                              <td className="p-3 text-slate-800 font-bold">
                                <div className="flex items-center gap-2">
                                  <ChevronRight className={`w-4 h-4 transition-transform ${expandedSpendingRows[category.name] ? 'rotate-90' : ''}`} />
                                  {category.name}
                                </div>
                              </td>
                              <td className="p-3 text-right text-red-600 font-bold">
                                {formatEuro(category.total)}
                              </td>
                              <td className="p-3 text-right text-slate-800 font-bold">{category.count}</td>
                              <td className="p-3 text-right text-slate-600 font-bold">
                                {formatEuro(category.total / category.count)}
                              </td>
                            </tr>
                            
                            {/* Subcategories */}
                            {expandedSpendingRows[category.name] && subcategoriesArray.map((subcategory, subIdx) => (
                              <React.Fragment key={`${catIdx}-${subIdx}`}>
                                <tr 
                                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer bg-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const key = `${category.name}|${subcategory.name}`;
                                    setExpandedSpendingSubcategories(prev => ({...prev, [key]: !prev[key]}));
                                  }}
                                >
                                  <td className="p-3 text-slate-700 font-medium pl-10">
                                    <div className="flex items-center gap-2">
                                      <ChevronRight className={`w-3 h-3 transition-transform ${expandedSpendingSubcategories[`${category.name}|${subcategory.name}`] ? 'rotate-90' : ''}`} />
                                      {subcategory.name}
                                    </div>
                                  </td>
                                  <td className="p-3 text-right text-red-600 font-medium">
                                    {formatEuro(subcategory.total)}
                                  </td>
                                  <td className="p-3 text-right text-slate-700">{subcategory.count}</td>
                                  <td className="p-3 text-right text-slate-600">
                                    {formatEuro(subcategory.total / subcategory.count)}
                                  </td>
                                </tr>
                                
                                {/* Transactions */}
                                {expandedSpendingSubcategories[`${category.name}|${subcategory.name}`] && (
                                  <tr>
                                    <td colSpan="4" className="p-0 bg-slate-100">
                                      <div className="p-4 pl-16">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="border-b border-slate-200">
                                              <th className="text-left p-2 text-slate-600">Data</th>
                                              <th className="text-left p-2 text-slate-600">Descrizione</th>
                                              <th className="text-right p-2 text-slate-600">Importo</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {subcategory.transactions.map((tx, txIdx) => (
                                              <tr key={txIdx} className="border-b border-slate-100">
                                                <td className="p-2 text-slate-700">{tx.madeOn}</td>
                                                <td className="p-2 text-slate-700">{tx.description}</td>
                                                <td className="p-2 text-right text-red-600">
                                                  {formatEuro(Math.abs(tx.amount))}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </React.Fragment>
                        );
                      })}
                      <tr className="border-t-2 border-slate-300 font-bold">
                        <td className="p-3 text-slate-800">Totale</td>
                        <td className="p-3 text-right text-red-600">
                          {formatEuro(spendingTableData.reduce((sum, item) => sum + item.total, 0))}
                        </td>
                        <td className="p-3 text-right text-slate-800">
                          {spendingTableData.reduce((sum, item) => sum + item.count, 0)}
                        </td>
                        <td className="p-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </NeumorphicCard>

            {/* Income by Category/Subcategory */}
            <NeumorphicCard className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Entrate per {incomeView === 'category' ? 'Categoria' : 'Sottocategoria'}</h2>
              
              {/* View Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setIncomeView('category')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    incomeView === 'category'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Per Categoria
                </button>
                <button
                  onClick={() => setIncomeView('subcategory')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    incomeView === 'subcategory'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Per Sottocategoria
                </button>
              </div>

              {/* Date Range Filters */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
                <button
                  onClick={() => setIncomeDateRange('currentMonth')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    incomeDateRange === 'currentMonth'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Mese Corrente
                </button>
                <button
                  onClick={() => setIncomeDateRange('lastMonth')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    incomeDateRange === 'lastMonth'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Mese Scorso
                </button>
                <button
                  onClick={() => setIncomeDateRange('last30')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    incomeDateRange === 'last30'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Ultimi 30gg
                </button>
                <button
                  onClick={() => setIncomeDateRange('last60')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    incomeDateRange === 'last60'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Ultimi 60gg
                </button>
                <button
                  onClick={() => setIncomeDateRange('last90')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    incomeDateRange === 'last90'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Ultimi 90gg
                </button>
              </div>

              {/* Income Table */}
              {incomeTableData.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  Nessuna entrata nel periodo selezionato
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left p-3 font-semibold text-slate-700">
                          {incomeView === 'category' ? 'Categoria' : 'Sottocategoria'}
                        </th>
                        <th className="text-right p-3 font-semibold text-slate-700">Totale</th>
                        <th className="text-right p-3 font-semibold text-slate-700">Transazioni</th>
                        <th className="text-right p-3 font-semibold text-slate-700">Media</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeTableData.map((item, idx) => (
                        <>
                          <tr 
                            key={idx} 
                            className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                            onClick={() => setExpandedIncomeRows(prev => ({...prev, [item.name]: !prev[item.name]}))}
                          >
                            <td className="p-3 text-slate-700 font-medium">
                              <div className="flex items-center gap-2">
                                <ChevronRight className={`w-4 h-4 transition-transform ${expandedIncomeRows[item.name] ? 'rotate-90' : ''}`} />
                                {item.name}
                              </div>
                            </td>
                            <td className="p-3 text-right text-green-600 font-medium">
                              {formatEuro(item.total)}
                            </td>
                            <td className="p-3 text-right text-slate-700">{item.count}</td>
                            <td className="p-3 text-right text-slate-600">
                              {formatEuro(item.total / item.count)}
                            </td>
                          </tr>
                          {expandedIncomeRows[item.name] && (
                            <tr key={`${idx}-details`}>
                              <td colSpan="4" className="p-0 bg-slate-50">
                                <div className="p-4">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-slate-200">
                                        <th className="text-left p-2 text-slate-600">Data</th>
                                        <th className="text-left p-2 text-slate-600">Descrizione</th>
                                        <th className="text-right p-2 text-slate-600">Importo</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {item.transactions.map((tx, txIdx) => (
                                        <tr key={txIdx} className="border-b border-slate-100">
                                          <td className="p-2 text-slate-700">{tx.madeOn}</td>
                                          <td className="p-2 text-slate-700">{tx.description}</td>
                                          <td className="p-2 text-right text-green-600">
                                            {formatEuro(tx.amount)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                      <tr className="border-t-2 border-slate-300 font-bold">
                        <td className="p-3 text-slate-800">Totale</td>
                        <td className="p-3 text-right text-green-600">
                          {formatEuro(incomeTableData.reduce((sum, item) => sum + item.total, 0))}
                        </td>
                        <td className="p-3 text-right text-slate-800">
                          {incomeTableData.reduce((sum, item) => sum + item.count, 0)}
                        </td>
                        <td className="p-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </NeumorphicCard>
          </div>
        )}

        {/* Matching View */}
        {activeView === 'matching' && (
          <div className="space-y-6">
            {/* Uncategorized Transactions */}
            <NeumorphicCard className="p-6">
              <button
                onClick={() => setUncategorizedExpanded(!uncategorizedExpanded)}
                className="w-full flex items-center justify-between"
              >
                <h2 className="text-xl font-bold text-slate-800">
                  Transazioni Senza Categoria ({uncategorizedTransactions.length})
                </h2>
                <ChevronRight className={`w-5 h-5 text-slate-600 transition-transform ${uncategorizedExpanded ? 'rotate-90' : ''}`} />
              </button>

              {uncategorizedExpanded && (
                <div className="mt-4 overflow-x-auto">
                  {uncategorizedTransactions.length === 0 ? (
                    <p className="text-center py-8 text-slate-500">
                      Tutte le transazioni sono categorizzate
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left p-3 font-semibold text-slate-700">Data</th>
                          <th className="text-left p-3 font-semibold text-slate-700">Description</th>
                          <th className="text-right p-3 font-semibold text-slate-700">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uncategorizedTransactions.map((tx) => (
                          <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-3 text-slate-700 whitespace-nowrap">{tx.madeOn}</td>
                            <td className="p-3 text-slate-700">{tx.description}</td>
                            <td className={`p-3 text-right font-medium ${
                              tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatEuro(tx.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </NeumorphicCard>

            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Regole di Matching</h2>
                <NeumorphicButton
                  onClick={() => applyRulesMutation.mutate()}
                  disabled={applyRulesMutation.isPending}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  {applyRulesMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Applica Regole
                </NeumorphicButton>
              </div>

              {/* Add New Rule */}
              <div className="bg-slate-50 p-4 rounded-lg mb-4">
               <h3 className="font-semibold text-slate-700 mb-3">Nuova Regola</h3>
               <div className="grid grid-cols-1 md:grid-cols-7 gap-3 mb-3">
                 <Input
                   placeholder="Pattern da cercare..."
                   value={newRule.pattern}
                   onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                 />
                 <Select value={newRule.category} onValueChange={(v) => setNewRule({ ...newRule, category: v, subcategory: '' })}>
                   <SelectTrigger>
                     <SelectValue placeholder="Categoria..." />
                   </SelectTrigger>
                   <SelectContent>
                     {categories.map((cat) => (
                       <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
                 <Select value={newRule.subcategory} onValueChange={(v) => setNewRule({ ...newRule, subcategory: v })} disabled={!newRule.category}>
                   <SelectTrigger>
                     <SelectValue placeholder="Sottocategoria..." />
                   </SelectTrigger>
                   <SelectContent>
                     {newRule.category && categoryHierarchy[newRule.category] && categoryHierarchy[newRule.category].map((sub) => (
                       <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
                  <Select value={newRule.match_type} onValueChange={(v) => setNewRule({ ...newRule, match_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contiene</SelectItem>
                      <SelectItem value="starts_with">Inizia con</SelectItem>
                      <SelectItem value="ends_with">Finisce con</SelectItem>
                      <SelectItem value="exact">Esatto</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newRule.search_in} onValueChange={(v) => setNewRule({ ...newRule, search_in: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="description">Description</SelectItem>
                      <SelectItem value="additional">Additional</SelectItem>
                      <SelectItem value="both">Entrambi</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Priorità"
                    value={newRule.priority}
                    onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 0 })}
                  />
                  <NeumorphicButton
                    onClick={() => createRuleMutation.mutate(newRule)}
                    disabled={!newRule.pattern || !newRule.category || createRuleMutation.isPending}
                    variant="primary"
                    className="flex items-center gap-2 justify-center"
                  >
                    <Plus className="w-4 h-4" />
                    Aggiungi
                  </NeumorphicButton>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_giroconto"
                    checked={newRule.is_giroconto}
                    onChange={(e) => setNewRule({ ...newRule, is_giroconto: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <label htmlFor="is_giroconto" className="text-sm text-slate-600">
                    È un giroconto (escludi dal trend entrate/uscite)
                  </label>
                </div>
              </div>

              {/* Rules List */}
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div key={rule.id} className="bg-white border border-slate-200 rounded-lg p-4">
                    {editingRule?.id === rule.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                            <Input
                              value={editingRule.pattern}
                              onChange={(e) => setEditingRule({ ...editingRule, pattern: e.target.value })}
                              placeholder="Pattern"
                            />
                            <Select value={editingRule.category} onValueChange={(v) => setEditingRule({ ...editingRule, category: v, subcategory: '' })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={editingRule.subcategory || ''} onValueChange={(v) => setEditingRule({ ...editingRule, subcategory: v })} disabled={!editingRule.category}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {editingRule.category && categoryHierarchy[editingRule.category] && categoryHierarchy[editingRule.category].map((sub) => (
                                  <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          <Select value={editingRule.match_type} onValueChange={(v) => setEditingRule({ ...editingRule, match_type: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="contains">Contiene</SelectItem>
                              <SelectItem value="starts_with">Inizia con</SelectItem>
                              <SelectItem value="ends_with">Finisce con</SelectItem>
                              <SelectItem value="exact">Esatto</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={editingRule.search_in || 'description'} onValueChange={(v) => setEditingRule({ ...editingRule, search_in: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="description">Description</SelectItem>
                              <SelectItem value="additional">Additional</SelectItem>
                              <SelectItem value="both">Entrambi</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={editingRule.priority}
                            onChange={(e) => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 0 })}
                            placeholder="Priorità"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateRuleMutation.mutate({ id: rule.id, data: editingRule })}
                              className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700"
                            >
                              <Check className="w-4 h-4 mx-auto" />
                            </button>
                            <button
                              onClick={() => setEditingRule(null)}
                              className="flex-1 bg-slate-300 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-400"
                            >
                              <X className="w-4 h-4 mx-auto" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`edit_giroconto_${rule.id}`}
                            checked={editingRule.is_giroconto || false}
                            onChange={(e) => setEditingRule({ ...editingRule, is_giroconto: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300"
                          />
                          <label htmlFor={`edit_giroconto_${rule.id}`} className="text-sm text-slate-600">
                            È un giroconto (escludi dal trend entrate/uscite)
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="font-mono text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {rule.pattern}
                            </span>
                            <span className="text-sm text-slate-500">→</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-700">{rule.category}</span>
                              {rule.subcategory && (
                                <>
                                  <span className="text-sm text-slate-400">/</span>
                                  <span className="font-medium text-slate-600">{rule.subcategory}</span>
                                </>
                              )}
                            </div>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                              {rule.match_type === 'contains' ? 'Contiene' :
                               rule.match_type === 'starts_with' ? 'Inizia con' :
                               rule.match_type === 'ends_with' ? 'Finisce con' : 'Esatto'}
                            </span>
                            <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded">
                              {rule.search_in === 'description' ? 'Description' :
                               rule.search_in === 'additional' ? 'Additional' : 
                               rule.search_in === 'both' ? 'Entrambi' : 'Description'}
                            </span>
                            {rule.priority > 0 && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                Priorità: {rule.priority}
                              </span>
                            )}
                            {rule.is_giroconto && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                Giroconto
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            {getMatchedTransactions(rule).length} transazioni matchate
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingRule(rule)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteRuleMutation.mutate(rule.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </NeumorphicCard>
          </div>
        )}

        {/* Raw Data View */}
        {activeView === 'raw' && (
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              Transazioni Bancarie ({transactions.length})
            </h2>

            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                <p className="text-slate-500 mt-2">Caricamento...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500">Nessuna transazione trovata</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Transaction ID</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Status</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Made On</th>
                      <th className="text-right p-3 font-semibold text-slate-700 whitespace-nowrap">Amount</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Currency</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Description</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Additional</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Category</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Duplicated</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Account Name</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Account Nature</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Account Provider</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Account UUID</th>
                      <th className="text-right p-3 font-semibold text-slate-700 whitespace-nowrap">Balance Snapshot</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">End to End ID</th>
                      <th className="text-right p-3 font-semibold text-slate-700 whitespace-nowrap">Exchange Rate</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Information</th>
                      <th className="text-right p-3 font-semibold text-slate-700 whitespace-nowrap">Original Amount</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Original Currency</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Payee</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Payee Info</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Payer</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Payer Info</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Posting Date</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Posting Time</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Time</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 text-slate-700 whitespace-nowrap">{tx.transactionId || 'N/A'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                            tx.status === 'BOOKED' 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {tx.status || 'N/A'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">{tx.madeOn || 'N/A'}</td>
                        <td className={`p-3 text-right font-medium whitespace-nowrap ${
                          tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatEuro(tx.amount)}
                        </td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">{tx.currencyCode || 'N/A'}</td>
                        <td className="p-3 text-slate-700 max-w-xs truncate">{tx.description || 'N/A'}</td>
                        <td className="p-3 text-slate-700 max-w-xs truncate">{tx.additional || 'N/A'}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">{tx.category || 'N/A'}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">{tx.duplicated ? 'Yes' : 'No'}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">{tx.account_name || 'N/A'}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">{tx.account_nature || 'N/A'}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">{tx.account_provider_name || 'N/A'}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap font-mono text-xs">{tx.account_uuid || 'N/A'}</td>
                        <td className="p-3 text-right text-slate-700 whitespace-nowrap">{tx.account_balance_snapshot ? formatEuro(tx.account_balance_snapshot) : 'N/A'}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap font-mono text-xs">{tx.end_to_end_id || 'N/A'}</td>
                        <td className="p-3 text-right text-slate-700 whitespace-nowrap">{tx.exchange_rate || 'N/A'}</td>
                        <td className="p-3 text-slate-700 max-w-xs truncate">{tx.information || 'N/A'}</td>
                        <td className="p-3 text-right text-slate-700 whitespace-nowrap">{tx.original_amount ? formatEuro(tx.original_amount) : 'N/A'}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">{tx.original_currency_code || 'N/A'}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">{tx.payee || 'N/A'}</td>
                        <td className="p-3 text-slate-700 max-w-xs truncate">{tx.payee_information || 'N/A'}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">{tx.payer || 'N/A'}</td>
                        <td className="p-3 text-slate-700 max-w-xs truncate">{tx.payer_information || 'N/A'}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">{tx.posting_date || 'N/A'}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">{tx.posting_time || 'N/A'}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">{tx.time || 'N/A'}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">{tx.type || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </NeumorphicCard>
        )}
      </div>
    </ProtectedPage>
  );
}