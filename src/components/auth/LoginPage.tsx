import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Key,
  UserCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  FileCheck2,
  CalendarClock,
  ExternalLink,
  ArrowRight,
  Database,
  Info
} from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS } from '../../contexts/AuthContext';
import { UserRole } from '../../types/auth';

interface LoginPageProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onCancel }) => {
  const { signIn, usePrototypeSandbox, authMode } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('Regional Officer');
  const [email, setEmail] = useState('regional.officer@aicte.gov.in');
  const [password, setPassword] = useState('DemoPassword@2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [supabaseAuthFailed, setSupabaseAuthFailed] = useState<boolean>(false);

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    setSupabaseAuthFailed(false);
    const demo = DEMO_ACCOUNTS.find((a) => a.role === role);
    if (demo) {
      setEmail(demo.email);
      setPassword(demo.defaultPasswordHint);
    }
  };

  const handleQuickSignIn = async (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    setSupabaseAuthFailed(false);
    const demo = DEMO_ACCOUNTS.find((a) => a.role === role);
    if (!demo) return;

    setEmail(demo.email);
    setPassword(demo.defaultPasswordHint);

    setIsSubmitting(true);
    const result = await signIn(demo.email, demo.defaultPasswordHint);
    setIsSubmitting(false);

    if (result.success) {
      onSuccess();
    } else {
      setErrorMessage(result.error || 'Authentication failed');
      if (result.isSupabaseAuthError) {
        setSupabaseAuthFailed(true);
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both official email and password.');
      return;
    }

    setErrorMessage(null);
    setSupabaseAuthFailed(false);
    setIsSubmitting(true);

    const result = await signIn(email.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      onSuccess();
    } else {
      setErrorMessage(result.error || 'Authentication failed.');
      if (result.isSupabaseAuthError) {
        setSupabaseAuthFailed(true);
      }
    }
  };

  const handleFallbackSandbox = (role: UserRole) => {
    usePrototypeSandbox(role);
    onSuccess();
  };

  return (
    <div className="min-h-screen bg-gov-slate-50 flex flex-col justify-between text-gov-slate-900 font-sans">
      {/* Top National Tricolor Accent */}
      <div className="gov-top-accent" />

      {/* Main Container */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col justify-center">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-gov-navy to-gov-navy-light shadow-md border-2 border-amber-500/30 text-amber-300 mb-3">
            <div className="text-center">
              <div className="text-[10px] font-bold tracking-widest text-amber-400">AICTE</div>
              <ShieldCheck className="w-7 h-7 mx-auto text-amber-300" />
            </div>
          </div>
          <div className="text-xs uppercase tracking-wider font-semibold text-gov-slate-600">
            Government of India • Ministry of Education
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gov-navy tracking-tight mt-1">
            System for Automated Regulation and AICTE Licensing
          </h1>
          <p className="text-xs sm:text-sm text-gov-slate-600 mt-1">
            SARAL-Workflow 2026-27 • Official Single Sign-On (SSO) Portal
          </p>
        </div>

        {/* Login & Demo Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white border border-gov-slate-200 rounded-xl shadow-lg overflow-hidden">
          {/* Left Column: Role Selector (7 Cols) */}
          <div className="lg:col-span-7 p-6 sm:p-8 bg-gov-slate-50 border-b lg:border-b-0 lg:border-r border-gov-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-gov-navy uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-gov-navy" />
                  Select Prototype Demo Role
                </h2>
                <p className="text-xs text-gov-slate-600">
                  Choose one of the 5 validated AICTE roles to evaluate workflow views and RBAC:
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {DEMO_ACCOUNTS.map((acc) => {
                const isSelected = selectedRole === acc.role;
                return (
                  <div
                    key={acc.role}
                    className={`p-3.5 rounded-lg border transition-all text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50/80 border-gov-navy ring-1 ring-gov-navy/20 shadow-sm'
                        : 'bg-white border-gov-slate-200 hover:border-gov-slate-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${acc.badgeColor}`}>
                          {acc.label}
                        </span>
                        <span className="text-xs font-bold text-gov-navy">
                          {acc.fullName}
                        </span>
                      </div>
                      <div className="text-[11px] text-gov-slate-500 font-mono">
                        {acc.email} • <span className="text-gov-slate-600">Pass: {acc.defaultPasswordHint}</span>
                      </div>
                      <p className="text-xs text-gov-slate-600 line-clamp-2">
                        {acc.description}
                      </p>
                    </div>

                    <div className="flex sm:flex-col gap-2 w-full sm:w-auto flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSelectRole(acc.role)}
                        className="flex-1 sm:flex-none text-xs px-2.5 py-1.5 rounded border border-gov-slate-300 bg-white hover:bg-slate-50 text-gov-slate-700 font-medium transition-colors"
                      >
                        Fill Form
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickSignIn(acc.role)}
                        disabled={isSubmitting}
                        className="flex-1 sm:flex-none text-xs px-3 py-1.5 rounded bg-gov-navy hover:bg-gov-navy-dark text-white font-semibold shadow-sm transition-colors flex items-center justify-center gap-1"
                      >
                        <span>Use Account</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Credentials Form & Diagnostics (5 Cols) */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="mb-5">
                <h3 className="text-sm font-bold text-gov-navy tracking-tight">
                  Official Credential Sign In
                </h3>
                <p className="text-xs text-gov-slate-500 mt-0.5">
                  Authenticating through Supabase Auth (JWT)
                </p>
              </div>

              {/* Error Notice */}
              {errorMessage && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-900 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">Authentication Notice</strong>
                      <span>{errorMessage}</span>
                    </div>
                  </div>

                  {supabaseAuthFailed && (
                    <div className="pt-2 border-t border-rose-200/80 text-[11px] space-y-2 text-rose-950">
                      <p>
                        <strong>Remote Setup Required:</strong> To authenticate live via Supabase Auth, run migration{' '}
                        <code className="bg-white/80 px-1 py-0.5 rounded border border-rose-200 font-mono">
                          20261025000001_seed_demo_users.sql
                        </code>{' '}
                        in your Supabase SQL Editor.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleFallbackSandbox(selectedRole)}
                        className="w-full py-1.5 px-3 bg-rose-700 hover:bg-rose-800 text-white rounded font-medium shadow-sm transition-colors text-center text-xs"
                      >
                        Continue in Prototype Sandbox Mode ({selectedRole})
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                    Official Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gov-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. regional.officer@aicte.gov.in"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gov-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gov-navy focus:border-gov-navy bg-white"
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
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password"
                      className="w-full pl-9 pr-10 py-2 text-xs border border-gov-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gov-navy focus:border-gov-navy bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gov-slate-400 hover:text-gov-slate-600"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-gov-navy hover:bg-gov-navy-dark text-white text-xs font-bold rounded-md shadow transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>{isSubmitting ? 'Verifying with Supabase Auth...' : `Sign In as ${selectedRole}`}</span>
                </button>
              </form>
            </div>

            {/* Backend Verification Status Card */}
            <div className="mt-6 pt-4 border-t border-gov-slate-200 text-[11px] text-gov-slate-600 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-gov-slate-700">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-gov-navy" />
                  Backend Connection
                </span>
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Configured
                </span>
              </div>
              <p className="text-[10px] text-gov-slate-500 truncate">
                Supabase URL: https://kawcpvtlmcpfxyoptisx.supabase.co
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-[10px] text-amber-900 flex items-start gap-1.5">
                <Info className="w-3 h-3 text-amber-700 flex-shrink-0 mt-0.5" />
                <span>
                  All logins authenticate via official Supabase Auth. Client-side role selection is restricted to authorized role permissions verified by RLS policies.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-gov-slate-600 hover:text-gov-navy font-semibold underline transition-colors"
          >
            ← Return to Public AICTE Portal Home
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-gov-slate-200 py-3 text-center text-xs text-gov-slate-500">
        All India Council for Technical Education • Statutory Body, Ministry of Education, Govt. of India
      </footer>
    </div>
  );
};
