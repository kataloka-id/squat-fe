import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  labelledBy?: string;
  children: React.ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
  maxWidth?: string;
  contentClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, title, description, labelledBy, children, onClose, closeDisabled = false, maxWidth = 'max-w-md', contentClassName = '' }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const titleId = labelledBy ?? 'app-modal-title';

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !closeDisabled) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [closeDisabled, isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div ref={contentRef} tabIndex={-1} className={`w-full ${maxWidth} overflow-hidden rounded-xl border border-slate-100 bg-white shadow-2xl focus:outline-none ${contentClassName}`}>
        <div className="flex shrink-0 items-start justify-between border-b border-slate-100 p-5">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-slate-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          <button type="button" aria-label="Close dialog" onClick={onClose} disabled={closeDisabled} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
};
