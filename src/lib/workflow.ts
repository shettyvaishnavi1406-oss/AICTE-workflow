import type { ApplicationStage } from '../types/index';

/**
 * The canonical 6-stage default forward workflow for AICTE applications:
 * Draft → Submitted → Scrutiny → EVC → SAC Review → Approved
 */
export const DEFAULT_WORKFLOW_STAGES = [
  'Draft',
  'Submitted',
  'Scrutiny',
  'EVC',
  'SAC Review',
  'Approved'
] as const;

export type DefaultWorkflowStage = typeof DEFAULT_WORKFLOW_STAGES[number];

/**
 * Single shared stage-order progress map.
 * Guaranteed milestone positions:
 * - Draft: 0%
 * - Submitted: 20%
 * - Scrutiny: 40%
 * - EVC: 60%
 * - SAC Review: 80%
 * - Approved: 100%
 */
export const STAGE_PROGRESS_MAP: Record<string, number> = {
  // Canonical stages
  'Draft': 0,
  'Submitted': 20,
  'Scrutiny': 40,
  'EVC': 60,
  'SAC Review': 80,
  'Approved': 100,

  // Supported granular sub-stages
  'Scrutiny Pending': 20,
  'Scrutiny Completed': 40,
  'EVC Pending': 60,
  'EVC Scheduled': 60,
  'EVC Completed': 60,

  // Exception stages
  'Deficiency Issued': 50,
  'Rejected': 0
};

/**
 * Calculates progress percentage for any given stage safely.
 * Returns 0 for missing, null, empty, or unrecognized stages (never 100%).
 */
export function calculateStageProgress(stage?: ApplicationStage | string | null): number {
  if (!stage || typeof stage !== 'string') {
    return 0;
  }
  const trimmed = stage.trim();
  if (Object.prototype.hasOwnProperty.call(STAGE_PROGRESS_MAP, trimmed)) {
    return STAGE_PROGRESS_MAP[trimmed];
  }
  return 0;
}

/**
 * Reusable workflow transition rules.
 *
 * Enforces forward workflow:
 * - Draft → Submitted
 * - Submitted → Scrutiny
 * - Scrutiny → EVC
 * - EVC → SAC Review
 * - SAC Review → Approved
 *
 * Prohibits:
 * - Skipping stages (e.g. Draft → Approved, Submitted → EVC)
 * - Backward transitions (e.g. Approved → Draft, SAC Review → EVC)
 * - Transitions out of Approved (Approved has no further transitions)
 *
 * Preserves:
 * - Rejection and return-for-correction (Deficiency Issued)
 */
export const ALLOWED_TRANSITIONS: Record<string, readonly ApplicationStage[]> = {
  // Canonical flow
  'Draft': ['Submitted'],
  'Submitted': ['Scrutiny', 'Scrutiny Pending'],
  'Scrutiny': ['EVC', 'EVC Pending', 'EVC Scheduled', 'Deficiency Issued', 'Rejected'],
  'EVC': ['SAC Review', 'Deficiency Issued', 'Rejected'],
  'SAC Review': ['Approved', 'Deficiency Issued', 'Rejected'],
  'Approved': [],

  // Granular project sub-stages
  'Scrutiny Pending': ['Scrutiny Completed', 'Scrutiny', 'Deficiency Issued', 'Rejected'],
  'Scrutiny Completed': ['EVC', 'EVC Pending', 'EVC Scheduled', 'Deficiency Issued', 'Rejected'],
  'EVC Pending': ['EVC Scheduled', 'EVC Completed', 'EVC', 'Deficiency Issued', 'Rejected'],
  'EVC Scheduled': ['EVC Completed', 'SAC Review', 'Deficiency Issued', 'Rejected'],
  'EVC Completed': ['SAC Review', 'Deficiency Issued', 'Rejected'],

  // Exception paths
  'Deficiency Issued': [
    'Scrutiny Pending',
    'Scrutiny Completed',
    'Scrutiny',
    'EVC Pending',
    'EVC Scheduled',
    'SAC Review',
    'Rejected'
  ],
  'Rejected': []
};

/**
 * Retrieves allowed next stages from the current stage.
 * Returns an empty array if current stage is terminal ('Approved' or 'Rejected') or unrecognized.
 */
export function getAllowedTransitions(currentStage?: ApplicationStage | string | null): ApplicationStage[] {
  if (!currentStage || typeof currentStage !== 'string') {
    return [];
  }
  const trimmed = currentStage.trim();
  const allowed = ALLOWED_TRANSITIONS[trimmed];
  return allowed ? [...allowed] : [];
}

/**
 * Validates whether a transition from fromStage to toStage is permitted.
 */
export function isValidTransition(
  fromStage?: ApplicationStage | string | null,
  toStage?: ApplicationStage | string | null
): boolean {
  if (!fromStage || !toStage || typeof fromStage !== 'string' || typeof toStage !== 'string') {
    return false;
  }
  const from = fromStage.trim();
  const to = toStage.trim();

  // No transition to same stage
  if (from === to) {
    return false;
  }

  // Approved has no transitions
  if (from === 'Approved' || from === 'Rejected') {
    return false;
  }

  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed) {
    return false;
  }

  return allowed.includes(to as ApplicationStage);
}

/**
 * Display labels matching the existing UI dropdown option formatting.
 */
export const STAGE_DISPLAY_LABELS: Record<string, string> = {
  'Draft': 'Draft',
  'Submitted': 'Submitted',
  'Scrutiny': 'Scrutiny',
  'Scrutiny Pending': 'Scrutiny Pending',
  'Scrutiny Completed': 'Scrutiny Completed',
  'EVC': 'EVC',
  'EVC Pending': 'EVC Pending (Schedule Committee)',
  'EVC Scheduled': 'EVC Scheduled',
  'EVC Completed': 'EVC Completed',
  'SAC Review': 'SAC Review',
  'Approved': 'Approved (Issue Digital EoA)',
  'Deficiency Issued': 'Deficiency Issued (Issue Cure Notice)',
  'Rejected': 'Rejected'
};

export function getStageDisplayLabel(stage?: ApplicationStage | string | null): string {
  if (!stage || typeof stage !== 'string') return '';
  return STAGE_DISPLAY_LABELS[stage.trim()] || stage.trim();
}
