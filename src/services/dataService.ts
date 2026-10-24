import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  calculateDaysRemaining,
  calculateUrgency,
  calculateProcessingDays,
  calculateIsOverdue
} from '../lib/dateCalculations';
import {
  Application,
  ComplianceRecord,
  EVCVisit,
  EVCVisitStatus,
  AuditLogItem,
  ExpertProfile,
  ApplicationStage
} from '../types';
import {
  isValidTransition,
  calculateStageProgress,
  calculateMilestoneProgress,
  deriveApplicationProgress,
  findMatchingEVCVisit
} from '../lib/workflow';
import {
  isValidEVCTransition,
  validateEVCTeam,
  checkExpertAvailability
} from '../lib/evcWorkflow';

export interface StageUpdateResult {
  success: boolean;
  newStage?: ApplicationStage;
  stageProgress?: number;
  error?: string;
}
import {
  getStoredApplications,
  saveStoredApplications,
  getStoredCompliance,
  saveStoredCompliance,
  getStoredEVCVisits,
  saveStoredEVCVisits,
  getStoredAuditLogs,
  saveStoredAuditLogs,
  getStoredExperts,
  saveStoredExperts
} from '../data/mockData';

// Types for Supabase schema mapping (database uses snake_case)
interface SupabaseApplicationRow {
  id: string;
  application_number: string;
  institute_name: string;
  institute_code: string;
  state: string;
  region: Application['region'];
  application_type: Application['applicationType'];
  academic_year: string;
  submission_date: string;
  current_stage: ApplicationStage;
  stage_progress: number;
  processing_days?: number;
  is_overdue?: boolean;
  evc_assigned: boolean;
  evc_id?: string;
  fee_paid: number;
  total_intake_proposed: number;
  compliance_rating: Application['complianceRating'];
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  remarks?: string;
  documents?: Application['documents'];
}

interface SupabaseComplianceRow {
  id: string;
  institute_code: string;
  institute_name: string;
  application_number: string;
  category: ComplianceRecord['category'];
  title: string;
  valid_until: string;
  days_remaining?: number;
  urgency?: ComplianceRecord['urgency'];
  status: ComplianceRecord['status'];
  last_audit_date: string;
  action_required: string;
}

interface SupabaseEVCVisitRow {
  id: string;
  visit_code: string;
  application_number: string;
  institute_name: string;
  institute_code: string;
  city: string;
  state: string;
  visit_date: string;
  visit_time: string;
  visit_mode: EVCVisit['visitMode'];
  status: EVCVisit['status'];
  chairman: string;
  experts: string[];
  convenor: string;
  meeting_link?: string;
  instructions: string;
  critical_findings?: string;
  started_at?: string;
  report_submitted_at?: string;
  verified_at?: string;
}

interface SupabaseAuditLogRow {
  id: string;
  event_timestamp?: string;
  timestamp?: string;
  actor: string;
  role: AuditLogItem['role'];
  action: string;
  application_number: string;
  institute_name: string;
  details: string;
}

interface SupabaseExpertRow {
  id: string;
  name: string;
  designation: string;
  institution: string;
  discipline: string;
  city: string;
  state: string;
  completed_visits: number;
  status: ExpertProfile['status'];
  rating: number;
}

/**
 * Maps a Supabase application record to the application model,
 * dynamically calculating processingDays, isOverdue, and statutory milestone progress at runtime.
 */
export function mapApplicationRow(
  row: SupabaseApplicationRow,
  linkedVisit?: EVCVisit | null
): Application {
  const processingDays = calculateProcessingDays(row.submission_date);
  const isOverdue = calculateIsOverdue(row.current_stage, processingDays);

  const partialApp: Application = {
    id: row.id,
    applicationNumber: row.application_number,
    instituteName: row.institute_name,
    instituteCode: row.institute_code,
    state: row.state,
    region: row.region,
    applicationType: row.application_type,
    academicYear: row.academic_year,
    submissionDate: row.submission_date,
    currentStage: row.current_stage,
    stageProgress: row.stage_progress ?? 0,
    processingDays,
    isOverdue,
    evcAssigned: row.evc_assigned,
    evcId: row.evc_id,
    feePaid: row.fee_paid,
    totalIntakeProposed: row.total_intake_proposed,
    complianceRating: row.compliance_rating,
    contactPerson: row.contact_person,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    remarks: row.remarks,
    documents: row.documents || []
  };

  // Derive statutory milestone progression accurately from criteria and linked visit
  const dynamicProgress = deriveApplicationProgress(partialApp, linkedVisit);

  return {
    ...partialApp,
    stageProgress: dynamicProgress
  };
}

