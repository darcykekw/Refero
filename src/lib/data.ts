/**
 * Shared Supabase data-access helpers — all run on the server.
 * Import into Server Components and Server Actions.
 *
 * Read helpers are wrapped in React's `cache()`, which memoises per request.
 * Two components in the same render that ask for the same thesis share one
 * query instead of issuing two.
 */
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { College, Program, Tag, Thesis, ThesisWithRelations } from '@/types/database'

// ── UUID validation helper ───────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUUID(id?: string | null): id is string {
  return typeof id === 'string' && UUID_REGEX.test(id.trim())
}

// ── Query clock skew retry helper ───────────────────────────────────────────

/**
 * Handles transient clock skew (e.g. "JWT issued at future") by retrying after
 * a brief delay if local client time is slightly ahead of Supabase server time.
 */
async function runWithRetry<T>(fn: () => PromiseLike<T>): Promise<T> {
  let result = await fn()
  const err = (result as { error?: { message?: string } | null })?.error
  if (err && typeof err.message === 'string' && (err.message.includes('JWT issued at future') || err.message.includes('future'))) {
    await new Promise(resolve => setTimeout(resolve, 2500))
    result = await fn()
  }
  return result
}

// ── PostgREST filter escaping ────────────────────────────────────────────────

/**
 * Quotes a user-supplied value for use inside a PostgREST filter string.
 *
 * `or()` takes filters as one comma-separated string, so an unescaped comma,
 * dot or parenthesis in a search box lets the visitor append their own
 * conditions to the query. Wrapping the value in double quotes makes PostgREST
 * treat all of it as data; inside the quotes only `"` and `\` need escaping.
 *
 * `%` and `_` stay as-is — they are LIKE wildcards, so a visitor can broaden
 * their own search but cannot change which columns are matched.
 */
function pgFilterValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

// ── Site stats ───────────────────────────────────────────────────────────────

export interface SiteStats {
  thesis_count: number
  college_count: number
  program_count: number
  tag_count: number
}

export const getSiteStats = cache(async (): Promise<SiteStats> => {
  const supabase = await createClient()
  const [theses, colleges, programs, tags] = await Promise.all([
    supabase.from('theses').select('id', { count: 'exact', head: true }),
    supabase.from('colleges').select('id', { count: 'exact', head: true }),
    supabase.from('programs').select('id', { count: 'exact', head: true }),
    supabase.from('tags').select('id', { count: 'exact', head: true }),
  ])
  return {
    thesis_count:  theses.count  ?? 0,
    college_count: colleges.count ?? 0,
    program_count: programs.count ?? 0,
    tag_count:     tags.count    ?? 0,
  }
})

// ── Raw join row shape returned by Supabase ──────────────────────────────────

/**
 * What Supabase returns for the thesis + tags join.
 *
 * The junction table means tags arrive one level deeper than callers want —
 * `[{ tag: {...} }]` rather than `[{...}]` — so `flattenTags` unwraps them.
 */
interface ThesisJoinRow extends Thesis {
  college: College
  program: Program
  tags: { tag: Tag | null }[]
}

function flattenTags(rows: ThesisJoinRow[]): ThesisWithRelations[] {
  return rows.map(row => ({
    ...row,
    tags: row.tags.map(t => t.tag).filter((tag): tag is Tag => tag != null),
  }))
}

// ── Featured theses (home page) ───────────────────────────────────────────────

export const getFeaturedTheses = cache(async (programId?: string): Promise<ThesisWithRelations[]> => {
  // If an invalid programId format is provided, return empty without querying DB
  if (programId && !isValidUUID(programId)) {
    return []
  }

  const supabase = await createClient()

  let query = supabase
    .from('theses')
    .select(`*, college:colleges(*), program:programs(*), tags:thesis_tags(tag:tags(*))`)
    .order('date_added', { ascending: false })
    .limit(6)

  if (programId && isValidUUID(programId)) {
    query = query.eq('program_id', programId)
  }

  const { data, error } = await runWithRetry(() => query)
  if (error) {
    console.error('getFeaturedTheses error:', error.message || error)
    return []
  }

  return flattenTags(data ?? [])
})

// ── Colleges & programs (for filters and form pickers) ───────────────────────

export const getAllColleges = cache(async (): Promise<College[]> => {
  const supabase = await createClient()
  const { data } = await runWithRetry(() =>
    supabase
      .from('colleges')
      .select('*')
      .order('college_name')
  )
  return data ?? []
})

