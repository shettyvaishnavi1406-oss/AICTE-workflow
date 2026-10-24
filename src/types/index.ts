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
}

export type EVCVisitStatus =
  | 'Scheduled'
  | 'In Progress'
  | 'Report Submitted'
  | 'Verified'
  | 'Committee Assembled'
  | 'Inspection Completed'
  | 'Report Verified';

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
  status: EVCVisitStatus;
  chairman: string;
  experts: string[];
  convenor: string;
  meetingLink?: string;
  instructions: string;
  inspectionReportUrl?: string;
  criticalFindings?: string;
  startedAt?: string;
  reportSubmittedAt?: string;
  verifiedAt?: string;
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
