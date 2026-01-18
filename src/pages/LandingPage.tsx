import React, { useState } from 'react';

import Navbar from '@/src/components/Navbar.tsx';
import Hero from '@/src/components/Hero.tsx';
import Commitments from '@/src/components/Commitments.tsx';
import Workflow from '@/src/components/Workflow.tsx';
import Features from '@/src/components/Features.tsx';
import Pricing from '@/src/components/Pricing.tsx';
import FinalCTA from '@/src/components/FinalCTA.tsx';
import Benefits from '@/src/components/Benefits.tsx';
import RegistrationModal from '@/src/components/RegistrationModal.tsx';

const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="flex min-h-screen flex-col selection:bg-sky-100 selection:text-sky-900">
      <Navbar onOpenModal={openModal} />
      <main className="flex-grow">
        <Hero onOpenModal={openModal} />
        {/*<Commitments />*/}
        <Benefits />
        {/*<Workflow />*/}
        <Features />
        <Pricing onOpenModal={openModal} />
        <FinalCTA />
      </main>
      <footer className="border-t border-gray-100 bg-gray-50/50 py-16 text-sm text-gray-500">
        <div className="container mx-auto px-4 lg:px-20">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="space-y-4 text-center md:text-left">
              <span className="text-2xl font-extrabold tracking-tight text-gray-900">
                Kata<span className="text-sky-500">loka</span>
              </span>
              <p className="max-w-xs text-gray-500">
                Partner strategis dalam membangun kehadiran digital yang profesional dan
                berorientasi pada pertumbuhan.
              </p>
            </div>
            <div className="flex gap-8 font-medium">
              <a href="#" className="transition-colors hover:text-sky-500">
                Tentang Kami
              </a>
              <a href="#" className="transition-colors hover:text-sky-500">
                Kebijakan Privasi
              </a>
              <a href="#" className="transition-colors hover:text-sky-500">
                Kontak
              </a>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-200 pt-8 text-center">
            <p>
              &copy; {new Date().getFullYear()} Kataloka. Fokus pada Kualitas, Berorientasi pada
              Pertumbuhan.
            </p>
          </div>
        </div>
      </footer>

      {/* Modal Overlay */}
      <RegistrationModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
};

export default App;
