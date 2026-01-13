
import React from 'react';
import { Search, PenTool, Rocket, LineChart } from 'lucide-react';

const Workflow: React.FC = () => {
  const steps = [
    {
      icon: <Search size={20} />,
      title: "Discovery & Audit",
      desc: "Bedah kebutuhan bisnis dan audit kompetitor pasar."
    },
    {
      icon: <PenTool size={20} />,
      title: "Strategic Design",
      desc: "Merancang antarmuka berbasis psikologi konversi."
    },
    {
      icon: <Rocket size={20} />,
      title: "System Launch",
      desc: "Implementasi teknis dan panduan operasional mandiri."
    },
    {
      icon: <LineChart size={20} />,
      title: "Optimization",
      desc: "Evaluasi data berkala untuk efisiensi sistem berkelanjutan."
    }
  ];

  return (
    <section id="workflow" className="py-20 bg-sky-50/20">
      <div className="container mx-auto px-4 lg:px-20">
        <div className="mb-12 space-y-2">
          <div className="text-sky-600 font-bold uppercase tracking-widest text-[10px]">Alur Kerja Profesional</div>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 leading-tight">Proses yang Terukur.</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-px bg-sky-100 -translate-y-1/2 z-0" />
          
          {steps.map((step, idx) => (
            <div key={idx} className="relative z-10 bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-3 group hover:border-sky-200 transition-colors">
              <div className="w-10 h-10 bg-sky-500 text-white rounded-lg flex items-center justify-center shadow-lg shadow-sky-100">
                {step.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{step.desc}</p>
              <div className="absolute top-4 right-6 text-2xl font-black text-gray-50 group-hover:text-sky-50 transition-colors">0{idx + 1}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Workflow;
