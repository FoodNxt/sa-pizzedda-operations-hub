import { useState } from 'react';

export default function NeumorphicButton({ 
  children, 
  onClick, 
  className = "",
  disabled = false,
  variant = "default"
}) {
  const [pressed, setPressed] = useState(false);

  const handleClick = (e) => {
    if (!disabled && onClick) {
      setPressed(true);
      onClick(e);
      setTimeout(() => setPressed(false), 150);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        ${pressed ? 'neumorphic-pressed' : 'nav-button'}
        px-6 py-3 font-medium text-[#6b6b6b]
        transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variant === "primary" ? "text-[#8b7355]" : ""}
        ${className}
      `}
    >
      {children}
    </button>
  );
}