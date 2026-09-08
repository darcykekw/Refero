import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdminUser } from '@/lib/auth'
import type { ThesisWithRelations, Program, Tag, AuditLog } from '@/types/database'
import { DEFAULT_PROGRAMS, getProgramLogoUrl } from '@/lib/constants/programs'

export interface AdminStats {
  totalTheses: number
  pendingTheses: number
  verifiedTheses: number
  rejectedTheses: number
  totalUsers: number
  programDistribution: {
    programId: string
    programName: string
    logo?: string | null
    count: number
    submittedCount: number
    verifiedCount: number
  }[]
}

function isSchemaOrColumnMissing(err: any): boolean {
  if (!err) return false
  const code = String(err.code || '')
  const msg = String(err.message || '').toLowerCase()
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    msg.includes('schema cache') ||
    msg.includes('could not find the') ||
    msg.includes('column')
  )
}

export interface AdminThesisItem extends ThesisWithRelations {
  uploaderEmail?: string
  uploaderName?: string
}

/**
 * Fetch high-level metrics and program distribution for the Admin Dashboard.
 */
export async function getAdminStats(): Promise<AdminStats> {
  const adminClient = createAdminClient()

  // 1. Theses counts
  let theses: { id: string; program_id: string | null; status?: string | null }[] = []
  const { data: allTheses, error: thesesErr } = await adminClient
    .from('theses')
    .select('id, program_id, status')

  if (thesesErr && isSchemaOrColumnMissing(thesesErr)) {
    // Fallback: status column does not exist yet
    const { data: fallbackTheses } = await adminClient
      .from('theses')
      .select('id, program_id')
    theses = (fallbackTheses ?? []).map(t => ({ ...t, status: 'verified' }))
  } else {
    theses = allTheses ?? []
  }

  const totalTheses = theses.length
  // If status is not explicitly set, default to verified or pending
  const pendingTheses = theses.filter(t => t.status === 'pending').length
  const verifiedTheses = theses.filter(t => t.status === 'verified' || !t.status).length
  const rejectedTheses = theses.filter(t => t.status === 'rejected').length

  // 2. Users count
  let totalUsers = 0
  try {
    const { data: userData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    totalUsers = userData?.users?.length ?? 0
  } catch {
    totalUsers = 0
  }

  // 3. Programs and distribution
  let programs: { id: string; prog_name: string; logo?: string | null }[] = []
  try {
    const { data: programsData } = await adminClient
      .from('programs')
      .select('id, prog_name, logo')
      .order('prog_name')
    if (programsData && programsData.length > 0) {
      programs = programsData
    }
  } catch (err) {
    console.warn('admin programs query failed, falling back to default programs:', err)
  }

  if (programs.length === 0) {
    programs = DEFAULT_PROGRAMS
  }

  const programDistribution = programs.map(p => {
    const programTheses = theses.filter(t => t.program_id === p.id)
    const submittedCount = programTheses.length
    const verifiedCount = programTheses.filter(t => t.status === 'verified' || !t.status).length

    const logoUrl = getProgramLogoUrl(p.logo, p.prog_name)

    return {
      programId: p.id,
      programName: p.prog_name,
      logo: logoUrl,
      count: submittedCount,
      submittedCount,
      verifiedCount,
    }
  })

  return {
    totalTheses,
    pendingTheses,
    verifiedTheses,
    rejectedTheses,
    totalUsers,
    programDistribution,
  }
}

/**
 * Fetch theses awaiting verification.
 */
export async function getVerificationQueue(limit = 50): Promise<AdminThesisItem[]> {
  const adminClient = createAdminClient()

  let { data, error } = await adminClient
    .from('theses')
    .select(`*, college:colleges(*), program:programs(*), tags:thesis_tags(tag:tags(*))`)
    .eq('status', 'pending')
    .order('date_added', { ascending: false })
    .limit(limit)

  if (error) {
    return []
  }

  // Only return theses that are explicitly pending verification
  const pending = (data ?? []).filter(t => (t as any).status === 'pending')
  return formatThesisRows(pending)
}

/**
 * Fetch masterlist of theses with filtering for Admin.
 */
export async function getMasterlistTheses(options?: {
  programId?: string
  status?: string
  query?: string
}): Promise<AdminThesisItem[]> {
  const adminClient = createAdminClient()

  let q = adminClient
    .from('theses')
    .select(`*, college:colleges(*), program:programs(*), tags:thesis_tags(tag:tags(*))`)
    .order('date_added', { ascending: false })

  if (options?.programId) {
    q = q.eq('program_id', options.programId)
  }

  if (options?.status && options.status !== 'all') {
    q = q.eq('status', options.status as any)
  }

  if (options?.query) {
    const pattern = `%${options.query}%`
    q = q.or(`title.ilike.${pattern},authors.ilike.${pattern},abstract.ilike.${pattern}`)
  }

  let { data, error } = await q
  if (error && isSchemaOrColumnMissing(error)) {
    // Retry without status filter if status column doesn't exist yet
    let fallbackQ = adminClient
      .from('theses')
      .select(`*, college:colleges(*), program:programs(*), tags:thesis_tags(tag:tags(*))`)
      .order('date_added', { ascending: false })

    if (options?.programId) {
      fallbackQ = fallbackQ.eq('program_id', options.programId)
    }
    if (options?.query) {
      const pattern = `%${options.query}%`
      fallbackQ = fallbackQ.or(`title.ilike.${pattern},authors.ilike.${pattern},abstract.ilike.${pattern}`)
    }
    const fallbackRes = await fallbackQ
    data = fallbackRes.data
    error = fallbackRes.error
  }

  if (error) {
    return []
  }

  return formatThesisRows(data ?? [])
}

/**
 * Fetch all registered users for user management.
 */
export async function getAdminUsersList() {
  const adminClient = createAdminClient()
  try {
    const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 200 })
    if (error) return []
    return data?.users ?? []
  } catch {
    return []
  }
}

/**
 * Fetch all tags with their usage count.
 */
export async function getAllTagsWithUsage(): Promise<(Tag & { count: number })[]> {
  const adminClient = createAdminClient()
  try {
    const [tagsRes, junctionRes] = await Promise.all([
      adminClient.from('tags').select('*').order('name'),
      adminClient.from('thesis_tags').select('tag_id'),
    ])

    const tags = tagsRes.data ?? []
    const junction = junctionRes.data ?? []

    const countMap: Record<string, number> = {}
    junction.forEach(j => {
      countMap[j.tag_id] = (countMap[j.tag_id] || 0) + 1
    })

    return tags.map(t => ({
      ...t,
      count: countMap[t.id] || 0,
    }))
  } catch {
    return []
  }
}

/**
 * Fetch recent audit logs.
 */
export async function getAuditLogsList(limit = 50): Promise<AuditLog[]> {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return []
    }

    return data ?? []
  } catch {
    return []
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatThesisRows(rows: any[]): AdminThesisItem[] {
  return rows.map(row => ({
    ...row,
    tags: (row.tags || []).map((t: any) => t.tag).filter(Boolean),
  }))
}
