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
