import { Application, EVCVisit, ComplianceRecord, AuditLogItem, ExpertProfile } from '../types';
import {
  calculateDaysRemaining,
  calculateUrgency,
  calculateProcessingDays,
  calculateIsOverdue
} from '../lib/dateCalculations';
import { calculateStageProgress } from '../lib/workflow';

export function enrichApplicationCalculations(app: Application): Application {
  const processingDays = calculateProcessingDays(app.submissionDate);
  const isOverdue = calculateIsOverdue(app.currentStage, processingDays);
  return {
    ...app,
    stageProgress: calculateStageProgress(app.currentStage),
    processingDays,
    isOverdue
  };
}

export function enrichComplianceCalculations(rec: ComplianceRecord): ComplianceRecord {
  const daysRemaining = calculateDaysRemaining(rec.validUntil);
  const urgency = calculateUrgency(daysRemaining, rec.status);
  return {
    ...rec,
    daysRemaining,
    urgency
  };
}

export const INITIAL_APPLICATIONS: Application[] = [
  {
    id: 'app-001',
    applicationNumber: 'AICTE/2026/WR/1-938201',
    instituteName: 'Vidyalankar Institute of Technology',
    instituteCode: 'VIT-MUM-142',
    state: 'Maharashtra',
    region: 'Western',
    applicationType: 'Extension of Approval (EoA)',
    academicYear: '2026-27',
    submissionDate: '2026-09-14',
    currentStage: 'EVC Scheduled',
    stageProgress: 65,
    processingDays: 41,
    isOverdue: false,
    evcAssigned: true,
    evcId: 'evc-201',
    feePaid: 250000,
    totalIntakeProposed: 720,
    complianceRating: 'High',
    contactPerson: 'Dr. Suresh R. Patil (Principal)',
    contactEmail: 'principal@vit.edu.in',
    contactPhone: '+91 98201 34521',
    remarks: 'Scrutiny cleared. Video EVC arranged for robotics lab inspection.',
    documents: [
      { name: 'Fire NOC Certificate 2026', verified: true, dateUploaded: '2026-09-15' },
      { name: 'Land Registry Deed & Lease Extract', verified: true, dateUploaded: '2026-09-15' },
      { name: 'AICTE Cadre Ratio Affidavit', verified: true, dateUploaded: '2026-09-16' },
      { name: 'NBA Accreditation Certificate', verified: true, dateUploaded: '2026-09-18' }
    ]
  },
  {
    id: 'app-002',
    applicationNumber: 'AICTE/2026/NR/1-847291',
    instituteName: 'Delhi Technological Institute of Engineering',
    instituteCode: 'DTIE-DEL-089',
    state: 'Delhi',
    region: 'Northern',
    applicationType: 'Increase in Intake',
    academicYear: '2026-27',
    submissionDate: '2026-08-28',
    currentStage: 'EVC Pending',
    stageProgress: 45,
    processingDays: 57,
    isOverdue: true,
    evcAssigned: false,
    feePaid: 325000,
    totalIntakeProposed: 960,
    complianceRating: 'Moderate',
    contactPerson: 'Prof. Arvind Saxena (Dean Academics)',
    contactEmail: 'academics@dtie.ac.in',
    contactPhone: '+91 94120 78643',
    remarks: 'Pending physical visit committee assignment past statutory 45 days.',
    documents: [
      { name: 'Municipal Occupancy Certificate', verified: true, dateUploaded: '2026-08-29' },
      { name: 'Audited Balance Sheets (3 yrs)', verified: true, dateUploaded: '2026-08-30' },
      { name: 'Faculty List with Form 16', verified: false, dateUploaded: '2026-09-02' }
    ]
  },
  {
    id: 'app-003',
    applicationNumber: 'AICTE/2026/SR/1-729482',
    instituteName: 'Coimbatore Institute of Engineering & Research',
    instituteCode: 'CIER-TN-310',
    state: 'Tamil Nadu',
    region: 'Southern',
    applicationType: 'Introduction of New Course / Division',
    academicYear: '2026-27',
    submissionDate: '2026-10-02',
    currentStage: 'Scrutiny Completed',
    stageProgress: 35,
    processingDays: 22,
    isOverdue: false,
    evcAssigned: false,
    feePaid: 175000,
    totalIntakeProposed: 120,
    complianceRating: 'High',
    contactPerson: 'Dr. Meenakshi Sundaram',
    contactEmail: 'director@cier.edu.in',
    contactPhone: '+91 97890 11234',
    remarks: 'Application verified by RO Chennai. B.Tech Artificial Intelligence proposal.',
    documents: [
      { name: 'Curriculum & Syllabi Scheme', verified: true, dateUploaded: '2026-10-03' },
      { name: 'Computer Center Carpet Area Proof', verified: true, dateUploaded: '2026-10-04' }
    ]
  },
  {
    id: 'app-004',
    applicationNumber: 'AICTE/2026/CR/1-654819',
    instituteName: 'Bhopal National Polytechnic & Science College',
    instituteCode: 'BNP-MP-045',
    state: 'Madhya Pradesh',
    region: 'Central',
    applicationType: 'Extension of Approval (EoA)',
    academicYear: '2026-27',
    submissionDate: '2026-08-15',
    currentStage: 'Deficiency Issued',
    stageProgress: 50,
    processingDays: 70,
    isOverdue: true,
    evcAssigned: false,
    feePaid: 150000,
    totalIntakeProposed: 480,
    complianceRating: 'Deficient',
    contactPerson: 'Dr. Vinay Kumar Shrivastava',
    contactEmail: 'polytechnic.bhopal@gov.mp.in',
    contactPhone: '+91 94250 88912',
    remarks: 'Building safety certificate expired in July 2026. 15-day cure notice issued.',
    documents: [
      { name: 'Fire NOC Certificate (Expired)', verified: false, dateUploaded: '2026-08-16' },
      { name: 'Society Registration Certificate', verified: true, dateUploaded: '2026-08-16' }
    ]
  },
  {
    id: 'app-005',
    applicationNumber: 'AICTE/2026/SWR/1-992384',
    instituteName: 'Bangalore Academy of Technology & Management',
    instituteCode: 'BATM-KAR-771',
    state: 'Karnataka',
    region: 'South-Western',
    applicationType: 'Extension of Approval (EoA)',
    academicYear: '2026-27',
    submissionDate: '2026-07-20',
    currentStage: 'Approved',
    stageProgress: 100,
    processingDays: 32,
    isOverdue: false,
    evcAssigned: true,
    evcId: 'evc-104',
    feePaid: 250000,
    totalIntakeProposed: 1080,
    complianceRating: 'High',
    contactPerson: 'Dr. C. K. Narayana Murthy',
    contactEmail: 'approvals@batm.edu.in',
    contactPhone: '+91 99000 44321',
    remarks: 'Approval Letter dispatched digitally with cryptographic signature.',
    documents: [
      { name: 'Final EVC Clean Verification Report', verified: true, dateUploaded: '2026-08-10' },
      { name: 'Sanction Letter 2026-27', verified: true, dateUploaded: '2026-08-22' }
    ]
  },
  {
    id: 'app-006',
    applicationNumber: 'AICTE/2026/ER/1-419082',
    instituteName: 'Kolkata Institute of Pharmaceutical Sciences',
    instituteCode: 'KIPS-WB-118',
    state: 'West Bengal',
    region: 'Eastern',
    applicationType: 'New Technical Institution',
    academicYear: '2026-27',
    submissionDate: '2026-09-05',
    currentStage: 'SAC Review',
    stageProgress: 85,
    processingDays: 49,
    isOverdue: false,
    evcAssigned: true,
    evcId: 'evc-208',
    feePaid: 500000,
    totalIntakeProposed: 100,
    complianceRating: 'High',
    contactPerson: 'Dr. Ananya Mukherjee',
    contactEmail: 'director@kips.edu.in',
    contactPhone: '+91 98300 76512',
    remarks: 'Standing Appellate Committee review underway for machine room floor clearance.',
    documents: [
      { name: 'PCI NOC Concurrence', verified: true, dateUploaded: '2026-09-06' },
      { name: 'Pollution Control Board Clearance', verified: true, dateUploaded: '2026-09-08' }
    ]
  },
  {
    id: 'app-007',
    applicationNumber: 'AICTE/2026/WR/1-773821',
    instituteName: 'Pune Engineering College of Technology',
    instituteCode: 'PECT-PUN-029',
    state: 'Maharashtra',
    region: 'Western',
    applicationType: 'Increase in Intake',
    academicYear: '2026-27',
    submissionDate: '2026-09-22',
    currentStage: 'Scrutiny Pending',
    stageProgress: 20,
    processingDays: 32,
    isOverdue: false,
    evcAssigned: false,
    feePaid: 200000,
    totalIntakeProposed: 840,
    complianceRating: 'Moderate',
    contactPerson: 'Dr. Rajendra Kulkarni',
    contactEmail: 'dean@pect.ac.in',
    contactPhone: '+91 98220 54399',
    remarks: 'Under initial scrutiny check at Western Regional Office.',
    documents: [
      { name: 'Building Blueprint Endorsement', verified: false, dateUploaded: '2026-09-23' },
      { name: 'Affiliation Letter from State Technical Univ', verified: true, dateUploaded: '2026-09-24' }
    ]
  },
  {
    id: 'app-008',
    applicationNumber: 'AICTE/2026/WR/1-552109',
    instituteName: 'Maharashtra Institute of Technology',
    instituteCode: 'MIT-PUN-052',
    state: 'Maharashtra',
    region: 'Western',
    applicationType: 'Extension of Approval (EoA)',
    academicYear: '2026-27',
    submissionDate: '2026-09-28',
    currentStage: 'EVC Pending',
    stageProgress: 45,
    processingDays: 27,
    isOverdue: false,
    evcAssigned: true,
    evcId: 'evc-202',
    feePaid: 250000,
    totalIntakeProposed: 900,
    complianceRating: 'High',
    contactPerson: 'Dr. Sunil D. Bagade (Dean Academic)',
    contactEmail: 'academics@mitpune.edu.in',
    contactPhone: '+91 98230 45671',
    remarks: 'Committee constituted. Inspection date pending scheduling.',
    documents: [
      { name: 'Fire NOC Certificate 2026-27', verified: true, dateUploaded: '2026-09-29' },
      { name: 'Cadre Ratio Form 16 Affidavit', verified: true, dateUploaded: '2026-10-01' }
    ]
  },
  {
    id: 'app-009',
    applicationNumber: 'AICTE/2026/WR/1-382901',
    instituteName: 'Government College of Engineering, Chhatrapati Sambhajinagar',
    instituteCode: 'GCOE-AUR-115',
    state: 'Maharashtra',
    region: 'Western',
    applicationType: 'Increase in Intake',
    academicYear: '2026-27',
    submissionDate: '2026-09-10',
    currentStage: 'EVC Scheduled',
    stageProgress: 65,
    processingDays: 45,
    isOverdue: false,
    evcAssigned: true,
    evcId: 'evc-203',
    feePaid: 300000,
    totalIntakeProposed: 660,
    complianceRating: 'High',
    contactPerson: 'Dr. Rameshwar B. Patil (Principal)',
    contactEmail: 'principal@geca.ac.in',
    contactPhone: '+91 94220 89012',
    remarks: 'Physical on-site inspection executed on 22-Oct-2026. Awaiting final committee report upload.',
    documents: [
      { name: 'Carpet Area Built-up Map', verified: true, dateUploaded: '2026-09-12' },
      { name: 'AICTE Faculty Pay Scale Certificate', verified: true, dateUploaded: '2026-09-15' }
    ]
  },
  {
    id: 'app-010',
    applicationNumber: 'AICTE/2026/WR/1-994120',
    instituteName: 'Pune Institute of Computer Technology',
    instituteCode: 'PICT-PUN-088',
    state: 'Maharashtra',
    region: 'Western',
    applicationType: 'Introduction of New Course / Division',
    academicYear: '2026-27',
    submissionDate: '2026-08-25',
    currentStage: 'EVC Scheduled',
    stageProgress: 65,
    processingDays: 61,
    isOverdue: true,
    evcAssigned: true,
    evcId: 'evc-204',
    feePaid: 200000,
    totalIntakeProposed: 780,
    complianceRating: 'Moderate',
    contactPerson: 'Dr. Rajeshree S. Rao (Director)',
    contactEmail: 'director@pict.edu.in',
    contactPhone: '+91 98221 67890',
    remarks: 'Statutory 15-day EVC deadline lapsed. Immediate report submission required.',
    documents: [
      { name: 'AICTE IDEA Lab Sanction Letter', verified: true, dateUploaded: '2026-08-26' },
      { name: 'Municipal Occupancy Certificate', verified: true, dateUploaded: '2026-08-27' }
    ]
  },
  {
    id: 'app-011',
    applicationNumber: 'AICTE/2026/WR/1-724183',
    instituteName: 'Sinhgad Institute of Technology',
    instituteCode: 'SIT-LON-033',
    state: 'Maharashtra',
    region: 'Western',
    applicationType: 'Extension of Approval (EoA)',
    academicYear: '2026-27',
    submissionDate: '2026-09-02',
    currentStage: 'EVC Completed',
    stageProgress: 75,
    processingDays: 53,
    isOverdue: false,
    evcAssigned: true,
    evcId: 'evc-205',
    feePaid: 250000,
    totalIntakeProposed: 600,
    complianceRating: 'High',
    contactPerson: 'Dr. M. S. Gaikwad (Principal)',
    contactEmail: 'principal_sit@sinhgad.edu',
    contactPhone: '+91 98223 90123',
    remarks: 'Virtual inspection concluded. Verification report submitted and verified.',
    documents: [
      { name: 'Annual EoA Affidavit 2026', verified: true, dateUploaded: '2026-09-03' },
      { name: 'Fire Safety NOC Certificate', verified: true, dateUploaded: '2026-09-04' }
    ]
  }
];

