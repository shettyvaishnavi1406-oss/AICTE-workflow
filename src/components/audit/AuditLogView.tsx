import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  User, 
  Clock, 
  FileText,
  Download
} from 'lucide-react';
import { AuditLogItem } from '../../types';

interface AuditLogViewProps {
  auditLogs: AuditLogItem[];
  onOpenTrackModal: (appNum?: string) => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  auditLogs,
  onOpenTrackModal,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

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

      {/* Filter Toolbar */}
      <div className="bg-white rounded-lg border border-gov-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gov-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit trail by actor, action, app no..."
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
              <option value="Regional Officer (RO)">Regional Officer (RO)</option>
              <option value="Scrutiny Officer">Scrutiny Officer</option>
              <option value="EVC Chairman">EVC Chairman</option>
              <option value="Member Secretary">Member Secretary</option>
              <option value="System Automated">System Automated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
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
    </div>
  );
};
