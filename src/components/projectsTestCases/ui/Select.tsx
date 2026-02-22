import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  label: string;
  value: string | number;
}

interface SelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: Option[];
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  size?: 'sm' | 'md';
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  disabled = false,
  className = '',
  placeholder = 'Select...',
  size = 'sm'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);
  const paddingY = size === 'md' ? 'py-2.5' : 'py-1.5';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center justify-between gap-2 w-full px-3 ${paddingY} text-sm bg-slate-50 border rounded-lg transition-all
          ${isOpen 
            ? 'border-brand-500 ring-1 ring-brand-500' 
            : 'border-slate-200 hover:border-slate-300'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span className={`truncate ${selectedOption ? 'text-slate-700' : 'text-slate-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[80px] bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`
                  flex items-center justify-between px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors
                  ${option.value === value 
                    ? 'bg-brand-50 text-brand-700 font-medium' 
                    : 'text-slate-700 hover:bg-slate-50'
                  }
                `}
              >
                <span className="truncate">{option.label}</span>
                {option.value === value && <Check size={14} className="text-brand-600 flex-shrink-0 ml-2" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};