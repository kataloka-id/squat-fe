import React from 'react';
import { Check, ArrowRight, Gift, ShieldAlert, Sparkles } from 'lucide-react';

interface PricingProps {
  onOpenModal: () => void;
}

const Pricing: React.FC<PricingProps> = ({ onOpenModal }) => {
  return (
    <section id="partnership" className="bg-gray-50/50 py-20">
      <div className="container mx-auto px-4 lg:px-20">
        <div className="mx-auto max-w-5xl">
          {/* Main Partnership Card */}
          <div className="relative overflow-hidden rounded-[40px] border border-gray-100 bg-white shadow-2xl shadow-sky-100/50">
            <div className="pointer-events-none absolute right-0 top-0 p-8 opacity-10">
              <Sparkles size={120} className="text-sky-500" />
            </div>

            <div className="grid gap-0 lg:grid-cols-5">
              {/* Offer Left */}
              <div className="space-y-8 p-8 lg:col-span-3 lg:p-14">
                <div className="inline-flex items-center gap-2 rounded-full border border-green-100 bg-green-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-green-600">
                  <Gift size={12} strokeWidth={3} />
                  Penawaran Kemitraan Awal
                </div>

                <h2 className="text-4xl font-black leading-tight text-gray-900 lg:text-5xl">
                  Bebas Biaya Layanan <br />
                  <span className="text-sky-500">Di Tahun Pertama.</span>
                </h2>

                <p className="text-lg leading-relaxed text-gray-500">
                  Kami sedang membangun portofolio eksklusif. Kami memberikan akses penuh ke sistem
                  kami tanpa biaya jasa selama 12 bulan pertama.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    'Tanpa Kontrak Mengikat',
                    'Full Support 24/7',
                    'Akses Fitur Premium',
                    'Opsi Lanjut atau Berhenti',
                  ].map((f) => (
                    <div
                      key={f}
                      className="flex items-center gap-3 text-sm font-bold text-gray-700"
                    >
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-50 text-sky-500">
                        <Check size={12} strokeWidth={3} />
                      </div>
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* Offer Right (CTA Box) */}
              <div className="flex flex-col justify-center space-y-6 bg-sky-600 p-8 text-center text-white lg:col-span-2 lg:p-14 lg:text-left">
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-200">
                    Estimasi Investasi
                  </div>
                  <div className="mb-1 text-5xl font-black">Rp 0,-</div>
                  <div className="text-xs italic text-sky-100/60">*Biaya Jasa Tahun Ke-1</div>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={onOpenModal}
                    className="flex w-full transform items-center justify-center gap-2 rounded-2xl bg-white px-8 py-5 text-lg font-black text-sky-600 shadow-xl transition-all hover:scale-105 hover:bg-sky-50"
                  >
                    Ajukan Kemitraan
                    <ArrowRight size={20} />
                  </button>
                  <p className="text-[10px] font-medium leading-tight text-sky-100">
                    *Slot terbatas hanya untuk 3 bisnis terpilih per bulan guna menjaga kualitas
                    layanan.
                  </p>
                </div>

                <div className="flex items-center gap-3 border-t border-sky-400/30 pt-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-400/20">
                    <ShieldAlert size={18} />
                  </div>
                  <p className="text-left text-[10px] font-bold uppercase leading-relaxed tracking-wider text-sky-100">
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
