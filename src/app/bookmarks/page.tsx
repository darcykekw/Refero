import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getUserCollections, getBookmarkedTheses } from '@/lib/bookmarks'
import BookmarksManager from '@/components/bookmarks/BookmarksManager'
import type { CollectionWithCount } from '@/types/database'
import type { EnrichedBookmarkedThesis } from '@/lib/bookmarks'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Bookmarks & Collections',
  description: 'Curate, organize, and review your saved university research theses and papers.',
}

export default async function BookmarksPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?redirectTo=/bookmarks')
  }

  let collections: CollectionWithCount[] = []
  let items: EnrichedBookmarkedThesis[] = []
  let totalCount = 0

  try {
    const [colsRes, thesesRes] = await Promise.all([
      getUserCollections(user.id).catch(() => []),
      getBookmarkedTheses(user.id).catch(() => ({ items: [], totalCount: 0 })),
    ])

    collections = colsRes ?? []
    items = thesesRes?.items ?? []
    totalCount = thesesRes?.totalCount ?? 0
  } catch (err) {
    console.warn('BookmarksPage data fetch error:', err)
  }

  return (
    <BookmarksManager
      initialCollections={collections}
      initialTheses={items}
      initialTotalCount={totalCount}
    />
  )
}

