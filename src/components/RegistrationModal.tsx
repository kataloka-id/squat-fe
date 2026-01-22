import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  User,
  Phone,
  Mail,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Info,
  AlertCircle,
} from 'lucide-react';
import { useOnboardingStore } from '@/src/store/onboardingStore.ts';
import { trackEvent } from '@/src/analytics/clarity.ts';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({ isOpen, onClose }) => {
  const setRegistration = useOnboardingStore((state) => state.setRegistration);

  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '+62',
    email: '',
  });

  const [touched, setTouched] = useState({
    fullName: false,
    phone: false,
    email: false,
  });

  const [errors, setErrors] = useState({
    fullName: '',
    phone: '',
    email: '',
  });

  // Track if we should explicitly show the error message for a field
  const [shouldShowError, setShouldShowError] = useState({
    fullName: false,
    phone: false,
    email: false,
  });

  const [activeField, setActiveField] = useState<string | null>(null);
  const [isHoveringDisabled, setIsHoveringDisabled] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Validation Logic
  const validate = () => {
    const newErrors = { fullName: '', phone: '', email: '' };

    // Name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Silakan masukkan nama lengkap Anda';
    } else if (formData.fullName.trim().length < 3) {
      newErrors.fullName = 'Mohon gunakan nama lengkap (min. 3 karakter)';
    }

    // Phone validation
    const phoneDigits = formData.phone.slice(3);
    if (phoneDigits.length === 0) {
      newErrors.phone = 'Nomor telepon diperlukan untuk verifikasi';
    } else if (phoneDigits.length < 9) {
      newErrors.phone = 'Nomor telepon Indonesia minimal 9 digit';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Alamat email diperlukan';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Mohon masukkan format email yang valid';
    }

    setErrors(newErrors);
  };

  useEffect(() => {
    validate();

    // Logic to decide when to show errors based on progressive thresholds
    setShouldShowError((prev) => ({
      fullName: touched.fullName || (formData.fullName.length > 10 && !!errors.fullName),
      phone: touched.phone || (formData.phone.length > 12 && !!errors.phone),
      email:
        touched.email ||
        (formData.email.length > 5 && formData.email.includes('@') && !!errors.email),
    }));
  }, [formData, touched, errors.fullName, errors.phone, errors.email]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    if (!input.startsWith('+62')) input = '+62';
    let digits = input.slice(3).replace(/\D/g, '');
    if (digits.startsWith('0')) digits = digits.slice(1);
    setFormData({ ...formData, phone: '+62' + digits });
  };

  // Field states for UI feedback (Immediate Success)
  const fieldStates = {
    fullName: formData.fullName.trim().length >= 3 && !errors.fullName,
    phone: formData.phone.length >= 12 && !errors.phone,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && !errors.email,
  };

  const validCount = Object.values(fieldStates).filter(Boolean).length;
  const progressPercent = (validCount / 3) * 100;
  const isFormValid = validCount === 3;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4 sm:p-6">
      {/* Backdrop with deep blur */}
      <div
        className="animate-in fade-in absolute inset-0 bg-slate-900/60 backdrop-blur-2xl transition-opacity duration-700"
        onClick={onClose}
      />

      {/* Modal Container: Optimized for mobile/tablet */}
      <div
        ref={modalRef}
        className="animate-in zoom-in-95 relative flex max-h-[92vh] w-full max-w-[480px] flex-col overflow-hidden rounded-[2.5rem] border border-white/60 bg-white shadow-[0_32px_80px_-16px_rgba(15,23,42,0.18)] duration-500 ease-out sm:max-h-[90vh] sm:rounded-[3rem]"
      >
        {/* Dynamic Micro-Progress Bar - Fixed Containment */}
        <div className="pointer-events-none absolute left-0 top-0 z-20 h-1.5 w-full bg-sky-200">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all duration-700 ease-[cubic-bezier(0.65,0,0.35,1)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Close Button: Fixed background artifacts for premium look */}
        <button
          onClick={onClose}
          className="group absolute right-6 top-6 z-30 cursor-pointer appearance-none rounded-full border-none bg-transparent p-2.5 text-slate-400 transition-all duration-300 hover:bg-sky-50 hover:text-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-500/10 active:bg-sky-100 sm:right-10 sm:top-10"
          style={{ WebkitTapHighlightColor: 'transparent' }}
          aria-label="Tutup"
        >
          <X size={24} strokeWidth={2.5} className="transition-transform group-hover:scale-110" />
        </button>

        {/* Header Section: Interactive Progress Text */}
        <div className="shrink-0 px-6 pb-6 pt-12 text-center sm:px-14 sm:pb-8 sm:pt-16 md:text-left">
          <h2 className="mb-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Daftarkan Dirimu
          </h2>
          <div className="flex items-center justify-center gap-3 md:justify-start">
            <div
              className={`flex h-6 items-center gap-2 rounded-full border px-3 transition-all duration-500 ${
                isFormValid ? 'border-emerald-100 bg-emerald-50' : 'border-sky-100 bg-sky-50'
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-500 ${
                  isFormValid ? 'text-emerald-600' : 'text-sky-600'
                }`}
              >
                {isFormValid ? 'Data Siap Dikirim' : `Langkah 1 dari 2`}
              </span>
              <div className="h-1 w-1 rounded-full bg-slate-300" />
              <span
                className={`text-[10px] font-bold transition-all duration-500 ${
                  validCount > 0 ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                {validCount}/3 Data Lengkap
              </span>
            </div>
            {isFormValid && (
              <span className="animate-in fade-in slide-in-from-left-2 text-emerald-500 duration-500">
                <CheckCircle2 size={16} strokeWidth={3} />
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Content with custom styling */}
        <div className="custom-scrollbar flex-grow overflow-y-auto px-6 pb-10 sm:px-14 sm:pb-14">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            {/* Input Group: Full Name */}
            <div
              className={`space-y-2.5 transition-all duration-300 ${activeField && activeField !== 'fullName' ? 'opacity-40 blur-[0.5px]' : 'opacity-100'}`}
            >
              <label className="ml-1 flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-widest text-slate-500">
                <User
                  size={13}
                  className={activeField === 'fullName' ? 'text-sky-500' : 'text-slate-400'}
                />
                Nama Lengkap
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rizky Aditya"
                  value={formData.fullName}
                  onFocus={() => setActiveField('fullName')}
                  onBlur={() => {
                    setActiveField(null);
                    setTouched({ ...touched, fullName: true });
                  }}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className={`w-full rounded-[1.25rem] border-2 px-6 py-4 text-base font-medium text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-300 sm:text-lg ${
                    fieldStates.fullName
                      ? 'border-emerald-500/20 bg-emerald-500/[0.03] shadow-inner shadow-emerald-500/5'
                      : shouldShowError.fullName && errors.fullName
                        ? 'border-rose-200 bg-rose-50/50'
                        : activeField === 'fullName'
                          ? '-translate-y-[1px] border-sky-500 bg-white shadow-xl shadow-sky-500/10'
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                  }`}
                />
                <div
                  className={`absolute right-5 top-1/2 -translate-y-1/2 transition-all duration-500 ${fieldStates.fullName ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
                >
                  <CheckCircle2 size={22} className="text-emerald-500" />
                </div>
              </div>
              {shouldShowError.fullName && errors.fullName && (
                <p className="animate-in fade-in slide-in-from-top-1 ml-1 flex items-center gap-1.5 text-[11px] font-bold text-rose-500">
                  <AlertCircle size={12} /> {errors.fullName}
                </p>
              )}
            </div>

            {/* Input Group: Phone Number */}
            <div
              className={`space-y-2.5 transition-all duration-300 ${activeField && activeField !== 'phone' ? 'opacity-40 blur-[0.5px]' : 'opacity-100'}`}
            >
              <label className="ml-1 flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-widest text-slate-500">
                <Phone
                  size={13}
                  className={activeField === 'phone' ? 'text-sky-500' : 'text-slate-400'}
                />
                Nomor Telepon
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={formData.phone}
                  onFocus={() => setActiveField('phone')}
                  onBlur={() => {
                    setActiveField(null);
                    setTouched({ ...touched, phone: true });
                  }}
                  onChange={handlePhoneChange}
                  className={`w-full rounded-[1.25rem] border-2 px-6 py-4 text-base font-medium tracking-wider text-slate-900 outline-none transition-all duration-300 sm:text-lg ${
                    fieldStates.phone
                      ? 'border-emerald-500/20 bg-emerald-500/[0.03] shadow-inner shadow-emerald-500/5'
                      : shouldShowError.phone && errors.phone
                        ? 'border-rose-200 bg-rose-50/50'
                        : activeField === 'phone'
                          ? '-translate-y-[1px] border-sky-500 bg-white shadow-xl shadow-sky-500/10'
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                  }`}
                />
                <div
                  className={`absolute right-5 top-1/2 -translate-y-1/2 transition-all duration-500 ${fieldStates.phone ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
                >
                  <CheckCircle2 size={22} className="text-emerald-500" />
                </div>
              </div>
              {shouldShowError.phone && errors.phone ? (
                <p className="animate-in fade-in slide-in-from-top-1 ml-1 flex items-center gap-1.5 text-[11px] font-bold text-rose-500">
                  <AlertCircle size={12} /> {errors.phone}
                </p>
              ) : (
                <p className="ml-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-400 opacity-80">
                  <Info size={10} /> Konversi otomatis ke format +62
                </p>
              )}
            </div>

            {/* Input Group: Email Address */}
            <div
              className={`space-y-2.5 transition-all duration-300 ${activeField && activeField !== 'email' ? 'opacity-40 blur-[0.5px]' : 'opacity-100'}`}
            >
              <label className="ml-1 flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-widest text-slate-500">
                <Mail
                  size={13}
                  className={activeField === 'email' ? 'text-sky-500' : 'text-slate-400'}
                />
                Alamat Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="nama@email.com"
                  value={formData.email}
                  onFocus={() => setActiveField('email')}
                  onBlur={() => {
                    setActiveField(null);
                    setTouched({ ...touched, email: true });
                  }}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full rounded-[1.25rem] border-2 px-6 py-4 text-base font-medium text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-300 sm:text-lg ${
                    fieldStates.email
                      ? 'border-emerald-500/20 bg-emerald-500/[0.03] shadow-inner shadow-emerald-500/5'
                      : shouldShowError.email && errors.email
                        ? 'border-rose-200 bg-rose-50/50'
                        : activeField === 'email'
                          ? '-translate-y-[1px] border-sky-500 bg-white shadow-xl shadow-sky-500/10'
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                  }`}
                />
                <div
                  className={`absolute right-5 top-1/2 -translate-y-1/2 transition-all duration-500 ${fieldStates.email ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
                >
                  <CheckCircle2 size={22} className="text-emerald-500" />
                </div>
              </div>
              {shouldShowError.email && errors.email && (
                <p className="animate-in fade-in slide-in-from-top-1 ml-1 flex items-center gap-1.5 text-[11px] font-bold text-rose-500">
                  <AlertCircle size={12} /> {errors.email}
                </p>
              )}
            </div>

            {/* Premium Action CTA */}
            <div className="pt-6">
              <div
                className="relative"
                onMouseEnter={() => !isFormValid && setIsHoveringDisabled(true)}
                onMouseLeave={() => setIsHoveringDisabled(false)}
              >
                <button
                  disabled={!isFormValid}
                  onClick={() => {
                    if (!isFormValid) return;

                    trackEvent('click_lanjutkan_daftarkan_dirimu');

                    setRegistration({
                      fullName: formData.fullName,
                      phone: formData.phone,
                      email: formData.email,
                    });

                    navigate('/onboarding/complete-data');
                  }}
                  className={`py-4.5 group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-[1.25rem] text-base font-black transition-all duration-500 sm:py-5 sm:text-lg ${
                    isFormValid
                      ? 'bg-sky-500 text-white shadow-2xl shadow-sky-200 hover:-translate-y-1 hover:bg-sky-600 active:translate-y-0'
                      : 'cursor-not-allowed border border-sky-100 bg-sky-500/10 text-[#0697E0]'
                  }`}
                >
                  {/* Subtle shine for active state */}
                  {isFormValid && (
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-in-out group-hover:translate-x-full" />
                  )}
                  Lanjutkan
                  <ArrowRight
                    size={20}
                    className={`transition-transform duration-300 ${isFormValid ? 'group-hover:translate-x-1' : ''}`}
                  />
                </button>

                {/* Helpful Instruction Tooltip */}
                {!isFormValid && isHoveringDisabled && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 pointer-events-none absolute bottom-full left-1/2 z-50 mb-4 w-[280px] -translate-x-1/2 rounded-2xl bg-slate-900 px-4 py-3 text-center text-[11px] font-bold text-white shadow-2xl">
                    Lengkapi data untuk melanjutkan proses pendaftaran.
                    <div className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-slate-900" />
                  </div>
                )}
              </div>

              {/* Trust Indicators */}
              <div className="mt-10 flex shrink-0 flex-col items-center gap-3 text-slate-400">
                <div className="flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">
                    KEAMANAN DATA TERJAGA
                  </p>
                </div>
                <p className="max-w-[240px] text-center text-[10px] font-bold leading-tight text-slate-300">
                  Informasi pendaftaran Anda dilindungi dan tidak dibagikan.
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Scrollbar Customization for Modal Content */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default RegistrationModal;
