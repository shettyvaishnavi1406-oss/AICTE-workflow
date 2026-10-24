import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  ShieldCheck, 
  FileCheck2,
  Clock,
  Send,
  Download
} from 'lucide-react';
import { Application, ApplicationStage } from '../../types';

interface ApplicationDetailModalProps {
  application: Application | null;
  onClose: () => void;
  onUpdateStage: (appId: string, newStage: ApplicationStage, remark: string) => void;
  onScheduleEVCModal?: (app: Application) => void;
}

export const ApplicationDetailModal: React.FC<ApplicationDetailModalProps> = ({
  application,
  onClose,
  onUpdateStage,
  onScheduleEVCModal,
}) => {
  if (!application) return null;

  const [selectedStage, setSelectedStage] = useState<ApplicationStage>(application.currentStage);
  const [remarkInput, setRemarkInput] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleStageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarkInput.trim()) {
      alert('Please enter an official scrutiny remark or reason for stage change.');
      return;
    }
    onUpdateStage(application.id, selectedStage, remarkInput.trim());
    setActionSuccess(`Application status successfully updated to "${selectedStage}"`);
    setTimeout(() => {
      setActionSuccess(null);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gov-slate-300 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-gov-navy text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-gov-saffron">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <div className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">
                AICTE Application Dossier
              </div>
              <div className="text-base font-bold flex items-center gap-2">
                <span>{application.applicationNumber}</span>
                <span className="text-xs font-normal text-amber-300">({application.academicYear})</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
          {actionSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Primary Info Header Card */}
          <div className="bg-gov-slate-50 border border-gov-slate-200 rounded-lg p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-gov-slate-500 uppercase tracking-wide">
                  Institution Code: {application.instituteCode}
                </span>
                <h3 className="text-lg font-bold text-gov-navy mt-0.5">
                  {application.instituteName}
                </h3>
                <div className="text-xs text-gov-slate-600 mt-1 flex flex-wrap items-center gap-4">
                  <span><strong>Region:</strong> {application.region} Office</span>
                  <span><strong>State:</strong> {application.state}</span>
                  <span><strong>Type:</strong> {application.applicationType}</span>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-1.5">
                <span className={`badge-stage text-xs px-3 py-1 ${
                  application.currentStage === 'Approved'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : application.currentStage === 'Deficiency Issued'
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : application.currentStage === 'EVC Scheduled'
                    ? 'bg-purple-50 text-purple-800 border-purple-300'
                    : 'bg-blue-50 text-blue-800 border-blue-300'
                }`}>
                  {application.currentStage}
                </span>
                <span className="text-[11px] text-gov-slate-500">
                  Processing Time: <strong>{application.processingDays} days</strong> (Submitted {application.submissionDate})
                </span>
              </div>
            </div>
          </div>

          {/* 3-Column Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-gov-slate-200 rounded p-3 bg-white">
              <div className="text-xs text-gov-slate-500 font-medium">Proposed Intake</div>
              <div className="text-xl font-bold text-gov-navy mt-1">
                {application.totalIntakeProposed} Seats
              </div>
              <div className="text-[11px] text-gov-slate-500 mt-0.5">UG / PG Approved Programs</div>
            </div>

            <div className="border border-gov-slate-200 rounded p-3 bg-white">
              <div className="text-xs text-gov-slate-500 font-medium">Statutory Processing Fee</div>
              <div className="text-xl font-bold text-emerald-700 mt-1">
                ₹ {application.feePaid.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Payment Verified via Bharatkosh</div>
            </div>

            <div className="border border-gov-slate-200 rounded p-3 bg-white">
              <div className="text-xs text-gov-slate-500 font-medium">Compliance Rating</div>
              <div className="text-xl font-bold text-gov-navy mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-gov-saffron-dark" />
                <span>{application.complianceRating}</span>
              </div>
              <div className="text-[11px] text-gov-slate-500 mt-0.5">Based on land &amp; cadre ratios</div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="border border-gov-slate-200 rounded p-4 bg-white">
            <h4 className="font-bold text-gov-navy text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Institutional Contact Person
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-gov-slate-500">Designation &amp; Name:</span>
                <p className="font-semibold text-gov-slate-800 mt-0.5">{application.contactPerson}</p>
              </div>
              <div>
                <span className="text-gov-slate-500">Official Email:</span>
                <p className="font-semibold text-gov-slate-800 mt-0.5 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-gov-slate-400" />
                  {application.contactEmail}
                </p>
              </div>
              <div>
                <span className="text-gov-slate-500">Telephone / Mobile:</span>
                <p className="font-semibold text-gov-slate-800 mt-0.5 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-gov-slate-400" />
                  {application.contactPhone}
                </p>
              </div>
            </div>
          </div>

          {/* Submitted Documents Checklist */}
          <div className="border border-gov-slate-200 rounded p-4 bg-white">
            <h4 className="font-bold text-gov-navy text-xs uppercase tracking-wider mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-gov-navy" />
                Submitted Mandatory Documents &amp; Affidavits ({application.documents.length})
              </span>
              <span className="text-[11px] text-gov-slate-500 font-normal">Scrutiny Verified</span>
            </h4>

            <div className="divide-y divide-gov-slate-200">
              {application.documents.map((doc, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {doc.verified ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    )}
                    <div>
                      <span className="font-medium text-gov-slate-800">{doc.name}</span>
                      <span className="block text-[11px] text-gov-slate-400">Uploaded on {doc.dateUploaded}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      doc.verified
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {doc.verified ? 'Scrutiny Passed' : 'Verification In-Progress'}
                    </span>
                    <button
                      type="button"
                      onClick={() => alert(`Simulating viewing certified document: "${doc.name}"`)}
                      className="text-gov-navy hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Download className="w-3 h-3" />
                      <span>View</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Official Remarks */}
          {application.remarks && (
            <div className="bg-amber-50/70 border border-amber-200 rounded p-3 text-xs text-amber-900">
              <strong>Official Note:</strong> {application.remarks}
            </div>
          )}

          {/* Regional Officer Action Workflow Form */}
          <form onSubmit={handleStageSubmit} className="bg-gov-slate-100 border border-gov-slate-300 rounded-lg p-4 space-y-3">
            <h4 className="font-bold text-gov-navy text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-gov-navy" />
              Regional Officer Workflow Action
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                  Update Application Stage:
                </label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value as ApplicationStage)}
                  className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                >
                  <option value="Scrutiny Pending">Scrutiny Pending</option>
                  <option value="Scrutiny Completed">Scrutiny Completed</option>
                  <option value="EVC Pending">EVC Pending (Schedule Committee)</option>
                  <option value="EVC Scheduled">EVC Scheduled</option>
                  <option value="SAC Review">SAC Review</option>
                  <option value="Approved">Approved (Issue Digital EoA)</option>
                  <option value="Deficiency Issued">Deficiency Issued (Issue Cure Notice)</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                  Official Scrutiny Remarks / Orders:
                </label>
                <input
                  type="text"
                  value={remarkInput}
                  onChange={(e) => setRemarkInput(e.target.value)}
                  placeholder="Enter detailed reason or file order number..."
                  className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gov-slate-200">
              <div className="text-[11px] text-gov-slate-500">
                Action will be recorded in the immutable audit log with staff identity.
              </div>
              <div className="flex items-center gap-2">
                {onScheduleEVCModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onScheduleEVCModal(application);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-3 py-1.5 rounded transition-colors"
                  >
                    Assign EVC Committee
                  </button>
                )}
                <button
                  type="submit"
                  className="bg-gov-navy hover:bg-gov-navy-light text-white font-semibold text-xs px-4 py-1.5 rounded transition-colors shadow-sm"
                >
                  Confirm &amp; Update Stage
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="bg-gov-slate-50 px-6 py-3 border-t border-gov-slate-200 flex items-center justify-between text-xs">
          <span className="text-gov-slate-500">AICTE Approval Process Handbook 2026-27</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-gov-slate-300 rounded hover:bg-gov-slate-100 font-semibold text-gov-slate-700"
          >
            Close Dossier
          </button>
        </div>

      </div>
    </div>
  );
};
