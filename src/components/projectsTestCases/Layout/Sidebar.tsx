import React, { useState } from 'react';
import {
  FileText, 
  PlayCircle, 
  BarChart2, 
  Settings, 
  Briefcase,
  Users,
  Layers,
  LogOut
} from 'lucide-react';
import {AuthService} from '@/src/api/auth.service.ts';
import {useNavigate} from 'react-router-dom';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { id: 'projects', icon: Briefcase, label: 'Projects' },
    { id: 'test-cases', icon: FileText, label: 'Test Cases' },
    { id: 'runs', icon: PlayCircle, label: 'Test Runs' },
    { id: 'reports', icon: BarChart2, label: 'Reports' },
    { id: 'team', icon: Users, label: 'Team' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await AuthService.postAuthLogout();
    } catch (error) {
      console.error('Logout API failed', error);
    } finally {
      navigate('/login');
    }
  };

  return (
    <aside
      className={`flex flex-col bg-slate-900 text-slate-300 transition-all duration-300 ease-in-out ${collapsed ? 'w-20' : 'w-72'} group/sidebar relative sticky top-0 z-30 h-screen overflow-hidden border-r border-slate-800 shadow-xl`}
    >
      {/* Brand - Click to Toggle Sidebar */}
      <div
        className={`flex h-20 items-center ${collapsed ? 'justify-center px-2' : 'px-6'} flex-shrink-0 border-b border-slate-800/50 transition-all duration-300`}
      >
        <div
          className={`flex w-full cursor-pointer select-none items-center overflow-hidden ${collapsed ? 'justify-center' : ''}`}
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <div className="flex-shrink-0 rounded-xl bg-brand-600 p-2 shadow-glow transition-transform duration-200">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <span
            className={`overflow-hidden whitespace-nowrap text-lg font-bold tracking-tight text-white transition-all duration-300 ${collapsed ? 'max-w-0 opacity-0' : 'ml-3 max-w-[200px] opacity-100'}`}
          >
            SQUAT
          </span>
        </div>
      </div>

      {/* Menu */}
      <nav className="custom-scrollbar flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-3 py-6">
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative flex w-full items-center ${collapsed ? 'justify-center px-0 py-3' : 'px-3 py-3'} group rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-brand-600 font-medium text-white shadow-glow'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              } `}
            >
              <item.icon
                className={`h-5 w-5 flex-shrink-0 transition-all duration-200 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'} `}
              />

              <span
                className={`overflow-hidden whitespace-nowrap text-sm transition-all duration-300 ${collapsed ? 'max-w-0 opacity-0' : 'ml-3 max-w-[200px] opacity-100'}`}
              >
                {item.label}
              </span>

              {/* Active Indicator Dot (Expanded only) */}
              <div
                className={`absolute right-2 h-1.5 w-1.5 rounded-full bg-white shadow-sm transition-all duration-300 ${isActive && !collapsed ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
              ></div>

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="animate-in fade-in slide-in-from-left-2 pointer-events-none absolute left-full top-1/2 z-50 ml-4 -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100">
                  {item.label}
                  {/* Tiny arrow pointing left */}
                  <div className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 transform border-b border-l border-slate-700 bg-slate-900"></div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* User / Footer */}
      <div className="mb-2 flex-shrink-0 border-t border-slate-800/50 p-3">
        <button
          onClick={handleLogout}
          className={`relative flex w-full items-center ${collapsed ? 'justify-center px-0 py-3' : 'px-3 py-3'} group rounded-xl text-slate-400 transition-all duration-200 hover:bg-slate-800/50 hover:text-red-400`}
          title="Sign Out"
        >
          <LogOut className={`h-5 w-5 flex-shrink-0 transition-colors`} />

          <span
            className={`overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300 ${collapsed ? 'max-w-0 opacity-0' : 'ml-3 max-w-[200px] opacity-100'}`}
          >
            Sign Out
          </span>

          {collapsed && (
            <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-4 -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
              Sign Out
              <div className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 transform border-b border-l border-slate-700 bg-slate-900"></div>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
