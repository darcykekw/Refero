import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type {
  Collection,
  CollectionWithCount,
  BookmarkWithThesis,
  ThesisWithRelations,
  College,
  Program,
  Tag,
} from '@/types/database'

// ── Raw join row shape returned by Supabase for bookmarks ────────────────────

interface RawBookmarkThesisJoin {
  id: string
  user_id: string
  thesis_id: string
  collection_id: string
  created_at: string
  thesis: {
    id: string
    title: string
    abstract: string
    authors: string
    adviser: string | null
    year_submitted: number
    uploaded_by: string
    college_id: string
    program_id: string
    panel_score: number | null
    pdf_file: string
    view_count: number
    ss_paper_id: string | null
    status?: 'pending' | 'verified' | 'rejected'
    verified_at?: string | null
    verified_by?: string | null
    grade_sheet_file?: string
    rejection_reason?: string | null
    date_added: string
    date_modified: string
    college: College
    program: Program
    tags: { tag: Tag | null }[]
  } | null
}

function flattenBookmarkTags(row: RawBookmarkThesisJoin): BookmarkWithThesis | null {
  if (!row.thesis) return null
  const thesisWithRelations: ThesisWithRelations = {
    ...row.thesis,
    tags: (row.thesis.tags ?? []).map(t => t.tag).filter((tag): tag is Tag => tag != null),
  }
  return {
    id: row.id,
    user_id: row.user_id,
    thesis_id: row.thesis_id,
    collection_id: row.collection_id,
    created_at: row.created_at,
    thesis: thesisWithRelations,
  }
}

// ── Ensure default collection exists ─────────────────────────────────────────

export async function ensureDefaultCollection(userId: string): Promise<Collection | null> {
  const supabase = await createClient()

  // Check if user already has a default collection
  const { data: existingDefault } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle()

  if (existingDefault) {
    return existingDefault
  }

  // Check if user has any collection at all
  const { data: firstCol } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (firstCol) {
    return firstCol
  }

  // Create default "Favorites" collection
  const { data: created, error } = await supabase
    .from('collections')
    .insert({
      user_id: userId,
      name: 'Favorites',
      description: 'Your default collection of saved theses',
      color: '#2E6A47',
      is_default: true,
    })
    .select('*')
    .single()

  if (error) {
    console.error('Failed to create default collection:', error.message)
    return null
  }

  return created
}

// ── Get all user collections with thesis count ───────────────────────────────

export const getUserCollections = cache(async (userId: string): Promise<CollectionWithCount[]> => {
  const supabase = await createClient()

  // Ensure user has at least the default collection
  await ensureDefaultCollection(userId)

  const { data: collections, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getUserCollections error:', error.message)
    return []
  }

  if (!collections || collections.length === 0) {
    return []
  }

  // Fetch count of bookmarks per collection
  const { data: bookmarksCount, error: countError } = await supabase
    .from('bookmarks')
    .select('collection_id')
    .eq('user_id', userId)

  if (countError) {
    console.error('getUserCollections count error:', countError.message)
    return collections.map(col => ({ ...col, thesis_count: 0 }))
  }

  const counts: Record<string, number> = {}
  for (const b of bookmarksCount ?? []) {
    counts[b.collection_id] = (counts[b.collection_id] || 0) + 1
  }

  return collections.map(col => ({
    ...col,
    thesis_count: counts[col.id] || 0,
  }))
})

// ── Get bookmarked theses for user ───────────────────────────────────────────

export interface EnrichedBookmarkedThesis {
  thesis: ThesisWithRelations
  collection_ids: string[]
  bookmark_ids: string[]
  saved_at: string
}

export const getBookmarkedTheses = cache(async (
  userId: string,
  collectionId?: string
): Promise<{ items: EnrichedBookmarkedThesis[]; totalCount: number }> => {
  const supabase = await createClient()

  let query = supabase
    .from('bookmarks')
    .select(`
      id,
      user_id,
      thesis_id,
      collection_id,
      created_at,
      thesis:theses (
        *,
        college:colleges (*),
        program:programs (*),
        tags:thesis_tags (tag:tags (*))
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (collectionId) {
    query = query.eq('collection_id', collectionId)
  }

  const { data, error } = await query

  if (error) {
    console.error('getBookmarkedTheses error:', error.message)
    return { items: [], totalCount: 0 }
  }

  const rawRows = (data as unknown as RawBookmarkThesisJoin[]) ?? []

  // Group by thesis_id so each unique thesis has an aggregated list of collection_ids
  const map = new Map<string, EnrichedBookmarkedThesis>()

  for (const row of rawRows) {
    const flattened = flattenBookmarkTags(row)
    if (!flattened || !flattened.thesis) continue

    const thesisId = flattened.thesis_id
    const existing = map.get(thesisId)

    if (existing) {
      if (!existing.collection_ids.includes(row.collection_id)) {
        existing.collection_ids.push(row.collection_id)
        existing.bookmark_ids.push(row.id)
      }
    } else {
      map.set(thesisId, {
        thesis: flattened.thesis,
        collection_ids: [row.collection_id],
        bookmark_ids: [row.id],
        saved_at: row.created_at,
      })
    }
  }

  const items = Array.from(map.values())
  return { items, totalCount: items.length }
})

// ── Get map of thesis_id -> collection_id[] for current user ─────────────────

export const getUserBookmarkMap = cache(async (userId: string): Promise<Record<string, string[]>> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bookmarks')
    .select('thesis_id, collection_id')
    .eq('user_id', userId)

  if (error || !data) {
    return {}
  }

  const map: Record<string, string[]> = {}
  for (const b of data) {
    if (!map[b.thesis_id]) {
      map[b.thesis_id] = []
    }
    map[b.thesis_id].push(b.collection_id)
  }

  return map
})
