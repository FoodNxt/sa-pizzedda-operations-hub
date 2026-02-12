import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { ChevronRight, TrendingUp, BarChart3, Settings, Loader2, Zap, Users } from 'lucide-react';
import NeumorphicCard from '../components/neumorphic/NeumorphicCard';

const sectionAdminPages = {
  'Marketing': [
    { title: 'Activation', page: 'Activation', icon: Zap, description: 'Gestisci activation e promo', gradient: 'from-orange-500 to-red-600' },
    { title: 'Contatti', page: 'Contatti', icon: Users, description: 'Database contatti marketing', gradient: 'from-green-500 to-emerald-600' },
    { title: 'Piano Quarter', page: 'PianoQuarter', icon: BarChart3, description: 'Piano ads trimestrale', gradient: 'from-purple-500 to-pink-600' },
    { title: 'Configurazione', page: 'MarketingSettings', icon: Settings, description: 'Impostazioni marketing', gradient: 'from-blue-500 to-indigo-600' }
  ]
};

export default function AdminMarketing() {
  const navigate = useNavigate();
  const [adminPages, setAdminPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAdminPages = async () => {
      try {
        const configs = await base44.entities.MenuStructureConfig.list();
        const activeConfig = configs.find(c => c.is_active);
        
        if (activeConfig?.menu_structure) {
          const pages = [];
          activeConfig.menu_structure.forEach(section => {
            section.items?.forEach(item => {
              if (item.parent_admin_section === 'Marketing') {
                const pageInfo = {
                  title: item.title,
                  page: item.page,
                  icon: item.icon,
                  description: 'Configurazione ' + item.title,
                  gradient: 'from-blue-500 to-indigo-600'
                };
                pages.push(pageInfo);
              }
            });
          });
          setAdminPages([...sectionAdminPages['Marketing'], ...pages]);
        } else {
          setAdminPages(sectionAdminPages['Marketing']);
        }
      } catch (error) {
        console.error('Error loading admin pages:', error);
        setAdminPages(sectionAdminPages['Marketing']);
      } finally {
        setIsLoading(false);
      }
    };

    loadAdminPages();
  }, []);

  const getIcon = (iconName) => {
    const icons = { BarChart3, Settings, TrendingUp, Zap, Users };
    return icons[iconName] || Settings;
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#000000' }}>Admin Marketing</h1>
            <p className="text-sm text-slate-600">Gestione e configurazione Marketing</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {adminPages.map((item) => {
            const Icon = getIcon(item.icon);
            return (
              <NeumorphicCard
                key={item.page}
                className="p-6 cursor-pointer hover:shadow-xl transition-all group"
                onClick={() => navigate(createPageUrl(item.page))}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-1">{item.title}</h3>
                    <p className="text-sm text-slate-600">{item.description}</p>
                  </div>
                </div>
              </NeumorphicCard>
            );
          })}
        </div>
      )}
    </div>
  );
}