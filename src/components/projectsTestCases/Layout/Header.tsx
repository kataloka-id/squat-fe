import React from 'react';
import { Search, Bell, HelpCircle, ChevronDown, Command } from 'lucide-react';

interface HeaderProps {
  onSearch: (query: string) => void;
  projectTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ onSearch, projectTitle = 'Core Platform V2' }) => {
  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 px-8 flex items-center justify-between">
      {/* Left: Project Selector */}
      <div className="flex items-center gap-6">
        <div className="relative group">
          <button className="flex items-center gap-2 text-slate-700 hover:text-brand-600 transition-colors font-semibold text-sm px-2 py-1.5 -ml-2 rounded-md hover:bg-slate-50">
            <span>{projectTitle}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative hidden md:block w-72 lg:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-brand-500 transition-colors" />
          <input 
            type="text"
            placeholder="Search cases..."
            className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
            onChange={(e) => onSearch(e.target.value)}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1 pointer-events-none">
            <kbd className="hidden sm:inline-block border border-slate-200 rounded px-1.5 text-[10px] font-mono text-slate-400 bg-white shadow-sm">⌘K</kbd>
          </div>
        </div>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-2">
        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
        </button>
        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors hidden sm:block">
          <HelpCircle className="w-5 h-5" />
        </button>
        
        <div className="w-px h-6 bg-slate-200 mx-2"></div>
        
        <button className="flex items-center gap-3 pl-2 py-1 hover:bg-slate-50 rounded-lg pr-3 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-purple-500 p-[1px]">
             <div className="w-full h-full rounded-full bg-white p-[1px]">
               <img 
                 src="https://picsum.photos/seed/alex/100/100" 
                 alt="User" 
                 className="w-full h-full rounded-full object-cover"
               />
             </div>
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-sm font-semibold text-slate-700">Alex Morgan</p>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">QA Lead</p>
          </div>
        </button>
      </div>
    </header>
  );
};