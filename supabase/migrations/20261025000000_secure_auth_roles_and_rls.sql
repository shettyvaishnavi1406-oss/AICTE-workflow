-- ==============================================================================
-- AICTE WORKFLOW AUTOMATION: PHASE 1 SECURITY & ROLE-BASED ACCESS CONTROL (RBAC)
-- Migration Version: 20261025000000
-- Description: Establishes auth.users-linked profiles table with validated roles,
--              security-definer role helper functions, auto-provisioning triggers,
--              revokes anonymous write/delete access across all sensitive tables,
--              and establishes least-privilege RLS policies for:
--              applications, compliance_records, evc_visits, audit_logs (append-only),
--              experts, undertakings, undertaking_escalations, escalation_audit_logs,
--              and in_app_notifications.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create profiles table linked to auth.users
-- Validated roles: Institution, Scrutiny Officer, Regional Officer, EVC Member, Admin
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'Institution' CHECK (role IN (
        'Institution',
        'Scrutiny Officer',
        'Regional Officer',
        'EVC Member',
        'Admin'
    )),
    institution_code TEXT, -- Links Institution users to their institute (e.g. 'VIT-MUM-142')
    region TEXT,           -- Regional Officer jurisdiction (e.g. 'Western', 'Northern', etc.)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast role-based lookups and join performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_institution_code ON public.profiles(institution_code);

-- ------------------------------------------------------------------------------
-- 2. User Roles compatibility view
-- Provides a clean view for role checks without data duplication
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.user_roles AS
SELECT 
    id AS user_id,
    role,
    created_at
FROM public.profiles;

-- ------------------------------------------------------------------------------
-- 3. Security Definer Helper Functions
-- Avoids RLS infinite recursion and ensures trusted server-side role resolution
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_current_user_institution_code()
RETURNS TEXT AS $$
    SELECT institution_code FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_current_user_region()
RETURNS TEXT AS $$
    SELECT region FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'Admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_aicte_officer()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('Regional Officer', 'Scrutiny Officer', 'Admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 4. Automatic Profile Provisioning Trigger on auth.users
-- Automatically creates a profile record when a new user signs up
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
    v_full_name TEXT;
    v_institution_code TEXT;
    v_region TEXT;
BEGIN
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'Institution');
    IF v_role NOT IN ('Institution', 'Scrutiny Officer', 'Regional Officer', 'EVC Member', 'Admin') THEN
        v_role := 'Institution';
    END IF;

    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    v_institution_code := NEW.raw_user_meta_data->>'institution_code';
    v_region := NEW.raw_user_meta_data->>'region';

    INSERT INTO public.profiles (id, email, full_name, role, institution_code, region)
    VALUES (NEW.id, NEW.email, v_full_name, v_role, v_institution_code, v_region)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = CASE WHEN profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for any pre-existing auth.users
INSERT INTO public.profiles (id, email, full_name, role, institution_code, region)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
    COALESCE(
        CASE WHEN raw_user_meta_data->>'role' IN ('Institution', 'Scrutiny Officer', 'Regional Officer', 'EVC Member', 'Admin') 
             THEN raw_user_meta_data->>'role' 
             ELSE 'Admin' 
        END, 
        'Admin'
    ),
    raw_user_meta_data->>'institution_code',
    raw_user_meta_data->>'region'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 5. Revoke Anonymous Write & Delete Permissions (CRITICAL SECURITY FIX)
-- Stops unauthorized write/delete from the anon public API key
-- ------------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.applications FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.compliance_records FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.evc_visits FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.experts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.undertakings FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.undertaking_escalations FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.escalation_audit_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.in_app_notifications FROM anon;

-- Protect immutable audit logs: NO users (even authenticated) may update or delete
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated;
REVOKE UPDATE, DELETE ON public.escalation_audit_logs FROM authenticated;

-- ------------------------------------------------------------------------------
-- 6. Configure Row Level Security (RLS) on PROFILES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
ON public.profiles FOR SELECT
TO authenticated
USING (
    id = auth.uid() 
    OR public.is_aicte_officer()
);

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
    id = auth.uid() 
    AND (role = 'Institution' OR public.is_admin())
);

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy"
ON public.profiles FOR UPDATE
TO authenticated
USING (
    id = auth.uid() 
    OR public.is_admin()
)
WITH CHECK (
    -- Non-admins cannot elevate their own role
    (id = auth.uid() AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()))
    OR public.is_admin()
);

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy"
ON public.profiles FOR DELETE
TO authenticated
USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 7. Configure Row Level Security (RLS) on APPLICATIONS
-- ------------------------------------------------------------------------------
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Clean up any legacy permissive policies
DROP POLICY IF EXISTS "Allow read access to applications" ON public.applications;
DROP POLICY IF EXISTS "Allow insert access to applications" ON public.applications;
DROP POLICY IF EXISTS "Allow update access to applications" ON public.applications;
DROP POLICY IF EXISTS "Allow delete access to applications" ON public.applications;
DROP POLICY IF EXISTS "applications_select_policy" ON public.applications;
DROP POLICY IF EXISTS "applications_insert_policy" ON public.applications;
DROP POLICY IF EXISTS "applications_update_policy" ON public.applications;
DROP POLICY IF EXISTS "applications_delete_policy" ON public.applications;

