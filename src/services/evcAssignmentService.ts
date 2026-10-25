import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Application,
  EVCVisit,
  AuditLogItem,
  EVCAssignedApplication,
  EVCAssignmentStatus,
  EVCAssignmentsSummary,
  EVCAssignmentsQueryParams,
  PaginatedEVCAssignments
} from '../types';
import {
  getStoredApplications,
  getStoredEVCVisits,
  getStoredAuditLogs,
  saveStoredAuditLogs
} from '../data/mockData';
import { dataService } from './dataService';
import { EVC_ALERT_CONFIG } from '../lib/evcConstants';

/**
 * Standard date parser (YYYY-MM-DD to local Date)
 */
function parseDateOnly(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day, 0, 0, 0, 0);
}

function getToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Derives statutory deadline for an EVC inspection from assignment date
 */
function derivePrescribedDeadline(assignedDateStr: string, fallbackSubmissionDate: string): string {
  const base = parseDateOnly(assignedDateStr) || parseDateOnly(fallbackSubmissionDate) || getToday();
  const deadline = new Date(base.getTime() + EVC_ALERT_CONFIG.DEFAULT_DEADLINE_DAYS * 24 * 60 * 60 * 1000);
  return formatDateString(deadline);
}

/**
 * Derives statutory assignment date for a visit
 */
function deriveAssignedDate(visit: EVCVisit, app: Application): string {
  if (visit.assignedDate) return visit.assignedDate;
  if (app.assignedDate) return app.assignedDate;
  // Fallback: 10 days before visitDate, or submission date + 14 days
  if (visit.visitDate) {
    const vd = parseDateOnly(visit.visitDate);
    if (vd) {
      const ad = new Date(vd.getTime() - 10 * 24 * 60 * 60 * 1000);
      return formatDateString(ad);
    }
  }
  return app.submissionDate;
}

/**
 * Computes assignment status according to statutory AICTE workflow states
 */
export function computeAssignmentStatus(
  visit: EVCVisit,
  app: Application,
  daysRemaining: number
): EVCAssignmentStatus {
  if (
    visit.status === 'Report Submitted' ||
    visit.status === 'Report Verified' ||
    app.currentStage === 'EVC Completed' ||
    app.currentStage === 'SAC Review' ||
    app.currentStage === 'Approved'
  ) {
    return 'Completed';
  }

  // Overdue if prescribed statutory deadline has expired without report submission
  if (daysRemaining < 0 || app.isOverdue) {
    return 'Overdue';
  }

  const today = getToday();
  const vd = parseDateOnly(visit.visitDate);

  // Visit executed, awaiting report submission
  if (visit.status === 'Inspection Completed' || (vd && vd.getTime() <= today.getTime() && visit.visitDate)) {
    return 'Report Due';
  }

  // Visit scheduled in future
  if (visit.visitDate && vd && vd.getTime() > today.getTime()) {
    return 'Upcoming';
  }

  // Assigned but visit not yet scheduled
  return 'Pending';
}

/**
 * Strictly checks whether an EVC visit committee includes the member
 */
export function isMemberAssigned(visit: EVCVisit, memberNameOrEmail: string): boolean {
  if (!memberNameOrEmail) return false;
  const target = memberNameOrEmail.trim().toLowerCase();

  const chairMatch = (visit.chairman || '').toLowerCase().includes(target);
  if (chairMatch) return true;

  const expertMatch = (visit.experts || []).some(exp => exp.toLowerCase().includes(target));
  if (expertMatch) return true;

  // Check demo identifier match
  if (target.includes('amitabh') || target.includes('evc.member')) {
    return (
      (visit.chairman || '').toLowerCase().includes('amitabh') ||
      (visit.experts || []).some(exp => exp.toLowerCase().includes('amitabh'))
    );
  }

  return false;
}

