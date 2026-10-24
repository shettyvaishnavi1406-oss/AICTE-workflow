import React, { useEffect, useState } from 'react';
import { X, History, AlertTriangle, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import { Undertaking, UndertakingEscalation } from '../../types';
import { fetchEscalationHistory, getEscalationBadgeInfo } from '../../services/undertakingsService';

interface EscalationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  undertaking: Undertaking | null;
}

export const EscalationHistoryModal: React.FC<EscalationHistoryModalProps> = ({
  isOpen,
  onClose,
  undertaking
}) => {
  if (!isOpen || !undertaking) return null;

  const [history, setHistory] = useState<UndertakingEscalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchEscalationHistory(undertaking!.id);
        if (isMounted) setHistory(data);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load escalation history.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [undertaking]);

  const badge = getEscalationBadgeInfo(undertaking.escalation_level, undertaking.status);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gov-slate-300 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gov-navy text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-gov-saffron">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-300" />
            <h3 className="font-bold text-sm">Escalation Audit Trail</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs sm:text-sm">
          {/* Undertaking context info */}
          <div className="bg-gov-slate-50 border border-gov-slate-200 rounded p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-gov-slate-500 uppercase tracking-wide">
                {undertaking.compliance_records?.category || 'Regulatory Undertaking'}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badge.badgeClass}`}>
                {badge.label}
              </span>
            </div>
            <h4 className="font-bold text-gov-navy mt-1 text-sm">{undertaking.type}</h4>
            <p className="text-xs text-gov-slate-600 mt-0.5">
              {undertaking.compliance_records?.institute_name} ({undertaking.compliance_records?.application_number})
            </p>
            <div className="text-[11px] text-gov-slate-500 mt-1 flex items-center gap-4">
              <span>Due Date: <strong>{undertaking.due_date}</strong></span>
              <span>Status: <strong className="uppercase">{undertaking.status}</strong></span>
            </div>
          </div>

          {/* Timeline of escalations */}
          <div>
            <h5 className="font-bold text-gov-slate-700 text-xs uppercase tracking-wider mb-2.5">
              Event History Log
            </h5>

            {loading && (
              <div className="py-8 text-center text-gov-slate-500 flex flex-col items-center gap-2">
                <span className="w-5 h-5 border-2 border-gov-navy border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Fetching audit records from Supabase...</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs">
                {error}
              </div>
            )}

            {!loading && !error && history.length === 0 && (
              <div className="py-8 text-center bg-slate-50 border border-dashed border-gov-slate-300 rounded text-gov-slate-500">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                <p className="font-semibold text-xs text-gov-slate-700">No Escalation Events Triggered</p>
                <p className="text-[11px] text-gov-slate-500 mt-0.5">
                  This undertaking has maintained compliance without breach of statutory deadlines.
                </p>
              </div>
            )}

            {!loading && !error && history.length > 0 && (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-gov-slate-200">
                {history.map((event) => (
                  <div key={event.id} className="relative flex items-start gap-3 pl-1">
                    <div className="w-6 h-6 rounded-full bg-gov-navy text-amber-300 flex items-center justify-center flex-shrink-0 z-10 text-[11px] font-bold shadow-xs">
                      {event.new_level === 2 ? 'L2' : 'L1'}
                    </div>

                    <div className="flex-1 bg-white border border-gov-slate-200 rounded p-3 shadow-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-gov-navy">
                          Escalated from Level {event.previous_level} → Level {event.new_level}
                        </span>
                        <span className="text-[10px] text-gov-slate-400">
                          {new Date(event.created_at).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-gov-slate-700 mt-1">
                        {event.escalation_reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-2 border-t border-gov-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-gov-navy hover:bg-gov-navy-light text-white rounded text-xs font-semibold shadow-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
