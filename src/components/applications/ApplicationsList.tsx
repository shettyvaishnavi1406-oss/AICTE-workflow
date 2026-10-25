import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  PlusCircle, 
  Download, 
  ExternalLink, 
  Eye, 
  Building2, 
  Calendar, 
  Clock, 
  ChevronRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { Application, ApplicationStage } from '../../types';

interface ApplicationsListProps {
  applications: Application[];
  onSelectApplication: (app: Application) => void;
  onScheduleEVCModal?: (app: Application) => void;
  onOpenNewApplication?: () => void;
}

export const ApplicationsList: React.FC<ApplicationsListProps> = ({
  applications,
  onSelectApplication,
  onScheduleEVCModal,
  onOpenNewApplication,
}) => {
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedStage, setSelectedStage] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');

  const filtered = applications.filter((app) => {
    const matchesSearch =
      app.applicationNumber.toLowerCase().includes(search.toLowerCase()) ||
      app.instituteName.toLowerCase().includes(search.toLowerCase()) ||
      app.instituteCode.toLowerCase().includes(search.toLowerCase()) ||
      app.state.toLowerCase().includes(search.toLowerCase());

    const matchesRegion = selectedRegion === 'All' || app.region === selectedRegion;
    const matchesStage = selectedStage === 'All' || app.currentStage === selectedStage;
    const matchesType = selectedType === 'All' || app.applicationType === selectedType;

    return matchesSearch && matchesRegion && matchesStage && matchesType;
  });

  const exportCSV = () => {
    const headers = ['Application Number', 'Institute Name', 'Code', 'State', 'Region', 'Type', 'Stage', 'Days'];
    const rows = filtered.map((a) => [
      a.applicationNumber,
      `"${a.instituteName}"`,
      a.instituteCode,
      a.state,
      a.region,
      `"${a.applicationType}"`,
      a.currentStage,
      a.processingDays
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AICTE_Applications_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white rounded-lg border border-gov-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gov-navy bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Institutional Registry
              </span>
              <span className="text-xs text-gov-slate-500">Cycle 2026-27</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gov-navy mt-1">
              Applications &amp; Scrutiny Dossiers
            </h2>
            <p className="text-xs sm:text-sm text-gov-slate-600 mt-0.5">
              Comprehensive list of Technical Institutions undergoing AICTE approval, scrutiny, and committee inspection.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenNewApplication && (
              <button
                type="button"
                onClick={onOpenNewApplication}
                className="inline-flex items-center gap-1.5 bg-gov-saffron hover:bg-gov-saffron-dark text-slate-950 text-xs font-bold px-3.5 py-2 rounded shadow-sm border border-amber-400 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Application</span>
              </button>
            )}
            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-gov-slate-100 text-gov-slate-700 text-xs font-semibold px-3.5 py-2 rounded border border-gov-slate-300 shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white rounded-lg border border-gov-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-gov-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, institute name..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gov-slate-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-gov-navy text-gov-slate-900"
            />
          </div>

          {/* Region */}
          <div>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-800 focus:outline-none focus:ring-1 focus:ring-gov-navy"
            >
              <option value="All">All Regions (All Offices)</option>
              <option value="Western">Western Region (Mumbai)</option>
              <option value="Northern">Northern Region (Kanpur)</option>
              <option value="Southern">Southern Region (Chennai)</option>
              <option value="Central">Central Region (Bhopal)</option>
              <option value="Eastern">Eastern Region (Kolkata)</option>
              <option value="South-Western">South-Western Region (Bangalore)</option>
            </select>
          </div>

          {/* Stage */}
          <div>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-800 focus:outline-none focus:ring-1 focus:ring-gov-navy"
            >
              <option value="All">All Statutory Stages</option>
              <option value="Scrutiny Pending">Scrutiny Pending</option>
              <option value="Scrutiny Completed">Scrutiny Completed</option>
              <option value="EVC Pending">EVC Pending</option>
              <option value="EVC Scheduled">EVC Scheduled</option>
              <option value="SAC Review">SAC Review</option>
              <option value="Approved">Approved</option>
              <option value="Deficiency Issued">Deficiency Issued</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Type */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-800 focus:outline-none focus:ring-1 focus:ring-gov-navy"
            >
              <option value="All">All Application Types</option>
              <option value="Extension of Approval (EoA)">Extension of Approval (EoA)</option>
              <option value="New Technical Institution">New Technical Institution</option>
              <option value="Increase in Intake">Increase in Intake</option>
              <option value="Introduction of New Course / Division">Introduction of New Course</option>
            </select>
          </div>
        </div>

        {(search || selectedRegion !== 'All' || selectedStage !== 'All' || selectedType !== 'All') && (
          <div className="mt-3 pt-3 border-t border-gov-slate-200 flex items-center justify-between text-xs">
            <span className="text-gov-slate-600 font-medium">
              Filtered: Showing {filtered.length} of {applications.length} applications
            </span>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedRegion('All');
                setSelectedStage('All');
                setSelectedType('All');
              }}
              className="text-rose-600 hover:underline font-semibold"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Applications Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((app) => (
          <div
            key={app.id}
            onClick={() => onSelectApplication(app)}
            className="bg-white rounded-lg border border-gov-slate-200 shadow-sm hover:shadow-md hover:border-gov-navy transition-all p-4 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-gov-navy">
                  {app.applicationNumber}
                </span>
                <span className={`badge-stage ${
                  app.currentStage === 'Approved'
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
              </div>

              <h3 className="text-sm font-bold text-gov-slate-900 mt-2 line-clamp-2">
                {app.instituteName}
              </h3>

              <div className="text-xs text-gov-slate-600 mt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Region:</span>
                  <span className="font-medium text-gov-slate-800">{app.region} ({app.state})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Category:</span>
                  <span className="font-medium text-gov-slate-800 truncate max-w-[160px]">{app.applicationType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Proposed Intake:</span>
                  <span className="font-semibold text-gov-navy">{app.totalIntakeProposed} Seats</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Statutory Fee:</span>
                  <span className="font-semibold text-emerald-700">₹ {app.feePaid.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {app.isOverdue && (
                <div className="mt-3 p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-800 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-700 flex-shrink-0" />
                  <span>SLA Breached: {app.processingDays} days in review</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gov-slate-200 flex items-center justify-between text-xs">
              <span className="text-gov-slate-500 font-mono">
                {app.documents.filter(d => d.verified).length}/{app.documents.length} Docs Verified
              </span>
              <div className="flex items-center gap-2">
                {onScheduleEVCModal && (app.currentStage === 'EVC Pending' || app.currentStage === 'Scrutiny Completed' || !app.evcAssigned) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onScheduleEVCModal(app);
                    }}
                    className="text-amber-700 hover:text-amber-800 font-semibold px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[11px] transition-colors"
                  >
                    Schedule EVC
                  </button>
                )}
                <button
                  type="button"
                  className="font-bold text-gov-navy hover:text-gov-saffron-dark flex items-center gap-1"
                >
                  <span>Open Dossier</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
