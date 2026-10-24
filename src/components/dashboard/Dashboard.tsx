import React, { useState } from 'react';
import {
  FileText,
  CalendarClock,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Search,
  Filter,
  ArrowUpRight,
  ChevronRight,
  Video,
  MapPin,
  ExternalLink,
  History,
  FileBadge,
  Eye
} from 'lucide-react';
import { Application, EVCVisit, ComplianceRecord, AuditLogItem } from '../../types';

interface DashboardProps {
  applications: Application[];
  evcVisits: EVCVisit[];
  complianceRecords: ComplianceRecord[];
  auditLogs: AuditLogItem[];
  onSelectApplication: (app: Application) => void;
  onNavigateTab: (tab: any) => void;
  onOpenTrackModal: (appNum?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  applications,
  evcVisits,
  complianceRecords,
  auditLogs,
  onSelectApplication,
  onNavigateTab,
  onOpenTrackModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [regionFilter, setRegionFilter] = useState<string>('All');

  // Derive metrics dynamically from demo records
  const totalApps = applications.length;
  const inScrutiny = applications.filter((a) => a.currentStage === 'Scrutiny Pending' || a.currentStage === 'Scrutiny Completed').length;
  const evcPendingOrScheduled = applications.filter((a) => a.currentStage === 'EVC Pending' || a.currentStage === 'EVC Scheduled').length;
  const approved = applications.filter((a) => a.currentStage === 'Approved').length;
  const overdueApps = applications.filter((a) => a.isOverdue);
  const criticalCompliance = complianceRecords.filter((c) => c.urgency === 'Critical Expired' || c.urgency === 'Expiring Soon');
  const upcomingEVC = evcVisits.filter((v) => v.status === 'Scheduled');

  // Stage pendency breakdown
  const stages = [
    { label: 'Scrutiny', count: applications.filter(a => a.currentStage.includes('Scrutiny')).length, color: 'bg-[#f5d7b0]' },
    { label: 'EVC Pending', count: applications.filter(a => a.currentStage === 'EVC Pending').length, color: 'bg-[#d15b56]' },
    { label: 'EVC Scheduled', count: applications.filter(a => a.currentStage === 'EVC Scheduled').length, color: 'bg-[#007896]' },
    { label: 'SAC Review', count: applications.filter(a => a.currentStage === 'SAC Review').length, color: 'bg-[#7ba8a3]' },
    { label: 'Approved', count: applications.filter(a => a.currentStage === 'Approved').length, color: 'bg-[#3e909d]' },
    { label: 'Deficiency', count: applications.filter(a => a.currentStage === 'Deficiency Issued').length, color: 'bg-[#c43138]' },
  ];

  // Filtered applications table
  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.instituteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.instituteCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStage = stageFilter === 'All' || app.currentStage === stageFilter;
    const matchesRegion = regionFilter === 'All' || app.region === regionFilter;

    return matchesSearch && matchesStage && matchesRegion;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome & Summary Bar */}
      <div className="bg-white rounded-lg border border-gov-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gov-navy bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Regional Officer Dashboard
              </span>
              <span className="text-xs text-gov-slate-500">Academic Year 2026-27</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gov-navy mt-1">
              AICTE Approval &amp; EVC Executive Overview
            </h2>
            <p className="text-xs sm:text-sm text-gov-slate-600 mt-0.5">
              Real-time monitoring of institutional applications, committee inspection schedules, and regulatory compliance.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onNavigateTab('applications')}
              className="inline-flex items-center gap-1.5 bg-gov-navy hover:bg-gov-navy-light text-white text-xs font-semibold px-3.5 py-2 rounded shadow-sm transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>All Applications ({totalApps})</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('evc')}
              className="inline-flex items-center gap-1.5 bg-gov-saffron hover:bg-gov-saffron-dark text-slate-950 text-xs font-semibold px-3.5 py-2 rounded shadow-sm border border-amber-400 transition-colors"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Schedule EVC</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1 */}
        <div
          onClick={() => onNavigateTab('applications')}
          className="bg-white rounded-lg border border-gov-slate-200 p-4 shadow-sm hover:border-gov-navy cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gov-slate-600">Total Applications</span>
            <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-gov-navy border border-blue-100">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-gov-navy mt-2">{totalApps}</div>
          <div className="text-[11px] text-gov-slate-500 mt-1 flex items-center justify-between">
            <span>Current Approval Cycle</span>
            <span className="font-semibold text-blue-600">100% Active</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div
          onClick={() => {
            setStageFilter('Scrutiny Completed');
            onNavigateTab('applications');
          }}
          className="bg-white rounded-lg border border-gov-slate-200 p-4 shadow-sm hover:border-gov-navy cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gov-slate-600">In Scrutiny</span>
            <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-700 border border-indigo-100">
              <FileBadge className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-indigo-900 mt-2">{inScrutiny}</div>
          <div className="text-[11px] text-gov-slate-500 mt-1 flex items-center justify-between">
            <span>Document verification</span>
            <span className="font-semibold text-indigo-600">RO Desk</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div
          onClick={() => onNavigateTab('evc')}
          className="bg-white rounded-lg border border-gov-slate-200 p-4 shadow-sm hover:border-gov-navy cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gov-slate-600">EVC Visits</span>
            <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center text-amber-700 border border-amber-100">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-800 mt-2">{evcPendingOrScheduled}</div>
          <div className="text-[11px] text-amber-700 mt-1 flex items-center justify-between">
            <span>{upcomingEVC.length} upcoming visits</span>
            <span className="font-bold">EVC Roster</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div
          onClick={() => onNavigateTab('applications')}
          className="bg-white rounded-lg border border-gov-slate-200 p-4 shadow-sm hover:border-gov-navy cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gov-slate-600">Approvals Granted</span>
            <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center text-emerald-700 border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-2">{approved}</div>
          <div className="text-[11px] text-emerald-800 mt-1 flex items-center justify-between">
            <span>EoA Issued</span>
            <span className="font-semibold">Digital Seal</span>
          </div>
        </div>

        {/* Metric 5 */}
        <div
          onClick={() => onNavigateTab('compliance')}
          className="bg-white rounded-lg border border-gov-slate-200 p-4 shadow-sm hover:border-gov-navy cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gov-slate-600">SLA / Alerts</span>
            <div className="w-8 h-8 rounded bg-rose-50 flex items-center justify-center text-rose-700 border border-rose-100">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-700 mt-2">
            {overdueApps.length + criticalCompliance.length}
          </div>
          <div className="text-[11px] text-rose-700 mt-1 flex items-center justify-between">
            <span>{overdueApps.length} overdue SLA</span>
            <span className="font-bold">{criticalCompliance.length} Expiring</span>
          </div>
        </div>
      </div>

      {/* Stage-Wise Pendency Breakdown */}
      <div className="bg-white rounded-lg border border-gov-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-gov-navy">Stage-Wise Application Pendency</h3>
            <p className="text-xs text-gov-slate-500">Distribution across statutory verification milestones</p>
          </div>
          <span className="text-xs text-gov-slate-600 font-mono">Total in pipeline: {totalApps}</span>
        </div>

        {/* Progress Bar Visual */}
        <div className="w-full h-3 rounded-full bg-gov-slate-100 overflow-hidden flex mb-4">
          {stages.map((stage) => {
            const pct = (stage.count / totalApps) * 100;
            if (stage.count === 0) return null;
            return (
              <div
                key={stage.label}
                style={{ width: `${pct}%` }}
                className={`${stage.color} h-full transition-all`}
                title={`${stage.label}: ${stage.count} (${pct.toFixed(0)}%)`}
              />
            );
          })}
        </div>

        {/* Stage Legend and Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stages.map((stage) => (
            <button
              key={stage.label}
              type="button"
              onClick={() => {
                setStageFilter(stage.label === 'Scrutiny' ? 'Scrutiny Completed' : stage.label);
              }}
              className="p-2.5 rounded bg-gov-slate-50 hover:bg-gov-slate-100 border border-gov-slate-200 text-left transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${stage.color}`}></span>
                <span className="text-xs text-gov-slate-600 truncate">{stage.label}</span>
              </div>
              <div className="text-lg font-bold text-gov-navy mt-1">{stage.count}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Split Section: Upcoming EVC Visits & Compliance Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upcoming EVC Committee Visits (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-gov-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-gov-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-gov-navy" />
              <h3 className="text-sm font-bold text-gov-navy">Upcoming EVC Committee Visits</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('evc')}
              className="text-xs text-gov-navy font-semibold hover:text-gov-saffron-dark flex items-center gap-1"
            >
              <span>Manage EVC Roster</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-gov-slate-200">
            {evcVisits.map((visit) => (
              <div key={visit.id} className="p-4 hover:bg-gov-slate-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gov-navy">{visit.visitCode}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${visit.visitMode === 'Virtual Video EVC'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                        {visit.visitMode}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${visit.status === 'Scheduled'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}>
                        {visit.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-gov-slate-900 mt-1">
                      {visit.instituteName}
                    </h4>

                    <div className="text-xs text-gov-slate-600 mt-1 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gov-slate-400" />
                        {visit.city}, {visit.state}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gov-slate-400" />
                        {visit.visitDate} ({visit.visitTime})
                      </span>
                    </div>

                    <div className="text-xs text-gov-slate-500 mt-1.5">
                      <strong>Committee Chair:</strong> {visit.chairman}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2 flex-shrink-0">
                    {visit.meetingLink && (
                      <a
                        href={visit.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold bg-gov-navy text-white px-2.5 py-1 rounded hover:bg-gov-navy-light transition-colors"
                      >
                        <Video className="w-3 h-3 text-amber-300" />
                        <span>Join Video EVC</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenTrackModal(visit.applicationNumber)}
                      className="text-xs text-gov-navy hover:underline font-medium"
                    >
                      View App
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-gov-slate-50 border-t border-gov-slate-200 text-center text-xs text-gov-slate-500">
            Official EVC protocol requires geotagged photographic and live video evidence.
          </div>
        </div>

        {/* Right Column: Overdue & Compliance Alerts (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-gov-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-gov-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-700" />
              <h3 className="text-sm font-bold text-gov-navy">Overdue &amp; Compliance Alerts</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('compliance')}
              className="text-xs text-gov-navy font-semibold hover:text-gov-saffron-dark flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-gov-slate-200 p-2 space-y-2">
            {/* Overdue Application Alerts */}
            {overdueApps.map((app) => (
              <div
                key={app.id}
                onClick={() => onSelectApplication(app)}
                className="p-3 rounded border border-rose-200 bg-rose-50/50 hover:bg-rose-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                    SLA Breached ({app.processingDays} Days)
                  </span>
                  <span className="text-[11px] font-mono text-gov-slate-500">{app.applicationNumber}</span>
                </div>
                <div className="font-bold text-xs text-gov-slate-900 mt-1">{app.instituteName}</div>
                <div className="text-[11px] text-rose-900 mt-0.5">{app.remarks}</div>
              </div>
            ))}

            {/* Expiring Lease / Fire Safety Alerts */}
            {criticalCompliance.slice(0, 2).map((comp) => (
              <div
                key={comp.id}
                onClick={() => onNavigateTab('compliance')}
                className="p-3 rounded border border-amber-200 bg-amber-50/50 hover:bg-amber-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${comp.urgency === 'Critical Expired'
                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                    {comp.urgency} ({comp.daysRemaining > 0 ? `${comp.daysRemaining} days remaining` : 'Expired'})
                  </span>
                  <span className="text-[10px] text-gov-slate-500">{comp.category}</span>
                </div>
                <div className="font-bold text-xs text-gov-slate-900 mt-1">{comp.instituteName}</div>
                <div className="text-[11px] text-amber-900 mt-0.5">{comp.actionRequired}</div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-gov-slate-50 border-t border-gov-slate-200 text-center text-xs">
            <button
              type="button"
              onClick={() => onNavigateTab('compliance')}
              className="text-gov-navy font-semibold hover:underline"
            >
              Review all {complianceRecords.length} document validity records
            </button>
          </div>
        </div>
      </div>

      {/* Searchable Application Table with Filters */}
      <div className="bg-white rounded-lg border border-gov-slate-200 shadow-sm overflow-hidden">
        {/* Table Filter Controls */}
        <div className="p-4 border-b border-gov-slate-200 bg-gov-slate-50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-gov-navy">Applications Register 2026-27</h3>
              <p className="text-xs text-gov-slate-600">Showing {filteredApps.length} of {applications.length} applications</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Box */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-gov-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search app no., college..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gov-slate-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-gov-navy text-gov-slate-900"
                />
              </div>

              {/* Stage Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-gov-slate-500 font-medium">Stage:</span>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="bg-white border border-gov-slate-300 rounded px-2 py-1.5 text-xs text-gov-slate-800 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                >
                  <option value="All">All Stages</option>
                  <option value="Scrutiny Pending">Scrutiny Pending</option>
                  <option value="Scrutiny Completed">Scrutiny Completed</option>
                  <option value="EVC Pending">EVC Pending</option>
                  <option value="EVC Scheduled">EVC Scheduled</option>
                  <option value="SAC Review">SAC Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Deficiency Issued">Deficiency Issued</option>
                </select>
              </div>

              {/* Region Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-gov-slate-500 font-medium">Region:</span>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="bg-white border border-gov-slate-300 rounded px-2 py-1.5 text-xs text-gov-slate-800 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                >
                  <option value="All">All Regions</option>
                  <option value="Western">Western (Mumbai)</option>
                  <option value="Northern">Northern (Kanpur)</option>
                  <option value="Southern">Southern (Chennai)</option>
                  <option value="Central">Central (Bhopal)</option>
                  <option value="Eastern">Eastern (Kolkata)</option>
                  <option value="South-Western">South-Western (Bangalore)</option>
                </select>
              </div>

              {(searchTerm || stageFilter !== 'All' || regionFilter !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setStageFilter('All');
                    setRegionFilter('All');
                  }}
                  className="text-xs text-gov-slate-600 hover:text-rose-600 font-medium underline px-1"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Applications Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gov-slate-100 text-gov-slate-700 font-bold border-b border-gov-slate-300">
                <th className="py-3 px-4">Application No.</th>
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4">Region / State</th>
                <th className="py-3 px-4">Application Type</th>
                <th className="py-3 px-4">Current Stage</th>
                <th className="py-3 px-4 text-center">Days</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gov-slate-200">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gov-slate-500">
                    No applications match the active filters.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                    onClick={() => onSelectApplication(app)}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-gov-navy whitespace-nowrap">
                      {app.applicationNumber}
                      {app.isOverdue && (
                        <span className="ml-1.5 text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-200">
                          Overdue
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-gov-slate-900 max-w-xs truncate">
                      {app.instituteName}
                      <span className="block text-[11px] text-gov-slate-500 font-normal">
                        Code: {app.instituteCode}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gov-slate-700 whitespace-nowrap">
                      {app.region} ({app.state})
                    </td>
                    <td className="py-3 px-4 text-gov-slate-700 whitespace-nowrap">
                      {app.applicationType}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`badge-stage ${app.currentStage === 'Approved'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : app.currentStage === 'Deficiency Issued'
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : app.currentStage === 'EVC Scheduled'
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : app.currentStage === 'EVC Pending'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-blue-50 text-blue-800 border-blue-300'
                        }`}>
                        {app.currentStage}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-gov-slate-700">
                      {app.processingDays} d
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectApplication(app)}
                          className="px-2.5 py-1 text-xs font-semibold text-gov-navy bg-white hover:bg-gov-slate-100 border border-gov-slate-300 rounded shadow-sm"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenTrackModal(app.applicationNumber)}
                          className="p-1 text-gov-slate-500 hover:text-gov-navy"
                          title="Quick Track"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity and Audit History */}
      {/* <div className="bg-white rounded-lg border border-gov-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-gov-navy" />
            <h3 className="text-sm font-bold text-gov-navy">Recent Activity &amp; Audit Trail</h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('audit')}
            className="text-xs text-gov-navy font-semibold hover:text-gov-saffron-dark flex items-center gap-1"
          >
            <span>Full Audit Log</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-gov-slate-200">
          {auditLogs.slice(0, 4).map((log) => (
            <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <div className="flex items-start sm:items-center gap-2">
                <span className="font-semibold text-gov-navy-dark">{log.action}:</span>
                <span className="text-gov-slate-700">{log.instituteName}</span>
                <span className="font-mono text-gov-slate-400">({log.applicationNumber})</span>
              </div>
              <div className="flex items-center gap-3 text-gov-slate-500 flex-shrink-0">
                <span className="bg-gov-slate-100 px-1.5 py-0.5 rounded text-[11px] font-medium text-gov-slate-700">
                  {log.actor} ({log.role})
                </span>
                <span className="text-[11px] text-gov-slate-400">{log.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div> */}
    </div>
  );
};
