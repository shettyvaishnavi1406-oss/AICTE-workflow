export type ApplicationStage = 
  | 'Draft'
  | 'Submitted'
  | 'Scrutiny'
  | 'Scrutiny Pending'
  | 'Scrutiny Completed'
  | 'EVC'
  | 'EVC Pending'
  | 'EVC Scheduled'
  | 'EVC Completed'
  | 'SAC Review'
  | 'Approved'
  | 'Deficiency Issued'
  | 'Rejected';

export type ApplicationType =
  | 'Extension of Approval (EoA)'
  | 'New Technical Institution'
  | 'Increase in Intake'
  | 'Introduction of New Course / Division'
  | 'Change of Site / Location';

export interface Application {
  id: string;
  applicationNumber: string;
  instituteName: string;
  instituteCode: string;
  state: string;
  region: 'Northern' | 'Western' | 'Eastern' | 'Southern' | 'South-Western' | 'Central';
  applicationType: ApplicationType;
  academicYear: string;
  submissionDate: string;
  currentStage: ApplicationStage;
  stageProgress: number; // 0 to 100
  processingDays: number;
  isOverdue: boolean;
  evcAssigned: boolean;
  evcId?: string;
  feePaid: number;
  totalIntakeProposed: number;
  complianceRating: 'High' | 'Moderate' | 'Deficient';
  documents: {
    name: string;
    verified: boolean;
    dateUploaded: string;
  }[];
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  remarks?: string;
  assignedDate?: string;
  processingPath?: 'Scrutiny + EVC' | 'Only EVC' | 'EVC + SAC/SHC' | 'Scrutiny + EVC + SAC/SHC';
  evcDeadlineDate?: string;
}

export interface EVCVisit {
  id: string;
  visitCode: string;
  applicationNumber: string;
  instituteName: string;
  instituteCode: string;
  city: string;
  state: string;
  visitDate: string;
  visitTime: string;
  visitMode: 'Physical On-Site' | 'Virtual Video EVC';
  status: 'Scheduled' | 'Committee Assembled' | 'Inspection Completed' | 'Report Submitted' | 'Report Verified';
  chairman: string;
  experts: string[];
  convenor: string;
  meetingLink?: string;
  instructions: string;
  inspectionReportUrl?: string;
  criticalFindings?: string;
  assignedDate?: string;
  deadlineDate?: string;
}

export interface ComplianceRecord {
  id: string;
  instituteCode: string;
  instituteName: string;
  applicationNumber: string;
  category: 
    | 'Land Lease & Title Deed' 
    | 'Building Occupancy / Fire NOC' 
    | 'Faculty Cadre & AICTE Pay Scales' 
    | 'NBA / NAAC Accreditation' 
    | 'Barrier Free Built Environment' 
    | 'AICTE-approved Library & E-Journals';
  title: string;
  validUntil: string;
  daysRemaining: number;
  urgency: 'Normal' | 'Expiring Soon' | 'Critical Expired' | 'Overdue';
  status: 'Compliant' | 'Renewal Pending' | 'Notice Dispatched' | 'Non-Compliant';
  lastAuditDate: string;
  actionRequired: string;
  escalation_level?: number;
  escalated_at?: string | null;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  role: 'Scrutiny Officer' | 'Regional Officer (RO)' | 'EVC Chairman' | 'Member Secretary' | 'System Automated';
  action: string;
  applicationNumber: string;
  instituteName: string;
  details: string;
}

export interface ExpertProfile {
  id: string;
  name: string;
  designation: string;
  institution: string;
  discipline: string;
  city: string;
  state: string;
  completedVisits: number;
  status: 'Available' | 'Assigned' | 'On Leave';
  rating: number;
}

export type UndertakingStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Undertaking {
  id: string;
  compliance_record_id: string;
  type: string;
  description: string;
  due_date: string;
  status: UndertakingStatus;
  escalation_level: number;
  escalated_at: string | null;
  created_at: string;
  updated_at: string;
  compliance_records?: {
    id: string;
    institute_code: string;
    institute_name: string;
    application_number: string;
    category: string;
    title: string;
  };
}

export interface UndertakingEscalation {
  id: string;
  undertaking_id: string;
  previous_level: number;
  new_level: number;
  escalation_reason: string;
  created_at: string;
}

export interface EscalationAuditLog {
  id: string;
  event_timestamp: string;
  record_type: 'compliance_record' | 'undertaking';
  record_id: string;
  rule_identifier: string; // 'R1' | 'R2' | 'R3' | 'U1' | 'U2'
  previous_level: number;
  new_level: number;
  recipient_role: string;
  action: string;
  reason: string;
  deadline_date: string;
  result_status: 'success' | 'error' | 'skipped';
  error_message?: string | null;
  created_at: string;
}

export interface InAppNotification {
  id: string;
  recipient_role: string;
  title: string;
  message: string;
  record_type: 'compliance_record' | 'undertaking';
  record_id: string;
  rule_identifier: string;
  severity: 'info' | 'warning' | 'critical';
  is_read: boolean;
  created_at: string;
}

export interface EscalationEngineSummary {
  success: boolean;
  records_checked: number;
  reminders_created: number;
  escalations_performed: number;
  errors_count: number;
  evaluation_date?: string;
  details?: Array<{
    record_type: string;
    record_id: string;
    rule: string;
    previous_level: number;
    new_level: number;
    recipient: string;
    action: string;
  }>;
  timestamp: string;
}

export type EVCAssignmentStatus = 'Upcoming' | 'Pending' | 'Report Due' | 'Overdue' | 'Completed';

export interface EVCAssignedApplication {
  id: string;
  applicationNumber: string;
  instituteName: string;
  instituteCode: string;
  region: 'Northern' | 'Western' | 'Eastern' | 'Southern' | 'South-Western' | 'Central';
  state: string;
  applicationType: ApplicationType;
  processingPath: 'Scrutiny + EVC' | 'Only EVC' | 'EVC + SAC/SHC' | 'Fast-track EoA';
  assignedDate: string;
  visitDate: string;
  visitTime: string;
  visitMode: 'Physical On-Site' | 'Virtual Video EVC';
  ageingDays: number;
  prescribedDeadline: string;
  daysRemaining: number;
  status: EVCAssignmentStatus;
  evcVisitId: string;
  visitCode: string;
  chairman: string;
  experts: string[];
  convenor: string;
  meetingLink?: string;
  instructions?: string;
  criticalFindings?: string;
  scrutinyObservations?: string;
  documents?: {
    name: string;
    verified: boolean;
    dateUploaded: string;
  }[];
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  totalIntakeProposed?: number;
}

export interface EVCAssignmentsSummary {
  totalAssigned: number;
  upcoming: number;
  pending: number;
  reportDue: number;
  overdue: number;
  completed: number;
}

export interface EVCAssignmentsQueryParams {
  status?: string;
  region?: string;
  applicationType?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'deadline' | 'assignedDate' | 'ageing';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PaginatedEVCAssignments {
  data: EVCAssignedApplication[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
