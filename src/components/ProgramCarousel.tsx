'use client'

import Image from 'next/image'
import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Program } from '@/types/database'

interface ProgramCarouselProps {
  programs: Program[]
  activeProgramId: string | null
}

type CarouselItem = Pick<Program, 'prog_name' | 'logo'> & { id: string | null }

const SLIDE_WIDTH_PCT = 60
const SLIDE_GAP = '1.5rem'
const CENTRE_OFFSET_PCT = (100 - SLIDE_WIDTH_PCT) / 2
const AUTO_ADVANCE_MS = 5000

export default function ProgramCarousel({ programs, activeProgramId }: ProgramCarouselProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const items: CarouselItem[] = useMemo(
    () => [{ id: null, prog_name: 'All Programs', logo: '' }, ...programs],
    [programs]
  )

  const [userEngaged, setUserEngaged] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [moved, setMoved] = useState<{ index: number; forActiveIndex: number } | null>(null)

  const activeIndex = items.findIndex(item => item.id === activeProgramId)
  const urlIndex = Math.max(0, activeIndex)
  const current = moved?.forActiveIndex === activeIndex ? moved.index : urlIndex

  const show = useCallback(
    (idx: number) => {
      setUserEngaged(true)
      setMoved({ index: (idx + items.length) % items.length, forActiveIndex: activeIndex })
    },
    [items.length, activeIndex]
  )

  const select = useCallback(
    (idx: number) => {
      setUserEngaged(true)
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

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      showPrev()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      showNext()
    }
  }

  const touchStartX = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)
  const alcheRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let ticking = false

    function updateParallax() {
      if (!cardRef.current || !alcheRef.current) return
      const rect = cardRef.current.getBoundingClientRect()
      const windowHeight = window.innerHeight

      // Progress: 0 when card is at bottom of viewport, 1 when at top of viewport
      const totalDist = windowHeight + rect.height
      const currentDist = windowHeight - rect.top
      const progress = Math.max(0, Math.min(1, currentDist / totalDist))

      // Pan through the full image from top to bottom as user scrolls up/down
      const translateY = (progress - 0.5) * 280
      const rotate = -8 + (progress - 0.5) * 10

      alcheRef.current.style.transform = `translate(-50%, calc(-50% + ${translateY}px)) rotate(${rotate}deg) scale(1.22)`
      ticking = false
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax)
        ticking = true
      }
    }

    updateParallax()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

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
      {/* Forest academic track */}
      <div
        ref={cardRef}
        className="overflow-hidden rounded-3xl relative"
        style={{
          background: 'linear-gradient(135deg, #0D2418 0%, #173B28 50%, #1F4C33 100%)',
          border: '1px solid rgba(143,168,133,0.25)',
          boxShadow: '0 20px 50px -10px rgba(13,36,24,0.6)',
          padding: '2.75rem 2rem 2.75rem',
          isolation: 'isolate',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Parallax Alche graphic moving through full image during scroll */}
        <div 
          ref={alcheRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '500px',
            height: '500px',
            maxWidth: '90vw',
            maxHeight: '90vw',
            pointerEvents: 'none',
            zIndex: 0,
            opacity: 0.45,
            willChange: 'transform',
            transform: 'translate(-50%, -50%) rotate(-8deg) scale(1.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            src="/alche.png"
            alt=""
            width={500}
            height={500}
            className="w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
            priority
          />
        </div>

        <div
          className="flex gap-6 relative z-10"
          style={{
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
                className="flex-shrink-0 flex flex-col items-center justify-center transition-all duration-500 focus:outline-none"
                style={{
                  flexBasis: `${SLIDE_WIDTH_PCT}%`,
                  maxWidth: `${SLIDE_WIDTH_PCT}%`,
                  opacity: isCentred ? 1 : 0.35,
                  transform: isCentred ? 'scale(1.05)' : 'scale(0.85)',
                  background: 'transparent',
                  border: 'none',
                  boxShadow: 'none',
                  cursor: 'pointer',
                  padding: '0.75rem',
                }}
                aria-pressed={isFiltering}
                aria-current={isCentred ? 'true' : undefined}
              >
                {/* ─── Program Logo Circle ─── */}
                <div
                  className="rounded-full flex items-center justify-center mb-3.5 overflow-hidden transition-all duration-500"
                  style={{
                    width: '110px',
                    height: '110px',
                    background: isCentred
                      ? 'linear-gradient(135deg, rgba(143,168,133,0.3), rgba(13,36,24,0.95))'
                      : 'rgba(255,255,255,0.06)',
                    border: isFiltering
                      ? '2.5px solid #8FA885'
                      : isCentred
                        ? '2px solid rgba(143,168,133,0.7)'
                        : '1.5px solid rgba(255,255,255,0.12)',
                    boxShadow: isCentred
                      ? '0 12px 35px rgba(46,106,71,0.4), 0 0 25px rgba(143,168,133,0.2)'
                      : 'none',
                  }}
                >
                  {prog.id == null ? (
                    <svg className="h-12 w-12 text-emerald-200/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  ) : prog.logo ? (
                    <Image
                      src={`/images/${prog.logo}`}
                      alt={prog.prog_name}
                      width={80}
                      height={80}
                      className="h-20 w-20 object-contain"
                    />
                  ) : (
                    <svg className="h-12 w-12 text-emerald-200/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  )}
                </div>

                {/* Program Name */}
                <span
                  className="text-center font-semibold text-sm sm:text-base leading-snug"
                  style={{
                    color: isCentred ? '#FFFFFF' : 'rgba(255,255,255,0.65)',
                    fontFamily: isCentred ? "'Playfair Display', Georgia, serif" : 'inherit',
                    maxWidth: '420px',
                  }}
                >
                  {prog.prog_name}
                </span>

                {isFiltering && (
                  <span
                    className="mt-2 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(143,168,133,0.25)', color: '#A3C49B', border: '1px solid rgba(143,168,133,0.4)' }}
                  >
                    Active Filter
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Prev / Next arrows */}
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={showPrev}
            aria-label="Previous program"
            className="absolute top-1/2 -translate-y-1/2 -left-4 md:-left-6 h-10 w-10 rounded-full flex items-center justify-center text-white border transition-all hover:scale-110"
            style={{
              background: 'linear-gradient(135deg, #173B28, #0D2418)',
              borderColor: 'rgba(143,168,133,0.45)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            ←
          </button>
          <button
            type="button"
            onClick={showNext}
            aria-label="Next program"
            className="absolute top-1/2 -translate-y-1/2 -right-4 md:-right-6 h-10 w-10 rounded-full flex items-center justify-center text-white border transition-all hover:scale-110"
            style={{
              background: 'linear-gradient(135deg, #173B28, #0D2418)',
              borderColor: 'rgba(143,168,133,0.45)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
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
              background: idx === current ? '#8FA885' : 'rgba(143,168,133,0.3)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
