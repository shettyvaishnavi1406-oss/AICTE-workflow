-- ==============================================================================
-- AICTE WORKFLOW AUTOMATION: SEED AUTHENTICATED DEMO ACCOUNTS
-- Migration Version: 20261025000001
-- Description: Creates 5 confirmed demo accounts in auth.users and public.profiles
--              for role-based authentication testing:
--              1. Institution (institution@aicte.gov.in)
--              2. Scrutiny Officer (scrutiny.officer@aicte.gov.in)
--              3. Regional Officer (regional.officer@aicte.gov.in)
--              4. EVC Member (evc.member@aicte.gov.in)
--              5. Admin / Member Secretary (admin@aicte.gov.in)
--
-- Password for all demo accounts: DemoPassword@2026!
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.seed_demo_user(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_role TEXT,
    p_institution_code TEXT DEFAULT NULL,
    p_region TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_encrypted_pw TEXT;
BEGIN
    v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));
    
    -- Check if user already exists in auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    
    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            role,
            aud
        ) VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000',
            p_email,
            v_encrypted_pw,
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object(
                'full_name', p_full_name,
                'role', p_role,
                'institution_code', p_institution_code,
                'region', p_region
            ),
            now(),
            now(),
            'authenticated',
            'authenticated'
        );
    ELSE
        -- Update existing user password and metadata
        UPDATE auth.users SET
            encrypted_password = v_encrypted_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_build_object(
                'full_name', p_full_name,
                'role', p_role,
                'institution_code', p_institution_code,
                'region', p_region
            ),
            updated_at = now()
        WHERE id = v_user_id;
    END IF;

    -- Upsert profile record
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        institution_code,
        region,
        updated_at
    ) VALUES (
        v_user_id,
        p_email,
        p_full_name,
        p_role,
        p_institution_code,
        p_region,
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        institution_code = EXCLUDED.institution_code,
        region = EXCLUDED.region,
        updated_at = now();

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;

-- Seed the 5 validated demo accounts:
-- 1. Institution
SELECT public.seed_demo_user(
    'institution@aicte.gov.in',
    'DemoPassword@2026!',
    'Prof. Arvind Patil',
    'Institution',
    'VIT-MUM-142',
    'Western'
);

-- 2. Scrutiny Officer
SELECT public.seed_demo_user(
    'scrutiny.officer@aicte.gov.in',
    'DemoPassword@2026!',
    'Dr. S. K. Sharma',
    'Scrutiny Officer',
    NULL,
    'Western'
);

-- 3. Regional Officer
SELECT public.seed_demo_user(
    'regional.officer@aicte.gov.in',
    'DemoPassword@2026!',
    'Dr. Ramesh Chandra',
    'Regional Officer',
    NULL,
    'Western'
);

-- 4. EVC Member
SELECT public.seed_demo_user(
    'evc.member@aicte.gov.in',
    'DemoPassword@2026!',
    'Prof. (Dr.) Amitabh Mohanty',
    'EVC Member',
    NULL,
    'Western'
);

-- 5. Admin / Member Secretary
SELECT public.seed_demo_user(
    'admin@aicte.gov.in',
    'DemoPassword@2026!',
    'Chief Regulatory Director (Member Secretary)',
    'Admin',
    NULL,
    'Central'
);

-- Clean up helper function
DROP FUNCTION IF EXISTS public.seed_demo_user;
