import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { getUserTheses } from '@/lib/data'
import { getUserBookmarkMap } from '@/lib/bookmarks'
import ThesesGridClient from '@/components/ThesesGridClient'
import type { ThesisWithRelations } from '@/types/database'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My Theses',
  description: 'Manage and track your submitted university theses in the Refero repository.',
}

export default async function MyThesesPage() {
  const user = await getCurrentUser().catch(() => null)
  let userTheses: ThesisWithRelations[] = []
  let bookmarkMap: Record<string, string[]> = {}

  if (user) {
    try {
      const [thesesRes, bMapRes] = await Promise.all([
        getUserTheses(user.id).catch(() => []),
        getUserBookmarkMap(user.id).catch(() => ({})),
      ])
      userTheses = thesesRes
      bookmarkMap = bMapRes
    } catch (err) {
      console.warn('MyThesesPage load error:', err)
    }
  }

  return (
    <div className="w-full max-w-7xl page-gutter py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Breadcrumb */}
      <nav className="breadcrumb-bar" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className="divider">/</span>
        <span className="current">My Theses</span>
      </nav>

      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="page-header-banner flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800">
              Personal Repository
            </span>
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#112117' }}>
            My Theses
          </h1>
          <p className="text-sm mt-1" style={{ color: '#435A4C', fontWeight: 500 }}>
            Track and manage your submitted research manuscripts and verification status.
          </p>
        </div>

        {user && (
          <Link href="/theses/upload" className="btn btn-primary self-start sm:self-auto">
            + Upload Thesis
          </Link>
        )}
      </div>

      {/* ── My Theses Grid ─────────────────────────────────────────── */}
      <Suspense fallback={<div className="skeleton h-80 rounded-2xl" />}>
        <ThesesGridClient
          initialUserTheses={userTheses}
          bookmarkMap={bookmarkMap}
          userSignedIn={Boolean(user)}
        />
      </Suspense>
    </div>
  )
}