export const getAllPrograms = cache(async (): Promise<Program[]> => {
  const supabase = await createClient()
  const { data } = await runWithRetry(() =>
    supabase
      .from('programs')
      .select('*')
      .order('prog_name')
  )
  return data ?? []
})

// ── Theses listing (search + tags + pagination) ───────────────────────────────

const PAGE_SIZE = 9

export interface ThesisListResult {
  theses: ThesisWithRelations[]
  totalCount: number
  page: number
  totalPages: number
}

export async function getThesesList(opts: {
  query?: string
  tagIds?: string[]
  page?: number
}): Promise<ThesisListResult> {
  const supabase = await createClient()
  const page = Math.max(1, opts.page ?? 1)
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  // Collect thesis IDs that match all selected tags (if any)
  let tagFilterIds: string[] | null = null
  if (opts.tagIds && opts.tagIds.length > 0) {
    const validTagIds = opts.tagIds.filter(isValidUUID)
    if (validTagIds.length === 0) {
      return { theses: [], totalCount: 0, page, totalPages: 0 }
    }
    tagFilterIds = await getThesisIdsWithAllTags(supabase, validTagIds)
    // If no theses match all tags, short-circuit
    if (tagFilterIds.length === 0) {
      return { theses: [], totalCount: 0, page, totalPages: 0 }
    }
  }

  let q = supabase
    .from('theses')
    .select(`*, college:colleges(*), program:programs(*), tags:thesis_tags(tag:tags(*))`, { count: 'exact' })
    .order('date_added', { ascending: false })
    .range(from, to)

  if (opts.query) {
    // Values are quoted so a comma or dot in the search box cannot terminate
    // this filter branch and append conditions of the visitor's choosing.
    const pattern = pgFilterValue(`%${opts.query}%`)
    const branches = [
      `title.ilike.${pattern}`,
      `authors.ilike.${pattern}`,
      `abstract.ilike.${pattern}`,
    ]

    // Legacy parity: the Django search also matched tag names.
    const taggedIds = await getThesisIdsMatchingTagName(supabase, opts.query)
    if (taggedIds.length > 0) {
      // UUIDs come from the database, so they need no quoting.
      branches.push(`id.in.(${taggedIds.join(',')})`)
    }

    q = q.or(branches.join(','))
  }

  if (tagFilterIds !== null) {
    q = q.in('id', tagFilterIds)
  }

  const { data, error, count } = await runWithRetry(() => q)
  if (error) {
    console.error('getThesesList error:', error.message || error)
    return { theses: [], totalCount: 0, page, totalPages: 0 }
  }

  const theses = flattenTags(data ?? [])
  const totalCount = count ?? 0
  return {
    theses,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / PAGE_SIZE),
  }
}

/** Cap on how many thesis IDs a tag-name match may contribute to a search. */
const TAG_MATCH_LIMIT = 200

/**
 * Thesis IDs whose *tags* match the search term.
 *
 * The legacy Django query included `Q(tags__name__icontains=query)`; this
 * restores that arm of the search. `ilike()` is a builder method, so the term is
 * passed as its own value rather than concatenated into a filter string.
 */
async function getThesisIdsMatchingTagName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: string
): Promise<string[]> {
  const { data: tagRows } = await supabase
    .from('tags')
    .select('id')
    .ilike('name', `%${query}%`)
    .limit(50)

  const tagIds = (tagRows ?? []).map(t => t.id)
  if (tagIds.length === 0) return []

  const { data } = await supabase
    .from('thesis_tags')
    .select('thesis_id')
    .in('tag_id', tagIds)
    .limit(TAG_MATCH_LIMIT)

  return [...new Set((data ?? []).map(r => r.thesis_id))]
}

/**
 * Thesis IDs carrying ALL of the given tags.
 *
 * Prefers the `theses_with_all_tags` SQL function from migration 002, which
 * intersects with `GROUP BY … HAVING count(*)` and returns only the matching
 * IDs. Falls back to intersecting in JS — which has to pull every junction row
 * for the selected tags — so tag filtering still works on a database that has
 * not had migration 002 applied yet.
 */
async function getThesisIdsWithAllTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tagIds: string[]
): Promise<string[]> {
  if (tagIds.length === 0) return []

  const { data, error } = await supabase.rpc('theses_with_all_tags', { tag_ids: tagIds })

  if (!error && data) {
    return data.map(row => row.thesis_id)
  }

  console.warn(
    'theses_with_all_tags() unavailable — intersecting tags in JS. Apply supabase/migrations/002_fixes.sql.',
    error?.message
  )
  return intersectTagsInMemory(supabase, tagIds)
}

