-- ============================================================
-- Refero — Initial Database Schema
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- -------------------------------------------------------
-- COLLEGES
-- -------------------------------------------------------
CREATE TABLE public.colleges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_name  text NOT NULL,
  date_added    timestamptz NOT NULL DEFAULT now(),
  date_modified timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------
-- PROGRAMS
-- -------------------------------------------------------
CREATE TABLE public.programs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prog_name     text NOT NULL,
  college_id    uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  logo          text NOT NULL DEFAULT '',
  date_added    timestamptz NOT NULL DEFAULT now(),
  date_modified timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------
-- TAGS
-- -------------------------------------------------------
CREATE TABLE public.tags (
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
CREATE TABLE public.theses (
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
CREATE TABLE public.thesis_tags (
  thesis_id uuid NOT NULL REFERENCES public.theses(id) ON DELETE CASCADE,
  tag_id    uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (thesis_id, tag_id)
);

-- -------------------------------------------------------
-- INDEXES
-- -------------------------------------------------------
CREATE INDEX idx_theses_uploaded_by ON public.theses(uploaded_by);
CREATE INDEX idx_theses_college_id  ON public.theses(college_id);
CREATE INDEX idx_theses_program_id  ON public.theses(program_id);
CREATE INDEX idx_theses_date_added  ON public.theses(date_added DESC);
CREATE INDEX idx_theses_ss_paper_id ON public.theses(ss_paper_id) WHERE ss_paper_id IS NOT NULL;
CREATE INDEX idx_programs_college_id ON public.programs(college_id);
CREATE INDEX idx_thesis_tags_tag_id  ON public.thesis_tags(tag_id);

-- Full-text search index on theses
CREATE INDEX idx_theses_fts ON public.theses
  USING gin(to_tsvector('english', title || ' ' || authors || ' ' || abstract));

-- -------------------------------------------------------
-- AUTO date_modified TRIGGER
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.date_modified = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_colleges_modtime
  BEFORE UPDATE ON public.colleges
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER trg_programs_modtime
  BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER trg_tags_modtime
  BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER trg_theses_modtime
  BEFORE UPDATE ON public.theses
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- -------------------------------------------------------
-- ROW-LEVEL SECURITY (RLS)
-- -------------------------------------------------------
ALTER TABLE public.colleges    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thesis_tags ENABLE ROW LEVEL SECURITY;

-- Colleges & Programs & Tags: read-only for all authenticated users
CREATE POLICY "auth_read_colleges"  ON public.colleges    FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_programs"  ON public.programs    FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_tags"      ON public.tags        FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_tags"    ON public.tags        FOR INSERT TO authenticated WITH CHECK (true);

-- Theses: read for all authenticated, write only for owner
CREATE POLICY "auth_read_theses"    ON public.theses      FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_theses"  ON public.theses      FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "auth_update_theses"  ON public.theses      FOR UPDATE TO authenticated
  USING (auth.uid() = uploaded_by);
CREATE POLICY "auth_delete_theses"  ON public.theses      FOR DELETE TO authenticated
  USING (auth.uid() = uploaded_by);

-- Thesis tags: read for all, insert/delete only for thesis owner
CREATE POLICY "auth_read_thesis_tags"   ON public.thesis_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_thesis_tags" ON public.thesis_tags FOR INSERT TO authenticated
  WITH CHECK (thesis_id IN (SELECT id FROM public.theses WHERE uploaded_by = auth.uid()));
CREATE POLICY "auth_delete_thesis_tags" ON public.thesis_tags FOR DELETE TO authenticated
  USING (thesis_id IN (SELECT id FROM public.theses WHERE uploaded_by = auth.uid()));

-- -------------------------------------------------------
-- SUPABASE STORAGE BUCKET
-- Run separately in Storage > New Bucket, or via SQL:
-- -------------------------------------------------------
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('theses-pdf', 'theses-pdf', false);
--
-- CREATE POLICY "Authenticated upload"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'theses-pdf');
--
-- CREATE POLICY "Owner can update/delete"
--   ON storage.objects FOR DELETE TO authenticated
--   USING (bucket_id = 'theses-pdf' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Authenticated download"
--   ON storage.objects FOR SELECT TO authenticated
--   USING (bucket_id = 'theses-pdf');

-- -------------------------------------------------------
-- SEED: Colleges & Programs (mirrors legacy Django fixtures)
-- -------------------------------------------------------
DO $$
DECLARE
  cas_id uuid; ccs_id uuid; cba_id uuid; coe_id uuid;
BEGIN
  INSERT INTO public.colleges (college_name) VALUES
    ('College of Arts and Sciences'),
    ('College of Computer Studies'),
    ('College of Business Administration'),
    ('College of Engineering')
  RETURNING id INTO cas_id;

  -- Re-fetch IDs by name for clarity
  SELECT id INTO cas_id FROM public.colleges WHERE college_name = 'College of Arts and Sciences';
  SELECT id INTO ccs_id FROM public.colleges WHERE college_name = 'College of Computer Studies';
  SELECT id INTO cba_id FROM public.colleges WHERE college_name = 'College of Business Administration';
  SELECT id INTO coe_id FROM public.colleges WHERE college_name = 'College of Engineering';

  INSERT INTO public.programs (prog_name, college_id, logo) VALUES
    ('BS Computer Science',      ccs_id, 'ACS-LOGO.png'),
    ('BS Information Technology', ccs_id, 'SITE-LOGO.jpg'),
    ('BS Marine Biology',        cas_id, 'MBS-LOGO.jpg'),
    ('BS Medical Biology',       cas_id, 'YBA-LOGO.jpg'),
    ('BS Environmental Science', cas_id, 'ESSA-LOGO.jpg');
END $$;
