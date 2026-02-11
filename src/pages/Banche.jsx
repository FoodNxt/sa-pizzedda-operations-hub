import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NeumorphicCard from '../components/neumorphic/NeumorphicCard';
import NeumorphicButton from '../components/neumorphic/NeumorphicButton';
import ProtectedPage from '../components/ProtectedPage';
import { RefreshCw, Download } from 'lucide-react';
import { formatEuro } from '../components/utils/formatCurrency';

export default function Banche() {
  const [activeView, setActiveView] = useState('overview');
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['bank-transactions'],
    queryFn: () => base44.entities.BankTransaction.list('-madeOn', 1000)
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
          <NeumorphicCard className="p-6">
            <div className="text-center py-12">
              <p className="text-slate-500">Overview in arrivo...</p>
            </div>
          </NeumorphicCard>
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