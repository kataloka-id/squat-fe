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
        <h3 className="text-xl font-bold tracking-tight text-gray-900">{title}</h3>
        <p className="text-sm leading-relaxed text-gray-500">{description}</p>
      </div>
    </div>
  );
};

const Features: React.FC = () => {
  const features = [
    {
      icon: <Zap size={22} />,
      title: 'Arsitektur Performa',
      description:
        'Sistem yang dibangun dengan clean-code untuk memastikan kecepatan akses maksimal di setiap halaman.',
    },
    {
      icon: <Target size={22} />,
      title: 'Psikologi Konversi',
      description:
        'Tata letak yang disusun berdasarkan perilaku pengguna untuk memandu pengunjung menuju aksi nyata.',
    },
    {
      icon: <BarChart3 size={22} />,
      title: 'Infrastruktur SEO',
      description:
        'Optimasi teknis mendalam agar struktur website Anda dipahami dengan baik oleh mesin pencari.',
    },
    {
      icon: <Smartphone size={22} />,
      title: 'Adaptibilitas Mobile',
      description:
        'User experience yang mulus tanpa kompromi, dioptimalkan khusus untuk pengguna smartphone.',
    },
    {
      icon: <Layout size={22} />,
      title: 'Automasi Kontak',
      description:
        'Menghubungkan pengunjung ke tim Anda secara instan melalui sistem integrasi WhatsApp terpadu.',
    },
    {
      icon: <Lock size={22} />,
      title: 'Privasi Tingkat Tinggi',
      description:
        'Standardisasi keamanan SSL dan enkripsi data untuk menjaga kredibilitas bisnis Anda di mata klien.',
    },
  ];

  return (
    <section id="features" className="border-t border-gray-50 bg-white py-16 lg:py-24">
      <div className="container mx-auto px-4 lg:px-20">
        <div className="mb-12 max-w-3xl">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-sky-600">
            Nilai Tambah Kami
          </div>
          <h2 className="text-3xl font-black leading-tight tracking-tight text-gray-900 lg:text-4xl">
            Membangun Keunggulan <br />
            <span className="text-sky-500">Kompetitif yang Berkelanjutan.</span>
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
