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
  let thesisCount = DEFAULT_THESES.length
  let collegeCount = DEFAULT_COLLEGES.length
  let programCount = DEFAULT_PROGRAMS.length
  let tagCount = DEFAULT_TAGS.length

  try {
    const supabase = await createClient()
    const [theses, colleges, programs, tags] = await Promise.all([
      supabase.from('theses').select('id', { count: 'exact', head: true }),
      supabase.from('colleges').select('id', { count: 'exact', head: true }),
      supabase.from('programs').select('id', { count: 'exact', head: true }),
      supabase.from('tags').select('id', { count: 'exact', head: true }),
    ])

    if (theses.count != null && theses.count > 0) {
      thesisCount = theses.count
    }
    if (colleges.count != null && colleges.count > 0) {
      collegeCount = colleges.count
    }
    if (programs.count != null && programs.count > 0) {
      programCount = programs.count
    }
    if (tags.count != null && tags.count > 0) {
      tagCount = tags.count
    }
  } catch (err) {
    console.warn('getSiteStats query fallback to defaults:', err)
  }

  return {
    thesis_count:  thesisCount,
    college_count: collegeCount,
    program_count: programCount,
    tag_count:     tagCount,
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
  college?: College | null
  program?: Program | null
  tags?: { tag: Tag | null }[] | null
}

function flattenTags(rows: (Partial<ThesisJoinRow> & Thesis)[]): ThesisWithRelations[] {
  return rows.map(row => {
    const defaultCollege = DEFAULT_COLLEGES.find(c => c.id === row.college_id) ?? DEFAULT_COLLEGES[0]
    const defaultProgram = DEFAULT_PROGRAMS.find(p => p.id === row.program_id) ?? DEFAULT_PROGRAMS[0]

    return {
      ...row,
      college: row.college ?? defaultCollege,
      program: row.program ?? defaultProgram,
      tags: Array.isArray(row.tags)
        ? row.tags
            .map(t => (t && typeof t === 'object' && 'tag' in t ? (t as any).tag : t))
            .filter((tag): tag is Tag => tag != null && typeof tag === 'object' && 'name' in tag)
        : [],
    } as ThesisWithRelations
  })
}

// ── Featured theses (home page) ───────────────────────────────────────────────

export const getFeaturedTheses = cache(async (programId?: string): Promise<ThesisWithRelations[]> => {
  if (programId && !isValidUUID(programId)) {
    return []
  }

  try {
    const supabase = await createClient()

    let query = supabase
      .from('theses')
      .select(`*, college:colleges(*), program:programs(*), tags:thesis_tags(tag:tags(*))`)
      .or('status.eq.verified,status.is.null')
      .order('date_added', { ascending: false })
      .limit(6)

    if (programId && isValidUUID(programId)) {
      query = query.eq('program_id', programId)
    }

    let { data, error } = await runWithRetry(() => query)
    if (error && (error as any).code === '42703') {
      let fallbackQuery = supabase
        .from('theses')
        .select(`*, college:colleges(*), program:programs(*), tags:thesis_tags(tag:tags(*))`)
        .order('date_added', { ascending: false })
        .limit(6)
      if (programId && isValidUUID(programId)) {
        fallbackQuery = fallbackQuery.eq('program_id', programId)
      }
      const fallbackRes = await runWithRetry(() => fallbackQuery)
      data = fallbackRes.data
      error = fallbackRes.error
    }

    if (!error && data && data.length > 0) {
      return flattenTags(data)
    }
  } catch (err) {
    console.warn('getFeaturedTheses query error, using defaults:', err)
  }

  if (programId) {
    return DEFAULT_THESES.filter(t => t.program_id === programId)
  }
  return DEFAULT_THESES
})

// ── Colleges & programs (for filters and form pickers) ───────────────────────

import { DEFAULT_COLLEGES, DEFAULT_PROGRAMS, DEFAULT_TAGS, DEFAULT_THESES, getProgramLogoUrl } from '@/lib/constants/programs'

export const getAllColleges = cache(async (): Promise<College[]> => {
  try {
    const supabase = await createClient()
    const { data, error } = await runWithRetry(() =>
      supabase
        .from('colleges')
        .select('*')
        .order('college_name')
    )
    if (!error && data && data.length > 0) {
      return data
    }
  } catch (err) {
    console.warn('getAllColleges DB query fallback to College of Sciences:', err)
  }
  return DEFAULT_COLLEGES
})

