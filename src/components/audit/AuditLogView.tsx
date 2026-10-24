import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  User, 
  Clock, 
  FileText,
  Download,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';
import { AuditLogItem, EscalationAuditLog } from '../../types';
import { fetchEscalationAuditLogs } from '../../services/escalationService';

interface AuditLogViewProps {
  auditLogs: AuditLogItem[];
  onOpenTrackModal: (appNum?: string) => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  auditLogs,
  onOpenTrackModal,
}) => {
  const [activeTab, setActiveTab] = useState<'standard' | 'escalation'>('standard');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [escalationLogs, setEscalationLogs] = useState<EscalationAuditLog[]>([]);
  const [isLoadingEscalation, setIsLoadingEscalation] = useState(false);

  const loadEscalationLogs = async () => {
    try {
      setIsLoadingEscalation(true);
      const data = await fetchEscalationAuditLogs();
      setEscalationLogs(data);
    } catch (e) {
      console.error('Failed to load escalation audit logs:', e);
    } finally {
      setIsLoadingEscalation(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'escalation') {
      loadEscalationLogs();
    }
  }, [activeTab]);

  const filtered = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.instituteName.toLowerCase().includes(search.toLowerCase()) ||
      log.applicationNumber.toLowerCase().includes(search.toLowerCase()) ||
      log.actor.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'All' || log.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const filteredEscalation = escalationLogs.filter((log) => {
    const term = search.toLowerCase();
    const matchesSearch =
      log.record_id.toLowerCase().includes(term) ||
      log.rule_identifier.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.reason.toLowerCase().includes(term) ||
      log.recipient_role.toLowerCase().includes(term);

    const matchesRole = roleFilter === 'All' || log.recipient_role === roleFilter;
    return matchesSearch && matchesRole;
  });


  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white rounded-lg border border-gov-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gov-navy bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Statutory Vigilance &amp; Compliance
              </span>
              <span className="text-xs text-gov-slate-500">Immutable Ledger</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gov-navy mt-1">
              Audit Trail &amp; Scrutiny Activity Log
            </h2>
            <p className="text-xs sm:text-sm text-gov-slate-600 mt-0.5">
              Tamper-evident record of all committee formations, stage transitions, deficiency notices, and digital sanction dispatches.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-gov-slate-100 text-gov-slate-700 px-3 py-1.5 rounded border border-gov-slate-300">
              {auditLogs.length} Logged Events
            </span>
          </div>
        </div>
      </div>

      {/* Sub-navigation tabs: Institutional Audit Trail vs Dedicated Escalation Engine Audit */}
      <div className="flex border-b border-gov-slate-200 gap-1 items-center justify-between">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('standard')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t border-b-2 transition-all ${
              activeTab === 'standard'
                ? 'border-gov-navy text-gov-navy bg-white shadow-xs font-bold'
                : 'border-transparent text-gov-slate-500 hover:text-gov-slate-800 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Institutional Activity Trail ({auditLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('escalation')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t border-b-2 transition-all ${
              activeTab === 'escalation'
                ? 'border-gov-navy text-gov-navy bg-white shadow-xs font-bold'
                : 'border-transparent text-gov-slate-500 hover:text-gov-slate-800 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Escalation Engine Audit ({escalationLogs.length})</span>
          </button>
        </div>

        {activeTab === 'escalation' && (
          <button
            type="button"
            onClick={loadEscalationLogs}
            disabled={isLoadingEscalation}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-gov-navy hover:text-gov-navy-light px-2.5 py-1 rounded border border-gov-slate-300 bg-white hover:bg-slate-50 mr-2"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingEscalation ? 'animate-spin text-amber-600' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-lg border border-gov-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gov-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === 'standard' ? "Search audit trail by actor, action, app no..." : "Search escalation ledger by record ID, rule, action, recipient..."}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gov-slate-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-gov-navy text-gov-slate-900"
            />
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-white border border-gov-slate-300 rounded px-3 py-1.5 text-xs text-gov-slate-800 focus:outline-none focus:ring-1 focus:ring-gov-navy"
            >
              <option value="All">All Staff Roles &amp; Automated Triggers</option>
              <option value="Institution">Institution</option>
              <option value="Regional Officer (RO)">Regional Officer (RO)</option>
              <option value="Scrutiny Officer">Scrutiny Officer</option>
              <option value="EVC Chairman">EVC Chairman</option>
              <option value="Member Secretary">Member Secretary</option>
              <option value="System Automated">System Automated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table - Standard View */}
      {activeTab === 'standard' && (
        <div className="bg-white rounded-lg border border-gov-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gov-slate-100 text-gov-slate-700 font-bold border-b border-gov-slate-300">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Authorized Actor</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Application &amp; Institute</th>
                  <th className="py-3 px-4">Details &amp; Audit Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gov-slate-200">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-gov-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-gov-slate-500 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4 font-bold text-gov-slate-900 whitespace-nowrap">
                      {log.actor}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="bg-blue-50 text-gov-navy font-semibold px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                        {log.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gov-navy whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gov-slate-800">{log.instituteName}</div>
                      <button
                        type="button"
                        onClick={() => onOpenTrackModal(log.applicationNumber)}
                        className="font-mono text-[11px] text-gov-slate-500 hover:text-gov-navy hover:underline"
                      >
                        {log.applicationNumber}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-gov-slate-600 max-w-sm">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Escalation Engine Audit Table */}
      {activeTab === 'escalation' && (
        <div className="bg-white rounded-lg border border-gov-slate-200 shadow-sm overflow-hidden">
          {isLoadingEscalation ? (
            <div className="p-8 text-center text-gov-slate-500 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin text-gov-navy mx-auto mb-2" />
              Loading persistent escalation audit ledger from Supabase...
            </div>
          ) : filteredEscalation.length === 0 ? (
            <div className="p-8 text-center text-gov-slate-500 text-xs">
              <ShieldAlert className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <div className="font-bold text-gov-slate-700">No Escalation Audit Events Found</div>
              <p className="text-[11px] mt-1 text-gov-slate-500">
                Trigger the Daily Check on the Dashboard to execute the engine and record events into this immutable ledger.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gov-slate-100 text-gov-slate-700 font-bold border-b border-gov-slate-300">
                    <th className="py-3 px-4">Event Timestamp</th>
                    <th className="py-3 px-4">Record Type &amp; ID</th>
                    <th className="py-3 px-4">Rule</th>
                    <th className="py-3 px-4">Level</th>
                    <th className="py-3 px-4">Recipient Role</th>
                    <th className="py-3 px-4">Deadline Date</th>
                    <th className="py-3 px-4">Action &amp; Reason</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gov-slate-200">
                  {filteredEscalation.map((log) => (
                    <tr key={log.id} className="hover:bg-gov-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-gov-slate-500 whitespace-nowrap">
                        {new Date(log.event_timestamp).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-gov-navy block">{log.record_id}</span>
                        <span className="text-[10px] text-gov-slate-500 uppercase">{log.record_type.replace('_', ' ')}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                          log.rule_identifier === 'R3' || log.rule_identifier === 'U2'
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : log.rule_identifier === 'R2' || log.rule_identifier === 'U1'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-blue-100 text-blue-900 border-blue-300'
                        }`}>
                          {log.rule_identifier}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                        L{log.previous_level} → <span className="font-bold text-gov-navy">L{log.new_level}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="bg-slate-100 text-gov-slate-800 font-medium px-2 py-0.5 rounded border border-slate-300 text-[11px]">
                          {log.recipient_role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-gov-slate-600 whitespace-nowrap">
                        {log.deadline_date}
                      </td>
                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-semibold text-gov-navy">{log.action}</div>
                        <div className="text-[11px] text-gov-slate-600 mt-0.5">{log.reason}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.result_status === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {log.result_status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

