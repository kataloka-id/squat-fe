import React from 'react';
import { BrandingPanel } from '@/src/components/login/BrandingPanel.tsx';
import { LoginForm } from '@/src/components/login/LoginForm.tsx';

const App: React.FC = () => {
  return (
    <div className="flex h-full w-full flex-col bg-white md:flex-row">
      {/* Left Panel - Login Form
          - Added inner wrapper with min-h-full
          - This fixes the "missing logo" issue in landscape by ensuring flex-centering doesn't clip top content when scrolling
      */}
      <div className="relative z-10 h-full w-full overflow-y-auto bg-white md:w-1/2 lg:w-[45%]">
        <div className="flex min-h-full flex-col items-center justify-center p-6 sm:p-12 lg:p-16">
          <LoginForm />
        </div>
      </div>

      {/* Right Panel - Branding (Hidden on small mobile, visible on desktop/tablet) */}
      <div className="relative hidden h-full overflow-hidden bg-qamaster-dark text-white md:flex md:w-1/2 lg:w-[55%]">
        <BrandingPanel />
      </div>
    </div>
  );
};

export default App;
