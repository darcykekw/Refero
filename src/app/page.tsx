import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { getSiteStats, getFeaturedTheses, getAllPrograms } from '@/lib/data'
import ThesisCard from '@/components/ThesisCard'
import ProgramCarousel from '@/components/ProgramCarousel'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Discover and explore theses in College of Sciences.',
}

interface HomePageProps {
  searchParams: Promise<{ program?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { program: programId } = await searchParams

  const [user, stats, programs, featured] = await Promise.all([
    getCurrentUser(),
    getSiteStats(),
    getAllPrograms(),
    getFeaturedTheses(programId),
  ])

  const displayName = user?.user_metadata?.full_name
    ?? user?.email?.split('@')[0]
    ?? 'Researcher'

  const STATS = [
    { label: 'Theses', value: stats.thesis_count, icon: '📄' },
    { label: 'Programs', value: stats.program_count, icon: '🎓' },
    { label: 'Tags', value: stats.tag_count, icon: '🏷️' },
  ]

  return (
    <div className="max-w-7xl page-gutter py-10 space-y-16">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <header
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

        <div style={{ position: 'relative', zIndex: 1, padding: '3.5rem 3.5rem 3rem' }}>
          {/* Welcome tag */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(143,168,133,0.14)', border: '1px solid rgba(143,168,133,0.25)', borderRadius: 999, padding: '0.35rem 1rem', marginBottom: '1.5rem' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8FA885', flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', color: '#A3C49B', textTransform: 'uppercase' }}>
              Welcome back Alchemist, {displayName}
            </span>
          </div>

          <div style={{ maxWidth: 580, marginBottom: '2.25rem' }}>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(2.5rem, 5.5vw, 3.75rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#fff', marginBottom: '0.75rem' }}>
              REFERO
              <br />
              <span style={{ color: '#9AB892', fontWeight: 700 }}>
                Thesis Library
              </span>
            </h1>
            <p style={{ fontSize: '1.0625rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.65, maxWidth: 520 }}>
              Discover, share, and explore scientific research and theses.
            </p>
            <div style={{ marginTop: '1.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.875rem' }}>
              <Link
                href="/theses"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.75rem 1.625rem', borderRadius: 8, background: 'linear-gradient(135deg, #265C3B, #1F4C30)', color: '#fff', fontWeight: 700, fontSize: '0.9375rem', textDecoration: 'none', border: '1px solid rgba(143,168,133,0.35)', boxShadow: '0 4px 16px rgba(13,36,24,0.35)', letterSpacing: '0.01em' }}
              >
                Browse Theses
                <svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/theses/upload"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.75rem 1.625rem', borderRadius: 8, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: '0.9375rem', textDecoration: 'none', border: '1px solid rgba(143,168,133,0.22)', backdropFilter: 'blur(8px)', letterSpacing: '0.01em' }}
              >
                Upload Thesis
              </Link>
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 150px))', gap: '1rem' }}>
            {STATS.map(s => (
              <div key={s.label} style={{ padding: '1rem 1.25rem', borderRadius: 12, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(143,168,133,0.15)', transition: 'background 0.2s' }}>
                <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8FA885', marginBottom: 4 }}>{s.label}</p>
                <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{s.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── Browse by Program ──────────────────────────────────────────────── */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Browse by Program</h2>
        </div>
        <Suspense fallback={<div className="skeleton h-64 rounded-2xl" />}>
          <ProgramCarousel programs={programs} activeProgramId={programId ?? null} />
        </Suspense>
      </section>

      {/* ── Featured Theses ────────────────────────────────────────────────── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
          <div className="section-header" style={{ marginBottom: 0 }}>
            <h2 className="section-title">
              {programId
                ? `Latest in ${programs.find(p => p.id === programId)?.prog_name ?? 'Program'}`
                : 'Featured Theses'}
            </h2>
          </div>
          <Link
            href="/theses"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.875rem', fontWeight: 600, color: '#2E6A47', textDecoration: 'none', letterSpacing: '0.01em' }}
          >
            View all
            <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map(thesis => (
              <ThesisCard key={thesis.id} thesis={thesis} />
            ))}
          </div>
        ) : (
          <div
            style={{ background: '#fff', border: '1px solid #D2DDD4', borderRadius: '1.25rem', boxShadow: '0 1px 3px rgba(17,33,23,0.07)', padding: '4rem 2rem', textAlign: 'center' }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📭</div>
            <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', fontWeight: 700, color: '#112117' }}>No theses yet</p>
            <p style={{ fontSize: '0.9rem', color: '#7C9283', marginTop: '0.5rem' }}>
              {programId ? 'No theses in this program yet.' : 'Be the first to upload a thesis!'}
            </p>
            <Link href="/theses/upload" className="btn btn-primary mt-5 inline-flex">
              Upload a Thesis
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
