
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
                                                       title = "Pendaftaran Berhasil",
                                                       description = "Data pendaftaran Anda telah kami terima dengan aman dalam sistem kami.",
                                                       nextStepContext = "Tim kami akan memverifikasi informasi Anda. Estimasi waktu aktivasi layanan adalah 1-2 hari kerja."
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
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className={`relative w-full max-w-md transition-all duration-400 ease-out transform ${
                isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'
            }`}>

                {/* Branded Success Badge Overlap */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-10">
                    <div className="relative">
                        {/* Subtle glow effect */}
                        <div className="absolute inset-0 bg-sky-500/20 blur-2xl rounded-full scale-110" />
                        <div className="bg-white p-2 rounded-full shadow-2xl border border-slate-50">
                            <div className="bg-sky-500 w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-2 border-sky-400/20">
                                <CheckCircle2 size={40} className="text-white" strokeWidth={2.5} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Card */}
                <div className="bg-white rounded-[2.5rem] shadow-[0_32px_80px_-16px_rgba(15,23,42,0.15)] overflow-hidden border border-slate-100">
                    <div className="pt-16 pb-12 px-8 flex flex-col items-center text-center">

                        {/* Confirmation Text */}
                        <div className="space-y-4 mb-8">
                            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                                {title}
                            </h2>
                            <div className="h-1 w-10 bg-sky-500/20 mx-auto rounded-full" />
                            <p className="text-slate-500 text-base font-medium leading-relaxed max-w-[300px] mx-auto">
                                {description}
                            </p>
                        </div>

                        {/* Next Steps Context - Calm & Trust Building */}
                        <div className="w-full bg-slate-50 rounded-2xl p-5 mb-10 text-left border border-slate-100/80 group">
                            <div className="flex items-center gap-2.5 mb-2">
                                <Info size={16} className="text-sky-500" />
                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.15em]">Langkah Berikutnya</span>
                            </div>
                            <p className="text-[13px] text-slate-500 leading-relaxed font-medium">
                                {nextStepContext}
                            </p>
                        </div>

                        {/* Final Action */}
                        <div className="w-full">
                            <button
                                onClick={onClose}
                                className="w-full bg-sky-500 hover:bg-sky-600 active:scale-[0.98] transition-all duration-200 text-white font-extrabold py-4.5 px-8 rounded-2xl text-base shadow-xl shadow-sky-500/20 focus:outline-none focus:ring-4 focus:ring-sky-500/10 flex items-center justify-center gap-2 group"
                            >
                                Selesai
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        <p className="mt-8 text-[10px] font-bold text-slate-300 uppercase tracking-[0.25em] select-none">
                            KATALOKA ENTERPRISE PORTAL
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuccessModal;
