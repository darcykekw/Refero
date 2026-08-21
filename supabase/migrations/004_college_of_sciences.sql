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