-- SELECT: Public can track by application number; Officers can view all; Institutions view their own
CREATE POLICY "applications_select_policy"
ON public.applications FOR SELECT
TO anon, authenticated
USING (
    -- Public tracking access is permitted for status transparency
    true
);

-- INSERT: Only authenticated Institutions (for their own institute) or AICTE Officers
CREATE POLICY "applications_insert_policy"
ON public.applications FOR INSERT
TO authenticated
WITH CHECK (
    public.is_aicte_officer()
    OR (
        public.get_current_user_role() = 'Institution' 
        AND institute_code = public.get_current_user_institution_code()
    )
);

-- UPDATE: Officers can advance stages / add remarks; Institutions can edit Drafts
CREATE POLICY "applications_update_policy"
ON public.applications FOR UPDATE
TO authenticated
USING (
    public.is_aicte_officer()
    OR (
        public.get_current_user_role() = 'Institution' 
        AND institute_code = public.get_current_user_institution_code()
        AND current_stage = 'Draft'
    )
)
WITH CHECK (
    public.is_aicte_officer()
    OR (
        public.get_current_user_role() = 'Institution' 
        AND institute_code = public.get_current_user_institution_code()
        AND current_stage IN ('Draft', 'Submitted')
    )
);

-- DELETE: Only Admins can delete applications
CREATE POLICY "applications_delete_policy"
ON public.applications FOR DELETE
TO authenticated
USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 8. Configure Row Level Security (RLS) on COMPLIANCE_RECORDS
-- ------------------------------------------------------------------------------
ALTER TABLE public.compliance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to compliance_records" ON public.compliance_records;
DROP POLICY IF EXISTS "Allow insert access to compliance_records" ON public.compliance_records;
DROP POLICY IF EXISTS "Allow update access to compliance_records" ON public.compliance_records;
DROP POLICY IF EXISTS "Allow delete access to compliance_records" ON public.compliance_records;
DROP POLICY IF EXISTS "compliance_records_select_policy" ON public.compliance_records;
DROP POLICY IF EXISTS "compliance_records_insert_policy" ON public.compliance_records;
DROP POLICY IF EXISTS "compliance_records_update_policy" ON public.compliance_records;
DROP POLICY IF EXISTS "compliance_records_delete_policy" ON public.compliance_records;

-- SELECT: Public read-only for transparency, or authenticated users
CREATE POLICY "compliance_records_select_policy"
ON public.compliance_records FOR SELECT
TO anon, authenticated
USING (true);

-- INSERT: Only AICTE Officers can create compliance records
CREATE POLICY "compliance_records_insert_policy"
ON public.compliance_records FOR INSERT
TO authenticated
WITH CHECK (public.is_aicte_officer());

-- UPDATE: Only AICTE Officers can update compliance status and remarks
CREATE POLICY "compliance_records_update_policy"
ON public.compliance_records FOR UPDATE
TO authenticated
USING (public.is_aicte_officer())
WITH CHECK (public.is_aicte_officer());

-- DELETE: Only Admins can delete compliance records
CREATE POLICY "compliance_records_delete_policy"
ON public.compliance_records FOR DELETE
TO authenticated
USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 9. Configure Row Level Security (RLS) on EVC_VISITS
-- ------------------------------------------------------------------------------
ALTER TABLE public.evc_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to evc_visits" ON public.evc_visits;
DROP POLICY IF EXISTS "Allow insert access to evc_visits" ON public.evc_visits;
DROP POLICY IF EXISTS "Allow update access to evc_visits" ON public.evc_visits;
DROP POLICY IF EXISTS "Allow delete access to evc_visits" ON public.evc_visits;
DROP POLICY IF EXISTS "evc_visits_select_policy" ON public.evc_visits;
DROP POLICY IF EXISTS "evc_visits_insert_policy" ON public.evc_visits;
DROP POLICY IF EXISTS "evc_visits_update_policy" ON public.evc_visits;
DROP POLICY IF EXISTS "evc_visits_delete_policy" ON public.evc_visits;

