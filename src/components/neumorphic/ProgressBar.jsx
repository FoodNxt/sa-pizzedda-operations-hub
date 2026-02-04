import React from 'react';

export default function ProgressBar({ 
  progress = 0, 
  label = "", 
  showPercentage = true,
  className = "",
  variant = "default" // default, success, warning, danger
}) {
  const getColor = () => {
    switch (variant) {
      case 'success': return 'from-green-500 to-green-600';
      case 'warning': return 'from-yellow-500 to-yellow-600';
      case 'danger': return 'from-red-500 to-red-600';
      default: return 'from-blue-500 to-blue-600';
    }
  };

  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={`space-y-2 ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="font-medium text-slate-700">{label}</span>}
          {showPercentage && (
            <span className="font-bold text-slate-600">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      <div className="w-full h-3 neumorphic-pressed rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${getColor()} transition-all duration-300 ease-out rounded-full shadow-inner`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}