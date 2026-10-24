import type { ApplicationStage, ComplianceRecord } from '../types/index';

/**
 * Standard SLA duration for AICTE application processing (in calendar days).
 * As per AICTE Approval Process Handbook (APH), standard SLA is 45 days.
 */
export const DEFAULT_SLA_DAYS = 45;

/**
 * Granular urgency classification as specified in system defaults:
 * Expired (< 0 days), Critical (0–7), High (8–30), Medium (31–60), Low (> 60).
 */
export type GranularUrgency = 'Expired' | 'Critical' | 'High' | 'Medium' | 'Low';

/**
 * Terminal application stages that represent completed processing.
 * Completed applications cannot be overdue.
 */
export const COMPLETED_STAGES: ReadonlySet<ApplicationStage> = new Set<ApplicationStage>([
  'Approved',
  'Rejected'
]);

/**
 * Safely parse a date string, Date object, or timestamp into UTC midnight Date.
 * Strips out time and timezone distortion for calendar-day accuracy.
 * Returns null if input is missing, empty, or invalid.
 */
export function parseCalendarDate(dateInput?: string | Date | number | null): Date | null {
  if (dateInput === undefined || dateInput === null || dateInput === '') {
    return null;
  }

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;

    // Direct match for YYYY-MM-DD
    const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (isoDateMatch) {
      const year = parseInt(isoDateMatch[1], 10);
      const month = parseInt(isoDateMatch[2], 10) - 1;
      const day = parseInt(isoDateMatch[3], 10);
      if (month < 0 || month > 11 || day < 1 || day > 31) return null;
      const d = new Date(Date.UTC(year, month, day));
      if (
        isNaN(d.getTime()) ||
        d.getUTCFullYear() !== year ||
        d.getUTCMonth() !== month ||
        d.getUTCDate() !== day
      ) {
        return null;
      }
      return d;
    }

    // Direct match for DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyyMatch = /^(\d{2})[/-](\d{2})[/-](\d{4})/.exec(trimmed);
    if (ddmmyyyyMatch) {
      const day = parseInt(ddmmyyyyMatch[1], 10);
      const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
      const year = parseInt(ddmmyyyyMatch[3], 10);
      if (month < 0 || month > 11 || day < 1 || day > 31) return null;
      const d = new Date(Date.UTC(year, month, day));
      if (
        isNaN(d.getTime()) ||
        d.getUTCFullYear() !== year ||
        d.getUTCMonth() !== month ||
        d.getUTCDate() !== day
      ) {
        return null;
      }
      return d;
    }
  }

  const parsed = new Date(dateInput);
  if (isNaN(parsed.getTime())) {
    return null;
  }

  // Normalize to UTC midnight based on the parsed calendar day
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

/**
 * Gets normalized UTC midnight date for the current date or provided reference date.
 */
export function getCalendarToday(referenceDate?: Date | string | null): Date {
  if (referenceDate) {
    const parsedRef = parseCalendarDate(referenceDate);
    if (parsedRef) return parsedRef;
  }
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Calculates calendar days between two normalized dates: `(to - from)`.
 */
export function calendarDaysBetween(fromDate: Date, toDate: Date): number {
  return Math.round((toDate.getTime() - fromDate.getTime()) / MS_PER_DAY);
}

/**
 * Calculates calendar days remaining until `validUntil`.
 * - Returns negative number if expired (e.g. -1 for yesterday).
 * - Returns 0 if expiring today.
 * - Returns positive number if expiring in future (e.g. 1 for tomorrow).
 * - Safely returns 0 for missing or invalid dates.
 */
export function calculateDaysRemaining(
  validUntil?: string | Date | null,
  referenceDate?: Date | string | null
): number {
  const targetDate = parseCalendarDate(validUntil);
  if (!targetDate) {
    return 0;
  }
  const today = getCalendarToday(referenceDate);
  return calendarDaysBetween(today, targetDate);
}

/**
 * Derives the compliance urgency category using the existing application categories:
 * - 'Critical Expired': daysRemaining < 0
 * - 'Expiring Soon': 0 <= daysRemaining <= 90
 * - 'Normal': daysRemaining > 90
 *
 * If status is 'Compliant' and daysRemaining >= 0, returns 'Normal'.
 */
export function calculateUrgency(
  daysRemaining: number,
  status?: ComplianceRecord['status']
): ComplianceRecord['urgency'] {
  if (daysRemaining < 0) {
    return 'Critical Expired';
  }
  if (status === 'Compliant') {
    return 'Normal';
  }
  if (daysRemaining <= 90) {
    return 'Expiring Soon';
  }
  return 'Normal';
}

/**
 * Derives default granular urgency categories:
 * - Expired (< 0 days)
 * - Critical (0–7 days)
 * - High (8–30 days)
 * - Medium (31–60 days)
 * - Low (> 60 days)
 */
export function calculateDefaultUrgency(daysRemaining: number): GranularUrgency {
  if (daysRemaining < 0) return 'Expired';
  if (daysRemaining <= 7) return 'Critical';
  if (daysRemaining <= 30) return 'High';
  if (daysRemaining <= 60) return 'Medium';
  return 'Low';
}

/**
 * Calculates processing days elapsed since submission date:
 * Calendar days between submissionDate and current date.
 * Safely handles missing/invalid/future dates by returning 0.
 */
export function calculateProcessingDays(
  submissionDate?: string | Date | null,
  referenceDate?: Date | string | null
): number {
  const subDate = parseCalendarDate(submissionDate);
  if (!subDate) {
    return 0;
  }
  const today = getCalendarToday(referenceDate);
  const diff = calendarDaysBetween(subDate, today);
  return diff >= 0 ? diff : 0;
}

/**
 * Determines whether an application stage is completed.
 */
export function isApplicationCompleted(stage?: ApplicationStage | string | null): boolean {
  if (!stage) return false;
  return COMPLETED_STAGES.has(stage as ApplicationStage);
}

/**
 * Calculates whether an application is overdue:
 * True ONLY when the applicable deadline has passed and the application is still incomplete.
 * Document expiry is kept separate from application overdue status.
 *
 * @param stage Current application stage
 * @param processingDays Number of calendar days since submission
 * @param deadlineDays Applicable statutory SLA deadline (defaults to 45 days)
 */
export function calculateIsOverdue(
  stage?: ApplicationStage | string | null,
  processingDays: number = 0,
  deadlineDays: number = DEFAULT_SLA_DAYS
): boolean {
  if (isApplicationCompleted(stage)) {
    return false;
  }
  return processingDays > deadlineDays;
}