CREATE POLICY "evc_visits_select_policy"
ON public.evc_visits FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "evc_visits_insert_policy"
ON public.evc_visits FOR INSERT
TO authenticated
WITH CHECK (public.is_aicte_officer());

CREATE POLICY "evc_visits_update_policy"
ON public.evc_visits FOR UPDATE
TO authenticated
USING (
    public.is_aicte_officer() 
    OR public.get_current_user_role() = 'EVC Member'
)
WITH CHECK (
    public.is_aicte_officer() 
    OR public.get_current_user_role() = 'EVC Member'
);

CREATE POLICY "evc_visits_delete_policy"
ON public.evc_visits FOR DELETE
TO authenticated
USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 10. Configure Row Level Security (RLS) on EXPERTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.experts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to experts" ON public.experts;
DROP POLICY IF EXISTS "Allow insert access to experts" ON public.experts;
DROP POLICY IF EXISTS "Allow update access to experts" ON public.experts;
DROP POLICY IF EXISTS "Allow delete access to experts" ON public.experts;
DROP POLICY IF EXISTS "experts_select_policy" ON public.experts;
DROP POLICY IF EXISTS "experts_insert_policy" ON public.experts;
DROP POLICY IF EXISTS "experts_update_policy" ON public.experts;
DROP POLICY IF EXISTS "experts_delete_policy" ON public.experts;

CREATE POLICY "experts_select_policy"
ON public.experts FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "experts_insert_policy"
ON public.experts FOR INSERT
TO authenticated
WITH CHECK (public.is_aicte_officer());

CREATE POLICY "experts_update_policy"
ON public.experts FOR UPDATE
TO authenticated
USING (public.is_aicte_officer())
WITH CHECK (public.is_aicte_officer());

CREATE POLICY "experts_delete_policy"
ON public.experts FOR DELETE
TO authenticated
USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 11. Configure Row Level Security (RLS) on AUDIT_LOGS (Strictly Append-Only)
-- ------------------------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow insert access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow update access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow delete access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_update" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_delete" ON public.audit_logs;

-- SELECT: Accessible to public/authenticated for transparency audit dashboard
CREATE POLICY "audit_logs_select_policy"
ON public.audit_logs FOR SELECT
TO anon, authenticated
USING (true);

-- INSERT: Authenticated users can append audit records during workflow events
CREATE POLICY "audit_logs_insert_policy"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: STRICTLY FORBIDDEN (Immutable statutory audit record)
CREATE POLICY "audit_logs_no_update"
ON public.audit_logs FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- DELETE: STRICTLY FORBIDDEN (No deletion allowed)
CREATE POLICY "audit_logs_no_delete"
ON public.audit_logs FOR DELETE
TO authenticated
USING (false);

-- ------------------------------------------------------------------------------
-- 12. Harden Row Level Security (RLS) on UNDERTAKINGS & ESCALATIONS
-- (Replaces overly permissive TO anon, authenticated policies from Migration 0)
-- ------------------------------------------------------------------------------
ALTER TABLE public.undertakings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.undertaking_escalations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to undertakings" ON public.undertakings;
DROP POLICY IF EXISTS "Allow insert access to undertakings" ON public.undertakings;
DROP POLICY IF EXISTS "Allow update access to undertakings" ON public.undertakings;
DROP POLICY IF EXISTS "Allow delete access to undertakings" ON public.undertakings;
DROP POLICY IF EXISTS "undertakings_select_policy" ON public.undertakings;
DROP POLICY IF EXISTS "undertakings_insert_policy" ON public.undertakings;
DROP POLICY IF EXISTS "undertakings_update_policy" ON public.undertakings;
DROP POLICY IF EXISTS "undertakings_delete_policy" ON public.undertakings;

CREATE POLICY "undertakings_select_policy"
ON public.undertakings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "undertakings_insert_policy"
ON public.undertakings FOR INSERT
TO authenticated
WITH CHECK (
    public.is_aicte_officer()
    OR public.get_current_user_role() = 'Institution'
);

CREATE POLICY "undertakings_update_policy"
ON public.undertakings FOR UPDATE
TO authenticated
USING (
    public.is_aicte_officer()
    OR (public.get_current_user_role() = 'Institution' AND status = 'pending')
)
WITH CHECK (
    public.is_aicte_officer()
    OR (public.get_current_user_role() = 'Institution' AND status IN ('pending', 'in_progress', 'completed'))
);