export const INITIAL_EVC_VISITS: EVCVisit[] = [
  {
    id: 'evc-201',
    visitCode: 'EVC/WR/2026/089',
    applicationNumber: 'AICTE/2026/WR/1-938201',
    instituteName: 'Vidyalankar Institute of Technology',
    instituteCode: 'VIT-MUM-142',
    city: 'Mumbai',
    state: 'Maharashtra',
    visitDate: '2026-10-28',
    visitTime: '10:30 AM IST',
    visitMode: 'Virtual Video EVC',
    status: 'Scheduled',
    chairman: 'Prof. (Dr.) Amitabh Mohanty (IIT Bombay)',
    experts: ['Dr. Savita Deshpande (VJTI Mumbai)', 'Prof. K. N. Sridhar (NIT Surat)'],
    convenor: 'Shri Manoj Sharma (Assistant Director, RO Mumbai)',
    meetingLink: 'https://evc-meet.aicte-india.org/room/wr-vit-938201',
    instructions: 'Geo-tagged live video streaming required from Advanced Robotics Lab and 3rd Floor Server Room.',
    criticalFindings: 'Awaiting inspection execution.'
  },
  {
    id: 'evc-202',
    visitCode: 'EVC/WR/2026/104',
    applicationNumber: 'AICTE/2026/WR/1-552109',
    instituteName: 'Maharashtra Institute of Technology',
    instituteCode: 'MIT-PUN-052',
    city: 'Pune',
    state: 'Maharashtra',
    visitDate: '',
    visitTime: '10:00 AM IST',
    visitMode: 'Physical On-Site',
    status: 'Committee Assembled',
    assignedDate: '2026-10-23',
    deadlineDate: '2026-11-07',
    chairman: 'Prof. (Dr.) Amitabh Mohanty (IIT Bombay)',
    experts: ['Prof. Vikram H. Joshi (NITK Surathkal)', 'Dr. Ramesh K. Narayanan (PSG Tech)'],
    convenor: 'Shri Manoj Sharma (Assistant Director, RO Mumbai)',
    instructions: 'Verification of mechanical workshop floor space and machine tools inventory.'
  },
  {
    id: 'evc-203',
    visitCode: 'EVC/WR/2026/077',
    applicationNumber: 'AICTE/2026/WR/1-382901',
    instituteName: 'Government College of Engineering, Chhatrapati Sambhajinagar',
    instituteCode: 'GCOE-AUR-115',
    city: 'Chhatrapati Sambhajinagar',
    state: 'Maharashtra',
    visitDate: '2026-10-22',
    visitTime: '11:00 AM IST',
    visitMode: 'Physical On-Site',
    status: 'Inspection Completed',
    chairman: 'Prof. (Dr.) Amitabh Mohanty (IIT Bombay)',
    experts: ['Dr. Ananya Ray (MANIT Bhopal)', 'Prof. Harish B. Mehta (SVNIT Surat)'],
    convenor: 'Dr. Ramesh Chandra (RO Mumbai)',
    instructions: 'Physical verification of newly sanctioned Mechanical engineering block and workshop.'
  },
  {
    id: 'evc-204',
    visitCode: 'EVC/WR/2026/051',
    applicationNumber: 'AICTE/2026/WR/1-994120',
    instituteName: 'Pune Institute of Computer Technology',
    instituteCode: 'PICT-PUN-088',
    city: 'Pune',
    state: 'Maharashtra',
    visitDate: '2026-10-10',
    visitTime: '10:00 AM IST',
    visitMode: 'Physical On-Site',
    status: 'Scheduled',
    chairman: 'Prof. (Dr.) Amitabh Mohanty (IIT Bombay)',
    experts: ['Prof. Manisha Verma (IIT Delhi)', 'Dr. Sunita Srivastava (MNNIT)'],
    convenor: 'Shri Manoj Sharma (Assistant Director, RO Mumbai)',
    instructions: 'Inspection of AICTE IDEA Lab and high-performance computing cluster.'
  },
  {
    id: 'evc-205',
    visitCode: 'EVC/WR/2026/038',
    applicationNumber: 'AICTE/2026/WR/1-724183',
    instituteName: 'Sinhgad Institute of Technology',
    instituteCode: 'SIT-LON-033',
    city: 'Lonavala',
    state: 'Maharashtra',
    visitDate: '2026-10-08',
    visitTime: '11:30 AM IST',
    visitMode: 'Virtual Video EVC',
    status: 'Report Submitted',
    chairman: 'Prof. (Dr.) Amitabh Mohanty (IIT Bombay)',
    experts: ['Dr. Ramesh K. Narayanan (PSG Tech)', 'Prof. Vikram H. Joshi (NITK)'],
    convenor: 'Dr. Ramesh Chandra (RO Mumbai)',
    meetingLink: 'https://evc-meet.aicte-india.org/room/sit-lon-033',
    instructions: 'Virtual verification of faculty salary bank statements and CAD laboratory.',
    criticalFindings: 'Faculty cadre ratio verified 1:15. All 4 CAD computing labs fully compliant with AICTE norms.'
  },
  {
    id: 'evc-208',
    visitCode: 'EVC/ER/2026/044',
    applicationNumber: 'AICTE/2026/ER/1-419082',
    instituteName: 'Kolkata Institute of Pharmaceutical Sciences',
    instituteCode: 'KIPS-WB-118',
    city: 'Kolkata',
    state: 'West Bengal',
    visitDate: '2026-10-18',
    visitTime: '11:00 AM IST',
    visitMode: 'Physical On-Site',
    status: 'Report Submitted',
    chairman: 'Prof. S. C. Bhattacharya (Jadavpur University)',
    experts: ['Dr. Tapas Ghosh (NIPER Kolkata)', 'Prof. Nilanjana Roy (Calcutta Univ)'],
    convenor: 'Smt. Debashree Sen (RO Kolkata)',
    instructions: 'On-site verification of chemistry labs, ventilation shafts, and animal house clearances.',
    criticalFindings: 'Lab area meets AICTE norm (210 sq.m). Verified and forwarded to SAC.'
  },
  {
    id: 'evc-210',
    visitCode: 'EVC/NR/2026/112',
    applicationNumber: 'AICTE/2026/NR/1-847291',
    instituteName: 'Delhi Technological Institute of Engineering',
    instituteCode: 'DTIE-DEL-089',
    city: 'New Delhi',
    state: 'Delhi',
    visitDate: '2026-11-04',
    visitTime: '09:30 AM IST',
    visitMode: 'Physical On-Site',
    status: 'Scheduled',
    chairman: 'Prof. R. P. Singh (DTU Delhi)',
    experts: ['Prof. Manisha Verma (IIT Delhi)', 'Dr. Harish Chander (NIT Kurukshetra)'],
    convenor: 'Shri Vikram Malhotra (RO Chandigarh)',
    instructions: 'Physical verification of newly constructed wing for CSE & Data Science intake expansion.',
    criticalFindings: 'Committee members accepted duty.'
  }
];

