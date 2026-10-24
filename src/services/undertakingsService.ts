import { supabase } from '../lib/supabase';
import { Undertaking, UndertakingStatus, UndertakingEscalation } from '../types';

/**
 * Safely parses a 'YYYY-MM-DD' date string into a local midnight Date object,
 * preventing off-by-one errors caused by UTC conversions.
 */
export function parseDateOnly(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return new Date(dateStr);
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Returns today's date normalized to local midnight.
 */
export function getTodayDateOnly(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/**
 * Calculates days remaining until due_date (positive = future, negative = overdue).
 */
export function calculateDaysRemaining(dueDateStr: string): number {
  const due = parseDateOnly(dueDateStr);
  const today = getTodayDateOnly();
  const diffTime = due.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculates how many days an undertaking is overdue (0 if not overdue).
 */
export function getDaysOverdue(dueDateStr: string): number {
  const remaining = calculateDaysRemaining(dueDateStr);
  return remaining < 0 ? Math.abs(remaining) : 0;
}

/**
 * Checks whether an undertaking is overdue. Completed or cancelled undertakings are never overdue.
 */
export function isUndertakingOverdue(dueDateStr: string, status: UndertakingStatus): boolean {
  if (status === 'completed' || status === 'cancelled') return false;
  return calculateDaysRemaining(dueDateStr) < 0;
}

/**
 * Returns UI badge styling and label for an escalation level.
 */
export function getEscalationBadgeInfo(level: number, status: UndertakingStatus) {
  if (status === 'completed') {
    return {
      label: 'Fulfilled / Cleared',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      dotClass: 'bg-emerald-500'
    };
  }
  if (status === 'cancelled') {
    return {
      label: 'Cancelled',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      dotClass: 'bg-slate-400'
    };
  }

  switch (level) {
    case 1:
      return {
        label: 'Level 1: Statutory Notice Issued',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-400 font-semibold',
        dotClass: 'bg-amber-500'
      };
    case 2:
      return {
        label: 'Level 2: Critical Escalation (Intake Freeze)',
        badgeClass: 'bg-rose-100 text-rose-900 border-rose-400 font-bold',
        dotClass: 'bg-rose-600 animate-pulse'
      };
    case 0:
    default:
      return {
        label: 'Level 0: Normal / On Track',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
        dotClass: 'bg-slate-400'
      };
  }
}

/**
 * Fetch all undertakings with joined compliance records from Supabase.
 */
export async function fetchUndertakings(): Promise<Undertaking[]> {
  const { data, error } = await supabase
    .from('undertakings')
    .select(`
      id,
      compliance_record_id,
      type,
      description,
      due_date,
      status,
      escalation_level,
      escalated_at,
      created_at,
      updated_at,
      compliance_records:compliance_record_id (
        id,
        institute_code,
        institute_name,
        application_number,
        category,
        title
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching undertakings from Supabase:', error);
    throw new Error(`Database query failed: ${error.message} (${error.code || 'UNKNOWN'})`);
  }

  return (data || []) as unknown as Undertaking[];
}

/**
 * Create a new undertaking record in Supabase.
 */
export async function createUndertaking(payload: {
  compliance_record_id: string;
  type: string;
  description: string;
  due_date: string;
  status?: UndertakingStatus;
}): Promise<Undertaking> {
  // Validate required inputs
  if (!payload.compliance_record_id?.trim()) {
    throw new Error('Compliance record selection is required.');
  }
  if (!payload.type?.trim()) {
    throw new Error('Undertaking category/type is required.');
  }
  if (!payload.description?.trim()) {
    throw new Error('Undertaking description/commitment details are required.');
  }
  if (!payload.due_date || isNaN(Date.parse(payload.due_date))) {
    throw new Error('A valid commitment due date is required.');
  }

  const { data, error } = await supabase
    .from('undertakings')
    .insert([
      {
        compliance_record_id: payload.compliance_record_id.trim(),
        type: payload.type.trim(),
        description: payload.description.trim(),
        due_date: payload.due_date,
        status: payload.status || 'pending',
        escalation_level: 0
      }
    ])
    .select(`
      *,
      compliance_records:compliance_record_id (
        id,
        institute_code,
        institute_name,
        application_number,
        category,
        title
      )
    `)
    .single();

  if (error) {
    console.error('Error creating undertaking in Supabase:', error);
    throw new Error(`Failed to create undertaking: ${error.message}`);
  }

  return data as unknown as Undertaking;
}

/**
 * Update an undertaking's details or status.
 */
export async function updateUndertaking(
  id: string,
  updates: {
    type?: string;
    description?: string;
    due_date?: string;
    status?: UndertakingStatus;
  }
): Promise<Undertaking> {
  if (!id) throw new Error('Undertaking ID is required.');

  if (updates.due_date && isNaN(Date.parse(updates.due_date))) {
    throw new Error('Invalid due date provided.');
  }

  const { data, error } = await supabase
    .from('undertakings')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(`
      *,
      compliance_records:compliance_record_id (
        id,
        institute_code,
        institute_name,
        application_number,
        category,
        title
      )
    `)
    .single();

  if (error) {
    console.error(`Error updating undertaking ${id}:`, error);
    throw new Error(`Failed to update undertaking: ${error.message}`);
  }

  return data as unknown as Undertaking;
}

/**
 * Mark an undertaking as completed.
 */
export async function markUndertakingCompleted(id: string): Promise<Undertaking> {
  return updateUndertaking(id, { status: 'completed' });
}

/**
 * Fetch escalation audit history for an undertaking or all undertakings.
 */
export async function fetchEscalationHistory(undertakingId?: string): Promise<UndertakingEscalation[]> {
  let query = supabase
    .from('undertaking_escalations')
    .select('*')
    .order('created_at', { ascending: false });

  if (undertakingId) {
    query = query.eq('undertaking_id', undertakingId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching escalation history:', error);
    throw new Error(`Failed to fetch escalation history: ${error.message}`);
  }

  return (data || []) as UndertakingEscalation[];
}

import { runDailyEscalationEngine } from './escalationService';

/**
 * Trigger immediate escalation processing.
 * Invokes the unified backend-first escalation engine for both compliance records and undertakings.
 */
export async function triggerEscalationCheck(
  _level1DaysOverdue = 0,
  _level2DaysOverdue = 7
): Promise<{ success: boolean; evaluated: number; escalated: number; message: string }> {
  try {
    const summary = await runDailyEscalationEngine();
    return {
      success: summary.success,
      evaluated: summary.records_checked,
      escalated: summary.escalations_performed,
      message: `Escalation engine completed: Evaluated ${summary.records_checked} total records. Dispatched ${summary.reminders_created} reminder(s), executed ${summary.escalations_performed} new escalation(s). Errors: ${summary.errors_count}.`
    };
  } catch (err: any) {
    console.error('Unified escalation check error:', err);
    throw new Error(`Escalation check failed: ${err.message}`);
  }
}

