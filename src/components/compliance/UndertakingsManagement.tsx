import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Plus,
  RefreshCw,
  History,
  Edit2,
  Calendar,
  ExternalLink,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { ComplianceRecord, Undertaking, UndertakingStatus } from '../../types';
import {
  fetchUndertakings,
  createUndertaking,
  updateUndertaking,
  markUndertakingCompleted,
  triggerEscalationCheck,
  calculateDaysRemaining,
  getDaysOverdue,
  isUndertakingOverdue,
  getEscalationBadgeInfo
} from '../../services/undertakingsService';
import { UndertakingModal } from './UndertakingModal';
import { EscalationHistoryModal } from './EscalationHistoryModal';

interface UndertakingsManagementProps {
  complianceRecords: ComplianceRecord[];
  onOpenTrackModal: (appNum?: string) => void;
  selectedComplianceId?: string | null;
  onClearSelectedCompliance?: () => void;
}

export const UndertakingsManagement: React.FC<UndertakingsManagementProps> = ({
  complianceRecords,
  onOpenTrackModal,
  selectedComplianceId,
  onClearSelectedCompliance
}) => {
  const [undertakings, setUndertakings] = useState<Undertaking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterLevel, setFilterLevel] = useState<string>('All');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Undertaking | null>(null);
  const [historyRecord, setHistoryRecord] = useState<Undertaking | null>(null);

  // Escalation trigger state
  const [isCheckingEscalation, setIsCheckingEscalation] = useState(false);
  const [escalationResult, setEscalationResult] = useState<string | null>(null);

  // Load undertakings
  const loadData = async () => {
    try {
      setLoading(true);
      setDbError(null);
      const data = await fetchUndertakings();
      setUndertakings(data);
    } catch (err: any) {
      console.error('Undertakings load error:', err);
      setDbError(
        err.message ||
          'Failed to load undertakings from Supabase. Ensure migration has been executed in your Supabase SQL editor.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter logic
  const filtered = undertakings.filter((item) => {
    if (selectedComplianceId && item.compliance_record_id !== selectedComplianceId) {
      return false;
    }

    const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
    const matchesLevel =
      filterLevel === 'All' || item.escalation_level.toString() === filterLevel;

    const term = search.toLowerCase();
    const instName = (item.compliance_records?.institute_name || '').toLowerCase();
    const appNum = (item.compliance_records?.application_number || '').toLowerCase();
    const typeStr = (item.type || '').toLowerCase();
    const descStr = (item.description || '').toLowerCase();

    const matchesSearch =
      instName.includes(term) ||
      appNum.includes(term) ||
      typeStr.includes(term) ||
      descStr.includes(term);

    return matchesStatus && matchesLevel && matchesSearch;
  });

  // Action handlers
  const handleSaveUndertaking = async (payload: {
    id?: string;
    compliance_record_id: string;
    type: string;
    description: string;
    due_date: string;
    status?: UndertakingStatus;
  }) => {
    if (payload.id) {
      await updateUndertaking(payload.id, {
        type: payload.type,
        description: payload.description,
        due_date: payload.due_date,
        status: payload.status
      });
    } else {
      await createUndertaking({
        compliance_record_id: payload.compliance_record_id,
        type: payload.type,
        description: payload.description,
        due_date: payload.due_date,
        status: payload.status || 'pending'
      });
    }
    await loadData();
  };

  const handleComplete = async (id: string) => {
    if (window.confirm('Mark this statutory undertaking as completed / fulfilled? Further escalations will cease.')) {
      try {
        await markUndertakingCompleted(id);
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Failed to complete undertaking.');
      }
    }
  };

  const handleRunEscalation = async () => {
    try {
      setIsCheckingEscalation(true);
      setEscalationResult(null);
      const res = await triggerEscalationCheck(0, 7);
      setEscalationResult(res.message);
      await loadData();
      setTimeout(() => {
        setEscalationResult(null);
      }, 5000);
    } catch (err: any) {
      alert(`Escalation run failed: ${err.message}`);
    } finally {
      setIsCheckingEscalation(false);
    }
  };

  // Aggregated stats
  const totalCount = undertakings.length;
  const level1Count = undertakings.filter((u) => u.escalation_level === 1 && u.status !== 'completed' && u.status !== 'cancelled').length;
  const level2Count = undertakings.filter((u) => u.escalation_level === 2 && u.status !== 'completed' && u.status !== 'cancelled').length;
  const completedCount = undertakings.filter((u) => u.status === 'completed').length;

  return (
    <div className="space-y-5">
      {/* Overview Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gov-slate-200 rounded-lg p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-gov-slate-500 uppercase tracking-wide">
            Total Undertakings
          </div>
          <div className="text-xl font-bold text-gov-navy mt-1">{totalCount}</div>
          <div className="text-[10px] text-gov-slate-500 mt-0.5">Persisted in Supabase</div>
        </div>

        <div className="bg-white border border-amber-200 rounded-lg p-3.5 shadow-xs bg-amber-50/20">
          <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide">
            Level 1 Notices
          </div>
          <div className="text-xl font-bold text-amber-700 mt-1">{level1Count}</div>
          <div className="text-[10px] text-amber-700 mt-0.5">Deadline Passed (Overdue)</div>
        </div>

        <div className="bg-white border border-rose-200 rounded-lg p-3.5 shadow-xs bg-rose-50/20">
          <div className="text-[11px] font-semibold text-rose-800 uppercase tracking-wide">
            Level 2 Escalations
          </div>
          <div className="text-xl font-bold text-rose-700 mt-1">{level2Count}</div>
          <div className="text-[10px] text-rose-700 mt-0.5">&gt;= 7 Days Critical Overdue</div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-lg p-3.5 shadow-xs bg-emerald-50/20">
          <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">
            Fulfilled / Cleared
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{completedCount}</div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Compliance Verified</div>
        </div>
      </div>

      {/* Escalation Result Feedback Banner */}
      {escalationResult && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{escalationResult}</span>
          </div>
          <button
            type="button"
            onClick={() => setEscalationResult(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Database Error Banner (No silent localStorage fallback) */}
      {dbError && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-lg text-rose-900 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>Supabase Undertakings Database Connection Notice</span>
          </div>
          <p className="text-xs text-rose-800">
            {dbError}
          </p>
          <div className="bg-white/80 p-2.5 rounded border border-rose-200 text-[11px] text-rose-900 font-mono">
            Apply migration: <strong>supabase/migrations/20261024000000_create_undertakings_and_escalations.sql</strong> in your Supabase project SQL Editor.
          </div>
          <div className="pt-1">
            <button
              type="button"
              onClick={loadData}
              className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Database Fetch</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Compliance Record Filter Filter Tag */}
      {selectedComplianceId && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 px-3.5 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-amber-700" />
            <span>
              Showing undertakings filtered for selected compliance record:{' '}
              <strong>
                {complianceRecords.find((c) => c.id === selectedComplianceId)?.title || selectedComplianceId}
              </strong>
            </span>
          </div>
          {onClearSelectedCompliance && (
            <button
              type="button"
              onClick={onClearSelectedCompliance}
              className="text-xs font-semibold text-amber-800 hover:underline"
            >
              Clear Filter
            </button>
          )}
        </div>
      )}

      {/* Control Bar: Filters, Search, Trigger Escalation & Create Button */}
      <div className="bg-white rounded-lg border border-gov-slate-200 p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gov-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by institute name, commitment type, application no..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gov-slate-300 rounded shadow-xs focus:outline-none focus:ring-1 focus:ring-gov-navy text-gov-slate-900"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-44">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-white border border-gov-slate-300 rounded px-2.5 py-1.5 text-xs text-gov-slate-800 focus:outline-none focus:ring-1 focus:ring-gov-navy"
            >
              <option value="All">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Escalation Level Filter */}
          <div className="w-full sm:w-44">
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="w-full bg-white border border-gov-slate-300 rounded px-2.5 py-1.5 text-xs text-gov-slate-800 focus:outline-none focus:ring-1 focus:ring-gov-navy"
            >
              <option value="All">All Escalation Levels</option>
              <option value="0">Level 0: On Track</option>
              <option value="1">Level 1: Statutory Notice</option>
              <option value="2">Level 2: Critical Overdue</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunEscalation}
              disabled={isCheckingEscalation || loading}
              title="Execute idempotent automated escalation job immediately"
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingEscalation ? 'animate-spin' : ''}`} />
              <span>{isCheckingEscalation ? 'Evaluating...' : 'Test Escalation'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingRecord(null);
                setIsModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-gov-navy hover:bg-gov-navy-light text-white rounded text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Undertaking</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg border border-gov-slate-200 p-12 text-center text-gov-slate-500">
          <div className="w-7 h-7 border-3 border-gov-navy border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-semibold text-gov-slate-700">Connecting to Supabase Database...</p>
          <p className="text-[11px] text-gov-slate-400 mt-0.5">Fetching institutional undertakings and escalation records</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && !dbError && (
        <div className="bg-white rounded-lg border border-dashed border-gov-slate-300 p-12 text-center text-gov-slate-500">
          <FileText className="w-10 h-10 text-gov-slate-400 mx-auto mb-2 opacity-60" />
          <h4 className="font-bold text-sm text-gov-slate-700">No Undertakings Found</h4>
          <p className="text-xs text-gov-slate-500 mt-1 max-w-sm mx-auto">
            {search || filterStatus !== 'All' || filterLevel !== 'All'
              ? 'No commitments match your current search and filter criteria.'
              : 'No formal statutory undertakings are currently on record.'}
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                setEditingRecord(null);
                setIsModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-gov-navy hover:bg-gov-navy-light text-white rounded text-xs font-semibold shadow-xs"
            >
              Record First Undertaking
            </button>
          </div>
        </div>
      )}

      {/* Undertakings Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const daysRemaining = calculateDaysRemaining(item.due_date);
            const isOverdue = isUndertakingOverdue(item.due_date, item.status);
            const daysOverdue = getDaysOverdue(item.due_date);
            const badge = getEscalationBadgeInfo(item.escalation_level, item.status);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-lg border shadow-xs p-4 flex flex-col justify-between transition-all ${
                  item.escalation_level === 2 && item.status !== 'completed' && item.status !== 'cancelled'
                    ? 'border-rose-300 bg-rose-50/15'
                    : item.escalation_level === 1 && item.status !== 'completed' && item.status !== 'cancelled'
                    ? 'border-amber-300 bg-amber-50/15'
                    : 'border-gov-slate-200'
                }`}
              >
                <div>
                  {/* Top Header Tag & Escalation Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-gov-slate-500 uppercase tracking-wide truncate max-w-[200px]">
                      {item.compliance_records?.category || 'Regulatory Compliance'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${badge.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  {/* Undertaking Category / Type Title */}
                  <h3 className="text-sm font-bold text-gov-navy mt-1.5 leading-snug">
                    {item.type}
                  </h3>

                  {/* Institution Details */}
                  <div className="text-xs text-gov-slate-700 mt-2 space-y-0.5">
                    <div className="font-semibold text-gov-slate-900">
                      {item.compliance_records?.institute_name || 'Associated Institution'}
                    </div>
                    <div className="flex items-center justify-between text-gov-slate-500 text-[11px]">
                      <span>App: {item.compliance_records?.application_number || 'N/A'}</span>
                      <span>Code: {item.compliance_records?.institute_code || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Commitment Details Box */}
                  <div className="mt-2.5 p-2.5 bg-gov-slate-50 border border-gov-slate-200 rounded text-xs text-gov-slate-800">
                    <span className="text-[10px] font-bold text-gov-slate-500 uppercase block mb-0.5">
                      Statutory Commitment:
                    </span>
                    <p className="line-clamp-2">{item.description}</p>
                  </div>

                  {/* Deadline & Status Metrics */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gov-slate-100">
                    <div>
                      <span className="text-[10px] text-gov-slate-500 block">Commitment Deadline:</span>
                      <span className="font-bold text-gov-slate-800 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gov-slate-400" />
                        <span>{item.due_date}</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gov-slate-500 block">Status / Timing:</span>
                      {item.status === 'completed' ? (
                        <span className="font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Fulfilled</span>
                        </span>
                      ) : item.status === 'cancelled' ? (
                        <span className="font-bold text-slate-500">Cancelled</span>
                      ) : isOverdue ? (
                        <span className="font-bold text-rose-700 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>{daysOverdue} days overdue</span>
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-700 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{daysRemaining} days left</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-4 pt-3 border-t border-gov-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHistoryRecord(item)}
                      className="text-gov-navy hover:underline font-semibold flex items-center gap-1 text-xs"
                      title="View escalation timeline audit records"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>History</span>
                    </button>

                    {item.compliance_records?.application_number && (
                      <button
                        type="button"
                        onClick={() => onOpenTrackModal(item.compliance_records?.application_number)}
                        className="text-gov-slate-500 hover:text-gov-navy flex items-center gap-1 text-xs"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Dossier</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRecord(item);
                        setIsModalOpen(true);
                      }}
                      className="px-2.5 py-1 border border-gov-slate-300 rounded text-gov-slate-700 hover:bg-gov-slate-100 font-semibold text-xs transition-colors flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    {item.status !== 'completed' && item.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => handleComplete(item.id)}
                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold text-xs shadow-xs transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Mark Fulfilled</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record / Edit Undertaking Modal */}
      <UndertakingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveUndertaking}
        complianceRecords={complianceRecords}
        initialRecord={editingRecord}
        defaultComplianceId={selectedComplianceId || undefined}
      />

      {/* Escalation History Audit Modal */}
      <EscalationHistoryModal
        isOpen={!!historyRecord}
        onClose={() => setHistoryRecord(null)}
        undertaking={historyRecord}
      />
    </div>
  );
};
