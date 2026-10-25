import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Clock,
  RefreshCw,
  LogOut,
  UserCheck,
  ChevronDown,
  Building2,
  MapPin,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { AuthMode } from '../../types/auth';

interface HeaderProps {
  onResetData?: () => void;
  currentRole?: string;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  userFullName?: string;
  userEmail?: string;
  institutionCode?: string | null;
  region?: string | null;
  authMode?: AuthMode;
  isAuthenticated?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onResetData,
  currentRole = 'Regional Officer',
  onOpenAuth,
  onSignOut,
  userFullName,
  userEmail,
  institutionCode,
  region,
  authMode = 'prototype',
  isAuthenticated = true
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }) + ' IST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="w-full bg-white border-b border-gov-slate-200">
      {/* Top National Tricolor Accent Ribbon */}
      <div className="gov-top-accent" />

      {/* Top Micro Utility Bar */}
      <div className="bg-gov-slate-100 text-gov-slate-700 text-xs border-b border-gov-slate-200 py-1.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-4">
            <span className="font-semibold text-gov-navy-dark tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gov-green"></span>
              भारत सरकार | GOVERNMENT OF INDIA
            </span>
            <span className="hidden md:inline text-gov-slate-400">|</span>
            <span className="hidden md:inline text-gov-slate-600">Ministry of Education</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <div className="hidden lg:flex items-center gap-1 text-gov-slate-600">
              <Clock className="w-3.5 h-3.5 text-gov-navy" />
              <span>{currentTime}</span>
            </div>

            {/* Language & Accessibility */}
            <div className="flex items-center gap-2 pl-2 border-l border-gov-slate-300">
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="flex items-center gap-1 text-gov-navy hover:text-gov-navy-dark font-semibold transition-colors px-2 py-0.5 rounded border border-gov-slate-300 bg-white hover:bg-slate-50 cursor-pointer"
                  title="Switch Role or Sign In"
                >
                  <KeyRound className="w-3.5 h-3.5 text-gov-navy" />
                  <span>{isAuthenticated ? `Role: ${currentRole}` : 'Sign In'}</span>
                </button>
              )}

              {onResetData && (
                <button
                  type="button"
                  onClick={onResetData}
                  className="hidden md:flex items-center gap-1 text-gov-slate-600 hover:text-gov-navy transition-colors px-1.5 py-0.5 rounded border border-gov-slate-300 bg-white cursor-pointer"
                  title="Reload default prototype mock records"
                >
                  <RefreshCw className="w-3 h-3 text-gov-slate-500" />
                  <span>Reset Demo Data</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Institutional Identity Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* AICTE Emblem / Seal Graphic */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-gov-navy to-gov-navy-light flex-shrink-0 flex items-center justify-center shadow-sm border-2 border-amber-500/30 text-amber-300">
              <div className="text-center">
                <div className="text-[9px] font-bold tracking-widest text-amber-400">AICTE</div>
                <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 mx-auto text-amber-300" />
                <div className="text-[7px] text-slate-300 tracking-tighter">ESTD 1945</div>
              </div>
            </div>

            <div>
              <div className="text-xs sm:text-sm font-semibold text-gov-slate-700 tracking-wide">
                स्वचालित विनियमन प्रणाली और एआईसीटीई लाइसेंसिंग
              </div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gov-navy tracking-tight leading-tight">
                System for Automated Regulation and AICTE Licensing
              </h1>
              <div className="text-xs text-gov-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                <span className="hidden sm:inline text-gov-slate-300">•</span>
                <span className="font-medium text-gov-navy">
                  {userFullName ? `Officer: ${userFullName}` : 'National Regulatory Portal'}
                </span>
                {institutionCode && (
                  <span className="text-xs font-semibold px-2 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Inst Code: {institutionCode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Portal Badge & Top-bar Profile Dropdown */}
          <div className="relative self-end md:self-center" ref={menuRef}>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-gov-slate-500">
                  Official Portal
                </div>
                <div className="text-sm font-bold text-gov-navy flex items-center justify-end gap-1">
                  <span>{userFullName || 'SARAL-Workflow 2026-27'}</span>
                </div>
                <div className="text-xs text-emerald-700 font-medium flex items-center justify-end gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                  {isAuthenticated ? (
                    <span className="font-semibold">{currentRole}</span>
                  ) : (
                    <span className="text-slate-500">Guest Visitor</span>
                  )}
                </div>
              </div>

              {/* Profile Avatar Button */}
              <div className="border-l border-gov-slate-200 pl-3">
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="w-10 h-10 rounded-full bg-gov-navy text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-gov-saffron-light/50 hover:bg-gov-navy-dark transition-all cursor-pointer relative"
                  title="Click to view profile & account details"
                  aria-expanded={isProfileMenuOpen}
                >
                  <FontAwesomeIcon icon={faUser} style={{ color: 'rgb(231, 234, 239)' }} />
                  {isAuthenticated && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                  )}
                </button>
              </div>
            </div>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gov-slate-200 z-50 animate-fade-in overflow-hidden">
                {/* User Header */}
                <div className="p-4 bg-gov-slate-50 border-b border-gov-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gov-navy text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                      <FontAwesomeIcon icon={faUser} style={{ color: 'rgb(231, 234, 239)' }} />
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-gov-navy truncate">
                        {userFullName || 'AICTE User'}
                      </h4>
                      <p className="text-[11px] text-gov-slate-600 truncate font-mono">
                        {userEmail || 'user@aicte.gov.in'}
                      </p>
                      <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                          {currentRole}
                        </span>
                        {authMode === 'supabase' ? (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Live Supabase JWT
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                            Prototype Mode
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {(institutionCode || region) && (
                    <div className="mt-3 pt-2.5 border-t border-gov-slate-200/80 text-[11px] text-gov-slate-600 space-y-1">
                      {institutionCode && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-gov-navy" />
                          <span>Institution Code: <strong>{institutionCode}</strong></span>
                        </div>
                      )}
                      {region && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gov-navy" />
                          <span>Jurisdiction: <strong>{region} Region</strong></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Menu Actions */}
                <div className="p-2 space-y-1 text-xs">
                  {onOpenAuth && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onOpenAuth();
                      }}
                      className="w-full text-left px-3 py-2 rounded hover:bg-slate-100 flex items-center justify-between text-gov-slate-700 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-gov-navy" />
                        <span>Switch Demo Account / Role</span>
                      </span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </button>
                  )}

                  {isAuthenticated && onSignOut && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full text-left px-3 py-2 rounded hover:bg-rose-50 text-rose-700 flex items-center gap-2 font-semibold transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
