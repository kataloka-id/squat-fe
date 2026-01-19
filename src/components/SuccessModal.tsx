import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight, Info } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  nextStepContext?: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  title = 'Pendaftaran Berhasil',
  description = 'Data pendaftaran Anda telah kami terima dengan aman dalam sistem kami.',
  nextStepContext = 'Tim kami akan memverifikasi informasi Anda. Estimasi waktu aktivasi layanan adalah 1-2 hari kerja.',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-6 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={`duration-400 relative w-full max-w-md transform transition-all ease-out ${
          isOpen ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'
        }`}
      >
        {/* Branded Success Badge Overlap */}
        <div className="absolute -top-12 left-1/2 z-10 -translate-x-1/2">
          <div className="relative">
            {/* Subtle glow effect */}
            <div className="absolute inset-0 scale-110 rounded-full bg-sky-500/20 blur-2xl" />
            <div className="rounded-full border border-slate-50 bg-white p-2 shadow-2xl">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-sky-400/20 bg-sky-500 shadow-lg">
                <CheckCircle2 size={40} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>

        {/* Content Card */}
        <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-[0_32px_80px_-16px_rgba(15,23,42,0.15)]">
          <div className="flex flex-col items-center px-8 pb-12 pt-16 text-center">
            {/* Confirmation Text */}
            <div className="mb-8 space-y-4">
              <h2 className="text-2xl font-black leading-tight tracking-tight text-slate-900 sm:text-3xl">
                {title}
              </h2>
              <div className="mx-auto h-1 w-10 rounded-full bg-sky-500/20" />
              <p className="mx-auto max-w-[300px] text-base font-medium leading-relaxed text-slate-500">
                {description}
              </p>
            </div>

            {/* Next Steps Context - Calm & Trust Building */}
            <div className="group mb-10 w-full rounded-2xl border border-slate-100/80 bg-slate-50 p-5 text-left">
              <div className="mb-2 flex items-center gap-2.5">
                <Info size={16} className="text-sky-500" />
                <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-900">
                  Langkah Berikutnya
                </span>
              </div>
              <p className="text-[13px] font-medium leading-relaxed text-slate-500">
                {nextStepContext}
              </p>
            </div>

            {/* Final Action */}
            <div className="w-full">
              <button
                onClick={onClose}
                className="py-4.5 group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0697E0] px-8 text-base font-extrabold text-white shadow-xl shadow-sky-500/20 transition-all duration-200 hover:bg-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-500/10 active:scale-[0.98]"
              >
                Selesai
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            <p className="mt-8 select-none text-[10px] font-bold uppercase tracking-[0.25em] text-slate-300">
              KATALOKA ENTERPRISE PORTAL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
