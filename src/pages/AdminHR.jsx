import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { ChevronRight, Settings, Users, MapPin, TrendingUp, Loader2 } from 'lucide-react';
import NeumorphicCard from '../components/neumorphic/NeumorphicCard';

const sectionAdminPages = {
  'HR': [
    { title: 'Assegnazione Locali', page: 'HRAdmin', icon: MapPin, color: 'from-blue-500 to-blue-600' },
    { title: 'Store Manager Admin', page: 'StoreManagerAdmin', icon: Users, color: 'from-purple-500 to-purple-600' },
    { title: 'Compliance', page: 'Compliance', icon: Settings, color: 'from-amber-500 to-amber-600' }
  ]
};

export default function AdminHR() {
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
              if (item.parent_admin_section === 'HR') {
                const pageInfo = {
                  title: item.title,
                  page: item.page,
                  icon: item.icon,
                  color: 'from-blue-500 to-blue-600'
                };
                pages.push(pageInfo);
              }
            });
          });
          setAdminPages([...sectionAdminPages['HR'], ...pages]);
        } else {
          setAdminPages(sectionAdminPages['HR']);
        }
      } catch (error) {
        console.error('Error loading admin pages:', error);
        setAdminPages(sectionAdminPages['HR']);
      } finally {
        setIsLoading(false);
      }
    };

    loadAdminPages();
  }, []);

  const getIcon = (iconName) => {
    const icons = { MapPin, Users, Settings, TrendingUp, ChevronRight };
    return icons[iconName] || Settings;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Settings className="w-10 h-10 text-slate-600" />
          <h1 className="text-3xl font-bold text-slate-800">Admin HR</h1>
        </div>
        <p className="text-slate-600">Accedi agli strumenti amministrativi della sezione HR</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminPages.map((item) => {
            const Icon = getIcon(item.icon);
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
                </div>
              </NeumorphicCard>
            );
          })}
        </div>
      )}
    </div>
  );
}