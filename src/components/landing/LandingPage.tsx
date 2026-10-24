import React, { useState } from 'react';
import { 
  ArrowRight, 
  Search, 
  ShieldAlert, 
  FileCheck2, 
  CalendarClock, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Info,
  Scale,
  Users,
  Award,
  ChevronRight,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { Application, EVCVisit, ComplianceRecord } from '../../types';

interface LandingPageProps {
  onOpenDashboard: () => void;
  onOpenTrackModal: (appNum?: string) => void;
  onViewCompliance: () => void;
  onViewApplications: () => void;
  onViewEVC: () => void;
  applications: Application[];
  evcVisits: EVCVisit[];
  complianceRecords: ComplianceRecord[];
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenDashboard,
  onOpenTrackModal,
  onViewCompliance,
  onViewApplications,
  onViewEVC,
  applications,
  evcVisits,
  complianceRecords,
}) => {
  const [quickSearchInput, setQuickSearchInput] = useState('');

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearchInput.trim()) {
      onOpenTrackModal(quickSearchInput.trim());
    } else {
      onOpenTrackModal();
    }
  };

  // Derive counts from real demo state
  const totalApps = applications.length;
  const approvedApps = applications.filter((a) => a.currentStage === 'Approved').length;
  const pendingEVC = applications.filter((a) => a.currentStage === 'EVC Pending' || a.currentStage === 'EVC Scheduled').length;
  const urgentCompliance = complianceRecords.filter((c) => c.urgency === 'Critical Expired' || c.urgency === 'Expiring Soon').length;

  return (
    <div className="min-h-screen bg-gov-slate-50 text-gov-slate-900">
      {/* Notice Banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-gov-saffron-dark flex-shrink-0" />
            <span>
              <strong>Demonstration Prototype:</strong> AICTE SARAL Approval, Scrutiny & Expert Visit Committee Management System (Cycle 2026-27). All sample records are loaded in local sandbox mode.
            </span>
          </div>
          <span className="hidden md:inline-block font-mono text-[11px] bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded font-semibold">
            Member 1 Verified
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-gov-slate-100 border-b border-gov-slate-200 pt-10 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-gov-navy border border-blue-200">
                <Scale className="w-3.5 h-3.5 text-gov-navy" />
                <span>Statutory AICTE Approval Process 2026-27</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gov-navy tracking-tight leading-tight">
                AICTE Approval &amp; Compliance Portal
              </h1>

              <p className="text-base sm:text-lg text-gov-slate-600 leading-relaxed max-w-2xl">
                Unified digital portal for engineering and technical institutions across India. Streamline institutional application tracking, scrutiny verification, Expert Visit Committee (EVC) scheduling, and statutory compliance monitoring in one transparent workflow.
              </p>

              {/* Primary & Secondary Action CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onOpenDashboard}
                  className="inline-flex items-center gap-2 bg-gov-navy hover:bg-gov-navy-light text-white font-semibold text-sm px-6 py-3 rounded-md shadow-md transition-all border border-gov-navy-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gov-navy"
                >
                  <span>Open Dashboard</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenTrackModal()}
                  className="inline-flex items-center gap-2 bg-white hover:bg-gov-slate-50 text-gov-navy font-semibold text-sm px-5 py-3 rounded-md border border-gov-slate-300 shadow-sm transition-colors hover:border-gov-navy"
                >
                  <Search className="w-4 h-4 text-gov-saffron-dark" />
                  <span>Track Application</span>
                </button>

                <button
                  type="button"
                  onClick={onViewCompliance}
                  className="inline-flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-sm px-5 py-3 rounded-md border border-amber-300 shadow-sm transition-colors"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  <span>View Compliance ({urgentCompliance} Alerts)</span>
                </button>
              </div>

              {/* Instant Application Number Quick Search */}
              <form onSubmit={handleQuickSearchSubmit} className="pt-2 max-w-xl">
                <label htmlFor="quickSearch" className="block text-xs font-semibold text-gov-slate-700 mb-1">
                  Quick Search Application by ID or College Name:
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gov-slate-400 absolute left-3 top-3" />
                    <input
                      id="quickSearch"
                      type="text"
                      value={quickSearchInput}
                      onChange={(e) => setQuickSearchInput(e.target.value)}
                      placeholder="e.g. AICTE/2026/WR/1-938201 or Vidyalankar"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gov-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gov-navy focus:border-gov-navy text-gov-slate-900"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-gov-saffron hover:bg-gov-saffron-dark text-slate-950 font-bold px-4 py-2 rounded-md text-sm border border-amber-400 shadow-sm transition-colors"
                  >
                    Track
                  </button>
                </div>
              </form>
            </div>

            {/* Right Hero Live Snapshot Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-lg border-2 border-gov-slate-200 shadow-md p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-gov-navy via-gov-saffron to-gov-green"></div>
                
                <div className="flex items-center justify-between pb-4 border-b border-gov-slate-200">
                  <div>
                    <span className="text-[11px] font-bold tracking-wider uppercase text-gov-slate-500">Live Portal State</span>
                    <h3 className="text-base font-bold text-gov-navy">Cycle 2026-27 Overview</h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                    Active Cycle
                  </span>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-3.5 my-4">
                  <div 
                    onClick={onViewApplications}
                    className="bg-gov-slate-50 hover:bg-blue-50/60 p-3.5 rounded border border-gov-slate-200 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gov-slate-500 font-medium">Total Applications</span>
                      <FileText className="w-4 h-4 text-gov-navy group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="text-2xl font-bold text-gov-navy mt-1">{totalApps}</div>
                    <div className="text-[11px] text-gov-slate-500 mt-0.5 flex items-center gap-1">
                      <span>Across 6 regions</span>
                      <ChevronRight className="w-3 h-3 text-gov-slate-400" />
                    </div>
                  </div>

                  <div 
                    onClick={onViewEVC}
                    className="bg-gov-slate-50 hover:bg-amber-50/60 p-3.5 rounded border border-gov-slate-200 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gov-slate-500 font-medium">EVC Visits</span>
                      <CalendarClock className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="text-2xl font-bold text-gov-navy mt-1">{evcVisits.length}</div>
                    <div className="text-[11px] text-amber-700 font-medium mt-0.5 flex items-center gap-1">
                      <span>{pendingEVC} pending/scheduled</span>
                      <ChevronRight className="w-3 h-3 text-amber-500" />
                    </div>
                  </div>

                  <div 
                    onClick={onViewApplications}
                    className="bg-gov-slate-50 hover:bg-emerald-50/60 p-3.5 rounded border border-gov-slate-200 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gov-slate-500 font-medium">Approvals Issued</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="text-2xl font-bold text-emerald-700 mt-1">{approvedApps}</div>
                    <div className="text-[11px] text-gov-slate-500 mt-0.5">Digitally countersigned</div>
                  </div>

                  <div 
                    onClick={onViewCompliance}
                    className="bg-gov-slate-50 hover:bg-rose-50/60 p-3.5 rounded border border-gov-slate-200 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gov-slate-500 font-medium">Compliance Alerts</span>
                      <ShieldAlert className="w-4 h-4 text-rose-600 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="text-2xl font-bold text-rose-700 mt-1">{urgentCompliance}</div>
                    <div className="text-[11px] text-rose-600 font-medium mt-0.5">Statutory notices due</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gov-slate-200 flex items-center justify-between text-xs text-gov-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-gov-navy" />
                    SLA Window: 45 Days per AICTE APH
                  </span>
                  <button
                    type="button"
                    onClick={onOpenDashboard}
                    className="text-gov-navy font-bold hover:text-gov-saffron-dark flex items-center gap-0.5"
                  >
                    <span>Full Analytics</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Compact Service Overview (4 Core Pillars) */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Integrated Institutional Services
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-gov-navy mt-2">
            AICTE Regulatory Services &amp; Workflow Modules
          </h2>
          <p className="text-sm text-gov-slate-600 mt-2">
            Standardized end-to-end administration for technical universities, polytechnics, and engineering institutes according to the AICTE Approval Process Handbook (APH).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Approval Workflow */}
          <div className="bg-white rounded-lg border border-gov-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-md bg-blue-50 text-gov-navy flex items-center justify-center font-bold mb-4 border border-blue-200">
                <FileCheck2 className="w-5 h-5 text-gov-navy" />
              </div>
              <h3 className="text-base font-bold text-gov-navy mb-2">Approval Workflow</h3>
              <p className="text-xs text-gov-slate-600 leading-relaxed">
                Stage-wise tracking from Application Submission, Scrutiny Verification, Deficiency Curing to Standing Appellate Committee (SAC) approval and digital EoA letter dispatch.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-gov-slate-700">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Extension of Approval (EoA)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>New Technical Institution Setup</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Intake Expansion &amp; New Courses</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={onViewApplications}
              className="mt-5 text-xs font-semibold text-gov-navy hover:text-gov-saffron-dark flex items-center justify-between pt-3 border-t border-gov-slate-100"
            >
              <span>Explore Applications</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: EVC Visits */}
          <div className="bg-white rounded-lg border border-gov-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-md bg-amber-50 text-amber-800 flex items-center justify-center font-bold mb-4 border border-amber-200">
                <CalendarClock className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="text-base font-bold text-gov-navy mb-2">EVC Visits</h3>
              <p className="text-xs text-gov-slate-600 leading-relaxed">
                Expert Visit Committee roster assignment, physical on-site inspections, geotagged video streaming, and rapid electronic verification report collation.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-gov-slate-700">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Verified Subject Expert Roster</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Virtual Video EVC Option</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Standardized Scoring Sheets</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={onViewEVC}
              className="mt-5 text-xs font-semibold text-gov-navy hover:text-gov-saffron-dark flex items-center justify-between pt-3 border-t border-gov-slate-100"
            >
              <span>View EVC Schedules</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 3: Compliance Monitoring */}
          <div className="bg-white rounded-lg border border-gov-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-md bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold mb-4 border border-emerald-200">
                <ShieldAlert className="w-5 h-5 text-emerald-700" />
              </div>
              <h3 className="text-base font-bold text-gov-navy mb-2">Compliance</h3>
              <p className="text-xs text-gov-slate-600 leading-relaxed">
                Rigorous monitoring of faculty cadre ratios (1:2:6), AICTE 7th CPC salary scales, NBA/NAAC accreditation validity, and barrier-free campus infrastructure.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-gov-slate-700">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cadre Ratio Automated Checks</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Divyangjan Accessibility Audits</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Digital Deficiency Cure Tracking</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={onViewCompliance}
              className="mt-5 text-xs font-semibold text-gov-navy hover:text-gov-saffron-dark flex items-center justify-between pt-3 border-t border-gov-slate-100"
            >
              <span>Audit Compliance Status</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 4: Document Validity */}
          <div className="bg-white rounded-lg border border-gov-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-md bg-rose-50 text-rose-800 flex items-center justify-center font-bold mb-4 border border-rose-200">
                <Building2 className="w-5 h-5 text-rose-700" />
              </div>
              <h3 className="text-base font-bold text-gov-navy mb-2">Document Validity</h3>
              <p className="text-xs text-gov-slate-600 leading-relaxed">
                Automated expiry tracking for 30-year land lease deeds, municipal building occupancy certificates, fire safety NOCs, and pollution clearance records.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-gov-slate-700">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>90 / 60 / 30 Day Pre-Expiry Alerts</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Municipal Fire Safety Register</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Campus Title Deed Audit</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={onViewCompliance}
              className="mt-5 text-xs font-semibold text-gov-navy hover:text-gov-saffron-dark flex items-center justify-between pt-3 border-t border-gov-slate-100"
            >
              <span>Review Expiring Deeds</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Regional Office Network & Statutory Guidelines */}
      <section className="bg-white border-t border-b border-gov-slate-200 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="border border-gov-slate-200 rounded p-4 bg-gov-slate-50">
              <h4 className="font-bold text-gov-navy flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-gov-saffron-dark" />
                Regional Jurisdiction
              </h4>
              <p className="text-xs text-gov-slate-600 leading-relaxed">
                Administered via 8 AICTE Regional Offices: Northern (Kanpur), Western (Mumbai), Southern (Chennai), Eastern (Kolkata), Central (Bhopal), South-Western (Bangalore), North-West (Chandigarh) and South-Central (Hyderabad).
              </p>
            </div>

            <div className="border border-gov-slate-200 rounded p-4 bg-gov-slate-50">
              <h4 className="font-bold text-gov-navy flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-gov-navy" />
                Approval Process Handbook (APH)
              </h4>
              <p className="text-xs text-gov-slate-600 leading-relaxed">
                Enforces statutory timelines, processing fees, mandatory disclosure norms, land requirements and faculty cadre distribution as per AICTE Regulations 2026.
              </p>
            </div>

            <div className="border border-gov-slate-200 rounded p-4 bg-gov-slate-50">
              <h4 className="font-bold text-gov-navy flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-emerald-700" />
                Institutional Transparency
              </h4>
              <p className="text-xs text-gov-slate-600 leading-relaxed">
                Immutable audit trail with cryptographic timestamps for scrutiny remarks, expert scorecards, and committee recommendations accessible to authorized stakeholders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gov-navy-dark text-slate-300 py-8 px-4 sm:px-6 lg:px-8 border-t-2 border-gov-saffron text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="font-bold text-sm text-white">All India Council for Technical Education (AICTE)</div>
            <div className="text-slate-400 mt-1">Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070 | Government of India</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Prototype demonstration for academic & regulatory workflow simulation.</div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <button type="button" onClick={onOpenDashboard} className="hover:text-amber-300 transition-colors">
              Staff Dashboard
            </button>
            <span className="text-slate-600">•</span>
            <button type="button" onClick={() => onOpenTrackModal()} className="hover:text-amber-300 transition-colors">
              Application Status
            </button>
            <span className="text-slate-600">•</span>
            <button type="button" onClick={onViewCompliance} className="hover:text-amber-300 transition-colors">
              Compliance Watch
            </button>
            <span className="text-slate-600">•</span>
            <span className="text-amber-400 font-medium">SARAL Portal v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
