import React, { useState } from 'react';
import {
  FileText, 
  PlayCircle, 
  BarChart2, 
  Settings, 
  Briefcase,
  Users,
  LogOut
} from 'lucide-react';
import {AuthService} from '@/src/api/auth.service.ts';
import {useNavigate} from 'react-router-dom';
import { useSessionUser } from '@/src/auth/SessionContext.tsx';
import { CompanyLogo } from '@/src/components/company/CompanyLogo.tsx';

interface SidebarProps {
  currentView: string;
  // eslint-disable-next-line no-unused-vars -- this is a TypeScript callback parameter, not a runtime binding.
  onNavigate: (view: string) => void;
}

const userInitials = (name: string) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');

  return initials.toUpperCase() || 'U';
};

const roleLabel = (role: string) => role
  .split(/[_-]/)
  .filter(Boolean)
  .map((part) => part.toLowerCase() === 'qa' ? 'QA' : `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
  .join(' ') || 'User';

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const [collapsed, setCollapsed] = useState(false);
  const sessionUser = useSessionUser();
  const company = sessionUser?.company;
  const companyName = company?.name?.trim() || 'Company';
  const userName = sessionUser?.username?.trim() || sessionUser?.email || 'Current user';
  const userRole = roleLabel(sessionUser?.roleSlug ?? '');
  const userCompany = company?.name?.trim();
  const currentUserTooltip = `${userName} · ${userRole}`;

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
      <div className={`flex flex-shrink-0 ${collapsed ? 'justify-center p-3' : 'px-3 pb-2 pt-3'}`}>
        <button
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className={`flex items-center text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${collapsed ? 'h-11 w-11 justify-center rounded-xl bg-transparent px-0 hover:bg-slate-800' : 'min-h-[88px] w-full rounded-2xl border border-slate-700/80 bg-slate-800/70 px-4 shadow-sm hover:bg-slate-800'}`}
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <div className={`flex flex-shrink-0 items-center justify-center overflow-hidden bg-slate-900 ${collapsed ? 'h-8 w-8 rounded-lg p-1' : 'h-14 w-14 rounded-xl p-2'}`}>
            <CompanyLogo company={company} className="h-full w-full" />
          </div>
          <span
            className={`truncate whitespace-nowrap font-bold tracking-tight text-white transition-all duration-300 ${collapsed ? 'max-w-0 text-lg opacity-0' : 'ml-4 max-w-[180px] text-lg opacity-100'}`}
          >
            {companyName}
          </span>
        </button>
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

      {/* Account controls stay visible while the navigation menu scrolls. */}
      <div className="mb-2 flex-shrink-0 border-t border-slate-800/50 p-3">
        <section
          className={`group/user relative flex items-center ${collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-3'} rounded-xl text-left`}
          aria-label={`Current user: ${currentUserTooltip}${userCompany ? `, ${userCompany}` : ''}`}
          title={collapsed ? currentUserTooltip : undefined}
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow-sm" aria-hidden="true">
            {userInitials(userName)}
          </span>
          <div className={`min-w-0 flex-1 overflow-hidden transition-all duration-300 ${collapsed ? 'max-w-0 opacity-0' : 'max-w-[180px] opacity-100'}`}>
            <p className="truncate text-sm font-semibold text-white">{userName}</p>
            <p className="truncate text-xs text-slate-400">{userRole}</p>
            {userCompany && <p className="truncate text-xs text-slate-500">{userCompany}</p>}
          </div>

          {collapsed && (
            <div role="tooltip" className="pointer-events-none absolute bottom-0 left-full z-50 ml-4 w-max max-w-56 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity group-hover/user:opacity-100">
              <p className="truncate">{userName}</p>
              <p className="truncate text-slate-400">{userRole}</p>
              {userCompany && <p className="truncate text-slate-500">{userCompany}</p>}
              <div className="absolute -left-1 bottom-3 h-2 w-2 rotate-45 transform border-b border-l border-slate-700 bg-slate-900"></div>
            </div>
          )}
        </section>

        <div className="my-2 border-t border-slate-800" />
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
