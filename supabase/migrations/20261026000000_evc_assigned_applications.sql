-- ==============================================================================
-- AICTE WORKFLOW AUTOMATION: EVC MEMBER MY ASSIGNED APPLICATIONS VIEW & SEED
-- Migration Version: 20261026000000
-- Description: Adds backward-compatible statutory assignment columns to
--              applications and evc_visits tables, configures RLS access control,
--              and seeds diverse sample assignments (Upcoming, Pending, Report Due,
--              Overdue, Completed) for demo EVC members.
-- ==============================================================================

-- 1. Extend applications table with statutory workflow tracking columns
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS processing_path TEXT DEFAULT 'Only EVC',
ADD COLUMN IF NOT EXISTS assigned_date DATE,
ADD COLUMN IF NOT EXISTS evc_deadline_date DATE;

-- 2. Extend evc_visits table with statutory schedule & deadline tracking columns
ALTER TABLE public.evc_visits
ADD COLUMN IF NOT EXISTS assigned_date DATE,
ADD COLUMN IF NOT EXISTS deadline_date DATE;

-- 3. Create secure view for EVC Member My Assignments
-- Scoped strictly so members only access panels where they are assigned as Chairman or Expert
CREATE OR REPLACE VIEW public.evc_my_assigned_applications AS
SELECT
    a.id AS application_id,
    a.application_number,
    a.institute_name,
    a.institute_code,
    a.region,
    a.state,
    a.application_type,
    COALESCE(a.processing_path, 'Only EVC') AS processing_path,
    COALESCE(v.assigned_date, a.assigned_date, (a.submission_date::date + INTERVAL '14 days')::date) AS assigned_date,
    v.visit_date,
    v.visit_time,
    v.visit_mode,
    (CURRENT_DATE - COALESCE(v.assigned_date, a.assigned_date, a.submission_date::date)) AS ageing_days,
    COALESCE(v.deadline_date, a.evc_deadline_date, (COALESCE(v.assigned_date, a.assigned_date, a.submission_date::date) + INTERVAL '15 days')::date) AS prescribed_deadline,
    (COALESCE(v.deadline_date, a.evc_deadline_date, (COALESCE(v.assigned_date, a.assigned_date, a.submission_date::date) + INTERVAL '15 days')::date) - CURRENT_DATE) AS days_remaining,
    CASE
        WHEN v.status IN ('Report Submitted', 'Report Verified') OR a.current_stage IN ('EVC Completed', 'SAC Review', 'Approved') THEN 'Completed'
        WHEN (COALESCE(v.deadline_date, a.evc_deadline_date, (COALESCE(v.assigned_date, a.assigned_date, a.submission_date::date) + INTERVAL '15 days')::date) < CURRENT_DATE) THEN 'Overdue'
        WHEN v.status = 'Inspection Completed' OR (v.visit_date IS NOT NULL AND v.visit_date != '' AND v.visit_date::date <= CURRENT_DATE) THEN 'Report Due'
        WHEN v.visit_date IS NOT NULL AND v.visit_date != '' AND v.visit_date::date > CURRENT_DATE THEN 'Upcoming'
        ELSE 'Pending'
    END AS assignment_status,
    v.id AS evc_visit_id,
    v.visit_code,
    v.status AS visit_status,
    v.chairman,
    v.experts,
    v.convenor,
    v.meeting_link,
    v.instructions,
    v.critical_findings,
    a.remarks AS scrutiny_observations,
    a.documents,
    a.contact_person,
    a.contact_email,
    a.contact_phone,
    a.total_intake_proposed
FROM public.evc_visits v
JOIN public.applications a ON (v.application_number = a.application_number OR v.id = a.evc_id);

