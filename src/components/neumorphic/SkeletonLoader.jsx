import React from 'react';

// Skeleton generico
export function Skeleton({ className = "", variant = "default" }) {
  const baseClasses = "animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] rounded";
  
  const variantClasses = {
    default: "h-4",
    text: "h-4",
    title: "h-6",
    card: "h-32",
    stat: "h-24",
    table: "h-12",
    circle: "rounded-full w-12 h-12"
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant] || variantClasses.default} ${className}`} />
  );
}

// Card skeleton
export function SkeletonCard() {
  return (
    <div className="neumorphic-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="title" className="w-32" />
          <Skeleton variant="text" className="w-24" />
        </div>
      </div>
      <Skeleton variant="text" className="w-full" />
      <Skeleton variant="text" className="w-3/4" />
    </div>
  );
}

// Stat card skeleton
export function SkeletonStatCard() {
  return (
    <div className="neumorphic-card p-6">
      <div className="text-center space-y-3">
        <Skeleton variant="circle" className="w-14 h-14 mx-auto" />
        <Skeleton variant="title" className="w-20 h-8 mx-auto" />
        <Skeleton variant="text" className="w-24 mx-auto" />
      </div>
    </div>
  );
}

// Table skeleton
export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} variant="text" className="h-6" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={`row-${rowIdx}`} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={`cell-${rowIdx}-${colIdx}`} variant="text" />
          ))}
        </div>
      ))}
    </div>
  );
}

// List skeleton
export function SkeletonList({ items = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, idx) => (
        <div key={idx} className="neumorphic-pressed p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton variant="text" className="w-48" />
            <Skeleton variant="text" className="w-20" />
          </div>
          <Skeleton variant="text" className="w-full" />
          <div className="flex gap-2">
            <Skeleton variant="text" className="w-16 h-6" />
            <Skeleton variant="text" className="w-16 h-6" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default Skeleton;