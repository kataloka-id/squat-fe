
import React from 'react';
import { Check, ArrowRight, Gift, ShieldAlert, Sparkles } from 'lucide-react';

const Pricing: React.FC = () => {
  return (
    <section id="partnership" className="py-20 bg-gray-50/50">
      <div className="container mx-auto px-4 lg:px-20">
        <div className="max-w-5xl mx-auto">
          {/* Main Partnership Card */}
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-sky-100/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Sparkles size={120} className="text-sky-500" />
            </div>

            <div className="grid lg:grid-cols-5 gap-0">
              {/* Offer Left */}
              <div className="lg:col-span-3 p-8 lg:p-14 space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full font-bold text-[10px] uppercase tracking-widest border border-green-100">
                  <Gift size={12} strokeWidth={3} />
                  Penawaran Kemitraan Awal
                </div>
                
                <h2 className="text-4xl lg:text-5xl font-black text-gray-900 leading-tight">
                  Bebas Biaya Layanan <br />
                  <span className="text-sky-500">Di Tahun Pertama.</span>
                </h2>
                
                <p className="text-gray-500 text-lg leading-relaxed">
                  Kami sedang membangun portofolio eksklusif. Kami memberikan akses penuh ke sistem kami tanpa biaya jasa selama 12 bulan pertama—Anda hanya menanggung biaya teknis (domain/hosting).
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    "Tanpa Kontrak Mengikat",
                    "Full Support 24/7",
                    "Akses Fitur Premium",
                    "Opsi Lanjut atau Berhenti"
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-3 text-gray-700 font-bold text-sm">
                      <div className="w-5 h-5 bg-sky-50 rounded-full flex items-center justify-center text-sky-500">
                        <Check size={12} strokeWidth={3} />
                      </div>
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* Offer Right (CTA Box) */}
              <div className="lg:col-span-2 bg-sky-600 p-8 lg:p-14 text-white flex flex-col justify-center text-center lg:text-left space-y-6">
                <div>
                  <div className="text-sky-200 font-bold text-xs uppercase tracking-widest mb-2">Estimasi Investasi</div>
                  <div className="text-5xl font-black mb-1">Rp 0,-</div>
                  <div className="text-sky-100/60 text-xs italic">*Biaya Jasa Tahun Ke-1</div>
                </div>

                <div className="space-y-4">
                  <button className="w-full bg-white text-sky-600 hover:bg-sky-50 px-8 py-5 rounded-2xl font-black text-lg transition-all transform hover:scale-105 shadow-xl flex items-center justify-center gap-2">
                    Ajukan Kemitraan
                    <ArrowRight size={20} />
                  </button>
                  <p className="text-sky-100 text-[10px] font-medium leading-tight">
                    *Slot terbatas hanya untuk 3 bisnis terpilih per bulan guna menjaga kualitas layanan.
                  </p>
                </div>

                <div className="pt-4 border-t border-sky-400/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-400/20 flex items-center justify-center shrink-0">
                    <ShieldAlert size={18} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider leading-relaxed text-sky-100 text-left">
                    Transparansi Penuh: Tidak ada biaya tersembunyi atau tagihan mendadak.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
