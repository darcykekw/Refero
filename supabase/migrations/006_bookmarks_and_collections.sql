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
