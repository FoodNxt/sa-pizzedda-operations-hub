import { useState } from 'react';

export default function NeumorphicButton({
  children,
  onClick,
  className = "",
  disabled = false,
  variant = "default",
  type = "button"
}) {
  const [pressed, setPressed] = useState(false);

  const handleClick = (e) => {
    if (!disabled && onClick) {
      setPressed(true);
      onClick(e);
      setTimeout(() => setPressed(false), 150);
    }
  };

  const getVariantStyles = () => {
    if (variant === "primary") {
      return "bg-gradient-to-r from-blue-500 to-blue-600 text-slate-900 shadow-lg hover:shadow-xl";
    }
    return "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700";
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled} className="bg-gray-400 text-slate-50 px-6 py-3 font-medium opacity-100 rounded-xl nav-button from-blue-500 to-blue-600 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center gap-2">










      {children}
    </button>);

}