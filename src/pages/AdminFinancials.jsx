import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ProtectedPage from '../components/ProtectedPage';
import NeumorphicCard from '../components/neumorphic/NeumorphicCard';
import { Settings, TrendingUp, DollarSign, Target, FileText, BarChart3, GitCompare } from 'lucide-react';

const sectionAdminPages = [
  { title: 'Target', page: 'Target', icon: Target, description: 'Configura target di revenue' },
  { title: 'Produttività', page: 'Produttivita', icon: BarChart3, description: 'Analisi produttività dipendenti' },
  { title: 'Costi', page: 'Costi', icon: DollarSign, description: 'Gestione costi operativi' },
  { title: 'Food Cost', page: 'FoodCost', icon: TrendingUp, description: 'Analisi food cost' },
  { title: 'Sconti', page: 'Sconti', icon: TrendingUp, description: 'Gestione sconti' },
  { title: 'Banche', page: 'Banche', icon: DollarSign, description: 'Transazioni bancarie' },
  { title: 'Confronto Canali', page: 'ChannelComparison', icon: GitCompare, description: 'Confronta performance tra canali e store' }
];

export default function AdminFinancials() {
  const navigate = useNavigate();

  return (
    <ProtectedPage pageName="AdminFinancials">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Financials</h1>
            <p className="text-slate-500">Configura e gestisci le impostazioni finanziarie</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectionAdminPages.map((page) => {
            const Icon = page.icon;
            return (
              <NeumorphicCard
                key={page.page}
                className="p-6 cursor-pointer hover:shadow-xl transition-all"
                onClick={() => navigate(createPageUrl(page.page))}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 mb-1">{page.title}</h3>
                    <p className="text-sm text-slate-500">{page.description}</p>
                  </div>
                </div>
              </NeumorphicCard>
            );
          })}
        </div>
      </div>
    </ProtectedPage>
  );
}