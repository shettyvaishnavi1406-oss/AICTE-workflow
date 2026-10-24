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
  AuditLogItem,
  ExpertProfile,
  ApplicationStage
} from '../types';
import {
  isValidTransition,
  calculateStageProgress
} from '../lib/workflow';

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
 * dynamically calculating processingDays and isOverdue at runtime.
 */
export function mapApplicationRow(row: SupabaseApplicationRow): Application {
  const processingDays = calculateProcessingDays(row.submission_date);
  const isOverdue = calculateIsOverdue(row.current_stage, processingDays);

  return {
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
    stageProgress: calculateStageProgress(row.current_stage),
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
    criticalFindings: row.critical_findings
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
   * Fetch all applications with dynamically computed processingDays and isOverdue
   */
  async getApplications(): Promise<Application[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('applications')
          .select('*')
          .order('submission_date', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped = data.map((row) => mapApplicationRow(row as SupabaseApplicationRow));
          saveStoredApplications(mapped);
          return mapped;
        }
        if (error) {
          console.warn('Supabase applications fetch failed, using fallback:', error.message);
        }
      } catch (err) {
        console.warn('Error connecting to Supabase applications:', err);
      }
    }
    return getStoredApplications();
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

    const calculatedProgress = customStageProgress ?? calculateStageProgress(newStage);

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
    remarks: string
  ): void {
    const apps = getStoredApplications();
    const appIndex = apps.findIndex((a) => a.id === appId);
    if (appIndex !== -1) {
      apps[appIndex].currentStage = newStage;
      apps[appIndex].stageProgress = stageProgress;
      apps[appIndex].remarks = remarks;
      saveStoredApplications(apps);
    }
  },

  /**
   * Add a new EVC visit and update the related application.
   */
  async addEVCVisit(visit: EVCVisit): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('evc_visits').insert({
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

        // Also update application evc status in Supabase
        await supabase
          .from('applications')
          .update({
            current_stage: 'EVC Scheduled',
            stage_progress: 65,
            evc_assigned: true,
            evc_id: visit.id,
            updated_at: new Date().toISOString()
          })
          .eq('application_number', visit.applicationNumber);
      } catch (err) {
        console.warn('Supabase EVC visit insert error:', err);
      }
    }
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
