import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { getUserTheses, getUserStats } from '@/lib/data'
import { getBookmarkedTheses } from '@/lib/bookmarks'
import ThesisCard from '@/components/ThesisCard'
import UpdateNameForm from '@/components/UpdateNameForm'

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
            {stats.avgScore != null && (
              <div>
                <p className="text-xl sm:text-2xl font-bold text-sky-600">{stats.avgScore.toFixed(1)}</p>
                <p className="text-xs text-slate-400 mt-0.5">Avg. score</p>
              </div>
            )}
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
              <p className="text-xs text-slate-500 mt-0.5">{theses.length} uploaded</p>
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
              <ThesisCard thesis={thesis} />
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
