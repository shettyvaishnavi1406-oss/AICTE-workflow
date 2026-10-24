import { EVCVisit, ExpertProfile, EVCVisitStatus } from '../types/index';

/**
 * Standard EVC Visit Lifecycle Statuses:
 * Scheduled → In Progress → Report Submitted → Verified
 */
export const EVC_ALLOWED_TRANSITIONS: Record<string, EVCVisitStatus> = {
  'Scheduled': 'In Progress',
  'Committee Assembled': 'In Progress',
  'In Progress': 'Report Submitted',
  'Inspection Completed': 'Report Submitted',
  'Report Submitted': 'Verified'
};

export const EVC_ACTION_BUTTON_LABELS: Record<string, string> = {
  'Scheduled': 'Start Visit',
  'Committee Assembled': 'Start Visit',
  'In Progress': 'Submit Report',
  'Inspection Completed': 'Submit Report',
  'Report Submitted': 'Verify Report'
};

/**
 * Normalizes a person's name or ID for reliable comparison.
 * Strips academic/honorific titles (Prof., Dr., Shri, Smt., etc.) and normalizes whitespace/case.
 */
export function normalizePersonIdentifier(identifier?: string | null): string {
  if (!identifier) return '';
  return identifier
    .toLowerCase()
    .replace(/[().,]/g, ' ')
    .replace(/\b(prof|dr|shri|smt|mr|ms)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves an expert's unique identity (ID if matched, otherwise normalized name).
 */
export function resolveExpertKey(identifier: string, expertsList?: ExpertProfile[]): string {
  if (!identifier) return '';
  const trimmed = identifier.trim();
  if (expertsList) {
    const matched = expertsList.find(
      (e) =>
        e.id.toLowerCase() === trimmed.toLowerCase() ||
        normalizePersonIdentifier(e.name) === normalizePersonIdentifier(trimmed)
    );
    if (matched) return matched.id.toLowerCase();
  }
  return normalizePersonIdentifier(trimmed);
}

/**
 * Checks if two member references identify the exact same person.
 */
export function isSamePerson(
  personA: string,
  personB: string,
  expertsList?: ExpertProfile[]
): boolean {
  if (!personA || !personB) return false;
  const keyA = resolveExpertKey(personA, expertsList);
  const keyB = resolveExpertKey(personB, expertsList);
  return keyA === keyB;
}

/**
 * Determines whether a given person participates in a visit (as Chairman or Subject Expert).
 */
export function isPersonInVisit(
  person: string,
  visit: EVCVisit,
  expertsList?: ExpertProfile[]
): boolean {
  if (!person || !visit) return false;
  if (isSamePerson(person, visit.chairman, expertsList)) {
    return true;
  }
  if (Array.isArray(visit.experts)) {
    return visit.experts.some((exp) => isSamePerson(person, exp, expertsList));
  }
  return false;
}

/**
 * Returns the next valid status in the EVC visit lifecycle.
 * Returns null if the visit is in a terminal status ('Verified') or unrecognized.
 */
export function getNextEVCStatus(currentStatus?: string | null): EVCVisitStatus | null {
  if (!currentStatus) return null;
  const trimmed = currentStatus.trim();
  return EVC_ALLOWED_TRANSITIONS[trimmed] || null;
}

/**
 * Validates whether transitioning from currentStatus to targetStatus is permitted.
 */
export function isValidEVCTransition(
  currentStatus?: string | null,
  targetStatus?: string | null
): boolean {
  if (!currentStatus || !targetStatus) return false;
  const current = currentStatus.trim();
  const target = targetStatus.trim();

  // Terminal state
  if (current === 'Verified' || current === 'Report Verified') {
    return false;
  }

  // Same status transition prohibited
  if (current === target) {
    return false;
  }

  const expected = getNextEVCStatus(current);
  if (!expected) return false;

  if (target === 'Verified' && (expected === 'Verified' || expected === 'Report Verified')) {
    return true;
  }

  return expected === target;
}

/**
 * Result of team member validation.
 */
export interface MemberValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that an EVC panel has no duplicate members:
 * 1. Chairman cannot also be an expert on the same visit.
 * 2. An expert cannot be assigned multiple times to the same visit.
 */
export function validateEVCTeam(
  chairman: string,
  experts: string[],
  expertsList?: ExpertProfile[]
): MemberValidationResult {
  if (!chairman || !chairman.trim()) {
    return { valid: false, error: 'A Committee Chairman must be selected.' };
  }

  if (!experts || experts.length === 0 || experts.every((e) => !e || !e.trim())) {
    return { valid: false, error: 'At least one Subject Expert must be selected.' };
  }

  // 1. Chairman cannot be an expert
  for (const exp of experts) {
    if (isSamePerson(chairman, exp, expertsList)) {
      return {
        valid: false,
        error: `A person cannot serve as both Chairman and Subject Expert on the same visit (${chairman.trim()}).`
      };
    }
  }

  // 2. No duplicate experts
  const seenExpertKeys = new Set<string>();
  for (const exp of experts) {
    if (!exp || !exp.trim()) continue;
    const key = resolveExpertKey(exp, expertsList);
    if (seenExpertKeys.has(key)) {
      return {
        valid: false,
        error: `Subject Expert "${exp.trim()}" is assigned more than once to this visit.`
      };
    }
    seenExpertKeys.add(key);
  }

  return { valid: true };
}

/**
 * Result of expert availability check.
 */
export interface AvailabilityCheckResult {
  isAvailable: boolean;
  error?: string;
  conflictingVisit?: EVCVisit;
}

/**
 * Checks whether an expert is available for a proposed visit date and time:
 * - Rejects if inspection date or time is missing.
 * - Checks against all other active confirmed visits ('Scheduled' or 'In Progress').
 * - Once a visit reaches 'Report Submitted' or 'Verified', it no longer makes the expert busy.
 */
export function checkExpertAvailability(
  expertIdentifier: string,
  proposedDate: string,
  proposedTime: string,
  allVisits: EVCVisit[],
  expertsList?: ExpertProfile[],
  excludeVisitId?: string
): AvailabilityCheckResult {
  if (!expertIdentifier || !expertIdentifier.trim()) {
    return { isAvailable: false, error: 'Expert identifier is missing.' };
  }

  if (!proposedDate || !proposedDate.trim()) {
    return {
      isAvailable: false,
      error: 'Inspection date is missing; cannot verify expert availability.'
    };
  }

  if (!proposedTime || !proposedTime.trim()) {
    return {
      isAvailable: false,
      error: 'Inspection time is missing; cannot verify expert availability.'
    };
  }

  const normalizedProposedDate = proposedDate.trim();

  for (const visit of allVisits) {
    if (excludeVisitId && visit.id === excludeVisitId) {
      continue;
    }

    // Only active visits (Scheduled or In Progress) block availability.
    // Completed/Verified visits or Report Submitted visits do not block.
    const isActive =
      visit.status === 'Scheduled' ||
      visit.status === 'In Progress' ||
      visit.status === 'Committee Assembled';

    if (!isActive) {
      continue;
    }

    // Check if the person is part of this visit
    if (isPersonInVisit(expertIdentifier, visit, expertsList)) {
      // Check date overlap
      if (visit.visitDate && visit.visitDate.trim() === normalizedProposedDate) {
        return {
          isAvailable: false,
          error: `Expert is already assigned to active visit ${visit.visitCode} on ${visit.visitDate} (${visit.visitTime}).`,
          conflictingVisit: visit
        };
      }
    }
  }

  return { isAvailable: true };
}

/**
 * Dynamically computes an expert's current status ('Available' | 'Assigned' | 'On Leave')
 * based on active confirmed visit assignments.
 */
export function computeExpertStatus(
  expert: ExpertProfile,
  allVisits: EVCVisit[]
): 'Available' | 'Assigned' | 'On Leave' {
  if (expert.status === 'On Leave') {
    return 'On Leave';
  }

  const hasActiveAssignment = allVisits.some((visit) => {
    const isActive =
      visit.status === 'Scheduled' ||
      visit.status === 'In Progress' ||
      visit.status === 'Committee Assembled';

    return isActive && isPersonInVisit(expert.id, visit, [expert]);
  });

  return hasActiveAssignment ? 'Assigned' : 'Available';
}
