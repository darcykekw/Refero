import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { getUserTheses, getUserStats } from '@/lib/data'
import { getBookmarkedTheses } from '@/lib/bookmarks'
import ThesisCard from '@/components/ThesisCard'
import UpdateNameForm from '@/components/UpdateNameForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My Profile',
  description: 'Your thesis uploads and account settings.',
}

export default async function ProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirectTo=/profile')

  const displayName: string =
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split('@')[0] ||
    'User'

  const [theses, stats, bookmarkData] = await Promise.all([
    getUserTheses(user.id),
    getUserStats(user.id),
    getBookmarkedTheses(user.id),
  ])

  const bookmarkedSet = new Set((bookmarkData?.items ?? []).map(b => b.thesis?.id).filter(Boolean))
  const rejectedCount = theses.filter(t => t.status === 'rejected').length
  const pendingCount = theses.filter(t => t.status === 'pending').length

  return (
    <div className="w-full max-w-5xl page-gutter py-6 sm:py-10 space-y-6 sm:space-y-8">

      {/* Breadcrumb */}
      <nav className="breadcrumb-bar" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className="divider">/</span>
        <span className="current">My Profile</span>
      </nav>

      {/* Profile header */}
      <div className="card p-5 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400 mb-0.5">Signed in as</p>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{displayName}</h1>
            <p className="text-sm text-slate-500 mt-0.5 truncate">{user.email}</p>
          </div>

          {/* Stats */}
          <div className="flex gap-4 sm:gap-6 text-center w-full sm:w-auto justify-around sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
            <div>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{stats.thesisCount}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {stats.thesisCount === 1 ? 'Thesis' : 'Theses'}
              </p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{stats.totalViews.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-0.5">Total views</p>
            </div>
            <Link href="/bookmarks" style={{ textDecoration: 'none' }}>
              <p className="text-xl sm:text-2xl font-bold text-emerald-800 hover:text-emerald-950 transition-colors">
                {bookmarkData.totalCount}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Bookmarks</p>
            </Link>
          </div>
        </div>

        {/* Update display name */}
        <div className="border-t border-slate-100 pt-5">
          <p className="text-sm font-medium text-slate-700 mb-3">Display name</p>
          <Suspense>
            <UpdateNameForm currentName={displayName} />
          </Suspense>
        </div>
      </div>

      {/* Upload CTA */}
      <div className="section-bar">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 rounded-full bg-emerald-700" />
          <div>
            <h2 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#112117' }}>My Theses</h2>
            {theses.length > 0 && (
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-slate-500">{theses.length} total</span>
                {rejectedCount > 0 && (
                  <span className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span>✕</span> {rejectedCount} rejected
                  </span>
                )}
                {pendingCount > 0 && (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span>⏳</span> {pendingCount} under review
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/bookmarks" className="btn btn-ghost btn-sm">
            My Bookmarks →
          </Link>
          <Link href="/theses/upload" className="btn btn-primary btn-sm">
            + Upload thesis
          </Link>
        </div>
      </div>

      {/* Rejection Notification Banner if any exist */}
      {rejectedCount > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-xs sm:text-sm text-red-800 flex items-start gap-2.5">
          <span className="text-base font-bold text-red-600 shrink-0 mt-0.5">✕</span>
          <div>
            <span className="font-bold text-red-900">
              {rejectedCount === 1 ? '1 of your research submissions was rejected by an administrator.' : `${rejectedCount} of your research submissions were rejected by an administrator.`}
            </span>{' '}
            Please review the reason stated on the rejected card below, and edit your thesis to address the feedback.
          </div>
        </div>
      )}

      {/* Thesis grid */}
      {theses.length === 0 ? (
        <div className="card p-10 text-center space-y-3">
          <p className="text-slate-400 text-lg">No theses uploaded yet.</p>
          <Link href="/theses/upload" className="btn btn-primary">
            Upload your first thesis
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {theses.map(thesis => (
            <div key={thesis.id} className="relative group">
              <ThesisCard thesis={thesis} isBookmarked={bookmarkedSet.has(thesis.id)} />
              {/* Overlay edit/delete controls */}
              <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  href={`/theses/${thesis.id}/edit`}
                  className="btn btn-sm bg-white border-slate-200 text-slate-700 hover:border-sky-400 hover:text-sky-600 shadow-sm text-xs"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
