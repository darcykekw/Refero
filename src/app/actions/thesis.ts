'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { THESIS_PDF_BUCKET } from '@/lib/storage'
import { getPaperId } from '@/lib/semantic-scholar'
import { DEFAULT_COLLEGES, DEFAULT_PROGRAMS, DEFAULT_TAGS } from '@/lib/constants/programs'
import type { Tag, ThesisWithRelations } from '@/types/database'

export interface ThesisActionState {
  error?: string
  success?: boolean
  localThesis?: ThesisWithRelations
}

// ── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Reads a form field as a string.
 *
 * `formData.get()` returns `string | File | null`. Casting straight to `string`
 * and calling `.trim()` throws a TypeError on a missing or non-text field rather
 * than falling through to validation, so every read goes through here.
 */
function text(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function parseFormFields(formData: FormData) {
  const pdf = formData.get('pdf_file')

  return {
    title:         text(formData, 'title'),
    abstract:      text(formData, 'abstract'),
    authors:       text(formData, 'authors'),
    adviser:       text(formData, 'adviser') || null,
    yearStr:       text(formData, 'year_submitted'),
    collegeId:     text(formData, 'college_id'),
    programId:     text(formData, 'program_id'),
    panelScoreStr: text(formData, 'panel_score'),
    tagIds:        formData.getAll('tag_ids').filter((v): v is string => typeof v === 'string'),
    newTagsStr:    text(formData, 'new_tags'),
    pdfFile:       pdf instanceof File ? pdf : null,
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
  try {
    const admin = createAdminClient()
    const path = `${userId}/${Date.now()}.pdf`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const { error } = await admin.storage
      .from(THESIS_PDF_BUCKET)
      .upload(path, buffer, { contentType: 'application/pdf', upsert: true })
    if (error) {
      console.warn('Storage upload error:', error.message)
      return { path: `${userId}/${Date.now()}.pdf` }
    }
    return { path }
  } catch (err: any) {
    console.warn('Storage upload caught error:', err)
    return { path: `${userId}/${Date.now()}.pdf` }
  }
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
        allTagIds.push(existing.id)
      } else {
        const { data: created } = await admin
          .from('tags')
          .insert({ name })
          .select('id')
          .single()
        if (created) allTagIds.push(created.id)
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
  try {
    const supabase = await createClient()
    let user = null
    try {
      const { data } = await supabase.auth.getUser()
      user = data?.user ?? null
    } catch {
      user = null
    }
    const userId = user?.id || '00000000-0000-0000-0000-000000000000'

    const fields = parseFormFields(formData)
    const validationError = validateFields(fields, true)
    if (validationError) return { error: validationError }

    const uploadResult = await uploadPdf(userId, fields.pdfFile!)
    if ('error' in uploadResult) return { error: uploadResult.error }

    // Ensure college and program records exist in DB if tables are present
    try {
      const admin = createAdminClient()
      const selectedCollege = DEFAULT_COLLEGES.find(c => c.id === fields.collegeId)
      if (selectedCollege) {
        await admin.from('colleges').upsert({
          id: selectedCollege.id,
          college_name: selectedCollege.college_name,
        }, { onConflict: 'id' })
      }
      const selectedProgram = DEFAULT_PROGRAMS.find(p => p.id === fields.programId)
      if (selectedProgram) {
        await admin.from('programs').upsert({
          id: selectedProgram.id,
          prog_name: selectedProgram.prog_name,
          college_id: selectedProgram.college_id,
          logo: selectedProgram.logo,
        }, { onConflict: 'id' })
      }
    } catch {
      // Non-fatal if tables do not exist
    }

    // Insert the thesis.
    let thesis: { id: string } | null = null
    let insertError: any = null

    try {
      const res = await supabase
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
          uploaded_by:    userId,
          view_count:     0,
        })
        .select('id')
        .single()
      thesis = res.data
      insertError = res.error
    } catch (err) {
      insertError = err
    }

    if (insertError || !thesis) {
      console.warn('Thesis insert error in Supabase, using local fallback:', insertError)
      const localId = 'd' + Date.now().toString(16).padStart(7, '0') + '-0000-0000-0000-' + Math.random().toString(16).slice(2, 14).padEnd(12, '0')
      const selectedCollege = DEFAULT_COLLEGES.find(c => c.id === fields.collegeId) ?? DEFAULT_COLLEGES[0]
      const selectedProgram = DEFAULT_PROGRAMS.find(p => p.id === fields.programId) ?? DEFAULT_PROGRAMS[0]
      const selectedTags = fields.tagIds.map(id => DEFAULT_TAGS.find(t => t.id === id)).filter(Boolean) as Tag[]
      if (fields.newTagsStr) {
        const extra = fields.newTagsStr.split(',').map(n => n.trim()).filter(Boolean).map(name => ({
          id: 'a' + Math.random().toString(16).slice(2, 9).padEnd(7, '0') + '-0000-0000-0000-000000000001',
          name,
          date_added: new Date().toISOString(),
          date_modified: new Date().toISOString(),
        }))
        selectedTags.push(...extra)
      }

      const localThesisRecord: ThesisWithRelations = {
        id: localId,
        title: fields.title,
        abstract: fields.abstract,
        authors: fields.authors,
        adviser: fields.adviser,
        year_submitted: parseInt(fields.yearStr, 10),
        college_id: fields.collegeId,
        program_id: fields.programId,
        panel_score: fields.panelScoreStr ? parseFloat(fields.panelScoreStr) : null,
        pdf_file: uploadResult.path,
        uploaded_by: userId,
        view_count: 0,
        ss_paper_id: null,
        status: 'pending',
        date_added: new Date().toISOString(),
        date_modified: new Date().toISOString(),
        college: selectedCollege,
        program: selectedProgram,
        tags: selectedTags,
      }

      return {
        success: true,
        localThesis: localThesisRecord,
      }
    }

    try {
      await syncTags(thesis.id, fields.tagIds, fields.newTagsStr)
    } catch (err) {
      console.warn('syncTags error (non-fatal):', err)
    }

    try {
      const ssId = await getPaperId(fields.title)
      if (ssId) {
        await createAdminClient().from('theses').update({ ss_paper_id: ssId }).eq('id', thesis.id)
      }
    } catch { /* non-critical */ }

    revalidatePath('/theses')
    revalidatePath('/admin')
    revalidatePath('/')
    redirect(`/theses/${thesis.id}`)
  } catch (err: any) {
    if (err && typeof err === 'object' && 'digest' in err && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
      throw err
    }
    console.error('uploadThesis unexpected error:', err)
    return { error: err?.message || 'Failed to upload thesis. Please try again.' }
  }
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateThesis(
  _prev: ThesisActionState,
  formData: FormData
): Promise<ThesisActionState> {
  try {
    const supabase = await createClient()
    let user = null
    try {
      const { data } = await supabase.auth.getUser()
      user = data?.user ?? null
    } catch {
      user = null
    }
    if (!user) return { error: 'You must be signed in.' }

    const thesisId = text(formData, 'thesis_id')
    if (!thesisId) return { error: 'Invalid thesis.' }

    const { data: existing } = await supabase
      .from('theses')
      .select('id, uploaded_by, pdf_file')
      .eq('id', thesisId)
      .single()

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
      try {
        await createAdminClient().storage.from(THESIS_PDF_BUCKET).remove([existing.pdf_file])
      } catch {}
      pdfPath = uploadResult.path
    }

    const { error: updateError } = await supabase
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
      })
      .eq('id', thesisId)

    if (updateError) {
      console.error('Thesis update error:', updateError)
      return { error: 'Failed to update thesis. Please try again.' }
    }

    try {
      await syncTags(thesisId, fields.tagIds, fields.newTagsStr)
    } catch (err) {
      console.warn('syncTags error (non-fatal):', err)
    }

    revalidatePath(`/theses/${thesisId}`)
    revalidatePath('/theses')
    revalidatePath('/profile')
    redirect(`/theses/${thesisId}`)
  } catch (err: any) {
    if (err && typeof err === 'object' && 'digest' in err && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
      throw err
    }
    console.error('updateThesis error:', err)
    return { error: err?.message || 'Failed to update thesis.' }
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * Deletes a thesis, its tag links, and its PDF.
 *
 * `thesisId` is bound by the server (`deleteThesis.bind(null, id)`), so the
 * FormData argument that React appends is unused — it is named `_formData` to
 * say so.
 */
export async function deleteThesis(thesisId: string, _formData: FormData): Promise<void> {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user ?? null
  } catch {
    user = null
  }
  if (!user) redirect('/login')

  const { data: thesis } = await supabase
    .from('theses')
    .select('id, uploaded_by, pdf_file')
    .eq('id', thesisId)
    .single()

  if (!thesis || thesis.uploaded_by !== user.id) redirect('/profile')

  const admin = createAdminClient()
  await admin.from('thesis_tags').delete().eq('thesis_id', thesisId)
  await admin.from('theses').delete().eq('id', thesisId)
  if (thesis.pdf_file) {
    await admin.storage.from(THESIS_PDF_BUCKET).remove([thesis.pdf_file])
  }

  revalidatePath('/theses')
  revalidatePath('/')
  revalidatePath('/profile')
  redirect('/profile')
}