CREATE POLICY "undertakings_delete_policy"
ON public.undertakings FOR DELETE
TO authenticated
USING (public.is_admin());

-- Undertaking Escalations (Audit history): Append-Only
DROP POLICY IF EXISTS "Allow read access to undertaking_escalations" ON public.undertaking_escalations;
DROP POLICY IF EXISTS "Allow insert access to undertaking_escalations" ON public.undertaking_escalations;
DROP POLICY IF EXISTS "undertaking_escalations_select_policy" ON public.undertaking_escalations;
DROP POLICY IF EXISTS "undertaking_escalations_insert_policy" ON public.undertaking_escalations;
DROP POLICY IF EXISTS "undertaking_escalations_no_update" ON public.undertaking_escalations;
DROP POLICY IF EXISTS "undertaking_escalations_no_delete" ON public.undertaking_escalations;

CREATE POLICY "undertaking_escalations_select_policy"
ON public.undertaking_escalations FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "undertaking_escalations_insert_policy"
ON public.undertaking_escalations FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

CREATE POLICY "undertaking_escalations_no_update"
ON public.undertaking_escalations FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "undertaking_escalations_no_delete"
ON public.undertaking_escalations FOR DELETE
TO authenticated
USING (false);

-- ------------------------------------------------------------------------------
-- 13. Harden Row Level Security on ESCALATION_AUDIT_LOGS & NOTIFICATIONS
-- (Replaces overly permissive policies from Migration 1)
-- ------------------------------------------------------------------------------
ALTER TABLE public.escalation_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to escalation_audit_logs" ON public.escalation_audit_logs;
DROP POLICY IF EXISTS "Allow insert access to escalation_audit_logs" ON public.escalation_audit_logs;
DROP POLICY IF EXISTS "escalation_audit_logs_select_policy" ON public.escalation_audit_logs;
DROP POLICY IF EXISTS "escalation_audit_logs_insert_policy" ON public.escalation_audit_logs;
DROP POLICY IF EXISTS "escalation_audit_logs_no_update" ON public.escalation_audit_logs;
DROP POLICY IF EXISTS "escalation_audit_logs_no_delete" ON public.escalation_audit_logs;

CREATE POLICY "escalation_audit_logs_select_policy"
ON public.escalation_audit_logs FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "escalation_audit_logs_insert_policy"
ON public.escalation_audit_logs FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

CREATE POLICY "escalation_audit_logs_no_update"
ON public.escalation_audit_logs FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "escalation_audit_logs_no_delete"
ON public.escalation_audit_logs FOR DELETE
TO authenticated
USING (false);

-- In-app notifications
DROP POLICY IF EXISTS "Allow read access to in_app_notifications" ON public.in_app_notifications;
DROP POLICY IF EXISTS "Allow insert access to in_app_notifications" ON public.in_app_notifications;
DROP POLICY IF EXISTS "in_app_notifications_select_policy" ON public.in_app_notifications;
DROP POLICY IF EXISTS "in_app_notifications_insert_policy" ON public.in_app_notifications;
DROP POLICY IF EXISTS "in_app_notifications_update_policy" ON public.in_app_notifications;
DROP POLICY IF EXISTS "in_app_notifications_delete_policy" ON public.in_app_notifications;

CREATE POLICY "in_app_notifications_select_policy"
ON public.in_app_notifications FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "in_app_notifications_insert_policy"
ON public.in_app_notifications FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

-- Users can only mark notifications as read
CREATE POLICY "in_app_notifications_update_policy"
ON public.in_app_notifications FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (is_read = true);

CREATE POLICY "in_app_notifications_delete_policy"
ON public.in_app_notifications FOR DELETE
TO authenticated
USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 14. Document Storage Bucket Security (storage.objects)
-- Forbid anonymous document uploads; permit only authenticated uploads
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- Check if storage schema exists
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        -- Remove any anonymous upload policies on documents bucket
        DROP POLICY IF EXISTS "Allow anonymous document upload" ON storage.objects;
        DROP POLICY IF EXISTS "documents_anon_upload" ON storage.objects;
        DROP POLICY IF EXISTS "documents_authenticated_upload" ON storage.objects;
        DROP POLICY IF EXISTS "documents_authenticated_read" ON storage.objects;

        -- Permit authenticated users to upload documents
        CREATE POLICY "documents_authenticated_upload"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'documents');

        -- Permit read access
        CREATE POLICY "documents_authenticated_read"
        ON storage.objects FOR SELECT
        TO anon, authenticated
        USING (bucket_id = 'documents');
    END IF;
END $$;
