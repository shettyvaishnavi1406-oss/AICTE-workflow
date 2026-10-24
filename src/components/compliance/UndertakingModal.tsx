import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, Building2, AlertCircle } from 'lucide-react';
import { ComplianceRecord, Undertaking, UndertakingStatus } from '../../types';

interface UndertakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: {
    id?: string;
    compliance_record_id: string;
    type: string;
    description: string;
    due_date: string;
    status?: UndertakingStatus;
  }) => Promise<void>;
  complianceRecords: ComplianceRecord[];
  initialRecord?: Undertaking | null;
  defaultComplianceId?: string;
}

const COMMON_UNDERTAKING_TYPES = [
  'Fire Safety NOC & Life Safety Code Submission',
  'Campus Land Lease Renewal & Registry Deed',
  'Faculty Cadre Ratio Parity & Form 16 Affidavit',
  'NBA Self-Assessment Report (SAR) Submission',
  'Divyangjan Barrier-Free Access Certificate',
  'AICTE E-Journal Library Subscription Renewal',
  'Other Statutory Regulatory Commitment'
];

export const UndertakingModal: React.FC<UndertakingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  complianceRecords,
  initialRecord,
  defaultComplianceId
}) => {
  if (!isOpen) return null;

  const [complianceId, setComplianceId] = useState(
    initialRecord?.compliance_record_id || defaultComplianceId || (complianceRecords[0]?.id || '')
  );
  const [type, setType] = useState(initialRecord?.type || COMMON_UNDERTAKING_TYPES[0]);
  const [description, setDescription] = useState(initialRecord?.description || '');
  const [dueDate, setDueDate] = useState(initialRecord?.due_date || '');
  const [status, setStatus] = useState<UndertakingStatus>(initialRecord?.status || 'pending');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialRecord) {
      setComplianceId(initialRecord.compliance_record_id);
      setType(initialRecord.type);
      setDescription(initialRecord.description);
      setDueDate(initialRecord.due_date);
      setStatus(initialRecord.status);
    } else {
      setComplianceId(defaultComplianceId || (complianceRecords[0]?.id || ''));
      setType(COMMON_UNDERTAKING_TYPES[0]);
      setDescription('');
      // Default to 14 days from today
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 14);
      setDueDate(defaultDate.toISOString().split('T')[0]);
      setStatus('pending');
    }
    setErrorMsg(null);
  }, [initialRecord, defaultComplianceId, isOpen, complianceRecords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!complianceId) {
      setErrorMsg('Please select an institutional compliance record.');
      return;
    }
    if (!type.trim()) {
      setErrorMsg('Please specify the undertaking category/type.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please enter detailed commitment notes.');
      return;
    }
    if (!dueDate) {
      setErrorMsg('Please select a valid commitment due date.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        id: initialRecord?.id,
        compliance_record_id: complianceId,
        type: type.trim(),
        description: description.trim(),
        due_date: dueDate,
        status: status
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save undertaking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gov-slate-300 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-gov-navy text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-gov-saffron">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-300" />
            <h3 className="font-bold text-sm">
              {initialRecord ? 'Edit Institutional Undertaking' : 'Record New Formal Undertaking'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Compliance Record Selection */}
          <div>
            <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
              Select Institutional Compliance Record *
            </label>
            <select
              value={complianceId}
              onChange={(e) => setComplianceId(e.target.value)}
              disabled={!!initialRecord}
              className="w-full bg-white border border-gov-slate-300 rounded px-3 py-2 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy disabled:bg-slate-100"
              required
            >
              <option value="">-- Choose Institute / Compliance Item --</option>
              {complianceRecords.map((rec) => (
                <option key={rec.id} value={rec.id}>
                  {rec.instituteName} - {rec.title} ({rec.applicationNumber})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gov-slate-500 mt-1">
              The undertaking will be tied to this institution and regulatory document.
            </p>
          </div>

          {/* Undertaking Type */}
          <div>
            <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
              Undertaking Category / Type *
            </label>
            <input
              type="text"
              list="undertaking-type-options"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g. Fire Safety NOC Submission"
              className="w-full bg-white border border-gov-slate-300 rounded px-3 py-2 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
              required
            />
            <datalist id="undertaking-type-options">
              {COMMON_UNDERTAKING_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          {/* Commitment Description */}
          <div>
            <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
              Official Commitment Details &amp; Justification *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specify the exact commitments made by the institution, receipt references, or remedial timeline..."
              className="w-full bg-white border border-gov-slate-300 rounded p-2 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
              required
            />
          </div>

          {/* Due Date & Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                Commitment Due Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-white border border-gov-slate-300 rounded px-3 py-2 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                  required
                />
              </div>
              <p className="text-[10px] text-gov-slate-500 mt-0.5">
                Overdue undertakings automatically escalate past this date.
              </p>
            </div>

            {initialRecord && (
              <div>
                <label className="block text-xs font-semibold text-gov-slate-700 mb-1">
                  Commitment Status:
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as UndertakingStatus)}
                  className="w-full bg-white border border-gov-slate-300 rounded px-3 py-2 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed (Fulfilled)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gov-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 border border-gov-slate-300 rounded text-xs font-semibold text-gov-slate-700 hover:bg-gov-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-gov-navy hover:bg-gov-navy-light text-white rounded text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{initialRecord ? 'Update Undertaking' : 'Submit Undertaking'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
