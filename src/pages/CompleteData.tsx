import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Store,
  Building2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Rocket,
  ShieldCheck,
  Info,
  Sparkles,
  Calendar,
  Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SuccessModal from '@/src/components/SuccessModal.tsx';
import { useOnboardingStore } from '@/src/store/onboardingStore.ts';
import { EnterpriseService } from '@/src/api/enterprises.service.ts';
import { ExternalService } from '@/src/api/external.service.ts';

interface FormData {
  fullName: string;
  personalPhone: string;
  email: string;
  dob: string;
  personalAddress: string;
  personalPostalCode: string;
  businessName: string;
  companyName: string;
  companyAddress: string;
  companyPostalCode: string;
  companyPhone: string;
  industry: string | null;
  scale: number | null;
  businessTypeId: number | null;
}

const CompleteData: React.FC = () => {
  const registration = useOnboardingStore((state) => state.registration);
  const navigate = useNavigate();
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  type BusinessTypeOption = {
    id: number;
    label: string;
  };

  const [businessTypes, setBusinessTypes] = useState<BusinessTypeOption[]>([]);

  const [, setIsLoadingBusinessType] = useState(false);

  useEffect(() => {
    EnterpriseService.getEnterpriseTypes()
      .then((res) => {
        const options = res.data
          .filter((item: any) => item.is_active)
          .map((item: any) => ({
            id: item.id,
            label: item.business_type,
          }));

        setBusinessTypes(options);
      })
      .catch(console.error)
      .finally(() => setIsLoadingBusinessType(false));
  }, []);

  type EnterpriseCategoryOption = {
    id: number;
    label: string;
  };

  const [enterpriseCategories, setEnterpriseCategories] = useState<EnterpriseCategoryOption[]>([]);

  const [, setIsLoadingEnterpriseCategory] = useState(true);

  useEffect(() => {
    EnterpriseService.getEnterpriseCategories()
      .then((res) => {
        const options = res.data
          .filter((item: any) => item.is_active)
          .map((item: any) => ({
            id: item.id,
            label: item.name,
          }));

        setEnterpriseCategories(options);
      })
      .catch(console.error)
      .finally(() => setIsLoadingEnterpriseCategory(false));
  }, []);

  // ================== TYPES ==================
  type ExternalOssOption = string;

  // ================== STATE ==================
  const [keyword, setKeyword] = useState('');
  const [ossExternal, setExternalOss] = useState<ExternalOssOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [industryLabel, setIndustryLabel] = useState('');

  // ================== EFFECT ==================
  useEffect(() => {
    if (!keyword || keyword.length < 2) {
      setExternalOss([]);
      return;
    }

    const delay = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await ExternalService.getOss(keyword);

        const list = Array.isArray(res?.data) ? res.data : [];

        setExternalOss(list); // ✅ AMAN
      } catch (err) {
        console.error(err);
        setExternalOss([]); // ✅ JANGAN BIARKAN undefined
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delay);
  }, [keyword]);

  // ================== SUBMIT LOGIC ==================

  const buildRegisterPayload = () => {
    const selectedOss = ossExternal.find((item) => item.startsWith(`${data.industry} -`));

    const fieldLabel = selectedOss ? selectedOss.split(' - ').slice(1).join(' - ') : '';

    return {
      owner: {
        full_name: data.fullName,
        dob: data.dob,
        address: {
          street: data.personalAddress,
          postal_code: data.personalPostalCode,
        },
        contact: {
          phone: data.personalPhone.replace('+', ''),
          email: data.email,
        },
      },

      business: {
        name: data.companyName,
        address: {
          street: data.companyAddress,
          postal_code: data.companyPostalCode,
        },
        contact: {
          phone: data.companyPhone.replace('+', ''),
          email: data.email,
        },
        classification: {
          field: data.industry, // ✅ "07294" (APA ADANYA)
          field_label: industryLabel, // ✅ "Pertambangan Bijih Tembaga"
          business_type: data.businessTypeId,
          category: data.scale,
        },
      },
    };
  };

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const payload = buildRegisterPayload();

      await EnterpriseService.registerEnterprise(payload);

      setIsSuccessOpen(true);
    } catch (error: any) {
      console.error('Register enterprise error:', error);

      alert(error?.response?.data?.message || 'Terjadi kesalahan saat mendaftarkan usaha');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [data, setData] = useState<FormData>({
    fullName: registration.fullName,
    personalPhone: registration.phone,
    email: registration.email,
    dob: '',
    personalAddress: '',
    personalPostalCode: '',
    businessName: '',
    companyName: '',
    companyAddress: '',
    companyPostalCode: '',
    companyPhone: '+62',
    industry: null,
    scale: null,
    businessTypeId: null,
  });

  const [toggles, setToggles] = useState({
    sameAddress: false,
    samePhone: false,
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (toggles.sameAddress) {
      setData((prev) => ({
        ...prev,
        companyAddress: prev.personalAddress,
        companyPostalCode: prev.personalPostalCode,
      }));
    }
  }, [toggles.sameAddress, data.personalAddress, data.personalPostalCode]);

  useEffect(() => {
    if (toggles.samePhone) {
      setData((prev) => ({
        ...prev,
        companyPhone: prev.personalPhone,
      }));
    }
  }, [toggles.samePhone, data.personalPhone]);

  // --- Validation Logic ---
  const errors = useMemo(() => {
    const err: Record<string, string> = {};

    // Personal Section Validation
    if (!data.dob) err.dob = 'Wajib diisi';
    if (data.personalAddress.trim().length < 5) err.personalAddress = 'Alamat minimal 5 karakter';
    if (!/^\d{5}$/.test(data.personalPostalCode)) err.personalPostalCode = 'Harus 5 digit angka';

    // Business Section Validation
    if (!data.businessName.trim()) err.businessName = 'Wajib diisi';
    if (!data.companyName.trim()) err.companyName = 'Wajib diisi';
    if (data.companyAddress.trim().length < 5) err.companyAddress = 'Alamat minimal 5 karakter';
    if (!/^\d{5}$/.test(data.companyPostalCode)) err.companyPostalCode = 'Harus 5 digit angka';

    const phoneContent = data.companyPhone.replace('+62', '').replace(/\D/g, '');
    if (phoneContent.length < 9) err.companyPhone = 'Format tidak valid';

    if (!data.industry) err.industry = 'Wajib dipilih';
    if (!data.scale) err.scale = 'Wajib dipilih';
    if (!data.businessTypeId) err.businessType = 'Wajib dipilih';

    return err;
  }, [data]);

  // --- Progress Tracking ---
  const personalFields = [
    'fullName',
    'personalPhone',
    'email',
    'dob',
    'personalAddress',
    'personalPostalCode',
  ];
  const businessFields = [
    'businessName',
    'companyName',
    'companyAddress',
    'companyPostalCode',
    'companyPhone',
    'industry',
    'scale',
    'businessTypeId',
  ];

  const personalCompletedCount = personalFields.filter(
    (f) => !errors[f] && data[f as keyof FormData],
  ).length;
  const businessCompletedCount = businessFields.filter(
    (f) => !errors[f] && data[f as keyof FormData],
  ).length;

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

    setData((prev) => ({ ...prev, companyPhone: '+62' + afterPrefix }));
  };

  const markTouched = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-all duration-500 selection:bg-sky-100">
      {/* Global Progress Bar (Top) */}
      <div className="fixed left-0 top-0 z-[60] h-1 w-full bg-slate-100">
        <div
          className="h-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)] transition-all duration-700 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 mx-auto flex max-w-7xl items-center justify-between border-b border-slate-100 bg-white/80 px-6 py-6 shadow-sm backdrop-blur-xl">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-600 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
        >
          <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-bold">Kembali</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight">
            Kata<span className="text-sky-500">loka</span>
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-8">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Section 1: Personal Data */}
          <section className="animate-in fade-in slide-in-from-bottom-4 space-y-10 duration-700">
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                <div className="min-w-[200px] flex-1 space-y-1">
                  <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                    Lengkapi Datamu
                    {personalCompletedCount === personalFields.length && (
                      <div className="animate-in zoom-in-50 rounded-full bg-emerald-100 p-1 shadow-sm">
                        <CheckCircle2 size={20} className="text-emerald-600" />
                      </div>
                    )}
                  </h1>
                  <p className="text-sm font-medium text-slate-500 sm:text-base">
                    Sedikit lagi! Lengkapi data berikut untuk melanjutkan 🚀
                  </p>
                </div>
                <div className="shrink-0 pt-1">
                  <span
                    className={`inline-block rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors ${
                      personalCompletedCount === personalFields.length
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                        : 'border-sky-100 bg-sky-50 text-sky-600'
                    }`}
                  >
                    {personalCompletedCount} / {personalFields.length} Terisi
                  </span>
                </div>
              </div>
              <div className="relative h-1 w-full overflow-hidden rounded-full bg-slate-200/50">
                <div
                  className={`h-full transition-all duration-700 ${personalCompletedCount === personalFields.length ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-sky-500'}`}
                  style={{ width: `${(personalCompletedCount / personalFields.length) * 100}%` }}
                />
              </div>
              {personalCompletedCount === personalFields.length ? (
                <p className="animate-in fade-in slide-in-from-left-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                  Bagus! Data pribadi sudah lengkap ✅
                </p>
              ) : (
                personalCompletedCount >= 2 && (
                  <p className="animate-in fade-in slide-in-from-left-2 flex items-center gap-1.5 text-[11px] font-bold text-sky-600">
                    <Sparkles size={12} /> Bagus! Data pribadi hampir selesai 👍
                  </p>
                )
              )}
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 opacity-70 grayscale-[0.2]">
                <InputField
                  label="Nama Lengkap"
                  icon={<User size={18} />}
                  value={data.fullName}
                  onChange={() => {}}
                  disabled
                  helper="Data ini diambil dari langkah sebelumnya."
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InputField
                    label="Nomor Telepon"
                    icon={<Phone size={18} />}
                    value={data.personalPhone}
                    onChange={() => {}}
                    disabled
                  />
                  <InputField
                    label="Alamat Email"
                    icon={<Mail size={18} />}
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
                  onChange={(v) => setData({ ...data, dob: v })}
                  error={touched.dob ? errors.dob : ''}
                  onBlur={() => markTouched('dob')}
                  success={!!data.dob && !errors.dob}
                />

                <div className="group space-y-3">
                  <label className="flex items-center justify-between text-sm font-bold text-slate-700">
                    <div className="flex items-center gap-2 transition-colors group-focus-within:text-sky-500">
                      <MapPin size={18} className="text-slate-400" />
                      Alamat Pribadi
                    </div>
                    {!!data.personalAddress && !errors.personalAddress && (
                      <CheckCircle2 size={16} className="animate-in zoom-in-50 text-emerald-500" />
                    )}
                  </label>

                  <textarea
                    className={`min-h-[120px] w-full resize-none rounded-2xl border-2 px-5 py-4 font-medium shadow-sm outline-none transition-all focus:ring-4 focus:ring-sky-500/10 ${
                      touched.personalAddress && errors.personalAddress
                        ? 'border-rose-200 bg-rose-50/20'
                        : !!data.personalAddress && !errors.personalAddress
                          ? 'border-emerald-500/30 bg-emerald-50/10 focus:border-emerald-500'
                          : 'border-slate-100 bg-white focus:border-sky-500'
                    }`}
                    placeholder="Masukkan alamat domisili Anda..."
                    value={data.personalAddress}
                    onBlur={() => markTouched('personalAddress')}
                    onChange={(e) => setData({ ...data, personalAddress: e.target.value })}
                  />
                  {touched.personalAddress && errors.personalAddress && (
                    <p className="animate-in fade-in slide-in-from-top-1 ml-1 flex items-center gap-1.5 text-[11px] font-bold text-rose-500">
                      <AlertCircle size={14} /> {errors.personalAddress}
                    </p>
                  )}
                </div>

                <InputField
                  label="Kode Pos"
                  icon={<Mail size={18} />}
                  placeholder="12345"
                  value={data.personalPostalCode}
                  onChange={(v) =>
                    setData({ ...data, personalPostalCode: v.replace(/\D/g, '').slice(0, 5) })
                  }
                  error={touched.personalPostalCode ? errors.personalPostalCode : ''}
                  onBlur={() => markTouched('personalPostalCode')}
                  success={data.personalPostalCode.length === 5 && !errors.personalPostalCode}
                />
              </div>
            </div>
          </section>

          {/* Section 2: Business Detail */}
          <section className="animate-in fade-in slide-in-from-bottom-4 space-y-10 delay-200 duration-700">
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                <div className="min-w-[200px] flex-1 space-y-1">
                  <h2 className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                    Detail Usaha
                    {businessCompletedCount === businessFields.length && (
                      <div className="animate-in zoom-in-50 rounded-full bg-emerald-100 p-1 shadow-sm">
                        <CheckCircle2 size={20} className="text-emerald-600" />
                      </div>
                    )}
                  </h2>
                  <p className="text-sm font-medium text-slate-500 sm:text-base">
                    Informasi ini membantu kami menyesuaikan layanan ✨
                  </p>
                </div>
                <div className="shrink-0 pt-1">
                  <span
                    className={`inline-block rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors ${
                      businessCompletedCount === businessFields.length
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                        : 'border-sky-100 bg-sky-50 text-sky-600'
                    }`}
                  >
                    {businessCompletedCount} / {businessFields.length} Terisi
                  </span>
                </div>
              </div>
              <div className="relative h-1 w-full overflow-hidden rounded-full bg-slate-200/50">
                <div
                  className={`h-full transition-all duration-700 ${businessCompletedCount === businessFields.length ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-sky-500'}`}
                  style={{ width: `${(businessCompletedCount / businessFields.length) * 100}%` }}
                />
              </div>
              {businessCompletedCount === businessFields.length ? (
                <p className="animate-in fade-in slide-in-from-left-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                  Bagus! Data bisnis sudah lengkap ✅
                </p>
              ) : (
                businessCompletedCount >= 4 && (
                  <p className="animate-in fade-in slide-in-from-left-2 flex items-center gap-1.5 text-[11px] font-bold text-sky-600">
                    <Sparkles size={12} /> Hampir selesai! Sedikit data bisnis lagi 🚀
                  </p>
                )
              )}
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <InputField
                  label="Brand Produk"
                  icon={<Store size={18} />}
                  placeholder="e.g. Kedai Kopi"
                  value={data.businessName}
                  onChange={(v) => setData({ ...data, businessName: v })}
                  error={touched.businessName ? errors.businessName : ''}
                  onBlur={() => markTouched('businessName')}
                  success={data.businessName.length >= 2 && !errors.businessName}
                />
                <InputField
                  label="Nama Perusahaan"
                  icon={<Building2 size={18} />}
                  placeholder="e.g. PT Kopi Digital"
                  value={data.companyName}
                  onChange={(v) => setData({ ...data, companyName: v })}
                  error={touched.companyName ? errors.companyName : ''}
                  onBlur={() => markTouched('companyName')}
                  success={data.companyName.length >= 2 && !errors.companyName}
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <MapPin size={18} className="text-slate-400" />
                    Alamat Perusahaan
                    {!toggles.sameAddress && !!data.companyAddress && !errors.companyAddress && (
                      <CheckCircle2 size={16} className="animate-in zoom-in-50 text-emerald-500" />
                    )}
                  </label>

                  <Toggle
                    label="GUNAKAN PRIBADI"
                    checked={toggles.sameAddress}
                    onChange={(v) => setToggles({ ...toggles, sameAddress: v })}
                    small
                  />
                </div>
                <textarea
                  disabled={toggles.sameAddress}
                  onBlur={() => markTouched('companyAddress')}
                  className={`min-h-[100px] w-full resize-none rounded-2xl border-2 px-5 py-4 font-medium shadow-sm outline-none transition-all ${
                    toggles.sameAddress
                      ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
                      : touched.companyAddress && errors.companyAddress
                        ? 'border-rose-200 bg-rose-50/20'
                        : !!data.companyAddress && !errors.companyAddress && !toggles.sameAddress
                          ? 'border-emerald-500/30 bg-emerald-50/10 focus:border-emerald-500'
                          : 'border-slate-100 bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10'
                  }`}
                  placeholder="Alamat kantor atau operasional..."
                  value={data.companyAddress}
                  onChange={(e) => setData({ ...data, companyAddress: e.target.value })}
                />
                {!toggles.sameAddress && touched.companyAddress && errors.companyAddress && (
                  <p className="animate-in fade-in slide-in-from-top-1 ml-1 flex items-center gap-1.5 text-[11px] font-bold text-rose-500">
                    <AlertCircle size={14} /> {errors.companyAddress}
                  </p>
                )}

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <InputField
                    disabled={toggles.sameAddress}
                    label="Kode Pos"
                    icon={<Mail size={18} />}
                    placeholder="12345"
                    value={data.companyPostalCode}
                    onChange={(v) =>
                      setData({ ...data, companyPostalCode: v.replace(/\D/g, '').slice(0, 5) })
                    }
                    success={data.companyPostalCode.length === 5 && !errors.companyPostalCode}
                    onBlur={() => markTouched('companyPostalCode')}
                    error={touched.companyPostalCode ? errors.companyPostalCode : ''}
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-sm font-bold text-slate-700">Telepon Bisnis</label>
                      <Toggle
                        label="Gunakan Pribadi"
                        checked={toggles.samePhone}
                        onChange={(v) => setToggles({ ...toggles, samePhone: v })}
                        small
                      />
                    </div>
                    <div className="group relative">
                      <input
                        disabled={toggles.samePhone}
                        onBlur={() => markTouched('companyPhone')}
                        className={`w-full rounded-2xl border-2 py-4 pl-12 pr-5 font-medium shadow-sm outline-none transition-all ${
                          toggles.samePhone
                            ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
                            : touched.companyPhone && errors.companyPhone
                              ? 'border-rose-200 bg-rose-50/20'
                              : !!data.companyPhone && !errors.companyPhone && !toggles.samePhone
                                ? 'border-emerald-500/30 bg-emerald-50/10 focus:border-emerald-500'
                                : 'border-slate-100 bg-white focus:border-sky-500'
                        }`}
                        placeholder="+62 8123..."
                        value={data.companyPhone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                      />
                      <Phone
                        size={18}
                        className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${
                          !!data.companyPhone && !errors.companyPhone && !toggles.samePhone
                            ? 'text-emerald-500'
                            : 'text-slate-400 group-focus-within:text-sky-500'
                        }`}
                      />
                      {!!data.companyPhone && !errors.companyPhone && !toggles.samePhone && (
                        <CheckCircle2
                          size={16}
                          className="animate-in zoom-in-50 absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500"
                        />
                      )}
                    </div>
                    {!toggles.samePhone && (
                      <p className="ml-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-400 opacity-80">
                        <Info size={12} /> Konversi otomatis ke format +62
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <SelectGroup
                  label="Badan Usaha"
                  value={data.businessTypeId ? String(data.businessTypeId) : ''}
                  onChange={(v) => setData({ ...data, businessTypeId: Number(v) })}
                  options={businessTypes.map((bt) => ({
                    value: String(bt.id),
                    label: bt.label,
                  }))}
                  success={!!data.businessTypeId}
                />
                <SelectGroup
                  label="Skala Usaha"
                  value={data.scale ? String(data.scale) : ''}
                  onChange={(v) => setData({ ...data, scale: Number(v) })}
                  options={enterpriseCategories.map((ec) => ({
                    value: String(ec.id),
                    label: ec.label,
                  }))}
                  success={!!data.scale && !errors.scale}
                />
              </div>

              <AutocompleteSelect
                label="Bidang Usaha"
                value={data.industry ? String(data.industry) : ''}
                onChange={(v) => setData({ ...data, industry: v })}
                onSelect={(opt) => setIndustryLabel(opt.label)} // ✅ DI SINI
                onInputChange={(v) => setKeyword(v)}
                options={(ossExternal ?? []).map((item) => {
                  const [code] = item.split(' - ');
                  return {
                    value: code,
                    label: item,
                  };
                })}
                placeholder="Cari bidang usaha"
                loading={loading}
                success={!!data.industry && !errors.industry}
              />

              {/* Action Area */}
              <div className="flex flex-col items-center gap-8 pt-10">
                <div className="space-y-1.5 text-center">
                  <p
                    className={`text-sm font-bold transition-all duration-500 ${isValid ? 'scale-105 text-emerald-600' : 'text-slate-400'}`}
                  >
                    {isValid
                      ? 'Semua data sudah siap 🎉'
                      : `Hampir selesai! Tinggal ${totalEditableFields - totalCompleted} data lagi 🎉`}
                  </p>
                  {!isValid && (
                    <div className="flex justify-center gap-1">
                      {Array.from({ length: totalEditableFields }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 rounded-full transition-all duration-500 ${i < totalCompleted ? 'w-4 bg-sky-500' : 'w-2 bg-slate-200'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-full space-y-4">
                  <button
                    disabled={!isValid || isSubmitting}
                    onClick={handleSubmit}
                    className={`group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl py-5 text-xl font-black shadow-lg transition-all ${
                      isValid
                        ? 'scale-105 bg-sky-500 text-white shadow-sky-200 hover:-translate-y-1 hover:bg-sky-600 active:translate-y-0 active:scale-[0.98]'
                        : 'cursor-not-allowed bg-slate-200 text-slate-400'
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>Memproses...</span>
                      </div>
                    ) : (
                      <>
                        {progressPercent < 50 ? 'Lengkapi Data' : 'Selesaikan'}
                        <Rocket
                          size={22}
                          className={
                            isValid
                              ? 'transition-transform group-hover:-translate-y-1 group-hover:translate-x-1'
                              : ''
                          }
                        />
                      </>
                    )}
                  </button>
                </div>

                {/* Trust & Security Section */}
                <div className="animate-in fade-in zoom-in-95 flex w-full items-start gap-4 rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm duration-700">
                  <div className="shrink-0 rounded-xl bg-sky-50 p-2.5 text-emerald-500">
                    <ShieldCheck size={20} strokeWidth={2.5} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900">
                      Keamanan Data Terjaga
                      <Lock size={12} className="text-slate-400" />
                    </h4>
                    <p className="text-[11px] font-medium leading-relaxed text-slate-500">
                      Informasi pendaftaran Anda dilindungi dan tidak dibagikan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <SuccessModal
        isOpen={isSuccessOpen}
        onClose={() => {
          setIsSuccessOpen(false);
          navigate('/');
        }}
      />

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
}> = ({
  label,
  icon,
  placeholder,
  type = 'text',
  value,
  onChange,
  error,
  onBlur,
  success,
  helper,
  disabled,
}) => (
  <div className="group space-y-3">
    <label className="flex items-center justify-between text-sm font-bold text-slate-700">
      <div className="flex items-center gap-2 transition-colors group-focus-within:text-sky-500">
        <span
          className={`transition-colors ${success && !disabled ? 'text-emerald-500' : 'text-slate-400 group-focus-within:text-sky-500'}`}
        >
          {icon}
        </span>
        {label}
      </div>
      {success && !disabled && (
        <CheckCircle2 size={16} className="animate-in zoom-in-50 text-emerald-500" />
      )}
    </label>
    <div className="relative">
      <input
        type={type}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-2xl border-2 px-5 py-4 font-medium text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-300 ${
          disabled
            ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-500 opacity-90'
            : error
              ? 'border-rose-200 bg-rose-50/10'
              : success
                ? 'success-animate border-emerald-500/30 bg-emerald-50/10 focus:border-emerald-500'
                : 'border-slate-100 bg-white hover:border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10'
        }`}
      />
    </div>
    {error ? (
      <p className="animate-in fade-in slide-in-from-top-1 ml-1 flex items-center gap-1.5 text-[11px] font-bold text-rose-500">
        <AlertCircle size={14} /> {error}
      </p>
    ) : helper ? (
      <p className="ml-1 flex items-start gap-1.5 text-[10px] font-bold leading-relaxed text-slate-400 opacity-80">
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
    let nextY = localYear,
      nextM = localMonth,
      nextD = localDay;
    if (type === 'y') {
      nextY = val;
      setLocalYear(val);
    }
    if (type === 'm') {
      nextM = val;
      setLocalMonth(val);
    }
    if (type === 'd') {
      nextD = val;
      setLocalDay(val);
    }

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
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

  return (
    <div className="group space-y-3" ref={containerRef} onBlur={handleGlobalBlur}>
      <label className="flex items-center justify-between text-sm font-bold text-slate-700">
        <div className="flex items-center gap-2 transition-colors group-focus-within:text-sky-500">
          <Calendar
            size={18}
            className={`${success ? 'text-emerald-500' : 'text-slate-400 group-focus-within:text-sky-500'}`}
          />
          Tanggal Lahir
        </div>
        {success && <CheckCircle2 size={16} className="animate-in zoom-in-50 text-emerald-500" />}
      </label>
      <div className="grid grid-cols-3 gap-3">
        {['d', 'm', 'y'].map((type) => {
          const val = type === 'd' ? localDay : type === 'm' ? localMonth : localYear;
          const options = type === 'd' ? days : type === 'm' ? months : years;
          const placeholder = type === 'd' ? 'Tgl' : type === 'm' ? 'Bulan' : 'Tahun';

          return (
            <div key={type} className="relative">
              <select
                value={val}
                onChange={(e) => handlePartChange(type as any, e.target.value)}
                className={`w-full appearance-none rounded-xl border-2 bg-white px-4 py-4 font-medium outline-none transition-all ${
                  error
                    ? 'border-rose-200'
                    : success
                      ? 'border-emerald-500/30 bg-emerald-50/10 focus:border-emerald-500'
                      : 'border-slate-100 focus:border-sky-500'
                }`}
              >
                <option value="">{placeholder}</option>
                {options.map((opt, idx) => (
                  <option key={idx} value={type === 'm' ? String(idx + 1) : opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          );
        })}
      </div>
      {error && (
        <p className="animate-in fade-in slide-in-from-top-1 ml-1 flex items-center gap-1.5 text-[11px] font-bold text-rose-500">
          <AlertCircle size={14} /> {error}
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
  <label className="group inline-flex cursor-pointer items-center">
    <span
      className={`mr-2 font-bold text-slate-400 transition-colors group-hover:text-slate-600 ${small ? 'text-[10px] uppercase tracking-tight' : 'text-xs'}`}
    >
      {label}
    </span>
    <div className="relative">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div
        className={`rounded-full transition-all peer-checked:bg-emerald-500 ${small ? 'h-4 w-8 bg-slate-200 after:h-3 after:w-3' : 'h-5 w-10 bg-slate-200 after:h-4 after:w-4'} after:absolute after:left-[2px] after:top-[2px] after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full`}
      ></div>
    </div>
  </label>
);

const SelectGroup: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  success?: boolean;
}> = ({ label, value, onChange, options, success }) => (
  <div className="group space-y-3">
    <label className="flex items-center justify-between text-sm font-bold text-slate-700">
      <div
        className={`${success ? 'text-emerald-500' : 'transition-colors group-focus-within:text-sky-500'}`}
      >
        {label}
      </div>
      {success && <CheckCircle2 size={16} className="animate-in zoom-in-50 text-emerald-500" />}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none rounded-2xl border-2 px-5 py-4 font-medium shadow-sm outline-none transition-all ${
          success
            ? 'border-emerald-500/30 bg-emerald-50/10 focus:border-emerald-500'
            : 'border-slate-100 bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10'
        } text-slate-900`}
      >
        <option value="" disabled>
          Pilih {label}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={20}
        className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  </div>
);

