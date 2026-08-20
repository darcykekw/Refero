'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPaperId } from '@/lib/semantic-scholar'

export interface ThesisActionState {
  error?: string
}

// ── Type helpers ──────────────────────────────────────────────────────────────

/** Cast used to bypass Supabase SSR client's column-string inference failures. */
type DbResult<T> = Promise<{ data: T | null; error: { message: string } | null }>

// ── Shared helpers ────────────────────────────────────────────────────────────

function parseFormFields(formData: FormData) {
  return {
    title:         (formData.get('title')          as string)?.trim() ?? '',
    abstract:      (formData.get('abstract')       as string)?.trim() ?? '',
    authors:       (formData.get('authors')        as string)?.trim() ?? '',
    adviser:       (formData.get('adviser')        as string)?.trim() || null,
    yearStr:       (formData.get('year_submitted') as string) ?? '',
    collegeId:     (formData.get('college_id')     as string) ?? '',
    programId:     (formData.get('program_id')     as string) ?? '',
    panelScoreStr: (formData.get('panel_score')    as string) ?? '',
    tagIds:         formData.getAll('tag_ids')  as string[],
    newTagsStr:    (formData.get('new_tags')       as string)?.trim() ?? '',
    pdfFile:        formData.get('pdf_file')   as File | null,
  }
}

function validateFields(
  fields: ReturnType<typeof parseFormFields>,
  requirePdf: boolean
): string | null {
  if (!fields.title || fields.title.length < 3) return 'Title must be at least 3 characters.'
  if (!fields.abstract || fields.abstract.length < 10) return 'Abstract must be at least 10 characters.'
  if (!fields.authors) return 'Authors field is required.'
  if (!fields.collegeId) return 'Please select a college.'
  if (!fields.programId) return 'Please select a program.'

  const year = parseInt(fields.yearStr, 10)
  if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
    return 'Please enter a valid year.'
  }

  if (fields.panelScoreStr) {
    const score = parseFloat(fields.panelScoreStr)
    if (isNaN(score) || score < 0 || score > 100) return 'Panel score must be between 0 and 100.'
  }

  if (requirePdf) {
    if (!fields.pdfFile || fields.pdfFile.size === 0) return 'Please upload a PDF file.'
    if (fields.pdfFile.size > 20 * 1024 * 1024) return 'PDF file must be under 20 MB.'
  }

  return null
}

async function uploadPdf(
  userId: string,
  file: File
): Promise<{ path: string } | { error: string }> {
  const admin = createAdminClient()
  const path = `${userId}/${Date.now()}.pdf`
  const { error } = await admin.storage
    .from('thesis-pdfs')
    .upload(path, file, { contentType: 'application/pdf', upsert: false })
  if (error) {
    console.error('Storage upload error:', error)
    return { error: 'Failed to upload PDF. Please try again.' }
  }
  return { path }
}

