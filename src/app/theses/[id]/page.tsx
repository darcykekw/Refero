import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getThesisById } from '@/lib/data'
import { getThesisRecommendations } from '@/lib/semantic-scholar'
import type { SSPaper } from '@/lib/semantic-scholar'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const thesis = await getThesisById(id)
  if (!thesis) return { title: 'Thesis Not Found' }
  return {
    title: thesis.title,
    description: thesis.abstract.slice(0, 155) + '…',
  }
}

export default async function ThesisDetailPage({ params }: PageProps) {
  const { id } = await params
  const thesis = await getThesisById(id)
  if (!thesis) notFound()

  // Increment view count (service role bypasses RLS)
  const admin = createAdminClient()
  await admin
    .from('theses')
    .update({ view_count: thesis.view_count + 1 })
    .eq('id', id)

  // Current user (for edit/delete buttons)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = user?.id === thesis.uploaded_by

  // Public PDF URL
  const { data: { publicUrl } } = admin.storage
    .from('thesis-pdfs')
    .getPublicUrl(thesis.pdf_file)

  // Semantic Scholar recommendations (non-blocking)
  let recommendations: SSPaper[] = []
  try {
    recommendations = await getThesisRecommendations(thesis.title, thesis.ss_paper_id)
  } catch { /* graceful fallback */ }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/" className="hover:text-slate-600">Home</Link>
        <span>/</span>
        <Link href="/theses" className="hover:text-slate-600">Theses</Link>
        <span>/</span>
        <span className="text-slate-600 truncate max-w-xs">{thesis.title}</span>
      </nav>

      {/* Header */}
      <div className="card p-6 sm:p-8 space-y-4">
        <div>
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-2">
            {thesis.college.college_name} · {thesis.program.prog_name}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug">{thesis.title}</h1>
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 border-t border-slate-100 pt-4">
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
            {(thesis.view_count + 1).toLocaleString()} views
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

        {/* Owner actions */}
        {isOwner && (
          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <Link href={`/theses/${thesis.id}/edit`} className="btn btn-ghost btn-sm">
              Edit thesis
            </Link>
          </div>
        )}
      </div>

      {/* Abstract */}
      <section className="card p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Abstract</h2>
        <p className="text-slate-600 leading-relaxed whitespace-pre-line">{thesis.abstract}</p>
      </section>

      {/* PDF viewer */}
      {thesis.pdf_file && (
        <section className="card p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Full Document</h2>
            <a
              href={publicUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
            >
              Download PDF
            </a>
          </div>
          <iframe
            src={publicUrl}
            title={`PDF: ${thesis.title}`}
            className="w-full rounded-xl border border-slate-200"
            style={{ height: '70vh' }}
          />
        </section>
      )}

      {/* Semantic Scholar recommendations */}
      {recommendations.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-5 w-1 rounded-full bg-sky-600" />
            <h2 className="text-xl font-bold text-slate-800">Related Papers</h2>
            <span className="text-xs text-slate-400 ml-1">via Semantic Scholar</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map(paper => (
              <a
                key={paper.paperId}
                href={`https://www.semanticscholar.org/paper/${paper.paperId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="card card-hover p-4 space-y-2 block"
              >
                <p className="font-semibold text-sm text-slate-800 leading-snug line-clamp-2">
                  {paper.title}
                </p>
                <p className="text-xs text-slate-400">
                  {paper.authors.map(a => a.name).join(', ')}
                  {paper.year ? ` · ${paper.year}` : ''}
                </p>
                {paper.abstract && (
                  <p className="text-xs text-slate-500 line-clamp-3">{paper.abstract}</p>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
