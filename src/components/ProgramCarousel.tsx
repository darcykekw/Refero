'use client'

import Image from 'next/image'
import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Program } from '@/types/database'

interface ProgramCarouselProps {
  programs: Program[]
  activeProgramId: string | null
}

/**
 * A slide. Derived from `Program` so a schema change surfaces here, but with a
 * nullable id: the carousel prepends a synthetic "All Programs" slide that has
 * no row behind it, which `Program.id` (a plain string) cannot represent.
 *
 * `logo` stays non-nullable to match the column, which is `NOT NULL DEFAULT ''`
 * — so the empty string, not null, is what "no logo" looks like everywhere.
 */
type CarouselItem = Pick<Program, 'prog_name' | 'logo'> & { id: string | null }

/** Slide width as a share of the track, matching `flexBasis` below. */
const SLIDE_WIDTH_PCT = 60
/** Gap between slides — must stay in sync with the `gap-6` class on the track. */
const SLIDE_GAP = '1.5rem'
/** Left offset that centres the active slide: (100 - 60) / 2. */
const CENTRE_OFFSET_PCT = (100 - SLIDE_WIDTH_PCT) / 2

const AUTO_ADVANCE_MS = 5000

export default function ProgramCarousel({ programs, activeProgramId }: ProgramCarouselProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const items: CarouselItem[] = useMemo(
    () => [{ id: null, prog_name: 'All Programs', logo: '' }, ...programs],
    [programs]
  )

  /** Auto-advance stops for good once the visitor drives the carousel. */
  const [userEngaged, setUserEngaged] = useState(false)
  /** Auto-advance pauses while the pointer or keyboard focus is inside. */
  const [hovered, setHovered] = useState(false)

  /**
   * Where the visitor has moved the strip to, paired with the URL filter that
   * was in effect when they moved it.
   *
   * Carrying that second field is what lets the centred slide be *derived*
   * rather than synchronised: the moment the filter changes — a card click, or
   * the back button — the pairing stops matching and the URL wins again. The
   * previous version kept a bare index and copied `activeIndex` into it from an
   * effect, which cost an extra render pass to compute something render already
   * has everything for.
   */
  const [moved, setMoved] = useState<{ index: number; forActiveIndex: number } | null>(null)

  /**
   * Which slide the URL asks for. -1 means no `?program=` filter, or one naming
   * a program that no longer exists; either way slide 0 — "All Programs" — is
   * the right thing to centre.
   */
  const activeIndex = items.findIndex(item => item.id === activeProgramId)
  const urlIndex = Math.max(0, activeIndex)

  /** Which slide is centred. Purely visual — it does not filter anything. */
  const current = moved?.forActiveIndex === activeIndex ? moved.index : urlIndex

  /**
   * Moves the carousel without touching the URL. Used by auto-advance, the
   * arrows and swipes, so browsing the strip costs nothing.
   */
  const show = useCallback(
    (idx: number) => {
      setUserEngaged(true)
      setMoved({ index: (idx + items.length) % items.length, forActiveIndex: activeIndex })
    },
    [items.length, activeIndex]
  )

  /**
   * Applies a program as the page filter. Only an explicit pick does this —
   * auto-advance used to call router.push() every 5 seconds, which re-ran every
   * query on the home page and reset the visitor's scroll position twice a
   * minute, forever.
   */
  const select = useCallback(
    (idx: number) => {
      setUserEngaged(true)
      // Centre it now rather than waiting on the navigation. Once the pushed URL
      // lands, `current` derives the same index from `activeIndex` anyway.
      setMoved({ index: idx, forActiveIndex: activeIndex })

      const program = items[idx]
      const params = new URLSearchParams(searchParams.toString())
      if (program.id) params.set('program', program.id)
      else params.delete('program')

      const qs = params.toString()
      router.push(qs ? `/?${qs}` : '/', { scroll: false })
    },
    [items, router, searchParams, activeIndex]
  )

  const showPrev = useCallback(() => show(current - 1), [show, current])
  const showNext = useCallback(() => show(current + 1), [show, current])

  // Auto-advance: decorative only, and skipped entirely for visitors who have
  // asked for reduced motion.
  useEffect(() => {
    if (userEngaged || hovered || items.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const id = setInterval(() => {
      setMoved(prev => {
        const from = prev?.forActiveIndex === activeIndex ? prev.index : urlIndex
        return { index: (from + 1) % items.length, forActiveIndex: activeIndex }
      })
    }, AUTO_ADVANCE_MS)
    return () => clearInterval(id)
  }, [userEngaged, hovered, items.length, activeIndex, urlIndex])

  // Arrow keys are handled on the carousel itself rather than on `window`, so
  // they only apply when focus is actually inside it. The old global listener
  // was registered with no dependency array — it re-bound on every render, and
  // it swallowed left/right arrows anywhere on the page, including inside the
  // search box.
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      showPrev()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      showNext()
    }
  }

  // Touch swipe
  const touchStartX = useRef(0)
  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e: React.TouchEvent) {
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 40) {
      if (delta > 0) showNext()
      else showPrev()
    }
  }

  return (
    <div
      className="relative"
      role="group"
      aria-label="Browse by program"
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {/* Dark glassmorphism track */}
      <div
        className="overflow-hidden rounded-3xl"
        style={{
          background: 'radial-gradient(circle at top, rgba(15,23,42,0.9), rgba(15,23,42,0.98))',
          boxShadow: '0 32px 90px rgba(15,23,42,0.85)',
          padding: '2rem 2.5rem 2.75rem',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex gap-6"
          style={{
            // One step is a slide plus the gap between slides. The previous
            // version stepped by a flat 80%, which drifted 20% per slide and
            // pushed the active card off-screen entirely by the sixth program.
            transform: `translateX(calc(${CENTRE_OFFSET_PCT}% - ${current} * (${SLIDE_WIDTH_PCT}% + ${SLIDE_GAP})))`,
            transition: 'transform 0.7s cubic-bezier(0.4,0,0.2,1)',
            willChange: 'transform',
          }}
        >
          {items.map((prog, idx) => {
            const isCentred = idx === current
            const isFiltering = prog.id === activeProgramId

            return (
              <button
                key={prog.id ?? '__all'}
                type="button"
                onClick={() => select(idx)}
                className="flex-shrink-0 flex flex-col items-center justify-center p-8 rounded-2xl border transition-all duration-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                style={{
                  flexBasis: `${SLIDE_WIDTH_PCT}%`,
                  maxWidth: `${SLIDE_WIDTH_PCT}%`,
                  opacity: isCentred ? 1 : 0.45,
                  transform: isCentred ? 'translateY(-0.4rem) scale(1.08)' : 'translateY(0.25rem) scale(0.9)',
                  background: isCentred
                    ? 'radial-gradient(circle at top, rgba(15,23,42,0.98), rgba(15,23,42,1))'
                    : 'rgba(15,23,42,0.75)',
                  borderColor: isFiltering
                    ? 'rgba(56,189,248,0.9)'
                    : isCentred ? 'rgba(148,163,184,0.7)' : 'rgba(30,64,175,0.5)',
                  boxShadow: isCentred ? '0 30px 90px rgba(15,23,42,0.95)' : 'none',
                }}
                aria-pressed={isFiltering}
                aria-current={isCentred ? 'true' : undefined}
              >
                {/* Program logo, falling back to a generic icon */}
                <div
                  className="h-20 w-20 rounded-full flex items-center justify-center mb-4 overflow-hidden transition-all duration-700"
                  style={{
                    background: isCentred
                      ? 'radial-gradient(circle at 30% 20%, rgba(248,250,252,0.16), rgba(15,23,42,0.9))'
                      : 'rgba(15,23,42,0.5)',
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: isCentred ? 'rgba(148,163,184,0.9)' : 'rgba(148,163,184,0.3)',
                    boxShadow: isCentred ? '0 18px 50px rgba(56,189,248,0.45)' : 'none',
                  }}
                >
                  {prog.id == null ? (
                    <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  ) : prog.logo ? (
                    <Image
                      src={`/images/${prog.logo}`}
                      alt=""
                      width={56}
                      height={56}
                      className="h-14 w-14 object-contain"
                    />
                  ) : (
                    <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  )}
                </div>
                <span className="text-center font-semibold text-sm leading-tight" style={{ color: '#e5e7eb' }}>
                  {prog.prog_name}
                </span>
                {isFiltering && (
                  <span className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-sky-300">
                    Filtering
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Prev / Next arrows — move the strip only, no page load */}
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={showPrev}
            aria-label="Previous program"
            className="absolute top-1/2 -translate-y-1/2 -left-5 md:-left-10 h-10 w-10 rounded-full flex items-center justify-center text-slate-300 border border-slate-500/70 backdrop-blur-sm transition-all hover:scale-105"
            style={{ background: 'rgba(15,23,42,0.6)', boxShadow: '0 18px 45px rgba(15,23,42,0.9)' }}
          >
            ←
          </button>
          <button
            type="button"
            onClick={showNext}
            aria-label="Next program"
            className="absolute top-1/2 -translate-y-1/2 -right-5 md:-right-10 h-10 w-10 rounded-full flex items-center justify-center text-slate-300 border border-slate-500/70 backdrop-blur-sm transition-all hover:scale-105"
            style={{ background: 'rgba(15,23,42,0.6)', boxShadow: '0 18px 45px rgba(15,23,42,0.9)' }}
          >
            →
          </button>
        </>
      )}

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {items.map((prog, idx) => (
          <button
            key={prog.id ?? '__all'}
            type="button"
            onClick={() => show(idx)}
            aria-label={`Show ${prog.prog_name}`}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: idx === current ? '1.5rem' : '0.45rem',
              background: idx === current ? '#38bdf8' : 'rgba(148,163,184,0.6)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