async function syncTags(
  thesisId: string,
  tagIds: string[],
  newTagsStr: string
): Promise<void> {
  const admin = createAdminClient()
  const allTagIds = [...tagIds]

  if (newTagsStr) {
    const names = newTagsStr.split(',').map(n => n.trim()).filter(Boolean)
    for (const name of names) {
      const { data: existing } = await admin
        .from('tags')
        .select('id')
        .ilike('name', name)
        .maybeSingle()

      if (existing) {
        allTagIds.push((existing as { id: string }).id)
      } else {
        const { data: created } = await admin
          .from('tags')
          .insert({ name })
          .select('id')
          .single()
        if (created) allTagIds.push((created as { id: string }).id)
      }
    }
  }

  const unique = [...new Set(allTagIds)].filter(Boolean)
  await admin.from('thesis_tags').delete().eq('thesis_id', thesisId)
  if (unique.length > 0) {
    await admin.from('thesis_tags').insert(
      unique.map(tag_id => ({ thesis_id: thesisId, tag_id }))
    )
  }
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function uploadThesis(
  _prev: ThesisActionState,
  formData: FormData
): Promise<ThesisActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to upload a thesis.' }

  const fields = parseFormFields(formData)
  const validationError = validateFields(fields, true)
  if (validationError) return { error: validationError }

  const uploadResult = await uploadPdf(user.id, fields.pdfFile!)
  if ('error' in uploadResult) return { error: uploadResult.error }

  // Insert thesis — cast insert values as `never` to bypass SSR client type inference bug
  const { data: thesis, error: insertError } = await (
    supabase
      .from('theses')
      .insert({
        title:          fields.title,
        abstract:       fields.abstract,
        authors:        fields.authors,
        adviser:        fields.adviser,
        year_submitted: parseInt(fields.yearStr, 10),
        college_id:     fields.collegeId,
        program_id:     fields.programId,
        panel_score:    fields.panelScoreStr ? parseFloat(fields.panelScoreStr) : null,
        pdf_file:       uploadResult.path,
        uploaded_by:    user.id,
        view_count:     0,
      } as never)
      .select('id')
      .single() as unknown as DbResult<{ id: string }>
  )

  if (insertError || !thesis) {
    await createAdminClient().storage.from('thesis-pdfs').remove([uploadResult.path])
    console.error('Thesis insert error:', insertError)
    return { error: 'Failed to save thesis. Please try again.' }
  }

  await syncTags(thesis.id, fields.tagIds, fields.newTagsStr)

  try {
    const ssId = await getPaperId(fields.title)
    if (ssId) {
      await createAdminClient().from('theses').update({ ss_paper_id: ssId }).eq('id', thesis.id)
    }
  } catch { /* non-critical */ }

  revalidatePath('/theses')
  revalidatePath('/')
  redirect(`/theses/${thesis.id}`)
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateThesis(
  _prev: ThesisActionState,
  formData: FormData
): Promise<ThesisActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const thesisId = (formData.get('thesis_id') as string)?.trim()
  if (!thesisId) return { error: 'Invalid thesis.' }

  type OwnerRow = { id: string; uploaded_by: string; pdf_file: string }
  const { data: existing } = await (
    supabase
      .from('theses')
      .select('id, uploaded_by, pdf_file')
      .eq('id', thesisId)
      .single() as unknown as DbResult<OwnerRow>
  )

  if (!existing) return { error: 'Thesis not found.' }
  if (existing.uploaded_by !== user.id) return { error: 'You do not have permission to edit this thesis.' }

  const fields = parseFormFields(formData)
  const validationError = validateFields(fields, false)
  if (validationError) return { error: validationError }

  let pdfPath = existing.pdf_file
  if (fields.pdfFile && fields.pdfFile.size > 0) {
    if (fields.pdfFile.size > 20 * 1024 * 1024) return { error: 'PDF file must be under 20 MB.' }
    const uploadResult = await uploadPdf(user.id, fields.pdfFile)
    if ('error' in uploadResult) return { error: uploadResult.error }
    await createAdminClient().storage.from('thesis-pdfs').remove([existing.pdf_file])
    pdfPath = uploadResult.path
  }

  const { error: updateError } = await (
    supabase
      .from('theses')
      .update({
        title:          fields.title,
        abstract:       fields.abstract,
        authors:        fields.authors,
        adviser:        fields.adviser,
        year_submitted: parseInt(fields.yearStr, 10),
        college_id:     fields.collegeId,
        program_id:     fields.programId,
        panel_score:    fields.panelScoreStr ? parseFloat(fields.panelScoreStr) : null,
        pdf_file:       pdfPath,
      } as never)
      .eq('id', thesisId) as unknown as DbResult<null>
  )

  if (updateError) {
    console.error('Thesis update error:', updateError)
    return { error: 'Failed to update thesis. Please try again.' }
  }

  await syncTags(thesisId, fields.tagIds, fields.newTagsStr)

  revalidatePath(`/theses/${thesisId}`)
  revalidatePath('/theses')
  revalidatePath('/profile')
  redirect(`/theses/${thesisId}`)
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteThesis(thesisId: string, _formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  type OwnerRow = { id: string; uploaded_by: string; pdf_file: string }
  const { data: thesis } = await (
    supabase
      .from('theses')
      .select('id, uploaded_by, pdf_file')
      .eq('id', thesisId)
      .single() as unknown as DbResult<OwnerRow>
  )

  if (!thesis || thesis.uploaded_by !== user.id) redirect('/profile')

  const admin = createAdminClient()
  await admin.from('thesis_tags').delete().eq('thesis_id', thesisId)
  await admin.from('theses').delete().eq('id', thesisId)
  if (thesis.pdf_file) {
    await admin.storage.from('thesis-pdfs').remove([thesis.pdf_file])
  }

  revalidatePath('/theses')
  revalidatePath('/')
  revalidatePath('/profile')
  redirect('/profile')
}
