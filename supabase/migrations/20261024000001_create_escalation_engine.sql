-- ==============================================================================
-- AICTE WORKFLOW AUTOMATION: RULE-BASED BACKEND ESCALATION ENGINE MIGRATION
-- Migration Version: 20261024000001
-- Description: Creates escalation_audit_logs, in_app_notifications tables,
--              adds escalation columns to compliance_records, defines the server-side
--              process_escalation_engine function, and configures daily pg_cron scheduling.
-- ==============================================================================

-- 1. Extend compliance_records with escalation tracking columns if not already present
ALTER TABLE public.compliance_records 
ADD COLUMN IF NOT EXISTS escalation_level INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

-- 2. Create persistent escalation_audit_logs table
CREATE TABLE IF NOT EXISTS public.escalation_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    record_type TEXT NOT NULL CHECK (record_type IN ('compliance_record', 'undertaking')),
    record_id TEXT NOT NULL,
    rule_identifier TEXT NOT NULL, -- 'R1', 'R2', 'R3', 'U1', 'U2'
    previous_level INTEGER NOT NULL DEFAULT 0,
    new_level INTEGER NOT NULL DEFAULT 0,
    recipient_role TEXT NOT NULL, -- 'Institution', 'Regional Officer (RO)', 'Member Secretary'
    action TEXT NOT NULL,
    reason TEXT NOT NULL,
    deadline_date DATE NOT NULL,
    result_status TEXT NOT NULL DEFAULT 'success' CHECK (result_status IN ('success', 'error', 'skipped')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_escalation_audit_cycle UNIQUE (record_type, record_id, rule_identifier, deadline_date)
);

-- 3. Create persistent in_app_notifications table
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_role TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    record_type TEXT NOT NULL CHECK (record_type IN ('compliance_record', 'undertaking')),
    record_id TEXT NOT NULL,
    rule_identifier TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create performance and query indexes
