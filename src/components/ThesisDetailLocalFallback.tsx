'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { ThesisWithRelations } from '@/types/database'
import BookmarkButton from '@/components/bookmarks/BookmarkButton'

interface ThesisDetailLocalFallbackProps {
  id: string
}

export default function ThesisDetailLocalFallback({ id }: ThesisDetailLocalFallbackProps) {
  const [thesis, setThesis] = useState<ThesisWithRelations | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('refero_user_theses_v1')
      if (raw) {
        const parsed: ThesisWithRelations[] = JSON.parse(raw)
        const match = parsed.find(t => t.id === id)
        if (match) {
          setThesis(match)
        }
      }
    } catch {}
    setLoading(false)
  }, [id])

  if (loading) {
    return (
      <div className="w-full max-w-5xl page-gutter py-12 text-center">
        <span className="spinner text-emerald-800" />
        <p className="text-sm text-slate-500 mt-2">Loading thesis manuscript…</p>
      </div>
    )
  }

  if (!thesis) {
    return (
      <div className="w-full max-w-4xl page-gutter py-12 text-center">
        <div className="card p-10 space-y-4">
          <div className="text-4xl mb-2">🔍</div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Thesis Not Found</h1>
          <p className="text-sm text-slate-500">The requested thesis manuscript could not be found or may have been removed.</p>
          <Link href="/theses" className="btn btn-primary btn-sm inline-flex mt-4">
            Back to Theses
          </Link>
        </div>
      </div>
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vfnzodlxtumhfmoyerye.supabase.co'
  const pdfPublicUrl = thesis.pdf_file
    ? (thesis.pdf_file.startsWith('http') ? thesis.pdf_file : `${supabaseUrl}/storage/v1/object/public/thesis-pdfs/${thesis.pdf_file}`)
    : null

  return (
    <div className="w-full max-w-5xl page-gutter py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Breadcrumb */}
      <nav className="breadcrumb-bar" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className="divider">/</span>
        <Link href="/theses">Theses</Link>
        <span className="divider">/</span>
        <span className="current truncate max-w-[200px] sm:max-w-md">{thesis.title}</span>
      </nav>

      {/* Header */}
      <div className="card p-5 sm:p-8 space-y-4">
        <div>
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-2">
            {thesis.college?.college_name ?? 'College of Sciences'} · {thesis.program?.prog_name ?? 'Sciences'}
          </p>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 leading-snug">{thesis.title}</h1>
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-500 border-t border-slate-100 pt-4">
          <span><strong className="text-slate-700">Authors:</strong> {thesis.authors}</span>
          {thesis.adviser && <span><strong className="text-slate-700">Adviser:</strong> {thesis.adviser}</span>}
          <span><strong className="text-slate-700">Year:</strong> {thesis.year_submitted}</span>
          {thesis.panel_score != null && (
            <span className="flex items-center gap-1 text-sky-600 font-semibold">
              ★ Panel Score: {thesis.panel_score.toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {(thesis.view_count || 1).toLocaleString()} views
          </span>
        </div>

        {/* Tags */}
        {(thesis.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {thesis.tags.map(tag => (
              <Link key={tag.id} href={`/theses?tag=${tag.id}`} className="tag-chip">
                {tag.name}
              </Link>
            ))}
          </div>
        )}

        {/* Actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <BookmarkButton
            thesisId={thesis.id}
            thesisTitle={thesis.title}
            variant="button"
            size="sm"
          />

          <Link href={`/theses/${thesis.id}/edit`} className="btn btn-ghost btn-sm">
            Edit thesis
          </Link>
        </div>
      </div>

      {/* Abstract */}
      <section className="card p-5 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Abstract</h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed whitespace-pre-line">
          {thesis.abstract}
        </p>
      </section>

      {/* PDF Viewer / Download */}
      {pdfPublicUrl && (
        <section className="card p-5 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Thesis Manuscript (PDF)</h2>
            <a
              href={pdfPublicUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="btn btn-primary btn-sm"
            >
              Download PDF ↗
            </a>
          </div>
          <iframe
            src={pdfPublicUrl}
            title={thesis.title}
            className="w-full h-[600px] rounded-lg border border-slate-200"
          />
        </section>
      )}
    </div>
  )
}
