
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    ArrowLeft, User, Phone, Mail, MapPin,
    Store, Building2, CheckCircle2, AlertCircle,
    ChevronDown, Rocket, ShieldCheck, Info, Sparkles,
    Calendar, Lock, Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- Types & Interfaces ---

interface FormData {
    fullName: string;
    personalPhone: string;
    email: string;
    dob: string; // YYYY-MM-DD
    personalAddress: string;
    personalPostalCode: string;
    businessName: string;
    companyName: string;
    companyAddress: string;
    companyPostalCode: string;
    companyPhone: string;
    industry: string;
    scale: string;
    businessType: string;
}

const CompleteData: React.FC = () => {
    const navigate = useNavigate();

    // --- Form State (Initialized with data from "previous step") ---
    const [data, setData] = useState<FormData>({
        fullName: 'Budi Magelang',
        personalPhone: '+62812345678',
        email: 'budimagelang@gmail.com',
        dob: '',
        personalAddress: '',
        personalPostalCode: '',
        businessName: '',
        companyName: '',
        companyAddress: '',
        companyPostalCode: '',
        companyPhone: '+62', // Start with prefix
        industry: '',
        scale: '',
        businessType: '',
    });

    const [toggles, setToggles] = useState({
        sameAddress: false,
        samePhone: false,
    });

    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Sync Logic ---
    useEffect(() => {
        if (toggles.sameAddress) {
            setData(prev => ({
                ...prev,
                companyAddress: prev.personalAddress,
                companyPostalCode: prev.personalPostalCode
            }));
        }
    }, [toggles.sameAddress, data.personalAddress, data.personalPostalCode]);

    useEffect(() => {
        if (toggles.samePhone) {
            setData(prev => ({
                ...prev,
                companyPhone: prev.personalPhone
            }));
        }
    }, [toggles.samePhone, data.personalPhone]);

    // --- Validation Logic ---
    const errors = useMemo(() => {
        const err: Record<string, string> = {};

        // Personal Section Validation
        if (!data.dob) err.dob = "Wajib diisi";
        if (data.personalAddress.trim().length < 5) err.personalAddress = "Alamat minimal 5 karakter";
        if (!/^\d{5}$/.test(data.personalPostalCode)) err.personalPostalCode = "Harus 5 digit angka";

        // Business Section Validation
        if (!data.businessName.trim()) err.businessName = "Wajib diisi";
        if (!data.companyName.trim()) err.companyName = "Wajib diisi";
        if (data.companyAddress.trim().length < 5) err.companyAddress = "Alamat minimal 5 karakter";
        if (!/^\d{5}$/.test(data.companyPostalCode)) err.companyPostalCode = "Harus 5 digit angka";

        const phoneContent = data.companyPhone.replace('+62', '').replace(/\D/g, '');
        if (phoneContent.length < 9) err.companyPhone = "Format tidak valid";

        if (!data.industry) err.industry = "Wajib dipilih";
        if (!data.scale) err.scale = "Wajib dipilih";
        if (!data.businessType) err.businessType = "Wajib dipilih";

        return err;
    }, [data]);

    // --- Progress Tracking ---
    const personalFields = ['fullName','personalPhone','email','dob', 'personalAddress', 'personalPostalCode'];
    const businessFields = ['businessName', 'companyName', 'companyAddress', 'companyPostalCode', 'companyPhone', 'industry', 'scale', 'businessType'];

    const personalCompletedCount = personalFields.filter(f => !errors[f] && data[f as keyof FormData]).length;
    const businessCompletedCount = businessFields.filter(f => !errors[f] && data[f as keyof FormData]).length;

    const totalEditableFields = personalFields.length + businessFields.length;
    const totalCompleted = personalCompletedCount + businessCompletedCount;
    const progressPercent = (totalCompleted / totalEditableFields) * 100;

    const isValid = totalCompleted === totalEditableFields;

    // --- Handlers ---
    const handlePhoneChange = (val: string) => {
        // Force prefix
        let input = val;
        if (!input.startsWith('+62')) {
            input = '+62' + input.replace(/\D/g, '');
        }

        // Process characters after prefix
        let afterPrefix = input.slice(3);

        // Rule: User CANNOT input leading 0
        if (afterPrefix.startsWith('0')) {
            afterPrefix = afterPrefix.slice(1);
        }

        // Rule: Only numeric allowed
        afterPrefix = afterPrefix.replace(/\D/g, '');

        setData(prev => ({ ...prev, companyPhone: '+62' + afterPrefix }));
    };

    const markTouched = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 transition-all duration-500 selection:bg-sky-100">

            {/* Global Progress Bar (Top) */}
            <div className="fixed top-0 left-0 w-full h-1 z-[60] bg-slate-100">
                <div
                    className="h-full bg-sky-500 transition-all duration-700 ease-out shadow-[0_0_8px_rgba(14,165,233,0.5)]"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            {/* Header */}
            <header className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-xl z-50 border-b border-slate-100 shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold text-sm">Kembali</span>
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-black tracking-tight">Kata<span className="text-sky-500">loka</span></span>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 pb-24 pt-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">

                    {/* Section 1: Personal Data */}
                    <section className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                                <div className="space-y-1 min-w-[200px] flex-1">
                                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                                        Lengkapi Datamu
                                        {personalCompletedCount === personalFields.length && (
                                            <div className="p-1 bg-emerald-100 rounded-full animate-in zoom-in-50 shadow-sm">
                                                <CheckCircle2 size={20} className="text-emerald-600" />
                                            </div>
                                        )}
                                    </h1>
                                    <p className="text-slate-500 font-medium text-sm sm:text-base">Sedikit lagi! Lengkapi data berikut untuk melanjutkan 🚀</p>
                                </div>
                                <div className="shrink-0 pt-1">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors border shadow-sm inline-block ${
                      personalCompletedCount === personalFields.length ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-sky-50 text-sky-600 border-sky-100'
                  }`}>
                    {personalCompletedCount} / {personalFields.length} Terisi
                  </span>
                                </div>
                            </div>
                            <div className="w-full h-1 bg-slate-200/50 rounded-full overflow-hidden relative">
                                <div
                                    className={`h-full transition-all duration-700 ${personalCompletedCount === personalFields.length ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-sky-500'}`}
                                    style={{ width: `${(personalCompletedCount / personalFields.length) * 100}%` }}
                                />
                            </div>
                            {personalCompletedCount === personalFields.length ? (
                                <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2">
                                    Bagus! Data pribadi sudah lengkap ✅
                                </p>
                            ) : personalCompletedCount >= 2 && (
                                <p className="text-[11px] font-bold text-sky-600 flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2">
                                    <Sparkles size={12} /> Bagus! Data pribadi hampir selesai 👍
                                </p>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-4 opacity-70 grayscale-[0.2]">
                                <InputField
                                    label="Nama Lengkap"
                                    icon={<User size={18}/>}
                                    value={data.fullName}
                                    onChange={() => {}}
                                    disabled
                                    helper="Data ini diambil dari langkah sebelumnya."
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InputField
                                        label="Nomor Telepon"
                                        icon={<Phone size={18}/>}
                                        value={data.personalPhone}
                                        onChange={() => {}}
                                        disabled
                                    />
                                    <InputField
                                        label="Alamat Email"
                                        icon={<Mail size={18}/>}
                                        value={data.email}
                                        onChange={() => {}}
                                        disabled
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-slate-100" />

                            <div className="space-y-6">
                                <DOBSelector
                                    value={data.dob}
                                    onChange={v => setData({...data, dob: v})}
                                    error={touched.dob ? errors.dob : ''}
                                    onBlur={() => markTouched('dob')}
                                    success={!!data.dob && !errors.dob}
                                />

                                <div className="space-y-3 group">
                                    <label className="flex items-center justify-between text-sm font-bold text-slate-700">
                                        <div className="flex items-center gap-2 group-focus-within:text-sky-500 transition-colors">
                                            <MapPin size={18} className="text-slate-400" />
                                            Alamat Pribadi
                                        </div>
                                        {!!data.personalAddress && !errors.personalAddress && (
                                            <CheckCircle2 size={16} className="text-emerald-500 animate-in zoom-in-50" />
                                        )}
                                    </label>


                                    <textarea
                                        className={`w-full px-5 py-4 border-2 rounded-2xl transition-all outline-none focus:ring-4 focus:ring-sky-500/10 min-h-[120px] font-medium resize-none shadow-sm ${
                                            touched.personalAddress && errors.personalAddress
                                                ? 'border-rose-200 bg-rose-50/20'
                                                : !!data.personalAddress && !errors.personalAddress
                                                    ? 'border-emerald-500/30 bg-emerald-50/10 focus:border-emerald-500'
                                                    : 'bg-white border-slate-100 focus:border-sky-500'
                                        }`}
                                        placeholder="Masukkan alamat domisili Anda..."
                                        value={data.personalAddress}
                                        onBlur={() => markTouched('personalAddress')}
                                        onChange={e => setData({...data, personalAddress: e.target.value})}
                                    />
                                    {touched.personalAddress && errors.personalAddress && (
                                        <p className="text-[11px] font-bold text-rose-500 ml-1 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                                            <AlertCircle size={14}/> {errors.personalAddress}
                                        </p>
                                    )}
                                </div>

                                <InputField
                                    label="Kode Pos"
                                    icon={<Mail size={18}/>}
                                    placeholder="12345"
                                    value={data.personalPostalCode}
                                    onChange={v => setData({...data, personalPostalCode: v.replace(/\D/g, '').slice(0, 5)})}
                                    error={touched.personalPostalCode ? errors.personalPostalCode : ''}
                                    onBlur={() => markTouched('personalPostalCode')}
                                    success={data.personalPostalCode.length === 5 && !errors.personalPostalCode}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Business Detail */}
                    <section className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                                <div className="space-y-1 min-w-[200px] flex-1">
                                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                                        Detail Usaha
                                        {businessCompletedCount === businessFields.length && (
                                            <div className="p-1 bg-emerald-100 rounded-full animate-in zoom-in-50 shadow-sm">
                                                <CheckCircle2 size={20} className="text-emerald-600" />
                                            </div>
                                        )}
                                    </h2>
                                    <p className="text-slate-500 font-medium text-sm sm:text-base">Informasi ini membantu kami menyesuaikan layanan ✨</p>
                                </div>
                                <div className="shrink-0 pt-1">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors border shadow-sm inline-block ${
                      businessCompletedCount === businessFields.length ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-sky-50 text-sky-600 border-sky-100'
                  }`}>
                    {businessCompletedCount} / {businessFields.length} Terisi
                  </span>
                                </div>
                            </div>
                            <div className="w-full h-1 bg-slate-200/50 rounded-full overflow-hidden relative">
                                <div
                                    className={`h-full transition-all duration-700 ${businessCompletedCount === businessFields.length ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-sky-500'}`}
                                    style={{ width: `${(businessCompletedCount / businessFields.length) * 100}%` }}
                                />
                            </div>
                            {businessCompletedCount === businessFields.length ? (
                                <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2">
                                    Bagus! Data bisnis sudah lengkap ✅
                                </p>
                            ) : businessCompletedCount >= 4 && (
                                <p className="text-[11px] font-bold text-sky-600 flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2">
                                    <Sparkles size={12} /> Hampir selesai! Sedikit data bisnis lagi 🚀
                                </p>
                            )}
                        </div>

                        <div className="space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <InputField
                                    label="Brand Produk"
                                    icon={<Store size={18}/>}
                                    placeholder="e.g. Kedai Kopi"
                                    value={data.businessName}
                                    onChange={v => setData({...data, businessName: v})}
                                    error={touched.businessName ? errors.businessName : ''}
                                    onBlur={() => markTouched('businessName')}
                                    success={data.businessName.length >= 2 && !errors.businessName}
                                />
                                <InputField
                                    label="Nama Perusahaan"
                                    icon={<Building2 size={18}/>}
                                    placeholder="e.g. PT Kopi Digital"
                                    value={data.companyName}
                                    onChange={v => setData({...data, companyName: v})}
                                    error={touched.companyName ? errors.companyName : ''}
                                    onBlur={() => markTouched('companyName')}
                                    success={data.companyName.length >= 2 && !errors.companyName}
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <MapPin size={18} className="text-slate-400" />
                                        Alamat Perusahaan
                                        {!toggles.sameAddress && !!data.companyAddress && !errors.companyAddress && (
                                            <CheckCircle2 size={16} className="text-emerald-500 animate-in zoom-in-50" />
                                        )}
                                    </label>

                                    <Toggle
                                        label="GUNAKAN PRIBADI"
                                        checked={toggles.sameAddress}
                                        onChange={v => setToggles({...toggles, sameAddress: v})}
                                        small
                                    />
                                </div>
                                <textarea
                                    disabled={toggles.sameAddress}


                                    onBlur={() => markTouched('companyAddress')}

                                    className={`w-full px-5 py-4 transition-all outline-none min-h-[100px] font-medium resize-none shadow-sm rounded-2xl border-2 ${
                                        toggles.sameAddress
                                            ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                                            : touched.companyAddress && errors.companyAddress
                                                ? 'border-rose-200 bg-rose-50/20'
                                            : !!data.companyAddress && !errors.companyAddress && !toggles.sameAddress
                                                ? 'border-emerald-500/30 bg-emerald-50/10 focus:border-emerald-500'
                                                : 'bg-white border-slate-100 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10'
                                    }`}
                                    placeholder="Alamat kantor atau operasional..."
                                    value={data.companyAddress}
                                    onChange={e => setData({...data, companyAddress: e.target.value})}

                                />
                                {!toggles.sameAddress && touched.companyAddress && errors.companyAddress && (
                                    <p className="text-[11px] font-bold text-rose-500 ml-1 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                                        <AlertCircle size={14}/> {errors.companyAddress}
                                    </p>
                                )}



                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <InputField
                                        disabled={toggles.sameAddress}
                                        label="Kode Pos"
                                        icon={<Mail size={18}/>}
                                        placeholder="12345"
                                        value={data.companyPostalCode}
                                        onChange={v => setData({...data, companyPostalCode: v.replace(/\D/g, '').slice(0, 5)})}
                                        success={data.companyPostalCode.length === 5 && !errors.companyPostalCode}
                                        onBlur={() => markTouched('companyPostalCode')}
                                        error={
                                            touched.companyPostalCode
                                                ? errors.companyPostalCode
                                                : ''
                                        }
                                    />
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-sm font-bold text-slate-700">Telepon Bisnis
                                            </label>
                                            <Toggle
                                                label="Gunakan Pribadi"
                                                checked={toggles.samePhone}
                                                onChange={v => setToggles({...toggles, samePhone: v})}
                                                small
                                            />
                                        </div>
                                        <div className="relative group">
                                            <input
                                                disabled={toggles.samePhone}
                                                onBlur={() => markTouched('companyPhone')}

                                                className={`w-full pl-12 pr-5 py-4 border-2 rounded-2xl transition-all outline-none font-medium shadow-sm ${
                                                    toggles.samePhone
                                                        ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                                                        : touched.companyPhone && errors.companyPhone
                                                            ? 'border-rose-200 bg-rose-50/20'
                                                        : !!data.companyPhone && !errors.companyPhone && !toggles.samePhone
                                                            ? 'border-emerald-500/30 bg-emerald-50/10 focus:border-emerald-500'
                                                            : 'bg-white border-slate-100 focus:border-sky-500'
                                                }`}
                                                placeholder="+62 8123..."
                                                value={data.companyPhone}
                                                onChange={e => handlePhoneChange(e.target.value)}

                                            />
                                            <Phone size={18} className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${
                                                !!data.companyPhone && !errors.companyPhone && !toggles.samePhone ? 'text-emerald-500' : 'text-slate-400 group-focus-within:text-sky-500'
                                            }`} />
                                            {!!data.companyPhone && !errors.companyPhone && !toggles.samePhone && (
                                                <CheckCircle2 size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500 animate-in zoom-in-50" />
                                            )}

                                        </div>
                                        {!toggles.samePhone && (
                                            <p className="text-[10px] text-slate-400 font-bold ml-1 flex items-center gap-1.5 opacity-80">
                                                <Info size={12} />  Konversi otomatis ke format +62
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <SelectGroup
                                    label="Badan Usaha"

                                    value={data.businessType}
                                    onChange={v => setData({...data, businessType: v})}
                                    options={['PT', 'CV', 'Firma', 'Perorangan']}
                                    success={!!data.businessType && !errors.businessType}
                                />
                                <SelectGroup
                                    label="Skala Usaha"
                                    value={data.scale}
                                    onChange={v => setData({...data, scale: v})}
                                    options={['Mikro (1-5 Karyawan)', 'Kecil (6-20 Karyawan)', 'Menengah (21-100 Karyawan)', 'Besar (>100 Karyawan)']}
                                    success={!!data.scale && !errors.scale}
                                />
                            </div>



                            <SelectGroup
                                label="Bidang Usaha"
                                value={data.industry}
                                onChange={v => setData({...data, industry: v})}
                                options={['Retail', 'F&B', 'Teknologi', 'Kreatif', 'Kesehatan', 'Logistik', 'Lainnya']}
                                success={!!data.industry && !errors.industry}
                            />

                            {/* Action Area */}
                            <div className="pt-10 flex flex-col items-center gap-8">



                                <div className="text-center space-y-1.5">
                                    <p className={`text-sm font-bold transition-all duration-500 ${isValid ? 'text-emerald-600 scale-105' : 'text-slate-400'}`}>
                                        {isValid ? 'Semua data sudah siap 🎉' : `Hampir selesai! Tinggal ${totalEditableFields - totalCompleted} data lagi 🎉`}
                                    </p>
                                    {!isValid && (
                                        <div className="flex justify-center gap-1">
                                            {Array.from({ length: totalEditableFields }).map((_, i) => (
                                                <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i < totalCompleted ? 'w-4 bg-sky-500' : 'w-2 bg-slate-200'}`} />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="w-full space-y-4">
                                    <button
                                        disabled={!isValid || isSubmitting}
                                        onClick={() => {
                                            setIsSubmitting(true);
                                            setTimeout(() => {
                                                setIsSubmitting(false);
                                                alert("Pendaftaran Anda telah berhasil dikirim!");
                                            }, 2000);
                                        }}
                                        className={`w-full py-5 rounded-2xl font-black text-xl transition-all flex items-center justify-center gap-3 relative overflow-hidden group shadow-lg ${
                                            isValid
                                                ? 'bg-sky-500 text-white hover:bg-sky-600 shadow-sky-200 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] scale-105'
                                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        }`}
                                    >
                                        {isSubmitting ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Memproses...</span>
                                            </div>
                                        ) : (
                                            <>
                                                {progressPercent < 50 ? 'Lengkapi Data' : 'Selesaikan'}
                                                <Rocket size={22} className={isValid ? 'group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform' : ''} />
                                            </>
                                        )}
                                    </button>


                                </div>

                                {/* Trust & Security Section */}
                                <div className="w-full bg-white border border-slate-100 p-5 rounded-[1.5rem] flex items-start gap-4 shadow-sm animate-in fade-in zoom-in-95 duration-700">
                                    <div className="p-2.5 bg-sky-50 rounded-xl text-emerald-500 shrink-0">
                                        <ShieldCheck size={20} strokeWidth={2.5} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                            Keamanan Data Terjaga
                                            <Lock size={12} className="text-slate-400" />
                                        </h4>
                                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                            Informasi pendaftaran Anda dilindungi dan tidak dibagikan.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <style>{`
        select {
          background-image: none;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .success-animate {
          animation: success-pulse 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes success-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
      `}</style>
        </div>
    );
};

