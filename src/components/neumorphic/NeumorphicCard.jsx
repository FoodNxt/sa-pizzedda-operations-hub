import React from 'react';

export default function NeumorphicCard({ children, className = "", pressed = false }) {
  return (
    <div className={`
      ${pressed ? 'neumorphic-pressed' : 'neumorphic-card'}
      ${className}
    `}>
      {children}
    </div>
  );
}