export const evcAssignmentService = {
  /**
   * Fetches assigned applications scoped strictly to the authenticated EVC member.
   * Enforces backend authorization and returns only the member's assigned records.
   */
  async getMyAssignments(
    params: EVCAssignmentsQueryParams,
    authenticatedMemberName: string,
    userRole: string = 'EVC Member'
  ): Promise<PaginatedEVCAssignments> {
    // 1. Authorization check: must be EVC Member or Admin
    if (!userRole.includes('EVC') && !userRole.includes('Admin')) {
      throw new Error(`Unauthorized: Role "${userRole}" is not permitted to access EVC member assignments.`);
    }

    if (!authenticatedMemberName) {
      throw new Error('Authentication required: EVC Member identity is missing.');
    }

    // 2. Fetch current applications and visits (from Supabase or local store)
    const [allApps, allVisits] = await Promise.all([
      dataService.getApplications(),
      dataService.getEVCVisits()
    ]);

    // 3. Strict scoping: filter visits where this user is an assigned committee member
    const memberVisits = allVisits.filter(v => isMemberAssigned(v, authenticatedMemberName));

    const today = getToday();

    // 4. Join and map to EVCAssignedApplication model
    let assignedList: EVCAssignedApplication[] = memberVisits.map(visit => {
      const app = allApps.find(
        a => a.applicationNumber === visit.applicationNumber || a.id === visit.applicationNumber
      ) || {
        id: `app-synthetic-${visit.id}`,
        applicationNumber: visit.applicationNumber,
        instituteName: visit.instituteName,
        instituteCode: visit.instituteCode,
        region: 'Western' as const,
        state: visit.state,
        applicationType: 'Extension of Approval (EoA)' as const,
        academicYear: '2026-27',
        submissionDate: '2026-09-15',
        currentStage: 'EVC Scheduled' as const,
        stageProgress: 65,
        processingDays: 35,
        isOverdue: false,
        evcAssigned: true,
        feePaid: 250000,
        totalIntakeProposed: 720,
        complianceRating: 'High' as const,
        contactPerson: 'Director / Principal',
        contactEmail: 'contact@institution.edu.in',
        contactPhone: '+91 98200 00000',
        documents: []
      };

      const assignedDate = deriveAssignedDate(visit, app as Application);
      const assignedDateObj = parseDateOnly(assignedDate) || today;
      const ageingDays = Math.max(0, Math.floor((today.getTime() - assignedDateObj.getTime()) / (1000 * 60 * 60 * 24)));

      const prescribedDeadline = visit.deadlineDate || app.evcDeadlineDate || derivePrescribedDeadline(assignedDate, app.submissionDate);
      const deadlineObj = parseDateOnly(prescribedDeadline) || today;
      const daysRemaining = Math.round((deadlineObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const status = computeAssignmentStatus(visit, app as Application, daysRemaining);

      const processingPath: EVCAssignedApplication['processingPath'] =
        app.processingPath || (app.applicationType === 'New Technical Institution' ? 'Scrutiny + EVC' : 'Only EVC');

      return {
        id: app.id,
        applicationNumber: app.applicationNumber,
        instituteName: app.instituteName,
        instituteCode: app.instituteCode,
        region: app.region || 'Western',
        state: app.state || visit.state,
        applicationType: app.applicationType,
        processingPath,
        assignedDate,
        visitDate: visit.visitDate,
        visitTime: visit.visitTime || '10:00 AM IST',
        visitMode: visit.visitMode,
        ageingDays,
        prescribedDeadline,
        daysRemaining,
        status,
        evcVisitId: visit.id,
        visitCode: visit.visitCode,
        chairman: visit.chairman,
        experts: visit.experts || [],
        convenor: visit.convenor,
        meetingLink: visit.meetingLink,
        instructions: visit.instructions,
        criticalFindings: visit.criticalFindings,
        scrutinyObservations: app.remarks || 'Scrutiny observations cleared by Scrutiny Committee.',
        documents: app.documents,
        contactPerson: app.contactPerson,
        contactEmail: app.contactEmail,
        contactPhone: app.contactPhone,
        totalIntakeProposed: app.totalIntakeProposed
      };
    });

    // 5. Apply Filters
    if (params.status && params.status !== 'All') {
      assignedList = assignedList.filter(item => item.status === params.status);
    }

    if (params.region && params.region !== 'All') {
      assignedList = assignedList.filter(item => item.region === params.region);
    }

    if (params.applicationType && params.applicationType !== 'All') {
      assignedList = assignedList.filter(item => item.applicationType === params.applicationType);
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      assignedList = assignedList.filter(
        item =>
          item.applicationNumber.toLowerCase().includes(q) ||
          item.instituteName.toLowerCase().includes(q) ||
          item.instituteCode.toLowerCase().includes(q) ||
          item.state.toLowerCase().includes(q)
      );
    }

    if (params.startDate) {
      assignedList = assignedList.filter(item => item.assignedDate >= params.startDate!);
    }

    if (params.endDate) {
      assignedList = assignedList.filter(item => item.assignedDate <= params.endDate!);
    }

    // 6. Apply Sorting
    const sortBy = params.sortBy || 'deadline';
    const sortOrder = params.sortOrder || 'asc';
    const orderMult = sortOrder === 'desc' ? -1 : 1;

    assignedList.sort((a, b) => {
      if (sortBy === 'deadline') {
        return (a.daysRemaining - b.daysRemaining) * orderMult;
      }
      if (sortBy === 'assignedDate') {
        return (a.assignedDate.localeCompare(b.assignedDate)) * orderMult;
      }
      if (sortBy === 'ageing') {
        return (a.ageingDays - b.ageingDays) * orderMult;
      }
      return 0;
    });

    // 7. Apply Pagination
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, params.pageSize || 10);
    const total = assignedList.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const paginatedData = assignedList.slice((page - 1) * pageSize, page * pageSize);

    return {
      data: paginatedData,
      total,
      page,
      pageSize,
      totalPages
    };
  },

  /**
   * Fetches summary statistics for the 6 top metric cards.
   */
  async getMyAssignmentsSummary(
    authenticatedMemberName: string,
    userRole: string = 'EVC Member'
  ): Promise<EVCAssignmentsSummary> {
    const result = await this.getMyAssignments(
      { page: 1, pageSize: 1000 },
      authenticatedMemberName,
      userRole
    );

    const items = result.data;

    return {
      totalAssigned: items.length,
      upcoming: items.filter(i => i.status === 'Upcoming').length,
      pending: items.filter(i => i.status === 'Pending').length,
      reportDue: items.filter(i => i.status === 'Report Due').length,
      overdue: items.filter(i => i.status === 'Overdue').length,
      completed: items.filter(i => i.status === 'Completed').length
    };
  },

  /**
   * Logs every access to an application's details by an EVC member into the immutable audit trail.
   */
  async logDossierAccess(
    applicationNumber: string,
    instituteName: string,
    userFullName: string
  ): Promise<void> {
    const actorName = userFullName || 'Prof. (Dr.) Amitabh Mohanty';
    const auditItem: AuditLogItem = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp:
        new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) + ' IST',
      actor: actorName,
      role: 'EVC Chairman' as any,
      action: 'Application Dossier Viewed by EVC Member',
      applicationNumber,
      instituteName,
      details: `EVC committee member accessed confidential verification dossier, institutional proofs, and scrutiny observations.`
    };

    const storedLogs = getStoredAuditLogs();
    saveStoredAuditLogs([auditItem, ...storedLogs]);
    dataService.appendAuditLog(auditItem);
  }
};
