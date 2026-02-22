import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Refined Geometric Icon - Scaled Up */}
      <svg
        className="animate-scale-in"
        width="48"
        height="48"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="32" height="32" rx="8" fill="#0f0024" />{' '}
        {/* Slightly rounded more for larger size */}
        <path
          d="M16 8L24 16L16 24L8 16L16 8Z"
          fill="url(#paint0_linear)"
          stroke="white"
          strokeWidth="1.5"
        />
        <circle cx="22" cy="22" r="3" fill="#a100ff" stroke="white" strokeWidth="1" />
        <defs>
          <linearGradient
            id="paint0_linear"
            x1="8"
            y1="8"
            x2="24"
            y2="24"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#6C2BD9" />
            <stop offset="1" stopColor="#460073" />
          </linearGradient>
        </defs>
      </svg>

      <div className="flex h-12 flex-col justify-center">
        <span className="mt-1 text-2xl font-bold leading-none tracking-tight text-gray-900">
          SQUAT HUB
        </span>
        <span className="ml-0.5 mt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">
          Workspace
        </span>
      </div>
    </div>
  );
};