export const getAllPrograms = cache(async (): Promise<Program[]> => {
  try {
    const supabase = await createClient()
    const { data, error } = await runWithRetry(() =>
      supabase
        .from('programs')
        .select('*')
        .order('prog_name')
    )
    if (!error && data && data.length > 0) {
      return data.map(p => ({
        ...p,
        logo: getProgramLogoUrl(p.logo, p.prog_name),
      }))
    }
  } catch (err) {
    console.warn('getAllPrograms DB query fallback to College of Sciences programs:', err)
  }
  return DEFAULT_PROGRAMS
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
  const page = Math.max(1, opts.page ?? 1)
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  function getFilteredDefaults(): ThesisListResult {
    let list = DEFAULT_THESES
    if (opts.query) {
      const q = opts.query.toLowerCase()
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.authors.toLowerCase().includes(q) || t.abstract.toLowerCase().includes(q))
    }
    if (opts.tagIds && opts.tagIds.length > 0) {
      list = list.filter(t => t.tags.some(tag => opts.tagIds!.includes(tag.id)))
    }
    const totalCount = list.length
    return {
      theses: list.slice(from, to + 1),
      totalCount,
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    }
  }

  try {
    const supabase = await createClient()

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
      .or('status.eq.verified,status.is.null')
      .order('date_added', { ascending: false })
      .range(from, to)

    if (opts.query) {
      const pattern = pgFilterValue(`%${opts.query}%`)
      const branches = [
        `title.ilike.${pattern}`,
        `authors.ilike.${pattern}`,
        `abstract.ilike.${pattern}`,
      ]

      const taggedIds = await getThesisIdsMatchingTagName(supabase, opts.query)
      if (taggedIds.length > 0) {
        branches.push(`id.in.(${taggedIds.join(',')})`)
      }

      q = q.or(branches.join(','))
    }

    if (tagFilterIds !== null) {
      q = q.in('id', tagFilterIds)
    }

    let { data, error, count } = await runWithRetry(() => q)
    if (error && (error as any).code === '42703') {
      let fallbackQ = supabase
        .from('theses')
        .select(`*, college:colleges(*), program:programs(*), tags:thesis_tags(tag:tags(*))`, { count: 'exact' })
        .order('date_added', { ascending: false })
        .range(from, to)
      if (tagFilterIds !== null) {
        fallbackQ = fallbackQ.in('id', tagFilterIds)
      }
      const fallbackRes = await runWithRetry(() => fallbackQ)
      data = fallbackRes.data
      error = fallbackRes.error
      count = fallbackRes.count
    }

    if (error || (!data || data.length === 0)) {
      return getFilteredDefaults()
    }

    const theses = flattenTags(data ?? [])
    const totalCount = count ?? 0
    return {
      theses,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / PAGE_SIZE),
    }
  } catch (err) {
    console.warn('getThesesList query error, using defaults:', err)
    return getFilteredDefaults()
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
  try {
    const supabase = await createClient()
    const { data } = await runWithRetry(() =>
      supabase
        .from('tags')
        .select('*')
        .order('name')
        .limit(limit)
    )
    if (data && data.length > 0) return data
  } catch {}
  return DEFAULT_TAGS.slice(0, limit)
})

// ── User uploads ──────────────────────────────────────────────────────────────

export const getUserTheses = cache(async (userId: string): Promise<ThesisWithRelations[]> => {
  if (!isValidUUID(userId)) return []
  try {
    const supabase = await createClient()
    const { data, error } = await runWithRetry(() =>
      supabase
        .from('theses')
        .select(`*, college:colleges(*), program:programs(*), tags:thesis_tags(tag:tags(*))`)
        .eq('uploaded_by', userId)
        .order('date_added', { ascending: false })
    )

    if (error || !data) {
      return []
    }

    return flattenTags(data)
  } catch (err) {
    console.warn('getUserTheses error:', err)
    return []
  }
})

// ── Single thesis ─────────────────────────────────────────────────────────────

export const getThesisById = cache(async (id: string): Promise<ThesisWithRelations | null> => {
  if (!isValidUUID(id)) return null
  try {
    const supabase = await createClient()
    const { data, error } = await runWithRetry(() =>
      supabase
        .from('theses')
        .select(`*, college:colleges(*), program:programs(*), tags:thesis_tags(tag:tags(*))`)
        .eq('id', id)
        .single()
    )

    if (!error && data) return flattenTags([data])[0] ?? null
  } catch {}

  const defaultMatch = DEFAULT_THESES.find(t => t.id === id)
  if (defaultMatch) return defaultMatch

  return null
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
