-- ====================================================================
-- AICTE Workflow Automation — EVC Visit Workflow Migration
-- Adds lifecycle timestamp columns to the evc_visits table
-- ====================================================================

-- 1. Add timestamp tracking columns for EVC visit lifecycle milestones
ALTER TABLE evc_visits
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS report_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 2. Optional: Add comment documenting the lifecycle states
COMMENT ON COLUMN evc_visits.status IS 'Lifecycle: Scheduled -> In Progress -> Report Submitted -> Verified';
