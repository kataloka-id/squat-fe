import React from 'react';
import { Zap, Target, Layout, Smartphone, Lock, BarChart3 } from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  return (
    <div className="group flex flex-col items-start gap-5 rounded-[24px] border border-gray-100 bg-white p-8 transition-all duration-300 hover:border-sky-100 hover:shadow-xl hover:shadow-sky-100/30">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-500 shadow-sm transition-all duration-300 group-hover:bg-sky-500 group-hover:text-white">
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-[24px] font-bold tracking-tight text-gray-900">{title}</h3>
        <p className="text-[16px] leading-relaxed text-gray-500">{description}</p>
      </div>
    </div>
  );
};

const Features: React.FC = () => {
  const features = [
    {
      icon: <Zap size={22} />,
      title: 'Performa Maksimal',
      description:
        'Sistem dibangun dengan clean-code untuk memastikan kecepatan akses maksimal di setiap halaman.',
    },
    {
      icon: <Target size={22} />,
      title: 'Mudah Digunakan',
      description: 'Antarmuka dirancang untuk memberikan kemudahan pengguna.',
    },
    {
      icon: <BarChart3 size={22} />,
      title: 'Optimasi SEO',
      description:
        'Optimasi dilakukan dengan tujuan mempermudah pengunjung menemukan website anda.',
    },
    {
      icon: <Smartphone size={22} />,
      title: 'Kompatibel di Berbagai Platform',
      description: 'User experience yang optimal di PC maupun di smartphone.',
    },
    {
      icon: <Layout size={22} />,
      title: 'Akses Kontak',
      description: 'Menghubungkan pelanggan ke tim anda melalui kontak yang terintegrasi.',
    },
    {
      icon: <Lock size={22} />,
      title: 'Prioritaskan Keamanan',
      description:
        'Standardisasi keamanan SSL dan enkripsi data untuk menjaga kredibilitas bisnis Anda.',
    },
  ];

  return (
    <section id="features" className="border-t border-gray-50 bg-[#f6f6f6] py-16 lg:py-24">
      <div className="container mx-auto px-4 lg:px-20">
        <div className="mb-12 max-w-[1536px] text-center">
          <div className="mb-2 text-[12px] font-bold uppercase tracking-widest text-[#0697e0]">
            Kelebihan Kami
          </div>
          <h2 className="text-3xl font-black leading-tight tracking-tight text-gray-900 lg:text-[48px]">
            Produk Yang <br />
            <span className="text-[#0697e0]">Kompetitif</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
