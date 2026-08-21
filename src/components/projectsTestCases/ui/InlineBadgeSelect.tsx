/* eslint-disable no-unused-vars -- TypeScript-only callback and option types. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle } from 'lucide-react';
import { Badge } from './Badge.tsx';

export type InlineBadgeSelectType = 'priority' | 'status' | 'automation' | 'automationReadiness' | 'section';

interface InlineBadgeSelectProps {
  type: InlineBadgeSelectType;
  value: string;
  options: string[];
  label: string;
  onChange: (value: string) => void | Promise<void>;
  disabled?: boolean;
  optionLabel?: (value: string) => string;
}

/** Shared anchored, portal-backed enum editor used by table badge fields. */
export const InlineBadgeSelect = ({ type, value, options, onChange, label, disabled = false, optionLabel = (option) => option }: InlineBadgeSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current || !triggerRef.current) return;
    const updatePosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      const menu = menuRef.current;
      if (!triggerRect || !menu) return;
      const padding = 8;
      const left = Math.max(padding, Math.min(triggerRect.left, window.innerWidth - menu.offsetWidth - padding));
      const below = triggerRect.bottom + 4;
      const above = triggerRect.top - menu.offsetHeight - 4;
      const maxTop = Math.max(padding, window.innerHeight - menu.offsetHeight - padding);
      const top = below + menu.offsetHeight <= window.innerHeight - padding
        ? below
        : above >= padding ? above : Math.min(Math.max(padding, below), maxTop);
      setMenuPosition({ top, left });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  const toggleMenu = () => {
    if (isOpen) return setIsOpen(false);
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPosition({ top: rect.bottom + 4, left: rect.left });
    setIsOpen(true);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Change ${label}`}
        aria-expanded={isOpen}
        disabled={disabled || isSaving}
        onClick={toggleMenu}
        className={`inline-flex min-w-0 max-w-full items-center rounded-md ring-offset-1 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-wait ${type === 'section' ? 'w-full min-w-32 text-left' : ''}`}
      >
        {isSaving ? <LoaderCircle aria-label={`Saving ${label}`} className="h-4 w-4 animate-spin text-slate-500" /> : <Badge type={type} value={value} displayValue={optionLabel(value)} className="cursor-pointer" />}
      </button>
      {isOpen && createPortal(
        <div ref={menuRef} role="listbox" aria-label={`${label} options`} style={{ top: menuPosition?.top, left: menuPosition?.left, minWidth: triggerRef.current?.getBoundingClientRect().width, visibility: menuPosition ? 'visible' : 'hidden' }} className="fixed z-50 max-h-[calc(100vh-1rem)] w-max max-w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="py-1">
            {options.map((option) => (
              <button key={option} type="button" role="option" aria-selected={value === option} disabled={isSaving} onClick={async () => { setIsSaving(true); setIsOpen(false); try { await onChange(option); } catch { /* The owner reports mutation errors through existing feedback. */ } finally { setIsSaving(false); } }} className="flex w-full shrink-0 cursor-pointer items-center whitespace-nowrap px-3 py-1.5 text-left hover:bg-slate-50 disabled:cursor-wait">
                <Badge type={type} value={option} displayValue={optionLabel(option)} className="pointer-events-none" />
              </button>
            ))}
          </div>
        </div>, document.body,
      )}
    </div>
  );
};
