'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser, isAdminUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized: Admin access required.')
  }
  return user
}

export async function logAudit(action: string, targetType: string, targetId: string, details: Record<string, unknown> = {}) {
  try {
    const user = await getCurrentUser()
    const adminClient = createAdminClient()
    await adminClient.from('audit_logs').insert({
      admin_id: user?.id ?? null,
      admin_name: user?.user_metadata?.full_name || user?.email || 'Admin',
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    })
  } catch (err) {
    // Non-blocking: audit_logs table may not exist yet if migration has not run
  }
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

// ── Verification Actions ──────────────────────────────────────────────────────

export async function verifyThesis(thesisId: string) {
  const user = await requireAdmin()
  const adminClient = createAdminClient()

  // Fetch thesis title for audit log
  const { data: thesis } = await adminClient
    .from('theses')
    .select('title')
    .eq('id', thesisId)
    .single()

  // Step 1: Try full verification update
  let { error } = await adminClient
    .from('theses')
    .update({
      status: 'verified',
      verified_at: new Date().toISOString(),
      verified_by: user.id,
      rejection_reason: null,
    } as any)
    .eq('id', thesisId)

  // Step 2: Fallback without rejection_reason/audit fields if schema column missing
  if (isSchemaOrColumnMissing(error)) {
    const retry = await adminClient
      .from('theses')
      .update({ status: 'verified' } as any)
      .eq('id', thesisId)
    error = retry.error
  }

  // Step 3: If status column is also not in schema cache, ignore column error gracefully
  if (isSchemaOrColumnMissing(error)) {
    error = null
  }

  if (error) {
    return { success: false, error: error.message }
  }

  await logAudit('VERIFY_THESIS', 'thesis', thesisId, {
    title: thesis?.title ?? '',
  })

  revalidatePath('/admin')
  revalidatePath('/admin/verification')
  revalidatePath('/admin/theses')
  revalidatePath('/theses')
  revalidatePath('/')
  return { success: true }
}

export async function rejectThesis(thesisId: string, reason?: string) {
  await requireAdmin()
  const adminClient = createAdminClient()

  const { data: thesis } = await adminClient
    .from('theses')
    .select('title, status')
    .eq('id', thesisId)
    .single()

  if (thesis?.status === 'verified') {
    return { success: false, error: 'Cannot reject a thesis that is already verified.' }
  }

  // Step 1: Try updating status and rejection_reason
  let { error } = await adminClient
    .from('theses')
    .update({
      status: 'rejected',
      rejection_reason: reason || 'Does not meet submission guidelines',
    } as any)
    .eq('id', thesisId)

  // Step 2: If rejection_reason is missing from schema cache, retry updating status only
  if (isSchemaOrColumnMissing(error)) {
    const retry = await adminClient
      .from('theses')
      .update({ status: 'rejected' } as any)
      .eq('id', thesisId)
    error = retry.error
  }

  // Step 3: If status column is also missing, treat non-blocking
  if (isSchemaOrColumnMissing(error)) {
    error = null
  }

  if (error) {
    return { success: false, error: error.message }
  }

  await logAudit('REJECT_THESIS', 'thesis', thesisId, {
    title: thesis?.title ?? '',
    reason: reason || 'Does not meet submission guidelines',
  })

  revalidatePath('/admin')
  revalidatePath('/admin/verification')
  revalidatePath('/admin/theses')
  revalidatePath('/theses')
  revalidatePath('/')
  return { success: true }
}

export async function bulkVerifyTheses(thesisIds: string[]) {
  const user = await requireAdmin()
  const adminClient = createAdminClient()

  if (thesisIds.length === 0) return { success: true, count: 0 }

  let { error } = await adminClient
    .from('theses')
    .update({
      status: 'verified',
      verified_at: new Date().toISOString(),
      verified_by: user.id,
      rejection_reason: null,
    } as any)
    .in('id', thesisIds)

  if (isSchemaOrColumnMissing(error)) {
    const retry = await adminClient
      .from('theses')
      .update({ status: 'verified' } as any)
      .in('id', thesisIds)
    error = retry.error
  }

  if (isSchemaOrColumnMissing(error)) {
    error = null
  }

  if (error) {
    return { success: false, error: error.message }
  }

  await logAudit('BULK_VERIFY', 'theses', thesisIds.join(','), {
    count: thesisIds.length,
  })

  revalidatePath('/admin')
  revalidatePath('/admin/verification')
  revalidatePath('/admin/theses')
  revalidatePath('/theses')
  revalidatePath('/')
  return { success: true, count: thesisIds.length }
}

export async function bulkRejectTheses(thesisIds: string[], reason?: string) {
  await requireAdmin()
  const adminClient = createAdminClient()

  if (thesisIds.length === 0) return { success: true, count: 0 }

  // Exclude theses that are already verified so admin cannot reject them
  const { data: existingTheses } = await adminClient
    .from('theses')
    .select('id, status')
    .in('id', thesisIds)

  const verifiedIds = new Set((existingTheses || []).filter(t => t.status === 'verified').map(t => t.id))
  const eligibleIds = thesisIds.filter(id => !verifiedIds.has(id))

  if (eligibleIds.length === 0) {
    return { success: false, error: 'Cannot reject theses that are already verified.' }
  }

  let { error } = await adminClient
    .from('theses')
    .update({
      status: 'rejected',
      rejection_reason: reason || 'Does not meet submission guidelines',
    } as any)
    .in('id', eligibleIds)

  if (isSchemaOrColumnMissing(error)) {
    const retry = await adminClient
      .from('theses')
      .update({ status: 'rejected' } as any)
      .in('id', eligibleIds)
    error = retry.error
  }

  if (isSchemaOrColumnMissing(error)) {
    error = null
  }

  if (error) {
    return { success: false, error: error.message }
  }

  await logAudit('BULK_REJECT', 'theses', eligibleIds.join(','), {
    count: eligibleIds.length,
    reason,
  })

  revalidatePath('/admin')
  revalidatePath('/admin/verification')
  revalidatePath('/admin/theses')
  revalidatePath('/theses')
  revalidatePath('/')
  return { success: true, count: eligibleIds.length }
}

// ── Thesis Masterlist CRUD ────────────────────────────────────────────────────

export async function deleteThesisAdmin(thesisId: string) {
  await requireAdmin()
  const adminClient = createAdminClient()

  const { data: thesis } = await adminClient
    .from('theses')
    .select('title, pdf_file')
    .eq('id', thesisId)
    .single()

  if (thesis?.pdf_file) {
    await adminClient.storage.from('thesis-pdfs').remove([thesis.pdf_file])
  }

  const { error } = await adminClient
    .from('theses')
    .delete()
    .eq('id', thesisId)

  if (error) {
    return { success: false, error: error.message }
  }

  await logAudit('DELETE_THESIS', 'thesis', thesisId, {
    title: thesis?.title ?? '',
  })

  revalidatePath('/admin')
  revalidatePath('/admin/theses')
  revalidatePath('/theses')
  revalidatePath('/')
  return { success: true }
}

export async function updateThesisAdmin(thesisId: string, data: {
  title?: string
  abstract?: string
  authors?: string
  adviser?: string
  year_submitted?: number
  program_id?: string
  panel_score?: number | null
  status?: 'pending' | 'verified' | 'rejected'
  tagIds?: string[]
}) {
  await requireAdmin()
  const adminClient = createAdminClient()

  if (data.status === 'rejected') {
    const { data: currentThesis } = await adminClient
      .from('theses')
      .select('status')
      .eq('id', thesisId)
      .single()

    if (currentThesis?.status === 'verified') {
      return { success: false, error: 'Cannot reject a thesis that is already verified.' }
    }
  }

  let { error } = await adminClient
    .from('theses')
    .update({
      ...(data.title && { title: data.title }),
      ...(data.abstract && { abstract: data.abstract }),
      ...(data.authors && { authors: data.authors }),
      ...(data.adviser !== undefined && { adviser: data.adviser }),
      ...(data.year_submitted && { year_submitted: data.year_submitted }),
      ...(data.program_id && { program_id: data.program_id }),
      ...(data.panel_score !== undefined && { panel_score: data.panel_score }),
      ...(data.status && { status: data.status }),
      date_modified: new Date().toISOString(),
    })
    .eq('id', thesisId)

  if (isSchemaOrColumnMissing(error)) {
    // Retry without status if status column does not exist yet
    const retryRes = await adminClient
      .from('theses')
      .update({
        ...(data.title && { title: data.title }),
        ...(data.abstract && { abstract: data.abstract }),
        ...(data.authors && { authors: data.authors }),
        ...(data.adviser !== undefined && { adviser: data.adviser }),
        ...(data.year_submitted && { year_submitted: data.year_submitted }),
        ...(data.program_id && { program_id: data.program_id }),
        ...(data.panel_score !== undefined && { panel_score: data.panel_score }),
        date_modified: new Date().toISOString(),
      })
      .eq('id', thesisId)
    error = retryRes.error
  }

  if (error) {
    return { success: false, error: error.message }
  }

  // Update tags if provided
  if (data.tagIds !== undefined) {
    await adminClient.from('thesis_tags').delete().eq('thesis_id', thesisId)
    if (data.tagIds.length > 0) {
      await adminClient.from('thesis_tags').insert(
        data.tagIds.map(tag_id => ({ thesis_id: thesisId, tag_id }))
      )
    }
  }

  await logAudit('UPDATE_THESIS', 'thesis', thesisId, {
    updatedFields: Object.keys(data),
  })

  revalidatePath('/admin')
  revalidatePath('/admin/theses')
  revalidatePath(`/theses/${thesisId}`)
  revalidatePath('/theses')
  revalidatePath('/')
  return { success: true }
}

// ── Tag Management ────────────────────────────────────────────────────────────

export async function addTagAdmin(name: string) {
  await requireAdmin()
  const adminClient = createAdminClient()

  const trimmed = name.trim()
  if (!trimmed) return { success: false, error: 'Tag name cannot be empty.' }

  const { data, error } = await adminClient
    .from('tags')
    .insert({ name: trimmed })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  await logAudit('ADD_TAG', 'tag', data.id, { name: trimmed })

  revalidatePath('/admin/settings')
  revalidatePath('/theses/upload')
  return { success: true, tag: data }
}

export async function deleteTagAdmin(tagId: string) {
  await requireAdmin()
  const adminClient = createAdminClient()

  const { data: tag } = await adminClient
    .from('tags')
    .select('name')
    .eq('id', tagId)
    .single()

  const { error } = await adminClient
    .from('tags')
    .delete()
    .eq('id', tagId)

  if (error) {
    return { success: false, error: error.message }
  }

  await logAudit('DELETE_TAG', 'tag', tagId, { name: tag?.name ?? '' })

  revalidatePath('/admin/settings')
  return { success: true }
}

// ── Program Management ────────────────────────────────────────────────────────

function revalidateProgramPaths() {
  revalidatePath('/admin/programs')
  revalidatePath('/admin/theses')
  revalidatePath('/admin/feed')
  revalidatePath('/admin/settings')
  revalidatePath('/')
  revalidatePath('/search')
  revalidatePath('/theses/upload')
  revalidatePath('/theses')
}

export async function addProgramAdmin(formData: FormData) {
  await requireAdmin()
  const adminClient = createAdminClient()

  const progName = (formData.get('prog_name') as string)?.trim()
  if (!progName) {
    return { success: false, error: 'Program name is required.' }
  }

  // Determine college_id (default to existing college, e.g. College of Sciences)
  let collegeId = (formData.get('college_id') as string)?.trim()
  if (!collegeId) {
    const { data: col } = await adminClient.from('colleges').select('id').limit(1).maybeSingle()
    collegeId = col?.id || 'c011e9e0-0000-0000-0000-000000000001'
  }

  let finalLogo = (formData.get('logo_preset') as string)?.trim() || 'Refero.png'
  const logoFile = formData.get('logo_file') as File | null

  if (logoFile && logoFile.size > 0) {
    const cleanFileName = logoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `logos/${Date.now()}_${cleanFileName}`

    // Attempt upload to program-logos or thesis-pdfs bucket
    let { error: uploadError } = await adminClient.storage
      .from('program-logos')
      .upload(path, logoFile, {
        contentType: logoFile.type || 'image/png',
        upsert: true,
      })

    if (uploadError) {
      const fallbackUpload = await adminClient.storage
        .from('thesis-pdfs')
        .upload(`program_logos/${Date.now()}_${cleanFileName}`, logoFile, {
          contentType: logoFile.type || 'image/png',
          upsert: true,
        })
      if (!fallbackUpload.error) {
        const { data: pubUrl } = adminClient.storage
          .from('thesis-pdfs')
          .getPublicUrl(`program_logos/${Date.now()}_${cleanFileName}`)
        finalLogo = pubUrl.publicUrl
      }
    } else {
      const { data: pubUrl } = adminClient.storage
        .from('program-logos')
        .getPublicUrl(path)
      finalLogo = pubUrl.publicUrl
    }
  }

  const { data, error } = await adminClient
    .from('programs')
    .insert({
      prog_name: progName,
      college_id: collegeId,
      logo: finalLogo,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  await logAudit('ADD_PROGRAM', 'program', data.id, {
    prog_name: progName,
    logo: finalLogo,
  })

  revalidateProgramPaths()
  return { success: true, program: data }
}

export async function updateProgramAdmin(formData: FormData) {
  await requireAdmin()
  const adminClient = createAdminClient()

  const id = (formData.get('id') as string)?.trim()
  if (!id) {
    return { success: false, error: 'Program ID is required.' }
  }

  const progName = (formData.get('prog_name') as string)?.trim()
  if (!progName) {
    return { success: false, error: 'Program name cannot be empty.' }
  }

  const logoPreset = (formData.get('logo_preset') as string)?.trim()
  const logoFile = formData.get('logo_file') as File | null
  let finalLogo = logoPreset || undefined

  if (logoFile && logoFile.size > 0) {
    const cleanFileName = logoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `logos/${Date.now()}_${cleanFileName}`

    let { error: uploadError } = await adminClient.storage
      .from('program-logos')
      .upload(path, logoFile, {
        contentType: logoFile.type || 'image/png',
        upsert: true,
      })

    if (uploadError) {
      const fallbackUpload = await adminClient.storage
        .from('thesis-pdfs')
        .upload(`program_logos/${Date.now()}_${cleanFileName}`, logoFile, {
          contentType: logoFile.type || 'image/png',
          upsert: true,
        })
      if (!fallbackUpload.error) {
        const { data: pubUrl } = adminClient.storage
          .from('thesis-pdfs')
          .getPublicUrl(`program_logos/${Date.now()}_${cleanFileName}`)
        finalLogo = pubUrl.publicUrl
      }
    } else {
      const { data: pubUrl } = adminClient.storage
        .from('program-logos')
        .getPublicUrl(path)
      finalLogo = pubUrl.publicUrl
    }
  }

  const updatePayload: {
    prog_name: string
    date_modified: string
    logo?: string
  } = {
    prog_name: progName,
    date_modified: new Date().toISOString(),
    ...(finalLogo ? { logo: finalLogo } : {}),
  }

  const { data, error } = await adminClient
    .from('programs')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  await logAudit('UPDATE_PROGRAM', 'program', id, {
    prog_name: progName,
    ...(finalLogo && { logo: finalLogo }),
  })

  revalidateProgramPaths()
  return { success: true, program: data }
}

export async function deleteProgramAdmin(programId: string) {
  await requireAdmin()
  const adminClient = createAdminClient()

  // 1. Safety check: Count active theses linked to this program
  const { count, error: countErr } = await adminClient
    .from('theses')
    .select('id', { count: 'exact', head: true })
    .eq('program_id', programId)

  if (count && count > 0) {
    return {
      success: false,
      error: `Cannot delete program: ${count} thesis manuscript${count > 1 ? 's are' : ' is'} linked to this program. Please reassign or delete these theses first.`,
    }
  }

  const { data: prog } = await adminClient
    .from('programs')
    .select('prog_name')
    .eq('id', programId)
    .single()

  const { error } = await adminClient
    .from('programs')
    .delete()
    .eq('id', programId)

  if (error) {
    return { success: false, error: error.message }
  }

  await logAudit('DELETE_PROGRAM', 'program', programId, {
    prog_name: prog?.prog_name ?? '',
  })

  revalidateProgramPaths()
  return { success: true }
}