/** JS fallback for getThesisIdsWithAllTags — see the note there. */
async function intersectTagsInMemory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tagIds: string[]
): Promise<string[]> {
  const { data } = await supabase
    .from('thesis_tags')
    .select('thesis_id, tag_id')
    .in('tag_id', tagIds)

  if (!data) return []

  const map = new Map<string, Set<string>>()
  for (const row of data) {
    if (!map.has(row.thesis_id)) map.set(row.thesis_id, new Set())
    map.get(row.thesis_id)!.add(row.tag_id)
  }

  return Array.from(map.entries())
    .filter(([, tagSet]) => tagIds.every(id => tagSet.has(id)))
    .map(([thesisId]) => thesisId)
}

// ── Available tags (for filter panel) ────────────────────────────────────────

export const getAvailableTags = cache(async (limit = 40): Promise<Tag[]> => {
  const supabase = await createClient()
  const { data } = await runWithRetry(() =>
    supabase
      .from('tags')
      .select('*')
      .order('name')
      .limit(limit)
  )
  return data ?? []
})

// ── User uploads ──────────────────────────────────────────────────────────────

export const getUserTheses = cache(async (userId: string): Promise<ThesisWithRelations[]> => {
  if (!isValidUUID(userId)) return []
  const supabase = await createClient()
  const { data, error } = await runWithRetry(() =>
    supabase
      .from('theses')
      .select(`*, college:colleges(*), program:programs(*), tags:thesis_tags(tag:tags(*))`)
      .eq('uploaded_by', userId)
      .order('date_added', { ascending: false })
  )

  if (error) {
    console.error('getUserTheses error:', error.message || error)
    return []
  }

  return flattenTags(data ?? [])
})

// ── Single thesis ─────────────────────────────────────────────────────────────

export const getThesisById = cache(async (id: string): Promise<ThesisWithRelations | null> => {
  if (!isValidUUID(id)) return null
  const supabase = await createClient()
  const { data, error } = await runWithRetry(() =>
    supabase
      .from('theses')
      .select(`*, college:colleges(*), program:programs(*), tags:thesis_tags(tag:tags(*))`)
      .eq('id', id)
      .single()
  )

  if (error || !data) return null
  return flattenTags([data])[0] ?? null
})

// ── View counter ──────────────────────────────────────────────────────────────

/**
 * Bumps a thesis's view count and returns the new total, or null on failure.
 *
 * Delegates to `increment_thesis_views()` (migration 002), which does
 * `SET view_count = view_count + 1` in a single statement. Reading the count in
 * the app and writing back `count + 1` — as this used to — loses every view
 * that overlaps another, because both requests read the same starting value.
 *
 * The function is SECURITY DEFINER, so a signed-in reader can bump the counter
 * on a thesis they do not own without the service-role key being involved.
 */
export async function incrementThesisViews(thesisId: string): Promise<number | null> {
  if (!isValidUUID(thesisId)) return null
  const supabase = await createClient()
  const { data, error } = await runWithRetry(() =>
    supabase.rpc('increment_thesis_views', {
      thesis_uuid: thesisId,
    })
  )

  if (error) {
    console.error('increment_thesis_views error:', error.message || error)
    return null
  }

  return typeof data === 'number' ? data : null
}

// ── User profile stats ────────────────────────────────────────────────────────

export interface UserStats {
  thesisCount: number
  totalViews: number
  avgScore: number | null
}

export async function getUserStats(userId: string): Promise<UserStats> {
  if (!isValidUUID(userId)) {
    return { thesisCount: 0, totalViews: 0, avgScore: null }
  }
  const supabase = await createClient()
  const { data } = await runWithRetry(() =>
    supabase
      .from('theses')
      .select('view_count, panel_score')
      .eq('uploaded_by', userId)
  )

  if (!data || data.length === 0) {
    return { thesisCount: 0, totalViews: 0, avgScore: null }
  }

  const totalViews = data.reduce((sum, r) => sum + (r.view_count ?? 0), 0)
  const scored = data.filter(r => r.panel_score != null)
  const avgScore = scored.length > 0
    ? scored.reduce((sum, r) => sum + r.panel_score!, 0) / scored.length
    : null

  return { thesisCount: data.length, totalViews, avgScore }
}
