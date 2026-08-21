import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

interface Option { label: string; value: string | number; disabled?: boolean; }
interface SelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: Option[];
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  size?: 'sm' | 'md';
  onOpen?: () => void | Promise<void>;
  'aria-label'?: string;
}
type MenuPosition = { left: number; top: number; width: number; maxHeight: number };

export const Select: React.FC<SelectProps> = ({ value, onChange, options, disabled = false, required = false, className = '', placeholder = 'Select...', size = 'sm', onOpen, 'aria-label': ariaLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [isMenuPositioned, setIsMenuPositioned] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpening, setIsOpening] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selectedOption = options.find((option) => option.value === value);
  const firstEnabledIndex = () => options.findIndex((option) => !option.disabled);
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
    const menuWidth = Math.max(rect.width, menuRef.current?.offsetWidth ?? 0);
    const width = Math.min(menuWidth, Math.max(rect.width, window.innerWidth - viewportPadding * 2));
    const left = Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - width - viewportPadding));
    setMenuPosition({ left, top: openAbove ? Math.max(viewportPadding, rect.top - maxHeight - 4) : rect.bottom + 4, width, maxHeight });
    setIsMenuPositioned(true);
  };

  useEffect(() => {
    if (!isOpen || isOpening) return;
    positionMenu();
    const update = () => positionMenu();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [isOpen, isOpening, options.length]);

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
        setIsMenuPositioned(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, []);

  const selectOption = (option: Option) => { if (option.disabled) return; onChange(option.value); setIsOpen(false); setIsMenuPositioned(false); triggerRef.current?.focus(); };
  const toggleMenu = () => {
    if (isOpen) {
      setIsOpen(false);
      setIsMenuPositioned(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const latestRect = triggerRef.current?.getBoundingClientRect();
    if (!latestRect) return;
    const viewportPadding = 8;
    setMenuPosition({
      left: Math.max(viewportPadding, Math.min(latestRect.left, window.innerWidth - latestRect.width - viewportPadding)),
      top: latestRect.bottom + 4,
      width: latestRect.width,
      maxHeight: 240,
    });
    setIsMenuPositioned(false);
    setActiveIndex(selectedOption && !selectedOption.disabled ? options.indexOf(selectedOption) : firstEnabledIndex());
    setIsOpen(true);
    if (onOpen) {
      setIsOpening(true);
      void Promise.resolve(onOpen())
        .then(() => setIsOpening(false))
        .catch(() => {
          setIsOpening(false);
          setIsOpen(false);
          setIsMenuPositioned(false);
        });
    }
  };
  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!isOpen) toggleMenu();
      else setActiveIndex((current) => {
        const direction = event.key === 'ArrowUp' ? -1 : 1;
        let next = current < 0 ? firstEnabledIndex() : current + direction;
        while (next >= 0 && next < options.length && options[next]?.disabled) next += direction;
        return next >= 0 && next < options.length ? next : current;
      });
    }
    if (event.key === 'Enter' && isOpen && activeIndex >= 0) { event.preventDefault(); selectOption(options[activeIndex]); }
    if (event.key === 'Escape') { setIsOpen(false); setIsMenuPositioned(false); }
  };

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    const option = document.getElementById(`${listboxId}-option-${activeIndex}`);
    option?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, isOpen, listboxId]);

  const menu = isOpen && menuPosition && typeof document !== 'undefined' ? createPortal(
    <div ref={menuRef} id={listboxId} role="listbox" aria-label={ariaLabel || placeholder} className="fixed z-[100] w-max max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg" style={{ left: menuPosition.left, top: menuPosition.top, minWidth: menuPosition.width, visibility: isMenuPositioned ? 'visible' : 'hidden' }}>
      <div className="overflow-y-auto p-1 custom-scrollbar" style={{ maxHeight: menuPosition.maxHeight }}>
        {options.map((option, index) => <button key={option.value} id={`${listboxId}-option-${index}`} data-value={String(option.value)} type="button" role="option" aria-selected={option.value === value} aria-disabled={option.disabled || undefined} onMouseEnter={() => !option.disabled && setActiveIndex(index)} onClick={() => selectOption(option)} className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${option.disabled ? 'cursor-not-allowed text-slate-400' : index === activeIndex || option.value === value ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-700 hover:bg-slate-50'}`}>
          <span className="break-words">{option.label}</span>
          {option.value === value && <Check size={14} className="ml-2 shrink-0 text-brand-600" />}
        </button>)}
      </div>
    </div>, document.body) : null;

  return <div className={`relative ${className}`} ref={containerRef}>
    <button ref={triggerRef} type="button" onClick={() => !disabled && !isOpening && toggleMenu()} onKeyDown={onTriggerKeyDown} disabled={disabled || isOpening} aria-required={required || undefined} aria-label={ariaLabel || placeholder} aria-haspopup="listbox" aria-expanded={isOpen} aria-controls={isOpen ? listboxId : undefined} value={String(value)} className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 ${paddingY} text-sm transition-all ${isOpen ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300'} ${disabled || isOpening ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <span className={`truncate ${selectedOption ? 'text-slate-700' : 'text-slate-400'}`}>{selectedOption ? selectedOption.label : placeholder}</span>
      <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {menu}
  </div>;
};
