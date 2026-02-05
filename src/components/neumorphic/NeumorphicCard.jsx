import React from 'react';

export default function NeumorphicCard({ children, className = "", pressed = false, ...props }) {
  return (
    <div className={`
      ${pressed ? 'neumorphic-pressed' : 'neumorphic-card'}
      transition-all duration-300
      ${className}
    `}
    {...props}
    >
      {children}
    </div>
  );
}