export const INITIAL_COMPLIANCE: ComplianceRecord[] = [
  {
    id: 'comp-101',
    instituteCode: 'BNP-MP-045',
    instituteName: 'Bhopal National Polytechnic & Science College',
    applicationNumber: 'AICTE/2026/CR/1-654819',
    category: 'Building Occupancy / Fire NOC',
    title: 'Fire Safety NOC & Life Safety Code 2026',
    validUntil: '2026-07-31',
    daysRemaining: -85,
    urgency: 'Critical Expired',
    status: 'Non-Compliant',
    lastAuditDate: '2026-08-15',
    actionRequired: 'Submit certified Municipal Fire NOC within 7 days or face intake freeze.'
  },
  {
    id: 'comp-102',
    instituteCode: 'DTIE-DEL-089',
    instituteName: 'Delhi Technological Institute of Engineering',
    applicationNumber: 'AICTE/2026/NR/1-847291',
    category: 'Land Lease & Title Deed',
    title: 'Campus Master Lease Agreement (30-year deed)',
    validUntil: '2026-11-15',
    daysRemaining: 22,
    urgency: 'Expiring Soon',
    status: 'Renewal Pending',
    lastAuditDate: '2026-09-01',
    actionRequired: 'Provide registered lease extension document with sub-registrar seal.'
  },
  {
    id: 'comp-103',
    instituteCode: 'VIT-MUM-142',
    instituteName: 'Vidyalankar Institute of Technology',
    applicationNumber: 'AICTE/2026/WR/1-938201',
    category: 'NBA / NAAC Accreditation',
    title: 'NBA Tier-1 Accreditation (Computer & IT Dept)',
    validUntil: '2026-12-31',
    daysRemaining: 68,
    urgency: 'Expiring Soon',
    status: 'Renewal Pending',
    lastAuditDate: '2026-09-20',
    actionRequired: 'SAR self-assessment report submission to NBA portal for cycle renewal.'
  },
  {
    id: 'comp-104',
    instituteCode: 'CIER-TN-310',
    instituteName: 'Coimbatore Institute of Engineering & Research',
    applicationNumber: 'AICTE/2026/SR/1-729482',
    category: 'Faculty Cadre & AICTE Pay Scales',
    title: 'Cadre Ratio 1:2:6 & 7th Central Pay Commission',
    validUntil: '2027-03-31',
    daysRemaining: 158,
    urgency: 'Normal',
    status: 'Compliant',
    lastAuditDate: '2026-10-02',
    actionRequired: 'Annual affidavit verified. Next audit due in Q1 2027.'
  },
  {
    id: 'comp-105',
    instituteCode: 'PECT-PUN-029',
    instituteName: 'Pune Engineering College of Technology',
    applicationNumber: 'AICTE/2026/WR/1-773821',
    category: 'Barrier Free Built Environment',
    title: 'Divyangjan Accessibility & Lift Certificate',
    validUntil: '2026-11-05',
    daysRemaining: 12,
    urgency: 'Expiring Soon',
    status: 'Notice Dispatched',
    lastAuditDate: '2026-10-05',
    actionRequired: 'Provide updated fitness inspection certificate for tactile paving & accessible elevators.'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'aud-901',
    timestamp: '2026-10-24 11:42 AM IST',
    actor: 'Dr. Ramesh Chandra',
    role: 'Regional Officer (RO)',
    action: 'EVC Visit Scheduled',
    applicationNumber: 'AICTE/2026/WR/1-938201',
    instituteName: 'Vidyalankar Institute of Technology',
    details: 'Virtual Video EVC scheduled for 28 Oct 2026. Experts Prof. Amitabh Mohanty & team notified.'
  },
  {
    id: 'aud-902',
    timestamp: '2026-10-23 04:15 PM IST',
    actor: 'System Automated',
    role: 'System Automated',
    action: 'Compliance Alert Generated',
    applicationNumber: 'AICTE/2026/NR/1-847291',
    instituteName: 'Delhi Technological Institute of Engineering',
    details: 'Triggered 30-day notice for expiring campus land lease deed expiring 15-Nov-2026.'
  },
  {
    id: 'aud-903',
    timestamp: '2026-10-22 02:30 PM IST',
    actor: 'Prof. S. C. Bhattacharya',
    role: 'EVC Chairman',
    action: 'Inspection Report Submitted',
    applicationNumber: 'AICTE/2026/ER/1-419082',
    instituteName: 'Kolkata Institute of Pharmaceutical Sciences',
    details: 'Submitted physical inspection verification report ER/2026/044 to Member Secretary portal.'
  },
  {
    id: 'aud-904',
    timestamp: '2026-10-20 10:10 AM IST',
    actor: 'Shri A. K. Sen',
    role: 'Scrutiny Officer',
    action: 'Deficiency Notice Issued',
    applicationNumber: 'AICTE/2026/CR/1-654819',
    instituteName: 'Bhopal National Polytechnic & Science College',
    details: 'Issued formal show-cause letter regarding lapsed municipal Fire NOC certificate.'
  },
  {
    id: 'aud-905',
    timestamp: '2026-10-18 05:22 PM IST',
    actor: 'Member Secretary AICTE',
    role: 'Member Secretary',
    action: 'Approval Order Dispatched',
    applicationNumber: 'AICTE/2026/SWR/1-992384',
    instituteName: 'Bangalore Academy of Technology & Management',
    details: 'Digitally signed Extension of Approval order for academic session 2026-27 released.'
  }
];

