import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';

interface NavbarProps {
  onOpenModal: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onOpenModal }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed z-50 w-full transition-all duration-300 ${
        isScrolled
          ? 'border-b border-gray-100 bg-white/95 py-3 shadow-sm backdrop-blur-md'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="container mx-auto flex items-center justify-between px-4 lg:px-20">
        <div className="group flex cursor-pointer items-center gap-1">
          <span className="text-2xl font-black tracking-tighter text-gray-900">
            Kata<span className="text-sky-500">loka</span>
          </span>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          {[
            { name: 'Proses Kerja', link: '#workflow' },
            { name: 'Pendekatan', link: '#features' },
            { name: 'Kerjasama', link: '#partnership' },
          ].map((item) => (
            <a
              key={item.name}
              href={item.link}
              className="text-sm font-bold text-gray-600 transition-colors hover:text-sky-500"
            >
              {item.name}
            </a>
          ))}
          <button
            onClick={onOpenModal}
            className="flex transform items-center gap-2 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-bold text-white transition-all hover:scale-105 hover:bg-sky-600 active:scale-95"
          >
            Mulai Sekarang
            <ArrowRight size={16} />
          </button>
        </div>

        <button
          className="rounded-full bg-gray-50 p-2 text-gray-900 md:hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="animate-in slide-in-from-top-2 absolute left-0 top-full flex w-full flex-col gap-4 border-b border-gray-100 bg-white px-6 py-6 shadow-xl md:hidden">
          <a href="#workflow" className="font-bold text-gray-900" onClick={() => setIsOpen(false)}>
            Proses Kerja
          </a>
          <a href="#features" className="font-bold text-gray-900" onClick={() => setIsOpen(false)}>
            Pendekatan
          </a>
          <a
            href="#partnership"
            className="font-bold text-gray-900"
            onClick={() => setIsOpen(false)}
          >
            Kerjasama
          </a>
          <button
            className="rounded-2xl bg-gray-900 px-6 py-4 text-center font-bold text-white"
            onClick={onOpenModal}
          >
            Mulai Sekarang
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
