import React from 'react';
import { ShieldCheck, Zap, HeartHandshake, Eye } from 'lucide-react';

const Commitments: React.FC = () => {
  const items = [
    {
      label: 'Biaya Jujur',
      value: '100% Terbuka',
      icon: <Eye />,
      desc: 'Laporan biaya teknis transparan.',
    },
    {
      label: 'Responsif',
      value: 'Sangat Sigap',
      icon: <Zap />,
      desc: 'Dukungan teknis prioritas.',
    },
    {
      label: 'Keamanan',
      value: 'Standard SSL',
      icon: <ShieldCheck />,
      desc: 'Enkripsi data berlapis.',
    },
    {
      label: 'Komitmen',
      value: 'Jangka Panjang',
      icon: <HeartHandshake />,
      desc: 'Partner tumbuh bersama.',
    },
  ];

  return (
    <div className="bg-white pb-10">
      <div className="container mx-auto px-4 lg:px-20">
        <div className="grid grid-cols-2 gap-6 rounded-[32px] border border-gray-100 bg-gray-50/50 p-8 lg:grid-cols-4 lg:p-10">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center gap-3 text-center lg:items-start lg:text-left"
            >
              <div className="rounded-xl border border-gray-100 bg-white p-3 text-sky-500 shadow-sm">
                {React.cloneElement(item.icon as React.ReactElement, {})}
              </div>
              <div>
                <div className="text-xl font-black tracking-tight text-gray-900">{item.value}</div>
                <div className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-sky-600">
                  {item.label}
                </div>
                <p className="text-[10px] leading-tight text-gray-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Commitments;