// --- Helper Components ---

const InputField: React.FC<{
    label: string;
    icon: React.ReactNode;
    placeholder?: string;
    type?: string;
    value: string;
    onChange: (v: string) => void;
    error?: string;
    onBlur?: () => void;
    success?: boolean;
    helper?: string;
    disabled?: boolean;
}> = ({ label, icon, placeholder, type = "text", value, onChange, error, onBlur, success, helper, disabled }) => (
    <div className="space-y-3 group">
        <label className="flex items-center justify-between text-sm font-bold text-slate-700">
            <div className="flex items-center gap-2 group-focus-within:text-sky-500 transition-colors">
                <span className={`transition-colors ${success && !disabled ? 'text-emerald-500' : 'text-slate-400 group-focus-within:text-sky-500'}`}>{icon}</span>
                {label}
            </div>
            {success && !disabled && (
                <CheckCircle2 size={16} className="text-emerald-500 animate-in zoom-in-50" />
            )}
        </label>
        <div className="relative">
            <input
                type={type}
                disabled={disabled}
                placeholder={placeholder}
                value={value}
                onBlur={onBlur}
                onChange={e => onChange(e.target.value)}
                className={`w-full px-5 py-4 border-2 rounded-2xl transition-all outline-none font-medium text-slate-900 placeholder:text-slate-300 shadow-sm ${
                    disabled ? 'bg-slate-50 border-slate-100 text-slate-500 cursor-not-allowed opacity-90' :
                        error ? 'border-rose-200 bg-rose-50/10' :
                            success ? 'border-emerald-500/30 bg-emerald-50/10 focus:border-emerald-500 success-animate' :
                                'bg-white border-slate-100 hover:border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10'
                }`}
            />
        </div>
        {error ? (
            <p className="text-[11px] font-bold text-rose-500 ml-1 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                <AlertCircle size={14}/> {error}
            </p>
        ) : helper ? (
            <p className="text-[10px] font-bold text-slate-400 ml-1 leading-relaxed opacity-80 flex items-start gap-1.5">
                <Info size={12} className="mt-0.5 shrink-0" /> {helper}
            </p>
        ) : null}
    </div>
);

