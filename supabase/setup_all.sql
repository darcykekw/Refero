-- ============================================================
-- Refero — Consolidated Database Setup Script
-- Run this in your Supabase Dashboard > SQL Editor
-- This sets up all tables, functions, RLS policies, and College of Sciences data.
-- ============================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 001_init_schema.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ============================================================
-- Refero — Initial Database Schema
-- Run this in: Supabase Dashboard > SQL Editor
--
-- Run this BEFORE 002_fixes.sql. Safe to run more than once: every statement
-- is guarded and the seed block conflicts away, so a second run changes
-- nothing.
-- ============================================================

-- -------------------------------------------------------
-- COLLEGES
--
-- college_name is UNIQUE because the seed block at the bottom looks colleges
-- up by name, and so does anything importing legacy fixtures.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.colleges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_name  text NOT NULL UNIQUE,
  date_added    timestamptz NOT NULL DEFAULT now(),
  date_modified timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------
-- PROGRAMS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.programs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prog_name     text NOT NULL,
  college_id    uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  logo          text NOT NULL DEFAULT '',
  date_added    timestamptz NOT NULL DEFAULT now(),
  date_modified timestamptz NOT NULL DEFAULT now(),
  UNIQUE (college_id, prog_name)
);

-- -------------------------------------------------------
-- TAGS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tags (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  date_added    timestamptz NOT NULL DEFAULT now(),
  date_modified timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------
-- THESES
-- Notes:
--   - uploaded_by references auth.users (Supabase managed)
--   - pdf_file stores the Supabase Storage object path
--   - ss_paper_id is the Semantic Scholar paper identifier
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.theses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  abstract       text NOT NULL,
  authors        text NOT NULL,             -- comma-separated, mirrors legacy
  adviser        text,
  year_submitted integer NOT NULL,
  uploaded_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  college_id     uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  program_id     uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  panel_score    float,
  pdf_file       text NOT NULL DEFAULT '',  -- Supabase Storage path
  view_count     integer NOT NULL DEFAULT 0,
  ss_paper_id    text UNIQUE,               -- Semantic Scholar paper ID
  date_added     timestamptz NOT NULL DEFAULT now(),
  date_modified  timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------
-- THESIS ↔ TAG  (M2M junction)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.thesis_tags (
  thesis_id uuid NOT NULL REFERENCES public.theses(id) ON DELETE CASCADE,
  tag_id    uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (thesis_id, tag_id)
);

-- -------------------------------------------------------
-- INDEXES
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_theses_uploaded_by ON public.theses(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_theses_college_id  ON public.theses(college_id);
CREATE INDEX IF NOT EXISTS idx_theses_program_id  ON public.theses(program_id);
CREATE INDEX IF NOT EXISTS idx_theses_date_added  ON public.theses(date_added DESC);
CREATE INDEX IF NOT EXISTS idx_theses_ss_paper_id ON public.theses(ss_paper_id) WHERE ss_paper_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_programs_college_id ON public.programs(college_id);
CREATE INDEX IF NOT EXISTS idx_thesis_tags_tag_id  ON public.thesis_tags(tag_id);

-- No full-text index here. An earlier version of this file built a GIN index over
-- to_tsvector(title || authors || abstract), but no query ever went through
-- to_tsvector — search runs `ilike '%term%'`, which that index cannot serve. 002
-- drops it and creates trigram indexes that can. Creating it here would mean a
-- fresh install builds an index only to drop it moments later, and re-running
-- this file after 002 would bring it back.

-- -------------------------------------------------------
-- AUTO date_modified TRIGGER
--
-- trg_theses_modtime carries a WHEN clause: incrementing view_count is an
-- UPDATE, so without it every page view would bump date_modified and the column
-- would mean "last viewed" rather than "last edited".
--
-- This is the same definition 002 section 4 installs, and it is duplicated here
-- deliberately. An earlier version of this file created the trigger
-- unconditionally, which meant re-running 001 after 002 silently reverted the
-- fix. Keeping both files on one definition makes the two orders equivalent.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.date_modified = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_colleges_modtime ON public.colleges;
CREATE TRIGGER trg_colleges_modtime
  BEFORE UPDATE ON public.colleges
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS trg_programs_modtime ON public.programs;
CREATE TRIGGER trg_programs_modtime
  BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS trg_tags_modtime ON public.tags;
CREATE TRIGGER trg_tags_modtime
  BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS trg_theses_modtime ON public.theses;
CREATE TRIGGER trg_theses_modtime
  BEFORE UPDATE ON public.theses
  FOR EACH ROW
  WHEN (OLD.view_count IS NOT DISTINCT FROM NEW.view_count)
  EXECUTE PROCEDURE update_modified_column();

-- -------------------------------------------------------
-- ROW-LEVEL SECURITY (RLS)
-- -------------------------------------------------------
ALTER TABLE public.colleges    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thesis_tags ENABLE ROW LEVEL SECURITY;

-- Colleges & Programs & Tags: read-only for all authenticated users
DROP POLICY IF EXISTS "auth_read_colleges" ON public.colleges;
CREATE POLICY "auth_read_colleges"  ON public.colleges    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_read_programs" ON public.programs;
CREATE POLICY "auth_read_programs"  ON public.programs    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_read_tags" ON public.tags;
CREATE POLICY "auth_read_tags"      ON public.tags        FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_tags" ON public.tags;
CREATE POLICY "auth_insert_tags"    ON public.tags        FOR INSERT TO authenticated WITH CHECK (true);

-- Theses: read for all authenticated, write only for owner
DROP POLICY IF EXISTS "auth_read_theses" ON public.theses;
CREATE POLICY "auth_read_theses"    ON public.theses      FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_theses" ON public.theses;
CREATE POLICY "auth_insert_theses"  ON public.theses      FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "auth_update_theses" ON public.theses;
CREATE POLICY "auth_update_theses"  ON public.theses      FOR UPDATE TO authenticated
  USING (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "auth_delete_theses" ON public.theses;
CREATE POLICY "auth_delete_theses"  ON public.theses      FOR DELETE TO authenticated
  USING (auth.uid() = uploaded_by);

-- Thesis tags: read for all, insert/delete only for thesis owner
DROP POLICY IF EXISTS "auth_read_thesis_tags" ON public.thesis_tags;
CREATE POLICY "auth_read_thesis_tags"   ON public.thesis_tags FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_thesis_tags" ON public.thesis_tags;
CREATE POLICY "auth_insert_thesis_tags" ON public.thesis_tags FOR INSERT TO authenticated
  WITH CHECK (thesis_id IN (SELECT id FROM public.theses WHERE uploaded_by = auth.uid()));

DROP POLICY IF EXISTS "auth_delete_thesis_tags" ON public.thesis_tags;
CREATE POLICY "auth_delete_thesis_tags" ON public.thesis_tags FOR DELETE TO authenticated
  USING (thesis_id IN (SELECT id FROM public.theses WHERE uploaded_by = auth.uid()));

-- -------------------------------------------------------
-- SUPABASE STORAGE BUCKET
--
-- Created in 002_fixes.sql, along with its RLS policies.
-- The draft that used to sit here named the bucket 'theses-pdf', which never
-- matched the 'thesis-pdfs' the application code uses. 002 creates the bucket
-- under the name the code expects; see src/lib/storage.ts.
-- -------------------------------------------------------

-- -------------------------------------------------------
-- SEED: College & Programs
--
-- Refero covers the College of Sciences, and only that college. The legacy
-- Django app split these programs across "College of Arts and Sciences" and
-- "College of Computer Studies" and also carried Business Administration and
-- Engineering, neither of which ever had a single program — and program_id is
-- NOT NULL, so a college with no programs is a dead end for the uploader.
-- 003 and 004 reconcile databases that ran the earlier version of this file.
--
-- Medical Biology and Preparatory Medicine are majors under Bachelor of Science
-- in Biology rather than degrees of their own, so they are not program rows.
-- That leaves five programs and exactly five logo files in public/images.
--
-- ON CONFLICT DO NOTHING on both inserts, so re-running this file does not
-- duplicate the reference data. The programs insert reads the college id back by
-- name, which is why college_name carries a UNIQUE constraint above.
-- -------------------------------------------------------
INSERT INTO public.colleges (college_name) VALUES
  ('College of Sciences')
ON CONFLICT (college_name) DO NOTHING;

-- The logo filenames must match public/images exactly. ProgramCarousel renders
-- /images/<logo> straight from this column, so a wrong extension is a 404 with
-- nothing in the build output to warn you.
INSERT INTO public.programs (prog_name, college_id, logo)
SELECT p.prog_name, c.id, p.logo
  FROM (VALUES
        ('Bachelor of Science in Biology',                'YBA-LOGO.png'),
        ('Bachelor of Science in Marine Biology',         'MBS-LOGO.png'),
        ('Bachelor of Science in Computer Science',       'ACS-LOGO.png'),
        ('Bachelor of Science in Environmental Science',  'ESSA-LOGO.png'),
        ('Bachelor of Science in Information Technology', 'SITE-LOGO.png')
       ) AS p(prog_name, logo)
 CROSS JOIN public.colleges c
 WHERE c.college_name = 'College of Sciences'
ON CONFLICT (college_id, prog_name) DO NOTHING;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 002_fixes.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ============================================================
-- Refero — Migration 002: correctness and performance fixes
-- Run this in: Supabase Dashboard > SQL Editor
--
-- Safe to run more than once. Every statement is guarded, so re-running
-- makes no further changes.
-- ============================================================


-- -------------------------------------------------------
-- 1. ATOMIC VIEW COUNTER
--
-- The app used to read view_count, add one, and write it back. Two people
-- opening the same thesis at the same time both read the same number and both
-- write the same result, so one of the views is lost. Doing the arithmetic in
-- SQL makes the increment a single atomic statement.
--
-- SECURITY DEFINER because the RLS policy on theses only lets the uploader
-- UPDATE their own rows, while any signed-in reader needs to bump the counter.
-- The function body is fixed, so this grants exactly one narrow capability.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_thesis_views(thesis_uuid uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.theses
     SET view_count = view_count + 1
   WHERE id = thesis_uuid
  RETURNING view_count;
$$;

REVOKE ALL ON FUNCTION public.increment_thesis_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_thesis_views(uuid) TO authenticated;


-- -------------------------------------------------------
-- 2. TAG INTERSECTION
--
-- Finding theses that carry ALL selected tags was done by fetching every
-- junction row for those tags and intersecting them in JavaScript. This does it
-- in the database and returns only the matching IDs.
--
-- No SECURITY DEFINER: it runs as the caller, so RLS still applies.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.theses_with_all_tags(tag_ids uuid[])
RETURNS TABLE (thesis_id uuid)
LANGUAGE sql
STABLE
AS $$
  SELECT tt.thesis_id
    FROM public.thesis_tags tt
   WHERE tt.tag_id = ANY(tag_ids)
   GROUP BY tt.thesis_id
  HAVING count(DISTINCT tt.tag_id) = cardinality(tag_ids);
$$;

REVOKE ALL ON FUNCTION public.theses_with_all_tags(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.theses_with_all_tags(uuid[]) TO authenticated;


-- -------------------------------------------------------
-- 3. SEARCH INDEXES
--
-- Search uses `ilike '%term%'`, which a plain B-tree index cannot serve.
-- Trigram GIN indexes can, so these make substring search use an index
-- instead of scanning every row.
--
-- The old idx_theses_fts index is dropped: it indexed
-- to_tsvector(title || authors || abstract), and no query ever used
-- to_tsvector, so it only cost write throughput.
-- -------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP INDEX IF EXISTS public.idx_theses_fts;

CREATE INDEX IF NOT EXISTS idx_theses_title_trgm
  ON public.theses USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_theses_authors_trgm
  ON public.theses USING gin (authors gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_theses_abstract_trgm
  ON public.theses USING gin (abstract gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tags_name_trgm
  ON public.tags USING gin (name gin_trgm_ops);

-- Covers the thesis_id side of the tag intersection above.
CREATE INDEX IF NOT EXISTS idx_thesis_tags_thesis_id
  ON public.thesis_tags(thesis_id);


-- -------------------------------------------------------
-- 4. date_modified NO LONGER TRACKS PAGE VIEWS
--
-- Every visit bumped date_modified, because incrementing view_count is an
-- UPDATE and the trigger fired unconditionally. The WHEN clause skips the
-- trigger for updates that change view_count — which only the view counter
-- does — so date_modified once again means "when the thesis was last edited".
-- -------------------------------------------------------
DROP TRIGGER IF EXISTS trg_theses_modtime ON public.theses;

CREATE TRIGGER trg_theses_modtime
  BEFORE UPDATE ON public.theses
  FOR EACH ROW
  WHEN (OLD.view_count IS NOT DISTINCT FROM NEW.view_count)
  EXECUTE PROCEDURE public.update_modified_column();


-- -------------------------------------------------------
-- 5. STORAGE BUCKET
--
-- Migration 001 left this commented out and named the bucket 'theses-pdf',
-- while every code path uses 'thesis-pdfs'. The code name wins — it is now the
-- single constant THESIS_PDF_BUCKET in src/lib/storage.ts.
--
-- The bucket stays private; the app hands out short-lived signed URLs.
-- -------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('thesis-pdfs', 'thesis-pdfs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "thesis_pdfs_authenticated_read"   ON storage.objects;
DROP POLICY IF EXISTS "thesis_pdfs_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "thesis_pdfs_owner_update"         ON storage.objects;
DROP POLICY IF EXISTS "thesis_pdfs_owner_delete"         ON storage.objects;

-- Any signed-in user may read a thesis PDF.
CREATE POLICY "thesis_pdfs_authenticated_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'thesis-pdfs');

-- Uploads must land in a folder named after the uploader's own user id,
-- matching the `${userId}/${timestamp}.pdf` path the app writes.
CREATE POLICY "thesis_pdfs_authenticated_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'thesis-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "thesis_pdfs_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'thesis-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "thesis_pdfs_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'thesis-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 003_scope_colleges.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ============================================================
-- Refero — Migration 003: drop the colleges outside project scope
-- Run this in: Supabase Dashboard > SQL Editor, after 001 and 002.
--
-- Refero covers the science colleges. College of Business Administration and
-- College of Engineering were seeded by 001 but never had a single program, in
-- this app or in the legacy Django one. Because theses.program_id is NOT NULL,
-- selecting either college in the upload form produced an empty program
-- dropdown and a form that could not be submitted.
--
-- 001 no longer seeds them. This removes them from databases that already ran
-- the earlier version.
--
-- Safe to run more than once: the second run finds nothing to delete.
-- ============================================================


-- -------------------------------------------------------
-- 1. REFUSE TO DESTROY DATA
--
-- colleges is the parent of both programs and theses with ON DELETE CASCADE,
-- so a plain DELETE here would take any thesis filed under these colleges with
-- it, silently. The NOT EXISTS guards make that impossible: a college holding
-- either is left in place, and section 3 reports it so it is not missed.
-- -------------------------------------------------------
DELETE FROM public.colleges c
 WHERE c.college_name IN (
         'College of Business Administration',
         'College of Engineering'
       )
   AND NOT EXISTS (SELECT 1 FROM public.theses   t WHERE t.college_id = c.id)
   AND NOT EXISTS (SELECT 1 FROM public.programs p WHERE p.college_id = c.id);


-- -------------------------------------------------------
-- 2. REPORT
--
-- Expect two rows — Arts and Sciences with 3 programs, Computer Studies with 2.
--
-- Any out-of-scope college still listed here was kept on purpose: it holds a
-- thesis or a program. Move that content to another college first, then re-run
-- this file.
-- -------------------------------------------------------
SELECT c.college_name,
       count(p.id)                        AS programs,
       (SELECT count(*) FROM public.theses t WHERE t.college_id = c.id) AS theses
  FROM public.colleges c
  LEFT JOIN public.programs p ON p.college_id = c.id
 GROUP BY c.id, c.college_name
 ORDER BY c.college_name;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 004_college_of_sciences.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ============================================================
-- Refero — Migration 004: one college, five programs
-- Run this in: Supabase Dashboard > SQL Editor, after 001 and 002.
--
-- Refero covers the College of Sciences and nothing else. Earlier versions of
-- 001 seeded the legacy Django app's split - "College of Arts and Sciences" and
-- "College of Computer Studies", plus Business Administration and Engineering,
-- which never had any programs at all.
--
-- This consolidates all of it onto a single "College of Sciences", renames the
-- programs to their full degree titles, and folds Medical Biology and
-- Preparatory Medicine into Bachelor of Science in Biology - they are majors
-- under that degree, not degrees of their own. It supersedes 003; running 004
-- alone reaches the same end state, so 003 is only kept because it may already
-- have been applied.
--
-- Safe to run more than once, and safe to run against a database that ran an
-- earlier version of this same file: every rename and fold matches the old
-- names as well as the current ones, so any intermediate state converges here.
-- ============================================================


-- -------------------------------------------------------
-- 0. CONSTRAINTS THE REST OF THIS FILE RELIES ON
--
-- Every ON CONFLICT below names a unique constraint. If a database was built by
-- a version of 001 that predates them, those statements fail with a bare
-- "no unique or exclusion constraint matching the ON CONFLICT specification",
-- which says nothing about how to fix it. Adding them here makes 004 stand on
-- its own. Postgres has no ADD CONSTRAINT IF NOT EXISTS, hence the DO block.
-- -------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.colleges'::regclass AND contype = 'u'
       AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
                            WHERE attrelid = 'public.colleges'::regclass
                              AND attname = 'college_name')]
  ) THEN
    ALTER TABLE public.colleges ADD CONSTRAINT colleges_college_name_key UNIQUE (college_name);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.programs'::regclass AND contype = 'u'
       AND conkey @> ARRAY[(SELECT attnum FROM pg_attribute
                             WHERE attrelid = 'public.programs'::regclass
                               AND attname = 'prog_name')]
  ) THEN
    ALTER TABLE public.programs ADD CONSTRAINT programs_college_id_prog_name_key UNIQUE (college_id, prog_name);
  END IF;
END
$$;


-- -------------------------------------------------------
-- 1. THE COLLEGE
-- -------------------------------------------------------
INSERT INTO public.colleges (college_name) VALUES ('College of Sciences')
ON CONFLICT (college_name) DO NOTHING;


-- -------------------------------------------------------
-- 2. MOVE EVERYTHING ONTO IT - BEFORE ANY DELETE
--
-- Order is the safety mechanism here, not decoration. colleges is the parent of
-- both programs and theses with ON DELETE CASCADE, so deleting a college first
-- would silently destroy whatever hung off it. Re-pointing the children first
-- leaves the old colleges empty, which is the only state section 5 will delete.
-- -------------------------------------------------------
UPDATE public.programs
   SET college_id = (SELECT id FROM public.colleges WHERE college_name = 'College of Sciences')
 WHERE college_id <> (SELECT id FROM public.colleges WHERE college_name = 'College of Sciences');

UPDATE public.theses
   SET college_id = (SELECT id FROM public.colleges WHERE college_name = 'College of Sciences')
 WHERE college_id <> (SELECT id FROM public.colleges WHERE college_name = 'College of Sciences');


-- -------------------------------------------------------
-- 3. PROGRAM NAMES
--
-- Renames run before the insert below, so a program that already exists under
-- its old short name is updated in place rather than duplicated. Renaming keeps
-- the row's id, so any thesis already filed against it stays attached.
--
-- Biology is absent from this list on purpose - it is handled by the fold in
-- section 4, because its retired names have to merge into an existing row
-- rather than become one.
-- -------------------------------------------------------
UPDATE public.programs SET prog_name = 'Bachelor of Science in Computer Science'       WHERE prog_name = 'BS Computer Science';
UPDATE public.programs SET prog_name = 'Bachelor of Science in Information Technology' WHERE prog_name = 'BS Information Technology';
UPDATE public.programs SET prog_name = 'Bachelor of Science in Marine Biology'         WHERE prog_name = 'BS Marine Biology';
UPDATE public.programs SET prog_name = 'Bachelor of Science in Environmental Science'  WHERE prog_name = 'BS Environmental Science';

-- The five canonical programs. DO UPDATE rather than DO NOTHING so the logo
-- mapping is enforced on every run: a database seeded before Medical Biology was
-- folded away has Bachelor of Science in Biology sitting there with no logo, and
-- YBA-LOGO.png - the biology students' association logo, previously hung on
-- Medical Biology - is the one that belongs to it.
--
-- These filenames must match public/images exactly. ProgramCarousel renders
-- /images/<logo> straight from this column, so a wrong extension is a 404 with
-- nothing in the build output to warn you.
INSERT INTO public.programs (prog_name, college_id, logo)
SELECT p.prog_name, c.id, p.logo
  FROM (VALUES
        ('Bachelor of Science in Biology',                'YBA-LOGO.png'),
        ('Bachelor of Science in Marine Biology',         'MBS-LOGO.png'),
        ('Bachelor of Science in Computer Science',       'ACS-LOGO.png'),
        ('Bachelor of Science in Environmental Science',  'ESSA-LOGO.png'),
        ('Bachelor of Science in Information Technology', 'SITE-LOGO.png')
       ) AS p(prog_name, logo)
 CROSS JOIN public.colleges c
 WHERE c.college_name = 'College of Sciences'
ON CONFLICT (college_id, prog_name) DO UPDATE SET logo = EXCLUDED.logo;


-- -------------------------------------------------------
-- 4. FOLD THE BIOLOGY MAJORS INTO THE BIOLOGY DEGREE
--
-- Medical Biology and Preparatory Medicine are majors under Bachelor of Science
-- in Biology, so they stop being programs of their own. Every name they have
-- ever carried is listed: 'BS Medical Biology' from the legacy Django seed,
-- plus the two intermediate titles earlier versions of this file renamed it to.
--
-- theses.program_id is ON DELETE CASCADE, so dropping these rows outright would
-- take their theses with them. Re-point first, delete second - and the delete
-- still carries a NOT EXISTS guard, so it cannot cascade even if the re-point
-- somehow missed a row.
-- -------------------------------------------------------
UPDATE public.theses t
   SET program_id = (SELECT p.id FROM public.programs p
                      WHERE p.prog_name = 'Bachelor of Science in Biology')
 WHERE t.program_id IN (
         SELECT p.id FROM public.programs p
          WHERE p.prog_name IN ('BS Medical Biology',
                                'Medical Biology',
                                'Bachelor of Science in Medical Biology',
                                'Preparatory Medicine')
       );

DELETE FROM public.programs p
 WHERE p.prog_name IN ('BS Medical Biology',
                       'Medical Biology',
                       'Bachelor of Science in Medical Biology',
                       'Preparatory Medicine')
   AND NOT EXISTS (SELECT 1 FROM public.theses t WHERE t.program_id = p.id);


-- -------------------------------------------------------
-- 5. REMOVE EVERY OTHER COLLEGE
--
-- The NOT EXISTS guards make this unable to destroy content: a college still
-- holding a program or a thesis is left in place and shows up in the report
-- below, rather than cascading away.
-- -------------------------------------------------------
DELETE FROM public.colleges c
 WHERE c.college_name <> 'College of Sciences'
   AND NOT EXISTS (SELECT 1 FROM public.theses   t WHERE t.college_id = c.id)
   AND NOT EXISTS (SELECT 1 FROM public.programs p WHERE p.college_id = c.id);


-- -------------------------------------------------------
-- 6. REPORT
--
-- Expect exactly one row: College of Sciences, 5 programs.
--
-- A second row means that college still holds content section 2 did not move -
-- move it by hand, then re-run this file. A program count above 5 means a folded
-- program was kept because a thesis still pointed at it - re-point it by hand.
-- -------------------------------------------------------
SELECT c.college_name,
       count(p.id) AS programs,
       (SELECT count(*) FROM public.theses t WHERE t.college_id = c.id) AS theses
  FROM public.colleges c
  LEFT JOIN public.programs p ON p.college_id = c.id
 GROUP BY c.id, c.college_name
 ORDER BY c.college_name;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 005_admin_verification_audit.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 006_bookmarks_and_collections.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ============================================================
-- Refero — Migration 006: Bookmarks & Collections System
-- Run this in: Supabase Dashboard > SQL Editor
--
-- Safe to run more than once.
-- ============================================================

-- -------------------------------------------------------
-- 1. COLLECTIONS TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#2E6A47',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------
-- 2. BOOKMARKS TABLE (Collection Items)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thesis_id uuid NOT NULL REFERENCES public.theses(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, thesis_id)
);

-- -------------------------------------------------------
-- 3. INDEXES
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_collections_user ON public.collections(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_collection ON public.bookmarks(collection_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_thesis ON public.bookmarks(thesis_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_thesis ON public.bookmarks(user_id, thesis_id);

-- -------------------------------------------------------
-- 4. ROW-LEVEL SECURITY (RLS)
-- -------------------------------------------------------
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Policies for collections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'collections' AND policyname = 'collections_select_own'
  ) THEN
    CREATE POLICY collections_select_own ON public.collections
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'collections' AND policyname = 'collections_insert_own'
  ) THEN
    CREATE POLICY collections_insert_own ON public.collections
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'collections' AND policyname = 'collections_update_own'
  ) THEN
    CREATE POLICY collections_update_own ON public.collections
      FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'collections' AND policyname = 'collections_delete_own'
  ) THEN
    CREATE POLICY collections_delete_own ON public.collections
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policies for bookmarks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bookmarks' AND policyname = 'bookmarks_select_own'
  ) THEN
    CREATE POLICY bookmarks_select_own ON public.bookmarks
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bookmarks' AND policyname = 'bookmarks_insert_own'
  ) THEN
    CREATE POLICY bookmarks_insert_own ON public.bookmarks
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bookmarks' AND policyname = 'bookmarks_delete_own'
  ) THEN
    CREATE POLICY bookmarks_delete_own ON public.bookmarks
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

