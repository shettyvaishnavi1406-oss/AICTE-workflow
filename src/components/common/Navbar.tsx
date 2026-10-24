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
  ExternalLink
} from 'lucide-react';

export type NavTab = 'landing' | 'dashboard' | 'applications' | 'evc' | 'compliance' | 'reports' | 'audit';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenTrackModal: () => void;
  counts: {
    applications: number;
    pendingEVC: number;
    complianceAlerts: number;
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenTrackModal,
  counts
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      id: 'landing' as NavTab,
      label: 'Portal Home',
      icon: Home,
      badge: null,
      highlight: false
    },
    {
      id: 'dashboard' as NavTab,
      label: 'Admin Dashboard',
      icon: LayoutDashboard,
      badge: null,
      highlight: false
    },
    {
      id: 'applications' as NavTab,
      label: 'Applications',
      icon: FileText,
      badge: counts.applications > 0 ? counts.applications : null,
      highlight: false
    },
    {
      id: 'evc' as NavTab,
      label: 'EVC Management',
      icon: CalendarClock,
      badge: counts.pendingEVC > 0 ? counts.pendingEVC : null,
      highlight: false
    },
    {
      id: 'compliance' as NavTab,
      label: 'Compliance',
      icon: ShieldAlert,
      badge: counts.complianceAlerts > 0 ? counts.complianceAlerts : null,
      badgeColor: 'bg-amber-500 text-white',
      highlight: false
    },
    {
      id: 'reports' as NavTab,
      label: 'Reports',
      icon: ClipboardCheck,
      badge: null,
      highlight: false
    },
    {
      id: 'audit' as NavTab,
      label: 'Audit Log',
      icon: History,
      badge: null,
      highlight: false
    }
  ];

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
                  className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-t transition-all duration-150 border-b-2 ${
                    isActive
                      ? 'bg-gov-navy-light text-amber-300 border-gov-saffron shadow-inner font-semibold'
                      : 'text-slate-200 hover:text-white hover:bg-gov-navy-hover border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-300'}`} />
                  <span>{item.label}</span>
                  {item.badge !== null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-tight ${
                      item.badgeColor || 'bg-blue-600 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Track Application CTA */}
          <div className="hidden sm:flex items-center space-x-2">
            <button
              type="button"
              onClick={onOpenTrackModal}
              className="flex items-center gap-1.5 bg-gov-saffron hover:bg-gov-saffron-dark text-slate-900 font-semibold text-xs px-3.5 py-1.5 rounded shadow transition-colors border border-amber-400"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Track Application</span>
            </button>

            {activeTab === 'landing' ? (
              <button
                type="button"
                onClick={() => onTabChange('dashboard')}
                className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded transition-colors border border-white/20"
              >
                <span>Go to Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onTabChange('landing')}
                className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded transition-colors border border-white/20"
              >
                <Home className="w-3 h-3" />
                <span>Portal Home</span>
              </button>
            )}
          </div>

          {/* Mobile hamburger menu */}
          <div className="flex lg:hidden items-center justify-between w-full sm:w-auto py-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-amber-300">AICTE Workflow</span>
              <span className="text-xs bg-gov-navy-light px-2 py-0.5 rounded text-slate-300">
                {navItems.find((n) => n.id === activeTab)?.label}
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium ${
                    isActive
                      ? 'bg-gov-navy-light text-amber-300 font-semibold'
                      : 'text-slate-200 hover:bg-gov-navy-hover'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
};
