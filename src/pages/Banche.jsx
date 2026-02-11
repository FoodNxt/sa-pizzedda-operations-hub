import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NeumorphicCard from '../components/neumorphic/NeumorphicCard';
import NeumorphicButton from '../components/neumorphic/NeumorphicButton';
import ProtectedPage from '../components/ProtectedPage';
import { RefreshCw, Download, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { formatEuro } from '../components/utils/formatCurrency';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Banche() {
  const [activeView, setActiveView] = useState('overview');
  const [editingRule, setEditingRule] = useState(null);
  const [newRule, setNewRule] = useState({ pattern: '', category: '', subcategory: '', match_type: 'contains', priority: 0 });
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all');
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
      setNewRule({ pattern: '', category: '', subcategory: '', match_type: 'contains', priority: 0 });
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

  const matchTransaction = (description, rule) => {
    if (!description) return false;
    const desc = description.toLowerCase();
    const pattern = rule.pattern.toLowerCase();
    
    switch (rule.match_type) {
      case 'contains': return desc.includes(pattern);
      case 'starts_with': return desc.startsWith(pattern);
      case 'ends_with': return desc.endsWith(pattern);
      case 'exact': return desc === pattern;
      default: return false;
    }
  };

  const getMatchedTransactions = (rule) => {
    return transactions.filter(tx => matchTransaction(tx.description, rule));
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

  // Group by date for trend
  const trendData = filteredTransactions.reduce((acc, tx) => {
    const date = tx.madeOn;
    if (!date) return acc;
    
    if (!acc[date]) {
      acc[date] = { date, entrate: 0, uscite: 0 };
    }
    
    if (tx.amount > 0) {
      acc[date].entrate += tx.amount;
    } else {
      acc[date].uscite += Math.abs(tx.amount);
    }
    
    return acc;
  }, {});

  const trendChartData = Object.values(trendData).sort((a, b) => new Date(a.date) - new Date(b.date));

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
              <h2 className="text-xl font-bold text-slate-800 mb-4">Balance</h2>
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
              
              {/* Filters */}
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
          </div>
        )}

        {/* Matching View */}
        {activeView === 'matching' && (
          <div className="space-y-6">
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
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <Input
                    placeholder="Pattern da cercare..."
                    value={newRule.pattern}
                    onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                  />
                  <Input
                    placeholder="Categoria..."
                    value={newRule.category}
                    onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                  />
                  <Input
                    placeholder="Sottocategoria..."
                    value={newRule.subcategory}
                    onChange={(e) => setNewRule({ ...newRule, subcategory: e.target.value })}
                  />
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
              </div>

              {/* Rules List */}
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div key={rule.id} className="bg-white border border-slate-200 rounded-lg p-4">
                    {editingRule?.id === rule.id ? (
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        <Input
                          value={editingRule.pattern}
                          onChange={(e) => setEditingRule({ ...editingRule, pattern: e.target.value })}
                          placeholder="Pattern"
                        />
                        <Input
                          value={editingRule.category}
                          onChange={(e) => setEditingRule({ ...editingRule, category: e.target.value })}
                          placeholder="Categoria"
                        />
                        <Input
                          value={editingRule.subcategory || ''}
                          onChange={(e) => setEditingRule({ ...editingRule, subcategory: e.target.value })}
                          placeholder="Sottocategoria"
                        />
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
                            {rule.priority > 0 && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                Priorità: {rule.priority}
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
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Subcategory</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Duplicated</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Created At</th>
                      <th className="text-left p-3 font-semibold text-slate-700 whitespace-nowrap">Updated At</th>
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
                        <td className="p-3 text-slate-700 whitespace-nowrap">{tx.subcategory || 'N/A'}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">{tx.duplicated ? 'Yes' : 'No'}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">{tx.created_date ? new Date(tx.created_date).toLocaleString('it-IT') : 'N/A'}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">{tx.updated_date ? new Date(tx.updated_date).toLocaleString('it-IT') : 'N/A'}</td>
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