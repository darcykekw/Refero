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

  const isRejected = thesis.status === 'rejected'
  const isPending = thesis.status === 'pending'
  const isVerified = thesis.status === 'verified' || (!thesis.status && !isRejected && !isPending)

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

      {/* Rejection Alert Banner */}
      {isRejected && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50/95 p-5 sm:p-6 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-xl">
              ✕
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-red-900">
                  Research Submission Rejected
                </h2>
                <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
                  Rejected by Admin
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-red-700">
                This research submission was reviewed by the administrator and has been rejected. It is not visible in the public repository catalog.
              </p>
              
              <div className="mt-3 rounded-xl border border-red-200 bg-white/90 p-3.5 sm:p-4 text-sm shadow-inner">
                <span className="text-xs font-bold uppercase tracking-wider text-red-800 block mb-1">
                  Reason for Rejection:
                </span>
                <p className="text-red-950 font-medium whitespace-pre-wrap leading-relaxed">
                  {thesis.rejection_reason || 'Does not meet institutional submission guidelines or formatting requirements.'}
                </p>
              </div>

              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-red-200/60">
                <p className="text-xs text-red-800">
                  You can revise your manuscript details or re-upload your PDF and resubmit.
                </p>
                <Link
                  href={`/theses/${thesis.id}/edit`}
                  className="btn btn-sm bg-red-600 hover:bg-red-700 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg border-0 inline-flex items-center gap-1.5 shrink-0"
                >
                  Edit &amp; Resubmit Thesis →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Under Review Notice Banner */}
      {isPending && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 sm:p-5 shadow-sm flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-base">
            ⏳
          </div>
          <div className="flex-1">
            <h2 className="text-sm sm:text-base font-bold text-amber-900">
              Research Submission Under Review
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-amber-800">
              This manuscript is currently pending administrator verification before being made visible to the general public catalog.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="card p-5 sm:p-8 space-y-4">
        <div>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
              {thesis.college?.college_name ?? 'College of Sciences'} · {thesis.program?.prog_name ?? 'Sciences'}
            </p>
            {isRejected && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300 shadow-sm">
                ✕ Rejected
              </span>
            )}
            {isPending && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-sm">
                ⏳ Under Review
              </span>
            )}
            {isVerified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm">
                ✓ Verified
              </span>
            )}
          </div>
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