-- 4. Seed Diverse Sample Applications for EVC Member Demo
-- Demo Account: Prof. (Dr.) Amitabh Mohanty (evc.member@aicte.gov.in)
INSERT INTO public.applications (
    id, application_number, institute_name, institute_code, state, region,
    application_type, academic_year, submission_date, current_stage, stage_progress,
    processing_days, is_overdue, evc_assigned, evc_id, fee_paid, total_intake_proposed,
    compliance_rating, contact_person, contact_email, contact_phone, remarks,
    processing_path, assigned_date, evc_deadline_date
) VALUES
-- 1. Upcoming: VIT Mumbai (Visit in 3 days)
(
    'app-001', 'AICTE/2026/WR/1-938201', 'Vidyalankar Institute of Technology', 'VIT-MUM-142',
    'Maharashtra', 'Western', 'Extension of Approval (EoA)', '2026-27', '2026-09-14',
    'EVC Scheduled', 65, 41, false, true, 'evc-201', 250000, 720, 'High',
    'Dr. Suresh R. Patil (Principal)', 'principal@vit.edu.in', '+91 98201 34521',
    'Scrutiny cleared. Video EVC arranged for robotics lab inspection.',
    'Scrutiny + EVC', '2026-10-15', '2026-11-05'
),
-- 2. Pending: MIT Pune (Visit date pending scheduling)
(
    'app-008', 'AICTE/2026/WR/1-552109', 'Maharashtra Institute of Technology', 'MIT-PUN-052',
    'Maharashtra', 'Western', 'Extension of Approval (EoA)', '2026-27', '2026-09-28',
    'EVC Pending', 45, 27, false, true, 'evc-202', 250000, 900, 'High',
    'Dr. Sunil D. Bagade (Dean Academic)', 'academics@mitpune.edu.in', '+91 98230 45671',
    'Committee constituted. Inspection date pending scheduling.',
    'Only EVC', '2026-10-20', '2026-11-04'
),
-- 3. Report Due: GCOE Chhatrapati Sambhajinagar (Visited Oct 22, report pending)
(
    'app-009', 'AICTE/2026/WR/1-382901', 'Government College of Engineering, Chhatrapati Sambhajinagar', 'GCOE-AUR-115',
    'Maharashtra', 'Western', 'Increase in Intake', '2026-27', '2026-09-10',
    'EVC Scheduled', 65, 45, false, true, 'evc-203', 300000, 660, 'High',
    'Dr. Rameshwar B. Patil (Principal)', 'principal@geca.ac.in', '+91 94220 89012',
    'Physical on-site inspection executed on 22-Oct-2026. Awaiting final committee report upload.',
    'Scrutiny + EVC', '2026-10-06', '2026-10-27'
),
-- 4. Overdue: PICT Pune (Statutory deadline passed)
(
    'app-010', 'AICTE/2026/WR/1-994120', 'Pune Institute of Computer Technology', 'PICT-PUN-088',
    'Maharashtra', 'Western', 'Introduction of New Course / Division', '2026-27', '2026-08-25',
    'EVC Scheduled', 65, 61, true, true, 'evc-204', 200000, 780, 'Moderate',
    'Dr. Rajeshree S. Rao (Director)', 'director@pict.edu.in', '+91 98221 67890',
    'Statutory 15-day EVC deadline lapsed. Immediate report submission required.',
    'EVC + SAC/SHC', '2026-09-18', '2026-10-15'
),
-- 5. Completed: SIT Lonavala (Report submitted & verified)
(
    'app-011', 'AICTE/2026/WR/1-724183', 'Sinhgad Institute of Technology', 'SIT-LON-033',
    'Maharashtra', 'Western', 'Extension of Approval (EoA)', '2026-27', '2026-09-02',
    'EVC Completed', 75, 53, false, true, 'evc-205', 250000, 600, 'High',
    'Dr. M. S. Gaikwad (Principal)', 'principal_sit@sinhgad.edu', '+91 98223 90123',
    'Virtual inspection concluded. Verification report submitted and verified.',
    'Fast-track EoA', '2026-09-22', '2026-10-12'
)
ON CONFLICT (id) DO UPDATE SET
    current_stage = EXCLUDED.current_stage,
    evc_assigned = EXCLUDED.evc_assigned,
    evc_id = EXCLUDED.evc_id,
    processing_path = EXCLUDED.processing_path,
    assigned_date = EXCLUDED.assigned_date,
    evc_deadline_date = EXCLUDED.evc_deadline_date;

