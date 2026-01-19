import React from 'react';
import { MessageSquare, ArrowRight } from 'lucide-react';

const FinalCTA: React.FC = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4 lg:px-20">
        <div className="relative overflow-hidden rounded-[40px] bg-gray-900 p-10 text-center text-white shadow-2xl lg:p-20">
          {/* Subtle Decor */}
          <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-2xl space-y-6">
            <h2 className="text-3xl font-black leading-tight lg:text-5xl">
              Awali Transformasi <br />
              Bisnis Digital Anda
            </h2>
            <p className="text-base leading-relaxed text-gray-400 lg:text-lg">
              Diskusikan Kebutuhan bisnis anda dengan sesi konsultasi strategis untuk memetakan
              kebutuhan sistem bisnis Anda.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
              <a
                href="https://wa.me/6287849151511"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
              >
                <button className="flex w-full transform items-center justify-center gap-2 rounded-2xl bg-[#0697e0] px-10 py-5 text-lg font-black text-white transition-all hover:scale-105 hover:bg-sky-600 sm:w-auto">
                  <MessageSquare size={24} />
                  Hubungi WhatsApp
                </button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
