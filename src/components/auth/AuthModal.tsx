import React, { useState } from 'react';
import { X, ShieldCheck, Lock, Mail, Key, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLES_LIST: Array<{
  role: UserRole;
  name: string;
  email: string;
  description: string;
  badgeColor: string;
}> = [
  {
    role: 'Regional Officer',
    name: 'Dr. Ramesh Chandra',
    email: 'regional.officer@aicte.gov.in',
    description: 'Scrutiny oversight, stage transitions, EVC panel constitution, compliance notices',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    role: 'Scrutiny Officer',
    name: 'Dr. S. K. Sharma',
    email: 'scrutiny@aicte.gov.in',
    description: 'Initial document scrutiny, defect identification, deficiency dispatch',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  {
    role: 'Institution',
    name: 'Prof. Arvind Patil (VIT-MUM-142)',
    email: 'institution@aicte.gov.in',
    description: 'Submit EoA applications, upload compliance undertakings, view own dossier',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  {
    role: 'EVC Member',
    name: 'Prof. (Dr.) Amitabh Mohanty',
    email: 'evc.member@aicte.gov.in',
    description: 'Inspect assigned institutions, verify physical/virtual infrastructure reports',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    role: 'Admin',
    name: 'Chief Regulatory Director',
    email: 'admin@aicte.gov.in',
    description: 'Full statutory governance, user role assignment, audit logs, system maintenance',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200'
  }
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { currentRole, profile, signIn, switchRole, signOut, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'quick' | 'password'>('quick');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both official email and password.');
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);
    const result = await signIn(email, password);
    setIsSubmitting(false);
    if (result.success) {
      onClose();
    } else {
      setErrorMsg(result.error || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleRoleSelect = async (role: UserRole) => {
    await switchRole(role);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-lg shadow-2xl border border-gov-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* National Tricolor Top Accent */}
        <div className="gov-top-accent" />

        {/* Modal Header */}
        <div className="px-6 py-4 bg-gov-navy text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                AICTE Official Authentication & Access Control
              </h2>
              <p className="text-xs text-slate-300">
                Single Sign-On (SSO) & Role-Based Access Control (RBAC)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current User Session Bar */}
        <div className="bg-gov-slate-100 px-6 py-2.5 border-b border-gov-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gov-slate-500 font-medium">Active Identity:</span>
            {isAuthenticated ? (
              <span className="font-semibold text-gov-navy-dark flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {profile?.fullName} ({currentRole})
              </span>
            ) : (
              <span className="text-gov-slate-600 italic flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                Public Guest / Unauthenticated
              </span>
            )}
          </div>
          {isAuthenticated && (
            <button
              type="button"
              onClick={async () => {
                await signOut();
                onClose();
              }}
              className="text-rose-700 hover:text-rose-900 font-semibold underline text-xs"
            >
              Sign Out
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gov-slate-200 bg-gov-slate-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('quick')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
              activeTab === 'quick'
                ? 'border-gov-navy text-gov-navy bg-white font-bold'
                : 'border-transparent text-gov-slate-600 hover:text-gov-navy'
            }`}
          >
            Role Switcher (Phase 1 RBAC Testing)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
              activeTab === 'password'
                ? 'border-gov-navy text-gov-navy bg-white font-bold'
                : 'border-transparent text-gov-slate-600 hover:text-gov-navy'
            }`}
          >
            Sign In with Password
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'quick' && (
            <div className="space-y-3">
              <p className="text-xs text-gov-slate-600 mb-2">
                Select a validated AICTE role below to evaluate least-privilege permissions, interface views, and RLS enforcement:
              </p>

              {ROLES_LIST.map((item) => {
                const isCurrent = currentRole === item.role;
                return (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => handleRoleSelect(item.role)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-all flex items-start justify-between gap-3 ${
                      isCurrent
                        ? 'border-gov-navy bg-blue-50/70 shadow-sm ring-1 ring-gov-navy/20'
                        : 'border-gov-slate-200 hover:border-gov-navy/40 hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${item.badgeColor}`}>
                          {item.role}
                        </span>
                        <span className="text-xs font-bold text-gov-navy">
                          {item.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] bg-emerald-600 text-white font-semibold px-1.5 py-0.2 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gov-slate-500 font-mono">
                        {item.email}
                      </div>
                      <p className="text-xs text-gov-slate-600 pt-0.5">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex-shrink-0 pt-1">
                      <span className="text-xs font-semibold text-gov-navy hover:underline flex items-center gap-1">
                        <UserCheck className="w-4 h-4 text-gov-navy" />
                        Switch
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                  Official Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gov-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. regional.officer@aicte.gov.in"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gov-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gov-navy focus:border-gov-navy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gov-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gov-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gov-navy focus:border-gov-navy"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-gov-navy text-white text-xs font-semibold rounded-md shadow hover:bg-gov-navy-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Portal'}</span>
                </button>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900">
                <strong>Statutory Security Notice:</strong> Passwords must meet AICTE regulatory complexity requirements. All authentication attempts and token refreshes are logged for statutory audit.
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-gov-slate-100 border-t border-gov-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-gov-slate-700 bg-white border border-gov-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
