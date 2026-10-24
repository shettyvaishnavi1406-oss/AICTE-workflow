import type { Application, EVCVisit, ApplicationStage, EVCVisitStatus } from '../types/index';

export type StatutoryMilestoneId = 'submission' | 'scrutiny' | 'evc' | 'sac' | 'approval';

export type MilestoneStatus = 'completed' | 'in_progress' | 'pending' | 'deficient';

export interface StatutoryMilestone {
  id: StatutoryMilestoneId;
  label: string;
  isApplicable: boolean;
  isCompleted: boolean;
  status: MilestoneStatus;
  description: string;
}

export interface MilestoneProgressResult {
  completedCount: number;
  totalApplicable: number;
  percentage: number; // 0 to 100
  milestones: StatutoryMilestone[];
}

/**
 * Finds the linked EVC visit for a given application.
 * Matches by explicit evcId, matching applicationNumber, or instituteCode.
 */
export function findMatchingEVCVisit(
  app: Application | null | undefined,
  evcVisits: EVCVisit[] = []
): EVCVisit | null {
  if (!app) return null;
  return (
    evcVisits.find((v) => {
      if (app.evcId && v.id === app.evcId) return true;
      if (v.applicationNumber && app.applicationNumber &&
          v.applicationNumber.trim().toLowerCase() === app.applicationNumber.trim().toLowerCase()) {
        return true;
      }
      return false;
    }) || null
  );
}

/**
 * Checks whether an EVC visit satisfies the statutory verification requirement.
 * STRICT RULE: Visits in 'Scheduled', 'Committee Assembled', 'In Progress',
 * 'Inspection Completed', or 'Report Submitted' do NOT satisfy verification.
 * ONLY a 'Verified' (or 'Report Verified') visit satisfies the milestone.
 */
export function isEVCVisitVerified(visit: EVCVisit | null | undefined): boolean {
  if (!visit || !visit.status) return false;
  const normalized = visit.status.trim().toLowerCase();
  return normalized === 'verified' || normalized === 'report verified';
}

/**
 * Canonical statutory milestone definitions and dynamic calculation.
 * 
 * Milestones:
 * 1. Draft / Submission: Completed when application is submitted (submissionDate present and stage != 'Draft').
 * 2. Scrutiny: Completed when documents are verified and scrutiny stage cleared.
 * 3. EVC Visit: Completed ONLY when linked EVC visit is Verified.
 * 4. SAC Committee: Completed when SAC committee review clears (Approved).
 * 5. Final EoA Order: Completed when final approval order is issued (Approved).
 */
