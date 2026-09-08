import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { getThesisById, incrementThesisViews } from '@/lib/data'
import { getThesisPdfUrl } from '@/lib/storage'
import { getThesisRecommendations, type SSPaper } from '@/lib/semantic-scholar'
import BookmarkButton from '@/components/bookmarks/BookmarkButton'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  // getThesisById is request-cached, so this shares one query with the page below.
  const thesis = await getThesisById(id)
  if (!thesis) return { title: 'Thesis Not Found' }
  return {
    title: thesis.title,
    description: thesis.abstract.length > 155
      ? thesis.abstract.slice(0, 155).trimEnd() + '…'
      : thesis.abstract,
  }
}

export default async function ThesisDetailPage({ params }: PageProps) {
  const { id } = await params
  const thesis = await getThesisById(id)
  if (!thesis) notFound()

  // Current user (for edit/delete buttons), the atomic view bump, and a
  // time-limited PDF link — all independent, so run them together.
  const [user, viewCount, pdfUrl] = await Promise.all([
    getCurrentUser(),
    incrementThesisViews(id),
    getThesisPdfUrl(thesis.pdf_file),
  ])
  const isOwner = user?.id === thesis.uploaded_by

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
            {thesis.college.college_name} · {thesis.program.prog_name}
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
            {(viewCount ?? thesis.view_count).toLocaleString()} views
          </span>
        </div>

        {/* Tags */}
        {thesis.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {thesis.tags.map(tag => (
              <Link key={tag.id} href={`/theses?tag=${tag.id}`} className="tag-chip">
                {tag.name}
              </Link>
            ))}
          </div>
        )}

        {/* Actions bar: Bookmark & Owner actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <BookmarkButton
            thesisId={thesis.id}
            thesisTitle={thesis.title}
            variant="button"
            size="sm"
          />

          {isOwner && (
            <Link href={`/theses/${thesis.id}/edit`} className="btn btn-ghost btn-sm">
              Edit thesis
            </Link>
          )}
        </div>
      </div>

      {/* Abstract */}
      <section className="card p-5 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Abstract</h2>
        <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm sm:text-base">{thesis.abstract}</p>
      </section>

      {/* PDF viewer */}
      {thesis.pdf_file && (
        <section className="card p-5 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-800">Full Document</h2>
            {pdfUrl && (
              <a
                href={pdfUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm w-full sm:w-auto"
              >
                Download PDF
              </a>
            )}
          </div>
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title={`PDF: ${thesis.title}`}
              className="w-full rounded-xl border border-slate-200"
              style={{ height: '65vh', minHeight: '380px' }}
            />
          ) : (
            <p className="text-sm text-slate-500">
              This PDF is temporarily unavailable. Please try again in a moment.
            </p>
          )}
        </section>
      )}

      {/* Semantic Scholar recommendations.
          Behind a Suspense boundary because fetching them means one or two
          round-trips to an external API. Awaiting it inline — as this page used
          to, despite a comment claiming otherwise — held the entire thesis back
          until Semantic Scholar answered. */}
      <Suspense fallback={<RelatedPapersSkeleton />}>
        <RelatedPapers title={thesis.title} ssPaperId={thesis.ss_paper_id} />
      </Suspense>

    </div>
  )
}

// ── Related papers ────────────────────────────────────────────────────────────

async function RelatedPapers({
  title,
  ssPaperId,
}: {
  title: string
  ssPaperId: string | null
}) {
  let recommendations: SSPaper[] = []
  try {
    recommendations = await getThesisRecommendations(title, ssPaperId)
  } catch {
    /* graceful fallback */
  }

  if (recommendations.length === 0) return null

  return (
    <section className="space-y-4">
      <div className="section-header">
        <div className="flex items-center gap-2">
          <h2 className="section-title text-xl">Related Research Papers</h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-200/60">
            Semantic Scholar
          </span>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map(paper => {
          const paperLink =
            paper.s2Url ||
            paper.url ||
            `https://www.semanticscholar.org/search?q=${encodeURIComponent(paper.title)}`

          return (
            <a
              key={paper.paperId}
              href={paperLink}
              target="_blank"
              rel="noopener noreferrer"
              className="card card-hover p-5 space-y-2.5 block group transition-all duration-200"
              style={{
                borderTop: '3px solid #386641',
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm text-slate-800 leading-snug line-clamp-2 group-hover:text-emerald-800 transition-colors">
                  {paper.title}
                </p>
                <span className="text-slate-400 group-hover:text-emerald-700 transition-colors shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                {paper.authors.length > 0 && (
                  <span className="line-clamp-1">{paper.authors.map(a => a.name).join(', ')}</span>
                )}
                {paper.year && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-medium text-[11px]">
                    {paper.year}
                  </span>
                )}
              </div>
              {paper.abstract && (
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {paper.abstract}
                </p>
              )}
            </a>
          )
        })}
      </div>
    </section>
  )
}

function RelatedPapersSkeleton() {
  return (
    <section aria-hidden="true">
      <div className="h-6 w-40 rounded skeleton mb-4" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="card p-4 space-y-2">
            <div className="h-4 w-full rounded skeleton" />
            <div className="h-3 w-2/3 rounded skeleton" />
            <div className="h-3 w-full rounded skeleton" />
          </div>
        ))}
      </div>
    </section>
  )
}
