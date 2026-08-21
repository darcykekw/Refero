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
