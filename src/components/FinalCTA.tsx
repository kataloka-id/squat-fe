
import React from 'react';
import { MessageSquare, ArrowRight } from 'lucide-react';

const FinalCTA: React.FC = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4 lg:px-20">
        <div className="bg-gray-900 rounded-[40px] p-10 lg:p-20 text-center text-white relative overflow-hidden shadow-2xl">
          {/* Subtle Decor */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl lg:text-5xl font-black leading-tight">
              Mulai Langkah Pertama <br />
              Bisnis Digital Anda.
            </h2>
            <p className="text-gray-400 text-base lg:text-lg leading-relaxed">
              Diskusikan visi Anda secara mendalam. Tidak ada tekanan penjualan, hanya sesi konsultasi strategis untuk memetakan kebutuhan sistem bisnis Anda.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="w-full sm:w-auto bg-sky-500 hover:bg-sky-600 text-white px-10 py-5 rounded-2xl font-black text-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2">
                <MessageSquare size={24} />
                Hubungi WhatsApp
              </button>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
