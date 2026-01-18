import React from 'react';
import {
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Terminal,
  Server,
  Activity,
  Lock,
  CheckCircle,
} from 'lucide-react';

interface HeroProps {
  onOpenModal: () => void;
}

const Hero: React.FC<HeroProps> = ({ onOpenModal }) => {
  return (
    <section className="relative overflow-hidden bg-[#f6f6f6] pb-12 pt-24 lg:pb-24 lg:pt-40">
      {/* Background Ambience */}
      <div className="absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/2 translate-x-1/4 rounded-full bg-sky-50 opacity-40 blur-3xl" />

      <div className="container relative z-10 mx-auto flex flex-col items-center gap-10 px-4 md:px-12 lg:flex-row lg:px-20 xl:px-[190px]">
        {/* Left: Value Proposition */}
        <div className="max-w-2xl flex-1 space-y-6 text-center lg:text-left">
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-sky-600">
            <CheckCircle size={12} strokeWidth={3} />
            MITRA DIGITAL TERPERCAYA
          </div>

          <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-gray-900 md:text-5xl lg:text-[72px]">
            Bawa Bisnis
            <br />
            Menuju ke
            <br />
            <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
              Level Selanjutnya!
            </span>
          </h1>

          <p className="mx-auto max-w-lg text-base leading-relaxed text-gray-500 lg:mx-0 lg:text-lg">
            Solusi digital profesional sebagai sarana transformasi bisnis lokal Anda menjadi bisnis
            Digital dengan website modern, cepat, dan terpercaya.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row lg:justify-start">
            <button
              onClick={onOpenModal}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#0697e0] px-8 py-4 text-base font-bold text-white shadow-lg shadow-sky-100 transition-all hover:bg-sky-600 sm:w-auto"
            >
              Mulai Digitalkan Bisnismu Sekarang
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </button>
            {/*<button className="w-full sm:w-auto bg-white border border-gray-200 hover:border-sky-200 hover:bg-sky-50/50 text-gray-600 px-8 py-4 rounded-xl font-bold text-base transition-all">*/}
            {/*  Lihat Pendekatan*/}
            {/*</button>*/}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 lg:justify-start">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-sky-500" />
              Minim Risiko Teknis
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-sky-500" />
              Performa Terjamin
            </div>
          </div>
        </div>

        {/* Right: The "System Blueprint" - Mobile First */}
        <div className="group relative w-full flex-1 md:mt-12 lg:mt-0">
          <div className="overflow-hidden rounded-[32px] border border-gray-800 bg-gray-900 p-1 shadow-2xl shadow-sky-900/20 transition-transform duration-500 hover:scale-[1.01]">
            {/* Header: Technical Status */}
            <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800/50 px-5 py-3">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
                  System: Ready
                </span>
              </div>
            </div>

            {/* Content: Value-Led Spec */}
            <div className="space-y-6 p-5 sm:p-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Terminal size={18} className="text-sky-400" />
                  <span className="font-mono text-xs font-bold uppercase tracking-tighter text-sky-400">
                    Foundation Spec v1.0
                  </span>
                </div>
                <div className="h-px w-full bg-gradient-to-r from-gray-700 to-transparent" />
              </div>

              {/* Mobile-Optimized Value Stack */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  {
                    icon: <Server size={16} />,
                    title: 'Kesiapan Skala',
                    value: 'Siap Trafik Tinggi',
                    desc: 'Sistem tidak akan drop saat bisnis Anda viral.',
                  },
                  {
                    icon: <Activity size={16} />,
                    title: 'Efisiensi Kode',
                    value: 'Zero Technical Debt',
                    desc: 'Struktur bersih untuk pengembangan jangka panjang.',
                  },
                  {
                    icon: <Lock size={16} />,
                    title: 'Keamanan Inti',
                    value: 'Enkripsi Lapis',
                    desc: 'Perlindungan data dari ancaman siber sejak hari pertama.',
                  },
                  {
                    icon: <ShieldCheck size={16} />,
                    title: 'Stabilitas',
                    value: '99.9% Up-time',
                    desc: 'Jaminan kehadiran digital yang selalu aktif.',
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="space-y-2 rounded-2xl border border-gray-700/50 bg-gray-800/30 p-4 transition-colors hover:bg-gray-800/50"
                  >
                    <div className="flex items-center gap-2 text-gray-400">
                      {item.icon}
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        {item.title}
                      </span>
                    </div>
                    <div>
                      <div className="mb-1 text-sm font-bold text-white">{item.value}</div>
                      <p className="text-[11px] leading-tight text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Indicator */}
              <div className="border-t border-gray-800 pt-4">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-gray-600">ARCH_INIT: SUCCESS</span>
                  <span className="font-bold uppercase tracking-widest text-sky-500/50">
                    Verified by Kataloka
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Subtle Accent Shadow */}
          <div className="absolute -inset-4 -z-10 rounded-[40px] bg-sky-500/5 blur-2xl transition-colors group-hover:bg-sky-500/10" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