export function calculateMilestoneProgress(
  app: Application | null | undefined,
  evcVisit?: EVCVisit | null
): MilestoneProgressResult {
  if (!app || typeof app !== 'object' || !app.id) {
    return {
      completedCount: 0,
      totalApplicable: 0,
      percentage: 0,
      milestones: []
    };
  }

  const stage = (app.currentStage || '').trim();

  // Milestone 1: Application Submission (Draft stage)
  const isSubmissionCompleted = Boolean(app.submissionDate) && stage !== 'Draft';
  const submissionStatus: MilestoneStatus = isSubmissionCompleted
    ? 'completed'
    : stage === 'Draft'
    ? 'in_progress'
    : 'pending';

  // Milestone 2: Scrutiny (Document Scrutiny & Verification)
  const pastScrutinyStages: ApplicationStage[] = [
    'Scrutiny',
    'Scrutiny Completed',
    'EVC Pending',
    'EVC Scheduled',
    'EVC Completed',
    'SAC Review',
    'Approved'
  ];

  let isScrutinyCompleted = false;
  let scrutinyStatus: MilestoneStatus = 'pending';

  if (stage === 'Deficiency Issued') {
    scrutinyStatus = 'deficient';
    isScrutinyCompleted = false;
  } else if (pastScrutinyStages.includes(stage as ApplicationStage)) {
    // If scrutiny stage reached/cleared and not deficient, scrutiny milestone is complete
    isScrutinyCompleted = true;
    scrutinyStatus = 'completed';
  } else if (stage === 'Scrutiny Pending' || stage === 'Submitted') {
    scrutinyStatus = 'in_progress';
    isScrutinyCompleted = false;
  }

  // Milestone 3: EVC Visit (Inspection & Verification)
  // In AICTE statutory progression, EVC visit is milestone 3 of 5
  const isEVCApplicable = true;

  let isEVCCompleted = false;
  let evcStatus: MilestoneStatus = 'pending';

  if (isEVCApplicable) {
    if (isEVCVisitVerified(evcVisit)) {
      isEVCCompleted = true;
      evcStatus = 'completed';
    } else if (
      evcVisit?.status === 'Scheduled' ||
      evcVisit?.status === 'Committee Assembled' ||
      evcVisit?.status === 'In Progress' ||
      evcVisit?.status === 'Inspection Completed' ||
      evcVisit?.status === 'Report Submitted' ||
      stage === 'EVC Scheduled' ||
      stage === 'EVC Pending'
    ) {
      // Visit is scheduled/ongoing, but report is not yet verified
      isEVCCompleted = false;
      evcStatus = 'in_progress';
    } else {
      evcStatus = 'pending';
    }
  }

  // Milestone 4: SAC Committee (Appellate / Hearing Committee Review)
  const isSACApplicable = true;
  let isSACCompleted = false;
  let sacStatus: MilestoneStatus = 'pending';

  if (stage === 'Approved') {
    isSACCompleted = true;
    sacStatus = 'completed';
  } else if (stage === 'SAC Review') {
    sacStatus = 'in_progress';
  }

  // Milestone 5: Final EoA Order (Extension of Approval)
  const isApprovalApplicable = true;
  const isApprovalCompleted = stage === 'Approved';
  const approvalStatus: MilestoneStatus = isApprovalCompleted ? 'completed' : 'pending';

  const milestones: StatutoryMilestone[] = [
    {
      id: 'submission',
      label: 'Draft',
      isApplicable: true,
      isCompleted: isSubmissionCompleted,
      status: submissionStatus,
      description: isSubmissionCompleted
        ? `Submitted on ${app.submissionDate || 'N/A'}`
        : 'Application under preparation'
    },
    {
      id: 'scrutiny',
      label: 'Scrutiny',
      isApplicable: true,
      isCompleted: isScrutinyCompleted,
      status: scrutinyStatus,
      description: isScrutinyCompleted
        ? 'Document scrutiny and regulatory verification cleared'
        : stage === 'Deficiency Issued'
        ? 'Deficiencies issued, awaiting institutional cure'
        : 'Scrutiny verification pending'
    },
    {
      id: 'evc',
      label: 'EVC Visit',
      isApplicable: isEVCApplicable,
      isCompleted: isEVCCompleted,
      status: evcStatus,
      description: isEVCCompleted
        ? 'EVC inspection report verified by Regional Office'
        : evcVisit?.status
        ? `EVC visit status: ${evcVisit.status} (verification required)`
        : 'EVC inspection pending or not scheduled'
    },
    {
      id: 'sac',
      label: 'SAC Committee',
      isApplicable: isSACApplicable,
      isCompleted: isSACCompleted,
      status: sacStatus,
      description: isSACCompleted
        ? 'Standing Appellate Committee review confirmed'
        : stage === 'SAC Review'
        ? 'Appellate review currently in progress'
        : 'Awaiting committee docket assignment'
    },
    {
      id: 'approval',
      label: 'Final EoA Order',
      isApplicable: isApprovalApplicable,
      isCompleted: isApprovalCompleted,
      status: approvalStatus,
      description: isApprovalCompleted
        ? 'Digitally signed Extension of Approval order issued'
        : 'Final order pending completion of upstream milestones'
    }
  ];

  const applicable = milestones.filter((m) => m.isApplicable);
  const totalApplicable = applicable.length;

  if (totalApplicable === 0) {
    return {
      completedCount: 0,
      totalApplicable: 0,
      percentage: 0,
      milestones
    };
  }

  const completedCount = applicable.filter((m) => m.isCompleted).length;
  const percentage = Math.max(0, Math.min(100, Math.round((completedCount / totalApplicable) * 100)));

  return {
    completedCount,
    totalApplicable,
    percentage,
    milestones
  };
}

/**
 * Returns the exact integer percentage (0 to 100) of statutory milestone completion
 * for an application, taking into account any linked EVC visit.
 */
export function deriveApplicationProgress(
  app: Application | null | undefined,
  evcVisit?: EVCVisit | null
): number {
  if (!app) return 0;
  return calculateMilestoneProgress(app, evcVisit).percentage;
}
