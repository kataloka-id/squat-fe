
import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Commitments from './components/Commitments';
import Workflow from './components/Workflow';
import Features from './components/Features';
import Pricing from './components/Pricing';
import FinalCTA from './components/FinalCTA';
import Benefits from "@/src/components/Benefits.tsx";
import RegistrationModal from "@/src/components/RegistrationModal.tsx";

const App: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);


    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen flex flex-col selection:bg-sky-100 selection:text-sky-900">
      <Navbar onOpenModal={openModal} />
      <main className="flex-grow">
        <Hero onOpenModal={openModal}/>
                  <Commitments />
          <Benefits />
                <Workflow />
        <Features />
        <Pricing onOpenModal={openModal} />
        <FinalCTA />
      </main>
      <footer className="py-16 border-t border-gray-100 bg-gray-50/50 text-gray-500 text-sm">
        <div className="container mx-auto px-4 lg:px-20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left space-y-4">
              <span className="text-2xl font-extrabold tracking-tight text-gray-900">
                Kata<span className="text-sky-500">loka</span>
              </span>
              <p className="max-w-xs text-gray-500">
                Partner strategis dalam membangun kehadiran digital yang profesional dan berorientasi pada pertumbuhan.
              </p>
            </div>
            <div className="flex gap-8 font-medium">
              <a href="#" className="hover:text-sky-500 transition-colors">Tentang Kami</a>
              <a href="#" className="hover:text-sky-500 transition-colors">Kebijakan Privasi</a>
              <a href="#" className="hover:text-sky-500 transition-colors">Kontak</a>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 text-center">
            <p>&copy; {new Date().getFullYear()} Kataloka. Fokus pada Kualitas, Berorientasi pada Pertumbuhan.</p>
          </div>
        </div>
      </footer>

        {/* Modal Overlay */}
        <RegistrationModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
};

export default App;
