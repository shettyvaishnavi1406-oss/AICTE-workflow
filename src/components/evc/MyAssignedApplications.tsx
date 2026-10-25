import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  CalendarClock,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Video,
  MapPin,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileCheck2,
  Users,
  Building2,
  Info,
  Calendar,
  Layers,
  History,
  X
} from 'lucide-react';
import {
  EVCAssignedApplication,
  EVCAssignmentStatus,
  EVCAssignmentsSummary,
  AuditLogItem
} from '../../types';
import { evcAssignmentService } from '../../services/evcAssignmentService';
import {
  EVC_ALERT_CONFIG,
  EVC_STATUS_STYLES,
  STATUTORY_EVC_NOTICE
} from '../../lib/evcConstants';

interface MyAssignedApplicationsProps {
  userFullName?: string;
  userEmail?: string;
  userRole?: string;
  onOpenReportModal?: (visitId: string) => void;
  allAuditLogs?: AuditLogItem[];
}

export const MyAssignedApplications: React.FC<MyAssignedApplicationsProps> = ({
  userFullName = 'Prof. (Dr.) Amitabh Mohanty',
  userEmail = 'evc.member@aicte.gov.in',
  userRole = 'EVC Member',
  onOpenReportModal,
  allAuditLogs = []
}) => {
  // Data state
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<EVCAssignedApplication[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [summary, setSummary] = useState<EVCAssignmentsSummary>({
    totalAssigned: 0,
    upcoming: 0,
    pending: 0,
    reportDue: 0,
    overdue: 0,
    completed: 0
  });

  // Filter and search state
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Sorting state
  const [sortBy, setSortBy] = useState<'deadline' | 'assignedDate' | 'ageing'>('deadline');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Detail drawer / modal state
  const [selectedApp, setSelectedApp] = useState<EVCAssignedApplication | null>(null);

  // Fetch summary and assignments
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryRes, assignmentsRes] = await Promise.all([
        evcAssignmentService.getMyAssignmentsSummary(userFullName, userRole),
        evcAssignmentService.getMyAssignments(
          {
            status: statusFilter,
            region: regionFilter,
            applicationType: typeFilter,
            search: searchTerm,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            sortBy,
            sortOrder,
            page: currentPage,
            pageSize
          },
          userFullName,
          userRole
        )
      ]);

      setSummary(summaryRes);
      setAssignments(assignmentsRes.data);
      setTotalCount(assignmentsRes.total);
    } catch (err: any) {
      console.error('Failed to load assigned applications:', err);
      setError(err?.message || 'Failed to load assigned applications.');
    } finally {
      setLoading(false);
    }
  }, [
    userFullName,
    userRole,
    statusFilter,
    regionFilter,
    typeFilter,
    searchTerm,
    startDate,
    endDate,
    sortBy,
    sortOrder,
    currentPage
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Detail View click & audit logging
  const handleViewDetails = async (app: EVCAssignedApplication) => {
    setSelectedApp(app);
    // Statutory requirement 7: Log every view/access of application details by EVC member to audit trail
    try {
      await evcAssignmentService.logDossierAccess(
        app.applicationNumber,
        app.instituteName,
        userFullName
      );
    } catch (e) {
      console.warn('Audit log write error:', e);
    }
  };

  // Close detail view
  const handleCloseDetails = () => {
    setSelectedApp(null);
  };

  // Filter summary cards shortcuts
  const handleCardClick = (statusKey: string) => {
    setStatusFilter(statusKey);
    setCurrentPage(1);
  };

  // Check for visits scheduled within the next 7 days for the top alert banner
  const upcomingSevenDayVisits = useMemo(() => {
    return assignments.filter(a => {
      if (!a.visitDate || a.status === 'Completed') return false;
      const today = new Date();
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const visitDateObj = new Date(a.visitDate).getTime();
      const diffDays = Math.round((visitDateObj - todayMidnight) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= EVC_ALERT_CONFIG.UPCOMING_BANNER_DAYS;
    });
  }, [assignments]);

  // Filter audit logs for selected application
  const appAuditLogs = useMemo(() => {
    if (!selectedApp) return [];
    return allAuditLogs.filter(
      l => l.applicationNumber === selectedApp.applicationNumber
    );
  }, [selectedApp, allAuditLogs]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* 1. Header & Identity Context */}
      <div className="bg-white rounded-lg border border-gov-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                EVC Committee Inspection Desk
              </span>
              <span className="text-xs text-gov-slate-500">Authorized Panel Scoped View</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gov-navy mt-1">
              My Assigned Applications
            </h2>
            <p className="text-xs sm:text-sm text-gov-slate-600 mt-0.5">
              Consolidated, role-scoped registry of technical institution applications assigned to{' '}
              <strong className="text-gov-navy">{userFullName}</strong> for physical on-site and virtual video inspection.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Read-Only Dossier Access</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Banner for Visits Scheduled in the Next 7 Days (Configurable Threshold) */}
      {upcomingSevenDayVisits.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-gov-saffron p-4 rounded-r-lg shadow-xs flex items-start gap-3">
          <Clock className="w-5 h-5 text-gov-saffron-dark flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="text-xs text-amber-950">
            <div className="font-bold text-sm text-amber-900 flex items-center gap-2">
              <span>Upcoming Inspections Alert ({upcomingSevenDayVisits.length} within {EVC_ALERT_CONFIG.UPCOMING_BANNER_DAYS} days)</span>
            </div>
            <p className="mt-0.5">
              You have inspection panels scheduled within the next {EVC_ALERT_CONFIG.UPCOMING_BANNER_DAYS} days. Please review the submitted institutional proofs, scrutiny remarks, and ensure panel concurrence before commencing verification.
            </p>
            <div className="mt-2 flex items-center gap-2 flex-wrap font-medium">
              {upcomingSevenDayVisits.map(v => (
                <span
                  key={v.id}
                  onClick={() => handleViewDetails(v)}
                  className="bg-white/80 hover:bg-white text-gov-navy px-2.5 py-1 rounded border border-amber-300 text-[11px] cursor-pointer inline-flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3 text-gov-saffron-dark" />
                  <span>{v.instituteName} ({v.visitDate})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Summary Cards at Top */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Assigned */}
        <div
          onClick={() => handleCardClick('All')}
          className={`p-4 rounded-lg border transition-all cursor-pointer ${
            statusFilter === 'All'
              ? 'bg-gov-navy text-white shadow-md border-gov-navy'
              : 'bg-white hover:bg-gov-slate-50 border-gov-slate-200 text-gov-slate-800'
          }`}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Total Assigned</div>
          <div className="text-2xl font-bold mt-1">{summary.totalAssigned}</div>
          <div className="text-[10px] mt-0.5 opacity-70">All assigned panels</div>
        </div>

        {/* Visit Scheduled / Upcoming */}
        <div
          onClick={() => handleCardClick('Upcoming')}
          className={`p-4 rounded-lg border transition-all cursor-pointer ${
            statusFilter === 'Upcoming'
              ? 'bg-blue-700 text-white shadow-md border-blue-700'
              : 'bg-white hover:bg-blue-50/50 border-blue-200 text-blue-900'
          }`}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Visit Upcoming</div>
          <div className="text-2xl font-bold mt-1 text-blue-600">{summary.upcoming}</div>
          <div className="text-[10px] mt-0.5 text-blue-700">Scheduled ahead</div>
        </div>

        {/* Visit Pending */}
        <div
          onClick={() => handleCardClick('Pending')}
          className={`p-4 rounded-lg border transition-all cursor-pointer ${
            statusFilter === 'Pending'
              ? 'bg-slate-700 text-white shadow-md border-slate-700'
              : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800'
          }`}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Visit Pending</div>
          <div className="text-2xl font-bold mt-1 text-slate-600">{summary.pending}</div>
          <div className="text-[10px] mt-0.5 text-slate-500">Date unscheduled</div>
        </div>

        {/* Report Pending */}
        <div
          onClick={() => handleCardClick('Report Due')}
          className={`p-4 rounded-lg border transition-all cursor-pointer ${
            statusFilter === 'Report Due'
              ? 'bg-amber-600 text-white shadow-md border-amber-600'
              : 'bg-white hover:bg-amber-50 border-amber-300 text-amber-900'
          }`}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Report Pending</div>
          <div className="text-2xl font-bold mt-1 text-amber-600">{summary.reportDue}</div>
          <div className="text-[10px] mt-0.5 text-amber-700">Visit done, report due</div>
        </div>

        {/* Overdue */}
        <div
          onClick={() => handleCardClick('Overdue')}
          className={`p-4 rounded-lg border transition-all cursor-pointer ${
            statusFilter === 'Overdue'
              ? 'bg-rose-700 text-white shadow-md border-rose-700'
              : 'bg-white hover:bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Overdue</div>
          <div className="text-2xl font-bold mt-1 text-rose-600">{summary.overdue}</div>
          <div className="text-[10px] mt-0.5 text-rose-700">Past prescribed EVC</div>
        </div>

        {/* Completed */}
        <div
          onClick={() => handleCardClick('Completed')}
          className={`p-4 rounded-lg border transition-all cursor-pointer ${
            statusFilter === 'Completed'
              ? 'bg-emerald-700 text-white shadow-md border-emerald-700'
              : 'bg-white hover:bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Completed</div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">{summary.completed}</div>
          <div className="text-[10px] mt-0.5 text-emerald-700">Report submitted</div>
        </div>
      </div>

      {/* 4. Filter, Search, and Sort Bar */}
      <div className="bg-white rounded-lg border border-gov-slate-200 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="md:col-span-1">
            <label className="block text-gov-slate-600 font-semibold mb-1">Search Applications:</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gov-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Application ID, Institute, Code..."
                className="w-full bg-white border border-gov-slate-300 rounded pl-8 pr-3 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-gov-slate-600 font-semibold mb-1">Status:</label>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-gov-slate-300 rounded px-2.5 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
            >
              <option value="All">All Statuses</option>
              <option value="Upcoming">Visit Upcoming</option>
              <option value="Pending">Visit Pending</option>
              <option value="Report Due">Report Due</option>
              <option value="Overdue">Overdue</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Region Filter */}
          <div>
            <label className="block text-gov-slate-600 font-semibold mb-1">Region:</label>
            <select
              value={regionFilter}
              onChange={e => {
                setRegionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-gov-slate-300 rounded px-2.5 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
            >
              <option value="All">All AICTE Regions</option>
              <option value="Western">Western</option>
              <option value="Northern">Northern</option>
              <option value="Southern">Southern</option>
              <option value="Eastern">Eastern</option>
              <option value="Central">Central</option>
              <option value="South-Western">South-Western</option>
            </select>
          </div>

          {/* Application Type Filter */}
          <div>
            <label className="block text-gov-slate-600 font-semibold mb-1">Application Type:</label>
            <select
              value={typeFilter}
              onChange={e => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-gov-slate-300 rounded px-2.5 py-1.5 text-xs text-gov-slate-900 focus:outline-none focus:ring-1 focus:ring-gov-navy"
            >
              <option value="All">All Types</option>
              <option value="Extension of Approval (EoA)">Extension of Approval (EoA)</option>
              <option value="Increase in Intake">Increase in Intake</option>
              <option value="Introduction of New Course / Division">Introduction of New Course / Division</option>
              <option value="New Technical Institution">New Technical Institution</option>
            </select>
          </div>
        </div>

        {/* Date range & Sort Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gov-slate-100 text-xs text-gov-slate-600">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-gov-slate-700">Assigned Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gov-slate-300 rounded px-2 py-1 text-xs"
              placeholder="From"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gov-slate-300 rounded px-2 py-1 text-xs"
              placeholder="To"
            />
            {(searchTerm || statusFilter !== 'All' || regionFilter !== 'All' || typeFilter !== 'All' || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('All');
                  setRegionFilter('All');
                  setTypeFilter('All');
                  setStartDate('');
                  setEndDate('');
                  setCurrentPage(1);
                }}
                className="text-xs text-gov-navy font-semibold hover:underline ml-2"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="font-semibold text-gov-slate-700">Sort By:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="border border-gov-slate-300 rounded px-2 py-1 text-xs bg-white text-gov-slate-900"
            >
              <option value="deadline">Prescribed Deadline (Default)</option>
              <option value="assignedDate">Assigned Date</option>
              <option value="ageing">Days Since Assignment (Ageing)</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
              className="p-1 border border-gov-slate-300 rounded hover:bg-gov-slate-50 text-gov-slate-700"
              title={`Sorting ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Assigned Applications Table */}
      <div className="bg-white rounded-lg border border-gov-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-gov-slate-50 border-b border-gov-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gov-navy">
              Assigned Inspection Applications ({totalCount})
            </h3>
            <p className="text-xs text-gov-slate-500 mt-0.5">
              Strictly filtered to your committee appointments • Rows approaching deadline or overdue are highlighted.
            </p>
          </div>
          <span className="text-xs font-semibold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
            Official EVC Roster
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-gov-slate-500">
            <div className="animate-spin w-6 h-6 border-2 border-gov-navy border-t-transparent rounded-full mx-auto mb-2" />
            <span>Loading assigned applications...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-700 bg-rose-50 border-b border-rose-200">
            <AlertCircle className="w-6 h-6 mx-auto mb-1 text-rose-600" />
            <p className="font-semibold">{error}</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-12 text-center text-xs text-gov-slate-500 space-y-2">
            <FileText className="w-8 h-8 text-gov-slate-300 mx-auto" />
            <p className="text-sm font-bold text-gov-slate-700">No applications assigned yet</p>
            <p>You currently have no technical institution verification panels assigned matching the active filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gov-slate-100/80 text-gov-slate-700 uppercase tracking-wider font-semibold border-b border-gov-slate-200 text-[11px]">
                <tr>
                  <th className="py-3 px-3.5">Application ID</th>
                  <th className="py-3 px-3.5">Institution Name</th>
                  <th className="py-3 px-3.5">Region / State</th>
                  <th className="py-3 px-3.5">Application Type</th>
                  <th className="py-3 px-3.5">Processing Path</th>
                  <th className="py-3 px-3.5">Assigned Date</th>
                  <th className="py-3 px-3.5">EVC Schedule &amp; Mode</th>
                  <th className="py-3 px-3.5 text-center">Ageing</th>
                  <th className="py-3 px-3.5">Prescribed Deadline</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gov-slate-200">
                {assignments.map(item => {
                  const isApproaching =
                    item.status !== 'Completed' &&
                    item.daysRemaining >= 0 &&
                    item.daysRemaining <= EVC_ALERT_CONFIG.DEADLINE_WARNING_DAYS;
                  const isOverdue = item.status === 'Overdue';
                  const style = EVC_STATUS_STYLES[item.status] || EVC_STATUS_STYLES.Pending;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isOverdue
                          ? 'bg-rose-50/70 hover:bg-rose-100/60'
                          : isApproaching
                          ? 'bg-amber-50/60 hover:bg-amber-100/50'
                          : 'hover:bg-gov-slate-50/80'
                      }`}
                    >
                      {/* Application ID */}
                      <td className="py-3 px-3.5 font-mono font-bold text-gov-navy whitespace-nowrap">
                        {item.applicationNumber}
                      </td>

                      {/* Institution Name */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-gov-slate-900 max-w-[220px] truncate" title={item.instituteName}>
                          {item.instituteName}
                        </div>
                        <div className="font-mono text-[10px] text-gov-slate-500">
                          {item.instituteCode}
                        </div>
                      </td>

                      {/* Region / State */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div>{item.state}</div>
                        <div className="text-[10px] text-gov-slate-500">{item.region} Region</div>
                      </td>

                      {/* Application Type */}
                      <td className="py-3 px-3.5 max-w-[170px]">
                        <span className="text-[11px] text-gov-slate-800 line-clamp-2">
                          {item.applicationType}
                        </span>
                      </td>

                      {/* Processing Path */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="inline-block bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {item.processingPath}
                        </span>
                      </td>

                      {/* Assigned Date */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-gov-slate-700">
                        {item.assignedDate}
                      </td>

                      {/* EVC Schedule & Mode */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {item.visitDate ? (
                          <div>
                            <div className="font-semibold text-gov-slate-900">{item.visitDate}</div>
                            <div className="flex items-center gap-1 text-[10px] text-gov-slate-500">
                              <span>{item.visitMode}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Date Pending</span>
                        )}
                      </td>

                      {/* Ageing */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span className="font-semibold text-gov-slate-800">{item.ageingDays}d</span>
                      </td>

                      {/* Prescribed Deadline */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div>{item.prescribedDeadline}</div>
                        <div
                          className={`text-[10px] font-bold ${
                            item.daysRemaining < 0
                              ? 'text-rose-600'
                              : item.daysRemaining <= EVC_ALERT_CONFIG.DEADLINE_WARNING_DAYS
                              ? 'text-amber-700 font-extrabold'
                              : 'text-emerald-700'
                          }`}
                        >
                          {item.daysRemaining < 0
                            ? `${Math.abs(item.daysRemaining)}d overdue`
                            : item.daysRemaining === 0
                            ? 'Expires today'
                            : `${item.daysRemaining}d remaining`}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${style.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          <span>{style.label}</span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleViewDetails(item)}
                          className="inline-flex items-center gap-1 bg-gov-navy hover:bg-gov-navy-light text-white px-2.5 py-1 rounded text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-3.5 bg-gov-slate-50 border-t border-gov-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gov-slate-600">
          <div>
            Showing <strong className="text-gov-slate-900">{assignments.length}</strong> of{' '}
            <strong className="text-gov-slate-900">{totalCount}</strong> assigned applications
          </div>

          <div className="flex items-center gap-1 self-end sm:self-auto">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 rounded border border-gov-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gov-slate-100 text-gov-slate-700 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-semibold text-gov-navy">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1.5 rounded border border-gov-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gov-slate-100 text-gov-slate-700 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Statutory Disclaimer Note (Requirement 7) */}
      <div className="bg-gov-slate-100 border border-gov-slate-300 p-3 rounded-lg text-xs text-gov-slate-600 flex items-start gap-2">
        <Info className="w-4 h-4 text-gov-navy flex-shrink-0 mt-0.5" />
        <span className="italic">{STATUTORY_EVC_NOTICE}</span>
      </div>

      {/* 7. Application Detail View Drawer / Modal (Requirement 6 & 7) */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl border border-gov-slate-300 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gov-navy text-white px-5 py-4 flex items-center justify-between border-b-2 border-gov-saffron">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-300 bg-white/10 px-2 py-0.5 rounded border border-white/20">
                    {selectedApp.applicationNumber}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 border border-purple-400/30">
                    EVC Inspection Dossier
                  </span>
                </div>
                <h3 className="font-bold text-base sm:text-lg mt-1 text-white">
                  {selectedApp.instituteName}
                </h3>
              </div>

              <button
                type="button"
                onClick={handleCloseDetails}
                className="text-slate-300 hover:text-white p-1 rounded hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Institution Summary Grid */}
              <div className="bg-gov-slate-50 p-4 rounded-lg border border-gov-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[11px] text-gov-slate-500 uppercase font-semibold">Institute Code</span>
                  <div className="font-mono font-bold text-gov-navy mt-0.5">{selectedApp.instituteCode}</div>
                </div>
                <div>
                  <span className="text-[11px] text-gov-slate-500 uppercase font-semibold">Jurisdiction &amp; State</span>
                  <div className="font-semibold text-gov-slate-800 mt-0.5">{selectedApp.region} Region • {selectedApp.state}</div>
                </div>
                <div>
                  <span className="text-[11px] text-gov-slate-500 uppercase font-semibold">Application Type</span>
                  <div className="font-semibold text-gov-slate-800 mt-0.5">{selectedApp.applicationType}</div>
                </div>
                <div>
                  <span className="text-[11px] text-gov-slate-500 uppercase font-semibold">Assigned Date / Ageing</span>
                  <div className="font-semibold text-gov-slate-800 mt-0.5">{selectedApp.assignedDate} ({selectedApp.ageingDays} days ago)</div>
                </div>
                <div>
                  <span className="text-[11px] text-gov-slate-500 uppercase font-semibold">Prescribed Deadline</span>
                  <div className="font-semibold text-gov-slate-800 mt-0.5">
                    {selectedApp.prescribedDeadline} ({selectedApp.daysRemaining >= 0 ? `${selectedApp.daysRemaining}d remaining` : `${Math.abs(selectedApp.daysRemaining)}d overdue`})
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-gov-slate-500 uppercase font-semibold">Processing Path</span>
                  <div className="font-semibold text-gov-slate-800 mt-0.5">{selectedApp.processingPath}</div>
                </div>
              </div>

              {/* Committee & Schedule Details */}
              <div className="border border-gov-slate-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-gov-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gov-navy" />
                    <h4 className="font-bold text-gov-navy uppercase text-xs tracking-wider">
                      EVC Committee Constitution &amp; Inspection Schedule
                    </h4>
                  </div>
                  <span className="font-mono text-xs font-bold text-gov-slate-600 bg-gov-slate-100 px-2 py-0.5 rounded">
                    {selectedApp.visitCode}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <strong className="text-gov-slate-700">Committee Chairman:</strong>{' '}
                    <span className="font-semibold text-gov-navy">{selectedApp.chairman}</span>
                  </div>
                  <div>
                    <strong className="text-gov-slate-700">Subject Experts:</strong>{' '}
                    <span className="text-gov-slate-800">{selectedApp.experts.join('; ')}</span>
                  </div>
                  <div>
                    <strong className="text-gov-slate-700">Regional Convenor:</strong>{' '}
                    <span className="text-gov-slate-800">{selectedApp.convenor}</span>
                  </div>
                  <div>
                    <strong className="text-gov-slate-700">Inspection Schedule:</strong>{' '}
                    <span className="font-semibold text-gov-slate-900">
                      {selectedApp.visitDate ? `${selectedApp.visitDate} at ${selectedApp.visitTime}` : 'Date Pending'}
                    </span>{' '}
                    ({selectedApp.visitMode})
                  </div>
                </div>

                {selectedApp.meetingLink && (
                  <div className="pt-2 flex items-center justify-between bg-purple-50 p-2.5 rounded border border-purple-200">
                    <div className="flex items-center gap-1.5 text-purple-900 font-semibold">
                      <Video className="w-4 h-4 text-purple-700" />
                      <span>Live Video EVC Room Provisioned</span>
                    </div>
                    <a
                      href={selectedApp.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-gov-navy hover:bg-gov-navy-light text-white font-semibold px-3 py-1 rounded text-xs transition-colors"
                    >
                      Join Inspection Room
                    </a>
                  </div>
                )}

                {selectedApp.instructions && (
                  <div className="text-gov-slate-600 bg-gov-slate-50 p-2 rounded border border-gov-slate-200 mt-2">
                    <strong>Inspection Mandate:</strong> {selectedApp.instructions}
                  </div>
                )}
              </div>

              {/* Scrutiny Observations */}
              <div className="border border-gov-slate-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 border-b border-gov-slate-200 pb-2">
                  <FileCheck2 className="w-4 h-4 text-gov-navy" />
                  <h4 className="font-bold text-gov-navy uppercase text-xs tracking-wider">
                    Scrutiny Committee Observations &amp; Verification Clearance
                  </h4>
                </div>
                <div className="text-gov-slate-800 bg-emerald-50/60 p-3 rounded border border-emerald-200">
                  {selectedApp.scrutinyObservations}
                </div>
              </div>

              {/* Submitted Institutional Documents (Role-Restricted) */}
              <div className="border border-gov-slate-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-gov-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gov-navy" />
                    <h4 className="font-bold text-gov-navy uppercase text-xs tracking-wider">
                      Submitted Institutional Proofs &amp; Certificates
                    </h4>
                  </div>
                  <span className="text-[11px] font-semibold text-gov-slate-500">
                    Role-Restricted Verified Documents
                  </span>
                </div>

                {selectedApp.documents && selectedApp.documents.length > 0 ? (
                  <div className="divide-y divide-gov-slate-200">
                    {selectedApp.documents.map((doc, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span className="font-medium text-gov-slate-800">{doc.name}</span>
                        </div>
                        <span className="text-[11px] text-gov-slate-500">Uploaded on {doc.dateUploaded}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gov-slate-500 italic py-2">
                    Municipal Fire NOC, Cadre Ratio Affidavit, and Land Lease proofs verified during Scrutiny stage.
                  </div>
                )}
              </div>

              {/* Activity / Audit Timeline for this Application */}
              <div className="border border-gov-slate-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-gov-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-gov-navy" />
                    <h4 className="font-bold text-gov-navy uppercase text-xs tracking-wider">
                      Application Audit &amp; Activity Timeline
                    </h4>
                  </div>
                  <span className="text-[11px] text-gov-slate-500">Immutable Audit Record</span>
                </div>

                {appAuditLogs.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {appAuditLogs.map(log => (
                      <div key={log.id} className="p-2.5 rounded bg-gov-slate-50 border border-gov-slate-200 text-[11px]">
                        <div className="flex items-center justify-between text-gov-slate-500">
                          <span className="font-semibold text-gov-navy">{log.action}</span>
                          <span>{log.timestamp}</span>
                        </div>
                        <div className="text-gov-slate-800 mt-1">{log.details}</div>
                        <div className="text-[10px] text-gov-slate-500 mt-0.5 font-medium">Actor: {log.actor} ({log.role})</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gov-slate-500 text-xs italic py-2">
                    Logged dossier access by {userFullName}. Preceding scrutiny logs recorded in national database.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gov-slate-50 border-t border-gov-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] italic text-gov-slate-500">
                {STATUTORY_EVC_NOTICE}
              </span>
              <button
                type="button"
                onClick={handleCloseDetails}
                className="px-4 py-1.5 bg-gov-navy hover:bg-gov-navy-light text-white rounded text-xs font-semibold shadow-xs self-end sm:self-auto cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
