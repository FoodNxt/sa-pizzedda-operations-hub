import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { ChevronDown, Check } from 'lucide-react';

export default function MobileSelect({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Seleziona...",
  label,
  className = "",
  disabled = false,
  renderOption,
  getOptionLabel,
  getOptionValue
}) {
  const [open, setOpen] = useState(false);

  // Support both array of strings and array of objects
  const normalizeOption = (option) => {
    if (typeof option === 'string') {
      return { label: option, value: option };
    }
    return {
      label: getOptionLabel ? getOptionLabel(option) : option.label || option.name || option.value,
      value: getOptionValue ? getOptionValue(option) : option.value || option.id
    };
  };

  const normalizedOptions = options.map(normalizeOption);
  const selectedOption = normalizedOptions.find(opt => opt.value === value);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setOpen(false);
  };

  return (
    <>
      {/* Desktop: Standard Select */}
      <div className={`hidden md:block ${className}`}>
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option, idx) => {
            const normalized = normalizeOption(option);
            return (
              <option key={normalized.value || idx} value={normalized.value}>
                {normalized.label}
              </option>
            );
          })}
        </select>
      </div>

      {/* Mobile: Drawer */}
      <div className={`md:hidden ${className}`}>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <button
              disabled={disabled}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-left flex items-center justify-between disabled:opacity-50"
            >
              <span className={selectedOption ? 'text-slate-700 font-medium' : 'text-slate-500'}>
                {selectedOption ? selectedOption.label : placeholder}
              </span>
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[80vh]">
            <DrawerHeader>
              <DrawerTitle>{label || placeholder}</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-8">
              <div className="space-y-2">
                {normalizedOptions.map((option, idx) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value || idx}
                      onClick={() => handleSelect(option.value)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'bg-blue-500 text-white font-medium' 
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{renderOption ? renderOption(options[idx]) : option.label}</span>
                      {isSelected && <Check className="w-5 h-5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}