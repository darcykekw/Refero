'use client'

import { useActionState, useState } from 'react'
import type { College, Program, Tag, ThesisWithRelations } from '@/types/database'
import type { ThesisActionState } from '@/app/actions/thesis'

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

  const [selectedCollegeId, setSelectedCollegeId] = useState(initialData?.college_id ?? '')
  const [selectedProgramId, setSelectedProgramId] = useState(initialData?.program_id ?? '')

  const filteredPrograms = programs.filter(p => p.college_id === selectedCollegeId)

  const existingTagIds = new Set(initialData?.tags.map(t => t.id) ?? [])

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
      {/* Hidden thesis ID for edit mode */}
      {mode === 'edit' && initialData && (
        <input type="hidden" name="thesis_id" value={initialData.id} />
      )}

      {/* Error banner */}
      {state.error && (
        <div className="alert alert-error" role="alert">
          {state.error}
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

      {/* College + Program */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="thesis-college" className="block text-sm font-medium text-slate-700 mb-1">
            College <span className="text-red-500">*</span>
          </label>
          <select
            id="thesis-college"
            name="college_id"
            required
            value={selectedCollegeId}
            onChange={e => {
              setSelectedCollegeId(e.target.value)
              setSelectedProgramId('')
            }}
            className="input"
          >
            <option value="">Select a college…</option>
            {colleges.map(c => (
              <option key={c.id} value={c.id}>{c.college_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="thesis-program" className="block text-sm font-medium text-slate-700 mb-1">
            Program <span className="text-red-500">*</span>
          </label>
          <select
            id="thesis-program"
            name="program_id"
            required
            value={selectedProgramId}
            onChange={e => setSelectedProgramId(e.target.value)}
            disabled={!selectedCollegeId}
            className="input disabled:opacity-50"
          >
            <option value="">
              {selectedCollegeId ? 'Select a program…' : 'Select a college first'}
            </option>
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

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <p className="block text-sm font-medium text-slate-700 mb-2">Tags</p>
          <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-xl bg-slate-50 max-h-40 overflow-y-auto">
            {tags.map(tag => (
              <label key={tag.id} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  name="tag_ids"
                  value={tag.id}
                  defaultChecked={existingTagIds.has(tag.id)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-700">{tag.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* New tags */}
      <div>
        <label htmlFor="thesis-new-tags" className="block text-sm font-medium text-slate-700 mb-1">
          Add new tags <span className="text-slate-400 font-normal">(comma-separated)</span>
        </label>
        <input
          id="thesis-new-tags"
          name="new_tags"
          type="text"
          placeholder="e.g. machine learning, IoT, agriculture"
          className="input"
        />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <button
          id="thesis-submit-btn"
          type="submit"
          disabled={pending}
          className="btn btn-primary gap-2"
        >
          {pending && <span className="spinner" />}
          {pending
            ? mode === 'upload' ? 'Uploading…' : 'Saving…'
            : mode === 'upload' ? 'Upload Thesis' : 'Save Changes'}
        </button>
        <a href={mode === 'edit' && initialData ? `/theses/${initialData.id}` : '/theses'} className="btn btn-ghost">
          Cancel
        </a>
      </div>
    </form>
  )
}