const DOBSelector: React.FC<{
    value: string;
    onChange: (v: string) => void;
    error?: string;
    onBlur?: () => void;
    success?: boolean;
}> = ({ value, onChange, error, onBlur, success }) => {
    const [localYear, setLocalYear] = useState('');
    const [localMonth, setLocalMonth] = useState('');
    const [localDay, setLocalDay] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (value) {
            const [y, m, d] = value.split('-');
            setLocalYear(y || '');
            setLocalMonth(m ? String(Number(m)) : '');
            setLocalDay(d || '');
        } else {
            setLocalYear('');
            setLocalMonth('');
            setLocalDay('');
        }
    }, [value]);

    const handlePartChange = (type: 'd' | 'm' | 'y', val: string) => {
        let nextY = localYear, nextM = localMonth, nextD = localDay;
        if (type === 'y') { nextY = val; setLocalYear(val); }
        if (type === 'm') { nextM = val; setLocalMonth(val); }
        if (type === 'd') { nextD = val; setLocalDay(val); }

        if (nextY && nextM && nextD) {
            onChange(`${nextY}-${nextM.padStart(2, '0')}-${nextD.padStart(2, '0')}`);
        } else if (value !== '') {
            onChange('');
        }
    };

    const handleGlobalBlur = (e: React.FocusEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
            if (onBlur) onBlur();
        }
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

    return (
        <div className="space-y-3 group" ref={containerRef} onBlur={handleGlobalBlur}>
            <label className="flex items-center justify-between text-sm font-bold text-slate-700">
                <div className="flex items-center gap-2 group-focus-within:text-sky-500 transition-colors">
                    <Calendar size={18} className={`${success ? 'text-emerald-500' : 'text-slate-400 group-focus-within:text-sky-500'}`} />
                    Tanggal Lahir
                </div>
                {success && <CheckCircle2 size={16} className="text-emerald-500 animate-in zoom-in-50" />}
            </label>
            <div className="grid grid-cols-3 gap-3">
                {['d', 'm', 'y'].map((type, i) => {
                    const val = type === 'd' ? localDay : type === 'm' ? localMonth : localYear;
                    const options = type === 'd' ? days : type === 'm' ? months : years;
                    const placeholder = type === 'd' ? 'Tgl' : type === 'm' ? 'Bulan' : 'Tahun';

                    return (
                        <div key={type} className="relative">
                            <select
                                value={val}
                                onChange={e => handlePartChange(type as any, e.target.value)}
                                className={`w-full px-4 py-4 bg-white border-2 rounded-xl transition-all outline-none font-medium appearance-none ${
                                    error ? 'border-rose-200' : success ? 'border-emerald-500/30 bg-emerald-50/10 focus:border-emerald-500' : 'border-slate-100 focus:border-sky-500'
                                }`}
                            >
                                <option value="">{placeholder}</option>
                                {options.map((opt, idx) => (
                                    <option key={idx} value={type === 'm' ? String(idx + 1) : opt}>{opt}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    );
                })}
            </div>
            {error && (
                <p className="text-[11px] font-bold text-rose-500 ml-1 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle size={14}/> {error}
                </p>
            )}
        </div>
    );
};

const Toggle: React.FC<{
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    small?: boolean;
}> = ({ label, checked, onChange, small }) => (
    <label className="inline-flex items-center cursor-pointer group">
    <span className={`mr-2 font-bold text-slate-400 group-hover:text-slate-600 transition-colors ${small ? 'text-[10px] uppercase tracking-tight' : 'text-xs'}`}>
      {label}
    </span>
        <div className="relative">
            <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
            <div className={`rounded-full transition-all peer-checked:bg-emerald-500 ${small ? 'w-8 h-4 bg-slate-200 after:h-3 after:w-3' : 'w-10 h-5 bg-slate-200 after:h-4 after:w-4'} after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-full`}></div>
        </div>
    </label>
);

const SelectGroup: React.FC<{
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: string[];
    success?: boolean;
}> = ({ label, value, onChange, options, success }) => (
    <div className="space-y-3 group">
        <label className="flex items-center justify-between text-sm font-bold text-slate-700">
            <div className={`${success ? 'text-emerald-500' : 'group-focus-within:text-sky-500 transition-colors'}`}>{label}</div>
            {success && <CheckCircle2 size={16} className="text-emerald-500 animate-in zoom-in-50" />}
        </label>
        <div className="relative">
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className={`w-full px-5 py-4 border-2 rounded-2xl transition-all outline-none font-medium appearance-none shadow-sm ${
                    success ? 'border-emerald-500/30 bg-emerald-50/10 focus:border-emerald-500' : 'bg-white border-slate-100 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10'
                } text-slate-900`}
            >
                <option value="" disabled>Pilih {label}</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
    </div>
);

export default CompleteData;
