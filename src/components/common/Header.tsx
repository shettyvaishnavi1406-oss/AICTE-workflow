import React, { useState, useEffect } from 'react';
import { Phone, Mail, Globe, ShieldCheck, Clock, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onResetData?: () => void;
  currentRole?: string;
}

export const Header: React.FC<HeaderProps> = ({ onResetData, currentRole = 'Scrutiny Officer / RO' }) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [lang, setLang] = useState<'EN' | 'HI'>('EN');

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
            <div className="hidden sm:flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-gov-saffron-dark" />
                <span>1800-11-2026 / 011-29581000</span>
              </span>
              <span className="text-gov-slate-300">|</span>
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3 text-gov-navy" />
                <span>helpdesk@aicte-india.org</span>
              </span>
            </div>

            {/* Language & Accessibility */}
            <div className="flex items-center gap-2 pl-2 border-l border-gov-slate-300">
              <button
                type="button"
                onClick={() => setLang(lang === 'EN' ? 'HI' : 'EN')}
                className="flex items-center gap-1 font-semibold text-gov-navy hover:text-gov-saffron-dark transition-colors px-1.5 py-0.5 rounded border border-gov-slate-300 bg-white"
                title="Toggle Language"
              >
                <Globe className="w-3 h-3" />
                <span>{lang === 'EN' ? 'हिंदी' : 'English'}</span>
              </button>

              {onResetData && (
                <button
                  type="button"
                  onClick={onResetData}
                  className="hidden md:flex items-center gap-1 text-gov-slate-600 hover:text-gov-navy transition-colors px-1.5 py-0.5 rounded border border-gov-slate-300 bg-white"
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
                अखिल भारतीय तकनीकी शिक्षा परिषद
              </div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gov-navy tracking-tight leading-tight">
                ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
              </h1>
              <div className="text-xs text-gov-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                <span>Statutory Body, Ministry of Education, Govt. of India</span>
                <span className="hidden sm:inline text-gov-slate-300">•</span>
                <span className="inline-flex items-center gap-1 font-medium text-gov-navy-light bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-200">
                  Approval & EVC Management Workflow
                </span>
              </div>
            </div>
          </div>

          {/* Right Portal Badge */}
          <div className="flex items-center gap-3 self-end md:self-center">
            <div className="text-right hidden sm:block">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-gov-slate-500">Official Portal</div>
              <div className="text-sm font-bold text-gov-navy">SARAL-Workflow 2026-27</div>
              <div className="text-xs text-emerald-700 font-medium flex items-center justify-end gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                Authorized Staff Access ({currentRole})
              </div>
            </div>
            <div className="border-l border-gov-slate-200 pl-3">
              <div className="w-10 h-10 rounded-full bg-gov-navy text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-gov-saffron-light/50">
                AI
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
