import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

interface Option {
  label: string;
  value: string;
}

interface MultiSelectProps {
  label: string;
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  icon,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search when closed, focus when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Small timeout to allow transition/render
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleToggleOption = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onChange(newValues);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    return options.filter(option => 
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  // Group options: Selected first, then unselected
  const { selectedItems, unselectedItems } = useMemo(() => {
    const selected: Option[] = [];
    const unselected: Option[] = [];
    
    filteredOptions.forEach(option => {
      if (selectedValues.includes(option.value)) {
        selected.push(option);
      } else {
        unselected.push(option);
      }
    });
    
    return { selectedItems: selected, unselectedItems: unselected };
  }, [filteredOptions, selectedValues]);

  // Show search bar if we have enough options to warrant it
  const showSearch = options.length > 5;

  const renderOption = (option: Option) => {
    const isSelected = selectedValues.includes(option.value);
    return (
        <div
            key={option.value}
            onClick={() => handleToggleOption(option.value)}
            className={`
                flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors select-none
                ${isSelected ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-50 text-slate-700'}
            `}
        >
            <div className={`
                w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0
                ${isSelected ? 'bg-brand-500 border-brand-500' : 'border-slate-300 bg-white'}
            `}>
                {isSelected && <Check size={10} className="text-white" />}
            </div>
            <span className="truncate">{option.label}</span>
        </div>
    );
  };

  return (
    <div className={`relative ${disabled ? 'opacity-50 pointer-events-none' : ''}`} ref={containerRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all select-none
          ${selectedValues.length > 0
            ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }
          ${isOpen ? 'ring-2 ring-brand-500/20 border-brand-500' : ''}
          ${disabled ? 'cursor-not-allowed bg-slate-50 text-slate-400' : ''}
        `}
      >
        {icon && <span className={selectedValues.length > 0 ? 'text-brand-600' : 'text-slate-400'}>{icon}</span>}
        <span>{label}</span>
        {selectedValues.length > 0 && (
          <span className="flex items-center justify-center bg-brand-200 text-brand-800 text-[10px] font-bold h-5 min-w-[20px] px-1 rounded-full">
            {selectedValues.length}
          </span>
        )}
        <div className="flex items-center ml-1">
          {selectedValues.length > 0 && !disabled && (
             <div 
                 role="button"
                 onClick={handleClear}
                 className="mr-1 p-0.5 hover:bg-brand-200 rounded-full text-brand-600 transition-colors"
             >
                 <X size={12} />
             </div>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''} ${selectedValues.length > 0 ? 'text-brand-500' : 'text-slate-400'}`} />
        </div>
      </button>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {showSearch && (
              <div className="p-2 border-b border-slate-100 bg-white sticky top-0 z-10" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400 text-slate-700"
                  />
                </div>
              </div>
            )}
            
            <div className="max-h-64 overflow-y-auto p-1 custom-scrollbar">
                {filteredOptions.length > 0 ? (
                    <>
                        {selectedItems.map(renderOption)}
                        
                        {selectedItems.length > 0 && unselectedItems.length > 0 && (
                            <div className="h-px bg-slate-100 my-1 mx-2" />
                        )}
                        
                        {unselectedItems.map(renderOption)}
                    </>
                ) : (
                    <div className="px-3 py-4 text-sm text-slate-400 text-center flex flex-col items-center gap-2">
                        <Search className="w-6 h-6 text-slate-200" />
                        <span>No results found</span>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};