import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NeumorphicCard from '../components/neumorphic/NeumorphicCard';
import ProtectedPage from '../components/ProtectedPage';
import { Calendar, AlertTriangle, MapPin, Clock, ChevronRight } from 'lucide-react';

export default function HRAdminDashboard() {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'Struttura Turno',
      description: 'Gestisci modelli turno e struttura settimanale',
      icon: Calendar,
      page: 'StrutturaTurno',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Richieste',
      description: 'Ferie, malattie e scambi turno',
      icon: Clock,
      page: 'Assenze',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Analisi Ritardi',
      description: 'Monitora ritardi e timbrature',
      icon: AlertTriangle,
      page: 'Ritardi',
      color: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Assegnazione Locali',
      description: 'Assegna dipendenti ai locali',
      icon: MapPin,
      page: 'HRAdmin',
      color: 'from-green-500 to-green-600'
    }
  ];

  return (
    <ProtectedPage pageName="HRAdminDashboard">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">HR Admin</h1>
          <p className="text-slate-600">Gestione risorse umane e configurazioni</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <NeumorphicCard
                key={section.page}
                className="p-6 cursor-pointer hover:shadow-xl transition-all group"
                onClick={() => navigate(createPageUrl(section.page))}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                
                <h3 className="text-lg font-bold text-slate-800 mb-2">{section.title}</h3>
                <p className="text-sm text-slate-500">{section.description}</p>
              </NeumorphicCard>
            );
          })}
        </div>

        <NeumorphicCard className="p-6 bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">TODO - Analisi Ritardi</p>
              <p className="text-xs text-blue-700">
                Aggiungere una view dei top dipendenti per minuti reali di ritardi nella pagina Analisi Ritardi
              </p>
            </div>
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}