/**
 * Maps a Supabase compliance record to the compliance model,
 * dynamically calculating daysRemaining and urgency at runtime.
 */
export function mapComplianceRow(row: SupabaseComplianceRow): ComplianceRecord {
  const daysRemaining = calculateDaysRemaining(row.valid_until);
  const urgency = calculateUrgency(daysRemaining, row.status);

  return {
    id: row.id,
    instituteCode: row.institute_code,
    instituteName: row.institute_name,
    applicationNumber: row.application_number,
    category: row.category,
    title: row.title,
    validUntil: row.valid_until,
    daysRemaining,
    urgency,
    status: row.status,
    lastAuditDate: row.last_audit_date,
    actionRequired: row.action_required
  };
}

export function mapEVCVisitRow(row: SupabaseEVCVisitRow): EVCVisit {
  return {
    id: row.id,
    visitCode: row.visit_code,
    applicationNumber: row.application_number,
    instituteName: row.institute_name,
    instituteCode: row.institute_code,
    city: row.city,
    state: row.state,
    visitDate: row.visit_date,
    visitTime: row.visit_time,
    visitMode: row.visit_mode,
    status: row.status,
    chairman: row.chairman,
    experts: row.experts || [],
    convenor: row.convenor,
    meetingLink: row.meeting_link,
    instructions: row.instructions,
    criticalFindings: row.critical_findings,
    startedAt: row.started_at,
    reportSubmittedAt: row.report_submitted_at,
    verifiedAt: row.verified_at
  };
}

export function mapAuditLogRow(row: SupabaseAuditLogRow): AuditLogItem {
  let displayTimestamp = row.timestamp || '';
  if (row.event_timestamp) {
    try {
      const date = new Date(row.event_timestamp);
      displayTimestamp = date.toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) + ' IST';
    } catch {
      displayTimestamp = row.event_timestamp;
    }
  }

  return {
    id: row.id,
    timestamp: displayTimestamp,
    actor: row.actor,
    role: row.role,
    action: row.action,
    applicationNumber: row.application_number,
    instituteName: row.institute_name,
    details: row.details
  };
}

export function mapExpertRow(row: SupabaseExpertRow): ExpertProfile {
  return {
    id: row.id,
    name: row.name,
    designation: row.designation,
    institution: row.institution,
    discipline: row.discipline,
    city: row.city,
    state: row.state,
    completedVisits: row.completed_visits ?? 0,
    status: row.status,
    rating: row.rating
  };
}

/**
 * Service to fetch and mutate records, using Supabase when available
 * with seamless fallback to local mock storage.
 * All date calculations are executed dynamically at runtime.
 */
