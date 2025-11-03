import React from 'react';
import NeumorphicCard from '../neumorphic/NeumorphicCard';

export default function StatsCard({ title, value, icon: Icon, trend, trendValue }) {
  return (
    <NeumorphicCard className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-[#9b9b9b] mb-2">{title}</p>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-2">{value}</h3>
          {trend && (
            <div className="flex items-center gap-1">
              <span className={`text-sm font-medium ${
                trend === 'up' ? 'text-green-600' : 
                trend === 'down' ? 'text-red-600' : 
                'text-[#9b9b9b]'
              }`}>
                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className="neumorphic-flat p-4">
          <Icon className="w-6 h-6 text-[#8b7355]" />
        </div>
      </div>
    </NeumorphicCard>
  );
}