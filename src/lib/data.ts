/**
 * Shared Supabase data-access helpers — all run on the server.
 * Import into Server Components and Server Actions.
 *
 * The Supabase client can't auto-infer deeply nested join shapes from our
 * hand-written Database type, so we fetch with explicit casts.
 */
import { createClient } from '@/lib/supabase/server'
import type { College, Program, Tag, Thesis, ThesisWithRelations } from '@/types/database'

// ── Site stats ───────────────────────────────────────────────────────────────

export interface SiteStats {
  thesis_count: number
  college_count: number
  program_count: number
  tag_count: number
}

export async function getSiteStats(): Promise<SiteStats> {
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
}

// ── Raw join row shape returned by Supabase ──────────────────────────────────

/** What Supabase returns for the thesis + tags join */
interface ThesisJoinRow extends Thesis {
  college: College
  program: Program
  tags: { tag: Tag }[]
}

function flattenTags(rows: ThesisJoinRow[]): ThesisWithRelations[] {
  return rows.map(row => ({
    ...row,
    tags: row.tags.map(t => t.tag).filter(Boolean) as Tag[],
  }))
}

// ── Featured theses (home page) ───────────────────────────────────────────────

export async function getFeaturedTheses(programId?: string): Promise<ThesisWithRelations[]> {
  const supabase = await createClient()

  let query = supabase
    .from('theses')
    .select(`*, college:colleges(*), program:programs(*), tags:thesis_tags(tag:tags(*))`)
    .order('date_added', { ascending: false })
    .limit(6)

  if (programId) {
    query = query.eq('program_id', programId)
  }

  const { data, error } = await query
  if (error) {
    console.error('getFeaturedTheses error:', error)
    return []
  }

  return flattenTags((data ?? []) as unknown as ThesisJoinRow[])
}

// ── Programs (for filter) ─────────────────────────────────────────────────────

export async function getAllPrograms(): Promise<Program[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('programs')
    .select('*')
    .order('prog_name')
  return (data ?? []) as Program[]
}

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
    tagFilterIds = await getThesisIdsWithAllTags(supabase, opts.tagIds)
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
    q = q.or(
      `title.ilike.%${opts.query}%,authors.ilike.%${opts.query}%,abstract.ilike.%${opts.query}%`
    )
  }

  if (tagFilterIds !== null) {
    q = q.in('id', tagFilterIds)
  }

  const { data, error, count } = await q
  if (error) {
    console.error('getThesesList error:', error)
    return { theses: [], totalCount: 0, page, totalPages: 0 }
  }

  const theses = flattenTags((data ?? []) as unknown as ThesisJoinRow[])
  const totalCount = count ?? 0
  return {
    theses,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / PAGE_SIZE),
  }
}

/** Returns thesis IDs that have ALL of the given tag IDs */
async function getThesisIdsWithAllTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tagIds: string[]
): Promise<string[]> {
  if (tagIds.length === 0) return []

  const { data } = await supabase
    .from('thesis_tags')
    .select('thesis_id, tag_id')
    .in('tag_id', tagIds)

  if (!data) return []

  const rows = data as { thesis_id: string; tag_id: string }[]
  const map = new Map<string, Set<string>>()
  for (const row of rows) {
    if (!map.has(row.thesis_id)) map.set(row.thesis_id, new Set())
    map.get(row.thesis_id)!.add(row.tag_id)
  }

  return Array.from(map.entries())
    .filter(([, tagSet]) => tagIds.every(id => tagSet.has(id)))
    .map(([thesisId]) => thesisId)
}

// ── Available tags (for filter panel) ────────────────────────────────────────

export async function getAvailableTags(limit = 40): Promise<Tag[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tags')
    .select('*')
    .order('name')
    .limit(limit)
  return (data ?? []) as Tag[]
}

// ── User uploads ──────────────────────────────────────────────────────────────

export async function getUserTheses(userId: string): Promise<ThesisWithRelations[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('theses')
    .select(`*, college:colleges(*), program:programs(*), tags:thesis_tags(tag:tags(*))`)
    .eq('uploaded_by', userId)
    .order('date_added', { ascending: false })

  if (error) {
    console.error('getUserTheses error:', error)
    return []
  }

  return flattenTags((data ?? []) as unknown as ThesisJoinRow[])
}
