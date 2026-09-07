-- ============================================================
-- Refero — Migration 005: Admin, Verification System & Audit Logs
-- Run this in: Supabase Dashboard > SQL Editor
--
-- Safe to run more than once.
-- ============================================================

-- -------------------------------------------------------
-- 1. THESES: STATUS & VERIFICATION FIELDS
-- -------------------------------------------------------
ALTER TABLE public.theses
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'verified',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS grade_sheet_file text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Future uploads start as 'pending'
ALTER TABLE public.theses ALTER COLUMN status SET DEFAULT 'pending';

-- Fast indexes for verification queue and filtering
CREATE INDEX IF NOT EXISTS idx_theses_status ON public.theses(status);
CREATE INDEX IF NOT EXISTS idx_theses_status_date ON public.theses(status, date_added DESC);

-- -------------------------------------------------------
-- 2. USER ROLES TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'student',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'user_roles_select_all'
  ) THEN
    CREATE POLICY user_roles_select_all ON public.user_roles FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- -------------------------------------------------------
-- 3. AUDIT LOGS TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'audit_logs_select_all'
  ) THEN
    CREATE POLICY audit_logs_select_all ON public.audit_logs FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'audit_logs_insert_all'
  ) THEN
    CREATE POLICY audit_logs_insert_all ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- -------------------------------------------------------
-- 4. SEED ADMIN ROLE
-- -------------------------------------------------------
DO $$
DECLARE
  admin_uuid uuid;
BEGIN
  SELECT id INTO admin_uuid FROM auth.users WHERE email = '202380256@psu.palawan.edu.ph' LIMIT 1;
  IF admin_uuid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_uuid, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin', updated_at = now();
  END IF;
END $$;
