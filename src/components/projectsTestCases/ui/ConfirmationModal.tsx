import React from 'react';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onClose
}) => {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${isDanger ? 'bg-red-50' : 'bg-brand-50'}`}>
              {isDanger ? (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              ) : (
                <HelpCircle className="h-6 w-6 text-brand-600" />
              )}
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-lg font-bold text-slate-900 leading-6">{title}</h3>
              <div className="mt-2">
                <p className="text-sm text-slate-500 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors -mt-1 -mr-2 p-2 rounded-lg hover:bg-slate-50">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="bg-slate-50/50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-slate-100">
          <Button 
            variant={isDanger ? 'danger' : 'primary'} 
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};