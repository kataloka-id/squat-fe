import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

interface Option { label: string; value: string | number; }
interface SelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: Option[];
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  size?: 'sm' | 'md';
}
type MenuPosition = { left: number; top: number; width: number; maxHeight: number };

export const Select: React.FC<SelectProps> = ({ value, onChange, options, disabled = false, className = '', placeholder = 'Select...', size = 'sm' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selectedOption = options.find((option) => option.value === value);
  const paddingY = size === 'md' ? 'py-2.5' : 'py-1.5';

  const positionMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const viewportPadding = 8;
    const preferredHeight = Math.min(240, Math.max(48, options.length * 36 + 8));
    const below = window.innerHeight - rect.bottom - viewportPadding;
    const above = rect.top - viewportPadding;
    const openAbove = below < preferredHeight && above > below;
    const maxHeight = Math.max(48, Math.min(preferredHeight, openAbove ? above : below));
    setMenuPosition({ left: rect.left, top: openAbove ? Math.max(viewportPadding, rect.top - maxHeight - 4) : rect.bottom + 4, width: rect.width, maxHeight });
  };

  useEffect(() => {
    if (!isOpen) return;
    positionMenu();
    const update = () => positionMenu();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [isOpen, options.length]);

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, []);

  const selectOption = (option: Option) => { onChange(option.value); setIsOpen(false); triggerRef.current?.focus(); };
  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(true);
    }
    if (event.key === 'Escape') setIsOpen(false);
  };

  const menu = isOpen && menuPosition && typeof document !== 'undefined' ? createPortal(
    <div ref={menuRef} id={listboxId} role="listbox" aria-label={placeholder} className="fixed z-[100] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg" style={{ left: menuPosition.left, top: menuPosition.top, width: menuPosition.width }}>
      <div className="overflow-y-auto p-1 custom-scrollbar" style={{ maxHeight: menuPosition.maxHeight }}>
        {options.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => selectOption(option)} className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${option.value === value ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-700 hover:bg-slate-50'}`}>
          <span className="whitespace-nowrap">{option.label}</span>
          {option.value === value && <Check size={14} className="ml-2 shrink-0 text-brand-600" />}
        </button>)}
      </div>
    </div>, document.body) : null;

  return <div className={`relative ${className}`} ref={containerRef}>
    <button ref={triggerRef} type="button" onClick={() => !disabled && setIsOpen((open) => !open)} onKeyDown={onTriggerKeyDown} disabled={disabled} aria-haspopup="listbox" aria-expanded={isOpen} aria-controls={isOpen ? listboxId : undefined} className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 ${paddingY} text-sm transition-all ${isOpen ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300'} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <span className={`truncate ${selectedOption ? 'text-slate-700' : 'text-slate-400'}`}>{selectedOption ? selectedOption.label : placeholder}</span>
      <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {menu}
  </div>;
};