CREATE INDEX IF NOT EXISTS idx_escalation_audit_record ON public.escalation_audit_logs(record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_escalation_audit_rule ON public.escalation_audit_logs(rule_identifier);
CREATE INDEX IF NOT EXISTS idx_escalation_audit_timestamp ON public.escalation_audit_logs(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.in_app_notifications(recipient_role, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.in_app_notifications(created_at DESC);

-- 5. Row Level Security (RLS) Configuration
ALTER TABLE public.escalation_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Escalation audit logs: Append-only policies (SELECT and INSERT allowed; NO UPDATE, NO DELETE)
DROP POLICY IF EXISTS "Allow read access to escalation_audit_logs" ON public.escalation_audit_logs;
CREATE POLICY "Allow read access to escalation_audit_logs"
ON public.escalation_audit_logs FOR SELECT
TO anon, authenticated, service_role
USING (true);

DROP POLICY IF EXISTS "Allow insert access to escalation_audit_logs" ON public.escalation_audit_logs;
CREATE POLICY "Allow insert access to escalation_audit_logs"
ON public.escalation_audit_logs FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);

-- In-app notifications: Read, Insert, and Update (for is_read flag)
DROP POLICY IF EXISTS "Allow read access to in_app_notifications" ON public.in_app_notifications;
CREATE POLICY "Allow read access to in_app_notifications"
ON public.in_app_notifications FOR SELECT
TO anon, authenticated, service_role
USING (true);

DROP POLICY IF EXISTS "Allow insert access to in_app_notifications" ON public.in_app_notifications;
CREATE POLICY "Allow insert access to in_app_notifications"
ON public.in_app_notifications FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update read status on in_app_notifications" ON public.in_app_notifications;
CREATE POLICY "Allow update read status on in_app_notifications"
ON public.in_app_notifications FOR UPDATE
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 6. Server-side Escalation Engine Function
-- Rules implemented:
--   Compliance Documents:
--     R1: At 30 calendar days before expiry (days_until_expiry <= 30 and > 0) -> In-app reminder/action for Institution.
--     R2: On expiry date (days_until_expiry <= 0 and > -7) if unresolved -> Escalate to Regional Officer (Level 1).
--     R3: At 7 calendar days after expiry (days_until_expiry <= -7) if unresolved -> Escalate to Member Secretary (Level 2).
--     Stop Condition: status = 'Compliant' stops escalation.
--   Undertakings:
--     U1: Overdue past due date (days_overdue > 0 and < 7) -> Escalate to Regional Officer (Level 1 Notice).
--     U2: Critically overdue (days_overdue >= 7) -> Escalate to Member Secretary (Level 2 Enforcement).
--     Stop Condition: status IN ('completed', 'cancelled') stops escalation.
CREATE OR REPLACE FUNCTION public.process_escalation_engine(
    p_eval_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today DATE := COALESCE(p_eval_date, CURRENT_DATE);
    v_rec RECORD;
    v_days_until_expiry INT;
    v_days_overdue INT;
    v_target_level INT;
    v_rule_id TEXT;
    v_recipient_role TEXT;
    v_action_text TEXT;
    v_reason_text TEXT;
    v_notification_title TEXT;
    v_severity TEXT;
    v_already_executed BOOLEAN;
    v_records_checked INT := 0;
    v_reminders_created INT := 0;
    v_escalations_performed INT := 0;
    v_errors_count INT := 0;
    v_details JSONB := '[]'::jsonb;
BEGIN
    -- =========================================================================
    -- PART 1: PROCESS COMPLIANCE DOCUMENTS
    -- =========================================================================
    FOR v_rec IN 
        SELECT 
            id,
            institute_code,
            institute_name,
            application_number,
            category,
            title,
            valid_until,
            status,
            COALESCE(escalation_level, 0) AS current_level
        FROM public.compliance_records
    LOOP
        v_records_checked := v_records_checked + 1;
        
        BEGIN
            -- Stop Condition: If document is renewed or compliant, do not escalate
            IF v_rec.status = 'Compliant' THEN
                CONTINUE;
            END IF;

            v_days_until_expiry := (v_rec.valid_until - v_today);
            v_rule_id := NULL;

            -- Evaluate compliance rules R3, R2, R1
            IF v_days_until_expiry <= -7 THEN
                -- R3: 7 calendar days after expiry, unresolved -> Escalate to Member Secretary
                v_rule_id := 'R3';
                v_target_level := 2;
                v_recipient_role := 'Member Secretary';
                v_action_text := 'Document Critically Expired - Escalated to Member Secretary';
                v_reason_text := format(
                    'Document "%s" expired %s calendar days ago on %s (>= 7 days past expiry threshold) without renewal. Escalated to Member Secretary for executive penalty / intake freeze.',
                    v_rec.title,
                    -v_days_until_expiry,
                    v_rec.valid_until
                );
                v_notification_title := format('CRITICAL ESCALATION: %s Expired 7+ Days', v_rec.category);
                v_severity := 'critical';

            ELSIF v_days_until_expiry <= 0 THEN
                -- R2: On expiry date (0 to 6 days overdue), unresolved -> Escalate to Regional Officer
                v_rule_id := 'R2';
                v_target_level := 1;
                v_recipient_role := 'Regional Officer (RO)';
                v_action_text := 'Document Expired - Escalated to Regional Officer';
                v_reason_text := format(
                    'Document "%s" expired on %s (%s day(s) overdue) without renewal. Escalated to Regional Officer for scrutiny and statutory show-cause notice.',
                    v_rec.title,
                    v_rec.valid_until,
                    -v_days_until_expiry
                );
                v_notification_title := format('URGENT: %s Expired Today', v_rec.category);
                v_severity := 'warning';

            ELSIF v_days_until_expiry <= 30 THEN
                -- R1: 30 calendar days before expiry -> In-app reminder/action for institution
                v_rule_id := 'R1';
                v_target_level := v_rec.current_level;
                v_recipient_role := 'Institution';
                v_action_text := 'In-App Document Expiry Reminder Dispatched';
                v_reason_text := format(
                    'Document "%s" is expiring in %s calendar day(s) (valid until %s). In-app renewal reminder dispatched to institution.',
                    v_rec.title,
                    v_days_until_expiry,
                    v_rec.valid_until
                );
                v_notification_title := format('Action Required: %s Expiring in %s Days', v_rec.category, v_days_until_expiry);
                v_severity := 'info';
            END IF;

            -- If an escalation or reminder condition is met
            IF v_rule_id IS NOT NULL THEN
                -- Check idempotency against persistent escalation audit table
                SELECT EXISTS (
                    SELECT 1 
                    FROM public.escalation_audit_logs
                    WHERE record_type = 'compliance_record'
                      AND record_id = v_rec.id
                      AND rule_identifier = v_rule_id
                      AND deadline_date = v_rec.valid_until
                ) INTO v_already_executed;

                IF NOT v_already_executed THEN
                    -- Insert audit log record
                    INSERT INTO public.escalation_audit_logs (
                        record_type,
                        record_id,
                        rule_identifier,
                        previous_level,
                        new_level,
                        recipient_role,
                        action,
                        reason,
                        deadline_date,
                        result_status,
                        event_timestamp
                    ) VALUES (
                        'compliance_record',
                        v_rec.id,
                        v_rule_id,
                        v_rec.current_level,
                        v_target_level,
                        v_recipient_role,
                        v_action_text,
                        v_reason_text,
                        v_rec.valid_until,
                        'success',
                        now()
                    );

                    -- Insert persistent in-app notification
                    INSERT INTO public.in_app_notifications (
                        recipient_role,
                        title,
                        message,
                        record_type,
                        record_id,
                        rule_identifier,
                        severity,
                        created_at
                    ) VALUES (
                        v_recipient_role,
                        v_notification_title,
                        v_reason_text,
                        'compliance_record',
                        v_rec.id,
                        v_rule_id,
                        v_severity,
                        now()
                    );

                    -- Update compliance record state
                    IF v_rule_id IN ('R2', 'R3') THEN
                        UPDATE public.compliance_records
                        SET 
                            escalation_level = v_target_level,
                            escalated_at = now(),
                            urgency = 'Critical Expired',
                            days_remaining = v_days_until_expiry,
                            action_required = format('Escalated to %s: %s', v_recipient_role, v_action_text)
                        WHERE id = v_rec.id;
                        v_escalations_performed := v_escalations_performed + 1;
                    ELSE
                        -- R1 Reminder: keep level, update urgency and reminder note
                        UPDATE public.compliance_records
                        SET 
                            urgency = 'Expiring Soon',
                            days_remaining = v_days_until_expiry,
                            action_required = format('Reminder: Valid until %s (%s days remaining). Submit renewal documentation.', v_rec.valid_until, v_days_until_expiry)
                        WHERE id = v_rec.id;
                        v_reminders_created := v_reminders_created + 1;
                    END IF;

                    -- Record human-readable entry in institutional audit_logs trail if accessible
                    BEGIN
                        INSERT INTO public.audit_logs (
                            id,
                            event_timestamp,
                            actor,
                            role,
                            action,
                            application_number,
                            institute_name,
                            details
                        ) VALUES (
                            'aud-esc-' || floor(extract(epoch from now()) * 1000)::text || '-' || substring(v_rec.id, 1, 4),
                            now(),
                            'System Automated',
                            'System Automated',
                            v_action_text,
                            COALESCE(v_rec.application_number, 'N/A'),
                            COALESCE(v_rec.institute_name, 'N/A'),
                            v_reason_text
                        );
                    EXCEPTION WHEN OTHERS THEN
                        NULL; -- Gracefully ignore if audit_logs table has schema constraints
                    END;

                    -- Append summary detail
                    v_details := v_details || jsonb_build_object(
                        'record_type', 'compliance_record',
                        'record_id', v_rec.id,
                        'rule', v_rule_id,
                        'previous_level', v_rec.current_level,
                        'new_level', v_target_level,
                        'recipient', v_recipient_role,
                        'action', v_action_text
                    );
                END IF;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_errors_count := v_errors_count + 1;
            BEGIN
                INSERT INTO public.escalation_audit_logs (
                    record_type,
                    record_id,
                    rule_identifier,
                    previous_level,
                    new_level,
                    recipient_role,
                    action,
                    reason,
                    deadline_date,
                    result_status,
                    error_message,
                    event_timestamp
                ) VALUES (
                    'compliance_record',
                    v_rec.id,
                    COALESCE(v_rule_id, 'UNKNOWN'),
                    v_rec.current_level,
                    v_rec.current_level,
                    'System Automated',
                    'Error in escalation evaluation',
                    SQLERRM,
                    v_rec.valid_until,
                    'error',
                    SQLERRM,
                    now()
                );
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END;
    END LOOP;

    -- =========================================================================
    -- PART 2: PROCESS UNDERTAKINGS
    -- =========================================================================
    FOR v_rec IN 
        SELECT 
            u.id,
            u.compliance_record_id,
            u.type,
            u.description,
            u.due_date,
            u.status,
            u.escalation_level AS current_level,
            c.title AS compliance_title,
            c.application_number,
            c.institute_name
        FROM public.undertakings u
        LEFT JOIN public.compliance_records c ON u.compliance_record_id = c.id
        WHERE u.status IN ('pending', 'in_progress')
    LOOP
        v_records_checked := v_records_checked + 1;

        BEGIN
            v_days_overdue := (v_today - v_rec.due_date);
            v_rule_id := NULL;

            -- Evaluate undertaking rules U2, U1
            IF v_days_overdue >= 7 THEN
                -- U2: 7 calendar days overdue -> Escalate to Member Secretary (Level 2)
                v_rule_id := 'U2';
                v_target_level := 2;
                v_recipient_role := 'Member Secretary';
                v_action_text := 'Undertaking Critically Overdue - Escalated to Level 2';
                v_reason_text := format(
                    'Undertaking "%s" critically overdue by %s calendar days (>= 7 days grace threshold). Escalated to Member Secretary for Level 2 Enforcement Action.',
                    v_rec.type,
                    v_days_overdue
                );
                v_notification_title := format('CRITICAL OVERDUE: %s', v_rec.type);
                v_severity := 'critical';

            ELSIF v_days_overdue > 0 THEN
                -- U1: Deadline passed (1 to 6 days overdue) -> Escalate to Regional Officer (Level 1)
                v_rule_id := 'U1';
                v_target_level := 1;
                v_recipient_role := 'Regional Officer (RO)';
                v_action_text := 'Undertaking Deadline Passed - Escalated to Level 1';
                v_reason_text := format(
                    'Undertaking "%s" deadline passed on %s (%s day(s) overdue). Escalated to Regional Officer for Level 1 Statutory Notice.',
                    v_rec.type,
                    v_rec.due_date,
                    v_days_overdue
                );
                v_notification_title := format('OVERDUE NOTICE: %s', v_rec.type);
                v_severity := 'warning';
            END IF;

            -- If an overdue condition is met
            IF v_rule_id IS NOT NULL THEN
                -- Check idempotency against persistent escalation audit table
                SELECT EXISTS (
                    SELECT 1 
                    FROM public.escalation_audit_logs
                    WHERE record_type = 'undertaking'
                      AND record_id = v_rec.id::text
                      AND rule_identifier = v_rule_id
                      AND deadline_date = v_rec.due_date
                ) INTO v_already_executed;

                IF NOT v_already_executed THEN
                    -- Insert audit log record
                    INSERT INTO public.escalation_audit_logs (
                        record_type,
                        record_id,
                        rule_identifier,
                        previous_level,
                        new_level,
                        recipient_role,
                        action,
                        reason,
                        deadline_date,
                        result_status,
                        event_timestamp
                    ) VALUES (
                        'undertaking',
                        v_rec.id::text,
                        v_rule_id,
                        v_rec.current_level,
                        v_target_level,
                        v_recipient_role,
                        v_action_text,
                        v_reason_text,
                        v_rec.due_date,
                        'success',
                        now()
                    );

                    -- Insert into existing undertaking_escalations audit table
                    INSERT INTO public.undertaking_escalations (
                        undertaking_id,
                        previous_level,
                        new_level,
                        escalation_reason,
                        created_at
                    ) VALUES (
                        v_rec.id,
                        v_rec.current_level,
                        v_target_level,
                        v_reason_text,
                        now()
                    );

                    -- Insert persistent in-app notification
                    INSERT INTO public.in_app_notifications (
                        recipient_role,
                        title,
                        message,
                        record_type,
                        record_id,
                        rule_identifier,
                        severity,
                        created_at
                    ) VALUES (
                        v_recipient_role,
                        v_notification_title,
                        v_reason_text,
                        'undertaking',
                        v_rec.id::text,
                        v_rule_id,
                        v_severity,
                        now()
                    );

                    -- Update undertaking record
                    UPDATE public.undertakings
                    SET 
                        escalation_level = v_target_level,
                        escalated_at = now(),
                        updated_at = now()
                    WHERE id = v_rec.id;

                    v_escalations_performed := v_escalations_performed + 1;

                    -- Record human-readable entry in institutional audit_logs trail if accessible
                    BEGIN
                        INSERT INTO public.audit_logs (
                            id,
                            event_timestamp,
                            actor,
                            role,
                            action,
                            application_number,
                            institute_name,
                            details
                        ) VALUES (
                            'aud-esc-' || floor(extract(epoch from now()) * 1000)::text || '-' || substring(v_rec.id::text, 1, 4),
                            now(),
                            'System Automated',
                            'System Automated',
                            v_action_text,
                            COALESCE(v_rec.application_number, 'N/A'),
                            COALESCE(v_rec.institute_name, 'N/A'),
                            v_reason_text
                        );
                    EXCEPTION WHEN OTHERS THEN
                        NULL;
                    END;

                    -- Append summary detail
                    v_details := v_details || jsonb_build_object(
                        'record_type', 'undertaking',
                        'record_id', v_rec.id::text,
                        'rule', v_rule_id,
                        'previous_level', v_rec.current_level,
                        'new_level', v_target_level,
                        'recipient', v_recipient_role,
                        'action', v_action_text
                    );
                END IF;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_errors_count := v_errors_count + 1;
            BEGIN
                INSERT INTO public.escalation_audit_logs (
                    record_type,
                    record_id,
                    rule_identifier,
                    previous_level,
                    new_level,
                    recipient_role,
                    action,
                    reason,
                    deadline_date,
                    result_status,
                    error_message,
                    event_timestamp
                ) VALUES (
                    'undertaking',
                    v_rec.id::text,
                    COALESCE(v_rule_id, 'UNKNOWN'),
                    v_rec.current_level,
                    v_rec.current_level,
                    'System Automated',
                    'Error in undertaking escalation',
                    SQLERRM,
                    v_rec.due_date,
                    'error',
                    SQLERRM,
                    now()
                );
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END;
    END LOOP;

    -- Return execution summary JSON
    RETURN jsonb_build_object(
        'success', true,
        'records_checked', v_records_checked,
        'reminders_created', v_reminders_created,
        'escalations_performed', v_escalations_performed,
        'errors_count', v_errors_count,
        'evaluation_date', v_today,
        'details', v_details,
        'timestamp', now()
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.process_escalation_engine(DATE) TO anon, authenticated, service_role;

-- 7. Configure Automated Daily Schedule (pg_cron)
-- Ensures idempotent scheduling without creating duplicate jobs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        BEGIN
            PERFORM cron.unschedule('daily-aicte-escalation-job');
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        PERFORM cron.schedule(
            'daily-aicte-escalation-job',
            '0 0 * * *', -- Midnight UTC every calendar day
            'SELECT public.process_escalation_engine();'
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron extension not active or insufficient privileges to register cron.schedule';
END;
$$;
