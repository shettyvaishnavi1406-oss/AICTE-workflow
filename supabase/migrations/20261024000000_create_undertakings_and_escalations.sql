-- ==============================================================================
-- AICTE WORKFLOW AUTOMATION: UNDERTAKINGS & AUTOMATIC ESCALATION MIGRATION
-- Migration Version: 20261024000000
-- Description: Creates undertakings and undertaking_escalations tables,
--              triggers, RLS policies, escalation procedure, and pg_cron schedule.
-- ==============================================================================

-- 1. Create undertakings table
CREATE TABLE IF NOT EXISTS public.undertakings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compliance_record_id TEXT NOT NULL REFERENCES public.compliance_records(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    escalation_level INTEGER NOT NULL DEFAULT 0 CHECK (escalation_level >= 0),
    escalated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create undertaking_escalations (escalation audit history) table
CREATE TABLE IF NOT EXISTS public.undertaking_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    undertaking_id UUID NOT NULL REFERENCES public.undertakings(id) ON DELETE CASCADE,
    previous_level INTEGER NOT NULL,
    new_level INTEGER NOT NULL,
    escalation_reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create indexes for performance and querying
CREATE INDEX IF NOT EXISTS idx_undertakings_compliance_record_id ON public.undertakings(compliance_record_id);
CREATE INDEX IF NOT EXISTS idx_undertakings_status ON public.undertakings(status);
CREATE INDEX IF NOT EXISTS idx_undertakings_due_date ON public.undertakings(due_date);
CREATE INDEX IF NOT EXISTS idx_undertakings_escalation_level ON public.undertakings(escalation_level);
CREATE INDEX IF NOT EXISTS idx_undertaking_escalations_undertaking_id ON public.undertaking_escalations(undertaking_id);
CREATE INDEX IF NOT EXISTS idx_undertaking_escalations_created_at ON public.undertaking_escalations(created_at);

-- 4. Automatically update updated_at timestamp on row update
CREATE OR REPLACE FUNCTION public.set_undertakings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_undertakings_updated_at ON public.undertakings;
CREATE TRIGGER trigger_set_undertakings_updated_at
BEFORE UPDATE ON public.undertakings
FOR EACH ROW
EXECUTE FUNCTION public.set_undertakings_updated_at();

-- 5. Row Level Security (RLS) Configuration
ALTER TABLE public.undertakings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.undertaking_escalations ENABLE ROW LEVEL SECURITY;

-- Undertakings table policies (matching portal role access pattern)
DROP POLICY IF EXISTS "Allow read access to undertakings" ON public.undertakings;
CREATE POLICY "Allow read access to undertakings"
ON public.undertakings FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow insert access to undertakings" ON public.undertakings;
CREATE POLICY "Allow insert access to undertakings"
ON public.undertakings FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update access to undertakings" ON public.undertakings;
CREATE POLICY "Allow update access to undertakings"
ON public.undertakings FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete access to undertakings" ON public.undertakings;
CREATE POLICY "Allow delete access to undertakings"
ON public.undertakings FOR DELETE
TO anon, authenticated
USING (true);

-- Undertaking escalations table policies
DROP POLICY IF EXISTS "Allow read access to undertaking_escalations" ON public.undertaking_escalations;
CREATE POLICY "Allow read access to undertaking_escalations"
ON public.undertaking_escalations FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow insert access to undertaking_escalations" ON public.undertaking_escalations;
CREATE POLICY "Allow insert access to undertaking_escalations"
ON public.undertaking_escalations FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 6. Stored Procedure: Automatic Escalation Processing
-- Policy:
--   Level 0: Not overdue (due_date >= CURRENT_DATE).
--   Level 1: Overdue past deadline (> 0 days overdue).
--   Level 2: Critically overdue (>= 7 calendar days overdue).
-- Characteristics:
--   - Idempotent: Never re-escalates or duplicates transitions if already at target level.
--   - Safe: Completed and cancelled undertakings are excluded.
--   - Audited: Records event in undertaking_escalations and institutional audit_logs.
CREATE OR REPLACE FUNCTION public.process_undertaking_escalations(
    p_level_1_days_overdue INT DEFAULT 0,
    p_level_2_days_overdue INT DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record RECORD;
    v_today DATE := CURRENT_DATE;
    v_days_overdue INT;
    v_target_level INT;
    v_escalated_count INT := 0;
    v_evaluated_count INT := 0;
    v_escalation_reason TEXT;
BEGIN
    FOR v_record IN
        SELECT 
            u.id,
            u.compliance_record_id,
            u.type,
            u.description,
            u.due_date,
            u.status,
            u.escalation_level,
            c.title AS compliance_title,
            c.application_number,
            c.institute_name
        FROM public.undertakings u
        LEFT JOIN public.compliance_records c ON u.compliance_record_id = c.id
        WHERE u.status IN ('pending', 'in_progress')
    LOOP
        v_evaluated_count := v_evaluated_count + 1;
        v_days_overdue := (v_today - v_record.due_date);

        -- Evaluate target escalation level
        IF v_days_overdue >= p_level_2_days_overdue THEN
            v_target_level := 2;
        ELSIF v_days_overdue > p_level_1_days_overdue THEN
            v_target_level := 1;
        ELSE
            v_target_level := 0;
        END IF;

        -- Idempotency check: only escalate if target level is strictly higher than current level
        IF v_target_level > v_record.escalation_level THEN
            v_escalation_reason := CASE 
                WHEN v_target_level = 1 THEN 
                    format('Undertaking deadline passed (%s day(s) overdue). Escalated to Level 1 Statutory Notice.', v_days_overdue)
                WHEN v_target_level = 2 THEN 
                    format('Undertaking critically overdue by %s calendar days (>= %s days threshold). Escalated to Level 2 Enforcement Action.', v_days_overdue, p_level_2_days_overdue)
                ELSE 
                    format('Escalated to Level %s.', v_target_level)
            END;

            -- Update undertaking
            UPDATE public.undertakings
            SET 
                escalation_level = v_target_level,
                escalated_at = now(),
                updated_at = now()
            WHERE id = v_record.id;

            -- Insert into undertaking_escalations audit table
            INSERT INTO public.undertaking_escalations (
                undertaking_id,
                previous_level,
                new_level,
                escalation_reason,
                created_at
            ) VALUES (
                v_record.id,
                v_record.escalation_level,
                v_target_level,
                v_escalation_reason,
                now()
            );

            -- Also record in institutional audit_logs trail if accessible
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
                    'aud-' || floor(extract(epoch from now()) * 1000)::text || '-' || substring(v_record.id::text, 1, 4),
                    now(),
                    'System Automated',
                    'System Automated',
                    format('Undertaking Escalated to Level %s', v_target_level),
                    COALESCE(v_record.application_number, 'N/A'),
                    COALESCE(v_record.institute_name, 'N/A'),
                    format('Undertaking "%s" for %s: %s', v_record.type, COALESCE(v_record.compliance_title, 'Compliance Item'), v_escalation_reason)
                );
            EXCEPTION WHEN OTHERS THEN
                NULL; -- Continue even if audit_logs has schema restrictions
            END;

            v_escalated_count := v_escalated_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'evaluated', v_evaluated_count,
        'escalated', v_escalated_count,
        'timestamp', now()
    );
