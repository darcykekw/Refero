-- ============================================================
-- Refero — post-migration check
--
-- Run in: Supabase Dashboard > SQL Editor, after 001, 002 and 004.
-- Read-only: this only reports, it never changes anything.
--
-- Expected: 1 bucket, 1 college, 5 programs, 3 functions,
-- 4 trigram indexes, 1 conditional trigger. See the notes below each block.
-- ============================================================

-- The storage bucket the app writes to. Must be exactly one row,
-- id 'thesis-pdfs', marked private - the app hands out signed URLs.
SELECT 'bucket' AS kind, id AS name,
       CASE WHEN public THEN 'PUBLIC - should be private!' ELSE 'private' END AS detail
  FROM storage.buckets

UNION ALL
-- Storage policies keyed to the bucket. Expect 4.
SELECT 'storage policy', policyname, cmd::text
  FROM pg_policies
 WHERE schemaname = 'storage' AND policyname LIKE 'thesis_pdfs%'

UNION ALL
-- Seeded reference data. Expect 1 college (College of Sciences) and 5 programs.
-- More than one college means 004 has not run, or it left one in place because
-- it still held content - run 004 again and read its report. A program count
-- above 5 means either the seed ran more than once before it became
-- conflict-safe, or 004 has not folded the Biology majors away yet.
SELECT 'seed', 'colleges', count(*)::text FROM public.colleges
UNION ALL
SELECT 'seed', 'programs', count(*)::text FROM public.programs

UNION ALL
-- SQL functions. Expect increment_thesis_views, theses_with_all_tags,
-- update_modified_column.
SELECT 'function', routine_name, ''
  FROM information_schema.routines
 WHERE routine_schema = 'public'

UNION ALL
-- Trigram search indexes from 002. Expect 4; idx_theses_fts should be gone.
SELECT 'index', indexname, ''
  FROM pg_indexes
 WHERE schemaname = 'public'
   AND (indexname LIKE '%trgm' OR indexname = 'idx_theses_fts')

UNION ALL
-- The date_modified trigger on theses. `detail` must be 'conditional' -
-- that WHEN clause is what stops page views counting as edits.
--
-- Read from pg_get_triggerdef rather than pg_trigger.tgqual: it reports the
-- actual DDL Postgres will show you, so a surprising answer here can be checked
-- by eye instead of taken on trust.
SELECT 'trigger', tgname,
       CASE WHEN pg_get_triggerdef(oid) LIKE '%WHEN %' THEN 'conditional'
            ELSE 'unconditional - re-run 002 section 4' END
  FROM pg_trigger
 WHERE tgrelid = 'public.theses'::regclass AND NOT tgisinternal

ORDER BY kind, name;