type Option = { value: string; label: string };

const AutocompleteSelect: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSelect?: (option: Option) => void;
  onInputChange?: (v: string) => void;
  options: Option[];
  placeholder?: string;
  success?: boolean;
  disabled?: boolean;
  loading?: boolean;
}> = ({
  label,
  value,
  onChange,
  onSelect,
  onInputChange,
  options,
  placeholder,
  success,
  disabled,
  loading,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false); // 🆕 ADDED

  const ref = useRef<HTMLDivElement>(null);

  // 🆕 ADDED — close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 🔧 CHANGED — sync query ONLY when not typing
  useEffect(() => {
    if (isTyping) return;

    const selected = options.find((o) => o.value === value);
    setQuery(selected?.label ?? '');
  }, [value, options, isTyping]);

  return (
    <div ref={ref} className="group relative space-y-3">
      {/* Label */}
      <label className="flex items-center justify-between text-sm font-bold text-slate-700">
        <div
          className={`transition-colors ${
            success ? 'text-emerald-500' : 'group-focus-within:text-sky-500'
          }`}
        >
          {label}
        </div>

        {success && !disabled && (
          <CheckCircle2 size={16} className="animate-in zoom-in-50 text-emerald-500" />
        )}
      </label>

      {/* Input */}
      <div className="relative">
        <input
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setIsTyping(true); // 🆕 ADDED

            setQuery(e.target.value);
            onInputChange?.(e.target.value);
            setOpen(true);
          }}
          className={`w-full rounded-2xl border-2 px-5 py-4 font-medium text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-300 ${
            disabled
              ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-500 opacity-90'
              : success
                ? 'success-animate border-emerald-500/30 bg-emerald-50/10 focus:border-emerald-500'
                : 'border-slate-100 bg-white hover:border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10'
          }`}
        />

        <ChevronDown
          size={20}
          className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-slate-400"
        />

        {/* Dropdown */}
        {open && !disabled && (
          <ul className="animate-in fade-in slide-in-from-top-1 absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-2xl border border-slate-100 bg-white shadow-lg">
            {loading && <li className="px-5 py-3 text-sm font-medium text-slate-400">Memuat...</li>}

            {!loading && options.length === 0 && query.length >= 2 && (
              <li className="px-5 py-3 text-sm font-medium text-slate-400">Tidak ditemukan</li>
            )}

            {!loading &&
              options.map((o) => (
                <li
                  key={o.value}
                  onClick={() => {
                    onChange(o.value);
                    onSelect?.(o);
                    setIsTyping(false); // 🆕 ADDED

                    setQuery(o.label);
                    setOpen(false);
                  }}
                  className="cursor-pointer px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-sky-50"
                >
                  {o.label}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CompleteData;
