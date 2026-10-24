import React, { useState } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Building2, 
  FileText, 
  Send, 
  RefreshCw, 
  Filter, 
  Search,
  ExternalLink,
  ChevronRight,
  Download
} from 'lucide-react';
import { ComplianceRecord } from '../../types';

interface ComplianceViewProps {
  complianceRecords: ComplianceRecord[];
  onUpdateCompliance: (id: string, newStatus: ComplianceRecord['status'], actionRemark: string) => void;
  onOpenTrackModal: (appNum?: string) => void;
}

export const ComplianceView: React.FC<ComplianceViewProps> = ({
  complianceRecords,
  onUpdateCompliance,
  onOpenTrackModal,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterUrgency, setFilterUrgency] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [actionRecord, setActionRecord] = useState<ComplianceRecord | null>(null);
  const [selectedActionStatus, setSelectedActionStatus] = useState<ComplianceRecord['status']>('Notice Dispatched');
  const [actionRemark, setActionRemark] = useState('');

  const filtered = complianceRecords.filter((rec) => {
    const matchesCategory = filterCategory === 'All' || rec.category === filterCategory;
    const matchesUrgency = filterUrgency === 'All' || rec.urgency === filterUrgency;
    const matchesSearch =
      rec.instituteName.toLowerCase().includes(search.toLowerCase()) ||
      rec.applicationNumber.toLowerCase().includes(search.toLowerCase()) ||
      rec.title.toLowerCase().includes(search.toLowerCase());

    return matchesCategory && matchesUrgency && matchesSearch;
  });

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionRecord) return;
    onUpdateCompliance(actionRecord.id, selectedActionStatus, actionRemark || 'Official regulatory compliance update');
    setActionRecord(null);
    setActionRemark('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white rounded-lg border border-gov-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gov-navy bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-amber-900">
                Statutory Compliance Watch
              </span>
              <span className="text-xs text-gov-slate-500">AICTE Regulatory Vigilance</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gov-navy mt-1">
              Document Validity &amp; Institutional Compliance
            </h2>
            <p className="text-xs sm:text-sm text-gov-slate-600 mt-0.5">
              Automated tracking of campus land lease renewals, municipal fire safety clearances, faculty cadre parity, and NBA/NAAC accreditations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded bg-rose-50 text-rose-800 border border-rose-300">
              {complianceRecords.filter(c => c.urgency === 'Critical Expired').length} Critical Expired
            </span>
            <span className="text-xs font-semibold px-3 py-1.5 rounded bg-amber-50 text-amber-800 border border-amber-300">
              {complianceRecords.filter(c => c.urgency === 'Expiring Soon').length} Expiring in 90 Days
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-lg border border-gov-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gov-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by institute name, deed, app no..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gov-slate-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-gov-navy text-gov-slate-900"
            />
          </div>

          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-800 focus:outline-none focus:ring-1 focus:ring-gov-navy"
            >
              <option value="All">All Compliance Categories</option>
              <option value="Land Lease & Title Deed">Land Lease &amp; Title Deed</option>
              <option value="Building Occupancy / Fire NOC">Building Occupancy / Fire NOC</option>
              <option value="Faculty Cadre & AICTE Pay Scales">Faculty Cadre &amp; AICTE Pay Scales</option>
              <option value="NBA / NAAC Accreditation">NBA / NAAC Accreditation</option>
              <option value="Barrier Free Built Environment">Barrier Free Built Environment</option>
            </select>
          </div>

          <div>
            <select
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value)}
              className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-800 focus:outline-none focus:ring-1 focus:ring-gov-navy"
            >
              <option value="All">All Urgency Levels</option>
              <option value="Critical Expired">Critical Expired (Immediate Action)</option>
              <option value="Expiring Soon">Expiring Soon (Under 90 Days)</option>
              <option value="Normal">Normal (Valid)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Compliance Records Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((record) => (
          <div
            key={record.id}
            className={`bg-white rounded-lg border shadow-sm p-4 flex flex-col justify-between transition-all ${
              record.urgency === 'Critical Expired'
                ? 'border-rose-300 bg-rose-50/20'
                : record.urgency === 'Expiring Soon'
                ? 'border-amber-300 bg-amber-50/20'
                : 'border-gov-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-gov-slate-500 uppercase tracking-wide">
                  {record.category}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  record.urgency === 'Critical Expired'
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : record.urgency === 'Expiring Soon'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {record.daysRemaining < 0
                    ? `Expired (${Math.abs(record.daysRemaining)} days ago)`
                    : `${record.daysRemaining} days remaining`}
                </span>
              </div>

              <h3 className="text-sm font-bold text-gov-navy mt-1.5">
                {record.title}
              </h3>

              <div className="text-xs text-gov-slate-700 mt-2 space-y-1">
                <div className="font-semibold text-gov-slate-900">
                  {record.instituteName}
                </div>
                <div className="flex items-center justify-between text-gov-slate-500">
                  <span>Application: {record.applicationNumber}</span>
                  <span>Code: {record.instituteCode}</span>
                </div>
                <div className="flex items-center justify-between text-gov-slate-500">
                  <span>Valid Until: <strong>{record.validUntil}</strong></span>
                  <span>Last Audited: {record.lastAuditDate}</span>
                </div>
              </div>

              <div className={`mt-3 p-2.5 rounded text-xs border ${
                record.urgency === 'Critical Expired'
                  ? 'bg-rose-50 text-rose-900 border-rose-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}>
                <strong>Statutory Action:</strong> {record.actionRequired}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gov-slate-200 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => onOpenTrackModal(record.applicationNumber)}
                className="text-gov-navy hover:underline font-semibold flex items-center gap-1"
              >
                <span>Track Application</span>
                <ExternalLink className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => setActionRecord(record)}
                className="bg-gov-navy hover:bg-gov-navy-light text-white font-semibold px-3 py-1.5 rounded transition-colors"
              >
                Take Regulatory Action
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Regulatory Action Modal */}
      {actionRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-gov-slate-300 w-full max-w-lg overflow-hidden">
            <div className="bg-gov-navy text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-gov-saffron">
              <h3 className="font-bold text-sm">Regulatory Notice / Compliance Update</h3>
              <button
                type="button"
                onClick={() => setActionRecord(null)}
                className="text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleActionSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
              <div>
                <span className="text-xs text-gov-slate-500 font-semibold uppercase">Target Record</span>
                <h4 className="font-bold text-gov-navy mt-0.5">{actionRecord.title}</h4>
                <p className="text-xs text-gov-slate-600">{actionRecord.instituteName} ({actionRecord.applicationNumber})</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                  Update Compliance Status:
                </label>
                <select
                  value={selectedActionStatus}
                  onChange={(e) => setSelectedActionStatus(e.target.value as ComplianceRecord['status'])}
                  className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                >
                  <option value="Notice Dispatched">Notice Dispatched (15-Day Cure Notice)</option>
                  <option value="Renewal Pending">Renewal Pending (Institute Submitted Renewal Copy)</option>
                  <option value="Compliant">Compliant (Verified by Regional Officer)</option>
                  <option value="Non-Compliant">Non-Compliant (Recommend Intake Freeze)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                  Official Order / File Reference:
                </label>
                <textarea
                  rows={3}
                  value={actionRemark}
                  onChange={(e) => setActionRemark(e.target.value)}
                  placeholder="e.g. Issued Memo AICTE/RO-W/COMPL/2026/89 requesting certified municipal NOC."
                  className="w-full bg-white border border-gov-slate-300 rounded p-2 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gov-slate-200">
                <button
                  type="button"
                  onClick={() => setActionRecord(null)}
                  className="px-3 py-1.5 border border-gov-slate-300 rounded text-xs font-semibold text-gov-slate-700 hover:bg-gov-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-gov-navy hover:bg-gov-navy-light text-white rounded text-xs font-semibold shadow-sm"
                >
                  Save Compliance Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
