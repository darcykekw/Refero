'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import type { ThesisWithRelations } from '@/types/database'
import BookmarkButton from '@/components/bookmarks/BookmarkButton'
import { getProgramLogoUrl } from '@/lib/constants/programs'

interface RecentThesesDeckProps {
  theses: ThesisWithRelations[]
  bookmarkMap: Record<string, string[]>
}

export default function RecentThesesDeck({ theses, bookmarkMap }: RecentThesesDeckProps) {
  const [isPaused, setIsPaused] = useState(false)
  const [cardWidth, setCardWidth] = useState(360)
  const [gapWidth, setGapWidth] = useState(20)
  const [currentIndex, setCurrentIndex] = useState(theses.length > 0 ? theses.length : 0)
  const [isTransitioning, setIsTransitioning] = useState(true)

  const containerRef = useRef<HTMLDivElement>(null)

  const total = theses.length

  useEffect(() => {
    if (total > 0 && currentIndex === 0) {
      setCurrentIndex(total)
    }
  }, [total, currentIndex])

  // Responsive card size calculation
  useEffect(() => {
    function updateDimensions() {
      if (window.innerWidth < 640) {
        setCardWidth(Math.min(310, window.innerWidth - 64))
        setGapWidth(14)
      } else if (window.innerWidth < 1024) {
        setCardWidth(330)
        setGapWidth(16)
      } else {
        setCardWidth(370)
        setGapWidth(20)
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Quadruple the list to create a smooth, continuous infinite queue
  const queueItems = useMemo(() => {
    if (total === 0) return []
    // Make sure we have at least 18 items in the infinite loop track
    const repeatCount = Math.max(4, Math.ceil(18 / total))
    const items: Array<{ thesis: ThesisWithRelations; uniqueKey: string; originalIndex: number }> = []
    for (let r = 0; r < repeatCount; r++) {
      theses.forEach((thesis, idx) => {
        items.push({
          thesis,
          uniqueKey: `${thesis.id}-r${r}-i${idx}`,
          originalIndex: idx,
        })
      })
    }
    return items
  }, [theses, total])

  // Advance by 1 thesis in the queue (Right >)
  const advanceQueue = useCallback(() => {
    if (total <= 1) return
    setIsTransitioning(true)
    setCurrentIndex(prev => prev + 1)
  }, [total])

  // Retreat by 1 thesis in the queue (Left <)
  const retreatQueue = useCallback(() => {
    if (total <= 1) return
    setIsTransitioning(true)
    setCurrentIndex(prev => prev - 1)
  }, [total])

  // Automatic queuing interval (pauses on hover)
  useEffect(() => {
    if (isPaused || total <= 1) return

    const timer = setInterval(() => {
      advanceQueue()
    }, 3600)

    return () => clearInterval(timer)
  }, [isPaused, total, advanceQueue])

  // Handle seamless infinite looping reset in both directions
  function handleTransitionEnd() {
    if (total <= 1) return
    if (currentIndex >= total * 2) {
      setIsTransitioning(false)
      setCurrentIndex(currentIndex - total)
    } else if (currentIndex < total) {
      setIsTransitioning(false)
      setCurrentIndex(currentIndex + total)
    }
  }

  // Active thesis in original 0..total-1 scale for dots/progress
  const activeOriginalIndex = total > 0 ? ((currentIndex % total) + total) % total : 0

  if (total === 0) {
    return (
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #D2DDD4',
          borderRadius: '1.5rem',
          boxShadow: '0 4px 16px rgba(17, 33, 23, 0.06)',
          padding: '4rem 2rem',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📭</div>
        <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', fontWeight: 700, color: '#112117' }}>
          No recent theses found
        </p>
        <p style={{ fontSize: '0.9rem', color: '#7C9283', marginTop: '0.5rem' }}>
          Be the first to upload and publish a scientific thesis!
        </p>
        <Link href="/theses/upload" className="btn btn-primary mt-5 inline-flex">
          Upload a Thesis
        </Link>
      </div>
    )
  }

  const stepDistance = cardWidth + gapWidth
  const translateX = -(currentIndex * stepDistance)

  return (
    <div
      className="w-full relative py-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── Top Queue Dots ────────────────── */}
      {total > 1 && (
        <div className="flex items-center justify-end gap-1.5 mb-3">
          {theses.slice(0, Math.min(6, total)).map((_, dotIdx) => (
            <button
              key={dotIdx}
              type="button"
              onClick={() => {
                setIsTransitioning(true)
                const base = Math.floor(currentIndex / total) * total
                setCurrentIndex(base + dotIdx)
              }}
              className="transition-all cursor-pointer"
              style={{
                width: activeOriginalIndex === dotIdx ? 22 : 7,
                height: 7,
                borderRadius: 999,
                backgroundColor: activeOriginalIndex === dotIdx ? '#215636' : '#C4D6C8',
                border: 'none',
              }}
              aria-label={`Jump to thesis ${dotIdx + 1}`}
              title={`Jump to thesis ${dotIdx + 1}`}
            />
          ))}
        </div>
      )}

      {/* ── Relative wrapper holding carousel track & floating side arrows (< and >) ── */}
      <div className="relative w-full">
        {/* Left Floating Arrow (<) */}
        {total > 1 && (
          <button
            type="button"
            onClick={retreatQueue}
            aria-label="Previous recent thesis"
            title="Previous (<)"
            className="absolute top-1/2 -translate-y-1/2 left-0 sm:-left-3 md:-left-5 w-10 h-10 rounded-full flex items-center justify-center text-white border transition-all hover:scale-110 z-30 cursor-pointer shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #173B28, #0D2418)',
              borderColor: 'rgba(143,168,133,0.45)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
            }}
          >
            <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Right Floating Arrow (>) */}
        {total > 1 && (
          <button
            type="button"
            onClick={advanceQueue}
            aria-label="Next recent thesis"
            title="Next (>)"
            className="absolute top-1/2 -translate-y-1/2 right-0 sm:-right-3 md:-right-5 w-10 h-10 rounded-full flex items-center justify-center text-white border transition-all hover:scale-110 z-30 cursor-pointer shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #173B28, #0D2418)',
              borderColor: 'rgba(143,168,133,0.45)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
            }}
          >
            <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* ── Queuing Carousel Track (Straight Cards, White Style, Overflow Hidden) ── */}
        <div
          ref={containerRef}
          className="w-full overflow-hidden py-3"
          style={{
            // Smooth fade mask on left and right edges for a polished queue look
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 2%, black 98%, transparent)',
            maskImage: 'linear-gradient(to right, transparent, black 2%, black 98%, transparent)',
          }}
        >
        <div
          onTransitionEnd={handleTransitionEnd}
          style={{
            display: 'flex',
            gap: `${gapWidth}px`,
            transform: `translateX(${translateX}px)`,
            transition: isTransitioning ? 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
            willChange: 'transform',
          }}
        >
          {queueItems.map(({ thesis, uniqueKey }) => {
            const isBookmarked = Boolean(bookmarkMap[thesis.id]?.length)
            const logoUrl = getProgramLogoUrl(thesis.program?.logo, thesis.program?.prog_name)

            return (
              <article
                key={uniqueKey}
                className="transition-all duration-200 hover:-translate-y-1.5"
                style={{
                  width: `${cardWidth}px`,
                  minWidth: `${cardWidth}px`,
                  maxWidth: `${cardWidth}px`,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D2DDD4',
                  borderRadius: '22px',
                  boxShadow: '0 4px 20px -2px rgba(17, 33, 23, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  position: 'relative',
                  flexShrink: 0,
                  transform: 'none', // Straight position
                }}
              >
                {/* Top botanical accent line */}
                <div
                  style={{
                    height: 3.5,
                    background: 'linear-gradient(90deg, #1C4D32, #47835B, #8FA885)',
                    flexShrink: 0,
                  }}
                />

                <div
                  style={{
                    padding: '1.35rem 1.35rem 1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    flex: 1,
                    gap: '0.875rem',
                  }}
                >
                  {/* ── Card Header Row ───────────────────────────────── */}
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      {/* White Squircle Emblem Badge */}
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          backgroundColor: '#F3F8F5',
                          border: '1px solid #D2E3D8',
                          boxShadow: '0 2px 8px rgba(17, 33, 23, 0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 6,
                          flexShrink: 0,
                        }}
                      >
                        {logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={logoUrl}
                            alt={thesis.program?.prog_name ?? 'Program'}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <span style={{ fontSize: '1.25rem' }}>📄</span>
                        )}
                      </div>

                      {/* Verified Badge & Bookmark Button */}
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/verify.png"
                          alt="Verified"
                          title="Verified Thesis"
                          style={{
                            width: 30,
                            height: 30,
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
                          }}
                        />
                        <BookmarkButton
                          thesisId={thesis.id}
                          thesisTitle={thesis.title}
                          initialIsBookmarked={isBookmarked}
                          size="sm"
                        />
                      </div>
                    </div>

                    {/* Program Label */}
                    <p
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: '#235F3A',
                        marginBottom: '0.35rem',
                        lineHeight: 1.3,
                      }}
                      className="truncate"
                    >
                      {thesis.program?.prog_name ?? 'College of Sciences'}
                    </p>

                    {/* Thesis Title */}
                    <Link
                      href={`/theses/${thesis.id}`}
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: '1.125rem',
                        fontWeight: 700,
                        lineHeight: 1.35,
                        color: '#112117',
                        textDecoration: 'none',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        marginBottom: '0.35rem',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => {
                        ;(e.currentTarget as HTMLElement).style.color = '#1E5A35'
                      }}
                      onMouseLeave={e => {
                        ;(e.currentTarget as HTMLElement).style.color = '#112117'
                      }}
                    >
                      {thesis.title}
                    </Link>

                    {/* Authors & Year */}
                    <p
                      style={{
                        fontSize: '0.8125rem',
                        color: '#5F7A69',
                        lineHeight: 1.35,
                      }}
                      className="line-clamp-1"
                    >
                      {thesis.authors} · <span style={{ color: '#8A6820', fontWeight: 600 }}>{thesis.year_submitted}</span>
                    </p>
                  </div>

                  {/* ── Inset Lower Container (White / Soft Sage Opaque) ── */}
                  <div
                    style={{
                      backgroundColor: '#F5F9F6',
                      border: '1px solid #DCE7E0',
                      borderRadius: '14px',
                      padding: '0.875rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.625rem',
                      marginTop: 'auto',
                    }}
                  >
                    {/* Abstract Quote */}
                    <p
                      style={{
                        fontSize: '0.8125rem',
                        color: '#354E3F',
                        lineHeight: 1.55,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        fontStyle: 'italic',
                        margin: 0,
                      }}
                    >
                      “{thesis.abstract.slice(0, 150).trimEnd()}…”
                    </p>

                    {/* Tags */}
                    {thesis.tags && thesis.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {thesis.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag.id}
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              color: '#1C5233',
                              backgroundColor: '#E6EFE9',
                              border: '1px solid #C8DDD0',
                              borderRadius: 999,
                              padding: '0.15rem 0.55rem',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Inset Footer Row */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '0.5rem',
                        borderTop: '1px solid #E2ECE5',
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: '#5A7565',
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3.5,
                          }}
                        >
                          <svg style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {thesis.view_count.toLocaleString()}
                        </span>

                        {thesis.panel_score != null && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#8A6820',
                              backgroundColor: '#FFF8E6',
                              border: '1px solid #F3E0B5',
                              padding: '0.1rem 0.45rem',
                              borderRadius: 999,
                            }}
                          >
                            ★ {thesis.panel_score.toFixed(1)}
                          </span>
                        )}
                      </div>

                      {/* Read Button */}
                      <Link
                        href={`/theses/${thesis.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: '#1C4D32',
                          color: '#FFFFFF',
                          padding: '0.35rem 0.85rem',
                          borderRadius: 999,
                          border: '1px solid #143A25',
                          textDecoration: 'none',
                          boxShadow: '0 2px 6px rgba(28, 77, 50, 0.25)',
                          transition: 'background-color 0.15s, transform 0.15s',
                        }}
                        onMouseEnter={e => {
                          ;(e.currentTarget as HTMLElement).style.backgroundColor = '#256441'
                        }}
                        onMouseLeave={e => {
                          ;(e.currentTarget as HTMLElement).style.backgroundColor = '#1C4D32'
                        }}
                      >
                        <span>Read</span>
                        <svg style={{ width: 12, height: 12 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  </div>
)
}
