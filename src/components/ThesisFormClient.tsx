'use client'

import { useActionState, useState, useEffect, useTransition, useRef, useMemo, useCallback } from 'react'
import type { College, Program, Tag, ThesisWithRelations } from '@/types/database'
import type { ThesisActionState } from '@/app/actions/thesis'
import { DEFAULT_COLLEGES, DEFAULT_PROGRAMS, DEFAULT_TAGS } from '@/lib/constants/programs'
import { createClient } from '@/lib/supabase/client'

type ActionFn = (prev: ThesisActionState, formData: FormData) => Promise<ThesisActionState>

interface ThesisFormClientProps {
  colleges: College[]
  programs: Program[]
  tags: Tag[]
  action: ActionFn
  initialData?: ThesisWithRelations
  mode: 'upload' | 'edit'
  pdfPublicUrl?: string
}

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 30 }, (_, i) => currentYear - i)

export default function ThesisFormClient({
  colleges,
  programs,
  tags,
  action,
  initialData,
  mode,
  pdfPublicUrl,
}: ThesisFormClientProps) {
  const [state, formAction, pending] = useActionState<ThesisActionState, FormData>(action, {})
  const [isPending, startTransition] = useTransition()
  const [clientUploading, setClientUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [clientError, setClientError] = useState<string | null>(null)

  const effectiveColleges = (colleges && colleges.length > 0 ? colleges : DEFAULT_COLLEGES).filter(
    (c): c is College => Boolean(c && c.id && c.college_name)
  )
  const effectivePrograms = (programs && programs.length > 0 ? programs : DEFAULT_PROGRAMS).filter(
    (p): p is Program => Boolean(p && p.id && p.prog_name)
  )
  const effectiveTags = (tags && tags.length > 0 ? tags : DEFAULT_TAGS).filter(
    (t): t is Tag => Boolean(t && t.id && t.name)
  )

  const scienceCollege = effectiveColleges.find(c => c.college_name.toLowerCase().includes('science')) || effectiveColleges[0]
  const initialCollegeId = initialData?.college_id || scienceCollege?.id || (effectiveColleges.length > 0 ? effectiveColleges[0].id : '')
  const [selectedCollegeId] = useState(initialCollegeId)
  const [selectedProgramId, setSelectedProgramId] = useState(initialData?.program_id ?? '')

  const filteredPrograms = effectivePrograms.filter(
    p => !selectedCollegeId || p.college_id === selectedCollegeId || effectiveColleges.length === 1
  )
  const hasNoPrograms = filteredPrograms.length === 0

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(() => {
    return (initialData?.tags ?? [])
      .map(t => (t && typeof t === 'object' && 'id' in t ? t.id : ''))
      .filter(Boolean)
  })

  // Tag search combobox and suggestions state
  const [tagSearchQuery, setTagSearchQuery] = useState('')
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false)
  const [newTagsInput, setNewTagsInput] = useState('')
  const tagDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Filtered unselected existing tags for the search input
  const availableUnselectedTags = useMemo(() => {
    const unselected = effectiveTags.filter(t => t && t.id && !selectedTagIds.includes(t.id))
    if (!tagSearchQuery.trim()) return unselected
    const q = tagSearchQuery.trim().toLowerCase()
    return unselected.filter(t => t.name.toLowerCase().includes(q))
  }, [effectiveTags, selectedTagIds, tagSearchQuery])

  // Select existing tag handler
  const handleSelectTag = useCallback((id: string) => {
    if (!id) return
    setSelectedTagIds(prev => (prev.includes(id) ? prev : [...prev, id]))
    setTagSearchQuery('')
    setIsTagDropdownOpen(false)
  }, [])

  // Matching existing tags suggestion when user types in the "new tags" input
  const matchingExistingForNewTags = useMemo(() => {
    if (!newTagsInput.trim()) return []
    const segments = newTagsInput
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length >= 2)
    if (segments.length === 0) return []

    return effectiveTags
      .filter(t => t && t.id && !selectedTagIds.includes(t.id))
      .filter(t => {
        const lower = t.name.toLowerCase()
        return segments.some(seg => lower.includes(seg) || seg.includes(lower))
      })
      .slice(0, 8)
  }, [newTagsInput, effectiveTags, selectedTagIds])

  useEffect(() => {
    if (state.success && state.localThesis) {
      try {
        const raw = localStorage.getItem('refero_user_theses_v1')
        const existing: ThesisWithRelations[] = raw ? JSON.parse(raw) : []
        const updated = [state.localThesis, ...existing.filter(t => t.id !== state.localThesis!.id)]
        localStorage.setItem('refero_user_theses_v1', JSON.stringify(updated))

        window.dispatchEvent(new CustomEvent('refero-thesis-uploaded', {
          detail: { thesis: state.localThesis }
        }))
      } catch (err) {
        console.warn('Failed to save thesis locally:', err)
      }

      window.location.href = '/theses?uploaded=true'
    }
  }, [state.success, state.localThesis])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setClientError(null)

    const form = e.currentTarget
    const fileInput = form.querySelector<HTMLInputElement>('#thesis-pdf')
    const file = fileInput?.files?.[0]

    if (mode === 'upload' && !file && !initialData?.pdf_file) {
      setClientError('Please select a PDF file.')
      return
    }

    if (file && file.size > 20 * 1024 * 1024) {
      setClientError('PDF file must be under 20 MB.')
      return
    }

    const titleInput = form.querySelector<HTMLInputElement>('#thesis-title')
    if (!titleInput?.value || titleInput.value.trim().length < 3) {
      setClientError('Title must be at least 3 characters.')
      return
    }

    const abstractInput = form.querySelector<HTMLTextAreaElement>('#thesis-abstract')
    if (!abstractInput?.value || abstractInput.value.trim().length < 10) {
      setClientError('Abstract must be at least 10 characters.')
      return
    }

    const authorsInput = form.querySelector<HTMLInputElement>('#thesis-authors')
    if (!authorsInput?.value || authorsInput.value.trim().length === 0) {
      setClientError('Authors field is required.')
      return
    }

    if (!selectedCollegeId) {
      setClientError('Please select a college.')
      return
    }

    if (!selectedProgramId) {
      setClientError('Please select a program.')
      return
    }

    try {
      setClientUploading(true)
      let pdfPath = ''

      if (file) {
        setUploadStatus('Uploading PDF manuscript...')
        const supabase = createClient()
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError || !userData?.user) {
          setClientError('You must be signed in to upload a thesis. Please sign in and try again.')
          setClientUploading(false)
          setUploadStatus(null)
          return
        }

        const userId = userData.user.id
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${userId}/${Date.now()}_${cleanName}`

        const { error: uploadError } = await supabase.storage
          .from('thesis-pdfs')
          .upload(path, file, {
            contentType: 'application/pdf',
            upsert: true,
          })

        if (uploadError) {
          console.error('Direct Supabase upload error:', uploadError)
          setClientError(`PDF upload failed: ${uploadError.message}. Please try again.`)
          setClientUploading(false)
          setUploadStatus(null)
          return
        }

        pdfPath = path
      }

      setUploadStatus('Saving thesis information...')
      const formData = new FormData(form)
      if (pdfPath) {
        formData.set('pdf_path', pdfPath)
        formData.delete('pdf_file')
      }

      startTransition(async () => {
        try {
          await formAction(formData)
        } catch (err: any) {
          console.error('formAction error:', err)
          setClientError(err?.message || 'Failed to submit thesis. Please try again.')
        } finally {
          setClientUploading(false)
          setUploadStatus(null)
        }
      })
    } catch (err: any) {
      console.error('Submission error:', err)
      setClientError(err?.message || 'An error occurred while uploading. Please try again.')
      setClientUploading(false)
      setUploadStatus(null)
    }
  }

  const isBusy = pending || clientUploading || isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Hidden thesis ID for edit mode */}
      {mode === 'edit' && initialData && (
        <input type="hidden" name="thesis_id" value={initialData.id} />
      )}

      {/* Error banner */}
      {(clientError || state.error) && (
        <div className="alert alert-error" role="alert">
          {clientError || state.error}
        </div>
      )}

      {/* Progress banner */}
      {uploadStatus && (
        <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium animate-pulse">
          <span className="spinner text-emerald-600" />
          <span>{uploadStatus}</span>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="thesis-title" className="block text-sm font-medium text-slate-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="thesis-title"
          name="title"
          type="text"
          required
          defaultValue={initialData?.title}
          placeholder="Full title of the thesis"
          className="input"
        />
      </div>

      {/* Abstract */}
      <div>
        <label htmlFor="thesis-abstract" className="block text-sm font-medium text-slate-700 mb-1">
          Abstract <span className="text-red-500">*</span>
        </label>
        <textarea
          id="thesis-abstract"
          name="abstract"
          required
          rows={6}
          defaultValue={initialData?.abstract}
          placeholder="Summary of the thesis research and findings"
          className="input resize-none"
        />
      </div>

      {/* Authors + Adviser */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="thesis-authors" className="block text-sm font-medium text-slate-700 mb-1">
            Authors <span className="text-red-500">*</span>
          </label>
          <input
            id="thesis-authors"
            name="authors"
            type="text"
            required
            defaultValue={initialData?.authors}
            placeholder="e.g. Juan Dela Cruz, Maria Santos"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="thesis-adviser" className="block text-sm font-medium text-slate-700 mb-1">
            Adviser <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="thesis-adviser"
            name="adviser"
            type="text"
            defaultValue={initialData?.adviser ?? ''}
            placeholder="e.g. Dr. Jose Rizal"
            className="input"
          />
        </div>
      </div>

      {/* Year + Panel Score */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="thesis-year" className="block text-sm font-medium text-slate-700 mb-1">
            Year Submitted <span className="text-red-500">*</span>
          </label>
          <select
            id="thesis-year"
            name="year_submitted"
            required
            defaultValue={initialData?.year_submitted ?? currentYear}
            className="input"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="thesis-panel-score" className="block text-sm font-medium text-slate-700 mb-1">
            Panel Score <span className="text-slate-400 font-normal">(optional, 0–100)</span>
          </label>
          <input
            id="thesis-panel-score"
            name="panel_score"
            type="number"
            min={0}
            max={100}
            step={0.1}
            defaultValue={initialData?.panel_score ?? ''}
            placeholder="e.g. 87.5"
            className="input"
          />
        </div>
      </div>

      {/* College (Fixed to College of Sciences) + Degree Program */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            College <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full ml-1">Exclusive Repository</span>
          </label>
          <input type="hidden" name="college_id" value={selectedCollegeId} />
          <div
            className="input flex items-center font-semibold"
            style={{
              backgroundColor: '#F3F6F3',
              color: '#173B28',
              border: '1.5px solid #8FA885',
              cursor: 'default',
            }}
          >
            <span>{scienceCollege?.college_name || 'College of Sciences'}</span>
          </div>
        </div>
        <div>
          <label htmlFor="thesis-program" className="block text-sm font-medium text-slate-700 mb-1">
            Degree Program <span className="text-red-500">*</span>
          </label>
          <select
            id="thesis-program"
            name="program_id"
            required
            value={selectedProgramId}
            onChange={e => setSelectedProgramId(e.target.value)}
            className="input"
          >
            <option value="">Select degree program…</option>
            {filteredPrograms.map(p => (
              <option key={p.id} value={p.id}>{p.prog_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* PDF upload */}
      <div>
        <label htmlFor="thesis-pdf" className="block text-sm font-medium text-slate-700 mb-1">
          PDF File {mode === 'upload' && <span className="text-red-500">*</span>}
          {mode === 'edit' && (
            <span className="text-slate-400 font-normal"> — leave blank to keep existing</span>
          )}
        </label>

        {mode === 'edit' && pdfPublicUrl && (
          <a
            href={pdfPublicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sky-600 hover:text-sky-700 text-sm mb-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View current PDF
          </a>
        )}

        <input
          id="thesis-pdf"
          name="pdf_file"
          type="file"
          accept="application/pdf,.pdf"
          required={mode === 'upload'}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
        />
        <p className="text-xs text-slate-400 mt-1">PDF only, max 20 MB</p>
      </div>

      {/* Existing Tags (Search & Select Dropdown Combobox) */}
      <div className="relative" ref={tagDropdownRef}>
        <label htmlFor="thesis-tags-search-input" className="block text-sm font-medium text-slate-700 mb-1">
          Existing Tags <span className="text-slate-400 font-normal">(type to search or select from dropdown)</span>
        </label>
        <div className="space-y-3">
          <div className="relative">
            <div className="relative flex items-center">
              <input
                id="thesis-tags-search-input"
                type="text"
                value={tagSearchQuery}
                onChange={e => {
                  setTagSearchQuery(e.target.value)
                  setIsTagDropdownOpen(true)
                }}
                onFocus={() => setIsTagDropdownOpen(true)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (availableUnselectedTags.length > 0) {
                      handleSelectTag(availableUnselectedTags[0].id)
                    }
                  } else if (e.key === 'Escape') {
                    setIsTagDropdownOpen(false)
                  }
                }}
                placeholder="Type to search existing tags (e.g. AI, Bioinformatics)..."
                className="input pr-10"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setIsTagDropdownOpen(prev => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Toggle existing tags list"
                tabIndex={-1}
              >
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isTagDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Dropdown Menu */}
            {isTagDropdownOpen && (
              <div className="absolute z-20 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1 animate-scale-in">
                {availableUnselectedTags.length > 0 ? (
                  availableUnselectedTags.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTag(t.id)}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors flex items-center justify-between cursor-pointer group"
                    >
                      <span>{t.name}</span>
                      <span className="text-[10px] text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                        + Select
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3.5 py-3 text-xs text-slate-500 text-center">
                    {tagSearchQuery.trim() ? (
                      <div>
                        No existing tags match &ldquo;{tagSearchQuery}&rdquo;.
                        <div className="mt-1 text-[11px] text-emerald-800">
                          You can add it as a new tag in the field below!
                        </div>
                      </div>
                    ) : (
                      'All available tags have already been selected.'
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Tag Badges */}
          {selectedTagIds.length > 0 ? (
            <div className="flex flex-wrap gap-2 p-3 border border-emerald-900/20 rounded-xl bg-emerald-50/40 min-h-[44px] items-center">
              {selectedTagIds.map(id => {
                const tag = effectiveTags.find(t => t.id === id) || initialData?.tags?.find(t => t.id === id)
                const name = tag?.name ?? id
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs"
                  >
                    <input type="hidden" name="tag_ids" value={id} />
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTagIds(prev => prev.filter(tid => tid !== id))}
                      className="hover:text-red-700 hover:bg-emerald-200/80 rounded-full w-4 h-4 inline-flex items-center justify-center transition-colors font-bold text-sm cursor-pointer"
                      aria-label={`Remove ${name}`}
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No existing tags selected. Use the search or dropdown above to choose tags.</p>
          )}
        </div>
      </div>

      {/* New tags */}
      <div>
        <label htmlFor="thesis-new-tags" className="block text-sm font-medium text-slate-700 mb-1">
          Add new tags <span className="text-slate-400 font-normal">(comma-separated)</span>
        </label>
        <input
          id="thesis-new-tags"
          name="new_tags"
          type="text"
          value={newTagsInput}
          onChange={e => setNewTagsInput(e.target.value)}
          placeholder="e.g. machine learning, IoT, agriculture"
          className="input"
        />

        {/* Real-time matching existing tags suggestions */}
        {matchingExistingForNewTags.length > 0 && (
          <div className="mt-2 p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl animate-fade-in">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-1.5">
              <span>💡 Existing tags match what you typed:</span>
              <span className="text-[11px] font-normal text-emerald-700">(click to select existing tag)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {matchingExistingForNewTags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    handleSelectTag(tag.id)
                    // Remove matching segment from newTagsInput
                    setNewTagsInput(prev => {
                      return prev
                        .split(',')
                        .map(s => s.trim())
                        .filter(s => s.toLowerCase() !== tag.name.toLowerCase() && !tag.name.toLowerCase().includes(s.toLowerCase()))
                        .join(', ')
                    })
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-900 hover:bg-[#173B28] hover:text-white hover:border-[#173B28] transition-all cursor-pointer shadow-xs"
                  title={`Select existing tag: ${tag.name}`}
                >
                  <span>+ {tag.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <button
          id="thesis-submit-btn"
          type="submit"
          disabled={isBusy}
          className="btn btn-primary gap-2"
        >
          {isBusy && <span className="spinner" />}
          {uploadStatus || (isBusy
            ? mode === 'upload' ? 'Saving…' : 'Saving…'
            : mode === 'upload' ? 'Upload Thesis' : 'Save Changes')}
        </button>
        <a href={mode === 'edit' && initialData ? `/theses/${initialData.id}` : '/theses'} className="btn btn-ghost">
          Cancel
        </a>
      </div>
    </form>
  )
}
