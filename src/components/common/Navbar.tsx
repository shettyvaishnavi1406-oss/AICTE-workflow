import React, { useState } from 'react';
import {
  Home,
  LayoutDashboard,
  FileText,
  CalendarClock,
  ShieldAlert,
  ClipboardCheck,
  History,
  Menu,
  X,
  Search,
  ExternalLink,
  KeyRound
} from 'lucide-react';

export type NavTab = 'landing' | 'dashboard' | 'applications' | 'evc' | 'compliance' | 'reports' | 'audit' | 'login';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenTrackModal: () => void;
  counts: {
    applications: number;
    pendingEVC: number;
    complianceAlerts: number;
  };
  currentRole?: string;
  isAuthenticated?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenTrackModal,
  counts,
  currentRole = 'Regional Officer',
  isAuthenticated = true
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allNavItems = [
    {
      id: 'landing' as NavTab,
      label: 'Portal Home',
      icon: Home,
      roles: ['All']
    },
    {
      id: 'dashboard' as NavTab,
      label: currentRole === 'EVC Member' ? 'My Dashboard' : 'Admin Dashboard',
      icon: LayoutDashboard,
      roles: ['Regional Officer', 'Scrutiny Officer', 'Admin', 'Admin / Member Secretary', 'EVC Member']
    },
    {
      id: 'applications' as NavTab,
      label: currentRole === 'Institution' ? 'My Applications' : 'Applications',
      icon: FileText,
      badge: counts.applications > 0 ? counts.applications : null,
      roles: ['Institution', 'Scrutiny Officer', 'Regional Officer', 'Admin', 'Admin / Member Secretary']
    },
    {
      id: 'evc' as NavTab,
      label: 'EVC Management',
      icon: CalendarClock,
      badge: counts.pendingEVC > 0 ? counts.pendingEVC : null,
      roles: ['Regional Officer', 'EVC Member', 'Admin', 'Admin / Member Secretary']
    },
    {
      id: 'compliance' as NavTab,
      label: currentRole === 'Institution' ? 'Compliance & Undertakings' : 'Compliance',
      icon: ShieldAlert,
      badge: counts.complianceAlerts > 0 ? counts.complianceAlerts : null,
      roles: ['Regional Officer', 'Scrutiny Officer', 'Admin', 'Admin / Member Secretary']
    },
    {
      id: 'reports' as NavTab,
      label: 'Reports',
      icon: ClipboardCheck,
      roles: ['Regional Officer', 'Scrutiny Officer', 'Admin', 'Admin / Member Secretary']
    },
    {
      id: 'audit' as NavTab,
      label: 'Audit Log',
      icon: History,
      roles: ['Regional Officer', 'Admin', 'Admin / Member Secretary']
    }
  ];

  // Filter items visible for active role
  const navItems = allNavItems.filter((item) => {
    if (item.roles.includes('All')) return true;
    return item.roles.some((r) => currentRole.includes(r));
  });

  return (
    <nav className="bg-gov-navy text-white shadow-md border-b-2 border-gov-saffron sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-13">
          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-t transition-all duration-150 border-b-2 cursor-pointer ${isActive
                    ? 'bg-gov-navy-light text-amber-300 border-gov-saffron shadow-inner font-semibold'
                    : 'text-slate-200 hover:text-white hover:bg-gov-navy-hover border-transparent'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-300'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Track Application CTA */}
          <div className="hidden sm:flex items-center space-x-2">
            <button
              type="button"
              onClick={onOpenTrackModal}
              className="flex items-center gap-1.5 bg-gov-saffron hover:bg-gov-saffron-dark text-slate-900 font-semibold text-xs px-3.5 py-1.5 rounded shadow transition-colors border border-amber-400 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Track Application</span>
            </button>

            {activeTab === 'landing' ? (
              <button
                type="button"
                onClick={() => onTabChange(currentRole === 'Institution' ? 'applications' : 'dashboard')}
                className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded transition-colors border border-white/20 cursor-pointer"
              >
                <span>{currentRole === 'Institution' ? 'My Applications' : 'Go to Dashboard'}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onTabChange('landing')}
                className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded transition-colors border border-white/20 cursor-pointer"
              >
                <Home className="w-3 h-3" />
                <span>Portal Home</span>
              </button>
            )}

            {!isAuthenticated && (
              <button
                type="button"
                onClick={() => onTabChange('login')}
                className="flex items-center gap-1 bg-amber-400 hover:bg-amber-300 text-gov-navy font-bold text-xs px-3 py-1.5 rounded transition-colors shadow-sm cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>

          {/* Mobile hamburger menu */}
          <div className="flex lg:hidden items-center justify-between w-full sm:w-auto py-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-amber-300">AICTE SARAL</span>
              <span className="text-xs bg-gov-navy-light px-2 py-0.5 rounded text-slate-300">
                {currentRole}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenTrackModal}
                className="bg-gov-saffron text-slate-900 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1"
              >
                <Search className="w-3 h-3" />
                <span>Track</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-300 hover:text-white p-1 rounded hover:bg-gov-navy-hover"
                aria-label="Toggle navigation"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-gov-navy-light space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium cursor-pointer ${isActive
                    ? 'bg-gov-navy-light text-amber-300 font-semibold'
                    : 'text-slate-200 hover:bg-gov-navy-hover'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
};