export const INITIAL_EXPERTS: ExpertProfile[] = [
  {
    id: 'exp-1',
    name: 'Prof. (Dr.) Amitabh Mohanty',
    designation: 'Senior Professor & Former HOD',
    institution: 'Indian Institute of Technology Bombay',
    discipline: 'Mechanical & Automation Engineering',
    city: 'Mumbai',
    state: 'Maharashtra',
    completedVisits: 38,
    status: 'Assigned',
    rating: 4.9
  },
  {
    id: 'exp-2',
    name: 'Prof. Manisha Verma',
    designation: 'Professor of Computer Science',
    institution: 'Indian Institute of Technology Delhi',
    discipline: 'Computer Science & AI',
    city: 'New Delhi',
    state: 'Delhi',
    completedVisits: 24,
    status: 'Available',
    rating: 4.8
  },
  {
    id: 'exp-3',
    name: 'Dr. Savita Deshpande',
    designation: 'Associate Dean of Infrastructure',
    institution: 'VJTI Mumbai',
    discipline: 'Civil & Environmental Engineering',
    city: 'Mumbai',
    state: 'Maharashtra',
    completedVisits: 19,
    status: 'Assigned',
    rating: 4.7
  },
  {
    id: 'exp-4',
    name: 'Prof. R. P. Singh',
    designation: 'Director & Chair Professor',
    institution: 'Delhi Technological University',
    discipline: 'Electrical & Electronics',
    city: 'New Delhi',
    state: 'Delhi',
    completedVisits: 45,
    status: 'Available',
    rating: 4.9
  },
  {
    id: 'exp-5',
    name: 'Dr. Ramesh K. Narayanan',
    designation: 'Professor & Dean of Research',
    institution: 'PSG College of Technology',
    discipline: 'Computer Science & AI',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    completedVisits: 14,
    status: 'Available',
    rating: 4.8
  },
  {
    id: 'exp-6',
    name: 'Dr. Meera Sen',
    designation: 'Associate Professor',
    institution: 'National Institute of Pharmaceutical Education and Research',
    discipline: 'Pharmaceutical Sciences',
    city: 'Kolkata',
    state: 'West Bengal',
    completedVisits: 11,
    status: 'Available',
    rating: 4.6
  },
  {
    id: 'exp-7',
    name: 'Prof. Vikram H. Joshi',
    designation: 'Senior Professor of Mechanical',
    institution: 'National Institute of Technology Karnataka (NITK)',
    discipline: 'Mechanical & Automation Engineering',
    city: 'Surathkal',
    state: 'Karnataka',
    completedVisits: 22,
    status: 'Available',
    rating: 4.85
  },
  {
    id: 'exp-8',
    name: 'Dr. Ananya Ray',
    designation: 'Professor of Civil Engineering',
    institution: 'Maulana Azad National Institute of Technology',
    discipline: 'Civil & Environmental Engineering',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    completedVisits: 16,
    status: 'Available',
    rating: 4.75
  }
];

