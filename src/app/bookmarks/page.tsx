import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getUserCollections, getBookmarkedTheses } from '@/lib/bookmarks'
import BookmarksManager from '@/components/bookmarks/BookmarksManager'

export const metadata: Metadata = {
  title: 'Bookmarks & Collections',
  description: 'Curate, organize, and review your saved university research theses and papers.',
}

export default async function BookmarksPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?redirectTo=/bookmarks')
  }

  const [collections, { items, totalCount }] = await Promise.all([
    getUserCollections(user.id),
    getBookmarkedTheses(user.id),
  ])

  return (
    <BookmarksManager
      initialCollections={collections}
      initialTheses={items}
      initialTotalCount={totalCount}
    />
  )
}
