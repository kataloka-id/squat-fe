
import React from 'react';
import {ShieldCheck, ArrowRight, CheckCircle2, Terminal, Server, Activity, Lock, CheckCircle} from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <section className="relative pt-24 pb-12 lg:pt-40 lg:pb-24 bg-white overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] bg-sky-50 rounded-full blur-3xl opacity-40" />
      
      <div className="container mx-auto px-4 lg:px-20 relative z-10 flex flex-col lg:flex-row items-center gap-10 lg:gap-20">
        
        {/* Left: Value Proposition */}
        <div className="flex-1 text-center lg:text-left space-y-6 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-50 text-sky-600 rounded-full font-bold text-[10px] uppercase tracking-widest border border-sky-100">
            <CheckCircle size={12} strokeWidth={3} />
            MITRA DIGITAL TERPERCAYA
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-[62px] font-black leading-[1.05] tracking-tight text-gray-900">
            Bawa Bisnis<br />
            Menuju ke
             <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">
              Level Selanjutnya!
            </span>
          </h1>
          
          <p className="text-gray-500 text-base lg:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
            Solusi digital profesional sebagai sarana transformasi bisnis lokal Anda menjadi bisnis Digital dengan website modern, cepat, dan terpercaya.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
            <button className="w-full sm:w-auto bg-sky-500 hover:bg-sky-600 text-white px-8 py-4 rounded-xl font-bold text-base shadow-lg shadow-sky-100 transition-all flex items-center justify-center gap-2 group">
              Mulai Digitalkan Bisnismu Sekarang
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            {/*<button className="w-full sm:w-auto bg-white border border-gray-200 hover:border-sky-200 hover:bg-sky-50/50 text-gray-600 px-8 py-4 rounded-xl font-bold text-base transition-all">*/}
            {/*  Lihat Pendekatan*/}
            {/*</button>*/}
          </div>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
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
        <div className="flex-1 w-full relative group">
          <div className="bg-gray-900 rounded-[32px] p-1 shadow-2xl shadow-sky-900/20 overflow-hidden border border-gray-800 transition-transform duration-500 hover:scale-[1.01]">
            {/* Header: Technical Status */}
            <div className="bg-gray-800/50 px-5 py-3 border-b border-gray-700 flex items-center justify-between">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">System: Ready</span>
              </div>
            </div>

            {/* Content: Value-Led Spec */}
            <div className="p-5 sm:p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Terminal size={18} className="text-sky-400" />
                  <span className="text-xs font-mono text-sky-400 uppercase tracking-tighter font-bold">Foundation Spec v1.0</span>
                </div>
                <div className="h-px bg-gradient-to-r from-gray-700 to-transparent w-full" />
              </div>

              {/* Mobile-Optimized Value Stack */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: <Server size={16} />,
                    title: "Kesiapan Skala",
                    value: "Siap Trafik Tinggi",
                    desc: "Sistem tidak akan drop saat bisnis Anda viral."
                  },
                  {
                    icon: <Activity size={16} />,
                    title: "Efisiensi Kode",
                    value: "Zero Technical Debt",
                    desc: "Struktur bersih untuk pengembangan jangka panjang."
                  },
                  {
                    icon: <Lock size={16} />,
                    title: "Keamanan Inti",
                    value: "Enkripsi Lapis",
                    desc: "Perlindungan data dari ancaman siber sejak hari pertama."
                  },
                  {
                    icon: <ShieldCheck size={16} />,
                    title: "Stabilitas",
                    value: "99.9% Up-time",
                    desc: "Jaminan kehadiran digital yang selalu aktif."
                  }
                ].map((item, i) => (
                  <div key={i} className="bg-gray-800/30 border border-gray-700/50 p-4 rounded-2xl space-y-2 hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-2 text-gray-400">
                      {item.icon}
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{item.title}</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white mb-1">{item.value}</div>
                      <p className="text-[11px] text-gray-500 leading-tight">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Indicator */}
              <div className="pt-4 border-t border-gray-800">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-gray-600">ARCH_INIT: SUCCESS</span>
                  <span className="text-sky-500/50 font-bold uppercase tracking-widest">Verified by Kataloka</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Subtle Accent Shadow */}
          <div className="absolute -inset-4 bg-sky-500/5 rounded-[40px] blur-2xl -z-10 group-hover:bg-sky-500/10 transition-colors" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
