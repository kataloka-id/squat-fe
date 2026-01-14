import React from 'react';
import { Search, PenTool, Rocket, LineChart } from 'lucide-react';

const Workflow: React.FC = () => {
  const steps = [
    {
      icon: <Search size={20} />,
      title: 'Discovery & Audit',
      desc: 'Bedah kebutuhan bisnis dan audit kompetitor pasar.',
    },
    {
      icon: <PenTool size={20} />,
      title: 'Strategic Design',
      desc: 'Merancang antarmuka berbasis psikologi konversi.',
    },
    {
      icon: <Rocket size={20} />,
      title: 'System Launch',
      desc: 'Implementasi teknis dan panduan operasional mandiri.',
    },
    {
      icon: <LineChart size={20} />,
      title: 'Optimization',
      desc: 'Evaluasi data berkala untuk efisiensi sistem berkelanjutan.',
    },
  ];

  return (
    <section id="workflow" className="bg-sky-50/20 py-20">
      <div className="container mx-auto px-4 lg:px-20">
        <div className="mb-12 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-sky-600">
            Alur Kerja Profesional
          </div>
          <h2 className="text-3xl font-black leading-tight text-gray-900 lg:text-4xl">
            Proses yang Terukur.
          </h2>
        </div>

        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="absolute left-0 top-1/2 z-0 hidden h-px w-full -translate-y-1/2 bg-sky-100 lg:block" />

          {steps.map((step, idx) => (
            <div
              key={idx}
              className="group relative z-10 space-y-3 rounded-[24px] border border-gray-100 bg-white p-6 shadow-sm transition-colors hover:border-sky-200"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500 text-white shadow-lg shadow-sky-100">
                {step.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
              <p className="text-xs leading-relaxed text-gray-500">{step.desc}</p>
              <div className="absolute right-6 top-4 text-2xl font-black text-gray-50 transition-colors group-hover:text-sky-50">
                0{idx + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Workflow;
