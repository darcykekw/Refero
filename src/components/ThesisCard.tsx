'use client'

import Link from 'next/link'
import type { ThesisWithRelations } from '@/types/database'
import BookmarkButton from '@/components/bookmarks/BookmarkButton'

interface ThesisCardProps {
  thesis: ThesisWithRelations
  showActions?: boolean
  activeTags?: string[]
  isBookmarked?: boolean
}

export default function ThesisCard({
  thesis,
  showActions = false,
  activeTags = [],
  isBookmarked = false,
}: ThesisCardProps) {
  const abstract = thesis.abstract.length > 180
    ? thesis.abstract.slice(0, 180).trimEnd() + '…'
    : thesis.abstract

  const isRejected = thesis.status === 'rejected'
  const isPending = thesis.status === 'pending'
  const isVerified = thesis.status === 'verified' || (!thesis.status && !isRejected && !isPending)

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* Verified Stamp Overlay on top-right */}
      {isVerified && (
        <img
          src="/verify.png"
          alt="Verified Thesis"
          title="Verified by Refero Admin"
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
            zIndex: 10,
            width: 36,
            height: 36,
            filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.25))',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Rejected Status Badge on top-right */}
      {isRejected && (
        <span
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
            zIndex: 10,
            padding: '0.25rem 0.65rem',
            background: '#FEF2F2',
            color: '#B91C1C',
            border: '1.5px solid #F87171',
            borderRadius: 999,
            fontSize: '0.6875rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            boxShadow: '0 2px 8px rgba(185, 28, 28, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>✕</span>
          <span>Rejected</span>
        </span>
      )}

      {/* Pending Status Badge on top-right */}
      {isPending && (
        <span
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
            zIndex: 10,
            padding: '0.25rem 0.65rem',
            background: '#FFFBEB',
            color: '#B45309',
            border: '1.5px solid #FCD34D',
            borderRadius: 999,
            fontSize: '0.6875rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            boxShadow: '0 2px 8px rgba(180, 83, 9, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>⏳</span>
          <span>Under Review</span>
        </span>
      )}

      <article
        className="card card-hover"
        style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', height: '100%' }}
      >
        {/* Top accent border */}
        <div
          style={{
            height: 3,
            background: isRejected
              ? 'linear-gradient(90deg, #DC2626, #F87171)'
              : isPending
                ? 'linear-gradient(90deg, #D97706, #FBBF24)'
                : 'linear-gradient(90deg, #2E6A47, #8FA885)',
            flexShrink: 0,
          }}
        />

        <div style={{ padding: '1.25rem 1.375rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', flex: 1 }}>

          {/* College · Program breadcrumb + Bookmark */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: isRejected ? '#B91C1C' : '#2E6A47', lineHeight: 1.2 }}>
              {thesis.college?.college_name ?? 'College of Sciences'} · {thesis.program?.prog_name ?? 'Sciences'}
            </p>
            <BookmarkButton
              thesisId={thesis.id}
              thesisTitle={thesis.title}
              initialIsBookmarked={isBookmarked}
              size="sm"
            />
          </div>

          {/* Title + Authors */}
          <div>
            <Link
              href={`/theses/${thesis.id}`}
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.0625rem', fontWeight: 700, color: '#112117', lineHeight: 1.3, textDecoration: 'none', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', transition: 'color 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#2E6A47' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#112117' }}
            >
              {thesis.title}
            </Link>
            <p style={{ fontSize: '0.8125rem', color: '#7C9283', marginTop: '0.375rem', fontWeight: 500 }}>
              {thesis.authors} · {thesis.year_submitted}
            </p>
          </div>

          {/* Rejection Notice Banner */}
          {isRejected && (
            <div
              style={{
                padding: '0.625rem 0.8125rem',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                fontSize: '0.75rem',
                lineHeight: 1.45,
              }}
            >
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, color: '#991B1B', marginBottom: 2 }}>
                <span style={{ fontSize: '0.8125rem' }}>✕</span>
                <span>Research Submission Rejected</span>
              </div>
              <p style={{ margin: 0, color: '#7F1D1D' }}>
                <strong style={{ color: '#991B1B' }}>Reason:</strong> {thesis.rejection_reason || 'Does not meet submission guidelines.'}
              </p>
            </div>
          )}

          {/* Abstract */}
          <p style={{ fontSize: '0.875rem', color: '#435A4C', lineHeight: 1.7, flex: 1 }}>
            {abstract}
          </p>

          {/* Tags */}
          {thesis.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {thesis.tags.slice(0, 5).map(tag => (
                <Link
                  key={tag.id}
                  href={`/theses?tag=${encodeURIComponent(tag.id)}`}
                  className={`tag-chip ${activeTags.includes(tag.name) ? 'is-active' : ''}`}
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #E5ECE6', marginTop: 'auto' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#7C9283', fontWeight: 500 }}>
              <svg style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {thesis.view_count.toLocaleString()} views
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {thesis.panel_score != null && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', fontWeight: 700, color: '#173B28', background: '#E7EFE9', border: '1px solid rgba(46,106,71,0.3)', padding: '0.15rem 0.6rem', borderRadius: 999 }}>
                  ★ {thesis.panel_score.toFixed(1)}
                </span>
              )}

              {showActions && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Link href={`/theses/${thesis.id}/edit`} style={{ fontSize: '0.75rem', fontWeight: 600, color: '#173B28', textDecoration: 'none' }}>
                    Edit
                  </Link>
                  <Link href={`/theses/${thesis.id}/edit?delete=1#delete`} style={{ fontSize: '0.75rem', fontWeight: 600, color: '#B91C1C', textDecoration: 'none' }}>
                    Delete
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
