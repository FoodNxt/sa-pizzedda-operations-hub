import React from 'react';

export default function NeumorphicInput({ 
  type = "text",
  placeholder,
  value,
  onChange,
  className = ""
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`
        neumorphic-pressed
        px-4 py-3 w-full
        text-[#6b6b6b] placeholder-[#9b9b9b]
        focus:outline-none
        transition-all duration-200
        ${className}
      `}
    />
  );
}