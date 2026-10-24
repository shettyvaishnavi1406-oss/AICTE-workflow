import { supabase } from '../lib/supabase';
import { 
  EscalationAuditLog, 
  InAppNotification, 
  EscalationEngineSummary,
  ComplianceRecord,
  Undertaking
} from '../types';
import { parseDateOnly, getTodayDateOnly } from './undertakingsService';

/**
 * Calculates calendar day difference between a target date ('YYYY-MM-DD')
 * and an evaluation reference date (default: today), normalized to local midnight.
 * Positive = future days remaining; Negative = past days overdue.
 */
export function calculateDateDiffDays(targetDateStr: string, evalDate?: Date): number {
  const target = parseDateOnly(targetDateStr);
  const ref = evalDate ? new Date(evalDate.getFullYear(), evalDate.getMonth(), evalDate.getDate(), 0, 0, 0, 0) : getTodayDateOnly();
  const diffMs = target.getTime() - ref.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Invokes the backend rule-based escalation engine.
 * Calls Supabase stored function 'process_escalation_engine' first.
 * If the database function is not yet present, provides an exact, idempotent
 * database execution fallback querying and writing to the Supabase tables.
 */
export async function runDailyEscalationEngine(evalDateStr?: string): Promise<EscalationEngineSummary> {
  const targetDateOnly = evalDateStr ? evalDateStr.split('T')[0] : new Date().toISOString().split('T')[0];

  // 1. Primary: Server-side PostgreSQL RPC function
  try {
    const { data, error } = await supabase.rpc('process_escalation_engine', {
      p_eval_date: targetDateOnly
    });

    if (!error && data && data.success) {
      return {
        success: true,
        records_checked: data.records_checked ?? 0,
        reminders_created: data.reminders_created ?? 0,
        escalations_performed: data.escalations_performed ?? 0,
        errors_count: data.errors_count ?? 0,
        evaluation_date: data.evaluation_date || targetDateOnly,
        details: data.details || [],
        timestamp: data.timestamp || new Date().toISOString()
      };
    }
  } catch (rpcErr) {
    console.warn('RPC process_escalation_engine not reachable, using direct database evaluation fallback:', rpcErr);
  }

  // 2. Direct database execution fallback (matching exact PostgreSQL server-side logic)
  const evalDate = parseDateOnly(targetDateOnly);
  let recordsChecked = 0;
  let remindersCreated = 0;
  let escalationsPerformed = 0;
  let errorsCount = 0;
  const details: EscalationEngineSummary['details'] = [];
  const nowIso = new Date().toISOString();

  // A. Fetch existing escalation audit logs for idempotency checks
  const { data: existingAudit } = await supabase
    .from('escalation_audit_logs')
    .select('record_type, record_id, rule_identifier, deadline_date');
  
  const executedCycles = new Set<string>();
  (existingAudit || []).forEach((row: any) => {
    executedCycles.add(`${row.record_type}|${row.record_id}|${row.rule_identifier}|${row.deadline_date}`);
  });

  // B. Process Compliance Records
  try {
    const { data: complianceRecords, error: compErr } = await supabase
      .from('compliance_records')
      .select('*');

    if (!compErr && complianceRecords) {
      for (const rec of complianceRecords) {
        recordsChecked++;

        // Stop Condition: Resolved / Compliant documents cease escalation
        if (rec.status === 'Compliant') {
          continue;
        }

        const validUntilStr = rec.valid_until ? rec.valid_until.split('T')[0] : '';
        if (!validUntilStr) continue;

        const daysUntilExpiry = calculateDateDiffDays(validUntilStr, evalDate);
        let ruleId: string | null = null;
        let targetLevel = rec.escalation_level || 0;
        let recipientRole = '';
        let actionText = '';
        let reasonText = '';
        let notificationTitle = '';
        let severity: 'info' | 'warning' | 'critical' = 'info';

        if (daysUntilExpiry <= -7) {
          // R3: 7 calendar days after expiry -> Member Secretary
          ruleId = 'R3';
          targetLevel = 2;
          recipientRole = 'Member Secretary';
          actionText = 'Document Critically Expired - Escalated to Member Secretary';
          reasonText = `Document "${rec.title}" expired ${-daysUntilExpiry} calendar days ago on ${validUntilStr} (>= 7 days past expiry threshold) without renewal. Escalated to Member Secretary for executive penalty / intake freeze.`;
          notificationTitle = `CRITICAL ESCALATION: ${rec.category} Expired 7+ Days`;
          severity = 'critical';
        } else if (daysUntilExpiry <= 0) {
          // R2: On expiry date (0 to 6 days overdue) -> Regional Officer
          ruleId = 'R2';
          targetLevel = 1;
          recipientRole = 'Regional Officer (RO)';
          actionText = 'Document Expired - Escalated to Regional Officer';
          reasonText = `Document "${rec.title}" expired on ${validUntilStr} (${-daysUntilExpiry} day(s) overdue) without renewal. Escalated to Regional Officer for scrutiny and statutory show-cause notice.`;
          notificationTitle = `URGENT: ${rec.category} Expired Today`;
          severity = 'warning';
        } else if (daysUntilExpiry <= 30) {
          // R1: 30 calendar days before expiry -> Institution reminder
          ruleId = 'R1';
          targetLevel = rec.escalation_level || 0;
          recipientRole = 'Institution';
          actionText = 'In-App Document Expiry Reminder Dispatched';
          reasonText = `Document "${rec.title}" is expiring in ${daysUntilExpiry} calendar day(s) (valid until ${validUntilStr}). In-app renewal reminder dispatched to institution.`;
          notificationTitle = `Action Required: ${rec.category} Expiring in ${daysUntilExpiry} Days`;
          severity = 'info';
        }

        if (ruleId) {
          const cycleKey = `compliance_record|${rec.id}|${ruleId}|${validUntilStr}`;
          if (!executedCycles.has(cycleKey)) {
            // Insert into escalation_audit_logs
            await supabase.from('escalation_audit_logs').insert([{
              record_type: 'compliance_record',
              record_id: rec.id,
              rule_identifier: ruleId,
              previous_level: rec.escalation_level || 0,
              new_level: targetLevel,
              recipient_role: recipientRole,
              action: actionText,
              reason: reasonText,
              deadline_date: validUntilStr,
              result_status: 'success',
              event_timestamp: nowIso
            }]);

            // Insert persistent in-app notification
            await supabase.from('in_app_notifications').insert([{
              recipient_role: recipientRole,
              title: notificationTitle,
              message: reasonText,
              record_type: 'compliance_record',
              record_id: rec.id,
              rule_identifier: ruleId,
              severity,
              created_at: nowIso
            }]);

            // Update compliance record in Supabase
            if (ruleId === 'R2' || ruleId === 'R3') {
              await supabase.from('compliance_records').update({
                escalation_level: targetLevel,
                escalated_at: nowIso,
                urgency: 'Critical Expired',
                days_remaining: daysUntilExpiry,
                action_required: `Escalated to ${recipientRole}: ${actionText}`
              }).eq('id', rec.id);
              escalationsPerformed++;
            } else {
              // R1 Reminder
              await supabase.from('compliance_records').update({
                urgency: 'Expiring Soon',
                days_remaining: daysUntilExpiry,
                action_required: `Reminder: Valid until ${validUntilStr} (${daysUntilExpiry} days remaining). Submit renewal documentation.`
              }).eq('id', rec.id);
              remindersCreated++;
            }

            // Append human-readable audit log
            await supabase.from('audit_logs').insert([{
              id: `aud-esc-${Date.now()}-${rec.id.substring(0, 4)}`,
              event_timestamp: nowIso,
              actor: 'System Automated',
              role: 'System Automated',
              action: actionText,
              application_number: rec.application_number || 'N/A',
              institute_name: rec.institute_name || 'N/A',
              details: reasonText
            }]);

            executedCycles.add(cycleKey);
            details?.push({
              record_type: 'compliance_record',
              record_id: rec.id,
              rule: ruleId,
              previous_level: rec.escalation_level || 0,
              new_level: targetLevel,
              recipient: recipientRole,
              action: actionText
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('Error during fallback compliance records evaluation:', err);
    errorsCount++;
  }

  // C. Process Undertakings
  try {
    const { data: undertakings, error: undErr } = await supabase
      .from('undertakings')
      .select('*, compliance_records:compliance_record_id (title, application_number, institute_name)')
      .in('status', ['pending', 'in_progress']);

    if (!undErr && undertakings) {
      for (const u of undertakings) {
        recordsChecked++;

        const dueDateStr = u.due_date ? u.due_date.split('T')[0] : '';
        if (!dueDateStr) continue;

        const daysOverdue = -calculateDateDiffDays(dueDateStr, evalDate);
        let ruleId: string | null = null;
        let targetLevel = u.escalation_level || 0;
        let recipientRole = '';
        let actionText = '';
        let reasonText = '';
        let notificationTitle = '';
        let severity: 'info' | 'warning' | 'critical' = 'info';

        if (daysOverdue >= 7) {
          // U2: 7 calendar days overdue -> Member Secretary (Level 2)
          ruleId = 'U2';
          targetLevel = 2;
          recipientRole = 'Member Secretary';
          actionText = 'Undertaking Critically Overdue - Escalated to Level 2';
          reasonText = `Undertaking "${u.type}" critically overdue by ${daysOverdue} calendar days (>= 7 days grace threshold). Escalated to Member Secretary for Level 2 Enforcement Action.`;
          notificationTitle = `CRITICAL OVERDUE: ${u.type}`;
          severity = 'critical';
        } else if (daysOverdue > 0) {
          // U1: Overdue past due date (1 to 6 days overdue) -> Regional Officer (Level 1)
          ruleId = 'U1';
          targetLevel = 1;
          recipientRole = 'Regional Officer (RO)';
          actionText = 'Undertaking Deadline Passed - Escalated to Level 1';
          reasonText = `Undertaking "${u.type}" deadline passed on ${dueDateStr} (${daysOverdue} day(s) overdue). Escalated to Regional Officer for Level 1 Statutory Notice.`;
          notificationTitle = `OVERDUE NOTICE: ${u.type}`;
          severity = 'warning';
        }

        if (ruleId) {
          const cycleKey = `undertaking|${u.id}|${ruleId}|${dueDateStr}`;
          if (!executedCycles.has(cycleKey)) {
            // Insert into escalation_audit_logs
            await supabase.from('escalation_audit_logs').insert([{
              record_type: 'undertaking',
              record_id: u.id,
              rule_identifier: ruleId,
              previous_level: u.escalation_level || 0,
              new_level: targetLevel,
              recipient_role: recipientRole,
              action: actionText,
              reason: reasonText,
              deadline_date: dueDateStr,
              result_status: 'success',
              event_timestamp: nowIso
            }]);

            // Insert into undertaking_escalations
            await supabase.from('undertaking_escalations').insert([{
              undertaking_id: u.id,
              previous_level: u.escalation_level || 0,
              new_level: targetLevel,
              escalation_reason: reasonText,
              created_at: nowIso
            }]);

            // Insert persistent in-app notification
            await supabase.from('in_app_notifications').insert([{
              recipient_role: recipientRole,
              title: notificationTitle,
              message: reasonText,
              record_type: 'undertaking',
              record_id: u.id,
              rule_identifier: ruleId,
              severity,
              created_at: nowIso
            }]);

            // Update undertaking
            await supabase.from('undertakings').update({
              escalation_level: targetLevel,
              escalated_at: nowIso,
              updated_at: nowIso
            }).eq('id', u.id);

            // Append human-readable audit log
            const complianceRecord = u.compliance_records;
            await supabase.from('audit_logs').insert([{
              id: `aud-esc-${Date.now()}-${u.id.substring(0, 4)}`,
              event_timestamp: nowIso,
              actor: 'System Automated',
              role: 'System Automated',
              action: actionText,
              application_number: complianceRecord?.application_number || 'N/A',
              institute_name: complianceRecord?.institute_name || 'N/A',
              details: reasonText
            }]);

            escalationsPerformed++;
            executedCycles.add(cycleKey);
            details?.push({
              record_type: 'undertaking',
              record_id: u.id,
              rule: ruleId,
              previous_level: u.escalation_level || 0,
              new_level: targetLevel,
              recipient: recipientRole,
              action: actionText
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('Error during fallback undertakings evaluation:', err);
    errorsCount++;
  }

  return {
    success: true,
    records_checked: recordsChecked,
    reminders_created: remindersCreated,
    escalations_performed: escalationsPerformed,
    errors_count: errorsCount,
    evaluation_date: targetDateOnly,
    details,
    timestamp: nowIso
  };
}

/**
 * Fetch persistent escalation audit logs from Supabase.
 */
export async function fetchEscalationAuditLogs(filter?: {
  recordType?: string;
  recordId?: string;
  rule?: string;
}): Promise<EscalationAuditLog[]> {
  let query = supabase
    .from('escalation_audit_logs')
    .select('*')
    .order('event_timestamp', { ascending: false });

  if (filter?.recordType) {
    query = query.eq('record_type', filter.recordType);
  }
  if (filter?.recordId) {
    query = query.eq('record_id', filter.recordId);
  }
  if (filter?.rule) {
    query = query.eq('rule_identifier', filter.rule);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching escalation audit logs:', error);
    return [];
  }

  return (data || []) as EscalationAuditLog[];
}

/**
 * Fetch in-app notifications from Supabase.
 */
export async function fetchInAppNotifications(role?: string): Promise<InAppNotification[]> {
  let query = supabase
    .from('in_app_notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (role && role !== 'All') {
    query = query.eq('recipient_role', role);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching in-app notifications:', error);
    return [];
  }

  return (data || []) as InAppNotification[];
}

/**
 * Mark in-app notification as read.
 */
export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('in_app_notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) {
    console.error('Error marking notification read:', error);
  }
}