export const dataService = {
  /**
   * Fetch all applications with dynamically computed processingDays, isOverdue,
   * and synchronized statutory milestone progress based on real visit status.
   */
  async getApplications(): Promise<Application[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const [{ data: appRows, error: appError }, { data: evcRows }] = await Promise.all([
          supabase
            .from('applications')
            .select('*')
            .order('submission_date', { ascending: false }),
          supabase.from('evc_visits').select('*')
        ]);

        if (!appError && appRows && appRows.length > 0) {
          const visits = (evcRows || []).map((r) => mapEVCVisitRow(r as SupabaseEVCVisitRow));
          const mapped = appRows.map((row) => {
            const matchingVisit = visits.find((v) =>
              (row.evc_id && v.id === row.evc_id) ||
              (v.applicationNumber && row.application_number &&
                v.applicationNumber.trim().toLowerCase() === row.application_number.trim().toLowerCase())
            );
            return mapApplicationRow(row as SupabaseApplicationRow, matchingVisit);
          });
          saveStoredApplications(mapped);
          return mapped;
        }
        if (appError) {
          console.warn('Supabase applications fetch failed, using fallback:', appError.message);
        }
      } catch (err) {
        console.warn('Error connecting to Supabase applications:', err);
      }
    }
    const stored = getStoredApplications();
    const storedVisits = getStoredEVCVisits();
    return stored.map((app) => {
      const matchingVisit = findMatchingEVCVisit(app, storedVisits);
      return {
        ...app,
        stageProgress: deriveApplicationProgress(app, matchingVisit)
      };
    });
  },

  /**
   * Fetch all compliance records with dynamically computed daysRemaining and urgency
   */
  async getComplianceRecords(): Promise<ComplianceRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('compliance_records')
          .select('*')
          .order('valid_until', { ascending: true });

        if (!error && data && data.length > 0) {
          const mapped = data.map((row) => mapComplianceRow(row as SupabaseComplianceRow));
          saveStoredCompliance(mapped);
          return mapped;
        }
        if (error) {
          console.warn('Supabase compliance fetch failed, using fallback:', error.message);
        }
      } catch (err) {
        console.warn('Error connecting to Supabase compliance:', err);
      }
    }
    return getStoredCompliance();
  },

  /**
   * Fetch all EVC visits
   */
  async getEVCVisits(): Promise<EVCVisit[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('evc_visits')
          .select('*')
          .order('visit_date', { ascending: true });

        if (!error && data && data.length > 0) {
          const mapped = data.map((row) => mapEVCVisitRow(row as SupabaseEVCVisitRow));
          saveStoredEVCVisits(mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Error connecting to Supabase evc_visits:', err);
      }
    }
    return getStoredEVCVisits();
  },

  /**
   * Fetch all audit logs
   */
  async getAuditLogs(): Promise<AuditLogItem[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('event_timestamp', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped = data.map((row) => mapAuditLogRow(row as SupabaseAuditLogRow));
          saveStoredAuditLogs(mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Error connecting to Supabase audit_logs:', err);
      }
    }
    return getStoredAuditLogs();
  },

  /**
   * Fetch all experts
   */
  async getExperts(): Promise<ExpertProfile[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('experts')
          .select('*')
          .order('rating', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped = data.map((row) => mapExpertRow(row as SupabaseExpertRow));
          saveStoredExperts(mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Error connecting to Supabase experts:', err);
      }
    }
    return getStoredExperts();
  },

  /**
   * Update application stage with backend validation and persistence:
   * 1. Reads current stage.
   * 2. Validates requested transition against allowed workflow rules.
   * 3. Rejects invalid transitions with an appropriate error.
   * 4. Persists valid changes to Supabase atomically (checking current_stage).
   * 5. Handles missing applications, stale status values, and database failures safely.
   */
  async updateApplicationStage(
    appId: string,
    newStage: ApplicationStage,
    remarks: string = '',
    customStageProgress?: number
  ): Promise<StageUpdateResult> {
    if (!appId || !newStage) {
      return {
        success: false,
        error: 'Application ID and requested stage are required.'
      };
    }

    let calculatedProgress = customStageProgress;
    if (calculatedProgress === undefined) {
      const stored = getStoredApplications();
      const storedVisits = getStoredEVCVisits();
      const existingApp = stored.find((a) => a.id === appId);
      const matchingVisit = existingApp ? findMatchingEVCVisit(existingApp, storedVisits) : null;
      calculatedProgress = existingApp
        ? deriveApplicationProgress({ ...existingApp, currentStage: newStage }, matchingVisit)
        : calculateStageProgress(newStage);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        // Step 1: Read current stage from Supabase
        const { data, error: fetchError } = await supabase
          .from('applications')
          .select('id, current_stage')
          .eq('id', appId)
          .maybeSingle();

        if (fetchError) {
          console.warn('Supabase fetch application error:', fetchError.message);
          return {
            success: false,
            error: `Database query failed: ${fetchError.message}`
          };
        }

        if (!data) {
          // Check fallback store
          const stored = getStoredApplications();
          const localApp = stored.find((a) => a.id === appId);
          if (!localApp) {
            return {
              success: false,
              error: `Application with ID "${appId}" was not found.`
            };
          }
          return this.updateStoredApplicationStage(appId, newStage, remarks, calculatedProgress);
        }

        const currentStage = data.current_stage as ApplicationStage;

        // Step 2: Validate transition rules
        if (!isValidTransition(currentStage, newStage)) {
          return {
            success: false,
            error: `Invalid stage transition from "${currentStage}" to "${newStage}".`
          };
        }

        // Step 3: Persist atomically (checking current_stage to prevent stale concurrent overwrites)
        const { data: updateData, error: updateError } = await supabase
          .from('applications')
          .update({
            current_stage: newStage,
            stage_progress: calculatedProgress,
            remarks,
            updated_at: new Date().toISOString()
          })
          .eq('id', appId)
          .eq('current_stage', currentStage)
          .select();

        if (updateError) {
          return {
            success: false,
            error: `Database update failed: ${updateError.message}`
          };
        }

        if (!updateData || updateData.length === 0) {
          return {
            success: false,
            error: 'Application status was modified by another process. Please refresh and try again.'
          };
        }

        // Sync local cache
        this.updateStoredApplicationStageLocally(appId, newStage, calculatedProgress, remarks);

        return {
          success: true,
          newStage,
          stageProgress: calculatedProgress
        };
      } catch (err: any) {
        console.warn('Supabase application stage update error:', err);
        return {
          success: false,
          error: err?.message || 'Unexpected server error while updating application stage.'
        };
      }
    }

    // Local storage fallback with full validation
    return this.updateStoredApplicationStage(appId, newStage, remarks, calculatedProgress);
  },

  updateStoredApplicationStage(
    appId: string,
    newStage: ApplicationStage,
    remarks: string,
    stageProgress?: number
  ): StageUpdateResult {
    const apps = getStoredApplications();
    const appIndex = apps.findIndex((a) => a.id === appId);
    if (appIndex === -1) {
      return {
        success: false,
        error: `Application with ID "${appId}" was not found.`
      };
    }

    const currentStage = apps[appIndex].currentStage;
    if (!isValidTransition(currentStage, newStage)) {
      return {
        success: false,
        error: `Invalid stage transition from "${currentStage}" to "${newStage}".`
      };
    }

    const calculatedProgress = stageProgress ?? calculateStageProgress(newStage);
    apps[appIndex].currentStage = newStage;
    apps[appIndex].stageProgress = calculatedProgress;
    apps[appIndex].remarks = remarks;
    saveStoredApplications(apps);

    return {
      success: true,
      newStage,
      stageProgress: calculatedProgress
    };
  },

  updateStoredApplicationStageLocally(
    appId: string,
    newStage: ApplicationStage,
    stageProgress: number,
    remarks: string = ''
  ): void {
    const apps = getStoredApplications();
    const appIndex = apps.findIndex((a) => a.id === appId);
    if (appIndex !== -1) {
      apps[appIndex].currentStage = newStage;
      apps[appIndex].stageProgress = stageProgress;
      if (remarks) apps[appIndex].remarks = remarks;
      saveStoredApplications(apps);
    }
  },

  /**
   * Update EVC visit status through the strict lifecycle:
   * Scheduled → In Progress → Report Submitted → Verified
   */
  async updateEVCVisitStatus(
    visitId: string,
    nextStatus: EVCVisitStatus,
    remarks?: string
  ): Promise<{ success: boolean; visit?: EVCVisit; updatedApplication?: Application; error?: string }> {
    if (!visitId || !nextStatus) {
      return { success: false, error: 'Visit ID and target status are required.' };
    }

    const currentVisits = await this.getEVCVisits();
    const currentVisit = currentVisits.find((v) => v.id === visitId);
    if (!currentVisit) {
      return { success: false, error: `EVC Visit with ID "${visitId}" was not found.` };
    }

    if (!isValidEVCTransition(currentVisit.status, nextStatus)) {
      return {
        success: false,
        error: `Invalid status transition: cannot move from "${currentVisit.status}" to "${nextStatus}".`
      };
    }

    const now = new Date().toISOString();
    const updatedVisit: EVCVisit = {
      ...currentVisit,
      status: nextStatus,
      criticalFindings: remarks || currentVisit.criticalFindings,
      startedAt: nextStatus === 'In Progress' ? now : currentVisit.startedAt,
      reportSubmittedAt: nextStatus === 'Report Submitted' ? now : currentVisit.reportSubmittedAt,
      verifiedAt: nextStatus === 'Verified' ? now : currentVisit.verifiedAt
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const updatePayload: Record<string, any> = {
          status: nextStatus,
          critical_findings: updatedVisit.criticalFindings
        };

        const { data: updatedRows, error: updateError } = await supabase
          .from('evc_visits')
          .update(updatePayload)
          .eq('id', visitId)
          .eq('status', currentVisit.status)
          .select();

        if (updateError) {
          console.warn('Supabase EVC visit status update error:', updateError.message);
          return { success: false, error: `Database update failed: ${updateError.message}` };
        }

        if (!updatedRows || updatedRows.length === 0) {
          return {
            success: false,
            error: 'Visit status was modified by another process. Please refresh and try again.'
          };
        }
      } catch (err: any) {
        console.warn('Supabase EVC visit status update unexpected error:', err);
        return { success: false, error: err?.message || 'Server error updating EVC visit status.' };
      }
    }

    // Update local cache
    const updatedList = currentVisits.map((v) => (v.id === visitId ? updatedVisit : v));
    saveStoredEVCVisits(updatedList);

    // Synchronize linked application milestone progress
    const currentApps = getStoredApplications();
    const targetApp = currentApps.find(
      (a) =>
        (a.evcId && a.evcId === visitId) ||
        (a.applicationNumber &&
          updatedVisit.applicationNumber &&
          a.applicationNumber.trim().toLowerCase() === updatedVisit.applicationNumber.trim().toLowerCase())
    );

    let updatedApplication: Application | undefined;

    if (targetApp) {
      const newMilestoneResult = calculateMilestoneProgress(targetApp, updatedVisit);
      const newProgress = newMilestoneResult.percentage;

      let nextAppStage = targetApp.currentStage;
      if (nextStatus === 'Verified' && targetApp.currentStage === 'EVC Scheduled') {
        nextAppStage = 'EVC Completed';
      }

      updatedApplication = {
        ...targetApp,
        currentStage: nextAppStage,
        stageProgress: newProgress
      };

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase
            .from('applications')
            .update({
              current_stage: nextAppStage,
              stage_progress: newProgress,
              updated_at: now
            })
            .eq('id', targetApp.id);
        } catch (syncErr) {
          console.warn('Failed to sync application milestone progress to Supabase:', syncErr);
        }
      }

      this.updateStoredApplicationStageLocally(targetApp.id, nextAppStage, newProgress);
    }

    return { success: true, visit: updatedVisit, updatedApplication };
  },

  /**
   * Add a new EVC visit and update the related application.
   * Validates duplicate team members and expert availability before creating.
   */
  async addEVCVisit(
    visit: EVCVisit
  ): Promise<{ success: boolean; visit?: EVCVisit; updatedApplication?: Application; error?: string }> {
    const experts = await this.getExperts();
    const existingVisits = await this.getEVCVisits();

    // 1. Validate team members (Chairman cannot be Expert, no duplicate experts)
    const teamValidation = validateEVCTeam(visit.chairman, visit.experts, experts);
    if (!teamValidation.valid) {
      return { success: false, error: teamValidation.error };
    }

    // 2. Validate Chairman availability
    const chairAvail = checkExpertAvailability(
      visit.chairman,
      visit.visitDate,
      visit.visitTime,
      existingVisits,
      experts
    );
    if (!chairAvail.isAvailable) {
      return { success: false, error: `Committee Chairman: ${chairAvail.error}` };
    }

    // 3. Validate each Subject Expert availability
    for (const exp of visit.experts) {
      const expAvail = checkExpertAvailability(
        exp,
        visit.visitDate,
        visit.visitTime,
        existingVisits,
        experts
      );
      if (!expAvail.isAvailable) {
        return { success: false, error: `Subject Expert: ${expAvail.error}` };
      }
    }

    // Derive statutory milestone progress for newly scheduled visit (Scheduled = incomplete milestone)
    const storedApps = getStoredApplications();
    const targetApp = storedApps.find(
      (a) =>
        a.applicationNumber.trim().toLowerCase() === visit.applicationNumber.trim().toLowerCase()
    );
    const scheduledAppPartial = targetApp
      ? { ...targetApp, currentStage: 'EVC Scheduled' as ApplicationStage, evcAssigned: true, evcId: visit.id }
      : null;
    const progressResult = calculateMilestoneProgress(scheduledAppPartial, visit);
    const newProgress = progressResult.percentage;

    if (isSupabaseConfigured && supabase) {
      try {
        const { error: insertError } = await supabase.from('evc_visits').insert({
          id: visit.id,
          visit_code: visit.visitCode,
          application_number: visit.applicationNumber,
          institute_name: visit.instituteName,
          institute_code: visit.instituteCode,
          city: visit.city,
          state: visit.state,
          visit_date: visit.visitDate,
          visit_time: visit.visitTime,
          visit_mode: visit.visitMode,
          status: visit.status,
          chairman: visit.chairman,
          experts: visit.experts,
          convenor: visit.convenor,
          meeting_link: visit.meetingLink,
          instructions: visit.instructions,
          critical_findings: visit.criticalFindings
        });

        if (insertError) {
          return { success: false, error: `Database insert failed: ${insertError.message}` };
        }

        // Also update application evc status in Supabase with accurate milestone progression
        await supabase
          .from('applications')
          .update({
            current_stage: 'EVC Scheduled',
            stage_progress: newProgress,
            evc_assigned: true,
            evc_id: visit.id,
            updated_at: new Date().toISOString()
          })
          .eq('application_number', visit.applicationNumber);
      } catch (err: any) {
        console.warn('Supabase EVC visit insert error:', err);
        return { success: false, error: err?.message || 'Database insert failed.' };
      }
    }

    // Update local cache
    const updatedVisits = [visit, ...existingVisits.filter((v) => v.id !== visit.id)];
    saveStoredEVCVisits(updatedVisits);

    let updatedApplication: Application | undefined;
    if (targetApp) {
      updatedApplication = {
        ...targetApp,
        currentStage: 'EVC Scheduled',
        stageProgress: newProgress,
        evcAssigned: true,
        evcId: visit.id
      };
      this.updateStoredApplicationStageLocally(targetApp.id, 'EVC Scheduled', newProgress);
    }

    return { success: true, visit, updatedApplication };
  },

  /**
   * Update compliance status without persisting calculated fields.
   */
  async updateComplianceStatus(
    id: string,
    newStatus: ComplianceRecord['status'],
    actionRequired: string
  ): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('compliance_records')
          .update({
            status: newStatus,
            action_required: actionRequired
          })
          .eq('id', id);
      } catch (err) {
        console.warn('Supabase compliance status update error:', err);
      }
    }
  },

  /**
   * Append an audit log item to Supabase.
   */
  async appendAuditLog(log: AuditLogItem): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('audit_logs').insert({
          id: log.id,
          event_timestamp: new Date().toISOString(),
          actor: log.actor,
          role: log.role,
          action: log.action,
          application_number: log.applicationNumber,
          institute_name: log.instituteName,
          details: log.details
        });
      } catch (err) {
        console.warn('Supabase audit log insert error:', err);
      }
    }
  }
};
