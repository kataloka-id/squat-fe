
import React from 'react';
import { ShieldCheck, Zap, HeartHandshake, Eye } from 'lucide-react';

const Commitments: React.FC = () => {
  const items = [
    { label: 'Biaya Jujur', value: '100% Terbuka', icon: <Eye />, desc: 'Laporan biaya teknis transparan.' },
    { label: 'Responsif', value: 'Sangat Sigap', icon: <Zap />, desc: 'Dukungan teknis prioritas.' },
    { label: 'Keamanan', value: 'Standard SSL', icon: <ShieldCheck />, desc: 'Enkripsi data berlapis.' },
    { label: 'Komitmen', value: 'Jangka Panjang', icon: <HeartHandshake />, desc: 'Partner tumbuh bersama.' },
  ];

  return (
    <div className="bg-white pb-10">
      <div className="container mx-auto px-4 lg:px-20">
        <div className="bg-gray-50/50 rounded-[32px] p-8 lg:p-10 border border-gray-100 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center lg:items-start text-center lg:text-left gap-3">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 text-sky-500">
                {React.cloneElement(item.icon as React.ReactElement, {  })}
              </div>
              <div>
                <div className="text-xl font-black text-gray-900 tracking-tight">{item.value}</div>
                <div className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-0.5">{item.label}</div>
                <p className="text-[10px] text-gray-400 leading-tight">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Commitments;
