import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`
      fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-bottom-5 duration-300 z-[100]
      ${type === 'success' ? 'bg-white border-emerald-100 text-slate-800' : 'bg-white border-red-100 text-slate-800'}
    `}>
      {type === 'success' ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      ) : (
        <XCircle className="w-5 h-5 text-red-500" />
      )}
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-600">
        <X size={14} />
      </button>
    </div>
  );
};