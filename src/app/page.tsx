import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getSiteStats, getFeaturedTheses, getAllPrograms } from '@/lib/data'
import ThesisCard from '@/components/ThesisCard'
import ProgramCarousel from '@/components/ProgramCarousel'

export const metadata: Metadata = {
  title: 'Home',
  description:
    'Discover and explore university theses across every college and program at PALSU. The central academic thesis hub.',
}

interface HomePageProps {
  searchParams: Promise<{ program?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { program: programId } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const displayName = user?.user_metadata?.full_name
    ?? user?.email?.split('@')[0]
    ?? 'Researcher'

  const [stats, programs, featured] = await Promise.all([
    getSiteStats(),
    getAllPrograms(),
    getFeaturedTheses(programId),
  ])

  const STATS = [
    { label: 'Theses',   value: stats.thesis_count,  icon: '📄' },
    { label: 'Colleges', value: stats.college_count, icon: '🏛️' },
    { label: 'Programs', value: stats.program_count, icon: '🎓' },
    { label: 'Tags',     value: stats.tag_count,     icon: '🏷️' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">

      {/* ── Hero banner ───────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 to-blue-700 text-white shadow-xl shadow-sky-900/10 isolate">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl" />

        <div className="relative p-8 md:p-12 lg:p-16">
          <div className="max-w-3xl mb-10">
            <p className="text-sky-200 text-sm font-semibold uppercase tracking-widest mb-3">
              Welcome back, {displayName}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-4">
              Refero Thesis Library
            </h1>
            <p className="text-lg md:text-xl text-sky-100 leading-relaxed max-w-2xl">
              Discover, upload, and promote PALSU theses spanning every college.
              The central hub for academic excellence.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/theses" className="btn btn-lg bg-white text-sky-700 hover:bg-sky-50 border-white/30">
                Browse Theses
              </Link>
              <Link href="/theses/upload" className="btn btn-lg bg-sky-500/30 text-white border-white/20 hover:bg-sky-500/50 backdrop-blur-sm">
                Upload Thesis
              </Link>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map(s => (
              <div key={s.label} className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                <p className="text-xs uppercase tracking-wider text-sky-200 font-semibold mb-1">{s.label}</p>
                <p className="text-3xl font-bold text-white">{s.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── Browse by Program ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="h-6 w-1 rounded-full bg-sky-600" />
          <h2 className="text-xl font-bold text-slate-800">Browse by Program</h2>
        </div>
        <Suspense fallback={<div className="h-64 rounded-3xl bg-slate-800 animate-pulse" />}>
          <ProgramCarousel programs={programs} activeProgramId={programId ?? null} />
        </Suspense>
      </section>

      {/* ── Featured Theses ───────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-sky-600" />
            <h2 className="text-xl font-bold text-slate-800">
              {programId
                ? `Latest in ${programs.find(p => p.id === programId)?.prog_name ?? 'Program'}`
                : 'Featured Theses'}
            </h2>
          </div>
          <Link href="/theses" className="text-sm font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1">
            View all
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-semibold text-slate-700">No theses yet</p>
            <p className="text-sm text-slate-400 mt-1">
              {programId ? 'No theses in this program yet.' : 'Be the first to upload a thesis!'}
            </p>
            <Link href="/theses/upload" className="btn btn-primary mt-4 inline-flex">
              Upload a Thesis
            </Link>
          </div>
        )}
      </section>

    </div>
  )
}