// LocalStorage helpers to preserve data & allow dynamic mutations
export const STORAGE_KEYS = {
  APPLICATIONS: 'aicte_portal_applications',
  EVC_VISITS: 'aicte_portal_evc_visits',
  COMPLIANCE: 'aicte_portal_compliance',
  AUDIT_LOGS: 'aicte_portal_audit_logs',
  EXPERTS: 'aicte_portal_experts'
} as const;

export function clearApplicationStorage(): void {
  if (typeof localStorage === 'undefined') return;
  const keys = Object.values(STORAGE_KEYS);
  for (const key of keys) {
    localStorage.removeItem(key);
  }
}

const memoryStore: Record<string, string> = {};

export function loadData<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') {
      const raw = memoryStore[key];
      return raw ? JSON.parse(raw) as T : fallback;
    }
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`Error loading localStorage key "${key}":`, e);
    return fallback;
  }
}

export function saveData<T>(key: string, data: T): void {
  try {
    if (typeof localStorage === 'undefined') {
      memoryStore[key] = JSON.stringify(data);
      return;
    }
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving localStorage key "${key}":`, e);
  }
}

export const getStoredApplications = (): Application[] =>
  loadData(STORAGE_KEYS.APPLICATIONS, INITIAL_APPLICATIONS).map(enrichApplicationCalculations);
export const saveStoredApplications = (apps: Application[]) => saveData(STORAGE_KEYS.APPLICATIONS, apps);

export const getStoredEVCVisits = () => loadData(STORAGE_KEYS.EVC_VISITS, INITIAL_EVC_VISITS);
export const saveStoredEVCVisits = (visits: EVCVisit[]) => saveData(STORAGE_KEYS.EVC_VISITS, visits);

export const getStoredCompliance = (): ComplianceRecord[] =>
  loadData(STORAGE_KEYS.COMPLIANCE, INITIAL_COMPLIANCE).map(enrichComplianceCalculations);
export const saveStoredCompliance = (records: ComplianceRecord[]) => saveData(STORAGE_KEYS.COMPLIANCE, records);

export const getStoredAuditLogs = () => loadData(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
export const saveStoredAuditLogs = (logs: AuditLogItem[]) => saveData(STORAGE_KEYS.AUDIT_LOGS, logs);

export const getStoredExperts = () => loadData(STORAGE_KEYS.EXPERTS, INITIAL_EXPERTS);
export const saveStoredExperts = (experts: ExpertProfile[]) => saveData(STORAGE_KEYS.EXPERTS, experts);
