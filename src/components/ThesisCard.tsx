import Link from 'next/link'
import type { ThesisWithRelations } from '@/types/database'

interface ThesisCardProps {
  thesis: ThesisWithRelations
  /** Show edit/delete links (for owner view) */
  showActions?: boolean
  /** Currently active tag names for highlight state */
  activeTags?: string[]
}

export default function ThesisCard({ thesis, showActions = false, activeTags = [] }: ThesisCardProps) {
  const abstract = thesis.abstract.length > 200
    ? thesis.abstract.slice(0, 200).trimEnd() + '…'
    : thesis.abstract

  return (
    <article className="card card-hover p-5 flex flex-col gap-3 relative group">
      {/* Meta breadcrumb */}
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
        {thesis.college.college_name} · {thesis.program.prog_name}
      </p>

      {/* Title */}
      <div>
        <Link
          href={`/theses/${thesis.id}`}
          className="text-lg font-semibold text-slate-900 leading-snug hover:text-sky-600 transition-colors line-clamp-2"
        >
          {thesis.title}
        </Link>
        <p className="text-sm text-slate-500 mt-1">{thesis.authors} · {thesis.year_submitted}</p>
      </div>

      {/* Abstract excerpt */}
      <p className="text-sm text-slate-600 leading-relaxed flex-1">{abstract}</p>

      {/* Tags */}
      {thesis.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {thesis.tags.slice(0, 5).map(tag => (
            <Link
              key={tag.id}
              href={`/theses?tag=${encodeURIComponent(tag.id)}`}
              className={`tag-chip text-[11px] ${activeTags.includes(tag.name) ? 'is-active' : ''}`}
            >
              {tag.name}
            </Link>
          ))}
        </div>
      )}

      {/* Footer: views + panel score + actions */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-auto">
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {thesis.view_count.toLocaleString()} views
        </span>

        <div className="flex items-center gap-3">
          {thesis.panel_score != null && (
            <span className="flex items-center gap-1 text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
              ★ {thesis.panel_score.toFixed(1)}
            </span>
          )}

          {showActions && (
            <div className="flex items-center gap-2">
              <Link
                href={`/theses/${thesis.id}/edit`}
                className="text-xs font-medium text-sky-600 hover:text-sky-700"
              >
                Edit
              </Link>
              <Link
                href={`/theses/${thesis.id}/edit?delete=1#delete`}
                className="text-xs font-medium text-red-500 hover:text-red-600"
              >
                Delete
              </Link>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
