import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { getAllVerifiedTheses, getAvailableTags, getAllPrograms } from '@/lib/data'
import { getUserBookmarkMap } from '@/lib/bookmarks'
import SearchInterfaceClient from '@/components/SearchInterfaceClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Search Theses',
  description: 'Search, filter by academic tags, and explore scholarly theses from the College of Sciences.',
}

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    tag?: string
    year?: string
    sort?: string
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, tag, year, sort } = await searchParams

  const user = await getCurrentUser().catch(() => null)
  const [allTheses, availableTags, programs, bookmarkMap] = await Promise.all([
    getAllVerifiedTheses().catch(() => []),
    getAvailableTags(150).catch(() => []),
    getAllPrograms().catch(() => []),
    user ? getUserBookmarkMap(user.id).catch(() => ({})) : Promise.resolve({} as Record<string, string[]>),
  ])

  return (
    <Suspense fallback={<div className="w-full max-w-7xl page-gutter py-10"><div className="skeleton h-96 rounded-3xl" /></div>}>
      <SearchInterfaceClient
        initialTheses={allTheses}
        availableTags={availableTags}
        programs={programs}
        bookmarkMap={bookmarkMap}
        initialQuery={q || ''}
        initialTag={tag}
        initialYear={year ? Number(year) : undefined}
        initialSort={sort || 'newest'}
      />
    </Suspense>
  )
}
