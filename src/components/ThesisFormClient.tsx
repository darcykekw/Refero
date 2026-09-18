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

  // Unified tag management state
  const [newTagsList, setNewTagsList] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false)
  const tagDropdownRef = useRef<HTMLDivElement>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)

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

  // Filtered unselected existing tags for search
  const availableUnselectedTags = useMemo(() => {
    const unselected = effectiveTags.filter(t => t && t.id && !selectedTagIds.includes(t.id))
    if (!tagInput.trim()) return unselected
    const q = tagInput.trim().toLowerCase()
    return unselected.filter(t => t.name.toLowerCase().includes(q))
  }, [effectiveTags, selectedTagIds, tagInput])

  // Does tagInput exactly match an already selected tag?
  const hasExactSelectedMatch = useMemo(() => {
    const clean = tagInput.trim().toLowerCase()
    if (!clean) return false
    const matchesExistingSelected = selectedTagIds.some(id => {
      const tag = effectiveTags.find(t => t.id === id)
      return tag?.name.toLowerCase() === clean
    })
    const matchesNewSelected = newTagsList.some(t => t.toLowerCase() === clean)
    return matchesExistingSelected || matchesNewSelected
  }, [tagInput, selectedTagIds, newTagsList, effectiveTags])

  // Select an existing tag
  const handleSelectExisting = useCallback((id: string) => {
    if (!id) return
    setSelectedTagIds(prev => (prev.includes(id) ? prev : [...prev, id]))
    setTagInput('')
    setIsTagDropdownOpen(false)
    tagInputRef.current?.focus()
  }, [])

  // Add tag (matches existing tag if found, else creates new tag)
  const handleAddTag = useCallback((rawName: string) => {
    const trimmed = rawName.trim()
    if (!trimmed) return

    const matchedExisting = effectiveTags.find(
      t => t.name.toLowerCase() === trimmed.toLowerCase()
    )

    if (matchedExisting) {
      if (!selectedTagIds.includes(matchedExisting.id)) {
        setSelectedTagIds(prev => [...prev, matchedExisting.id])
      }
    } else {
      const alreadyInNew = newTagsList.some(
        t => t.toLowerCase() === trimmed.toLowerCase()
      )
      if (!alreadyInNew) {
        setNewTagsList(prev => [...prev, trimmed])
      }
    }
    setTagInput('')
    setIsTagDropdownOpen(false)
  }, [effectiveTags, selectedTagIds, newTagsList])

  const handleRemoveExisting = useCallback((id: string) => {
    setSelectedTagIds(prev => prev.filter(tid => tid !== id))
  }, [])

  const handleRemoveNew = useCallback((name: string) => {
    setNewTagsList(prev => prev.filter(t => t.toLowerCase() !== name.toLowerCase()))
  }, [])

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const trimmed = tagInput.trim()
      if (!trimmed) return

      const exactMatch = availableUnselectedTags.find(
        t => t.name.toLowerCase() === trimmed.toLowerCase()
      )
      if (exactMatch) {
        handleSelectExisting(exactMatch.id)
      } else if (availableUnselectedTags.length > 0 && isTagDropdownOpen) {
        handleSelectExisting(availableUnselectedTags[0].id)
      } else {
        handleAddTag(trimmed)
      }
    } else if (e.key === 'Backspace' && !tagInput) {
      if (newTagsList.length > 0) {
        setNewTagsList(prev => prev.slice(0, -1))
      } else if (selectedTagIds.length > 0) {
        setSelectedTagIds(prev => prev.slice(0, -1))
      }
    } else if (e.key === 'Escape') {
      setIsTagDropdownOpen(false)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (text.includes(',')) {
      e.preventDefault()
      const parts = text.split(',').map(s => s.trim()).filter(Boolean)
      parts.forEach(p => handleAddTag(p))
    }
  }

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

      // Ensure any pending text in tagInput is included
      const pendingTag = tagInput.trim()
      let finalSelectedTagIds = [...selectedTagIds]
      let finalNewTags = [...newTagsList]
      if (pendingTag) {
        const match = effectiveTags.find(t => t.name.toLowerCase() === pendingTag.toLowerCase())
        if (match && !finalSelectedTagIds.includes(match.id)) {
          finalSelectedTagIds.push(match.id)
        } else if (!match && !finalNewTags.some(t => t.toLowerCase() === pendingTag.toLowerCase())) {
          finalNewTags.push(pendingTag)
        }
      }

      formData.delete('tag_ids')
      finalSelectedTagIds.forEach(id => formData.append('tag_ids', id))
      formData.set('new_tags', finalNewTags.join(', '))

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

      {/* Tags (Select existing or create new) */}
      <div className="relative space-y-2.5" ref={tagDropdownRef}>
        <div className="flex items-center justify-between">
          <label htmlFor="thesis-tags-input" className="block text-sm font-medium text-slate-700">
            Tags <span className="text-slate-400 font-normal">(select existing or type to create new)</span>
          </label>
          <span className="text-xs text-slate-400">
            Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-mono text-slate-600">Enter</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-mono text-slate-600">,</kbd> to add
          </span>
        </div>

        {/* Unified Search & Tag Input */}
        <div className="relative">
          <div className="relative flex items-center">
            <input
              ref={tagInputRef}
              id="thesis-tags-input"
              type="text"
              value={tagInput}
              onChange={e => {
                setTagInput(e.target.value)
                setIsTagDropdownOpen(true)
              }}
              onFocus={() => setIsTagDropdownOpen(true)}
              onKeyDown={handleTagInputKeyDown}
              onPaste={handlePaste}
              placeholder="Type to search existing tags or create a new tag..."
              className="input pr-10"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setIsTagDropdownOpen(prev => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Toggle tags list"
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

          {/* Autocomplete & Creation Dropdown */}
          {isTagDropdownOpen && (
            <div className="absolute z-20 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto py-1 divide-y divide-slate-100 animate-scale-in">
              {/* Option to create a new tag if what user typed isn't already selected */}
              {tagInput.trim() && !hasExactSelectedMatch && (
                <div className="p-1">
                  <button
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault()
                      handleAddTag(tagInput)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center justify-between cursor-pointer group"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="text-emerald-700">✨ Create new tag:</span>
                      <span className="font-bold underline decoration-emerald-600 decoration-1 underline-offset-2 truncate">
                        &ldquo;{tagInput.trim()}&rdquo;
                      </span>
                    </span>
                    <span className="shrink-0 ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-[#173B28] text-white group-hover:bg-[#122e1f]">
                      + Add Tag
                    </span>
                  </button>
                </div>
              )}

              {/* Matching / Available Existing Tags */}
              <div className="py-1">
                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {tagInput.trim() ? 'Matching Existing Tags' : 'Available Existing Tags'}
                </div>
                {availableUnselectedTags.length > 0 ? (
                  availableUnselectedTags.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onMouseDown={e => {
                        e.preventDefault()
                        handleSelectExisting(t.id)
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors flex items-center justify-between cursor-pointer group"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="text-slate-400 group-hover:text-emerald-700">🏷️</span>
                        <span className="font-semibold truncate">{t.name}</span>
                      </span>
                      <span className="text-[10px] text-emerald-800 font-bold opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                        + Select
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-slate-500 italic">
                    {tagInput.trim()
                      ? 'No existing tags match your query.'
                      : 'All existing tags have been selected.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Selected Tags List (Both existing and new custom) */}
        <div className="space-y-1.5">
          {/* Hidden inputs to pass data when submitting standard form */}
          {selectedTagIds.map(id => (
            <input key={`hidden-id-${id}`} type="hidden" name="tag_ids" value={id} />
          ))}
          <input type="hidden" name="new_tags" value={newTagsList.join(', ')} />

          {selectedTagIds.length > 0 || newTagsList.length > 0 ? (
            <div className="flex flex-wrap gap-2 p-3 border border-emerald-900/20 rounded-xl bg-emerald-50/40 min-h-[44px] items-center">
              {/* Existing tags chips */}
              {selectedTagIds.map(id => {
                const tag = effectiveTags.find(t => t.id === id) || initialData?.tags?.find(t => t.id === id)
                const name = tag?.name ?? id
                return (
                  <span
                    key={`existing-${id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs animate-fade-in"
                  >
                    <span>🏷️ {name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExisting(id)}
                      className="hover:text-red-700 hover:bg-emerald-200/80 rounded-full w-4 h-4 inline-flex items-center justify-center transition-colors font-bold text-sm cursor-pointer ml-0.5"
                      aria-label={`Remove tag ${name}`}
                    >
                      ×
                    </button>
                  </span>
                )
              })}

              {/* New tags chips */}
              {newTagsList.map(name => (
                <span
                  key={`new-${name}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-900 border border-sky-300 shadow-xs animate-fade-in"
                >
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 bg-sky-200/90 text-sky-800 rounded font-bold">
                    New
                  </span>
                  <span>{name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveNew(name)}
                    className="hover:text-red-700 hover:bg-sky-200/80 rounded-full w-4 h-4 inline-flex items-center justify-center transition-colors font-bold text-sm cursor-pointer ml-0.5"
                    aria-label={`Remove new tag ${name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              No tags selected. Type above to select existing tags or create custom ones.
            </p>
          )}
        </div>
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