END;
$$;

-- Grant execution rights to anon and authenticated roles for manual prototype triggers
GRANT EXECUTE ON FUNCTION public.process_undertaking_escalations(INT, INT) TO anon, authenticated, service_role;

-- 7. Automated Daily Schedule (pg_cron)
-- Note: Uncomment and execute on Supabase projects where pg_cron extension is active
-- SELECT cron.schedule(
--     'process-undertaking-escalations-daily',
--     '0 0 * * *', -- Every midnight (00:00 UTC)
--     $$SELECT public.process_undertaking_escalations(0, 7);$$
-- );

-- 8. Seed sample test undertakings for immediate verification against existing compliance records
INSERT INTO public.undertakings (id, compliance_record_id, type, description, due_date, status, escalation_level)
VALUES 
  -- Valid / Future undertaking (Level 0)
  ('11111111-1111-1111-1111-111111111111', 'comp-103', 'NBA SAR Submission Commitment', 'Formal institutional undertaking to upload complete SAR for cycle renewal.', CURRENT_DATE + INTERVAL '14 days', 'pending', 0),
  -- Overdue by 2 days (Eligible for Level 1 escalation)
  ('22222222-2222-2222-2222-222222222222', 'comp-102', 'Sub-Registrar Registered Lease Copy', 'Commitment to furnish certified 30-year lease deed registration receipt.', CURRENT_DATE - INTERVAL '2 days', 'in_progress', 0),
  -- Overdue by 10 days (Eligible for Level 2 escalation)
  ('33333333-3333-3333-3333-333333333333', 'comp-101', 'Municipal Fire NOC Submission', 'Statutory commitment to provide Municipal Fire Brigade clearance certificate.', CURRENT_DATE - INTERVAL '10 days', 'pending', 0)
ON CONFLICT (id) DO NOTHING;
