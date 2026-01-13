
import React from 'react';
import { Users, Briefcase, Award, Star } from 'lucide-react';

const Stats: React.FC = () => {
  const items = [
    { label: 'Proyek Selesai', value: '500+', icon: <Briefcase className="text-sky-500" /> },
    { label: 'Klien Puas', value: '98%', icon: <Users className="text-sky-500" /> },
    { label: 'Industri Berbeda', value: '25+', icon: <Award className="text-sky-500" /> },
    { label: 'Rating Rata-rata', value: '4.9/5', icon: <Star className="text-sky-500 fill-sky-500" /> },
  ];

  return (
    <div className="bg-white pb-12">
      <div className="container mx-auto px-4 lg:px-20">
        <div className="bg-gray-50 rounded-[32px] p-8 lg:p-12 border border-gray-100 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {items.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center lg:items-start text-center lg:text-left gap-2 group">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <div>
                <div className="text-3xl font-extrabold text-gray-900 tracking-tight">{item.value}</div>
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Stats;
