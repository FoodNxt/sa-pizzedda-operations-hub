import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronRight, Settings, Users, MapPin, TrendingUp } from 'lucide-react';
import NeumorphicCard from '../components/neumorphic/NeumorphicCard';

const adminPages = [
  {
    title: 'Assegnazione Locali',
    page: 'HRAdmin',
    description: 'Gestisci assegnazione dipendenti ai locali, GPS, Store Manager',
    icon: MapPin,
    color: 'from-blue-500 to-blue-600'
  },
  {
    title: 'Store Manager Admin',
    page: 'StoreManagerAdmin',
    description: 'Visualizza e gestisci i dati dei Store Manager',
    icon: Users,
    color: 'from-purple-500 to-purple-600'
  },
  {
    title: 'Compliance',
    page: 'Compliance',
    description: 'Monitoraggio compliance e verifiche',
    icon: Settings,
    color: 'from-amber-500 to-amber-600'
  },
  {
    title: 'Target Store Manager',
    page: 'StoreManagerTarget',
    description: 'Gestisci target e metriche',
    icon: TrendingUp,
    color: 'from-green-500 to-green-600'
  }
];

export default function AdminHR() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Settings className="w-10 h-10 text-slate-600" />
          <h1 className="text-3xl font-bold text-slate-800">Admin HR</h1>
        </div>
        <p className="text-slate-600">Accedi agli strumenti amministrativi della sezione HR</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminPages.map((item) => {
          const Icon = item.icon;
          return (
            <NeumorphicCard
              key={item.page}
              className="p-0 overflow-hidden hover:shadow-lg transition-all cursor-pointer"
              onClick={() => navigate(createPageUrl(item.page))}
            >
              <div className={`h-2 bg-gradient-to-r ${item.color}`} />
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <Icon className="w-8 h-8 text-slate-600" />
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="font-bold text-slate-800 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.description}</p>
              </div>
            </NeumorphicCard>
          );
        })}
      </div>
    </div>
  );
}