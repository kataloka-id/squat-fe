
import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';

interface NavbarProps {
  onOpenModal: () => void;
}

const Navbar: React.FC<NavbarProps> = ({onOpenModal}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);





  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white/95 backdrop-blur-md border-b border-gray-100 py-3 shadow-sm' : 'bg-transparent py-5'
    }`}>
      <div className="container mx-auto px-4 lg:px-20 flex items-center justify-between">
        <div className="flex items-center gap-1 group cursor-pointer">
          <span className="text-2xl font-black tracking-tighter text-gray-900">
            Kata<span className="text-sky-500">loka</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {[
            { name: 'Proses Kerja', link: '#workflow' },
              { name: 'Pendekatan', link: '#features' },
                        { name: 'Kerjasama', link: '#partnership' }
          ].map((item) => (
            <a key={item.name} href={item.link} className="text-gray-600 hover:text-sky-500 font-bold text-sm transition-colors">
              {item.name}
            </a>
          ))}
          <button
            onClick={onOpenModal}
            className="bg-gray-900 hover:bg-sky-600 text-white px-6 py-2.5 rounded-full font-bold text-sm transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            Mulai Sekarang
            <ArrowRight size={16} />
          </button>
        </div>

        <button 
          className="md:hidden p-2 text-gray-900 bg-gray-50 rounded-full"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full md:hidden bg-white border-b border-gray-100 py-6 px-6 flex flex-col gap-4 shadow-xl animate-in slide-in-from-top-2">
          <a href="#workflow" className="text-gray-900 font-bold" onClick={() => setIsOpen(false)}>Proses Kerja</a>
          <a href="#features" className="text-gray-900 font-bold" onClick={() => setIsOpen(false)}>Pendekatan</a>
                    <a href="#partnership" className="text-gray-900 font-bold" onClick={() => setIsOpen(false)}>Kerjasama</a>
          <button

            className="bg-gray-900 text-white px-6 py-4 rounded-2xl font-bold text-center"
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
