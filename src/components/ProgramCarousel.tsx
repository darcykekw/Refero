'use client'

import { useRef, useState, useEffect, useCallback, useMemo, startTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Program } from '@/types/database'

interface ProgramCarouselProps {
  programs: Program[]
  activeProgramId: string | null
}

export default function ProgramCarousel({ programs, activeProgramId }: ProgramCarouselProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const trackRef = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0) // 0 = "All Programs"

  const items = useMemo(
    () => [{ id: null, prog_name: 'All Programs', logo: null }, ...programs],
    [programs]
  )

  // Sync with URL on mount
  useEffect(() => {
    const idx = items.findIndex(p => p.id === activeProgramId)
    startTransition(() => setCurrent(idx >= 0 ? idx : 0))
  }, [activeProgramId, items])

  const navigate = useCallback((idx: number) => {
    setCurrent(idx)
    const program = items[idx]
    const params = new URLSearchParams(searchParams.toString())
    if (program.id) {
      params.set('program', program.id)
    } else {
      params.delete('program')
    }
    router.push(`/?${params.toString()}`)
  }, [items, router, searchParams])

  const prev = () => navigate((current - 1 + items.length) % items.length)
  const next = () => navigate((current + 1) % items.length)

  // Auto-advance
  useEffect(() => {
    const id = setInterval(() => navigate((current + 1) % items.length), 5000)
    return () => clearInterval(id)
  }, [current, items.length, navigate])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }) // intentionally no dep-array — runs each render to capture fresh prev/next

  // Touch swipe
  const touchStartX = useRef(0)
  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e: React.TouchEvent) {
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 40) {
      if (delta > 0) next()
      else prev()
    }
  }

  return (
    <div className="relative">
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
          ref={trackRef}
          className="flex gap-6"
          style={{
            transform: `translateX(calc(${-current * (60 + (100 - 60) / 2)}% + 20%))`,
            transition: 'transform 0.7s cubic-bezier(0.4,0,0.2,1)',
            willChange: 'transform',
          }}
        >
          {items.map((prog, idx) => {
            const isActive = idx === current
            return (
              <button
                key={prog.id ?? '__all'}
                type="button"
                onClick={() => navigate(idx)}
                className="flex-shrink-0 flex flex-col items-center justify-center p-8 rounded-2xl border transition-all duration-700 focus:outline-none"
                style={{
                  flexBasis: '60%',
                  maxWidth: '60%',
                  opacity: isActive ? 1 : 0.45,
                  transform: isActive ? 'translateY(-0.4rem) scale(1.08)' : 'translateY(0.25rem) scale(0.9)',
                  background: isActive
                    ? 'radial-gradient(circle at top, rgba(15,23,42,0.98), rgba(15,23,42,1))'
                    : 'rgba(15,23,42,0.75)',
                  borderColor: isActive ? 'rgba(148,163,184,0.7)' : 'rgba(30,64,175,0.5)',
                  boxShadow: isActive ? '0 30px 90px rgba(15,23,42,0.95)' : 'none',
                }}
                aria-pressed={isActive}
              >
                {/* Logo / icon */}
                <div
                  className="h-20 w-20 rounded-full flex items-center justify-center mb-4 transition-all duration-700"
                  style={{
                    background: isActive
                      ? 'radial-gradient(circle at 30% 20%, rgba(248,250,252,0.16), rgba(15,23,42,0.9))'
                      : 'rgba(15,23,42,0.5)',
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: isActive ? 'rgba(148,163,184,0.9)' : 'rgba(148,163,184,0.3)',
                    boxShadow: isActive ? '0 18px 50px rgba(56,189,248,0.45)' : 'none',
                  }}
                >
                  {prog.id == null ? (
                    <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  ) : (
                    <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  )}
                </div>
                <span className="text-center font-semibold text-sm leading-tight" style={{ color: '#e5e7eb' }}>
                  {prog.prog_name}
                </span>
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
            onClick={prev}
            aria-label="Previous program"
            className="absolute top-1/2 -translate-y-1/2 -left-5 md:-left-10 h-10 w-10 rounded-full flex items-center justify-center text-slate-300 border border-slate-500/70 backdrop-blur-sm transition-all hover:scale-105"
            style={{ background: 'rgba(15,23,42,0.6)', boxShadow: '0 18px 45px rgba(15,23,42,0.9)' }}
          >
            ←
          </button>
          <button
            type="button"
            onClick={next}
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
            onClick={() => navigate(idx)}
            aria-label={`Go to ${prog.prog_name}`}
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
