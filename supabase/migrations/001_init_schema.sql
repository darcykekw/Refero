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
