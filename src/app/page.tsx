import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { getSiteStats, getFeaturedTheses, getAllPrograms, getAllVerifiedTheses } from '@/lib/data'
import { getUserBookmarkMap } from '@/lib/bookmarks'
import RecentThesesDeck from '@/components/RecentThesesDeck'
import ProgramCarousel from '@/components/ProgramCarousel'
import AllThesesSection from '@/components/AllThesesSection'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Discover and explore theses in College of Sciences.',
}

interface HomePageProps {
  searchParams: Promise<{ program?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { program: programId } = await searchParams

  const user = await getCurrentUser()
  const [stats, programs, featured, allTheses, bookmarkMap] = await Promise.all([
    getSiteStats(),
    getAllPrograms(),
    getFeaturedTheses(programId),
    getAllVerifiedTheses(),
    user ? getUserBookmarkMap(user.id) : Promise.resolve({} as Record<string, string[]>),
  ])

  const displayName = user?.user_metadata?.full_name
    ?? user?.email?.split('@')[0]
    ?? 'Researcher'

  // Collect unique tags from all uploaded verified theses as a resilient safeguard
  const uniqueThesisTags = new Set<string>()
  allTheses.forEach(t => {
    (t.tags || []).forEach(tg => {
      if (tg?.name) uniqueThesisTags.add(tg.name.toLowerCase().trim())
    })
  })
  featured.forEach(t => {
    (t.tags || []).forEach(tg => {
      if (tg?.name) uniqueThesisTags.add(tg.name.toLowerCase().trim())
    })
  })

  const STATS = [
    { label: 'Theses', value: Math.max(stats.thesis_count, featured.length, allTheses.length), icon: '📄' },
    { label: 'Programs', value: Math.max(stats.program_count, programs.length), icon: '🎓' },
    { label: 'Tags', value: Math.max(stats.tag_count, uniqueThesisTags.size), icon: '🏷️' },
  ]

  return (
    <div className="w-full max-w-7xl page-gutter py-6 sm:py-10 space-y-10 sm:space-y-16">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <header
        className="w-full animate-scale-in"
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '1.75rem',
          background: 'linear-gradient(135deg, #133924 0%, #18422A 50%, #1A462D 100%)',
          color: '#fff',
          boxShadow: '0 20px 50px -10px rgba(13,36,24,0.4)',
          isolation: 'isolate',
        }}
      >
        {/* Right side layered papercut illustration from design1.png */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            pointerEvents: 'none',
            overflow: 'hidden',
            zIndex: 0,
          }}
          className="hidden sm:flex"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/design1.png"
            alt=""
            aria-hidden="true"
            style={{
              height: '100%',
              width: 'auto',
              maxHeight: '100%',
              objectFit: 'contain',
              objectPosition: 'right center',
              transform: 'scaleX(-1)',
              display: 'block',
            }}
          />
        </div>

        <div className="relative z-10 p-5 sm:p-10 lg:p-14">
          {/* Welcome tag */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(143,168,133,0.14)', border: '1px solid rgba(143,168,133,0.25)', borderRadius: 999, padding: '0.3rem 0.85rem', marginBottom: '1.25rem' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8FA885', flexShrink: 0 }} />
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', color: '#A3C49B', textTransform: 'uppercase' }} className="truncate max-w-[240px] sm:max-w-none">
              Welcome back Alchemist, {displayName}
            </span>
          </div>

          <div style={{ maxWidth: 580, marginBottom: '2rem' }}>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.85rem, 6vw, 3.75rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#fff', marginBottom: '0.75rem' }}>
              REFERO
              <br />
              <span style={{ color: '#9AB892', fontWeight: 700 }}>
                Thesis Library
              </span>
            </h1>
            <p style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, maxWidth: 520 }} className="sm:text-base">
              Discover, share, and explore scientific research and theses.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link
                href="/theses"
                className="w-full sm:w-auto text-center"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.75rem 1.625rem', borderRadius: 8, background: 'linear-gradient(135deg, #265C3B, #1F4C30)', color: '#fff', fontWeight: 700, fontSize: '0.9375rem', textDecoration: 'none', border: '1px solid rgba(143,168,133,0.35)', boxShadow: '0 4px 16px rgba(13,36,24,0.35)', letterSpacing: '0.01em' }}
              >
                Browse Theses
                <svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/theses/upload"
                className="w-full sm:w-auto text-center"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.75rem 1.625rem', borderRadius: 8, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: '0.9375rem', textDecoration: 'none', border: '1px solid rgba(143,168,133,0.22)', backdropFilter: 'blur(8px)', letterSpacing: '0.01em' }}
              >
                Upload Thesis
              </Link>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-lg">
            {STATS.map(s => (
              <div key={s.label} className="p-3 sm:p-4" style={{ borderRadius: 12, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(143,168,133,0.15)', transition: 'background 0.2s' }}>
                <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8FA885', marginBottom: 2 }} className="sm:text-[0.6875rem] truncate">{s.label}</p>
                <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, color: '#fff', lineHeight: 1 }} className="text-xl sm:text-2xl lg:text-3xl">{s.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── Recently Uploaded Theses ─────────────────────────────────────── */}
      <section className="w-full animate-fade-in-up delay-150">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div className="section-header" style={{ marginBottom: 0 }}>
            <h2 className="section-title">
              {programId
                ? `Recent Theses in ${programs.find(p => p.id === programId)?.prog_name ?? 'Program'}`
                : 'Recently Uploaded Theses'}
            </h2>
          </div>
        </div>

        <RecentThesesDeck theses={featured} bookmarkMap={bookmarkMap} />
      </section>

      {/* ── Browse by Program ──────────────────────────────────────────────── */}
      <section className="w-full animate-fade-in-up delay-200">
        <div className="section-header">
          <h2 className="section-title">Browse by Program</h2>
        </div>
        <Suspense fallback={<div className="skeleton h-64 rounded-2xl" />}>
          <ProgramCarousel programs={programs} activeProgramId={programId ?? null} />
        </Suspense>
      </section>

      {/* ── All Theses (Archive with Pagination by 9) ─── */}
      <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
        <AllThesesSection
          initialTheses={allTheses.length > 0 ? allTheses : featured}
          programs={programs}
          bookmarkMap={bookmarkMap}
        />
      </Suspense>
    </div>
  )
}
