import React from 'react';

export const BrandingPanel: React.FC = () => {
  return (
    <div className="relative flex h-full w-full flex-col justify-end bg-[#0f0024] p-12 lg:p-20">
      {/* Background Gradients and Shapes */}
      <div className="absolute inset-0 z-0 opacity-80">
        {/* Deep mesh gradient background */}
        <div className="absolute right-0 top-0 h-[800px] w-[800px] -translate-y-1/2 translate-x-1/4 rounded-full bg-qamaster-primary opacity-30 blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 h-[600px] w-[600px] -translate-x-1/4 translate-y-1/4 rounded-full bg-blue-900 opacity-40 blur-[100px]"></div>

        {/* Abstract Geometric Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]"></div>

        {/* Angular Accent shape */}
        <div className="absolute left-1/2 top-1/2 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rotate-12 rounded-full border border-white/5"></div>
        <div className="absolute left-1/2 top-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-full border border-white/5"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-xl">
        <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
          <span className="block text-white">Quality</span>
          <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Precision
          </span>
          <span className="block text-white">Confidence</span>
        </h2>

        <div className="mb-8 h-1 w-20 bg-gradient-to-r from-qamaster-secondary to-qamaster-accent"></div>

        <p className="max-w-md text-lg font-light leading-relaxed text-gray-300">
          Enterprise-grade Test Management System engineered for high-performance QA teams. Secure,
          scalable, and built for precision.
        </p>

        <div className="mt-12 flex items-center gap-4 text-sm font-medium text-gray-400">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            Powered by KATALOKA.ID
          </div>
          <span className="text-gray-600">|</span>
          <div>v1.0.0 Enterprise</div>
        </div>
      </div>
    </div>
  );
};
