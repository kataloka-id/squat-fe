import React from 'react';
import { Construction } from 'lucide-react';

export const UnderDevelopment: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[600px] text-center p-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 border border-slate-200 shadow-soft">
        <Construction className="w-12 h-12 text-slate-400" />
      </div>
      <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Under Development</h2>
      <p className="text-slate-500 max-w-md text-lg leading-relaxed">
        We're working hard to bring you this feature. Check back soon for updates!
      </p>
      <div className="mt-8 px-4 py-2 bg-brand-50 text-brand-700 text-sm font-medium rounded-full border border-brand-100">
        Coming Soon
      </div>
    </div>
  );
};