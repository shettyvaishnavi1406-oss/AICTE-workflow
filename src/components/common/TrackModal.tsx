import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  FileText,
  MapPin,
  ShieldCheck
} from 'lucide-react';
import { Application } from '../../types';

interface TrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  applications: Application[];
  initialAppNumber?: string;
  onOpenDossier: (app: Application) => void;
}

export const TrackModal: React.FC<TrackModalProps> = ({
  isOpen,
  onClose,
  applications,
  initialAppNumber = '',
  onOpenDossier,
}) => {
  const [query, setQuery] = useState(initialAppNumber);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  useEffect(() => {
    if (initialAppNumber) {
      setQuery(initialAppNumber);
      const match = applications.find(
        (a) => a.applicationNumber.toLowerCase() === initialAppNumber.toLowerCase()
      );
      if (match) setSelectedApp(match);
    } else if (applications.length > 0 && !selectedApp) {
      setSelectedApp(applications[0]);
    }
  }, [initialAppNumber, applications]);

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const match = applications.find(
      (a) =>
        a.applicationNumber.toLowerCase().includes(query.trim().toLowerCase()) ||
        a.instituteName.toLowerCase().includes(query.trim().toLowerCase()) ||
        a.instituteCode.toLowerCase().includes(query.trim().toLowerCase())
    );
    if (match) {
      setSelectedApp(match);
    } else {
      alert(`No application found matching "${query}". Try searching "VIT", "Delhi", or "AICTE/2026".`);
    }
  };

  const workflowStages = [
    'Draft',
    'Scrutiny',
    'EVC Visit',
    'SAC Committee',
    'Final EoA Order'
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gov-slate-300 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="bg-gov-navy text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-gov-white">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-amber-300" />
            <h3 className="font-bold text-sm tracking-wide">Track AICTE Application Status</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-4 bg-gov-slate-50 border-b border-gov-slate-200">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gov-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter Application No. (e.g. AICTE/2026/WR/1-938201) or Institute Name..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gov-slate-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-gov-navy text-gov-slate-900"
              />
            </div>
            <button
              type="submit"
              className="bg-gov-white hover:bg-gov-saffron-light text-slate-950 font-bold px-4 py-1.5 rounded text-xs border border-grey-400 shadow-sm"
            >
              Search
            </button>
          </form>

          {/* Quick Click Demo Application Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[11px] text-gov-slate-500">
            <span className="font-semibold">Quick recent lookups:</span>
            {applications.slice(0, 3).map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => {
                  setSelectedApp(app);
                  setQuery(app.applicationNumber);
                }}
                className="px-2 py-0.5 rounded bg-white hover:bg-gov-slate-200 border border-gov-slate-300 text-gov-navy font-mono"
              >
                {app.instituteCode}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Application Status Result */}
        {selectedApp ? (
          <div className="p-5 space-y-4 text-xs sm:text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gov-slate-200 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-gov-navy">
                  {selectedApp.applicationNumber}
                </span>
                <h4 className="font-bold text-base text-gov-slate-900 mt-0.5">
                  {selectedApp.instituteName}
                </h4>
                <div className="text-xs text-gov-slate-500 flex items-center gap-2 mt-0.5">
                  <MapPin className="w-3 h-3 text-gov-slate-400" />
                  <span>{selectedApp.state} ({selectedApp.region} Region)</span>
                </div>
              </div>

              <span className={`badge-stage self-start sm:self-center text-xs px-3 py-1 ${selectedApp.currentStage === 'Approved'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : selectedApp.currentStage === 'Deficiency Issued'
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : 'bg-blue-50 text-blue-800 border-blue-300'
                }`}>
                {selectedApp.currentStage}
              </span>
            </div>

            {/* Workflow Timeline visual */}
            <div>
              <span className="block text-xs font-bold text-gov-slate-700 mb-2">
                Statutory Milestone Progression ({selectedApp.stageProgress}% Completed)
              </span>
              <div className="w-full bg-gov-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gov-navy h-full transition-all duration-300"
                  style={{ width: `${selectedApp.stageProgress}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-gov-slate-500 mt-2">
                {workflowStages.map((stg, i) => (
                  <span key={i} className="font-medium text-center">
                    {stg}
                  </span>
                ))}
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 bg-gov-slate-50 p-3 rounded border border-gov-slate-200 text-xs">
              <div>
                <span className="text-gov-slate-500">Submission Date:</span>
                <p className="font-semibold text-gov-slate-800">{selectedApp.submissionDate}</p>
              </div>
              <div>
                <span className="text-gov-slate-500">Processing Elapsed:</span>
                <p className="font-semibold text-gov-slate-800">{selectedApp.processingDays} Days</p>
              </div>
              <div>
                <span className="text-gov-slate-500">Application Category:</span>
                <p className="font-semibold text-gov-slate-800">{selectedApp.applicationType}</p>
              </div>
              <div>
                <span className="text-gov-slate-500">Proposed Intake:</span>
                <p className="font-semibold text-gov-slate-800">{selectedApp.totalIntakeProposed} Seats</p>
              </div>
            </div>

            {selectedApp.remarks && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
                <strong>Current Status Note:</strong> {selectedApp.remarks}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-gov-slate-500 text-xs">
            Enter an application number above to view real-time scrutiny status.
          </div>
        )}

        {/* Footer Actions */}
        <div className="bg-gov-slate-100 px-5 py-3 border-t border-gov-slate-200 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white border border-gov-slate-300 rounded hover:bg-gov-slate-50 text-gov-slate-700 font-semibold"
          >
            Close
          </button>

          {selectedApp && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDossier(selectedApp);
              }}
              className="inline-flex items-center gap-1.5 bg-gov-navy hover:bg-gov-navy-light text-white font-semibold px-4 py-1.5 rounded transition-colors"
            >
              <span>Open Full Application Dossier</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