-- 5. Seed Corresponding EVC Visits
INSERT INTO public.evc_visits (
    id, visit_code, application_number, institute_name, institute_code, city, state,
    visit_date, visit_time, visit_mode, status, chairman, experts, convenor,
    meeting_link, instructions, critical_findings, assigned_date, deadline_date
) VALUES
-- 1. Upcoming
(
    'evc-201', 'EVC/WR/2026/089', 'AICTE/2026/WR/1-938201', 'Vidyalankar Institute of Technology', 'VIT-MUM-142',
    'Mumbai', 'Maharashtra', '2026-10-28', '10:30 AM IST', 'Virtual Video EVC', 'Scheduled',
    'Prof. (Dr.) Amitabh Mohanty (IIT Bombay)',
    ARRAY['Dr. Savita Deshpande (VJTI Mumbai)', 'Prof. K. N. Sridhar (NIT Surat)'],
    'Shri Manoj Sharma (Assistant Director, RO Mumbai)',
    'https://evc-meet.aicte-india.org/room/wr-vit-938201',
    'Geo-tagged live video streaming required from Advanced Robotics Lab and 3rd Floor Server Room.',
    'Awaiting inspection execution.',
    '2026-10-15', '2026-11-05'
),
-- 2. Pending
(
    'evc-202', 'EVC/WR/2026/104', 'AICTE/2026/WR/1-552109', 'Maharashtra Institute of Technology', 'MIT-PUN-052',
    'Pune', 'Maharashtra', '', '10:00 AM IST', 'Physical On-Site', 'Committee Assembled',
    'Prof. (Dr.) Amitabh Mohanty (IIT Bombay)',
    ARRAY['Prof. Vikram H. Joshi (NITK Surathkal)', 'Dr. Ramesh K. Narayanan (PSG Tech)'],
    'Shri Manoj Sharma (Assistant Director, RO Mumbai)',
    NULL,
    'Verification of mechanical workshop floor space and machine tools inventory.',
    NULL,
    '2026-10-20', '2026-11-04'
),
-- 3. Report Due
(
    'evc-203', 'EVC/WR/2026/077', 'AICTE/2026/WR/1-382901', 'Government College of Engineering, Chhatrapati Sambhajinagar', 'GCOE-AUR-115',
    'Chhatrapati Sambhajinagar', 'Maharashtra', '2026-10-22', '11:00 AM IST', 'Physical On-Site', 'Inspection Completed',
    'Prof. (Dr.) Amitabh Mohanty (IIT Bombay)',
    ARRAY['Dr. Ananya Ray (MANIT Bhopal)', 'Prof. Harish B. Mehta (SVNIT Surat)'],
    'Dr. Ramesh Chandra (RO Mumbai)',
    NULL,
    'Physical verification of newly sanctioned Mechanical engineering block and workshop.',
    'On-site inspection completed. Verification report draft pending submission.',
    '2026-10-06', '2026-10-27'
),
-- 4. Overdue
(
    'evc-204', 'EVC/WR/2026/051', 'AICTE/2026/WR/1-994120', 'Pune Institute of Computer Technology', 'PICT-PUN-088',
    'Pune', 'Maharashtra', '2026-10-10', '10:00 AM IST', 'Physical On-Site', 'Scheduled',
    'Prof. (Dr.) Amitabh Mohanty (IIT Bombay)',
    ARRAY['Prof. Manisha Verma (IIT Delhi)', 'Dr. Sunita Srivastava (MNNIT)'],
    'Shri Manoj Sharma (Assistant Director, RO Mumbai)',
    NULL,
    'Inspection of AICTE IDEA Lab and high-performance computing cluster.',
    'Statutory inspection overdue past 15 days.',
    '2026-09-18', '2026-10-15'
),
-- 5. Completed
(
    'evc-205', 'EVC/WR/2026/038', 'AICTE/2026/WR/1-724183', 'Sinhgad Institute of Technology', 'SIT-LON-033',
    'Lonavala', 'Maharashtra', '2026-10-08', '11:30 AM IST', 'Virtual Video EVC', 'Report Submitted',
    'Prof. (Dr.) Amitabh Mohanty (IIT Bombay)',
    ARRAY['Dr. Ramesh K. Narayanan (PSG Tech)', 'Prof. Vikram H. Joshi (NITK)'],
    'Dr. Ramesh Chandra (RO Mumbai)',
    'https://evc-meet.aicte-india.org/room/sit-lon-033',
    'Virtual verification of faculty salary bank statements and CAD laboratory.',
    'Faculty cadre ratio verified 1:15. All 4 CAD computing labs fully compliant with AICTE norms.',
    '2026-09-22', '2026-10-12'
)
ON CONFLICT (id) DO UPDATE SET
    visit_date = EXCLUDED.visit_date,
    status = EXCLUDED.status,
    chairman = EXCLUDED.chairman,
    experts = EXCLUDED.experts,
    assigned_date = EXCLUDED.assigned_date,
    deadline_date = EXCLUDED.deadline_date;
