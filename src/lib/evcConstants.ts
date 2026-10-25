/**
 * AICTE Approval Process Handbook (APH) Statutory EVC Alert & Notification Configuration.
 * Thresholds are configurable here and consumed across UI and business logic.
 */
export const EVC_ALERT_CONFIG = {
  /** Highlight inspections scheduled within the next N days with a banner alert */
  UPCOMING_BANNER_DAYS: 7,

  /** Highlight table rows approaching prescribed deadline in amber when <= N days remain */
  DEADLINE_WARNING_DAYS: 5,

  /** Statutory deadline window in days for EVC inspection execution from assignment */
  DEFAULT_DEADLINE_DAYS: 15,

  /** Statutory maximum duration for EVC report submission after visit execution */
  REPORT_SUBMISSION_MAX_DAYS: 3
};

export const EVC_STATUS_STYLES = {
  Upcoming: {
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    dot: 'bg-blue-500',
    label: 'Visit Upcoming'
  },
  Pending: {
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
    dot: 'bg-slate-400',
    label: 'Visit Pending'
  },
  'Report Due': {
    badge: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
    dot: 'bg-amber-500 animate-pulse',
    label: 'Report Due'
  },
  Overdue: {
    badge: 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
    dot: 'bg-rose-500',
    label: 'Overdue'
  },
  Completed: {
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-500',
    label: 'Completed'
  }
} as const;

export const STATUTORY_EVC_NOTICE =
  'Alerts and statuses support the approval process; verification and decisions rest with the competent authority.';
